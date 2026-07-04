import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";
import { SystemService } from "../system/system.service";
import { MerchantCreditService } from "./merchant-credit.service";

const DAY_MS = 86_400_000;

/** 处罚类型（设计§四·本批四类；二级扣保证金走 FundApproval 属独立资金动作不在本批） */
export const PUNISHMENT_TYPES = ["WARNING", "PRODUCT_DOWN", "SHOP_SUSPEND", "CLEAR_OUT"] as const;
export type PunishmentType = (typeof PUNISHMENT_TYPES)[number];

export const PUNISHMENT_TYPE_LABELS: Record<PunishmentType, string> = {
  WARNING: "警告",
  PRODUCT_DOWN: "商品下架",
  SHOP_SUSPEND: "暂停经营",
  CLEAR_OUT: "标记待清退",
};

/** 自动触发操作人标识（AuditLog.executor 同值·区分自动化/人工） */
export const PUNISHMENT_SYSTEM_OPERATOR = "SYSTEM";

/** 自动触发规则：信用 D 级（<55）连续满该周数 → 自动 WARNING（本批唯一一条自动化·保守） */
export const AUTO_WARNING_D_WEEKS = 2;

/** 涉事商品执行快照条目（撤销按 prevStatus CAS 恢复） */
interface ProductSnapshot {
  id: string;
  prevStatus: string;
  /** 本次处罚是否实际改动了该商品（false=当时已是下架态，撤销时不恢复） */
  applied: boolean;
}

/** 处罚执行快照（存 evidence.snapshot·撤销真源） */
interface PunishmentSnapshot {
  prevMerchantStatus?: string;
  /** 本次处罚是否实际改动了商家状态 */
  merchantApplied?: boolean;
  products?: ProductSnapshot[];
}

export interface CreatePunishmentInput {
  merchantId: string;
  type: PunishmentType;
  reason: string;
  /** PRODUCT_DOWN 必须含 productIds: string[]；其余为可选证据材料 */
  evidence?: Record<string, unknown>;
  expiresAt?: string | Date;
}

export interface PunishmentListQuery {
  merchantId?: string;
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 商家处罚体系（履-P3·履约三部曲收尾）：四类处罚执行 + 撤销恢复 + 一条保守自动化
 *
 * 四类执行（全部落 MerchantPunishment 行 + AuditLog（含 rollbackData 快照）+ 站内信通知商家）：
 * - WARNING：只记录+通知（限期整改文案）；
 * - PRODUCT_DOWN：evidence.productIds 指定商品 CAS 下架并记录原状态（契约写 OFF_SALE，
 *   Product.status 现有语义值为 PENDING/ON_SALE/OFF_SHELF——无 OFF_SALE 值，诚实采用现有下架值 OFF_SHELF）；
 * - SHOP_SUSPEND：商家 status CAS 置 SUSPENDED（MerchantStatus 现有枚举值）+ 其 ON_SALE 商品全部下架（记录清单）；
 * - CLEAR_OUT：标记待清退——MerchantStatus 枚举无「待清退」值，诚实采用现有停业语义值 SUSPENDED，
 *   清退标记以本处罚行（type=CLEAR_OUT·status=ACTIVE）为真源；
 *   🔴红线：不自动执行任何资金清算——保证金退还/扣罚与未结算货款一律人工处理
 *   （走现有 admin deposits/settlements 人工端点·资金动作必人审）。
 *
 * 撤销 revoke：按 evidence.snapshot 记录的原状态 CAS 恢复；已被其他原因改变（CAS 计数 0）的
 * 不强行恢复，诚实跳过并把逐项结果记入 evidence.revoke。
 *
 * 自动触发（保守·仅一条）：每周一 03:00（紧随信用周更 02:00）扫 D 级商家，
 * 近两周 MerchantCreditLog 均 <55 → automation_enabled 开则自动 WARNING（operatorId=SYSTEM），
 * 关则只建 OpsTask 转人工。其余处罚全部人工端点触发。
 *
 * 幂等（同因未撤销不重复罚）：同 merchantId+type+reason 且 status=ACTIVE 已存在 → CONFLICT。
 */
@Injectable()
export class MerchantPunishmentService {
  private readonly logger = new Logger(MerchantPunishmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notification: NotificationService,
    private readonly system: SystemService,
    private readonly credit: MerchantCreditService,
  ) {}

  // ───────── 处罚执行 ─────────

  async createPunishment(input: CreatePunishmentInput, operatorId: string) {
    if (!PUNISHMENT_TYPES.includes(input.type)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, `不支持的处罚类型：${input.type}`);
    }
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: input.merchantId },
      select: { id: true, userId: true, status: true, shopName: true },
    });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    // 幂等：同商家+同类型+同原因且未撤销 → 不重复罚
    const dup = await this.prisma.merchantPunishment.findFirst({
      where: { merchantId: input.merchantId, type: input.type, reason: input.reason, status: "ACTIVE" },
      select: { id: true },
    });
    if (dup) {
      throw new BusinessException(ErrorCode.CONFLICT, "同原因处罚已存在且未撤销，不重复处罚");
    }

    // 按类型执行处置动作，产出撤销快照
    const snapshot: PunishmentSnapshot = {};
    switch (input.type) {
      case "WARNING":
        // 只记录+通知，无状态改动
        break;
      case "PRODUCT_DOWN":
        snapshot.products = await this.takeDownProducts(merchant, this.extractProductIds(input.evidence));
        break;
      case "SHOP_SUSPEND":
      case "CLEAR_OUT": {
        // 商家状态：CAS 置 SUSPENDED（CLEAR_OUT 复用现有停业语义值·见类注释；
        // 🔴不自动执行资金清算——保证金/未结算货款人工处理）
        if (merchant.status === "SUSPENDED") {
          snapshot.prevMerchantStatus = merchant.status;
          snapshot.merchantApplied = false; // 当时已是暂停态，撤销时不恢复
        } else {
          const r = await this.prisma.merchant.updateMany({
            where: { id: merchant.id, status: merchant.status as never },
            data: { status: "SUSPENDED" },
          });
          snapshot.prevMerchantStatus = merchant.status;
          snapshot.merchantApplied = r.count === 1;
        }
        // ON_SALE 商品全部下架（记录清单便于撤销）
        const onSale = await this.prisma.product.findMany({
          where: { userId: merchant.userId, status: "ON_SALE", deletedAt: null },
          select: { id: true },
        });
        const products: ProductSnapshot[] = [];
        for (const p of onSale) {
          const r = await this.prisma.product.updateMany({
            where: { id: p.id, status: "ON_SALE" }, // CAS：并发已改变的不动
            data: { status: "OFF_SHELF" },
          });
          products.push({ id: p.id, prevStatus: "ON_SALE", applied: r.count === 1 });
        }
        snapshot.products = products;
        break;
      }
    }

    const punishment = await this.prisma.merchantPunishment.create({
      data: {
        merchantId: input.merchantId,
        type: input.type,
        reason: input.reason,
        evidence: { ...(input.evidence ?? {}), snapshot } as unknown as Prisma.InputJsonValue,
        status: "ACTIVE",
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        operatorId,
      },
    });

    // 审计（rollbackData=执行快照）+ 站内信通知商家
    await this.audit(operatorId, `商家处罚-${input.type}`, punishment.id, {
      merchantId: input.merchantId,
      type: input.type,
      reason: input.reason,
    }, snapshot);
    await this.notifyMerchant(merchant.userId, punishment.id, this.punishNotice(input.type, input.reason));

    return punishment;
  }

  /** PRODUCT_DOWN：校验 evidence.productIds 并逐个 CAS 下架，记录原状态 */
  private async takeDownProducts(
    merchant: { id: string; userId: string },
    productIds: string[],
  ): Promise<ProductSnapshot[]> {
    if (productIds.length === 0) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "PRODUCT_DOWN 需在 evidence.productIds 指定涉事商品");
    }
    // 商品→商家走 Product.userId = Merchant.userId 供货关联（Product 无 merchantId 列）
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, userId: merchant.userId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (products.length !== productIds.length) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "部分商品不存在或不属于该商家，已拒绝执行（防误伤）");
    }
    const snapshots: ProductSnapshot[] = [];
    for (const p of products) {
      if (p.status === "OFF_SHELF") {
        // 已是下架态：记录但不改动（撤销时也不恢复）
        snapshots.push({ id: p.id, prevStatus: p.status, applied: false });
        continue;
      }
      const r = await this.prisma.product.updateMany({
        where: { id: p.id, status: p.status }, // CAS：状态被并发改变则计 0 不动
        data: { status: "OFF_SHELF" },
      });
      snapshots.push({ id: p.id, prevStatus: p.status, applied: r.count === 1 });
    }
    return snapshots;
  }

  private extractProductIds(evidence?: Record<string, unknown>): string[] {
    const raw = evidence?.productIds;
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0))];
  }

  // ───────── 撤销恢复 ─────────

  /**
   * 撤销处罚：按 evidence.snapshot 记录的原状态 CAS 恢复。
   * 已被其他原因改变（CAS 计 0 / 处罚时本就未改动 applied=false）的不强行恢复，诚实跳过并记录。
   */
  async revoke(punishmentId: string, operatorId: string, reason?: string) {
    const punishment = await this.prisma.merchantPunishment.findUnique({ where: { id: punishmentId } });
    if (!punishment) throw new BusinessException(ErrorCode.NOT_FOUND, "处罚记录不存在");
    if (punishment.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.CONFLICT, "该处罚已撤销，不可重复操作");
    }

    const evidence = (punishment.evidence ?? {}) as Record<string, unknown>;
    const snapshot = (evidence.snapshot ?? {}) as PunishmentSnapshot;
    const revokeResult: {
      merchant?: { restored: boolean; note: string };
      products: Array<{ id: string; restored: boolean; note?: string }>;
    } = { products: [] };

    // 恢复商家状态（SHOP_SUSPEND/CLEAR_OUT）
    if (snapshot.prevMerchantStatus !== undefined) {
      if (!snapshot.merchantApplied) {
        revokeResult.merchant = { restored: false, note: "处罚时未改动商家状态（当时已是暂停态），跳过恢复" };
      } else {
        const r = await this.prisma.merchant.updateMany({
          where: { id: punishment.merchantId, status: "SUSPENDED" }, // CAS：仍处暂停态才恢复
          data: { status: snapshot.prevMerchantStatus as never },
        });
        revokeResult.merchant = r.count === 1
          ? { restored: true, note: `已恢复为 ${snapshot.prevMerchantStatus}` }
          : { restored: false, note: "商家状态已被其他原因改变，不强行恢复，诚实跳过" };
      }
    }

    // 恢复商品状态（PRODUCT_DOWN/SHOP_SUSPEND/CLEAR_OUT）
    for (const p of snapshot.products ?? []) {
      if (!p.applied) {
        revokeResult.products.push({ id: p.id, restored: false, note: "处罚时未改动该商品，跳过" });
        continue;
      }
      const r = await this.prisma.product.updateMany({
        where: { id: p.id, status: "OFF_SHELF" }, // CAS：仍是下架态才恢复
        data: { status: p.prevStatus },
      });
      revokeResult.products.push(
        r.count === 1
          ? { id: p.id, restored: true }
          : { id: p.id, restored: false, note: "商品状态已被其他原因改变，诚实跳过" },
      );
    }

    const updated = await this.prisma.merchantPunishment.update({
      where: { id: punishmentId },
      data: {
        status: "REVOKED",
        revokedBy: operatorId,
        revokedAt: new Date(),
        evidence: { ...evidence, revoke: { reason: reason ?? null, result: revokeResult } } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.audit(operatorId, `商家处罚撤销-${punishment.type}`, punishmentId, {
      merchantId: punishment.merchantId,
      type: punishment.type,
      revokeReason: reason ?? null,
      result: revokeResult,
    });
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: punishment.merchantId },
      select: { userId: true },
    });
    if (merchant) {
      await this.notifyMerchant(
        merchant.userId,
        punishmentId,
        `平台已撤销对您店铺的「${PUNISHMENT_TYPE_LABELS[punishment.type as PunishmentType] ?? punishment.type}」处罚${reason ? `（${reason}）` : ""}，相关状态已按原样恢复（已被其他原因变更的除外）。`,
      );
    }
    return updated;
  }

  // ───────── 列表查询 ─────────

  async list(q: PunishmentListQuery) {
    const page = Math.max(Math.trunc(Number(q.page) || 1), 1);
    const pageSize = Math.min(Math.max(Math.trunc(Number(q.pageSize) || 20), 1), 100);
    const where: Prisma.MerchantPunishmentWhereInput = {
      ...(q.merchantId ? { merchantId: q.merchantId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.type ? { type: q.type } : {}),
    };
    const [list, total] = await Promise.all([
      this.prisma.merchantPunishment.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.merchantPunishment.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  // ───────── 自动触发（保守·仅一条）：信用 D 级连续 2 周 → 自动 WARNING ─────────

  /** 每周一 03:00（紧随信用周更 02:00 之后·多实例互斥） */
  @Cron("0 3 * * 1")
  async autoPunishCron(): Promise<void> {
    await this.redis.runExclusive("merchant-punish-auto", 300, async () => {
      try {
        const r = await this.checkConsecutiveDGrade();
        this.logger.log(`商家自动处罚扫描完成：D 级商家 ${r.checked} 家，命中连续 ${AUTO_WARNING_D_WEEKS} 周 ${r.hits}，自动警告 ${r.warned}，转人工任务 ${r.tasks}`);
      } catch (e) {
        this.logger.error("商家自动处罚扫描失败", e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /**
   * 信用 D 级连续 2 周检测：
   * - 取商家最近 2 条 MerchantCreditLog（信用周更每周一条），要求 weekKey 恰为本周+上周且 newScore 均 <55；
   * - automation_enabled 开 → 自动 WARNING（operatorId=SYSTEM·reason 含周键，同周重跑撞幂等 CONFLICT 跳过）；
   * - 关 → 只建 OpsTask 转人工（同标题 pending 任务不重复建）。
   */
  async checkConsecutiveDGrade(now: Date = new Date()): Promise<{ checked: number; hits: number; warned: number; tasks: number }> {
    const curWeek = this.credit.weekKeyOf(now);
    const prevWeek = this.credit.weekKeyOf(new Date(now.getTime() - 7 * DAY_MS));

    const dMerchants = await this.prisma.merchant.findMany({
      where: { status: "ACTIVE", creditGrade: "D" },
      select: { id: true, shopName: true },
    });
    if (dMerchants.length === 0) return { checked: 0, hits: 0, warned: 0, tasks: 0 };

    const automationEnabled = await this.system.isAutomationEnabled();
    let hits = 0;
    let warned = 0;
    let tasks = 0;

    for (const m of dMerchants) {
      const logs = await this.prisma.merchantCreditLog.findMany({
        where: { merchantId: m.id },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { newScore: true, factors: true },
      });
      const weekScore = new Map<string, number>();
      for (const log of logs) {
        const wk = (log.factors as { weekKey?: string } | null)?.weekKey;
        if (wk) weekScore.set(wk, log.newScore);
      }
      const cur = weekScore.get(curWeek);
      const prev = weekScore.get(prevWeek);
      const hit = cur !== undefined && prev !== undefined && cur < 55 && prev < 55;
      if (!hit) continue;
      hits += 1;

      const reason = `信用等级连续 ${AUTO_WARNING_D_WEEKS} 周 D 级（${prevWeek} ~ ${curWeek}），请限期整改经营质量`;
      if (automationEnabled) {
        try {
          await this.createPunishment({ merchantId: m.id, type: "WARNING", reason }, PUNISHMENT_SYSTEM_OPERATOR);
          warned += 1;
        } catch (e) {
          // 幂等撞车（同因 ACTIVE 已存在）→ 静默跳过；其余错误记日志不中断整轮
          if (e instanceof BusinessException && e.errorCode === ErrorCode.CONFLICT) continue;
          this.logger.error(`商家 ${m.id} 自动警告失败`, e instanceof Error ? e.stack : String(e));
        }
      } else {
        // 一键接管已关自动化：只建任务转人工（同标题 pending 不重复建）
        const title = `商家信用连续 ${AUTO_WARNING_D_WEEKS} 周 D 级待人工处罚确认：${m.shopName}（${prevWeek}~${curWeek}）`;
        const exists = await this.prisma.opsTask.findFirst({ where: { type: "REVIEW", status: "pending", title }, select: { id: true } });
        if (exists) continue;
        await this.prisma.opsTask.create({
          data: {
            type: "REVIEW",
            priority: "HIGH",
            status: "pending",
            title,
            payload: { merchantId: m.id, rule: "CREDIT_D_2WEEKS", weeks: [prevWeek, curWeek], suggestedType: "WARNING", note: "automation_enabled=false（管理员已暂停自动化），请人工在后台执行处罚" } as Prisma.InputJsonValue,
          },
        });
        tasks += 1;
      }
    }
    return { checked: dMerchants.length, hits, warned, tasks };
  }

  // ───────── 内部工具 ─────────

  /** 处罚全部走审计：AuditLog（executor 区分 SYSTEM/管理员·rollbackData 存执行快照） */
  private async audit(
    operatorId: string,
    action: string,
    punishmentId: string,
    detail: Record<string, unknown>,
    rollbackData?: PunishmentSnapshot,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: operatorId === PUNISHMENT_SYSTEM_OPERATOR ? null : operatorId,
        executor: operatorId,
        action,
        targetType: "MERCHANT_PUNISHMENT",
        targetId: punishmentId,
        detail: JSON.stringify(detail),
        ...(rollbackData ? { rollbackData: rollbackData as unknown as Prisma.InputJsonValue } : {}),
      },
    });
  }

  /** 处罚通知走站内信（商家端展示本批不做·诚实：通知即达）。通知失败不回滚处罚，只记日志 */
  private async notifyMerchant(userId: string, punishmentId: string, content: string): Promise<void> {
    try {
      await this.notification.send(userId, {
        type: "SYSTEM",
        title: "商家处罚通知",
        content,
        targetType: "MERCHANT_PUNISHMENT",
        targetId: punishmentId,
      });
    } catch (e) {
      this.logger.error(`处罚站内信发送失败：${punishmentId}`, e instanceof Error ? e.stack : String(e));
    }
  }

  private punishNotice(type: PunishmentType, reason: string): string {
    switch (type) {
      case "WARNING":
        return `您的店铺因「${reason}」收到平台警告，请限期整改。多次警告或情节升级将触发更高级别处罚。`;
      case "PRODUCT_DOWN":
        return `您的店铺因「${reason}」被平台下架涉事商品。整改完成后可联系平台复核恢复。`;
      case "SHOP_SUSPEND":
        return `您的店铺因「${reason}」被平台暂停经营，在售商品已全部下架。整改完成后可联系平台复核恢复。`;
      case "CLEAR_OUT":
        return `您的店铺因「${reason}」被平台标记待清退并暂停经营。保证金与未结算货款将由平台按协议人工处理，请留意后续通知。`;
    }
  }
}
