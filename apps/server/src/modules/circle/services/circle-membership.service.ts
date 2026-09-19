import {
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { isUniqueConstraintError } from "../../../common/prisma-errors";
import { safePagination } from "../../../common/pagination";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { CoinService } from "../../coin/coin.service";
import { CommissionService } from "../../commission/commission.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";
import { NotificationService } from "../../notification/notification.service";
import { JoinCircleDto, UpdateMemberRoleDto } from "../circle.dto";
import { Prisma, CircleMemberRole } from "@prisma/client";
import { CircleSharedService } from "./circle-shared.service";
import { CircleGovernanceService } from "../governance/circle-governance.service";
import { fulfillCircleOrderTx, type FulfillResult } from "../../shop/circle-fulfillment";

/**
 * 圈子-成员与入圈支付域（从 circle.service 拆出·纯搬家不改逻辑）。
 * 职责：加入/退出/续费/入圈支付（虚拟币/外部支付事务）+ 入圈申请 + 成员角色/移除/列表
 * + 过期清理与到期提醒定时任务（@Cron）。
 * ⚠️ 含资金/扣费方法（prepareJoin/confirmJoin/renewCircle），逐字搬迁，跨域调用改注入。
 * 依赖：共享叶子域（checkOwnership/checkAdmin）·单向不循环。
 */
@Injectable()
export class CircleMembershipService {
  private readonly logger = new Logger(CircleMembershipService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private shared: CircleSharedService,
    @Optional() private coinService?: CoinService,
    @Optional() private commissionService?: CommissionService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private governance?: CircleGovernanceService,
  ) {}

  /**
   * 加入圈子：免费圈直接加入，付费圈需先调用 prepareJoin 创建订单并支付后调用 confirmJoin
   */
  async join(circleId: string, userId: string, dto?: JoinCircleDto) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing) {
      // 如果已加入但已过期（年费圈），提示续费
      if (existing.expireAt && new Date(existing.expireAt) < new Date()) {
        throw new BusinessException(ErrorCode.CIRCLE_JOIN_DENIED, "会员已过期，请续费后重新加入");
      }
      throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
    }

    // 免费圈子
    if (circle.type === "FREE") {
      // requireRuleAck 强制（治理 TODO#5·2026-07-11）：开了「加入须确认圈规」且有圈规时，
      // 直接加入与产生入圈申请前都必须先 ack（前端据 RULE_ACK_REQUIRED 引导确认页）
      if (this.governance) await this.governance.assertRuleAck(circleId, userId);
      // needApproval 列绕过 generate 锁，原生查（circle 对象不含该字段）
      const appr = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT "needApproval" FROM "Circle" WHERE id=$1`,
        circleId,
      );
      // 需审批的免费圈：不直接进，产生入圈申请等圈主审核
      if (appr?.[0]?.needApproval === true) {
        return this.createJoinRequest(circleId, userId);
      }
      // 普通免费圈：直接加入
      return this.createMembership(circleId, userId, null, dto?.referrerId);
    }

    // 付费圈子需要先支付
    throw new BusinessException(ErrorCode.CIRCLE_JOIN_DENIED, "付费圈子请先完成支付");
  }

  /**
   * 产生入圈申请（需审批的免费圈）。幂等：已有 PENDING 申请则提示等待。
   * 审批由 growth.reviewJoinRequest 处理（通过则建成员 + memberCount+1）。
   * CircleJoinRequest 表绕过 generate 锁，用原生 SQL 访问。
   */
  private async createJoinRequest(circleId: string, userId: string) {
    const pending = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "CircleJoinRequest" WHERE "circleId"=$1 AND "userId"=$2 AND "status"='PENDING' LIMIT 1`,
      circleId, userId,
    );
    if (pending.length) {
      return { status: "pending", message: "您的入圈申请正在审核中，请耐心等待" };
    }
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CircleJoinRequest" ("id","circleId","userId","status","createdAt") VALUES ($1,$2,$3,'PENDING',CURRENT_TIMESTAMP)`,
      randomUUID(), circleId, userId,
    );
    return { status: "pending", message: "入圈申请已提交，等待圈主审核" };
  }

  /**
   * 我的入圈申请列表（申请人视角）。CircleJoinRequest 绕 generate 锁，
   * 原生 SQL join Circle 取圈子名/封面；按申请时间倒序。
   */
  async getMyJoinRequests(userId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r."id", r."circleId", r."status", r."message", r."reviewedAt", r."rejectReason", r."createdAt",
              c."name" AS "circleName", c."cover" AS "circleCover"
       FROM "CircleJoinRequest" r
       LEFT JOIN "Circle" c ON c.id = r."circleId"
       WHERE r."userId"=$1
       ORDER BY r."createdAt" DESC`,
      userId,
    );
  }

  /** 创建付费入圈订单（返回订单信息供前端拉起支付） */
  async prepareJoin(circleId: string, userId: string, dto?: { payMethod?: string; referrerId?: string }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    if (circle.type === "FREE") throw new BusinessException(ErrorCode.BAD_REQUEST, "免费圈子无需支付");

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing && (!existing.expireAt || new Date(existing.expireAt) > new Date())) {
      throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已是圈子成员");
    }

    // 决策点 D3：圈规确认**前移到下单前**。
    //
    // 原先这道门只在 `confirmJoin` 上（`circle-membership.service.ts:217`），即**付款之后**。
    // 服务端履约路径 `fulfillCircleOrderTx` 事务内拿不到治理服务，因此不做这一校验 ——
    // 结果是：未确认圈规的用户照样付得了钱，且由服务端履约直接进圈，门槛形同虚设；
    // 而在服务端履约之前落到 `confirmJoin` 的那一部分，又会在**已收款之后**被拒，
    // 变成「收钱不给货」。两种结果都不可接受。
    //
    // 前移到这里，未确认圈规的用户**根本付不了钱**：既保住治理门槛，也不产生已支付未履约单。
    // 注意本方法此前没有这道校验，因此这是**下单环节新增的拦截**；
    // 对已确认圈规、或该圈未配置 requireRuleAck / 没有生效圈规的用户，行为完全不变
    // （`assertRuleAck` 这两种情况都直接返回）。
    //
    // `renewCircle`（续费下单）**刻意不加**：续费方今天没有任何圈规确认要求，
    // 在那里新增一道门会把已付费的存量成员挡在续费之外 —— 那是新增收费准入规则，不在授权范围内。
    if (this.governance) await this.governance.assertRuleAck(circleId, userId);

    // 已付款但尚未履约的同圈订单必须复用，不能再建一张待支付单让用户二次付款。
    // 履约本身由支付后处理器与补偿重试负责（shop-payment.service.ts），这里只拦下单。
    const unfulfilled = await this.prisma.order.findFirst({
      where: {
        userId,
        targetId: circleId,
        type: { in: ["CIRCLE_JOIN", "CIRCLE_RENEW"] },
        status: { in: ["PAID", "SHIPPED"] },
        refundedAt: null,
      },
      orderBy: { paidAt: "desc" },
      select: { id: true },
    });
    if (unfulfilled) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "你已有一笔已支付的入圈订单正在处理，请稍后刷新；如长时间未生效请联系客服，不要重复支付",
      );
    }

    const priceYuan = Number(circle.price);
    if (priceYuan <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "圈子价格配置异常");

    // 通过统一价格引擎计算实付价格（检查限时折扣）
    const pricing = await this.unifiedPricing.calculateTargetPrice(circleId, "CIRCLE", userId);
    const effectivePriceYuan = pricing.effectivePrice;

    // 董事长拍板（2026-07-10）：入圈只能人民币支付，不支持虚拟币
    if (!dto?.payMethod || dto.payMethod === "COIN") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "圈子加入仅支持人民币支付（微信/支付宝），请选择支付方式");
    }

    // 微信/支付宝支付 — 创建待支付订单
    const orderNo = `CIRCLE_JOIN_${circleId.slice(0, 8)}_${Date.now()}`;
    const orderData: any = {
      userId,
      type: "CIRCLE_JOIN",
      targetId: circleId,
      amount: effectivePriceYuan,
      payAmount: effectivePriceYuan,
      originalAmount: pricing.originalPrice > effectivePriceYuan ? pricing.originalPrice : undefined,
      status: "PENDING",
      payMethod: dto.payMethod,
      referrerId: dto.referrerId || undefined,
    };
    if (pricing.appliedPromotion) {
      orderData.promotionType = pricing.appliedPromotion.type;
      orderData.promotionId = pricing.appliedPromotion.id;
    }
    const order = await this.prisma.order.create({ data: orderData });

    return {
      needPayment: true,
      payMethod: dto.payMethod,
      priceYuan: effectivePriceYuan,
      coinNeeded: 0,
      orderNo,
      orderId: order.id,
      message: "请完成支付",
    };
  }

  /** 支付完成后确认入圈（由支付回调或前端调用） */
  async confirmJoin(circleId: string, userId: string, dto: { payMethod?: string; orderNo?: string; orderId?: string; referrerId?: string }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");

    // 再次校验是否已加入
    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing && (!existing.expireAt || new Date(existing.expireAt) > new Date())) {
      // 服务端支付后处理器已完成履约时（支付回调/管理员确认/补偿任一），客户端仍会补调本接口。
      // 此时不应报错，而应返回「已完成」的真实结果：既是幂等，也让支付页能正确显示已入圈。
      // 归属严格校验：订单必须同时属于该用户、该圈子、且类型为圈子订单，才认定为本单已履约。
      const fulfilledOrder = await this.findOwnedCircleOrder(circleId, userId, dto, ["COMPLETED"]);
      if (fulfilledOrder) {
        return { ...existing, alreadyFulfilled: true, orderId: fulfilledOrder.id };
      }
      throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已是圈子成员");
    }

    // requireRuleAck 强制（治理 TODO#5·2026-07-11）：付费确认链路建成员前同样校验圈规确认
    if (this.governance) await this.governance.assertRuleAck(circleId, userId);

    // 计算到期时间（真实到期时间以履约结果为准，这里只作为无履约结果时的回退展示值）
    let expireAt: Date | null = null;
    if (circle.type === "YEARLY") {
      expireAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    let member: any;
    /** 本单实付金额。收益基数统一取实付价，与支付后处理器 `settleCircleAfterCommit` 同口径 */
    let legacyPaidAmount = 0;

    // 董事长拍板（2026-07-10）：入圈只能人民币，不支持虚拟币扣费
    if (dto.payMethod === "COIN") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "圈子加入仅支持人民币支付（微信/支付宝）");
    }
    // 订单 id 提到分支外：下面记收益时要用它做订单级幂等，而 order 本身声明在分支内。
    let paidOrderId: string | null = null;

    if (dto.orderNo || dto.orderId) {
      // 外部支付：校验订单状态
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: dto.orderId || "" },
            { payTransactionId: dto.orderNo || "" },
          ],
          type: "CIRCLE_JOIN",
          targetId: circleId,
          userId,
        },
      });
      if (!order || order.status !== "PAID") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "订单未支付或不存在");
      }
      paidOrderId = order.id;

      // 治理判断留在履约之前：`fulfillCircleOrderTx` 只有事务客户端，拿不到治理服务。
      await this.assertNotBanned(circleId, userId);

      // **履约本身交给服务端唯一实现**，本接口不再自己建成员、自己改订单状态。
      // 原实现把「建成员」和「订单置 COMPLETED」拆成两次独立写入：中途失败会留下
      // 「成员已建、订单仍 PAID」，补偿扫描再读到时会按「已是有效成员的 JOIN 单」判成
      // 待人工（D4），把一笔本已履约的订单送进人工队列。
      // 真实实现在同一事务内完成订单行 FOR UPDATE → 成员行 FOR UPDATE → 写权益 → 认领订单。
      const fulfillment = await this.prisma.$transaction((tx) => fulfillCircleOrderTx(tx, order.id));
      member = await this.applyLegacyConfirmOutcome(circleId, userId, order.id, fulfillment);
      expireAt = fulfillment.expireAt;

      // 推荐人奖励：原先在 createMembership 内部，随履约迁出后在这里按同一条件触发。
      if (dto.referrerId && this.commissionService && fulfillment.outcome === "fulfilled" && fulfillment.memberId) {
        this.commissionService.recordCircleRevenue(circleId, "circle_join_referral", fulfillment.memberId, 0).catch(
          (err) => this.logger.warn("记录推荐收益失败", err),
        );
      }
      // 本单此前已履约（服务端回调/管理员确认/补偿任一）时不重复记收益。
      if (!fulfillment.shouldRecordRevenue) paidOrderId = null;
      legacyPaidAmount = Number(order.payAmount ?? order.amount ?? 0);
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供支付方式或订单号");
    }

    // 缓存清理（事务外操作）
    await Promise.all([
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    // 记录圈子收益（fire-and-forget，不影响主流程）。
    // 带上 order.id：支付后处理器也会为同一笔订单记一次收益，两条路径靠
    // `CircleRevenueRecord(type, orderId)` 唯一约束互斥。撞唯一键说明对方已记过，
    // 落到下面的 catch 里当作正常情况——这里本就是 fire-and-forget。
    // 基数取**实付价**而非 `circle.price`：支付后处理器记的就是实付价，两条路径靠
    // `(type, orderId)` 唯一约束互斥，谁先到谁落库。基数不一致会让同一笔订单的收益金额
    // 取决于哪条路径先跑完——那是不确定性，不是规则。促销单的折扣差额由此不再漂移。
    const priceYuan = legacyPaidAmount > 0 ? legacyPaidAmount : Number(circle.price);
    if (priceYuan > 0 && paidOrderId && this.commissionService) {
      this.commissionService
        .recordCircleRevenue(circleId, "circle_join", member.id, priceYuan, paidOrderId)
        .catch((err) => this.logger.warn("记录入圈收益失败（含已由支付后处理器记过的情形）", err));
    }

    // 订单状态不再由本接口单独更新：`fulfillCircleOrderTx` 的 `claimOrder` 已在履约事务内
    // 条件更新 PAID/SHIPPED → COMPLETED 并校验影响行数，权益与状态一起提交或一起回滚。
    // 原先那次独立 updateMany 与建成员不在同一事务，正是「成员已建、订单仍 PAID」的来源。
    return member;
  }

  /**
   * 把 `fulfillCircleOrderTx` 的结果翻译成旧 confirm 接口的返回值与异常。
   *
   * 旧接口是客户端支付成功后的**补调**入口，必须保持幂等且不掩盖未决状态：
   *  - `fulfilled` / `extended`：真正履约，返回最新成员行；
   *  - `already`：本单此前已由回调/管理员确认/补偿履约，幂等返回，不重复写任何东西；
   *  - `needs_manual`：规则未决，**不报成功也不自行处置**，返回明确的待人工提示；
   *  - `skipped`：订单已退款/已取消/状态不可履约，按业务异常抛出，不静默成功。
   */
  private async applyLegacyConfirmOutcome(
    circleId: string,
    userId: string,
    orderId: string,
    fulfillment: FulfillResult,
  ) {
    if (fulfillment.outcome === "needs_manual") {
      this.logger.warn(
        `圈子履约暂停待人工（旧 confirm 入口）order=${orderId} circle=${circleId} user=${userId} 原因=${fulfillment.reason}`,
      );
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "这笔订单需要人工核对后才能开通，请联系客服，不要重复支付",
      );
    }
    if (fulfillment.outcome === "skipped") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `订单无法履约：${fulfillment.reason ?? "状态不可履约"}`);
    }
    const current = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!current) {
      // 履约声称成功却读不到成员行：不编造返回值。
      throw new BusinessException(ErrorCode.BAD_REQUEST, "入圈结果异常，请刷新后重试或联系客服");
    }
    return fulfillment.outcome === "already" ? { ...current, alreadyFulfilled: true, orderId } : current;
  }

  // ───────── 续费折扣（#34·配置驱动·默认关闭零行为变化·待董事长拍板开启） ─────────

  /**
   * 读续费折扣配置 ConfigSystem `circle.renew_discount`（json）。
   * 缺省/解析失败/比例非法 → { enabled:false }（零行为变化）。
   * 结构：{ enabled: boolean, renewRate: 0.8, twoYearRate: 0.75 }（rate ∈ (0,1]）。
   */
  private async getRenewDiscountConfig(): Promise<{ enabled: boolean; renewRate: number; twoYearRate: number }> {
    const defaults = { enabled: false, renewRate: 0.8, twoYearRate: 0.75 };
    try {
      const row = await this.prisma.configSystem.findUnique({ where: { configKey: "circle.renew_discount" } });
      if (!row?.configValue) return defaults;
      const parsed = JSON.parse(row.configValue) as { enabled?: unknown; renewRate?: unknown; twoYearRate?: unknown };
      const rate = (v: unknown, dft: number) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 && n <= 1 ? n : dft;
      };
      return {
        enabled: parsed.enabled === true,
        renewRate: rate(parsed.renewRate, defaults.renewRate),
        twoYearRate: rate(parsed.twoYearRate, defaults.twoYearRate),
      };
    } catch {
      return defaults; // 配置异常 → 视为未开启，绝不影响原价续费
    }
  }

  /**
   * 续费报价（纯计算·不建单·不动资金）：
   * - 基价 = 统一价格引擎单年有效价（与入圈同价，限时折扣同样生效）；
   * - 折扣关闭（默认）：应付 = round2(基价 × years)（与既有行为完全一致）；
   * - 折扣开启：1 年应付 = round2(基价 × renewRate)；2 年应付 = round2(基价 × 2 × twoYearRate)。
   *   金额计算：先乘完再 round2 到分（round2(x)=Math.round(x*100)/100），避免逐步取整累积尾差。
   */
  private async quoteRenewPrice(circleId: string, userId: string, years: 1 | 2) {
    const pricing = await this.unifiedPricing.calculateTargetPrice(circleId, "CIRCLE", userId);
    const baseYuan = pricing.effectivePrice;
    if (baseYuan <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "圈子价格配置异常");

    const cfg = await this.getRenewDiscountConfig();
    const round2 = (x: number) => Math.round(x * 100) / 100;
    const originalPriceYuan = round2(baseYuan * years);
    let priceYuan = originalPriceYuan;
    if (cfg.enabled) {
      priceYuan = years === 2 ? round2(baseYuan * 2 * cfg.twoYearRate) : round2(baseYuan * cfg.renewRate);
    }
    return {
      years,
      originalPriceYuan,
      priceYuan,
      discountEnabled: cfg.enabled,
      discountApplied: cfg.enabled && priceYuan < originalPriceYuan,
      // 价格引擎的"划线原价"（限时促销场景 originalPrice > effectivePrice）·仅用于订单 originalAmount 记录，保持旧行为
      pricingOriginalYuan: round2((pricing.originalPrice || 0) * years),
    };
  }

  /** 续费报价查询（GET :id/renew/quote·前端展示原价划线+折后价用·关闭时 priceYuan === originalPriceYuan） */
  async renewQuote(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    if (circle.type !== "YEARLY") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅年费圈子支持续费");
    const oneYear = await this.quoteRenewPrice(circleId, userId, 1);
    const twoYear = await this.quoteRenewPrice(circleId, userId, 2);
    return { ...oneYear, twoYear }; // 两年档后端已支持（years=2）·档位 UI 前端 TODO
  }

  /**
   * 续费年费圈子（第一步：创建待支付订单）。
   * 董事长拍板（2026-07-10）：续费与入圈一样**只能人民币支付**——本方法建 CIRCLE_RENEW 现金订单，
   * 前端拉起聚合支付，支付成功后调 confirmRenew 顺延到期时间（对齐 prepareJoin/confirmJoin 双段模式）。
   * #34 老成员续费折扣：读 ConfigSystem `circle.renew_discount`，默认关闭=原价（零行为变化）；
   * 开启时按 renewRate/twoYearRate 计算应付价（见 quoteRenewPrice）。
   * years=2 两年档后端已支持：订单 quantity 记年数，confirmRenew 按 365×quantity 顺延（前端档位 UI TODO）。
   */
  async renewCircle(circleId: string, userId: string, dto?: { payMethod?: string; years?: number }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    if (circle.type !== "YEARLY") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅年费圈子支持续费");

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "未加入该圈子");

    if (!dto?.payMethod || dto.payMethod === "COIN") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "续费仅支持人民币支付（微信/支付宝），请选择支付方式");
    }

    // 年数只认 1/2；quote 内部按配置决定是否打折（默认关=原价，与旧行为逐字一致）
    const years: 1 | 2 = Number(dto.years) === 2 ? 2 : 1;
    const quote = await this.quoteRenewPrice(circleId, userId, years);

    const order = await this.prisma.order.create({
      data: {
        userId,
        type: "CIRCLE_RENEW",
        targetId: circleId,
        quantity: years, // 年数记在 quantity（confirmRenew 按 365×quantity 顺延）
        amount: quote.priceYuan,
        payAmount: quote.priceYuan,
        // 划线原价取「续费原价」与「价格引擎促销划线价」较大者（折扣关+无促销时与旧行为一致=不记录）
        originalAmount: Math.max(quote.originalPriceYuan, quote.pricingOriginalYuan) > quote.priceYuan
          ? Math.max(quote.originalPriceYuan, quote.pricingOriginalYuan)
          : undefined,
        status: "PENDING",
        payMethod: dto.payMethod,
      },
    });

    return {
      needPayment: true,
      payMethod: dto.payMethod,
      priceYuan: quote.priceYuan,
      originalPriceYuan: quote.originalPriceYuan,
      discountApplied: quote.discountApplied,
      years,
      coinNeeded: 0,
      orderId: order.id,
      message: "请完成支付",
    };
  }

  /** 支付完成后确认续费（由前端支付成功后调用）：校验 CIRCLE_RENEW 订单已支付 → 从原到期时间顺延 365 天 */
  async confirmRenew(circleId: string, userId: string, dto: { orderId?: string; orderNo?: string }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "未加入该圈子");

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: dto.orderId || "" },
          { payTransactionId: dto.orderNo || "" },
        ],
        type: "CIRCLE_RENEW",
        targetId: circleId,
        userId,
      },
    });
    if (!order || !["PAID", "COMPLETED"].includes(order.status)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "订单未支付或不存在");
    }
    if (order.status === "COMPLETED") {
      // 服务端支付后处理器已完成本单续期，客户端补调到这里。幂等返回当前状态，不重复顺延。
      return { ...member, alreadyFulfilled: true, newExpireAt: member.expireAt?.toISOString() ?? null };
    }

    // **顺延本身交给服务端唯一实现**：订单行 FOR UPDATE → 成员行 FOR UPDATE → 顺延 → 认领订单。
    // 原实现虽然把顺延与订单完结放进了同一事务，但**没有锁**：两笔不同的续费订单并发时，
    // 双方都先在事务外读到同一个 `member.expireAt` 作为基线，各自算出「基线 + 1 年」再写入，
    // 后写的覆盖先写的 —— 用户付了两笔，只拿到一年。真实实现在事务内用行锁重新读取到期时间，
    // 第二笔必然在第一笔提交后的新基线上顺延。
    // 顺延口径（未过期从原到期日续算、已过期从现在起算、`quantity=2` 按 730 天）完全一致，
    // 未改动任何收费规则。
    const fulfillment = await this.prisma.$transaction((tx) => fulfillCircleOrderTx(tx, order.id));

    if (fulfillment.outcome === "needs_manual") {
      this.logger.warn(
        `圈子续费暂停待人工（旧 confirm 入口）order=${order.id} circle=${circleId} user=${userId} 原因=${fulfillment.reason}`,
      );
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "这笔续费订单需要人工核对后才能生效，请联系客服，不要重复支付",
      );
    }
    if (fulfillment.outcome === "skipped") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `订单无法履约：${fulfillment.reason ?? "状态不可履约"}`);
    }

    const updated = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!updated) throw new BusinessException(ErrorCode.NOT_FOUND, "续费结果异常，请刷新后重试或联系客服");
    const newExpireAt = fulfillment.expireAt ?? updated.expireAt;

    // 记录续费收益（带 order.id 与支付后处理器互斥）。
    // `shouldRecordRevenue` 为假说明本单此前已履约过，此处不重复记账。
    const priceYuan = Number(order.payAmount ?? order.amount);
    if (priceYuan > 0 && fulfillment.shouldRecordRevenue && fulfillment.memberId && this.commissionService) {
      this.commissionService
        .recordCircleRevenue(circleId, "circle_join", fulfillment.memberId, priceYuan, order.id)
        .catch((err) => this.logger.warn("记录续费收益失败（含已由支付后处理器记过的情形）", err));
    }

    await this.redis.del(`circles:member:${circleId}:${userId}`);
    await this.redis.del(`circles:detail:${circleId}`);
    return { ...updated, newExpireAt: newExpireAt ? newExpireAt.toISOString() : null };
  }

  /**
   * 按「订单 id 或渠道流水号」定位一笔**确属该用户、该圈子**的圈子订单。
   *
   * 三重归属校验：userId + targetId + type ∈ (CIRCLE_JOIN, CIRCLE_RENEW)。
   * orderNo 走 payTransactionId，不再错当成 id 匹配。
   */
  private async findOwnedCircleOrder(
    circleId: string,
    userId: string,
    dto: { orderId?: string; orderNo?: string },
    statuses: string[],
  ) {
    const or: Prisma.OrderWhereInput[] = [];
    if (dto.orderId) or.push({ id: dto.orderId });
    if (dto.orderNo) or.push({ payTransactionId: dto.orderNo });
    if (or.length === 0) return null;
    return this.prisma.order.findFirst({
      where: {
        OR: or,
        userId,
        targetId: circleId,
        type: { in: ["CIRCLE_JOIN", "CIRCLE_RENEW"] },
        status: { in: statuses as Prisma.EnumOrderStatusFilter["in"] },
      },
      select: { id: true, type: true, status: true },
    });
  }

  /** 检查用户加入状态 */
  async getJoinStatus(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { id: true, role: true, joinedAt: true, expireAt: true },
    });
    if (!member) return { joined: false };
    const expired = member.expireAt ? new Date(member.expireAt) < new Date() : false;
    return {
      joined: !expired,
      expired,
      role: member.role,
      joinedAt: member.joinedAt,
      expireAt: member.expireAt,
    };
  }

  /** 每日定时清理过期成员（分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredMembers() {
    await this.redis.runExclusive("circle_cleanup_expired_members", 600, () =>
      this._cleanupExpiredMembers(),
    );
  }

  private async _cleanupExpiredMembers() {
    const expired = await this.prisma.circleMember.findMany({
      where: {
        expireAt: { lt: new Date() },
        role: { not: "OWNER" },
      },
      select: { id: true, circleId: true, userId: true },
    });

    if (expired.length === 0) return;

    // 分批处理
    const batchSize = 100;
    for (let i = 0; i < expired.length; i += batchSize) {
      const batch = expired.slice(i, i + batchSize);
      const ids = batch.map((m) => m.id);

      await this.prisma.$transaction(async (tx) => {
        await tx.circleMember.deleteMany({ where: { id: { in: ids } } });
        // 批量获取各圈子成员数
        const circleIds = [...new Set(batch.map((m) => m.circleId))];
        const counts = await tx.circleMember.groupBy({
          by: ["circleId"],
          where: { circleId: { in: circleIds } },
          _count: { id: true },
        });
        for (const { circleId, _count } of counts) {
          await tx.circle.update({
            where: { id: circleId },
            data: { memberCount: _count.id },
          });
        }
      });

      // 清除缓存（pipeline 批量删除）+ 发送通知
      const redis = this.redis.getClient();
      if (redis) {
        const pipeline = redis.pipeline();
        for (const m of batch) {
          pipeline.del(`circles:member:${m.circleId}:${m.userId}`);
        }
        await pipeline.exec();
      }
      for (const m of batch) {
        if (this.notificationService) {
          this.notificationService.send(m.userId, {
            type: "CIRCLE_EXPIRED",
            title: "圈子会员已过期",
            content: "您的圈子会员已过期，可续费重新加入",
            targetType: "CIRCLE",
            targetId: m.circleId,
            category: "GOVERN",
            circleId: m.circleId,
          }).catch((err) => this.logger.warn("圈子通知发送失败", err));
        }
      }
    }

    this.logger.log(`已清理 ${expired.length} 个过期圈子成员`);
  }

  /** 到期前提醒（提前7天/3天/1天·分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendExpirationReminders() {
    await this.redis.runExclusive("circle_send_expiration_reminders", 600, () =>
      this._sendExpirationReminders(),
    );
  }

  private async _sendExpirationReminders() {
    const remindDays = [7, 3, 1];
    for (const days of remindDays) {
      const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const expiringSoon = await this.prisma.circleMember.findMany({
        where: {
          expireAt: { gte: startOfDay, lt: endOfDay },
          role: { not: "OWNER" },
        },
        select: { userId: true, circleId: true },
        take: 500,
      });

      for (const m of expiringSoon) {
        if (this.notificationService) {
          this.notificationService.send(m.userId, {
            type: "CIRCLE_EXPIRING",
            title: "圈子即将到期",
            content: `您的圈子会员将于 ${days} 天后到期，请及时续费`,
            targetType: "CIRCLE",
            targetId: m.circleId,
            category: "GOVERN",
            circleId: m.circleId,
          }).catch((err) => this.logger.warn("圈子通知发送失败", err));
        }
      }

      if (expiringSoon.length > 0) {
        this.logger.log(`发送了 ${expiringSoon.length} 条 ${days} 天到期提醒`);
      }
    }
  }

  /** 治理 #10：被移出且禁止重新加入的用户拦截（REMOVE ACTIVE=禁入·圈主解除/申诉成立后放行） */
  private async assertNotBanned(circleId: string, userId: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    const ban = await client.circleViolation.findFirst({
      where: { circleId, userId, type: "REMOVE", status: "ACTIVE" },
      select: { id: true },
    });
    if (ban) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "你已被移出该圈子且被限制重新加入，如有异议可在处理通知中申诉");
    }
  }

  /** 内部方法：创建成员关系 */
  private async createMembership(circleId: string, userId: string, expireAt: Date | null, referrerId?: string) {
    await this.assertNotBanned(circleId, userId);
    let member: Awaited<ReturnType<typeof this.prisma.circleMember.create>> | undefined;
    try {
      member = await this.prisma.circleMember.create({
        data: { circleId, userId, role: "MEMBER", expireAt },
      });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
      throw e;
    }

    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    // 处理推荐人奖励
    if (referrerId && this.commissionService) {
      this.commissionService.recordCircleRevenue(circleId, "circle_join_referral", member.id, 0).catch(
        (err) => this.logger.warn("记录推荐收益失败", err),
      );
    }

    return member;
  }

  /**
   * 事务内创建成员关系（供 confirmJoin 等需要与扣币同事务的场景使用）。
   * Redis 缓存清理在外部调用方处理。
   */
  private async createMembershipTx(
    circleId: string,
    userId: string,
    expireAt: Date | null,
    referrerId: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    await this.assertNotBanned(circleId, userId, tx);
    try {
      const member = await tx.circleMember.create({
        data: { circleId, userId, role: "MEMBER", expireAt },
      });
      await tx.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      });
      return member;
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
      throw e;
    }
  }

  async leave(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "未加入该圈子");
    if (member.role === "OWNER") throw new BusinessException(ErrorCode.FORBIDDEN, "圈主不能退出，请先转让圈子");

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId } },
    });
    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return { success: true };
  }

  /**
   * 管理员代加成员（admin 专用·controller 层已做 RolesGuard）。
   * 复用内部 createMembership（含封禁校验/计数/缓存清理/唯一约束防重）；已是成员则幂等返回现有成员。
   * role 可选（默认 MEMBER）；不允许 OWNER（转让圈主须走 updateMemberRole 流程）。
   */
  async adminAddMember(circleId: string, targetUserId: string, role?: string) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    const desiredRole = (role || "MEMBER") as CircleMemberRole;
    if (desiredRole === "OWNER") throw new BusinessException(ErrorCode.BAD_REQUEST, "不允许直接指定圈主，转让圈主请使用成员角色接口");
    if (!Object.values(CircleMemberRole).includes(desiredRole)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的成员角色");
    }

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (existing) return { ...existing, alreadyMember: true };

    let member;
    try {
      member = await this.createMembership(circleId, targetUserId, null);
    } catch (e: unknown) {
      // 并发下唯一约束命中 → 幂等返回现有成员
      if (e instanceof BusinessException && e.errorCode === ErrorCode.CIRCLE_MEMBER_EXISTS) {
        const raced = await this.prisma.circleMember.findUnique({
          where: { circleId_userId: { circleId, userId: targetUserId } },
        });
        if (raced) return { ...raced, alreadyMember: true };
      }
      throw e;
    }
    if (desiredRole !== "MEMBER") {
      member = await this.prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { role: desiredRole },
      });
      await this.redis.del(`circles:member:${circleId}:${targetUserId}`);
    }
    return member;
  }

  async updateMemberRole(circleId: string, operatorId: string, targetUserId: string, dto: UpdateMemberRoleDto, opts?: { asAdmin?: boolean }) {
    // 管理角色 bypass：SUPER_ADMIN/OPERATION_ADMIN（controller 判定）不要求为圈主/成员；C 端原逻辑零变化
    if (!opts?.asAdmin) {
      await this.shared.checkOwnership(circleId, operatorId);
    }

    if (dto.role === "OWNER") {
      // 转让圈主。C 端：checkOwnership 已保证 operator 即现圈主；管理端：现圈主从 circle.ownerId 取
      let fromOwnerId = operatorId;
      if (opts?.asAdmin) {
        const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
        if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");
        fromOwnerId = circle.ownerId;
        const target = await this.prisma.circleMember.findUnique({
          where: { circleId_userId: { circleId, userId: targetUserId } },
        });
        if (!target) throw new BusinessException(ErrorCode.NOT_FOUND, "该用户不是圈子成员");
        if (fromOwnerId === targetUserId) return { success: true };
      }
      const ops: Prisma.PrismaPromise<unknown>[] = [];
      if (opts?.asAdmin) {
        // 管理端：现圈主成员行存在才降级（容忍脏数据缺行）
        const fromMember = await this.prisma.circleMember.findUnique({
          where: { circleId_userId: { circleId, userId: fromOwnerId } },
        });
        if (fromMember) {
          ops.push(this.prisma.circleMember.update({
            where: { circleId_userId: { circleId, userId: fromOwnerId } },
            data: { role: "MEMBER" },
          }));
        }
      } else {
        ops.push(this.prisma.circleMember.update({
          where: { circleId_userId: { circleId, userId: operatorId } },
          data: { role: "MEMBER" },
        }));
      }
      ops.push(
        this.prisma.circleMember.update({
          where: { circleId_userId: { circleId, userId: targetUserId } },
          data: { role: "OWNER" },
        }),
        this.prisma.circle.update({
          where: { id: circleId },
          data: { ownerId: targetUserId },
        }),
      );
      await this.prisma.$transaction(ops);
      await this.redis.del(`circles:member:${circleId}:${fromOwnerId}`);
    } else {
      const existing = await this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId: targetUserId } },
      });
      if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "该用户不是圈子成员");
      await this.prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { role: dto.role as CircleMemberRole },
      });
    }

    await this.redis.del(`circles:member:${circleId}:${targetUserId}`);
    return { success: true };
  }

  async removeMember(circleId: string, operatorId: string, targetUserId: string, opts?: { asAdmin?: boolean }) {
    // 治理 #8：移出圈子为锁定权限项·硬编码仅圈主（设计稿金锁·能禁言的不能移出）
    // 管理角色 bypass：SUPER_ADMIN/OPERATION_ADMIN（controller 判定）跳过圈内身份校验；「不能移除圈主」硬约束保留
    if (!opts?.asAdmin) {
      await this.shared.checkPermission(circleId, operatorId, "member.remove");
    }

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    if (member.role === "OWNER") throw new BusinessException(ErrorCode.FORBIDDEN, "不能移除圈主");

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${targetUserId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return { success: true };
  }

  async listMembers(circleId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const [members, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.circleMember.count({ where: { circleId } }),
    ]);

    return { members, total, page, pageSize };
  }
}
