import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 分账规则单条定义（SettlementRule.splits 元素） */
export interface SplitDef {
  role: string; // PROVIDER / STATION / OPERATOR / CIRCLE_OWNER / PLATFORM
  rate: number;
  basis: "GROSS" | "PARENT_SPLIT";
  category: "COMMISSION" | "SERVICE" | "PLATFORM";
  parentRole?: string; // basis=PARENT_SPLIT 时计酬基数来源角色（须先于本条出现）
}

/** 各角色分账主体（业务方调用时提供） */
export interface SettleParty {
  type: "USER" | "STATION" | "OPERATOR" | "MERCHANT" | "PLATFORM";
  id: string;
  userId?: string; // 主体对应的自然人（自买自卖校验用）
  /** 过渡期比例覆盖：以现有真源（如 CommissionConfig.rateA/运营商等级比例）为准，保证总账与实付一致；P2-c 切换后移除 */
  rateOverride?: number;
}

export interface SettleParams {
  scene: string;
  refType: string; // 交易凭据类型：ORDER / GIFT_RECORD / CONSULT_CALL ...
  refId: string;
  amount: number; // 交易总额（元）
  payerId: string; // 付款人 userId
  parties: Record<string, SettleParty | undefined>; // key = SplitDef.role
}

/**
 * 计酬合规硬约束（《禁止传销条例》）：单场景推广计酬(category=COMMISSION)
 * 分账条目不得超过两条（站长佣金 + 唯一管理奖）。超限规则引擎直接拒绝执行。
 */
const MAX_COMMISSION_SPLITS = 2;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 统一结算引擎（T1·P2-a 影子账本阶段）
 * 只写 LedgerEntry 总账，不改动现有资金路径；可提现口径切换在 P2-c。
 *
 * 五条铁律：
 * L1 计酬≤两级 —— COMMISSION splits > 2 拒绝执行
 * L2 真实交易计酬 —— 无 refType/refId 凭据不入账
 * L3 自买自卖防护 —— 付款人=受益人时佣金类目不发放（服务类目不受限）
 * L4 结算缓冲期 —— PENDING → availableAt 后 SETTLED；大额（≥approvalThreshold）FROZEN 待复核
 * L5 冲正全覆盖 —— reverse(refType,refId) 幂等冲正该凭据下全部正向分账
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(private prisma: PrismaService) {}

  /** 唯一入账入口：按场景规则分账落总账（幂等：同凭据同场景已入账则返回既有记录） */
  async settle(params: SettleParams) {
    // L2：无凭据不入账
    if (!params.refType || !params.refId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结算必须携带交易凭据(refType/refId)");
    }
    if (!(params.amount > 0)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结算金额必须为正数");
    }

    const rule = await this.prisma.settlementRule.findUnique({ where: { scene: params.scene } });
    if (!rule || !rule.enabled) {
      this.logger.debug(`场景 ${params.scene} 未配置或未启用，跳过结算`);
      return [];
    }

    const splits = rule.splits as unknown as SplitDef[];
    // L1：两级计酬硬约束
    const commissionCount = splits.filter((s) => s.category === "COMMISSION").length;
    if (commissionCount > MAX_COMMISSION_SPLITS) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `场景 ${params.scene} 推广计酬条目 ${commissionCount} 条超过两级上限，规则拒绝执行`,
      );
    }

    // 幂等守卫
    const existing = await this.prisma.ledgerEntry.findMany({
      where: { refType: params.refType, refId: params.refId, scene: params.scene, amount: { gt: 0 } },
    });
    if (existing.length > 0) return existing;

    const now = new Date();
    const availableAt = new Date(now.getTime() + rule.bufferDays * 86_400_000);
    const threshold = rule.approvalThreshold !== null ? Number(rule.approvalThreshold) : null;

    const rows: Prisma.LedgerEntryCreateManyInput[] = [];
    const computed = new Map<string, number>(); // role -> 实际分账金额（PARENT_SPLIT 基数；未成交=0）
    for (const s of splits) {
      const party: SettleParty | undefined =
        s.role === "PLATFORM" ? { type: "PLATFORM", id: "PLATFORM" } : params.parties[s.role];
      const base = s.basis === "PARENT_SPLIT" ? (computed.get(s.parentRole ?? "") ?? 0) : params.amount;
      if (!party) {
        computed.set(s.role, 0); // 未提供主体则该角色未成交，下游 PARENT_SPLIT 基数为 0
        if (base > 0) this.logger.warn(`场景 ${params.scene} 角色 ${s.role} 未提供分账主体，该笔留存平台`);
        continue;
      }

      const rate = party.rateOverride ?? s.rate;
      if (!(rate > 0 && rate <= 1)) {
        computed.set(s.role, 0);
        this.logger.warn(`场景 ${params.scene} 角色 ${s.role} 比例非法(${rate})，跳过该笔分账`);
        continue;
      }
      const amount = round2(base * rate);
      computed.set(s.role, amount);
      if (amount <= 0) continue;

      // L3：自买自卖 —— 佣金类目下付款人即受益人不发放
      // （站长自购的业务规则为「下单直接立减、不产生佣金」，此处为防御性硬拦截）
      if (s.category === "COMMISSION" && party.userId && party.userId === params.payerId) {
        computed.set(s.role, 0);
        this.logger.warn(
          `SELF_DEAL 拦截：${params.scene}/${s.role} 付款人与受益人同一(${params.payerId})，佣金不发放`,
        );
        continue;
      }

      // L4：大额冻结复核
      const frozen = rule.requireApproval && threshold !== null && amount >= threshold;
      rows.push({
        scene: params.scene,
        refType: params.refType,
        refId: params.refId,
        beneficiaryType: party.type,
        beneficiaryId: party.id,
        role: s.role,
        category: s.category,
        amount,
        rate,
        status: frozen ? "FROZEN" : "PENDING",
        availableAt,
        reason: frozen ? `单笔≥${threshold}元，冻结待人工复核` : null,
      });
    }

    if (rows.length === 0) return [];
    await this.prisma.ledgerEntry.createMany({ data: rows });
    return this.prisma.ledgerEntry.findMany({
      where: { refType: params.refType, refId: params.refId, scene: params.scene },
    });
  }

  /** L5 唯一冲正入口：对凭据下全部正向分账生成负向冲正（幂等） */
  async reverse(refType: string, refId: string, reason: string) {
    const alreadyReversed = await this.prisma.ledgerEntry.findFirst({
      where: { refType, refId, amount: { lt: 0 } },
    });
    if (alreadyReversed) {
      this.logger.log(`${refType}:${refId} 已冲正，幂等跳过`);
      return { reversed: false, count: 0 };
    }

    const positives = await this.prisma.ledgerEntry.findMany({
      where: { refType, refId, amount: { gt: 0 }, status: { not: "REVERSED" } },
    });
    if (positives.length === 0) return { reversed: false, count: 0 };

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.createMany({
        data: positives.map((p) => ({
          scene: p.scene,
          refType,
          refId,
          beneficiaryType: p.beneficiaryType,
          beneficiaryId: p.beneficiaryId,
          role: p.role,
          category: p.category,
          amount: -Number(p.amount),
          rate: p.rate,
          status: "SETTLED",
          availableAt: new Date(),
          reason,
        })),
      });
      await tx.ledgerEntry.updateMany({
        where: { id: { in: positives.map((p) => p.id) } },
        data: { status: "REVERSED", reason },
      });
    });
    return { reversed: true, count: positives.length };
  }

  /** 结算批处理：过缓冲期的 PENDING 置为 SETTLED（供 cron 调用） */
  async settlePending() {
    const res = await this.prisma.ledgerEntry.updateMany({
      where: { status: "PENDING", availableAt: { lte: new Date() } },
      data: { status: "SETTLED" },
    });
    if (res.count > 0) this.logger.log(`结算批处理：${res.count} 条 PENDING → SETTLED`);
    return { settled: res.count };
  }

  /** 查询凭据分账链（每一分钱可解释） */
  async getLedger(refType: string, refId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { refType, refId },
      orderBy: { createdAt: "asc" },
    });
  }
}
