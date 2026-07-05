import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 用户标签体系（D-T2·设计真源 docs/design/数据运营引擎-看板漏斗标签周报-20260705.md §三）
 *
 * 【R2 合规红线（不可违反）】标签仅可用于：内容/商品推荐、优惠发放、运营圈人与触达。
 * 严禁把任何标签（尤其 price_sensitive / whale / pay_*）用于差异化定价——
 * 同一商品对不同标签用户展示不同价格即构成"大数据杀熟"，属平台 R2 红线。代码评审盯死。
 *
 * 全量每日 01:10 批量重算（分批 500 防拖库·runExclusive 多实例互斥）。
 * 每用户先删后插（幂等）。标签清单：
 * - FACT 活跃度（三选一）：active_7d / silent_14d / churned_30d
 * - FACT 付费深度：pay_none | pay_once | pay_repeat（三选一）+ pay_member（可叠加）
 * - FACT 角色（可叠加）：role_creator / role_station / role_merchant / role_offline_station / role_circle_owner
 * - FACT 偏好：pref_{兴趣top1}（UserInterest score 最高的 tag）
 * - DERIVED：price_sensitive（30天会员页曝光≥3且从未购会员）/ high_potential_practitioner
 *   （30天排盘≥20+看过B端页+未认证）/ churn_risk（付过费且近14天零活跃）/ whale（累计实付 top1%）
 */

const DAY_MS = 86_400_000;
const BATCH = 500;

@Injectable()
export class UserTagService {
  private readonly logger = new Logger(UserTagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron("10 1 * * *")
  async recomputeCron() {
    await this.redis.runExclusive("user-tag-recompute", 1800, () => this.recomputeAll());
  }

  /** 全量重算（分批游标·可手动触发） */
  async recomputeAll(): Promise<{ users: number }> {
    const whaleThreshold = await this.whaleThreshold();
    let cursor: string | undefined;
    let total = 0;
    for (;;) {
      const users: Array<{ id: string }> = await this.prisma.user.findMany({
        select: { id: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (users.length === 0) break;
      await this.recomputeBatch(users.map((u) => u.id), whaleThreshold);
      total += users.length;
      cursor = users[users.length - 1].id;
      if (users.length < BATCH) break;
    }
    this.logger.log(`用户标签重算完成：${total} 用户`);
    return { users: total };
  }

  /** 鲸鱼阈值：累计实付 top1% 的门槛金额（付费用户 <100 人时取第 1 名即无鲸鱼门槛=只有榜首） */
  private async whaleThreshold(): Promise<number> {
    const sums = await this.prisma.order.groupBy({
      by: ["userId"],
      where: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
      _sum: { payAmount: true },
      orderBy: { _sum: { payAmount: "desc" } },
      take: 1000,
    });
    if (sums.length === 0) return Number.POSITIVE_INFINITY;
    const k = Math.max(0, Math.ceil(sums.length * 0.01) - 1);
    return Number(sums[Math.min(k, sums.length - 1)]._sum.payAmount ?? 0) || Number.POSITIVE_INFINITY;
  }

  private async recomputeBatch(userIds: string[], whaleThreshold: number): Promise<void> {
    const now = Date.now();
    const d7 = new Date(now - 7 * DAY_MS);
    const d14 = new Date(now - 14 * DAY_MS);
    const d30 = new Date(now - 30 * DAY_MS);

    const [act7, act14, act30, paidOrders, memberActive, memberViews, paipanCounts, bEntryUsers, certApproved, stations, merchants, offlines, circles, creators, interests] = await Promise.all([
      this.distinctActive(userIds, d7),
      this.distinctActive(userIds, d14),
      this.distinctActive(userIds, d30),
      this.prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _count: { _all: true },
        _sum: { payAmount: true },
      }),
      this.prisma.memberPurchase.findMany({
        where: { userId: { in: userIds }, OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }] },
        select: { userId: true }, distinct: ["userId"],
      }),
      this.prisma.trackEvent.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, action: "member_page_view", createdAt: { gte: d30 } },
        _count: { _all: true },
      }),
      this.prisma.paipanRecord.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, createdAt: { gte: d30 } },
        _count: { _all: true },
      }),
      this.prisma.trackEvent.findMany({
        where: {
          userId: { in: userIds }, action: "page_view", createdAt: { gte: d30 },
          OR: [{ path: { contains: "pkg-operator" } }, { path: { contains: "pkg-creator" } }, { path: { contains: "merchant" } }],
        },
        select: { userId: true }, distinct: ["userId"],
      }),
      this.prisma.teacherCertification.findMany({
        where: { userId: { in: userIds }, status: "APPROVED" },
        select: { userId: true },
      }),
      this.prisma.station.findMany({ where: { userId: { in: userIds }, status: "ACTIVE" }, select: { userId: true } }),
      this.prisma.merchant.findMany({ where: { userId: { in: userIds }, status: "ACTIVE" }, select: { userId: true } }),
      this.prisma.stationOffline.findMany({ where: { ownerUserId: { in: userIds }, status: "ACTIVE" }, select: { ownerUserId: true } }),
      this.prisma.circle.findMany({ where: { ownerId: { in: userIds }, status: "ACTIVE", deletedAt: null }, select: { ownerId: true } }),
      this.prisma.teacherCertification.findMany({ where: { userId: { in: userIds } }, select: { userId: true, status: true } }),
      this.prisma.userInterest.findMany({
        where: { userId: { in: userIds } },
        orderBy: { score: "desc" },
        select: { userId: true, tag: true, score: true },
      }),
    ]);

    const setOf = (rows: Array<{ userId: string | null }>) => new Set(rows.map((r) => r.userId).filter((v): v is string => v !== null));
    const active7 = setOf(act7), active14 = setOf(act14), active30 = setOf(act30);
    const memberSet = setOf(memberActive);
    const bEntrySet = setOf(bEntryUsers);
    const certSet = setOf(certApproved);
    const stationSet = setOf(stations);
    const merchantSet = setOf(merchants);
    const offlineSet = new Set(offlines.map((r) => r.ownerUserId));
    const circleSet = new Set(circles.map((r) => r.ownerId));
    const creatorSet = new Set(creators.filter((r) => r.status === "APPROVED").map((r) => r.userId));
    const orderMap = new Map(paidOrders.map((r) => [r.userId, { count: r._count._all, sum: Number(r._sum.payAmount ?? 0) }]));
    const memberViewMap = new Map(memberViews.map((r) => [r.userId as string, r._count._all]));
    const paipanMap = new Map(paipanCounts.map((r) => [r.userId, r._count._all]));
    const prefMap = new Map<string, string>();
    for (const i of interests) if (!prefMap.has(i.userId)) prefMap.set(i.userId, i.tag); // 已按 score desc，首见即 top1

    const rows: Array<{ userId: string; tag: string; type: string }> = [];
    for (const uid of userIds) {
      const push = (tag: string, type: "FACT" | "DERIVED") => rows.push({ userId: uid, tag, type });

      // 活跃度（三选一）
      if (active7.has(uid)) push("active_7d", "FACT");
      else if (active14.has(uid)) push("silent_14d", "FACT");
      else if (!active30.has(uid)) push("churned_30d", "FACT");
      else push("silent_14d", "FACT"); // 14-30 天窗口内有活跃但近14天无 → 沉默

      // 付费深度
      const order = orderMap.get(uid);
      if (!order || order.count === 0) push("pay_none", "FACT");
      else if (order.count === 1) push("pay_once", "FACT");
      else push("pay_repeat", "FACT");
      if (memberSet.has(uid)) push("pay_member", "FACT");

      // 角色（可叠加）
      if (creatorSet.has(uid)) push("role_creator", "FACT");
      if (stationSet.has(uid)) push("role_station", "FACT");
      if (merchantSet.has(uid)) push("role_merchant", "FACT");
      if (offlineSet.has(uid)) push("role_offline_station", "FACT");
      if (circleSet.has(uid)) push("role_circle_owner", "FACT");

      // 偏好 top1
      const pref = prefMap.get(uid);
      if (pref) push(`pref_${pref}`, "FACT");

      // DERIVED
      if ((memberViewMap.get(uid) ?? 0) >= 3 && !memberSet.has(uid)) push("price_sensitive", "DERIVED");
      if ((paipanMap.get(uid) ?? 0) >= 20 && bEntrySet.has(uid) && !certSet.has(uid)) push("high_potential_practitioner", "DERIVED");
      if (order && order.count > 0 && !active14.has(uid)) push("churn_risk", "DERIVED");
      if (order && order.sum >= whaleThreshold && Number.isFinite(whaleThreshold)) push("whale", "DERIVED");
    }

    // 幂等落库：批内先删后插（单事务）
    await this.prisma.$transaction([
      this.prisma.userTag.deleteMany({ where: { userId: { in: userIds } } }),
      this.prisma.userTag.createMany({ data: rows }),
    ]);
  }

  private distinctActive(userIds: string[], since: Date): Promise<Array<{ userId: string | null }>> {
    return this.prisma.trackEvent.findMany({
      where: { userId: { in: userIds }, action: "page_view", createdAt: { gte: since } },
      select: { userId: true }, distinct: ["userId"],
    });
  }

  // ───────── 查询（admin 用） ─────────

  /** 某标签下的用户分页（运营圈人） */
  async usersByTag(tag: string, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), 100);
    const [rows, total] = await Promise.all([
      this.prisma.userTag.findMany({
        where: { tag },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.userTag.count({ where: { tag } }),
    ]);
    return { items: rows, total, page: safePage, pageSize: safeSize };
  }

  /** 单用户全部标签 */
  async tagsOfUser(userId: string) {
    return this.prisma.userTag.findMany({ where: { userId }, orderBy: { tag: "asc" } });
  }

  /** 标签分布统计（看板用） */
  async distribution() {
    const rows = await this.prisma.userTag.groupBy({ by: ["tag"], _count: { _all: true } });
    return rows.map((r) => ({ tag: r.tag, count: r._count._all })).sort((a, b) => b.count - a.count);
  }
}
