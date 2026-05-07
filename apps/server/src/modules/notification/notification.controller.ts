import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { SendNotificationDto, BatchSendDto } from "./notification.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("notifications")
export class NotificationController {
  constructor(private svc: NotificationService) {}

  /** 发送通知 */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  send(@Body() dto: SendNotificationDto & { userId: string }) {
    const { userId, ...rest } = dto;
    return this.svc.send(userId, rest);
  }

  /** 批量发送 */
  @Post("batch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  batchSend(@Body() dto: BatchSendDto) {
    return this.svc.batchSend(dto);
  }

  /** 我的通知 */
  @Get()
  @UseGuards(JwtAuthGuard)
  myNotifications(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserNotifications(req.user.id, +page, +pageSize);
  }

  /** 未读数量 */
  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  unreadCount(@Req() req: any) {
    return this.svc.getUnreadCount(req.user.id);
  }

  /** 标记已读 */
  @Put(":id/read")
  @UseGuards(JwtAuthGuard)
  markRead(@Param("id") id: string) {
    return this.svc.markRead(id);
  }

  /** 全部已读 */
  @Put("read-all")
  @UseGuards(JwtAuthGuard)
  markAllRead(@Req() req: any) {
    return this.svc.markAllRead(req.user.id);
  }
}
