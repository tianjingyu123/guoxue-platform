import { Request } from "express";
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { SendNotificationDto, BatchSendDto } from "./notification.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("通知")
@Controller("notifications")
export class NotificationController {
  constructor(private svc: NotificationService) {}

  /** 发送通知 */
  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "发送通知" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  send(@Body() dto: SendNotificationDto & { userId: string }) {
    const { userId, ...rest } = dto;
    return this.svc.send(userId, rest);
  }

  /** 批量发送 */
  @Post("batch")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量发送通知" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  batchSend(@Body() dto: BatchSendDto) {
    return this.svc.batchSend(dto);
  }

  /** 我的通知 */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的通知列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  myNotifications(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserNotifications(req.user.id, +page, +pageSize);
  }

  /** 未读数量 */
  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取未读通知数量" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  unreadCount(@Req() req: Request) {
    return this.svc.getUnreadCount(req.user.id);
  }

  // ───────── 通知偏好（必须在 :id 路由之前）─────────

  @Get("preferences")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取通知偏好设置" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getPreferences(@Req() req: Request) {
    return this.svc.getPreferences(req.user.id);
  }

  @Put("preferences")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新通知偏好设置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updatePreferences(@Req() req: Request, @Body() prefs: Record<string, boolean>) {
    return this.svc.updatePreferences(req.user.id, prefs);
  }

  // ───────── 圈内通知中心（必须在 :id 路由之前）─────────

  /** 我的圈内通知列表（四类筛选+分页+未读计数） */
  @Get("circle")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的圈内通知列表（互动/交易/圈务/直播）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 400, description: "分类不合法" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "category", required: false, type: String, description: "分类 INTERACT/TRADE/GOVERN/LIVE，缺省为全部" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  myCircleNotifications(
    @Req() req: Request,
    @Query("category") category?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getCircleNotifications(req.user.id, category || undefined, +page, +pageSize);
  }

  /** 圈内通知全部已读 */
  @Put("circle/read-all")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "圈内通知全部标记已读（可按分类）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "分类不合法" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  markCircleAllRead(@Req() req: Request, @Body() body?: { category?: string }) {
    return this.svc.markCircleAllRead(req.user.id, body?.category || undefined);
  }

  /** 通知详情 */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取通知详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getDetail(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getById(id, req.user.id);
  }

  /** 标记已读 */
  @Put(":id/read")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "标记通知为已读" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  markRead(@Param("id") id: string, @Req() req: Request) {
    return this.svc.markRead(id, req.user.id);
  }

  /** 全部已读 */
  @Put("read-all")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "全部标记为已读" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  markAllRead(@Req() req: Request) {
    return this.svc.markAllRead(req.user.id);
  }

  /** 删除通知 */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除通知" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

}
