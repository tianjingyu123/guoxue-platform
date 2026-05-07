import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { SendNotificationDto, BatchSendDto } from "./notification.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("通知")
@Controller("notifications")
export class NotificationController {
  constructor(private svc: NotificationService) {}

  /** 发送通知 */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发送通知" })
  @ApiBearerAuth()
  send(@Body() dto: SendNotificationDto & { userId: string }) {
    const { userId, ...rest } = dto;
    return this.svc.send(userId, rest);
  }

  /** 批量发送 */
  @Post("batch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量发送通知" })
  @ApiBearerAuth()
  batchSend(@Body() dto: BatchSendDto) {
    return this.svc.batchSend(dto);
  }

  /** 我的通知 */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的通知列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  myNotifications(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserNotifications(req.user.id, +page, +pageSize);
  }

  /** 未读数量 */
  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取未读通知数量" })
  @ApiBearerAuth()
  unreadCount(@Req() req: any) {
    return this.svc.getUnreadCount(req.user.id);
  }

  /** 标记已读 */
  @Put(":id/read")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "标记通知为已读" })
  @ApiBearerAuth()
  markRead(@Param("id") id: string) {
    return this.svc.markRead(id);
  }

  /** 全部已读 */
  @Put("read-all")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "全部标记为已读" })
  @ApiBearerAuth()
  markAllRead(@Req() req: any) {
    return this.svc.markAllRead(req.user.id);
  }
}
