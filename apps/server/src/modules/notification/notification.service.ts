import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SendNotificationDto, BatchSendDto } from "./notification.dto";

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /** 给单个用户发送通知 */
  async send(userId: string, dto: SendNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
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
    return { success: true, count: data.length };
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
  async markRead(notificationId: string) {
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
}
