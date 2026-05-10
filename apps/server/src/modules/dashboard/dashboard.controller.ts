import { Controller, Get, Post, Param, Body, Query, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("仪表盘")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "获取统计数据" })
  getStats() {
    return this.svc.getStats();
  }

  @Get("trends")
  @ApiOperation({ summary: "获取趋势数据" })
  getTrends() {
    return this.svc.getTrends();
  }

  @Get("charts")
  @ApiOperation({ summary: "获取图表数据" })
  getCharts() {
    return this.svc.getCharts();
  }

  @Get("revenue")
  @ApiOperation({ summary: "营收概览（总额/环比/分类型）" })
  getRevenueOverview() {
    return this.svc.getRevenueOverview();
  }

  @Get("realtime")
  @ApiOperation({ summary: "实时数据（今日订单/用户/营收/在线人数）" })
  getRealtimeStats() {
    return this.svc.getRealtimeStats();
  }

  @Get("bigscreen")
  @ApiOperation({ summary: "实时大屏数据（运营大屏展示）" })
  getBigScreen() {
    return this.svc.getBigScreen();
  }

  @Get("content-health")
  @ApiOperation({ summary: "内容健康度分析（低质内容识别）" })
  getContentHealth() {
    return this.svc.getContentHealth();
  }

  @Get("funnel")
  @ApiOperation({ summary: "转化漏斗（注册→排盘→AI分析→会员）" })
  getFunnel() {
    return this.svc.getFunnel();
  }

  // ───────── 工作台增强 ─────────

  @Get("today-overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "工作台今日概览（今日新增/趋势/待办）" })
  getTodayOverview() {
    return this.svc.getTodayOverview();
  }

  @Get("alerts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "预警列表（按风险等级排序）" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getAlertList(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getAlertList(+page, +pageSize);
  }

  @Get("system-health")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "系统健康检查（第三方服务状态）" })
  getSystemHealth() {
    return this.svc.getSystemHealth();
  }

  // ───────── 圈子专项看板 ─────────

  @Get("circles/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "圈子专项看板" })
  @ApiParam({ name: "id", description: "圈子ID" })
  getCircleDashboard(@Param("id") id: string) {
    return this.svc.getCircleDashboard(id);
  }

  // ───────── 课程专项看板 ─────────

  @Get("courses/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "课程专项看板" })
  @ApiParam({ name: "id", description: "课程ID" })
  getCourseDashboard(@Param("id") id: string) {
    return this.svc.getCourseDashboard(id);
  }

  // ───────── 直播专项看板 ─────────

  @Get("live/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "直播专项看板" })
  @ApiParam({ name: "id", description: "直播ID" })
  getLiveDashboard(@Param("id") id: string) {
    return this.svc.getLiveDashboard(id);
  }

  // ───────── 站长专项看板 ─────────

  @Get("station/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "站长专项看板" })
  @ApiParam({ name: "id", description: "分站ID" })
  getStationDashboard(@Param("id") id: string) {
    return this.svc.getStationDashboard(id);
  }

  // ───────── 驿站专项看板 ─────────

  @Get("offline/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驿站专项看板" })
  @ApiParam({ name: "id", description: "驿站ID" })
  getOfflineDashboard(@Param("id") id: string) {
    return this.svc.getOfflineDashboard(id);
  }

  // ───────── 运营日报生成 ─────────

  @Post("report/daily")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "生成运营日报（默认昨天，可指定日期）" })
  generateDailyReport(@Body("date") date?: string) {
    return this.svc.generateDailyReport(date);
  }
}
