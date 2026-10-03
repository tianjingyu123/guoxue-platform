import { Injectable } from "@nestjs/common";
import { Prisma, EntitlementBalance, EntitlementLedger } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isUniqueConstraintError } from "../../common/prisma-errors";

export interface GrantEntitlementInput {
  userId: string;
  entitlementKey: string;
  kind: string;
  resourceType?: string;
  resourceId?: string;
  scope?: string;
  quantity?: number;
  unlimited?: boolean;
  validFrom?: Date;
  validUntil?: Date | null;
  sourceType: string;
  sourceId?: string;
  idempotencyKey: string;
  action?: "GRANT" | "MIGRATE" | "ADJUST";
  metadata?: Prisma.InputJsonValue;
}

export interface ConsumeEntitlementInput {
  userId: string;
  entitlementKey: string;
  resourceType?: string;
  resourceId?: string;
  scope?: string;
  quantity?: number;
  sourceType: string;
  sourceId?: string;
  idempotencyKey: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  private identity(
    input: Pick<
      GrantEntitlementInput,
      "userId" | "entitlementKey" | "resourceType" | "resourceId" | "scope"
    >,
  ) {
    return {
      userId: input.userId,
      entitlementKey: input.entitlementKey,
      resourceType: input.resourceType || "",
      resourceId: input.resourceId || "",
      scope: input.scope || "GLOBAL",
    };
  }

  async grant(input: GrantEntitlementInput): Promise<EntitlementBalance> {
    try {
      return await this.prisma.$transaction((tx) => this.grantWithTx(tx, input));
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const ledger = await this.prisma.entitlementLedger.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!ledger) throw error;
      return this.requireBalance(this.prisma, input);
    }
  }

  /** 在调用方资金事务内发放，保证“订单 PAID”和“权益可用”同成同败。 */
  async grantWithTx(
    tx: Prisma.TransactionClient,
    input: GrantEntitlementInput,
  ): Promise<EntitlementBalance> {
    const existingLedger = await tx.entitlementLedger.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existingLedger) return this.requireBalance(tx, input);

    const key = this.identity(input);
    const now = new Date();
    const validFrom = input.validFrom || now;
    const quantity = input.quantity ?? (input.unlimited ? 0 : 1);
    if (quantity < 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "发放数量不能为负数");

    await tx.entitlementLedger.create({
      data: {
        ...key,
        kind: input.kind,
        action: input.action || "GRANT",
        quantity,
        unlimited: input.unlimited || false,
        validFrom,
        validUntil: input.validUntil,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
      },
    });

    // 先用数据库原子增量锁定同一份投影，避免两个不同订单并发发放时
    // 因“先读后写绝对值”互相覆盖。随后根据不可变流水重建投影，统一
    // 处理到期、永久权益和不同有效期批次。
    await tx.entitlementBalance.upsert({
      where: { userId_entitlementKey_resourceType_resourceId_scope: key },
      create: {
        ...key,
        kind: input.kind,
        quantity,
        unlimited: input.unlimited || false,
        validFrom,
        validUntil: input.validUntil,
        status: "ACTIVE",
        metadata: input.metadata,
      },
      update: {
        kind: input.kind,
        quantity: { increment: quantity },
        ...(input.unlimited ? { unlimited: true } : {}),
        status: "ACTIVE",
        version: { increment: 1 },
        metadata: input.metadata,
      },
    });
    return this.rebuildBalanceWithTx(tx, {
      ...key,
      kind: input.kind,
    });
  }

  async consume(input: ConsumeEntitlementInput): Promise<EntitlementBalance> {
    try {
      return await this.prisma.$transaction((tx) => this.consumeWithTx(tx, input));
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      return this.requireBalance(this.prisma, input);
    }
  }

  /** 原子消费：有限额度使用条件更新，防多端同时扣减造成负数。 */
  async consumeWithTx(
    tx: Prisma.TransactionClient,
    input: ConsumeEntitlementInput,
  ): Promise<EntitlementBalance> {
    const duplicate = await tx.entitlementLedger.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (duplicate) return this.requireBalance(tx, input);
    const key = this.identity(input);
    const amount = input.quantity || 1;
    if (amount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "消费数量必须大于0");
    const balance = await this.requireBalance(tx, input);
    const now = new Date();
    if (balance.status !== "ACTIVE" || (balance.validUntil && balance.validUntil <= now)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "权益已失效");
    }
    if (!balance.unlimited) {
      const changed = await tx.entitlementBalance.updateMany({
        where: {
          id: balance.id,
          status: "ACTIVE",
          version: balance.version,
          quantity: { gte: amount },
        },
        data: { quantity: { decrement: amount }, version: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new BusinessException(ErrorCode.BAD_REQUEST, "权益余额不足或已被并发使用");
    }
    await tx.entitlementLedger.create({
      data: {
        ...key,
        kind: balance.kind,
        action: "CONSUME",
        quantity: -amount,
        unlimited: balance.unlimited,
        validFrom: now,
        validUntil: balance.validUntil,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
      },
    });
    return this.requireBalance(tx, input);
  }

  async revokeSource(userId: string, sourceType: string, sourceId: string, reason?: string) {
    return this.prisma.$transaction((tx) =>
      this.revokeSourceWithTx(tx, userId, sourceType, sourceId, reason),
    );
  }

  async revokeEntitlementWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    entitlementKey: string,
    reason: string,
    idempotencyPrefix: string,
  ) {
    const grants = await tx.entitlementLedger.findMany({
      where: { userId, entitlementKey, action: { in: ["GRANT", "MIGRATE"] } },
      orderBy: { createdAt: "asc" },
    });
    for (const grant of grants) {
      const alreadyReversed = await tx.entitlementLedger.findFirst({
        where: { action: "REVOKE", reversesLedgerId: grant.id },
        select: { id: true },
      });
      if (alreadyReversed) continue;
      await tx.entitlementLedger.create({
        data: {
          userId,
          entitlementKey: grant.entitlementKey,
          kind: grant.kind,
          resourceType: grant.resourceType,
          resourceId: grant.resourceId,
          scope: grant.scope,
          action: "REVOKE",
          quantity: -grant.quantity,
          sourceType: "ADMIN",
          sourceId: idempotencyPrefix,
          reversesLedgerId: grant.id,
          idempotencyKey: `${idempotencyPrefix}:${grant.id}`,
          metadata: { reason },
        },
      });
      await this.rebuildBalanceWithTx(tx, grant);
    }
    return { revoked: grants.length };
  }

  /** 按原始订单/活动冲正，只撤销该来源产生的权益，不误伤用户的其他购买。 */
  async revokeSourceWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    sourceType: string,
    sourceId: string,
    reason?: string,
  ) {
    const grants = await tx.entitlementLedger.findMany({
      where: { userId, sourceType, sourceId, action: { in: ["GRANT", "MIGRATE"] } },
    });
    for (const grant of grants) {
      const idempotencyKey = `revoke:${sourceType}:${sourceId}:${grant.id}`;
      const duplicate = await tx.entitlementLedger.findUnique({ where: { idempotencyKey } });
      if (!duplicate) {
        await tx.entitlementLedger.create({
          data: {
            userId,
            entitlementKey: grant.entitlementKey,
            kind: grant.kind,
            resourceType: grant.resourceType,
            resourceId: grant.resourceId,
            scope: grant.scope,
            action: "REVOKE",
            quantity: -grant.quantity,
            sourceType,
            sourceId,
            reversesLedgerId: grant.id,
            idempotencyKey,
            metadata: { reason: reason || "来源已撤销" },
          },
        });
      }
      await this.rebuildBalanceWithTx(tx, grant);
    }
    return { revoked: grants.length };
  }

  private async rebuildBalanceWithTx(
    tx: Prisma.TransactionClient,
    keyRow: Pick<
      EntitlementLedger,
      "userId" | "entitlementKey" | "resourceType" | "resourceId" | "scope" | "kind"
    >,
  ): Promise<EntitlementBalance> {
    const identity = this.identity(keyRow);
    const rows = await tx.entitlementLedger.findMany({
      where: identity,
      orderBy: { createdAt: "asc" },
    });
    const reversed = new Set(
      rows
        .filter((row) => row.action === "REVOKE" && row.reversesLedgerId)
        .map((row) => row.reversesLedgerId as string),
    );
    const now = new Date();
    const activeGrants = rows.filter(
      (row) =>
        ["GRANT", "MIGRATE"].includes(row.action) &&
        !reversed.has(row.id) &&
        (!row.validUntil || row.validUntil > now),
    );
    const adjustments = rows
      .filter((row) => ["CONSUME", "ADJUST"].includes(row.action))
      .reduce((sum, row) => sum + row.quantity, 0);
    const unlimited = activeGrants.some((row) => row.unlimited);
    const quantity = Math.max(
      0,
      activeGrants.reduce((sum, row) => sum + row.quantity, 0) + adjustments,
    );
    const hasPermanent = activeGrants.some((row) => !row.validUntil);
    const expiries = activeGrants
      .map((row) => row.validUntil)
      .filter((value): value is Date => Boolean(value));
    const validUntil = hasPermanent
      ? null
      : expiries.sort((a, b) => b.getTime() - a.getTime())[0] || null;
    const validFrom = activeGrants
      .map((row) => row.validFrom)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return tx.entitlementBalance.upsert({
      where: { userId_entitlementKey_resourceType_resourceId_scope: identity },
      create: {
        ...identity,
        kind: keyRow.kind,
        quantity,
        unlimited,
        validFrom,
        validUntil,
        status: activeGrants.length ? "ACTIVE" : "REVOKED",
      },
      update: {
        quantity,
        unlimited,
        ...(validFrom ? { validFrom } : {}),
        validUntil,
        status: activeGrants.length ? "ACTIVE" : "REVOKED",
        version: { increment: 1 },
      },
    });
  }

  /** 所有小程序、H5 和 APP 共用的“我的全部权益”读模型。 */
  async getMyEntitlements(userId: string) {
    const now = new Date();
    const [
      user,
      practitioner,
      balances,
      accessOrders,
      ebooks,
      instituteContents,
      coin,
      couponCount,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { memberLevel: true, memberExpire: true },
      }),
      this.prisma.practitionerProfile.findUnique({
        where: { userId },
        select: { proExpireAt: true },
      }),
      this.prisma.entitlementBalance.findMany({
        where: { userId },
        orderBy: [{ entitlementKey: "asc" }, { resourceId: "asc" }],
      }),
      this.prisma.order.findMany({
        where: {
          userId,
          status: { in: ["PAID", "COMPLETED"] },
          type: { in: ["COURSE", "BUNDLE", "BOT_SERVICE", "PAIPAN", "LIVESTREAM"] },
        },
        select: { id: true, type: true, targetId: true, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ebookPurchase.findMany({
        where: { userId, OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
        select: { id: true, ebookId: true, paidAt: true, expireAt: true },
      }),
      this.prisma.instituteContentPurchase.findMany({
        where: { userId },
        select: { id: true, contentId: true, purchasedAt: true },
      }),
      this.prisma.virtualCoinAccount.findUnique({
        where: { userId },
        select: { balance: true, frozen: true },
      }),
      this.prisma.userCoupon.count({
        where: {
          userId,
          used: false,
          coupon: { status: "ACTIVE", validStart: { lte: now }, validEnd: { gt: now } },
        },
      }),
    ]);
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    // 会员当前态仍由现有 User/PractitionerProfile 承担兼容真源；支付与退款已经双写流水，
    // 但历史购买无法百分之百还原逐单叠加周期，因此读模型不允许迁移快照覆盖实时会员状态。
    const items = balances
      .filter(
        (item) => !["membership.school", "membership.practitioner"].includes(item.entitlementKey),
      )
      .map((item) => ({
        ...item,
        effectiveStatus:
          item.status === "ACTIVE" && item.validUntil && item.validUntil <= now
            ? "EXPIRED"
            : item.status,
        source: "ENTITLEMENT_CENTER",
      }));
    const existing = new Set(
      items.map(
        (item) => `${item.entitlementKey}|${item.resourceType}|${item.resourceId}|${item.scope}`,
      ),
    );
    const addProjection = (
      item: Record<string, unknown> & {
        entitlementKey: string;
        resourceType: string;
        resourceId: string;
        scope?: string;
      },
    ) => {
      const key = `${item.entitlementKey}|${item.resourceType}|${item.resourceId}|${item.scope || "GLOBAL"}`;
      if (!existing.has(key)) {
        existing.add(key);
        items.push(item as any);
      }
    };

    if (user.memberLevel !== "NONE" && (!user.memberExpire || user.memberExpire > now)) {
      addProjection({
        entitlementKey: "membership.school",
        kind: "MEMBERSHIP",
        resourceType: "MEMBER_PLAN",
        resourceId: "",
        scope: "GLOBAL",
        quantity: 1,
        unlimited: true,
        validUntil: user.memberExpire,
        effectiveStatus: "ACTIVE",
        source: "LEGACY_PROJECTION",
        metadata: { level: user.memberLevel },
      });
    }
    if (practitioner?.proExpireAt && practitioner.proExpireAt > now) {
      addProjection({
        entitlementKey: "membership.practitioner",
        kind: "MEMBERSHIP",
        resourceType: "PRACTITIONER_PRO",
        resourceId: "",
        scope: "GLOBAL",
        quantity: 1,
        unlimited: true,
        validUntil: practitioner.proExpireAt,
        effectiveStatus: "ACTIVE",
        source: "LEGACY_PROJECTION",
      });
    }
    for (const order of accessOrders) {
      addProjection({
        entitlementKey: `${order.type.toLowerCase()}.access`,
        kind: "ACCESS",
        resourceType: order.type,
        resourceId: order.targetId,
        scope: "GLOBAL",
        quantity: 1,
        unlimited: false,
        validUntil: null,
        effectiveStatus: "ACTIVE",
        source: "ORDER_PROJECTION",
        sourceId: order.id,
        grantedAt: order.paidAt || order.createdAt,
      });
    }
    for (const purchase of ebooks) {
      addProjection({
        entitlementKey: "ebook.access",
        kind: "ACCESS",
        resourceType: "EBOOK",
        resourceId: purchase.ebookId,
        scope: "GLOBAL",
        quantity: 1,
        unlimited: false,
        validUntil: purchase.expireAt,
        effectiveStatus: "ACTIVE",
        source: "PURCHASE_PROJECTION",
        sourceId: purchase.id,
        grantedAt: purchase.paidAt,
      });
    }
    for (const purchase of instituteContents) {
      addProjection({
        entitlementKey: "institute-content.access",
        kind: "ACCESS",
        resourceType: "INSTITUTE_CONTENT",
        resourceId: purchase.contentId,
        scope: "GLOBAL",
        quantity: 1,
        unlimited: false,
        validUntil: null,
        effectiveStatus: "ACTIVE",
        source: "PURCHASE_PROJECTION",
        sourceId: purchase.id,
        grantedAt: purchase.purchasedAt,
      });
    }

    return {
      userId,
      generatedAt: now.toISOString(),
      items,
      wallet: {
        coinBalance: coin?.balance || 0,
        coinFrozen: coin?.frozen || 0,
        availableCoupons: couponCount,
      },
    };
  }

  async getLedger(userId: string, page = 1, pageSize = 50) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const currentPage = Math.max(page, 1);
    const [items, total] = await Promise.all([
      this.prisma.entitlementLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * take,
        take,
      }),
      this.prisma.entitlementLedger.count({ where: { userId } }),
    ]);
    return { items, total, page: currentPage, pageSize: take };
  }

  private async requireBalance(
    tx: Prisma.TransactionClient | PrismaService,
    input: Pick<
      GrantEntitlementInput,
      "userId" | "entitlementKey" | "resourceType" | "resourceId" | "scope"
    >,
  ): Promise<EntitlementBalance> {
    const key = this.identity(input);
    const balance = await tx.entitlementBalance.findUnique({
      where: { userId_entitlementKey_resourceType_resourceId_scope: key },
    });
    if (!balance) throw new BusinessException(ErrorCode.NOT_FOUND, "权益不存在");
    return balance;
  }
}
