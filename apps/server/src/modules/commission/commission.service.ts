import { Injectable, Logger, Optional } from "@nestjs/common";
import { randomInt } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, CommissionConfig } from "@prisma/client";
import { WebhookService } from "../webhook/webhook.service";
import { SystemService } from "../system/system.service";
import { MemoryCache } from "../../common/cache.util";
import { encrypt, decrypt, maskBankCard, maskName, maskAlipay } from "../../common/crypto.util";
import { RedisService } from "../../redis/redis.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { SettlementService } from "../settlement/settlement.service";
import { LedgerBalanceService } from "../settlement/ledger-balance.service";
import { PayeeAccountService } from "../payee-account/payee-account.service";
import { UserGrowthService } from "../user-growth/user-growth.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

/** 提现上限（元），与钱包提现口径一致 */
const MAX_WITHDRAW_RMB = 50000;
/** 计算可提现余额时视为"占用额度"的提现状态（PENDING 也占额度，防重复提现；REJECTED 自动释放） */
const OCCUPYING_WITHDRAW_STATUSES = ["PENDING", "APPROVED", "TRANSFERRING", "PAID"];
/**
 * 审核允许的目标状态白名单。
 * 曾经 dto.status 是任意字符串直接写库；且允许 PENDING 一步直达 PAID。
 * 现在审核只能 APPROVED/REJECTED，打款是独立动作（confirmPayout），必须先经审核。
 */
const AUDIT_TARGET_STATUSES = ["APPROVED", "REJECTED"];

/**
 * 【已废止·仅作历史参考】运营商等级管理奖率（V2 改制前按 Operator.level 取率）。
 * V2 改制后（2026-07-04 拍板·docs/progress/董事长拍板记录-20260704晚.md §一-1）：
 * 管理奖比率 = operator.mgmtRate ?? channelType 默认（ONLINE 10% / OFFLINE 20%），
 * 等级率不再参与计算，本常量保留供审计/回溯历史数据口径。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 有意保留：供审计/回溯历史分佣数据口径，不参与现行计算
const OPERATOR_MGMT_RATES: Record<string, { mgmt: number }> = {
  SILVER: { mgmt: 0.08 },
  GOLD: { mgmt: 0.12 },
  DIAMOND: { mgmt: 0.15 },
  BLACK_GOLD: { mgmt: 0.20 },
};

/** V2 管理奖默认比率（基数=站长实得佣金额·operator.mgmtRate 为空时按渠道类型取默认） */
const MGMT_RATE_DEFAULTS: Record<string, number> = {
  ONLINE: 0.10, // 线上运营商：名下站长推广佣金的 10%
  OFFLINE: 0.20, // 线下运营商（驿站赠送"高级线下运营商"）：名下站长推广佣金的 20%
};

/**
 * 佣-V2-P4 非渠道用户分享成交积分档（2026-07-04 拍板·设计 §3.4）：
 * 普通用户（非渠道主体）推荐无现金佣金，成交改发创作/推广积分 =
 * 订单金额（元）向下取整 × 2，封顶 200 分/单（约=签到 5 分的 20-100 倍量级）。
 */
const SHARE_CONVERSION_EXP_PER_YUAN = 2;
const SHARE_CONVERSION_EXP_CAP = 200;
/** 分享成交积分的学分来源标识（UserGrowth 台账口径） */
const SHARE_CONVERSION_SOURCE = "share_conversion";
/** 首单判定视为"已成交"的订单状态（与分佣触发口径一致：支付后才计） */
const SHARE_CONVERSION_PAID_STATUSES = ["PAID", "SHIPPED", "COMPLETED"] as const;

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly configCache = new MemoryCache<CommissionConfig[]>(50);

  constructor(
    private prisma: PrismaService,
    private webhook: WebhookService,
    private redis: RedisService,
    @Optional() private systemService?: SystemService,
    @Optional() private fundApproval?: FundApprovalService,
    @Optional() private settlement?: SettlementService,
    @Optional() private ledgerBalance?: LedgerBalanceService,
    @Optional() private userGrowth?: UserGrowthService, // 佣-V2-P4 分享积分（单测缺 provider 时兜底跳过）
    @Optional() private payeeAccount?: PayeeAccountService, // 圈子双轨费率（未注入则回落全局费率体系）
  ) {}

  // ───────── 分佣比例变更审批（发起端，不立即生效） ─────────

  /**
   * 发起「分佣比例变更」审批（PUT /commission/configs/:key 走此入口）。
   * 审批通过后由 FundApprovalExecutor 调用 updateConfig 真正变更。
   */
  async requestConfigChange(
    key: string,
    dto: { rateA?: number; rateB?: number; rateC?: number; description?: string },
    requestedBy: string,
  ) {
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey: key } });
    if (!config) throw new BusinessException(ErrorCode.NOT_FOUND, "配置不存在");
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    const parts: string[] = [];
    if (dto.rateA !== undefined) parts.push(`A=${dto.rateA}`);
    if (dto.rateB !== undefined) parts.push(`B=${dto.rateB}`);
    if (dto.rateC !== undefined) parts.push(`C=${dto.rateC}`);
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "updateConfig", key, dto },
      amount: null,
      summary: `分佣比例变更 [${key}] ${parts.join(" ") || "(说明)"}`,
      requestedBy,
    });
  }

  /**
   * 发起「分佣比例变更」审批（PUT /commission/config，单一 rate 形态）。
   * 审批通过后调用 updateCommissionConfig 真正变更。
   */
  async requestRateChange(type: string, rate: number, requestedBy: string) {
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "updateCommissionConfig", type, rate },
      amount: null,
      summary: `分佣比例变更 [${type}] → ${rate}`,
      requestedBy,
    });
  }

  // ───────── 佣金配置管理 ─────────

  async getAllConfigs() {
    const cached = this.configCache.get("all");
    if (cached) return cached;
    const configs = await this.prisma.commissionConfig.findMany();
    this.configCache.set("all", configs, 300_000);
    return configs;
  }

  async updateConfig(key: string, dto: { rateA?: number; rateB?: number; rateC?: number; description?: string }) {
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey: key } });
    if (!config) throw new BusinessException(ErrorCode.NOT_FOUND, "配置不存在");
    const updated = await this.prisma.commissionConfig.update({
      where: { configKey: key },
      data: {
        ...(dto.rateA !== undefined && { rateA: dto.rateA }),
        ...(dto.rateB !== undefined && { rateB: dto.rateB }),
        ...(dto.rateC !== undefined && { rateC: dto.rateC }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
    this.configCache.delete("all");
    return updated;
  }

  // ───────── 佣金计算核心 ─────────

  /**
   * 根据订单类型和金额计算佣金
   * 返回 StationEarning 创建所需数据
   */
  async calculateAndRecord(
    orderId: string,
    type: string, // COURSE, PRODUCT, MEMBER, CIRCLE, BOT
    amount: number,
    referrerId?: string,
    tempReferrerId?: string,
    stationId?: string,
    payerId?: string, // 付款人（统一总账自买自卖校验用；缺省时回查 Order）
  ) {
    // 确定配置key
    const configKey = this.mapTypeToConfigKey(type);
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey } });
    if (!config) return null; // 未配置则不计算

    const effectiveReferrerId = tempReferrerId || referrerId;
    if (!effectiveReferrerId) return null;

    // 佣-V2-P1：PRODUCT 类订单需 order.targetId 查逐品佣金率；
    // 佣-V2-P2：临时归因命中时需 order.tempRefSubjectType 路由受益人；与付款人回查合并为一次查询
    const needProductRate = type === "PRODUCT";
    let effectivePayerId = payerId;
    let orderTargetId: string | null = null;
    let channelSubjectType: string | null = null;
    if (!effectivePayerId || needProductRate || tempReferrerId) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { userId: true, targetId: true, tempRefSubjectType: true },
        });
        if (!effectivePayerId) effectivePayerId = order?.userId ?? "";
        orderTargetId = order?.targetId ?? null;
        channelSubjectType = order?.tempRefSubjectType ?? null;
      } catch {
        effectivePayerId = effectivePayerId || "";
      }
    }

    // ── 佣-V2-P2 渠道主体受益人路由（2026-07-04 拍板·设计 §3.3）──
    // 临时归因命中 CIRCLE/OFFLINE_STATION 渠道：佣金受益人=tempReferrerId（点击时解析好的圈主/驿站主），
    // 落账走统一总账 LedgerEntry（role=CIRCLE/OFFLINE_STATION），不建 StationEarning、不派运营商管理奖
    // （管理奖仅 STATION 渠道向上派生·两级计酬合规见设计 §五）。subjectType=STATION 或空 → 现行分站路径。
    if (tempReferrerId && (channelSubjectType === "CIRCLE" || channelSubjectType === "OFFLINE_STATION")) {
      return this.recordChannelBeneficiaryCommission({
        orderId,
        type,
        amount,
        beneficiaryUserId: tempReferrerId,
        subjectType: channelSubjectType,
        payerId: effectivePayerId,
        configRateA: Number(config.rateA),
        orderTargetId,
      });
    }

    // 查找推荐人的分站（现行 STATION 路径）
    const station = stationId
      ? await this.prisma.station.findUnique({ where: { id: stationId } })
      : await this.prisma.station.findUnique({ where: { userId: effectiveReferrerId } });

    if (!station) {
      // ── 佣-V2-P4 非渠道分享成交 → 创作/推广积分（2026-07-04 拍板·设计 §3.4）──
      // 推荐人存在但非渠道主体（无 tempRefSubjectType 且查无 Station）：普通用户推荐无现金佣金，
      // 改发积分奖励。失败静默，绝不阻断分佣主流程（本分支原本就是"静默无奖励"返回 null）。
      if (!channelSubjectType) {
        await this.awardShareConversionExp(orderId, effectiveReferrerId, effectivePayerId, amount);
      }
      return null;
    }

    // 站长自购不产生佣金（2026-07-02 拍板：自购已在下单时直接立减·此处防御性拦截历史/旁路订单）
    if (effectivePayerId && effectivePayerId === station.userId) {
      this.logger.log(`订单 ${orderId} 为站长自购，不产生佣金`);
      return null;
    }

    // 佣-V2-P1 佣金取值链（2026-07-04 拍板）：PRODUCT 类订单优先用逐品站长佣金率，回落类型默认 rateA
    const rate = await this.resolveEffectiveRate(type, orderTargetId, Number(config.rateA));
    // 规整到分（四舍五入），与本文件管理奖/平台抽成一致，避免 JS 浮点尾数（如 99.9*0.7）污染分账与累加
    const earned = Math.round(amount * rate * 100) / 100;

    // 创建收益记录 + 更新分站总收益（原子操作）
    const earning = await this.prisma.$transaction(async (tx) => {
      const e = await tx.stationEarning.create({
        data: {
          stationId: station!.id,
          orderId,
          amount,
          rate, // 实际生效比例（逐品率或类型默认·佣-V2-P1）
          earned,
          type,
        },
      });

      await tx.station.update({
        where: { id: station!.id },
        data: { totalEarning: { increment: earned } },
      });

      return e;
    });

    // 发送收益通知（fire-and-forget，不阻塞主流程）
    this.prisma.notification.create({
      data: {
        userId: station.userId,
        type: "EARNING",
        title: "新的推广收益",
        content: `您获得一笔 ${type} 推广佣金 ¥${earned.toFixed(2)}（订单金额 ¥${amount}，比例 ${(rate * 100).toFixed(1)}%）`,
        targetType: type,
        targetId: orderId,
      },
    }).catch((err) => this.logger.warn("收益通知发送失败", err));

    // ───────── 运营商管理奖 ─────────
    const bonus = await this.calculateOperatorBonus(station.id, orderId, earned);

    // ───────── T1-P2b 统一总账影子双写（不影响现有资金路径，失败仅记日志）─────────
    // 过渡期比例以本方法实际使用值 rateOverride 传入，保证总账与实付一致；P2-c 切换后以 SettlementRule 为真源
    if (this.settlement) {
      try {
        await this.settlement.settle({
          scene: this.mapTypeToScene(type),
          refType: "ORDER",
          refId: orderId,
          amount,
          payerId: effectivePayerId,
          parties: {
            STATION: { type: "STATION", id: station.id, userId: station.userId, rateOverride: rate },
            ...(bonus
              ? { OPERATOR: { type: "OPERATOR", id: bonus.operatorId, userId: bonus.userId, rateOverride: bonus.rate } }
              : {}),
          },
        });
      } catch (e) {
        this.logger.warn(`统一总账影子双写失败(order=${orderId})`, e);
      }
    }

    return earning;
  }

  /**
   * 佣-V2-P4 非渠道用户分享成交积分奖励（替代现金佣金·2026-07-04 拍板·设计 §3.4）。
   * 积分档 = 订单金额（元）向下取整 × 2，封顶 200 分/单。
   * 防刷：同一（买家, 推荐人）仅首单计（历史已支付订单同推荐人则跳过）；自购（推荐人=买家）不计。
   * 全程 try/catch 静默：积分发放绝不阻断分佣主流程。
   */
  private async awardShareConversionExp(
    orderId: string,
    referrerId: string,
    buyerId: string | undefined,
    amount: number,
  ): Promise<void> {
    try {
      if (!this.userGrowth) return; // 单测/裁剪部署缺 provider 兜底
      if (!buyerId) return; // 无法确认买家身份则不发（防自购/重复判定失效）
      if (buyerId === referrerId) return; // 自购不计
      const exp = Math.min(Math.floor(amount) * SHARE_CONVERSION_EXP_PER_YUAN, SHARE_CONVERSION_EXP_CAP);
      if (exp <= 0) return;
      // 同一（买家, 推荐人）仅首单计：该买家历史已支付订单中已有同推荐人（永久或临时）则跳过
      const prior = await this.prisma.order.findFirst({
        where: {
          id: { not: orderId },
          userId: buyerId,
          status: { in: [...SHARE_CONVERSION_PAID_STATUSES] },
          OR: [{ tempReferrerId: referrerId }, { referrerId }],
        },
        select: { id: true },
      });
      if (prior) return;
      await this.userGrowth.addExp(referrerId, exp, SHARE_CONVERSION_SOURCE);
      this.logger.log(`非渠道分享成交积分：+${exp}（推荐人 ${referrerId}·订单 ${orderId}）`);
    } catch (e) {
      this.logger.warn(`分享成交积分发放失败(order=${orderId})，不阻断分佣主流程`, e as Error);
    }
  }

  /**
   * 佣-V2-P1 佣金取值链：PRODUCT 类订单逐品率 Product.commissionRate（0-1 小数·空=未逐品配置）
   * 覆盖类型级默认 CommissionConfig.rateA；非 PRODUCT 订单直接用 rateA。查询失败回落默认，不阻断分佣。
   */
  private async resolveEffectiveRate(type: string, orderTargetId: string | null, rateA: number): Promise<number> {
    let rate = rateA;
    if (type === "PRODUCT" && orderTargetId) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: orderTargetId },
          select: { commissionRate: true },
        });
        if (product?.commissionRate != null) {
          const productRate = Number(product.commissionRate);
          if (productRate >= 0 && productRate < 1) rate = productRate;
        }
      } catch {
        // 逐品率查询失败回落类型默认，不阻断分佣
      }
    }
    return rate;
  }

  /**
   * 佣-V2-P2：CIRCLE / OFFLINE_STATION 渠道佣金入账（2026-07-04 拍板·设计 §3.3）。
   * 受益人=点击时解析好的圈主/驿站主 userId；落账走统一总账 LedgerEntry
   * （beneficiaryType=USER·role=CIRCLE/OFFLINE_STATION·category=COMMISSION），
   * 状态机复用现有缓冲期/审批阈值/settlePending/reverse（该场景 SettlementRule 存在则对齐，
   * 缺省零缓冲=与 StationEarning 即时入账口径一致）。
   * 不建 StationEarning、不派运营商管理奖（管理奖仅 STATION 渠道·两级计酬合规）。
   */
  private async recordChannelBeneficiaryCommission(params: {
    orderId: string;
    type: string;
    amount: number;
    beneficiaryUserId: string;
    subjectType: string; // CIRCLE / OFFLINE_STATION
    payerId?: string;
    configRateA: number;
    orderTargetId: string | null;
  }) {
    const { orderId, type, amount, beneficiaryUserId, subjectType, payerId, configRateA, orderTargetId } = params;

    // 渠道主体自购不产生佣金（与站长路径同口径防御性拦截）
    if (payerId && payerId === beneficiaryUserId) {
      this.logger.log(`订单 ${orderId} 为渠道主体自购，不产生佣金`);
      return null;
    }

    const rate = await this.resolveEffectiveRate(type, orderTargetId, configRateA);
    const earned = Math.round(amount * rate * 100) / 100;
    if (earned <= 0) return null;

    const scene = this.mapTypeToScene(type);

    // 幂等守卫：同订单同渠道角色已有正向佣金则返回既有记录（支付回调可能重入）
    const existing = await this.prisma.ledgerEntry.findFirst({
      where: { refType: "ORDER", refId: orderId, role: subjectType, category: "COMMISSION", amount: { gt: 0 } },
    });
    if (existing) return existing;

    // 缓冲期/审批阈值对齐统一结算引擎该场景规则
    let bufferDays = 0;
    let requireApproval = false;
    let threshold: number | null = null;
    try {
      const rule = await this.prisma.settlementRule.findUnique({ where: { scene } });
      if (rule?.enabled) {
        bufferDays = rule.bufferDays;
        requireApproval = rule.requireApproval;
        threshold = rule.approvalThreshold !== null ? Number(rule.approvalThreshold) : null;
      }
    } catch {
      // 规则查询失败按零缓冲入账
    }

    const now = new Date();
    const frozen = requireApproval && threshold !== null && earned >= threshold;
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        scene,
        refType: "ORDER",
        refId: orderId,
        beneficiaryType: "USER",
        beneficiaryId: beneficiaryUserId,
        role: subjectType, // CIRCLE / OFFLINE_STATION
        category: "COMMISSION",
        amount: earned,
        rate,
        status: frozen ? "FROZEN" : "PENDING",
        availableAt: new Date(now.getTime() + bufferDays * 86_400_000),
        reason: frozen ? `单笔≥${threshold}元，冻结待人工复核` : null,
      },
    });

    // 收益通知（fire-and-forget，不阻塞主流程）
    this.prisma.notification
      .create({
        data: {
          userId: beneficiaryUserId,
          type: "EARNING",
          title: subjectType === "CIRCLE" ? "圈子推广收益" : "驿站推广收益",
          content: `您获得一笔 ${type} 推广佣金 ¥${earned.toFixed(2)}（订单金额 ¥${amount}，比例 ${(rate * 100).toFixed(1)}%）`,
          targetType: type,
          targetId: orderId,
        },
      })
      .catch((err) => this.logger.warn("渠道收益通知发送失败", err));

    return entry;
  }

  /** 退款时冲正分佣 — 逆向 station 收益 + operator 管理奖 + 平台抽成，同一事务 */
  async reverseCommission(orderId: string) {
    // 分布式锁串行化同一订单的冲正：两入口（applyRefundedBookkeeping / handleRefundNotify 微信退款回调）
    // 并发到达时，findFirst(earned<0) 幂等判定非原子 → 双份负记录 + totalEarning 双倍 decrement。
    // 抢不到锁说明另一路正在冲正，直接幂等跳过；锁内保留 findFirst 判定作二次保险。
    const lockKey = `commission:reverse:${orderId}`;
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.log(`订单 ${orderId} 冲正处理中（并发跳过）`);
      return null;
    }
    try {
      return await this.doReverseCommission(orderId);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** reverseCommission 锁内实际执行体（幂等判定 + 事务冲正） */
  private async doReverseCommission(orderId: string) {
    // 幂等守卫：已存在冲正记录(earned<0)则跳过——防 fire-and-forget 重投 / 退款回调重投 / 重复倒扣为负
    const alreadyReversed =
      (await this.prisma.stationEarning.findFirst({ where: { orderId, earned: { lt: 0 } } })) ??
      (await this.prisma.operatorEarning.findFirst({ where: { orderId, earned: { lt: 0 } } })) ??
      (await this.prisma.platformFeeRecord.findFirst({ where: { sourceId: orderId, type: "REFUND" } }));
    if (alreadyReversed) {
      this.logger.log(`订单 ${orderId} 已冲正，跳过重复冲正`);
      return null;
    }

    const [stationEarning, operatorEarnings, platformFees] = await Promise.all([
      this.prisma.stationEarning.findFirst({ where: { orderId, earned: { gt: 0 } } }),
      this.prisma.operatorEarning.findMany({ where: { orderId, earned: { gt: 0 } } }),
      this.prisma.platformFeeRecord.findMany({ where: { sourceId: orderId } }),
    ]);

    // 平台费冲正缺口修复：无推荐人但有平台费的订单，也须冲正 platformFeeRecord（否则退款后平台收入虚高）
    if (!stationEarning && operatorEarnings.length === 0 && platformFees.length === 0) {
      // 佣-V2-P2：CIRCLE/OFFLINE_STATION 渠道佣金只落 LedgerEntry（无 StationEarning 等旧表记录），
      // 仍须冲正统一总账（reverse 自身幂等·无正向分账时空转无副作用）
      this.settlement
        ?.reverse("ORDER", orderId, "订单退款冲正")
        .catch((e) => this.logger.warn(`统一总账冲正失败(order=${orderId})`, e));
      this.logger.log(`订单 ${orderId} 无旧表分佣/平台费记录，跳过旧表冲正`);
      return null;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (stationEarning) {
        await tx.stationEarning.create({
          data: {
            stationId: stationEarning.stationId,
            orderId,
            amount: 0,
            rate: stationEarning.rate,
            earned: -stationEarning.earned,
            type: "REFUND",
          },
        });
        await tx.station.update({
          where: { id: stationEarning.stationId },
          data: { totalEarning: { decrement: stationEarning.earned } },
        });
      }

      if (operatorEarnings.length > 0) {
        await tx.operatorEarning.createMany({
          data: operatorEarnings.map((oe) => ({
            operatorId: oe.operatorId,
            orderId,
            source: oe.source,
            amount: 0,
            rate: oe.rate,
            earned: -oe.earned,
            sourceStationId: oe.sourceStationId ?? undefined,
            sourceOperatorId: oe.sourceOperatorId ?? undefined,
          })),
        });
        for (const oe of operatorEarnings) {
          await tx.operator.update({
            where: { id: oe.operatorId },
            data: { totalEarning: { decrement: oe.earned } },
          });
        }
      }

      if (platformFees.length > 0) {
        await tx.platformFeeRecord.createMany({
          data: platformFees.map((pf) => ({
            type: "REFUND",
            sourceId: orderId,
            sourceAmount: 0,
            platformRate: pf.platformRate,
            platformFee: -pf.platformFee,
            circleId: pf.circleId ?? undefined,
            circleShare: pf.circleShare ? -pf.circleShare : undefined,
          })),
        });
      }

      return { reversed: true };
    });

    // T1-P2b 统一总账同步冲正（幂等，失败仅记日志不阻断退款）
    this.settlement
      ?.reverse("ORDER", orderId, "订单退款冲正")
      .catch((e) => this.logger.warn(`统一总账冲正失败(order=${orderId})`, e));

    return result;
  }

  // ───────── 分站收益查询 ─────────

  async getStationEarnings(stationId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { stationId };
    const [earnings, total] = await Promise.all([
      this.prisma.stationEarning.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationEarning.count({ where }),
    ]);
    // 计算累计收益
    const sumResult = await this.prisma.stationEarning.aggregate({
      where,
      _sum: { earned: true },
    });
    return {
      earnings,
      total,
      page,
      pageSize,
      totalEarned: sumResult._sum.earned || 0,
    };
  }

  /**
   * 佣-V2-P4 站长"被临时抢佣"透明化明细（2026-07-04 拍板·设计 §四/§七防纠纷）。
   * 口径：用户永久归属我的分站（User.attributionStationId=我的分站）、但订单被有效期内的
   * 临时链接抢佣（tempReferrerId 非空且 ≠ 我）的已支付订单。
   * 隐私：orderId 打码（前 8 位），只暴露抢佣渠道类型（tempRefSubjectType），
   * 不暴露抢佣者身份细节（防纠纷升级）。仅站长本人可查（按 userId 定位自己的分站）。
   */
  async getStationPreemptedOrders(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const station = await this.prisma.station.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!station) throw new BusinessException(ErrorCode.FORBIDDEN, "您不是站长，无法查看被抢佣明细");

    const where: Prisma.OrderWhereInput = {
      user: { attributionStationId: station.id }, // 买家永久归属我的分站
      tempReferrerId: { not: null }, // 被临时链接归因
      NOT: { tempReferrerId: userId }, // 排除临时归因也是我自己（未被抢）
      status: { in: ["PAID", "SHIPPED", "COMPLETED"] }, // 只列实际产生佣金流向的已支付订单
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: { id: true, amount: true, tempRefSubjectType: true, createdAt: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      list: orders.map((o) => ({
        orderId: `${o.id.slice(0, 8)}****`, // 打码：仅前 8 位
        amount: Number(o.amount),
        subjectType: o.tempRefSubjectType || "STATION", // 抢佣渠道类型（NULL=现行分站临时链接）
        createdAt: o.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getStationBalance(stationId: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { totalEarning: true },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    // 计算已占用额度（PENDING/APPROVED/PAID 均占用，防止 PENDING 不计导致的重复提现）
    const withdrawn = await this.prisma.withdrawal.aggregate({
      where: { stationId, status: { in: OCCUPYING_WITHDRAW_STATUSES } },
      _sum: { amount: true },
    });

    // P2-c：引擎口径转正后收益真源=LedgerEntry 净结算额（STATION）；开关关则旧口径 Station.totalEarning
    const useLedger = this.ledgerBalance ? await this.ledgerBalance.isAuthoritative() : false;
    const totalEarned = useLedger
      ? await this.ledgerBalance!.getNetSettled("STATION", stationId)
      : Number(station.totalEarning);
    const totalWithdrawn = Number(withdrawn._sum.amount || 0);
    return {
      totalEarned,
      totalWithdrawn,
      balance: totalEarned - totalWithdrawn,
    };
  }

  // ───────── 提现管理 ─────────

  async applyWithdrawal(userId: string, dto: {
    amount: number;
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
    alipayAccount?: string;
    stationId?: string;
  }) {
    // 金额基本合法性校验（防御纵深，DTO 已校验正数/上限）
    if (!dto.amount || dto.amount <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现金额必须大于0");
    }
    if (dto.amount > MAX_WITHDRAW_RMB) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `单次提现金额不可超过 ¥${MAX_WITHDRAW_RMB}`);
    }

    // 查找分站
    let stationId = dto.stationId;
    if (stationId) {
      // 校验指定分站的所有权
      const owned = await this.prisma.station.findUnique({
        where: { id: stationId, userId },
      });
      if (!owned) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该分站");
    } else {
      const station = await this.prisma.station.findUnique({ where: { userId } });
      if (!station) throw new BusinessException(ErrorCode.BAD_REQUEST, "您还没有分站，无法提现");
      stationId = station.id;
    }

    // Redis 锁串行化同一分站的提现申请，防止并发绕过余额校验（重复提现套现）
    const lockKey = `withdraw:lock:station:${stationId}`;
    const locked = await this.redis.setNX(lockKey, "1", 10);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现处理中，请稍后再试");
    }
    try {
      // 锁内复核余额（getStationBalance 已把 PENDING 计入占用额度）
      const [{ balance }, cfg, sysCfg] = await Promise.all([
        this.getStationBalance(stationId),
        this.prisma.commissionConfig.findUnique({ where: { configKey: "withdrawal_min" } }),
        this.systemService?.getConfig("withdrawal_min").catch(() => null),
      ]);
      if (balance < dto.amount) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `余额不足，当前可提现余额 ¥${balance.toFixed(2)}`);
      }

      const minAmount = cfg ? Number(cfg.rateA)
        : sysCfg?.configValue ? Number(sysCfg.configValue)
        : 100;
      if (dto.amount < minAmount) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `最低提现金额为 ¥${minAmount}`);
      }

      const withdrawal = await this.prisma.withdrawal.create({
        data: {
          userId,
          stationId,
          amount: dto.amount,
          bankName: dto.bankName,
          bankAccount: dto.bankAccount ? encrypt(dto.bankAccount) : null,
          bankHolder: dto.bankHolder ? encrypt(dto.bankHolder) : null,
          alipayAccount: dto.alipayAccount ? encrypt(dto.alipayAccount) : null,
          status: "PENDING",
        },
      });

      this.webhook.fire("WITHDRAWAL_REQUESTED", {
        withdrawalId: withdrawal.id,
        userId,
        stationId,
        amount: dto.amount,
      }).catch((err) => this.logger.warn("Webhook 发送失败", err));

      return withdrawal;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async listWithdrawals(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = status ? { status } : {};
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          station: { select: { id: true, name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    // 解密敏感金融字段
    // 金融敏感字段解密后脱敏返回（银行卡只留后4位、持卡人保留姓氏、支付宝中段掩码），
    // 防管理端/用户端批量泄露完整卡号。管理员打款若需完整卡号应走独立的解密+审计接口。
    const decoded = withdrawals.map(w => ({
      ...w,
      bankAccount: w.bankAccount ? maskBankCard(decrypt(w.bankAccount)) : null,
      bankHolder: w.bankHolder ? maskName(decrypt(w.bankHolder)) : null,
      alipayAccount: w.alipayAccount ? maskAlipay(decrypt(w.alipayAccount)) : null,
    }));
    return { withdrawals: decoded, total, page, pageSize };
  }

  /**
   * 审核提现（管理员）。
   *
   * 🔴 资金安全（2026-07-13 加固，接入自动代付前的必备地基）：
   * 1. **状态白名单**：dto.status 曾是任意字符串直接写库 —— 管理员可写入任意值（含拼错的状态），
   *    坏掉的状态会让记录永久卡死或绕过后续流转校验。现在只接受 APPROVED / REJECTED。
   * 2. **CAS 防并发**：曾是 findUnique 检查 + update 无条件更新 —— 两个管理员同时点通过会双双成功
   *    （TOCTOU）。接入真实代付后这就是**重复打款**。现在用条件 updateMany（仅 PENDING 才翻），
   *    count===0 即说明已被他人处理。
   * 3. PENDING 不再允许一步直接置 PAID：打款是独立动作（confirmPayout），必须先 APPROVED。
   */
  async auditWithdrawal(id: string, dto: { status: string; remark?: string }, reviewerId: string) {
    if (!AUDIT_TARGET_STATUSES.includes(dto.status)) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `审核结果只能是 ${AUDIT_TARGET_STATUSES.join(" / ")}`,
      );
    }

    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现记录不存在");
    // 防自审自批：受益人不得审核自己的提现申请
    if (w.userId === reviewerId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能审核自己的提现申请");
    if (w.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该记录已处理");

    // CAS：仅当仍为 PENDING 才翻转，并发下只有一个请求能成功
    const flipped = await this.prisma.withdrawal.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: dto.status,
        remark: dto.remark,
        processedAt: new Date(),
      },
    });
    if (flipped.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该记录已被处理，请刷新后重试");
    }
    return this.prisma.withdrawal.findUnique({ where: { id } });
  }

  /**
   * 【P0·打款专用】取完整收款账户（解密）——线下人工打款的唯一合法通道。
   *
   * 此前列表接口一律脱敏返回（6222****1234），而注释里说的「独立的解密+审计接口」从未实现，
   * 导致管理员拿不到完整卡号 → **连线下人工打款都执行不了**（整条提现链路在人工这步就断了）。
   *
   * 安全约束（每一条都是刻意的）：
   * - 仅 APPROVED 状态可取：未审核/已驳回/已打款的记录不暴露卡号，最小化明文暴露面。
   * - 防自审自批：受益人不得为自己取号。
   * - **强制留痕**：每次取号写一条 AuditLog（谁、何时、取了哪条、金额）。审计写失败即拒绝返回卡号，
   *   宁可打不了款，也不允许出现"有人看了卡号但查不到是谁"。
   */
  async revealPayoutAccount(id: string, operatorId: string, ip?: string) {
    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现记录不存在");
    if (w.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能查看自己提现申请的收款账户");
    }
    if (w.status !== "APPROVED") {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "仅已审核通过（APPROVED）的提现可查看收款账户",
      );
    }

    // 先留痕再返回：审计失败则不给卡号（不可有"看了但无迹可查"的情况）
    if (!this.systemService) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "审计服务不可用，拒绝返回收款账户");
    }
    await this.systemService.logAudit({
      userId: operatorId,
      action: "REVEAL_PAYOUT_ACCOUNT",
      targetType: "WITHDRAWAL",
      targetId: id,
      detail: `查看提现收款账户（打款用）: withdrawal=${id}, 受益人=${w.userId}, 金额=¥${w.amount}`,
      ip,
    });

    return {
      id: w.id,
      amount: Number(w.amount),
      bankName: w.bankName,
      bankAccount: w.bankAccount ? decrypt(w.bankAccount) : null,
      bankHolder: w.bankHolder ? decrypt(w.bankHolder) : null,
      alipayAccount: w.alipayAccount ? decrypt(w.alipayAccount) : null,
    };
  }

  /**
   * 【P0·打款】确认已线下打款：APPROVED → PAID。
   *
   * payoutRef = 线下转账的银行流水号/支付宝订单号，**必填且全局唯一**——这是出款幂等键：
   * - 可追溯：每一笔 PAID 都能对上一条真实的银行流水；
   * - 防重复打款：同一流水号不可能被记两次（DB 唯一约束兜底）。
   * 接入自动代付后，payoutRef 直接复用为渠道的 out_bill_no，幂等语义不变。
   */
  async confirmPayout(id: string, payoutRef: string, operatorId: string) {
    const ref = (payoutRef || "").trim();
    if (!ref) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供打款流水号（银行/支付宝转账凭证号）");
    }

    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现记录不存在");
    if (w.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能为自己的提现申请确认打款");
    }

    // CAS：仅 APPROVED 可转 PAID，并发/重复点击只会成功一次
    const flipped = await this.prisma.withdrawal.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "PAID", payoutRef: ref, processedAt: new Date() },
    });
    if (flipped.count === 0) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        w.status === "PAID" ? "该提现已打款，请勿重复操作" : "仅已审核通过的提现可确认打款",
      );
    }

    this.webhook.fire("WITHDRAWAL_PAID", {
      withdrawalId: id, userId: w.userId, amount: Number(w.amount), payoutRef: ref,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));

    return this.prisma.withdrawal.findUnique({ where: { id } });
  }

  async getUserWithdrawals(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { userId };
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    // 解密敏感金融字段
    // 金融敏感字段解密后脱敏返回（银行卡只留后4位、持卡人保留姓氏、支付宝中段掩码），
    // 防管理端/用户端批量泄露完整卡号。管理员打款若需完整卡号应走独立的解密+审计接口。
    const decoded = withdrawals.map(w => ({
      ...w,
      bankAccount: w.bankAccount ? maskBankCard(decrypt(w.bankAccount)) : null,
      bankHolder: w.bankHolder ? maskName(decrypt(w.bankHolder)) : null,
      alipayAccount: w.alipayAccount ? maskAlipay(decrypt(w.alipayAccount)) : null,
    }));
    return { withdrawals: decoded, total, page, pageSize };
  }

  // ───────── 推荐链接 ─────────

  async createReferralLink(userId: string, dto: { targetType: string; targetId: string; channel?: string }) {
    // 生成短码
    const code = this.generateCode();
    return this.prisma.referralLink.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        code,
        channel: dto.channel || "DIRECT",
      },
    });
  }

  async getReferralLinks(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { userId };
    const [links, total] = await Promise.all([
      this.prisma.referralLink.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.referralLink.count({ where }),
    ]);
    return { links, total, page, pageSize };
  }

  async trackClick(code: string) {
    const link = await this.prisma.referralLink.findUnique({ where: { code } });
    if (!link) return null;
    await this.prisma.referralLink.update({
      where: { code },
      data: { clickCount: { increment: 1 } },
    });
    return { referrerId: link.userId, targetType: link.targetType, targetId: link.targetId };
  }

  // ───────── 运营商管理奖计算 ─────────

  /**
   * 计酬合规硬约束（《禁止传销条例》）：单笔订单的推广计酬不得超过两级 ——
   * ① 站长推广佣金（StationEarning）② 本方法产生的唯一一笔管理奖（MGMT_BONUS）。
   * 运营商自营分站（站长即运营商本人）的管理奖归其上级运营商：上级只对下级的
   * 「站长角色收入」计酬，不得对下级的管理奖收入再计酬，禁止任何形式的第三层计酬。
   *
   * 佣-V2-P1 改制（2026-07-04 拍板）：管理奖 = 站长实得佣金额 × (operator.mgmtRate ??
   * channelType 默认：ONLINE 10% / OFFLINE 20%)。原等级率(8/12/15/20%)与
   * CommissionConfig operator_<level> 覆盖均不再参与计算。管理奖为平台额外支出，
   * 不从站长佣金中扣减（保持现行口径）。
   */
  private async calculateOperatorBonus(
    stationId: string,
    orderId: string,
    stationEarned: number,
  ): Promise<{ operatorId: string; userId: string; rate: number; earned: number } | null> {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { userId: true, operatorId: true },
    });
    if (!station?.operatorId) return null;

    const operator = await this.prisma.operator.findUnique({
      where: { id: station.operatorId },
      select: { id: true, userId: true, parentOperatorId: true, status: true, channelType: true, mgmtRate: true },
    });
    if (!operator || operator.status !== "ACTIVE") return null;

    // 确定管理奖唯一受益人：自营分站上浮给上级运营商，普通分站归属其运营商
    let beneficiary = operator;
    if (operator.userId === station.userId) {
      if (!operator.parentOperatorId) return null; // 顶级运营商自营分站：无管理奖，平台留存
      const parentOp = await this.prisma.operator.findUnique({
        where: { id: operator.parentOperatorId },
        select: { id: true, userId: true, parentOperatorId: true, status: true, channelType: true, mgmtRate: true },
      });
      if (!parentOp || parentOp.status !== "ACTIVE") return null;
      beneficiary = parentOp;
    }

    // 比率取值链：逐运营商 mgmtRate 覆盖 → channelType 默认（ONLINE 0.10 / OFFLINE 0.20）
    const mgmtRate =
      beneficiary.mgmtRate != null
        ? Number(beneficiary.mgmtRate)
        : MGMT_RATE_DEFAULTS[beneficiary.channelType] ?? MGMT_RATE_DEFAULTS.ONLINE;
    if (mgmtRate <= 0) return null;

    const mgmtEarned = Math.round(stationEarned * mgmtRate * 100) / 100;
    if (mgmtEarned <= 0) return null;

    await this.prisma.operatorEarning.create({
      data: {
        operatorId: beneficiary.id,
        orderId,
        source: "MGMT_BONUS",
        // 字段语义（改制前后一致·佣-V2-P1 复核）：amount=计酬基数即站长实得佣金额，
        // rate=实际管理奖比率，earned=运营商所得
        amount: stationEarned,
        rate: mgmtRate,
        earned: mgmtEarned,
        sourceStationId: stationId,
        // 自营分站上浮时记录下级运营商，供审计追溯
        sourceOperatorId: beneficiary.id !== operator.id ? operator.id : undefined,
      },
    });
    await this.prisma.operator.update({
      where: { id: beneficiary.id },
      data: { totalEarning: { increment: mgmtEarned } },
    });
    this.prisma.notification.create({
      data: {
        userId: beneficiary.userId,
        type: "EARNING",
        title: "运营商管理奖",
        content: `您获得管理奖 ¥${mgmtEarned.toFixed(2)}（站长佣金 ¥${stationEarned.toFixed(2)}×${(mgmtRate * 100).toFixed(0)}%）`,
        targetType: "OPERATOR_EARNING",
        targetId: orderId,
      },
    }).catch((err) => this.logger.warn("管理奖通知发送失败", err));

    return { operatorId: beneficiary.id, userId: beneficiary.userId, rate: mgmtRate, earned: mgmtEarned };
  }

  /**
   * 站长佣金比例（rateA）按订单类型查询（供下单自购立减复用）；未配置返回 null。
   * 注：逐品率 Product.commissionRate（佣-V2-P1）仅在 calculateAndRecord 分佣时生效，
   * 自购立减暂仍按类型默认 rateA（逐品化自购立减留待后续任务包拍板）。
   */
  async getStationRate(type: string): Promise<number | null> {
    const config = await this.prisma.commissionConfig.findUnique({
      where: { configKey: this.mapTypeToConfigKey(type) },
    });
    const rate = config ? Number(config.rateA) : 0;
    return rate > 0 && rate < 1 ? rate : null;
  }

  /** 订单类型 → 统一结算引擎场景 */
  private mapTypeToScene(type: string): string {
    const map: Record<string, string> = {
      COURSE: "COURSE_ORDER",
      PRODUCT: "PRODUCT_ORDER",
      MEMBER: "MEMBER_PURCHASE",
      CIRCLE_JOIN: "CIRCLE_JOIN",
      BOT: "BOT_CALL",
      MERCHANT_PRODUCT: "MERCHANT_PRODUCT_ORDER",
    };
    return map[type] || "PRODUCT_ORDER";
  }

  // 注：原 lookupMgmtRates(level)（CommissionConfig operator_<level> 覆盖 → OPERATOR_MGMT_RATES
  // 等级率）已随 V2 管理奖改制废止（2026-07-04 拍板），比率取值见 calculateOperatorBonus。

  // ───────── 运营商收益查询 ─────────

  async getOperatorEarnings(operatorId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { operatorId };
    const [earnings, total] = await Promise.all([
      this.prisma.operatorEarning.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.operatorEarning.count({ where }),
    ]);
    const sumResult = await this.prisma.operatorEarning.aggregate({
      where,
      _sum: { earned: true },
    });
    return {
      earnings,
      total,
      page,
      pageSize,
      totalEarned: sumResult._sum.earned || 0,
    };
  }

  async getOperatorBalance(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { totalEarning: true },
    });
    if (!operator) throw new BusinessException(ErrorCode.NOT_FOUND, "运营商不存在");
    // P2-c：引擎口径转正后收益真源=LedgerEntry 净结算额（OPERATOR）；运营商暂无独立提现表，无占用扣减
    const useLedger = this.ledgerBalance ? await this.ledgerBalance.isAuthoritative() : false;
    const totalEarned = useLedger
      ? await this.ledgerBalance!.getNetSettled("OPERATOR", operatorId)
      : Number(operator.totalEarning);
    return {
      totalEarned,
      balance: totalEarned,
    };
  }

  // ───────── 辅助方法 ─────────

  // ═══════════════════════════════════════════
  // 平台抽成（平台从每笔交易中抽取的费用）
  // ═══════════════════════════════════════════

  /**
   * 计算平台抽成
   * @returns { platformFee, platformRate } 或 null（未配置时）
   */
  /**
   * 圈子双轨费率：由该圈子的收款主体（PayeeAccount）决定平台分成。
   * 返回 null = 该圈子尚未进件 → 调用方回落原有全局费率体系（存量行为不变）。
   *
   * 注：SELF_COLLECT 时钱直接进圈主的渠道账户、平台通过分账取走这一份，
   * 本记录仍然写（口径一致、可对账），但资金通道的切换在批次2（汇付收单+分账）。
   */
  private async resolveCircleSplit(
    circleId: string,
    amount: number,
  ): Promise<{ platformFee: number; platformRate: number } | null> {
    if (!this.payeeAccount) return null;
    try {
      const s = await this.payeeAccount.resolveSettlement("CIRCLE", circleId);
      if (s.status === "NONE") return null; // 未进件 → 回落原体系
      const rate = s.platformRate;
      if (!(rate > 0 && rate <= 1)) return null;
      return {
        platformFee: Math.round(amount * rate * 100) / 100,
        platformRate: rate,
      };
    } catch (e) {
      this.logger.warn(`圈子双轨费率解析失败(circle=${circleId})，回落全局费率`, e as Error);
      return null;
    }
  }

  async calculatePlatformFee(type: string, amount: number): Promise<{ platformFee: number; platformRate: number } | null> {
    // 与正向分佣(calculateAndRecord)口径统一：订单类型枚举(COURSE/PRODUCT/...)需先映射成 CommissionConfig.configKey。
    // 原实现用原始 type 直查，订单侧(大写枚举)恒查不到 → 平台费从不入账(财务对账漏记)。
    // mapTypeToConfigKey 已做幂等：圈子收益侧直传的 configKey(circle_join/gift 等小写)原样返回，口径不变。
    const config = await this.prisma.commissionConfig.findUnique({
      where: { configKey: this.mapTypeToConfigKey(type) },
    });
    if (!config) return null;

    const rate = Number(config.rateB); // rateB = 平台抽成比例
    if (rate <= 0) return null;

    return {
      platformFee: Math.round(amount * rate * 100) / 100,
      platformRate: rate,
    };
  }

  /** 记录平台抽成 */
  async recordPlatformFee(params: {
    type: string;
    sourceId: string;
    sourceAmount: number;
    platformRate: number;
    platformFee: number;
    circleId?: string;
    circleShare?: number;
  }) {
    return this.prisma.platformFeeRecord.create({
      data: {
        type: params.type,
        sourceId: params.sourceId,
        sourceAmount: params.sourceAmount,
        platformRate: params.platformRate,
        platformFee: params.platformFee,
        circleId: params.circleId,
        circleShare: params.circleShare,
      },
    });
  }

  /** 获取平台抽成汇总 */
  async getPlatformFeeSummary(startDate?: Date, endDate?: Date) {
    const where: Prisma.PlatformFeeRecordWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, byType] = await Promise.all([
      this.prisma.platformFeeRecord.aggregate({
        where,
        _sum: { platformFee: true, sourceAmount: true },
        _count: true,
      }),
      this.prisma.platformFeeRecord.groupBy({
        by: ["type"],
        where,
        _sum: { platformFee: true },
      }),
    ]);

    return {
      totalRecords: total._count,
      totalAmount: total._sum.sourceAmount || 0,
      totalPlatformFee: total._sum.platformFee || 0,
      byType: byType.map((b) => ({
        type: b.type,
        platformFee: b._sum.platformFee || 0,
      })),
    };
  }

  // ═══════════════════════════════════════════
  // 圈主收益
  // ═══════════════════════════════════════════

  /**
   * 计算并记录圈主收益
   * @param circleId 圈子ID
   * @param type 收入类型
   * @param sourceId 来源记录ID
   * @param amount 原始金额
   */
  async recordCircleRevenue(
    circleId: string,
    type: string,
    sourceId: string,
    amount: number,
  ) {
    // ── 圈子双轨（董事长 2026-07-14 拍板）──
    // 平台分成由该圈子的【收款主体】决定，而不是按收入类型查全局费率：
    //   无执照圈主 → 平台收款（平台是经营者，担内容/纠纷责任）→ 平台抽 50%
    //   有执照圈主 → 圈主企业自收款（责任随钱外移）      → 平台抽 20%
    // 费率差本身就是治理工具：圈主收入越大，这 30 个点越肉疼，他自己会去办执照。
    // 平台背高风险时收高价、风险外移后主动降价 —— 定价与风险严格对称。
    //
    // 未进件的圈子回落到原有的全局费率体系，存量行为不变（additive）。
    let fee = await this.resolveCircleSplit(circleId, amount);
    if (!fee) fee = await this.calculatePlatformFee(type, amount);
    const platformFee = fee?.platformFee || 0;

    // 圈主分成 = 金额 - 平台抽成
    const ownerShare = amount - platformFee;
    const splitRate = amount > 0 ? ownerShare / amount : 0;

    const [record] = await Promise.all([
      this.prisma.circleRevenueRecord.create({
        data: {
          circleId,
          type,
          sourceId,
          amount,
          platformFee,
          ownerShare: Math.round(ownerShare * 100) / 100,
          splitRate: Math.round(splitRate * 10000) / 10000,
        },
      }),
      // 同时记录平台抽成
      fee
        ? this.recordPlatformFee({
            type,
            sourceId,
            sourceAmount: amount,
            platformRate: fee.platformRate,
            platformFee: fee.platformFee,
            circleId,
            circleShare: Math.round(ownerShare * 100) / 100,
          })
        : Promise.resolve(),
    ]);

    return record;
  }

  /** 获取圈主收益汇总 */
  async getCircleRevenueSummary(circleId: string) {
    const [total, settled, byType] = await Promise.all([
      this.prisma.circleRevenueRecord.aggregate({
        where: { circleId },
        _sum: { amount: true, platformFee: true, ownerShare: true },
        _count: true,
      }),
      this.prisma.circleRevenueRecord.aggregate({
        where: { circleId, settled: true },
        _sum: { ownerShare: true },
      }),
      this.prisma.circleRevenueRecord.groupBy({
        by: ["type"],
        where: { circleId },
        _sum: { amount: true, ownerShare: true },
      }),
    ]);

    return {
      totalRecords: total._count,
      totalAmount: total._sum.amount || 0,
      totalPlatformFee: total._sum.platformFee || 0,
      totalOwnerShare: total._sum.ownerShare || 0,
      settledAmount: settled._sum.ownerShare || 0,
      byType: byType.map((b) => ({
        type: b.type,
        amount: b._sum.amount || 0,
        ownerShare: b._sum.ownerShare || 0,
      })),
    };
  }

  /** 获取圈主收益明细 */
  async getCircleRevenueRecords(circleId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { circleId };
    const [records, total] = await Promise.all([
      this.prisma.circleRevenueRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.circleRevenueRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
  }

  private mapTypeToConfigKey(type: string): string {
    const map: Record<string, string> = {
      COURSE: "course_basic",
      PRODUCT: "product_platform",
      MEMBER: "station_member",
      CIRCLE_JOIN: "circle_join",
      BOT: "bot_call",
      MERCHANT_PRODUCT: "merchant_product",
    };
    // 大写订单类型枚举 → 配置key
    if (type in map) return map[type];
    // 幂等：圈子收益侧(recordCircleRevenue)直传的已是配置key(小写，如 circle_join / gift / circle_join_referral)，
    // 原样返回以保持既有平台费口径（gift 无对应 config → 查不到 → 返 null，圈主拿全额，行为不变）；
    // 仅未知【大写枚举】才兜底到 product_platform（保持 calculateAndRecord/getCommissionRate 原行为不变）。
    if (type === type.toLowerCase()) return type;
    return "product_platform";
  }

  private generateCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[randomInt(0, chars.length)];
    }
    return code;
  }

  // ───────── 新增：分佣配置快捷管理 ─────────

  async getCommissionConfig() {
    const configs = await this.prisma.commissionConfig.findMany();
    const result: Record<string, {
      rateA: number; rateB: number; rateC: number | null;
      configName: string | null; description: string | null;
    }> = {};
    for (const cfg of configs) {
      result[cfg.configKey] = {
        rateA: Number(cfg.rateA),
        rateB: Number(cfg.rateB),
        rateC: cfg.rateC ? Number(cfg.rateC) : null,
        configName: cfg.configName,
        description: cfg.description,
      };
    }
    return result;
  }

  async updateCommissionConfig(type: string, rate: number) {
    let config = await this.prisma.commissionConfig.findUnique({ where: { configKey: type } });
    if (!config) {
      config = await this.prisma.commissionConfig.create({
        data: {
          configKey: type,
          configName: type,
          rateA: rate,
          rateB: 0,
        },
      });
    } else {
      config = await this.prisma.commissionConfig.update({
        where: { configKey: type },
        data: { rateA: rate },
      });
    }

    // 保存变更记录到 ConfigVersion
    await this.prisma.configVersion.create({
      data: {
        configKey: `commission_config_${type}`,
        value: { rate },
        version: 1,
        comment: `更新 ${type} 分佣比例为 ${rate}`,
      },
    });

    this.logger.log(`分佣配置已更新: ${type} = ${rate}`);
    return config;
  }
}
