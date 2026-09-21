import { Injectable, Logger, Optional } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SystemService } from "../system/system.service";

/**
 * 小卜语音额度与用量账本（S10）
 *
 * 规则（交接书 + 《小卜语音业务规划》）：
 * - 会话开始先原子预留额度（条件更新），并发会话不能重复花同一笔余额；额度不足时不允许开始新会话
 * - 结算以供应商用量为准；供应商用量接口未接通前按客户端估算结算，usageSource=estimate，待对账
 * - 所有余额变动写流水，流水幂等键唯一：同一笔发放/结算重复到达只记一次
 * - 金额用整数：时长为秒，供应商成本为百万分之一元（micro），不使用浮点
 * - 费率与是否向用户收费由后台配置 voice_billing_config 决定；**默认不向用户收费**（等待拍板），但仍记录供应商成本
 * - 静音不等于停止计费；会话结束必须由服务端结算
 */

export interface VoiceBillingConfig {
  version: string;
  /** 是否向用户扣减额度；未拍板前默认 false */
  chargeUsers: boolean;
  /** 未收费时单次会话时长上限（秒），防止成本失控 */
  freeSessionMaxSeconds: number;
  /** 收费时单次会话时长上限（秒） */
  sessionMaxSeconds: number;
  /** 开始会话要求的最少可用额度（秒） */
  minStartSeconds: number;
  /** 供应商成本（百万分之一元/分钟）；来源：用户 2026-09-14 转述报价，以合同为准 */
  supplierMicroPerMinute: { lite: number; standard: number };
  /** 售价与赠送额度（决策人 2026-09-17 拍板）；金额单位一律 micro 元（1 元 = 1_000_000） */
  pricing: VoicePricingConfig;
}

/**
 * 售价配置（决策人 2026-09-17 拍板）
 *
 * 注意：价格已定，但 chargeUsers 仍默认 false——真实语音链路（小智商业 API）未接通前，
 * 不能先把用户挡在付费墙后面。链路就绪后由运营后台打开开关，不需要改代码。
 */
export interface VoicePricingConfig {
  /** 排盘报告售价：29 元 */
  reportPriceMicro: number;
  /** 报告附带的语音时长：30 分钟 */
  reportIncludedSeconds: number;
  /** 报告内时长用尽后的续费单价：2 元/分钟 */
  userMicroPerMinute: number;
  /** 广场智能体单价：2 元/分钟（与续费同价，统一心智） */
  agentMicroPerMinute: number;
  /** 广场试聊：每个智能体 3 分钟 */
  trialSecondsPerAgent: number;
  /** 广场试聊：每个用户最多试聊几个智能体 */
  trialMaxAgents: number;
  /** 圈子语音助理：从圈主余额扣，0.1 元/分钟 */
  circleMicroPerMinute: number;
  /** 圈子语音助理：赠送圈主 500 分钟 */
  circleGrantSeconds: number;
  /**
   * 圈子助理锁定档位。
   * 风险提示：0.1 元/分钟在 standard 档（0.081）毛利仅 19%，且未计模型与检索成本，可能亏损；
   * lite 档（0.041）毛利 59%。默认锁 lite，改动需决策人确认。
   */
  circleTier: "lite" | "standard";
  /** 圈子助理是否向圈成员收费：决策人明确「暂不收费」 */
  chargeCircleMembers: boolean;
  /** 到点后的收尾宽限（秒）：绝不半句话切断 */
  graceSeconds: number;
  /** 剩余时长提示节点（秒），由大到小 */
  warnAtSeconds: number[];
  /** 试聊剩余提示节点（秒）：只提示一次，全程倒计时会产生压迫感 */
  trialWarnAtSeconds: number[];
}

/** 1 元 = 1_000_000 micro */
const YUAN = 1_000_000;

export const DEFAULT_VOICE_PRICING: VoicePricingConfig = {
  reportPriceMicro: 29 * YUAN,
  reportIncludedSeconds: 30 * 60,
  userMicroPerMinute: 2 * YUAN,
  agentMicroPerMinute: 2 * YUAN,
  trialSecondsPerAgent: 3 * 60,
  trialMaxAgents: 5,
  circleMicroPerMinute: YUAN / 10, // 0.1 元
  circleGrantSeconds: 500 * 60,
  circleTier: "lite",
  chargeCircleMembers: false,
  graceSeconds: 60,
  warnAtSeconds: [300, 60],
  trialWarnAtSeconds: [30],
};

export const DEFAULT_VOICE_BILLING: VoiceBillingConfig = {
  version: "priced-2026-09-17",
  // 价格已拍板，但真实语音链路未接通前不向用户扣费；链路就绪后由运营后台打开
  chargeUsers: false,
  freeSessionMaxSeconds: 180,
  sessionMaxSeconds: 1800,
  minStartSeconds: 60,
  supplierMicroPerMinute: { lite: 41_000, standard: 81_000 },
  pricing: DEFAULT_VOICE_PRICING,
};

export type VoiceTier = "lite" | "standard";

@Injectable()
export class VoiceQuotaService {
  private readonly logger = new Logger(VoiceQuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly system?: SystemService,
  ) {}

  async getConfig(): Promise<VoiceBillingConfig> {
    try {
      const cfg = await this.system?.getConfig("voice_billing_config");
      if (cfg?.configValue) {
        const parsed = JSON.parse(cfg.configValue);
        return {
          ...DEFAULT_VOICE_BILLING,
          ...parsed,
          supplierMicroPerMinute: { ...DEFAULT_VOICE_BILLING.supplierMicroPerMinute, ...(parsed.supplierMicroPerMinute || {}) },
          pricing: { ...DEFAULT_VOICE_PRICING, ...(parsed.pricing || {}) },
        };
      }
    } catch (error: any) {
      this.logger.warn(`语音计费配置解析失败，使用默认（不向用户收费）：${error?.message || error}`);
    }
    return DEFAULT_VOICE_BILLING;
  }

  /** 供应商成本（micro 元），按分钟向上取整前先保留秒级精度：秒 × 每分钟单价 / 60，向上取整到 micro */
  supplierCostMicro(seconds: number, tier: VoiceTier, cfg: VoiceBillingConfig): bigint {
    const perMinute = BigInt(cfg.supplierMicroPerMinute[tier]);
    const s = BigInt(Math.max(0, Math.floor(seconds)));
    return (s * perMinute + 59n) / 60n;
  }

  /**
   * 售价 / 成本 / 毛利概览：供运营后台显示与定价复核。
   * 毛利率按「单分钟售价 − 该档供应商成本」计，不含模型、带宽与支付通道费，实际毛利低于此值。
   */
  pricingOverview(cfg: VoiceBillingConfig) {
    const p = cfg.pricing;
    const rate = (tier: VoiceTier) => cfg.supplierMicroPerMinute[tier];
    /** 毛利率百分比，保留一位小数；售价为 0 时返回 null（免费项无毛利概念） */
    const margin = (priceMicro: number, costMicro: number) =>
      priceMicro > 0 ? Math.round((1 - costMicro / priceMicro) * 1000) / 10 : null;

    const reportVoiceCost = Math.ceil((p.reportIncludedSeconds * rate("lite")) / 60);
    const items = [
      {
        key: "report",
        label: "排盘报告（含 30 分钟语音）",
        priceMicro: p.reportPriceMicro,
        costMicro: reportVoiceCost,
        note: "语音按 lite 档用满估算，未计报告模型生成成本",
        marginPercent: margin(p.reportPriceMicro, reportVoiceCost),
      },
      {
        key: "user_minute",
        label: "语音续费（每分钟）",
        priceMicro: p.userMicroPerMinute,
        costMicro: rate("lite"),
        note: "",
        marginPercent: margin(p.userMicroPerMinute, rate("lite")),
      },
      {
        key: "agent_minute",
        label: "广场智能体（每分钟）",
        priceMicro: p.agentMicroPerMinute,
        costMicro: rate("standard"),
        note: "按 standard 档保守估算",
        marginPercent: margin(p.agentMicroPerMinute, rate("standard")),
      },
      {
        key: "circle_minute",
        label: "圈子助理（每分钟，圈主付）",
        priceMicro: p.circleMicroPerMinute,
        costMicro: rate(p.circleTier),
        note: `锁定 ${p.circleTier} 档`,
        marginPercent: margin(p.circleMicroPerMinute, rate(p.circleTier)),
      },
    ];

    // 平台需承担的赠送/试聊成本（按圈子助理档位与 lite 档估算）
    const circleGrantCostMicro = Math.ceil((p.circleGrantSeconds * rate(p.circleTier)) / 60);
    const trialCostPerUserMicro = Math.ceil((p.trialSecondsPerAgent * p.trialMaxAgents * rate("lite")) / 60);

    const warnings: string[] = [];
    const circleMargin = margin(p.circleMicroPerMinute, rate(p.circleTier));
    if (circleMargin !== null && circleMargin < 40) {
      warnings.push(
        `圈子助理毛利仅 ${circleMargin}%（${p.circleTier} 档），未计模型与检索成本，可能亏损；建议锁 lite 档`,
      );
    }
    warnings.push(
      `每开通一个圈子赠送 ${p.circleGrantSeconds / 60} 分钟，平台承担约 ${(circleGrantCostMicro / 1_000_000).toFixed(2)} 元/圈；按圈子数量线性放大，建议改「圈主确认后开通」并设有效期`,
    );
    warnings.push(
      `每用户试聊额度 ${(p.trialSecondsPerAgent * p.trialMaxAgents) / 60} 分钟，平台承担约 ${(trialCostPerUserMicro / 1_000_000).toFixed(3)} 元/人；须按实名用户 + 设备双重限额防刷`,
    );

    return {
      chargeUsers: cfg.chargeUsers,
      chargeCircleMembers: p.chargeCircleMembers,
      items,
      circleGrantCostMicro,
      trialCostPerUserMicro,
      warnings,
    };
  }

  async ensureAccount(ownerType: "user" | "circle", ownerId: string) {
    return this.prisma.voiceQuotaAccount.upsert({
      where: { ownerType_ownerId: { ownerType, ownerId } },
      create: { ownerType, ownerId },
      update: {},
    });
  }

  /** 发放额度（购买、会员权益、运营补偿）；幂等键重复时不重复发放 */
  async grant(input: { ownerType: "user" | "circle"; ownerId: string; seconds: number; idempotencyKey: string; note?: string; operatorId?: string }) {
    if (!Number.isInteger(input.seconds) || input.seconds <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "发放时长必须为正整数秒");
    }
    const account = await this.ensureAccount(input.ownerType, input.ownerId);
    const existed = await this.prisma.voiceQuotaLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existed) return { duplicated: true, ledger: existed };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.voiceQuotaAccount.update({
          where: { id: account.id },
          data: { balanceSeconds: { increment: input.seconds } },
        });
        const ledger = await tx.voiceQuotaLedger.create({
          data: {
            accountId: account.id,
            type: "grant",
            seconds: input.seconds,
            balanceAfter: updated.balanceSeconds,
            idempotencyKey: input.idempotencyKey,
            note: input.note,
            operatorId: input.operatorId,
          },
        });
        return { duplicated: false, ledger };
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        const ledger = await this.prisma.voiceQuotaLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        return { duplicated: true, ledger };
      }
      throw error;
    }
  }

  /**
   * 发放报告附带的语音时长（决策人定价：29 元一份报告，含 30 分钟语音）。
   *
   * 幂等键绑定报告 id：同一份报告重新生成不会重复发放——报告可以反复重算，
   * 但用户为它付的是一次钱，时长也只该给一次。
   */
  async grantForReport(userId: string, reportId: string) {
    const cfg = await this.getConfig();
    const seconds = cfg.pricing.reportIncludedSeconds;
    if (seconds <= 0) return { duplicated: true, ledger: null };
    return this.grant({
      ownerType: "user",
      ownerId: userId,
      seconds,
      idempotencyKey: `report:${reportId}`,
      note: `排盘报告附带语音 ${Math.round(seconds / 60)} 分钟`,
    });
  }

  /**
   * 圈子语音助理开通即赠送（决策人定：前期默认开通，默认送圈主 500 分钟）。
   * 幂等键绑角色 id：驳回后重新提交再通过，也只送这一次。
   */
  async grantCircleWelcome(circleId: string, profileId: string) {
    const cfg = await this.getConfig();
    const seconds = cfg.pricing.circleGrantSeconds;
    if (seconds <= 0) return { duplicated: true, ledger: null };
    return this.grant({
      ownerType: "circle",
      ownerId: circleId,
      seconds,
      idempotencyKey: `circle-welcome:${profileId}`,
      note: `圈子语音助理开通赠送 ${Math.round(seconds / 60)} 分钟`,
    });
  }

  /**
   * 圈主视角的额度看板。
   *
   * 圈主是自掏腰包供养这个助理的，光给一个余额数字不够用——他需要知道
   * **烧得有多快、还能撑多久**，才谈得上决定要不要充值、要不要控制用量。
   * 因此这里把近 7 天实际消耗、日均、以及按当前速度的可用天数一并算出来。
   */
  async circleDashboard(circleId: string) {
    const cfg = await this.getConfig();
    const account = await this.prisma.voiceQuotaAccount.findUnique({
      where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } },
    });
    const available = account ? account.balanceSeconds - account.reservedSeconds : 0;

    const since = new Date(Date.now() - 7 * 86400_000);
    const recent = account
      ? await this.prisma.voiceQuotaLedger.findMany({
          where: { accountId: account.id, type: "consume", createdAt: { gte: since } },
          select: { seconds: true },
        })
      : [];
    // consume 记的是负数，取绝对值
    const usedLast7d = recent.reduce((sum, r) => sum + Math.abs(r.seconds), 0);
    const dailyAvg = Math.round(usedLast7d / 7);
    // 日均为 0 时不谈「还能用几天」——刚开通就说「可用 99999 天」是假精确
    const daysLeft = dailyAvg > 0 ? Math.floor(available / dailyAvg) : null;

    return {
      circleId,
      availableSeconds: available,
      availableMinutes: Math.floor(available / 60),
      reservedSeconds: account?.reservedSeconds ?? 0,
      usedLast7dSeconds: usedLast7d,
      dailyAvgSeconds: dailyAvg,
      /** 按最近 7 天的速度还能用几天；用量太少时为 null（不给假精确的数字） */
      daysLeft,
      /** 圈主的成本单价（分/分钟）：0.1 元 */
      pricePerMinuteCents: Math.round(cfg.pricing.circleMicroPerMinute / 10_000),
      grantedSeconds: cfg.pricing.circleGrantSeconds,
      /** 是否向圈成员收费：决策人明确「暂不收费」 */
      chargeMembers: cfg.pricing.chargeCircleMembers,
      /**
       * 余额耗尽后助理并不会消失，而是**退回文字问答**。
       * 圈成员感知到的是「助理还在，只是不语音」，不是「圈子坏了」——
       * 突然哑掉会让成员以为圈主把服务停了，这笔账最后算在圈主头上。
       */
      exhaustedBehavior: "fallback_to_text" as const,
      /** 余额低于此值时提醒圈主（秒）：按日均给一天的提前量，无日均时给 30 分钟兜底 */
      warnBelowSeconds: Math.max(dailyAvg, 30 * 60),
    };
  }

  /**
   * 开始会话：收费模式下原子预留额度；免费模式不扣额度但限制时长。
   * 预留量 = min(可用额度, 单次上限)，可用额度不足 minStartSeconds 时拒绝。
   */
  async startSession(input: {
    userId: string;
    scene: string;
    contextType?: string;
    contextId?: string;
    tier?: VoiceTier;
    account?: { ownerType: "user" | "circle"; ownerId: string };
    /** 会话编排层附加字段（供应商、关联 ID、幂等键、上下文摘要等），不参与额度计算 */
    extra?: Omit<Prisma.VoiceSessionUncheckedCreateInput, "userId" | "scene" | "maxSeconds">;
  }) {
    const cfg = await this.getConfig();
    const tier = input.tier ?? "lite";

    if (!cfg.chargeUsers) {
      return this.prisma.voiceSession.create({
        data: {
          ...(input.extra || {}),
          userId: input.userId,
          scene: input.scene,
          contextType: input.contextType,
          contextId: input.contextId,
          tier,
          status: "reserved",
          reservedSeconds: 0,
          maxSeconds: cfg.freeSessionMaxSeconds,
          priceRuleVersion: cfg.version,
        },
      });
    }

    const owner = input.account ?? { ownerType: "user" as const, ownerId: input.userId };
    const account = await this.ensureAccount(owner.ownerType, owner.ownerId);

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.voiceQuotaAccount.findUniqueOrThrow({ where: { id: account.id } });
      const available = fresh.balanceSeconds - fresh.reservedSeconds;
      if (available < cfg.minStartSeconds) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "语音额度不足，请先获取额度后再开始通话");
      }
      const reserve = Math.min(available, cfg.sessionMaxSeconds);
      // 条件更新：只有在余额、预留都未被并发修改时才预留成功
      const result = await tx.voiceQuotaAccount.updateMany({
        where: { id: account.id, balanceSeconds: fresh.balanceSeconds, reservedSeconds: fresh.reservedSeconds },
        data: { reservedSeconds: { increment: reserve } },
      });
      if (result.count !== 1) {
        throw new BusinessException(ErrorCode.CONFLICT, "额度正在被其他通话使用，请稍后重试");
      }
      return tx.voiceSession.create({
        data: {
          ...(input.extra || {}),
          userId: input.userId,
          accountId: account.id,
          scene: input.scene,
          contextType: input.contextType,
          contextId: input.contextId,
          tier,
          status: "reserved",
          reservedSeconds: reserve,
          maxSeconds: reserve,
          priceRuleVersion: cfg.version,
        },
      });
    });
  }

  /**
   * 结算会话（幂等）：已结算的会话重复调用直接返回。
   * 实际用量超过预留时只扣到预留量，超出部分记录在会话上（usedSeconds），流水 note 标注超额，交由对账处理。
   */
  async settleSession(input: {
    sessionId: string;
    usedSeconds: number;
    usageSource: "vendor" | "estimate";
    endReason: string;
    providerSessionId?: string;
  }) {
    return this.finalizeSession({
      sessionId: input.sessionId,
      usedSeconds: input.usedSeconds,
      usageSource: input.usageSource,
      usageState: input.usageSource === "vendor" ? "vendor" : "estimated",
      endReason: input.endReason,
      providerSessionId: input.providerSessionId,
      status: "ended",
    });
  }

  /**
   * 收尾会话（幂等、单事务）：结束 / 失败 / 取消都走这里。
   *
   * - usedSeconds 为 null 表示**用量未知**：只释放预留、不扣额度、不记成本，usageState 记 unknown，
   *   交由对账处理——绝不填 0 冒充「没用」。
   * - 只从 fromStatuses 列出的状态转出（条件更新），并发的两次结束只有一次生效。
   * - mock 用量照常走流水以便测试，但 note 明确标注「模拟供应商，非真实计费」。
   */
  async finalizeSession(input: {
    sessionId: string;
    usedSeconds: number | null;
    usageSource: "vendor" | "estimate" | "mock" | null;
    usageState: "none" | "pending" | "vendor" | "estimated" | "unknown" | "mock";
    endReason: string;
    status: "ended" | "failed" | "cancelled" | "ending";
    providerSessionId?: string;
    technicalOutcome?: string | null;
    answerCompleteness?: string | null;
    fromStatuses?: string[];
  }) {
    const cfg = await this.getConfig();
    const from = input.fromStatuses ?? ["reserved", "active", "ending"];
    const used = input.usedSeconds == null ? null : Math.max(0, Math.floor(input.usedSeconds));

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.voiceSession.findUniqueOrThrow({ where: { id: input.sessionId } });
      if (!from.includes(session.status)) {
        return { session, duplicated: true };
      }
      const tier = (session.tier === "standard" ? "standard" : "lite") as VoiceTier;
      const closing = input.status !== "ending";
      const closed = await tx.voiceSession.updateMany({
        where: { id: session.id, status: session.status },
        data: {
          status: input.status,
          usedSeconds: used,
          usageSource: input.usageSource,
          usageState: input.usageState,
          endReason: input.endReason,
          ...(input.providerSessionId ? { providerSessionId: input.providerSessionId } : {}),
          ...(input.technicalOutcome !== undefined ? { technicalOutcome: input.technicalOutcome } : {}),
          ...(input.answerCompleteness !== undefined ? { answerCompleteness: input.answerCompleteness } : {}),
          supplierCostMicro: used == null || input.usageSource === "mock" ? null : this.supplierCostMicro(used, tier, cfg),
          ...(closing ? { endedAt: new Date() } : {}),
        },
      });
      if (closed.count !== 1) {
        return { session: await tx.voiceSession.findUniqueOrThrow({ where: { id: session.id } }), duplicated: true };
      }

      // 「结束中」只是等回调，不动额度；真正收尾时再扣/释放
      if (closing && session.accountId && session.reservedSeconds > 0) {
        const consume = used == null ? 0 : Math.min(used, session.reservedSeconds);
        const account = await tx.voiceQuotaAccount.update({
          where: { id: session.accountId },
          data: {
            reservedSeconds: { decrement: session.reservedSeconds },
            balanceSeconds: { decrement: consume },
          },
        });
        if (consume > 0) {
          await tx.voiceQuotaLedger.create({
            data: {
              accountId: session.accountId,
              sessionId: session.id,
              type: "consume",
              seconds: -consume,
              balanceAfter: account.balanceSeconds,
              idempotencyKey: `voice-session-consume:${session.id}`,
              note: [
                input.usageSource === "mock"
                  ? "模拟供应商用量，非真实计费"
                  : input.usageSource === "estimate"
                    ? "按客户端估算结算，待供应商用量对账"
                    : "按供应商用量结算",
                used != null && used > session.reservedSeconds ? `超出预留 ${used - session.reservedSeconds} 秒未扣，待对账` : "",
              ].filter(Boolean).join("；"),
            },
          });
        }
      }
      return { session: await tx.voiceSession.findUniqueOrThrow({ where: { id: session.id } }), duplicated: false };
    });
  }

  /** 查询可用额度（余额 − 预留） */
  async getAvailable(ownerType: "user" | "circle", ownerId: string) {
    const account = await this.prisma.voiceQuotaAccount.findUnique({ where: { ownerType_ownerId: { ownerType, ownerId } } });
    const cfg = await this.getConfig();
    return {
      chargeUsers: cfg.chargeUsers,
      balanceSeconds: account?.balanceSeconds ?? 0,
      reservedSeconds: account?.reservedSeconds ?? 0,
      availableSeconds: account ? account.balanceSeconds - account.reservedSeconds : 0,
    };
  }
}
