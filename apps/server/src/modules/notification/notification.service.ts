import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PushService } from "./push.service";
import { PushAudienceService } from "../user/push-audience.service";
import { SendNotificationDto, BatchSendDto, BroadcastDto, CIRCLE_NOTIFICATION_CATEGORIES } from "./notification.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

const PREFS_TTL = 86400 * 30;

/** 圈内通知列表行（category/circleId 列经原生 SQL 访问·见 prisma/manual/2026-07-11-circle-notifications.sql） */
export interface CircleNotificationRow {
  id: string;
  type: string;
  category: string;
  circleId: string | null;
  title: string;
  content: string;
  targetType: string | null;
  targetId: string | null;
  isRead: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private push: PushService,
    private audience: PushAudienceService,
  ) {}

  /** 给单个用户发送通知（DB存储 + 推送通道） */
  async send(userId: string, dto: SendNotificationDto) {
    // 1. 写入DB
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    // 1.5 圈内通知分类落库（category/circleId 列不在 prisma client 里，原生 SQL 补写；失败不阻断主流程）
    if (dto.category && (CIRCLE_NOTIFICATION_CATEGORIES as readonly string[]).includes(dto.category)) {
      await this.prisma
        .$executeRawUnsafe(
          `UPDATE "Notification" SET "category"=$1, "circleId"=$2 WHERE id=$3`,
          dto.category, dto.circleId ?? null, notification.id,
        )
        .catch((err) => this.logger.warn(`圈内通知分类落库失败 id=${notification.id}`, err));
    }

    // 2. 检查用户推送偏好，关闭则不推送
    const prefs = await this.getPreferences(userId);
    if (prefs.PUSH_ENABLED === false) {
      this.logger.debug(`用户 ${userId} 已关闭推送，跳过`);
      return notification;
    }

    // 3. 通过推送通道发送
    await this.sendPushIfPossible(userId, dto);

    return notification;
  }

  /** 批量发送通知 */
  async batchSend(dto: BatchSendDto) {
    const data = dto.userIds.map(userId => ({
      userId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      targetType: dto.targetType,
      targetId: dto.targetId,
    }));

    await this.prisma.notification.createMany({ data });

    // 圈内通知分类落库（createMany 拿不到 id，按 用户集合+type+target+5分钟窗口 补打标；失败不阻断）
    if (dto.category && (CIRCLE_NOTIFICATION_CATEGORIES as readonly string[]).includes(dto.category) && dto.userIds.length > 0) {
      await this.prisma
        .$executeRawUnsafe(
          `UPDATE "Notification" SET "category"=$1, "circleId"=$2
           WHERE "userId" = ANY($3) AND "type"=$4 AND "targetId" IS NOT DISTINCT FROM $5
             AND "category" IS NULL AND "createdAt" > NOW() - INTERVAL '5 minutes'`,
          dto.category, dto.circleId ?? null, dto.userIds, dto.type, dto.targetId ?? null,
        )
        .catch((err) => this.logger.warn("圈内通知分类批量落库失败", err));
    }

    // 批量读取推送偏好，过滤关闭推送的用户
    const prefsKeys = dto.userIds.map((uid) => `notification:prefs:${uid}`);
    const prefsResults = await Promise.all(prefsKeys.map((k) => this.redis.getJson<any>(k).catch(() => null)));
    const pushDisabled = new Set<string>();
    for (let i = 0; i < dto.userIds.length; i++) {
      const prefs = prefsResults[i];
      if (prefs && prefs.PUSH_ENABLED === false) {
        pushDisabled.add(dto.userIds[i]);
      }
    }

    const enabledUsers = dto.userIds.filter((uid) => !pushDisabled.has(uid));
    if (enabledUsers.length === 0) {
      this.logger.log("所有目标用户均已关闭推送，跳过");
      return { success: true, count: data.length, pushSkipped: dto.userIds.length };
    }

    // 批量预取所有用户的 auth 信息，避免 N+1 查询
    const auths = await this.prisma.auth.findMany({
      where: { userId: { in: enabledUsers } },
      select: { userId: true, provider: true, openId: true },
    });
    const authsByUser = new Map<string, { provider: string; openId: string | null }[]>();
    for (const a of auths) {
      const list = authsByUser.get(a.userId) || [];
      list.push(a);
      authsByUser.set(a.userId, list);
    }

    // 批量推送（仅推送给开启推送的用户）
    const pushDto = { type: dto.type, title: dto.title, content: dto.content };
    for (const userId of enabledUsers) {
      this.sendPushWithAuths(userId, pushDto, authsByUser.get(userId) || []).catch((err) => this.logger.warn("通知发送失败", err));
    }

    return { success: true, count: data.length, pushSkipped: pushDisabled.size };
  }

  /**
   * 管理员按标签群发（2026-07-17 审计补齐：此前只有单发/按 userIds 批发，无按人群群发）。
   * - 圈人复用 PushAudienceService（与 users/push/estimate 同口径·预估=实发）
   * - 落库为站内通知（createMany）；与既有 pushByTag 一致，不触发微信模板推送通道
   *   （群发量大时逐人拉 auth 推模板消息会拖死请求，站内通知是此场景的诚实边界）
   * - 返回真实写入人数
   */
  async broadcast(dto: BroadcastDto, senderId?: string) {
    let userIds: string[];
    if (dto.userIds?.length) {
      // 直接指定收件人：去重 + 只保留真实存在的 ACTIVE 用户（人数要真实）
      const unique = [...new Set(dto.userIds)];
      const users = await this.prisma.user.findMany({
        where: { id: { in: unique }, status: "ACTIVE" },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else {
      userIds = await this.audience.resolveUserIds(dto.tag, dto.memberLevel || "", dto.activeDays || 0);
    }

    const type = dto.type || "SYSTEM";
    let sentCount = 0;
    if (userIds.length > 0) {
      const result = await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, type, title: dto.title, content: dto.content })),
      });
      sentCount = result.count;
    }

    this.logger.log(
      `管理员群发: sender=${senderId ?? "unknown"}, tag=${dto.tag ?? ""}, userIds=${dto.userIds?.length ?? 0}, 实发=${sentCount}人, title=${dto.title}`,
    );
    return { sentCount, tag: dto.tag ?? "", type, title: dto.title };
  }

  /**
   * 管理员发送历史（GET /notifications/admin/sent）。
   * 诚实设计：Notification 模型无 sender/senderId 字段（不加迁移不虚构发送人），
   * 按「title + type + 分钟窗口」聚合近似还原每一次发送批次，返回目标人数与已读数。
   * 局限：同一分钟内同标题的两次发送会并为一条；系统自动通知（同为 SYSTEM 型）也会出现在列表中。
   */
  async adminSentHistory(rawPage: number | string = 1, rawPageSize: number | string = 20, type?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);

    const whereSql = type ? `WHERE "type"=$1` : "";
    const listParams: unknown[] = type ? [type, pageSize, skip] : [pageSize, skip];
    const countParams: unknown[] = type ? [type] : [];

    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ title: string; type: string; sentAt: Date; targetCount: number; readCount: number; content: string }>>(
        `SELECT title, "type", date_trunc('minute', "createdAt") AS "sentAt",
                COUNT(*)::int AS "targetCount",
                COUNT(*) FILTER (WHERE "isRead")::int AS "readCount",
                MIN(content) AS content
         FROM "Notification"
         ${whereSql}
         GROUP BY title, "type", date_trunc('minute', "createdAt")
         ORDER BY "sentAt" DESC
         LIMIT $${type ? 2 : 1} OFFSET $${type ? 3 : 2}`,
        ...listParams,
      ),
      this.prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(*)::int AS cnt FROM (
           SELECT 1 FROM "Notification" ${whereSql}
           GROUP BY title, "type", date_trunc('minute', "createdAt")
         ) t`,
        ...countParams,
      ),
    ]);

    return {
      items: rows.map((r) => ({ ...r, targetCount: Number(r.targetCount), readCount: Number(r.readCount) })),
      total: Number(totalRows[0]?.cnt) || 0,
      page,
      pageSize,
      aggregated: true, // 提示前端：无 sender 字段·按标题+类型+分钟窗口聚合的近似口径
    };
  }

  /** 使用预取 auth 数据发送推送（批量场景） */
  private async sendPushWithAuths(userId: string, dto: { type: string; title: string; content: string }, auths: { provider: string; openId: string | null }[]) {
    try {
      if (auths.length === 0) {
        this.logger.debug(`用户 ${userId} 无绑定账号，跳过推送`);
        return;
      }

      const wxAuth = auths.find((a) => a.provider === "WECHAT");
      const miniAuth = auths.find((a) => a.provider === "WECHAT_MINI");

      if (miniAuth?.openId) {
        await this.push.sendMiniSubscribeMsg({
          touser: miniAuth.openId,
          templateId: "",
          data: {
            thing1: { value: dto.title.slice(0, 20) },
            thing2: { value: dto.content.slice(0, 20) },
            time3: { value: new Date().toLocaleString("zh-CN") },
          },
        });
      } else if (wxAuth?.openId) {
        await this.push.sendMpTemplateMsg({ touser: wxAuth.openId, templateId: "", data: { thing1: { value: dto.title.slice(0, 20) }, thing2: { value: dto.content.slice(0, 20) } } });
      }
    } catch (err) {
      this.logger.warn(`用户 ${userId} 推送失败`, err);
    }
  }

  /** 尝试推送通知到用户 */
  private async sendPushIfPossible(userId: string, dto: { type: string; title: string; content: string; targetType?: string; targetId?: string; pushData?: Record<string, unknown> }) {
    try {
      // 查询用户绑定的openid和设备信息
      const auths = await this.prisma.auth.findMany({
        where: { userId },
        select: { provider: true, openId: true },
      });

      if (auths.length === 0) {
        this.logger.debug(`用户 ${userId} 无绑定账号，跳过推送`);
        return;
      }

      const pushData = dto.pushData || {};
      const wxAuth = auths.find((a) => a.provider === "WECHAT");
      const miniAuth = auths.find((a) => a.provider === "WECHAT_MINI");

      // 优先小程序订阅消息
      if (miniAuth?.openId && pushData.miniTemplateId) {
        await this.push.sendMiniSubscribeMsg({
          touser: miniAuth.openId,
          templateId: pushData.miniTemplateId as string,
          page: pushData.page as string | undefined,
          data: {
            thing1: { value: dto.title.slice(0, 20) },
            thing2: { value: dto.content.slice(0, 20) },
            time3: { value: new Date().toLocaleString("zh-CN") },
          },
        });
        return;
      }

      // 公众号模板消息
      if (wxAuth?.openId && pushData.mpTemplateId) {
        await this.push.sendMpTemplateMsg({
          touser: wxAuth.openId,
          templateId: pushData.mpTemplateId as string,
          url: pushData.url as string | undefined,
          data: {
            first: { value: dto.title },
            keyword1: { value: dto.content },
            keyword2: { value: new Date().toLocaleString("zh-CN") },
            remark: { value: "点击查看详情" },
          },
        });
      }
    } catch (err: unknown) {
      this.logger.warn(`推送通知到用户 ${userId} 失败: ${(err as Error).message}`);
    }
  }

  /** 获取单条通知详情 */
  async getById(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
    // 自动标记已读
    if (!notification.isRead) {
      await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
    }
    return notification;
  }

  /** 获取用户通知列表 */
  async getUserNotifications(userId: string, rawPage: number | string = 1, rawPageSize: number | string = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { userId };
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, pageSize };
  }

  /** 未读数量 */
  async getUnreadCount(userId: string) {
    return { unreadCount: await this.prisma.notification.count({ where: { userId, isRead: false } }) };
  }

  /** 标记单条已读 */
  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId }, select: { userId: true } });
    if (!notification || notification.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作此通知");
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /** 全部已读 */
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  // ───────── 圈内通知中心（V0 待办 #36·四类筛选视图，复用本表不建新表） ─────────

  private assertCircleCategory(category?: string) {
    if (category && !(CIRCLE_NOTIFICATION_CATEGORIES as readonly string[]).includes(category)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "分类仅支持 INTERACT/TRADE/GOVERN/LIVE");
    }
  }

  /** 我的圈内通知列表（分类筛选+分页+各类未读计数） */
  async getCircleNotifications(userId: string, category?: string, rawPage: number | string = 1, rawPageSize: number | string = 20) {
    this.assertCircleCategory(category);
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);

    const filter = category ? ` AND "category"=$2` : "";
    const listParams: unknown[] = category ? [userId, category, pageSize, skip] : [userId, pageSize, skip];
    const countParams: unknown[] = category ? [userId, category] : [userId];

    const [items, totalRows, unreadRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<CircleNotificationRow[]>(
        `SELECT id, type, "category", "circleId", title, content, "targetType", "targetId", "isRead", "createdAt"
         FROM "Notification"
         WHERE "userId"=$1 AND "category" IS NOT NULL${filter}
         ORDER BY "createdAt" DESC
         LIMIT $${category ? 3 : 2} OFFSET $${category ? 4 : 3}`,
        ...listParams,
      ),
      this.prisma.$queryRawUnsafe<{ cnt: number }[]>(
        `SELECT COUNT(*)::int AS cnt FROM "Notification" WHERE "userId"=$1 AND "category" IS NOT NULL${filter}`,
        ...countParams,
      ),
      // 未读计数始终按全部四类分组返回（前端 chips 角标不受当前筛选影响）
      this.prisma.$queryRawUnsafe<{ category: string; cnt: number }[]>(
        `SELECT "category", COUNT(*)::int AS cnt FROM "Notification"
         WHERE "userId"=$1 AND "isRead"=false AND "category" IS NOT NULL GROUP BY "category"`,
        userId,
      ),
    ]);

    const unread: Record<string, number> = { ALL: 0, INTERACT: 0, TRADE: 0, GOVERN: 0, LIVE: 0 };
    for (const row of unreadRows) {
      const n = Number(row.cnt) || 0;
      if (row.category in unread) unread[row.category] = n;
      unread.ALL += n;
    }

    return { items, total: Number(totalRows[0]?.cnt) || 0, page, pageSize, unread };
  }

  /** 圈内通知全部已读（可按分类） */
  async markCircleAllRead(userId: string, category?: string) {
    this.assertCircleCategory(category);
    const count = await this.prisma.$executeRawUnsafe(
      `UPDATE "Notification" SET "isRead"=true
       WHERE "userId"=$1 AND "isRead"=false AND "category" IS NOT NULL${category ? ` AND "category"=$2` : ""}`,
      ...(category ? [userId, category] : [userId]),
    );
    return { success: true, count };
  }

  /** 删除通知（管理员） */
  async delete(notificationId: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  // ───────── 通知偏好 ─────────

  async getPreferences(userId: string) {
    const key = `notification:prefs:${userId}`;
    const cached = await this.redis.getJson<any>(key);
    if (cached) return cached;

    const defaults = {
      COMMENT: true,
      LIKE: true,
      COLLECT: true,
      FOLLOW: true,
      EARNING: true,
      SYSTEM: true,
      PUSH_ENABLED: true,
    };
    await this.redis.setJson(key, defaults, PREFS_TTL);
    return defaults;
  }

  async updatePreferences(userId: string, prefs: Record<string, boolean>) {
    const key = `notification:prefs:${userId}`;
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...prefs };
    await this.redis.setJson(key, updated, PREFS_TTL);
    return updated;
  }
}
