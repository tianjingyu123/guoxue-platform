import { Injectable } from "@nestjs/common";
import { Prisma, FundApproval } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

export type FundApprovalType = "DIVIDEND" | "REFUND" | "RECHARGE" | "COMMISSION_CONFIG" | "MEMBER_CONFIG" | "COIN_REFUND" | "HUIFU_SPLIT";

/** amount 存"币数"的审批类型（其余均为人民币元）——前端显示单位以 amountUnit 为准，防止把币数当成元 */
const COIN_AMOUNT_TYPES: readonly string[] = ["RECHARGE", "COIN_REFUND"];

/**
 * 资金审批核心服务（仅依赖 Prisma，无业务模块依赖）。
 * 负责审批单的创建 / 查询 / 原子状态流转，供 4 个资金模块发起审批、
 * 供 FundApprovalExecutor 在审批通过时执行。
 */
@Injectable()
export class FundApprovalService {
  constructor(private prisma: PrismaService) {}

  private get model() {
    return this.prisma.fundApproval;
  }

  /** 发起一笔资金审批（状态 PENDING） */
  async create(input: {
    type: FundApprovalType;
    payload: Record<string, unknown>;
    amount?: number | null;
    summary: string;
    requestedBy: string;
  }, tx?: Prisma.TransactionClient) {
    // 业务发起方可传入现有事务，余额占用与审批记录共同提交或回滚。
    const record = await (tx ?? this.prisma).fundApproval.create({
      data: {
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
        amount: input.amount ?? null,
        summary: input.summary,
        requestedBy: input.requestedBy,
        status: "PENDING",
      },
    });
    return {
      submitted: true,
      approvalId: record.id,
      status: record.status,
      message: "已提交审批，待财务审批后生效",
    };
  }

  /** 待审 / 按状态分页列表。status=ALL（或留空）返回全部状态 */
  async list(reviewerId: string, rawPage = 1, rawPageSize = 20, status = "PENDING") {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const normalized = (status || "").trim().toUpperCase();
    const where = !normalized || normalized === "ALL" ? {} : { status: normalized };
    return this.prisma.$transaction(async tx => {
      await this.assertCurrentReviewer(tx, reviewerId);
      const [items, total] = await Promise.all([
        tx.fundApproval.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        tx.fundApproval.count({ where }),
      ]);
      // amountUnit：RECHARGE/COIN_REFUND 的 amount 是币数（coin.service 直接把 amountCoin 落进 amount），
      // 其余类型是人民币元。不带单位前端会把"充值 1000 币"显示成"¥1000"。
      const withUnit = items.map((i) => ({
        ...i,
        amountUnit: COIN_AMOUNT_TYPES.includes(i.type) ? "COIN" : "CNY",
      }));
      return { items: withUnit, total, page, pageSize };
    });
  }

  async findById(id: string) {
    const record = await this.model.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "审批单不存在");
    return record;
  }

  /**
   * 原子认领：仅当当前为 PENDING 才流转为目标状态，返回是否认领成功。
   * 用于防止并发重复执行（同一审批单只会被一个请求认领成功）。
   */
  async claim(
    id: string,
    toStatus: "APPROVED" | "REJECTED",
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<boolean> {
    const res = await this.model.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: toStatus,
        reviewedBy,
        reviewNote: reviewNote ?? null,
        processedAt: new Date(),
      },
    });
    return res.count === 1;
  }

  private async assertCurrentReviewer(tx: Prisma.TransactionClient, reviewerId: string) {
    const accounts = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status::text AS status FROM "User" WHERE id=${reviewerId} FOR SHARE`;
    if (accounts[0]?.status !== "ACTIVE")
      throw new BusinessException(ErrorCode.FORBIDDEN, "审核账号当前不可用");
    const roles = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "UserRole" WHERE "userId"=${reviewerId}
      AND "roleType" IN ('SUPER_ADMIN', 'FINANCE_ADMIN') ORDER BY id FOR SHARE`;
    if (!roles.length)
      throw new BusinessException(ErrorCode.FORBIDDEN, "当前平台权限不足，不能审核资金操作");
  }

  /** 审核入口：在同一事务复核当前账号/角色和当前审批单，返回实际认领的载荷。 */
  async claimForReview(
    id: string, toStatus: "APPROVED" | "REJECTED", reviewerId: string, reviewNote: string | undefined,
    expected: Pick<FundApproval, "type" | "requestedBy" | "payload" | "amount" | "summary">,
    transaction?: Prisma.TransactionClient,
  ) {
    const claim = async (tx: Prisma.TransactionClient) => {
      await this.assertCurrentReviewer(tx, reviewerId);
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "fund_approval" WHERE id=${id} FOR UPDATE`;
      if (!locked[0]) throw new BusinessException(ErrorCode.NOT_FOUND, "审批单不存在");
      const approval = await tx.fundApproval.findUnique({ where: { id } });
      if (!approval) throw new BusinessException(ErrorCode.NOT_FOUND, "审批单不存在");
      if (approval.status !== "PENDING")
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该审批单已处理");
      if (approval.requestedBy && approval.requestedBy === reviewerId)
        throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己发起的资金操作，请由其他审批人处理");
      if (approval.requestedBy !== expected.requestedBy || approval.type !== expected.type || approval.summary !== expected.summary || approval.amount?.toString() !== expected.amount?.toString() || JSON.stringify(approval.payload) !== JSON.stringify(expected.payload))
        throw new BusinessException(ErrorCode.BAD_REQUEST, "审批内容已变化，请重新查询后审核");
      const updated = await tx.fundApproval.updateMany({
        where: { id, status: "PENDING", requestedBy: approval.requestedBy, type: approval.type },
        data: { status: toStatus, reviewedBy: reviewerId, reviewNote: reviewNote ?? null, processedAt: new Date() },
      });
      if (updated.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "该审批单已处理");
      // 后续执行使用这里核验的载荷；传入事务时权限锁保持到该事务提交。
      return approval;
    };
    return transaction ? claim(transaction) : this.prisma.$transaction(claim);
  }

  /** 本地分配、币操作及配置与认领共同提交；外部出款不能进入这个事务。 */
  async executeLocalReview<T>(
    id: string, reviewerId: string, reviewNote: string | undefined,
    expected: Pick<FundApproval, "type" | "requestedBy" | "payload" | "amount" | "summary">,
    execute: (approval: FundApproval, tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async tx => {
      const approval = await this.claimForReview(id, "APPROVED", reviewerId, reviewNote, expected, tx);
      if (!["DIVIDEND", "RECHARGE", "COIN_REFUND", "MEMBER_CONFIG", "COMMISSION_CONFIG"].includes(approval.type))
        throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已核验的本地资金类型使用此执行事务");
      return execute(approval, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /** 执行失败时回滚为 PENDING，避免出现"已通过但未执行"的资金空档 */
  async revertToPending(id: string) {
    await this.model.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "PENDING", reviewedBy: null, reviewNote: null, processedAt: null },
    });
  }
}
