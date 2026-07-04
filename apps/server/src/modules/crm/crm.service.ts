import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { encrypt, decrypt, maskPhone, maskName } from "../../common/crypto.util";
import {
  CLIENT_LIMIT_TRIAL, REPURCHASE_DAYS, RFM_THRESHOLDS, RfmTier, ReminderKind,
  CreateClientDto, UpdateClientDto, ClientListQueryDto,
  CreateServeLogDto, UpdateServeLogDto, FromOrderDto,
} from "./crm.dto";

/**
 * 课-P3 客户经营 CRM（服务环·设计 §四）
 *
 * 合规红线（设计即合规）：
 * - 客户数据归从业者私有：所有查询强制 where ownerId=req.user.id，他人 clientId 与不存在同样 404；
 * - phone/birth M4 加密落库（AES-256-GCM），列表返回脱敏手机号；
 * - 禁导出端点（controller 层不提供任何批量导出）；
 * - 客户可要求删除 → 硬删（FK 级联删服务记录/提醒）+ AuditLog 留痕；
 * - 平台层不做跨从业者个体聚合（R3·洞察中心只走统计聚合，另在 P4）。
 *
 * 提醒 cron（每日 07:30·runExclusive 多实例防重）：
 * - 生日：按生辰月日，未来 3 天内到期即生成（dueAt=当年生日当天·等值幂等）；
 * - 立春流年：每年 2 月 3-5 日窗口对全量客户提醒「流年已换」（每客户每年一条）；
 * - 复购：上次服务距今 ≥ 90 天（无待办复购提醒且 90 天内未生成过才补）；
 * - TODO 大运切换：需按客户生辰接排盘引擎大运算法 + 盘存档深度联动，本期不生成（kind=DAYUN 已预留）。
 */

const DAY_MS = 86_400_000;

/** AI 草拟话术场景（模型路由未单配时走 default 便宜档） */
const DRAFT_SCENE = "crm_reminder_draft";

/** 提醒类型 → 中文名 */
export const REMINDER_KIND_LABEL: Record<ReminderKind, string> = {
  BIRTHDAY: "生日关怀",
  LICHUN: "立春流年",
  REPURCHASE: "复购关怀",
  DAYUN: "大运切换",
};

/** 降级模板话术（AI 失败/未配置时兜底·R4 定性：只谈文化寓意与陪伴，不做预测/化解承诺） */
const DRAFT_TEMPLATES: Record<ReminderKind, (name: string) => string> = {
  BIRTHDAY: (name) =>
    `${name}您好，快到您的生日啦，先祝您生日快乐！新的一岁，愿诸事顺遂、平安喜乐。有空欢迎来坐坐聊聊，最近也有些不错的传统文化内容想分享给您。`,
  LICHUN: (name) =>
    `${name}您好，立春已至，新的一年正式开启。从民俗文化的角度，流年更替正是回顾与展望的好时机。如果您想聊聊新一年的规划与心态调适，随时欢迎找我，愿您新的一年顺遂安康。`,
  REPURCHASE: (name) =>
    `${name}您好，好久没联系啦，一直记挂着您。最近这边有一些新的课程与文化活动，想着您可能会感兴趣。有空欢迎回来看看，也随时欢迎找我聊聊近况。`,
  DAYUN: (name) => `${name}您好，想与您聊聊近期的状态与规划，欢迎有空时联系我。`,
};

/** RFM 实时分层（纯函数·导出供单测）：R=lastServeAt 距今 / F=serveCount / M=totalSpend */
export function computeRfmTier(
  client: { lastServeAt: Date | null; serveCount: number; totalSpend: number },
  now: Date = new Date(),
): RfmTier {
  const rDays = client.lastServeAt
    ? Math.floor((now.getTime() - client.lastServeAt.getTime()) / DAY_MS)
    : Number.POSITIVE_INFINITY;
  const highValue =
    client.totalSpend >= RFM_THRESHOLDS.highValueSpend ||
    client.serveCount >= RFM_THRESHOLDS.highValueServeCount;
  if (highValue && rDays <= RFM_THRESHOLDS.dormantDays) return "HIGH_VALUE";
  if (rDays <= RFM_THRESHOLDS.activeDays) return "ACTIVE";
  if (rDays <= RFM_THRESHOLDS.dormantDays) return "AT_RISK";
  return "DORMANT";
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private gateway: AiGatewayService,
  ) {}

  // ───────── 角色判定（体验档限额）─────────

  /** 是否 B 端角色（站长/运营商/驿站/研究院成员/商家任一）——完整版不限客户数；无角色=体验档 ≤20（入角色钩子） */
  async hasBusinessRole(userId: string): Promise<boolean> {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleType: { in: ["STATION_MASTER", "OPERATOR", "STATION_OFFLINE_OWNER", "INSTITUTE_MEMBER", "INSTITUTE_ADMIN"] },
      },
      select: { id: true },
    });
    if (role) return true;
    // 角色表未必全量回填，兜底查业务实体（与 advisor.resolveSubjectIds 同思路）
    const [station, offline, merchant] = await Promise.all([
      this.prisma.station.findUnique({ where: { userId }, select: { id: true } }),
      this.prisma.stationOffline.findFirst({ where: { ownerUserId: userId }, select: { id: true } }),
      this.prisma.merchant.findFirst({ where: { userId, status: "ACTIVE" }, select: { id: true } }),
    ]);
    return !!(station || offline || merchant);
  }

  private async assertClientQuota(ownerId: string) {
    if (await this.hasBusinessRole(ownerId)) return;
    const count = await this.prisma.clientBook.count({ where: { ownerId } });
    if (count >= CLIENT_LIMIT_TRIAL) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `体验档客户档案上限 ${CLIENT_LIMIT_TRIAL} 个，成为站长/商家/驿站/研究院成员即无限量`,
      );
    }
  }

  // ───────── 客户档案 CRUD ─────────

  async createClient(ownerId: string, dto: CreateClientDto) {
    await this.assertClientQuota(ownerId);
    const client = await this.prisma.clientBook.create({
      data: {
        ownerId,
        name: dto.name.trim(),
        phoneEnc: dto.phone ? encrypt(dto.phone) : null,
        birthEnc: dto.birth ? encrypt(dto.birth) : null,
        gender: dto.gender || null,
        tags: (dto.tags || []).map((t) => t.trim()).filter(Boolean).slice(0, 10),
        source: dto.source || "manual",
        notes: dto.notes?.trim() || null,
      },
    });
    return this.toListItem(client);
  }

  /** 列表（RFM 实时计算 + 按层筛选 + 分层计数 + 体验档配额）。手机号脱敏返回 */
  async listClients(ownerId: string, query: ClientListQueryDto) {
    const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0 ? Math.floor(Number(query.page)) : 1;
    const rawSize = Number(query.pageSize);
    const pageSize = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(Math.floor(rawSize), 100) : 20;

    const rows = await this.prisma.clientBook.findMany({
      where: {
        ownerId,
        ...(query.keyword?.trim() ? { name: { contains: query.keyword.trim(), mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 2000, // RFM 实时计算需全量参与分层；单从业者客户量级远小于此
    });

    const now = new Date();
    const items = rows.map((c) => this.toListItem(c, now));
    const tierCounts: Record<string, number> = { HIGH_VALUE: 0, ACTIVE: 0, AT_RISK: 0, DORMANT: 0 };
    for (const it of items) tierCounts[it.tier]++;

    const filtered = query.tier ? items.filter((it) => it.tier === query.tier) : items;
    const isBusiness = await this.hasBusinessRole(ownerId);
    // 注意：不平铺 total/page/pageSize（ResponseInterceptor 会误识别为分页响应而丢弃 tierCounts/quota）
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: { total: filtered.length, page, pageSize },
      tierCounts,
      quota: { used: rows.length, limit: isBusiness ? null : CLIENT_LIMIT_TRIAL },
    };
  }

  /** 详情（含服务记录/待办提醒·档案归本人所有故返回明文电话与生辰） */
  async getClient(ownerId: string, id: string) {
    const client = await this.findOwnedClient(ownerId, id);
    const [serveLogs, reminders] = await Promise.all([
      this.prisma.clientServeLog.findMany({
        where: { clientId: id },
        orderBy: { servedAt: "desc" },
        take: 50,
      }),
      this.prisma.clientReminder.findMany({
        where: { clientId: id, status: "PENDING" },
        orderBy: { dueAt: "asc" },
        take: 10,
      }),
    ]);
    return {
      ...this.toListItem(client),
      phone: client.phoneEnc ? decrypt(client.phoneEnc) : null,
      birth: client.birthEnc ? decrypt(client.birthEnc) : null,
      notes: client.notes,
      serveLogs: serveLogs.map((l) => ({ ...l, amount: l.amount === null ? null : Number(l.amount) })),
      reminders,
    };
  }

  async updateClient(ownerId: string, id: string, dto: UpdateClientDto) {
    await this.findOwnedClient(ownerId, id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phoneEnc = dto.phone ? encrypt(dto.phone) : null;
    if (dto.birth !== undefined) data.birthEnc = dto.birth ? encrypt(dto.birth) : null;
    if (dto.gender !== undefined) data.gender = dto.gender || null;
    if (dto.tags !== undefined) data.tags = dto.tags.map((t) => t.trim()).filter(Boolean).slice(0, 10);
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    const updated = await this.prisma.clientBook.update({ where: { id }, data });
    return this.toListItem(updated);
  }

  /** 硬删（设计：客户可要求从业者删除）：FK 级联删服务记录/提醒 + AuditLog 留痕（快照存密文不落明文） */
  async deleteClient(ownerId: string, id: string) {
    const client = await this.findOwnedClient(ownerId, id);
    await this.prisma.$transaction([
      this.prisma.clientBook.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: {
          userId: ownerId,
          executor: ownerId,
          action: "CRM_CLIENT_DELETE",
          targetType: "ClientBook",
          targetId: id,
          detail: `硬删客户档案「${client.name}」（客户可要求删除·级联删服务记录与提醒）`,
          rollbackData: {
            name: client.name,
            phoneEnc: client.phoneEnc,
            birthEnc: client.birthEnc,
            gender: client.gender,
            tags: client.tags,
            source: client.source,
            sourceUserId: client.sourceUserId,
            notes: client.notes,
            serveCount: client.serveCount,
            totalSpend: Number(client.totalSpend),
            lastServeAt: client.lastServeAt?.toISOString() ?? null,
          },
        },
      }),
    ]);
    return { deleted: true };
  }

  // ───────── 服务记录 CRUD（同事务聚合回写 RFM 三字段）─────────

  async addServeLog(ownerId: string, clientId: string, dto: CreateServeLogDto) {
    await this.findOwnedClient(ownerId, clientId);
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.clientServeLog.create({
        data: {
          clientId,
          ownerId,
          type: dto.type,
          amount: dto.amount ?? null,
          summary: dto.summary.trim(),
          servedAt: dto.servedAt ? new Date(dto.servedAt) : new Date(),
        },
      });
      await this.syncClientAggregates(tx, clientId);
      return log;
    });
  }

  async listServeLogs(ownerId: string, clientId: string) {
    await this.findOwnedClient(ownerId, clientId);
    const items = await this.prisma.clientServeLog.findMany({
      where: { clientId },
      orderBy: { servedAt: "desc" },
      take: 200,
    });
    return { items: items.map((l) => ({ ...l, amount: l.amount === null ? null : Number(l.amount) })) };
  }

  async updateServeLog(ownerId: string, logId: string, dto: UpdateServeLogDto) {
    const log = await this.findOwnedServeLog(ownerId, logId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clientServeLog.update({
        where: { id: logId },
        data: {
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}),
          ...(dto.servedAt !== undefined ? { servedAt: new Date(dto.servedAt) } : {}),
        },
      });
      await this.syncClientAggregates(tx, log.clientId);
      return updated;
    });
  }

  async deleteServeLog(ownerId: string, logId: string) {
    const log = await this.findOwnedServeLog(ownerId, logId);
    await this.prisma.$transaction(async (tx) => {
      await tx.clientServeLog.delete({ where: { id: logId } });
      await this.syncClientAggregates(tx, log.clientId);
    });
    return { deleted: true };
  }

  /** 从服务记录全量聚合回写 lastServeAt/serveCount/totalSpend（增删改统一走这条·天然一致） */
  private async syncClientAggregates(
    tx: Pick<PrismaService, "clientServeLog" | "clientBook">,
    clientId: string,
  ) {
    const agg = await tx.clientServeLog.aggregate({
      where: { clientId },
      _count: true,
      _sum: { amount: true },
      _max: { servedAt: true },
    });
    await tx.clientBook.update({
      where: { id: clientId },
      data: {
        serveCount: agg._count,
        totalSpend: agg._sum.amount ?? 0,
        lastServeAt: agg._max.servedAt,
      },
    });
  }

  // ───────── 提醒（工作台待办）─────────

  async listReminders(ownerId: string, status = "PENDING") {
    const items = await this.prisma.clientReminder.findMany({
      where: { ownerId, status },
      orderBy: { dueAt: "asc" },
      take: 50,
      include: { client: { select: { name: true, tags: true } } },
    });
    return {
      items: items.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.name,
        kind: r.kind,
        kindLabel: REMINDER_KIND_LABEL[r.kind as ReminderKind] ?? r.kind,
        dueAt: r.dueAt,
        status: r.status,
        aiDraft: r.aiDraft,
        createdAt: r.createdAt,
      })),
    };
  }

  async completeReminder(ownerId: string, id: string) {
    const reminder = await this.prisma.clientReminder.findFirst({ where: { id, ownerId } });
    if (!reminder) throw new BusinessException(ErrorCode.NOT_FOUND, "提醒不存在");
    return this.prisma.clientReminder.update({
      where: { id },
      data: { status: "DONE", doneAt: new Date() },
    });
  }

  /** AI 草拟跟进话术（gateway 便宜档·失败降级模板话术·prompt 内置 R4 定性约束） */
  async draftReminder(ownerId: string, id: string) {
    const reminder = await this.prisma.clientReminder.findFirst({
      where: { id, ownerId },
      include: { client: { select: { name: true, tags: true } } },
    });
    if (!reminder) throw new BusinessException(ErrorCode.NOT_FOUND, "提醒不存在");
    const kind = reminder.kind as ReminderKind;
    const draft = await this.generateDraft(ownerId, kind, reminder.client.name, reminder.client.tags);
    const updated = await this.prisma.clientReminder.update({ where: { id }, data: { aiDraft: draft } });
    return { id: updated.id, aiDraft: updated.aiDraft };
  }

  private async generateDraft(userId: string, kind: ReminderKind, clientName: string, tags: string[]): Promise<string> {
    const fallback = (DRAFT_TEMPLATES[kind] ?? DRAFT_TEMPLATES.REPURCHASE)(clientName);
    if (process.env.NODE_ENV === "test") return fallback;
    try {
      const messages: AiMessage[] = [
        {
          role: "system",
          content:
            "你是国学传统文化从业者的客户经营助手，帮从业者给老客户写一条微信问候话术。要求：80-140字中文口语化、真诚不油腻、可直接复制发送；合规红线：所有命理/民俗内容一律定性为民俗文化参考，禁止任何「预测、改运、化解、消灾、辟邪、保证、灵验」等断言或功效承诺；不编造优惠价格；只输出话术正文，不要引号不要解释。",
        },
        {
          role: "user",
          content: `提醒类型：${REMINDER_KIND_LABEL[kind]}\n客户称呼：${clientName}\n客户标签：${tags.join("、") || "无"}\n参考模板：${fallback}`,
        },
      ];
      const res = await this.gateway.chat({
        scene: DRAFT_SCENE, // 未在模型路由单配时走 default 便宜档
        userId,
        messages,
        options: { temperature: 0.7, maxTokens: 260 },
        skipCache: true, // 每客户话术要求个性化，语义缓存易误命中
      });
      const text = res.content?.trim();
      return text && text.length >= 20 ? text.slice(0, 300) : fallback;
    } catch (err) {
      this.logger.warn(`CRM 话术 AI 草拟失败，降级模板：${(err as Error).message}`);
      return fallback;
    }
  }

  // ───────── 提醒 cron（幂等）─────────

  /** 每日 07:30 生成客户提醒（多实例 runExclusive 防重·各类型均有等值/窗口去重，重复执行不重复生成） */
  @Cron("30 7 * * *")
  async remindersCron() {
    await this.redis.runExclusive("crm_reminders_daily", 3600, async () => {
      try {
        const result = await this.generateReminders();
        this.logger.log(
          `CRM 提醒生成完成：生日 ${result.birthday} / 立春 ${result.lichun} / 复购 ${result.repurchase}`,
        );
      } catch (e) {
        this.logger.error("CRM 提醒生成失败", e as Error);
      }
    });
  }

  /** 提醒生成核心（now 可注入·单测用）。TODO 大运切换（kind=DAYUN）：需按生辰接排盘引擎大运算法+盘存档联动，本期不生成 */
  async generateReminders(now: Date = new Date()) {
    const counts = { birthday: 0, lichun: 0, repurchase: 0 };

    // ── 生日：有生辰的客户，生日在未来 3 天内（含今天）→ dueAt=当年生日当天（等值幂等）──
    const withBirth = await this.prisma.clientBook.findMany({
      where: { birthEnc: { not: null } },
      select: { id: true, ownerId: true, birthEnc: true },
      take: 10000,
    });
    for (const c of withBirth) {
      const birth = decrypt(c.birthEnc as string);
      const m = birth.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) continue;
      const [, , mm, dd] = m;
      for (let offset = 0; offset <= 3; offset++) {
        const day = new Date(now.getTime() + offset * DAY_MS);
        if (day.getMonth() + 1 === Number(mm) && day.getDate() === Number(dd)) {
          const dueAt = new Date(day.getFullYear(), day.getMonth(), day.getDate());
          const exists = await this.prisma.clientReminder.findFirst({
            where: { clientId: c.id, kind: "BIRTHDAY", dueAt },
            select: { id: true },
          });
          if (!exists) {
            await this.prisma.clientReminder.create({
              data: { clientId: c.id, ownerId: c.ownerId, kind: "BIRTHDAY", dueAt },
            });
            counts.birthday++;
          }
          break;
        }
      }
    }

    // ── 立春流年：每年 2 月 3-5 日窗口全量客户提醒（每客户每年一条·dueAt=当年2月4日等值幂等）──
    if (now.getMonth() + 1 === 2 && now.getDate() >= 3 && now.getDate() <= 5) {
      const dueAt = new Date(now.getFullYear(), 1, 4);
      const clients = await this.prisma.clientBook.findMany({
        select: { id: true, ownerId: true },
        take: 10000,
      });
      for (const c of clients) {
        const exists = await this.prisma.clientReminder.findFirst({
          where: { clientId: c.id, kind: "LICHUN", dueAt },
          select: { id: true },
        });
        if (!exists) {
          await this.prisma.clientReminder.create({
            data: { clientId: c.id, ownerId: c.ownerId, kind: "LICHUN", dueAt },
          });
          counts.lichun++;
        }
      }
    }

    // ── 复购：上次服务距今 ≥ 90 天（有待办或 90 天内已生成过则不重复）──
    const staleBefore = new Date(now.getTime() - REPURCHASE_DAYS * DAY_MS);
    const staleClients = await this.prisma.clientBook.findMany({
      where: { lastServeAt: { not: null, lte: staleBefore } },
      select: { id: true, ownerId: true },
      take: 10000,
    });
    for (const c of staleClients) {
      const exists = await this.prisma.clientReminder.findFirst({
        where: {
          clientId: c.id,
          kind: "REPURCHASE",
          OR: [{ status: "PENDING" }, { createdAt: { gte: staleBefore } }],
        },
        select: { id: true },
      });
      if (!exists) {
        await this.prisma.clientReminder.create({
          data: { clientId: c.id, ownerId: c.ownerId, kind: "REPURCHASE", dueAt: now },
        });
        counts.repurchase++;
      }
    }

    return counts;
  }

  // ───────── 订单归因入库询问（最小实现·不做自动入库，尊重双方）─────────

  /** 近 30 天经我 ref 成交且未入库的买家（脱敏昵称·仅供「是否归档」询问） */
  async suggestedClients(ownerId: string) {
    const since = new Date(Date.now() - 30 * DAY_MS);
    const orders = await this.prisma.order.findMany({
      where: {
        referrerId: ownerId,
        userId: { not: ownerId },
        status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        createdAt: { gte: since },
      },
      select: { id: true, userId: true, payAmount: true, amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    if (orders.length === 0) return { items: [] };

    // 按买家聚合（保留其最近一单 orderId 供 from-order 建档）
    const byBuyer = new Map<string, { orderId: string; orderCount: number; totalAmount: number; lastOrderAt: Date }>();
    for (const o of orders) {
      const cur = byBuyer.get(o.userId);
      const amt = Number(o.payAmount ?? o.amount ?? 0);
      if (cur) {
        cur.orderCount++;
        cur.totalAmount += amt;
      } else {
        byBuyer.set(o.userId, { orderId: o.id, orderCount: 1, totalAmount: amt, lastOrderAt: o.createdAt });
      }
    }

    const buyerIds = [...byBuyer.keys()];
    const archived = await this.prisma.clientBook.findMany({
      where: { ownerId, sourceUserId: { in: buyerIds } },
      select: { sourceUserId: true },
    });
    const archivedSet = new Set(archived.map((a) => a.sourceUserId));
    const pendingIds = buyerIds.filter((id) => !archivedSet.has(id));
    if (pendingIds.length === 0) return { items: [] };

    const users = await this.prisma.user.findMany({
      where: { id: { in: pendingIds } },
      select: { id: true, nickname: true },
    });
    const nickMap = new Map(users.map((u) => [u.id, u.nickname]));

    return {
      items: pendingIds
        .map((uid) => {
          const stat = byBuyer.get(uid)!;
          return {
            orderId: stat.orderId,
            nickname: maskName(nickMap.get(uid) ?? "客户"), // 脱敏昵称：入库前不暴露完整身份
            orderCount: stat.orderCount,
            totalAmount: Math.round(stat.totalAmount * 100) / 100,
            lastOrderAt: stat.lastOrderAt,
          };
        })
        .slice(0, 50),
    };
  }

  /** 一键入库：orderId → 校验经我 ref 成交 → 取买家昵称建档（不取手机号/生辰·由从业者后续征得同意手补） */
  async createClientFromOrder(ownerId: string, dto: FromOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        referrerId: ownerId,
        status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
      },
      select: { userId: true },
    });
    // 他人订单/非我推荐/未支付 与不存在同样 404（防订单号探测）
    if (!order) throw new BusinessException(ErrorCode.NOT_FOUND, "订单不存在或非经你推荐成交");
    if (order.userId === ownerId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不能将自己归档为客户");
    }
    const exists = await this.prisma.clientBook.findFirst({
      where: { ownerId, sourceUserId: order.userId },
      select: { id: true },
    });
    if (exists) throw new BusinessException(ErrorCode.CONFLICT, "该客户已在你的客户簿中");
    await this.assertClientQuota(ownerId);

    const buyer = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { nickname: true },
    });
    const client = await this.prisma.clientBook.create({
      data: {
        ownerId,
        name: (buyer?.nickname ?? "平台客户").slice(0, 30),
        source: "order",
        sourceUserId: order.userId,
      },
    });
    return this.toListItem(client);
  }

  // ───────── 私有工具 ─────────

  /** 归属校验：他人 clientId 与不存在同样 404 */
  private async findOwnedClient(ownerId: string, id: string) {
    const client = await this.prisma.clientBook.findFirst({ where: { id, ownerId } });
    if (!client) throw new BusinessException(ErrorCode.NOT_FOUND, "客户不存在");
    return client;
  }

  private async findOwnedServeLog(ownerId: string, id: string) {
    const log = await this.prisma.clientServeLog.findFirst({ where: { id, ownerId } });
    if (!log) throw new BusinessException(ErrorCode.NOT_FOUND, "服务记录不存在");
    return log;
  }

  /** 列表项（手机号脱敏·不含备注全文与生辰） */
  private toListItem(
    client: {
      id: string; name: string; phoneEnc: string | null; birthEnc: string | null;
      gender: string | null; tags: string[]; source: string;
      lastServeAt: Date | null; serveCount: number; totalSpend: unknown; createdAt: Date;
    },
    now: Date = new Date(),
  ) {
    const totalSpend = Number(client.totalSpend ?? 0);
    return {
      id: client.id,
      name: client.name,
      phoneMasked: client.phoneEnc ? maskPhone(decrypt(client.phoneEnc)) : null,
      hasBirth: !!client.birthEnc,
      gender: client.gender,
      tags: client.tags,
      source: client.source,
      lastServeAt: client.lastServeAt,
      serveCount: client.serveCount,
      totalSpend,
      tier: computeRfmTier({ lastServeAt: client.lastServeAt, serveCount: client.serveCount, totalSpend }, now),
      createdAt: client.createdAt,
    };
  }
}
