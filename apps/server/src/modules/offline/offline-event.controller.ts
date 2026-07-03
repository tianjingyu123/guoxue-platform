import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { OfflineEventService } from "./offline-event.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import {
  CreateStationEventDto, UpdateStationEventDto, UpdateStationEventStatusDto,
  SignInEventDto, UpdateEventPhotosDto,
} from "./offline.dto";

/**
 * 驿站活动系统（T8 驿站 OMO P1a）
 * C 端 = /offline/events*（公开发现+登录报名）；B 端 = /offline/dashboard/events*（驿站主经营后台）
 */
@ApiTags("驿站活动")
@Controller("offline")
export class OfflineEventController {
  constructor(private svc: OfflineEventService) {}

  // ───────── C 端：活动发现与报名 ─────────

  @Get("events")
  @ApiOperation({ summary: "活动列表（公开·仅已发布·未结束优先+临近排序·带报名数与驿站简要）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "stationId", required: false, description: "按驿站过滤" })
  @ApiQuery({ name: "type", required: false, description: "活动类型 YAJI/SALON/READING/SOLAR_TERM/EXPERIENCE" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listPublicEvents(
    @Query("stationId") stationId?: string,
    @Query("type") type?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return this.svc.listPublicEvents({ stationId, type, page, pageSize });
  }

  @Get("my-event-registrations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的活动报名列表（带活动与驿站信息）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listMyEventRegistrations(@Req() req: Request, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listMyEventRegistrations(req.user.id, Number(page) || 1, Number(pageSize) || 20);
  }

  @Get("events/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "活动详情（公开·含报名数与回顾照片；登录时附带 myRegistration 报名状态）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "活动不存在" })
  getEvent(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getEvent(id, req.user?.id);
  }

  @Post("events/:id/register")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "报名活动（防超卖行锁·取消后可重报·报名成功站内通知）" })
  @ApiResponse({ status: 201, description: "报名成功" })
  @ApiResponse({ status: 400, description: "已报名/名额已满/活动未发布或已开场" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "活动不存在" })
  @ApiBearerAuth()
  registerEvent(@Req() req: Request, @Param("id") id: string) {
    return this.svc.registerEvent(req.user.id, id);
  }

  @Post("events/:id/cancel-registration")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消活动报名（开场前可取消·取消确认通知）" })
  @ApiResponse({ status: 201, description: "取消成功" })
  @ApiResponse({ status: 400, description: "已签到或活动已开场，无法取消" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "未报名该活动" })
  @ApiBearerAuth()
  cancelEventRegistration(@Req() req: Request, @Param("id") id: string) {
    return this.svc.cancelEventRegistration(req.user.id, id);
  }

  // ───────── B 端：活动管理（驿站主经营后台） ─────────

  @Post("dashboard/events")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建活动（驿站主·默认草稿 DRAFT）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/结束时间早于开始时间" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "未找到关联驿站" })
  @ApiBearerAuth()
  createEvent(@Req() req: Request, @Body() dto: CreateStationEventDto) {
    return this.svc.createEvent(req.user.id, dto);
  }

  @Get("dashboard/events")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "本驿站活动列表（驿站主·全状态·可按 status 过滤）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "未找到关联驿站" })
  @ApiBearerAuth()
  @ApiQuery({ name: "status", required: false, description: "DRAFT/PUBLISHED/CANCELLED/FINISHED" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listDashboardEvents(
    @Req() req: Request,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return this.svc.listDashboardEvents(req.user.id, { status, page, pageSize });
  }

  @Get("dashboard/calendar")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "统一经营日历（驿站主·聚合当月课程+活动+讲师预约三源，按日分组）" })
  @ApiResponse({ status: 200, description: "成功，返回 { month, days: { 'YYYY-MM-DD': [{kind,id,title,startTime,endTime,status}] } }" })
  @ApiResponse({ status: 400, description: "月份格式应为 YYYY-MM" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "未找到关联驿站" })
  @ApiBearerAuth()
  @ApiQuery({ name: "month", required: true, description: "月份，如 2026-07" })
  getCalendar(@Req() req: Request, @Query("month") month: string) {
    return this.svc.getCalendar(req.user.id, month);
  }

  @Post("dashboard/events/sign-in")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "活动扫码核销（驿站主·扫 qrCode 签到）" })
  @ApiResponse({ status: 201, description: "核销成功" })
  @ApiResponse({ status: 400, description: "报名已取消/已签到/活动已取消" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "无效的签到码/未找到关联驿站" })
  @ApiBearerAuth()
  signInEvent(@Req() req: Request, @Body() dto: SignInEventDto) {
    return this.svc.signInEvent(req.user.id, dto.qrCode);
  }

  @Put("dashboard/events/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "编辑活动（驿站主·已取消/已结束不可编辑）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/活动已取消或已结束" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站活动" })
  @ApiResponse({ status: 404, description: "活动不存在" })
  @ApiBearerAuth()
  updateEvent(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateStationEventDto) {
    return this.svc.updateEvent(req.user.id, id, dto);
  }

  @Put("dashboard/events/:id/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "活动状态流转（publish发布/cancel取消并群发通知报名者/finish结束）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "状态流转不合法" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站活动" })
  @ApiResponse({ status: 404, description: "活动不存在" })
  @ApiBearerAuth()
  updateEventStatus(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateStationEventStatusDto) {
    return this.svc.updateEventStatus(req.user.id, id, dto.action);
  }

  @Put("dashboard/events/:id/photos")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "回顾照片墙（驿站主·URL 数组≤30 张·仅活动结束或开场后可传）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "活动未开场/已取消/照片超限" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站活动" })
  @ApiResponse({ status: 404, description: "活动不存在" })
  @ApiBearerAuth()
  updateEventPhotos(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateEventPhotosDto) {
    return this.svc.updateEventPhotos(req.user.id, id, dto.photos);
  }
}
