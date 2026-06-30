import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { FortuneService } from "./fortune.service";
import { CreateFortuneSubscriptionDto } from "./fortune.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("个性化运势")
@Controller("fortune")
export class FortuneController {
  constructor(private svc: FortuneService) {}

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "订阅运势推送" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  subscribe(@Req() req: Request, @Body() dto: CreateFortuneSubscriptionDto) {
    return this.svc.subscribe(req.user.id, dto);
  }

  @Get("subscriptions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的订阅列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  listSubscriptions(@Req() req: Request) {
    return this.svc.listSubscriptions(req.user.id);
  }

  @Delete("subscribe/:type/:channel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "取消订阅" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  unsubscribe(@Req() req: Request, @Param("type") type: string, @Param("channel") channel: string) {
    return this.svc.unsubscribe(req.user.id, type, channel);
  }

  @Get("today")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "今日运势" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getToday(@Req() req: Request) { return this.svc.getTodayFortune(req.user.id); }

  @Get("admin/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "运势记录列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  listRecords(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("fortuneType") fortuneType?: string) {
    return this.svc.adminListRecords(page ? +page : 1, pageSize ? +pageSize : 20, fortuneType);
  }

  @Get(":type/:period")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "按周期查询运势（按登录用户，缺失即确定性生成）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getByPeriod(@Req() req: Request, @Param("type") type: string, @Param("period") period: string) {
    return this.svc.getFortuneByPeriod(req.user.id, type, period);
  }

  // ───────── 管理 ─────────

  @Get("admin/subscriptions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "运势推送订阅配置列表（管理端）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  listAdminSubscriptions(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("fortuneType") fortuneType?: string,
  ) {
    return this.svc.adminListSubscriptions(page ? +page : 1, pageSize ? +pageSize : 20, fortuneType);
  }

  @Put("admin/subscriptions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "启用/禁用运势推送订阅配置（管理端）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "订阅配置不存在" })
  updateAdminSubscription(@Param("id") id: string, @Body("isActive") isActive: boolean) {
    return this.svc.adminUpdateSubscription(id, isActive);
  }

  @Post("admin/push-all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "推送全部运势" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  pushAll(@Body("fortuneType") fortuneType: string) { return this.svc.pushAll(fortuneType); }

  // ───────── 排盘工具聚合 ─────────

  @Get("tools")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "排盘工具首页聚合（工具网格+最近使用+课程推荐+智能体引导）" })
  @ApiResponse({ status: 200, description: "成功" })
  getTools(@Req() req?: Request) {
    return this.svc.getToolsGrid(req?.user?.id);
  }

  @Get("guide-card")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "排盘引导卡片数据" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getGuideCard(@Req() req: Request) {
    return this.svc.getGuideCard(req.user.id);
  }
}
