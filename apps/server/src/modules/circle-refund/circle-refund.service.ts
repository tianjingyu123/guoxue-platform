import { Injectable, Logger, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CommissionService } from "../commission/commission.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 圈子退款 service（阶段1：申请 + 双审核 + 查询）
 * 规则见 docs/circle-refund-rules-v2.md。退款表用原生 SQL 访问（prisma generate 被 dev server 锁）。
 * 阶段2（执行退款到 UserEarning + 圈主分成追回 + 站长佣金追回）在 adminReview 通过后接入。
 */
const FEE_RATE = 0.2; // 20% 手续费
const DEFAULT_TOTAL_DAYS = 365; // 年费默认服务天数

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface RefundCalc {
  orderId: string | null;
  paidAmount: number;
  dailyCost: number;
  usedDays: number;
  refundBase: number;
  feeAmount: number;
  actualRefund: number;
}

@Injectable()
export class CircleRefundService {
  private readonly logger = new Logger(CircleRefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly commissionService?: CommissionService,
  ) {}

  /** 计算退款金额（不落库）：应退 = 已付 − 日费×已用天数；手续费 = 应退×20%；实退 = 应退 − 手续费 */
  private async calcRefund(circleId: string, userId: string): Promise<RefundCalc> {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.BAD_REQUEST, "你不是该圈子成员");

    // 入圈订单 → 已付费用
    const order = await this.prisma.order.findFirst({
      where: { userId, type: "CIRCLE_JOIN", targetId: circleId, status: "PAID" },
      orderBy: { createdAt: "desc" },
    });
    const paidAmount = order ? Number(order.payAmount ?? order.amount) : 0;
    if (paidAmount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "免费圈子或无支付记录，无需退款");

    const joinedAt = new Date(member.joinedAt);
    const totalDays = member.expireAt
      ? Math.max(1, Math.round((new Date(member.expireAt).getTime() - joinedAt.getTime()) / 86_400_000))
      : DEFAULT_TOTAL_DAYS;
    const usedDays = Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000));
    const dailyCost = paidAmount / totalDays;
    const refundBase = paidAmount - dailyCost * usedDays;
    if (refundBase <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "已超过付费周期，无法退款");

    const feeAmount = refundBase * FEE_RATE;
    return {
      orderId: order?.id ?? null,
      paidAmount: round2(paidAmount),
      dailyCost: round2(dailyCost),
      usedDays,
      refundBase: round2(refundBase),
      feeAmount: round2(feeAmount),
      actualRefund: round2(refundBase - feeAmount),
    };
  }

  /** 退款金额预览（前端申诉申请页用） */
  async previewRefund(circleId: string, userId: string) {
    return { ...(await this.calcRefund(circleId, userId)), feeRate: FEE_RATE };
  }

  /** 提交退款申请（normal 走流程；full 全额退款引导客服） */
  async applyRefund(circleId: string, userId: string, reason?: string, refundType: "normal" | "full" = "normal") {
    if (refundType === "full") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "全额退款请联系平台客服处理");
    }

    // 防重复：唯一索引兜底，先查友好提示
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "CircleRefundRequest" WHERE "circleId"=$1 AND "userId"=$2 AND "refundStatus"='pending' LIMIT 1`,
      circleId, userId,
    );
    if (existing.length) throw new BusinessException(ErrorCode.BAD_REQUEST, "你有一笔待处理的退款申请，请勿重复提交");

    const calc = await this.calcRefund(circleId, userId);
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CircleRefundRequest"
        ("id","circleId","userId","orderId","paidAmount","dailyCost","usedDays","refundBase","feeRate","feeAmount","actualRefund","reason","refundType","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'normal',CURRENT_TIMESTAMP)`,
      id, circleId, userId, calc.orderId,
      calc.paidAmount, calc.dailyCost, calc.usedDays, calc.refundBase, FEE_RATE, calc.feeAmount, calc.actualRefund,
      reason ?? null,
    );
    return { id, ...calc, feeRate: FEE_RATE };
  }

  /** 圈主审核（通过则流转平台审核；驳回则结束，用户可重新申请） */
  async ownerReview(refundId: string, ownerId: string, approve: boolean, rejectReason?: string) {
    const req = await this.getById(refundId);
    const circle = await this.prisma.circle.findUnique({ where: { id: req.circleId } });
    if (!circle || circle.ownerId !== ownerId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权审核该退款申请");
    if (req.ownerStatus !== "pending") throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请圈主已审核");

    // 原子 CAS：仅 ownerStatus='pending' 才流转，防并发重复审核
    const claimed = approve
      ? await this.prisma.$executeRawUnsafe(
          `UPDATE "CircleRefundRequest" SET "ownerStatus"='approved',"ownerReviewedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1 AND "ownerStatus"='pending'`,
          refundId,
        )
      : await this.prisma.$executeRawUnsafe(
          `UPDATE "CircleRefundRequest" SET "ownerStatus"='rejected',"ownerReviewedAt"=CURRENT_TIMESTAMP,"ownerRejectReason"=$2,"refundStatus"='failed',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1 AND "ownerStatus"='pending'`,
          refundId, rejectReason ?? "圈主驳回",
        );
    if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请圈主已审核");
    return { success: true, approved: approve };
  }

  /** 平台审核（阶段1：通过仅置 refunding，执行退款/追回留阶段2） */
  async adminReview(refundId: string, _adminId: string, approve: boolean, rejectReason?: string) {
    const req = await this.getById(refundId);
    if (req.ownerStatus !== "approved") throw new BusinessException(ErrorCode.BAD_REQUEST, "圈主尚未通过，无法平台审核");
    if (req.adminStatus !== "pending") throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请平台已审核");

    if (approve) {
      // 原子 CAS：仅 adminStatus='pending' 才流转为 approved+refunding，抢到的请求才执行退款，防并发双重入账
      const claimed = await this.prisma.$executeRawUnsafe(
        `UPDATE "CircleRefundRequest" SET "adminStatus"='approved',"adminReviewedAt"=CURRENT_TIMESTAMP,"refundStatus"='refunding',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1 AND "adminStatus"='pending'`,
        refundId,
      );
      if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请平台已审核");
      await this.executeRefund(req);
    } else {
      const claimed = await this.prisma.$executeRawUnsafe(
        `UPDATE "CircleRefundRequest" SET "adminStatus"='rejected',"adminReviewedAt"=CURRENT_TIMESTAMP,"adminRejectReason"=$2,"refundStatus"='failed',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1 AND "adminStatus"='pending'`,
        refundId, rejectReason ?? "平台驳回",
      );
      if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请平台已审核");
    }
    return { success: true, approved: approve };
  }

  /** 我的退款申请（带圈子名） */
  async getMyRefunds(userId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r.*, c."name" AS "circleName" FROM "CircleRefundRequest" r
       LEFT JOIN "Circle" c ON r."circleId"=c.id
       WHERE r."userId"=$1 ORDER BY r."createdAt" DESC`, userId,
    );
  }

  /** 用户余额钱包（余额 + 近 50 条流水），退款到账可见 */
  async getWallet(userId: string) {
    const [walletRows, txns] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`SELECT "balance" FROM "UserWallet" WHERE "userId"=$1`, userId),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT "type","amount","balanceAfter","remark","createdAt" FROM "UserBalanceTransaction" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 50`,
        userId,
      ),
    ]);
    return { balance: Number(walletRows[0]?.balance ?? 0), transactions: txns };
  }

  /** 圈主待审列表（其名下所有圈子的 pending 申请，带申请人昵称/头像、圈子名） */
  async getOwnerPending(ownerId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r.*, u."nickname" AS "userNickname", u."avatar" AS "userAvatar", c."name" AS "circleName"
       FROM "CircleRefundRequest" r
       JOIN "Circle" c ON r."circleId"=c.id
       LEFT JOIN "User" u ON r."userId"=u.id
       WHERE c."ownerId"=$1 AND r."ownerStatus"='pending' ORDER BY r."createdAt" ASC`, ownerId,
    );
  }

  /** 平台待审列表（圈主已通过、平台待审，带申请人昵称、圈子名） */
  async getAdminPending() {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r.*, u."nickname" AS "userNickname", c."name" AS "circleName"
       FROM "CircleRefundRequest" r
       LEFT JOIN "User" u ON r."userId"=u.id
       LEFT JOIN "Circle" c ON r."circleId"=c.id
       WHERE r."ownerStatus"='approved' AND r."adminStatus"='pending' ORDER BY r."createdAt" ASC`,
    );
  }

  /**
   * 执行退款（平台审核通过后）。事务原子：退款入账用户余额钱包 + 圈主分成全额追回 + 成员身份失效 + 状态 refunded。
   * 站长佣金追回复用 commission.reverseCommission（事务外，自带事务避免嵌套；失败异步补偿不阻断主退款）。
   * ⚠️ 高风险资金代码：上线前须人工 review + 真实付费数据 e2e 验证。
   */
  private async executeRefund(req: any): Promise<void> {
    const refundId = req.id as string;
    const circleId = req.circleId as string;
    const userId = req.userId as string;
    const orderId = (req.orderId as string) || null;
    const actualRefund = Number(req.actualRefund);
    const paidAmount = Number(req.paidAmount);
    let ownerRecalled = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1) 退款入账到用户余额钱包（upsert 累加 + 流水）
      await tx.$executeRawUnsafe(
        `INSERT INTO "UserWallet" ("id","userId","balance","updatedAt")
         VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
         ON CONFLICT ("userId") DO UPDATE SET "balance" = "UserWallet"."balance" + $3, "updatedAt" = CURRENT_TIMESTAMP`,
        randomUUID(), userId, actualRefund,
      );
      const walletRows = await tx.$queryRawUnsafe<any[]>(`SELECT "balance" FROM "UserWallet" WHERE "userId"=$1`, userId);
      const balanceAfter = Number(walletRows[0]?.balance ?? actualRefund);
      await tx.$executeRawUnsafe(
        `INSERT INTO "UserBalanceTransaction" ("id","userId","type","amount","balanceAfter","refId","remark","createdAt")
         VALUES ($1,$2,'REFUND',$3,$4,$5,'圈子退款到账',CURRENT_TIMESTAMP)`,
        randomUUID(), userId, actualRefund, balanceAfter, refundId,
      );

      // 2) 圈主分成全额追回（查入圈分成 ownerShare，记负数冲正 + 追回记录）
      const member = await tx.circleMember.findUnique({ where: { circleId_userId: { circleId, userId } } });
      if (member) {
        // 圈主分成取值见 resolveOwnerShare()：精确 → 唯一 → 按金额消歧 → 存疑转人工。
        const resolved = await this.resolveOwnerShare(tx, { orderId, memberId: member.id, paidAmount });
        const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { ownerId: true } });

        if (resolved.kind === "ambiguous") {
          // **不猜**。用户的退款照退（那是用户的钱），但圈主分成追回多少无法确定，
          // 猜错的两个方向都是真实损失：猜大了多扣圈主，猜小了平台自己吃差额。
          // 这里只留一条**待人工核对**的追回台账，金额记 0，由财务按订单核对后补处理。
          // 不写 circle_join_refund 冲正行：写了就等于用一个猜出来的数字改了账。
          await tx.$executeRawUnsafe(
            `INSERT INTO "CommissionRecall" ("id","refundId","userId","userType","amount","balanceAfter","status","createdAt")
             VALUES ($1,$2,$3,'owner',0,0,'pending_manual',CURRENT_TIMESTAMP)`,
            randomUUID(), refundId, circle?.ownerId ?? "",
          );
          this.logger.warn(
            `圈主分成追回存疑，已转人工：refund=${refundId} circle=${circleId} member=${member.id} ` +
              `候选=${resolved.candidates.length} 笔（金额 ${resolved.candidates.map((c) => c.amount).join("/")}）` +
              `，退款已付金额=${paidAmount}。查询：SELECT * FROM "CommissionRecall" WHERE status='pending_manual'`,
          );
        } else if (resolved.kind !== "none") {
          ownerRecalled = resolved.ownerShare;
          await tx.circleRevenueRecord.create({
            data: { circleId, type: "circle_join_refund", sourceId: member.id, amount: -paidAmount, platformFee: 0, ownerShare: -ownerRecalled, splitRate: 0 },
          });
          await tx.$executeRawUnsafe(
            `INSERT INTO "CommissionRecall" ("id","refundId","userId","userType","amount","balanceAfter","status","createdAt")
             VALUES ($1,$2,$3,'owner',$4,0,'completed',CURRENT_TIMESTAMP)`,
            randomUUID(), refundId, circle?.ownerId ?? "", -ownerRecalled,
          );
        }
        // 3) 成员身份失效 + 圈子成员数减一
        await tx.circleMember.delete({ where: { id: member.id } });
        await tx.circle.update({ where: { id: circleId }, data: { memberCount: { decrement: 1 } } });
      }

      // 4) 标记退款完成
      await tx.$executeRawUnsafe(
        `UPDATE "CircleRefundRequest" SET "refundStatus"='refunded',"refundedAt"=CURRENT_TIMESTAMP,"ownerRecalled"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1`,
        refundId, ownerRecalled,
      );
    });

    // 5) 站长佣金追回（事务外：reverseCommission 自带事务，避免嵌套；失败异步补偿，不阻断主退款）
    if (orderId && this.commissionService?.reverseCommission) {
      this.commissionService.reverseCommission(orderId).catch(
        (e) => this.logger.warn(`站长佣金追回失败 refund=${refundId} order=${orderId}`, e),
      );
    }
  }

  /**
   * 确定本次退款应追回的圈主分成，按精确度降序，**拿不准就不猜**。
   *
   * | 档 | 判据 | 结果 |
   * |---|---|---|
   * | `exact` | 退款申请带 `orderId`，且该订单有收益行（`(type, orderId)` 唯一） | 用它 |
   * | `single` | 该成员名下只有一条金额为正的 `circle_join` 收益行 | 用它，无歧义 |
   * | `amount` | 多条候选，但只有一条金额与本次退款的已付金额相等 | 用它 |
   * | `ambiguous` | 多条候选且金额区分不开 | **不取值**，转人工 |
   * | `none` | 一条候选都没有（收益从未记上） | 不冲正，与改动前一致 |
   *
   * 为什么不能沿用「取最新一条」：一个成员会有多笔 `circle_join` 收益（入圈一笔、每次续费
   * 各一笔）。`orderId` 是后加的字段，**历史行全是 NULL**，这些行只能靠推断去配对。
   * 「最新一条」这个推断在续费之后必然取错——而且错得没有痕迹：账面自洽，只是数字不对。
   *
   * `amount > 0` 的过滤不能省：金额为 0 的行不是真实收益，被选中就会把分成读成 0，
   * 圈主一分不追回而用户已全额退款。
   */
  private async resolveOwnerShare(
    tx: any,
    params: { orderId: string | null; memberId: string; paidAmount: number },
  ): Promise<
    | { kind: "exact" | "single" | "amount"; ownerShare: number; candidates: Array<{ id: string; amount: number }> }
    | { kind: "ambiguous"; ownerShare: null; candidates: Array<{ id: string; amount: number }> }
    | { kind: "none"; ownerShare: null; candidates: Array<{ id: string; amount: number }> }
  > {
    const { orderId, memberId, paidAmount } = params;

    if (orderId) {
      const exact: any[] = await tx.$queryRawUnsafe(
        `SELECT "id","ownerShare","amount" FROM "CircleRevenueRecord"
         WHERE "orderId"=$1 AND "type"='circle_join' LIMIT 1`,
        orderId,
      );
      if (exact.length) {
        return { kind: "exact", ownerShare: Number(exact[0].ownerShare), candidates: [] };
      }
    }

    // 没有精确匹配：列出全部候选，由候选数量决定能不能判定
    const candidates = (
      (await tx.$queryRawUnsafe(
        `SELECT "id","ownerShare","amount" FROM "CircleRevenueRecord"
         WHERE "sourceId"=$1 AND "type"='circle_join' AND "amount" > 0
         ORDER BY "createdAt" DESC`,
        memberId,
      )) as any[]
    ).map((r) => ({ id: r.id as string, amount: Number(r.amount), ownerShare: Number(r.ownerShare) }));

    if (candidates.length === 0) return { kind: "none", ownerShare: null, candidates: [] };
    if (candidates.length === 1) {
      return { kind: "single", ownerShare: candidates[0].ownerShare, candidates };
    }

    // 多条候选：只有当金额能唯一对上本次退款的已付金额时才敢认
    const byAmount = candidates.filter((c) => Math.abs(c.amount - Number(paidAmount)) < 0.01);
    if (byAmount.length === 1) {
      return { kind: "amount", ownerShare: byAmount[0].ownerShare, candidates };
    }
    return { kind: "ambiguous", ownerShare: null, candidates };
  }

  private async getById(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CircleRefundRequest" WHERE id=$1 LIMIT 1`, id,
    );
    if (!rows.length) throw new BusinessException(ErrorCode.BAD_REQUEST, "退款申请不存在");
    return rows[0];
  }
}
