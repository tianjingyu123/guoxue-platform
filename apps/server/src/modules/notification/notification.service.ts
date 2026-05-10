import { Injectable, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PushService } from "./push.service";
import { SendNotificationDto, BatchSendDto } from "./notification.dto";

const PREFS_TTL = 86400 * 30;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private push: PushService,
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

    // 2. 通过推送通道发送
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

    // 批量预取所有用户的 auth 信息，避免 N+1 查询
    const auths = await this.prisma.auth.findMany({
      where: { userId: { in: dto.userIds } },
      select: { userId: true, provider: true, openId: true },
    });
    const authsByUser = new Map<string, { provider: string; openId: string | null }[]>();
    for (const a of auths) {
      const list = authsByUser.get(a.userId) || [];
      list.push(a);
      authsByUser.set(a.userId, list);
    }

    // 批量推送
    const pushDto = { type: dto.type, title: dto.title, content: dto.content };
    for (const userId of dto.userIds) {
      this.sendPushWithAuths(userId, pushDto, authsByUser.get(userId) || []).catch((err) => this.logger.warn("通知发送失败", err));
    }

    return { success: true, count: data.length };
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

  /** 获取用户通知列表 */
  async getUserNotifications(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
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
    if (!notification || notification.userId !== userId) throw new ForbiddenException("无权操作此通知");
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

  /** 删除通知（管理员） */
  async delete(notificationId: string) {
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
