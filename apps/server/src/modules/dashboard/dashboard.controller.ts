import { Controller, Get, Post, Param, Body, Query, UseGuards, Req, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam, ApiResponse } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { EntityDashboardService } from "./entity-dashboard.service";
import { RoleDashboardService } from "./role-dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("仪表盘")
@ApiBearerAuth()
@Controller("dashboard")
// 安全修复(后端审计#1)：类级补 RolesGuard + 默认管理角色门槛。
// 原先类级仅 JwtAuthGuard，导致 stats/trends/charts/revenue/realtime/bigscreen/content-health/funnel
// 这 8 个未挂方法级 @Roles 的端点，任何已登录 C 端用户都能读全平台营收/实时/大屏数据。
// RolesGuard 用 getAllAndOverride([handler,class])，下方带方法级 @Roles 的端点会自动覆盖此默认值，行为不变。
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class DashboardController {
  constructor(
    private svc: DashboardService,
    private entitySvc: EntityDashboardService,
    private roleSvc: RoleDashboardService,
  ) {}

  @Get("stats")
  // 权限修复(角色断裂)：六个角色工作台(Super/Operation/Finance/CustomerService/ContentAudit/GoodsAudit)均调本端点，
  // 方法级 @Roles 覆盖类级默认，放行全部管理角色（仍不放任何 C 端角色）。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR")
  @ApiOperation({ summary: "获取统计数据" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.getStats();
  }

  @Get("trends")
  @ApiOperation({ summary: "获取趋势数据" })
  @ApiResponse({ status: 200, description: "成功" })
  getTrends() {
    return this.svc.getTrends();
  }

  @Get("charts")
  // 权限修复(角色断裂)：内容审核工作台(ContentAuditDashboard)调本端点，放行 CONTENT_AUDITOR。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "获取图表数据" })
  @ApiResponse({ status: 200, description: "成功" })
  getCharts() {
    return this.svc.getCharts();
  }

  @Get("revenue")
  // 权限修复(角色断裂)：财务工作台(FinanceDashboard)调本端点，放行 FINANCE_ADMIN；财务数据不放其他审核/客服角色。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "营收概览（总额/环比/分类型）" })
  @ApiResponse({ status: 200, description: "成功" })
  getRevenueOverview() {
    return this.svc.getRevenueOverview();
  }

  @Get("realtime")
  @ApiOperation({ summary: "实时数据（今日订单/用户/营收/在线人数）" })
  @ApiResponse({ status: 200, description: "成功" })
  getRealtimeStats() {
    return this.svc.getRealtimeStats();
  }

  @Get("bigscreen")
  @ApiOperation({ summary: "实时大屏数据（运营大屏展示）" })
  @ApiResponse({ status: 200, description: "成功" })
  getBigScreen() {
    return this.svc.getBigScreen();
  }

  @Get("content-health")
  // 权限修复(角色断裂)：内容审核工作台(ContentAuditDashboard)调本端点，放行 CONTENT_AUDITOR。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "内容健康度分析（低质内容识别）" })
  @ApiResponse({ status: 200, description: "成功" })
  getContentHealth() {
    return this.svc.getContentHealth();
  }

  @Get("funnel")
  @ApiOperation({ summary: "转化漏斗（注册→排盘→AI分析→会员）" })
  @ApiResponse({ status: 200, description: "成功" })
  getFunnel() {
    return this.svc.getFunnel();
  }

  // ───────── 工作台增强 ─────────

  @Get("today-overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：运营/客服/内容审核工作台均调本端点，属通用工作台概览，放行全部六个管理角色。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR")
  @ApiOperation({ summary: "工作台今日概览（今日新增/趋势/待办）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getTodayOverview() {
    return this.svc.getTodayOverview();
  }

  @Get("alerts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "预警列表（按风险等级排序）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getSystemHealth() {
    return this.svc.getSystemHealth();
  }

  // ───────── 圈子专项看板 ─────────

  @Get("circles/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "圈子专项看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiParam({ name: "id", description: "圈子ID" })
  getCircleDashboard(@Param("id") id: string) {
    return this.entitySvc.getCircleDashboard(id);
  }

  // ───────── 课程专项看板 ─────────

  @Get("courses/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "课程专项看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiParam({ name: "id", description: "课程ID" })
  getCourseDashboard(@Param("id") id: string) {
    return this.entitySvc.getCourseDashboard(id);
  }

  // ───────── 直播专项看板 ─────────

  @Get("live/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "直播专项看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiParam({ name: "id", description: "直播ID" })
  getLiveDashboard(@Param("id") id: string) {
    return this.entitySvc.getLiveDashboard(id);
  }

  // ───────── 站长专项看板 ─────────

  @Get("station/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "站长专项看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiParam({ name: "id", description: "分站ID" })
  getStationDashboard(@Param("id") id: string) {
    return this.entitySvc.getStationDashboard(id);
  }

  // ───────── 驿站专项看板 ─────────

  @Get("offline/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驿站专项看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiParam({ name: "id", description: "驿站ID" })
  getOfflineDashboard(@Param("id") id: string) {
    return this.entitySvc.getOfflineDashboard(id);
  }

  // ───────── 角色专属仪表盘 ─────────

  @Get("role/:roleType")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR")
  @ApiOperation({ summary: "角色专属仪表盘（6种管理角色各返回专属数据）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiParam({ name: "roleType", description: "角色类型：SUPER_ADMIN/OPERATION_ADMIN/FINANCE_ADMIN/CUSTOMER_SERVICE/CONTENT_AUDITOR/GOODS_AUDITOR" })
  getRoleDashboard(@Req() req: Request, @Param("roleType") roleType: string) {
    // 安全修复(后端审计P1)：roleType 原直接取自 URL，不与调用者实际角色绑定 →
    // 低权管理角色(如客服/内容审核)可越权拉取 FINANCE_ADMIN 财务面板。
    // 超管/运营管理员保留跨角色查看(管理监督)；其余角色只能看自己拥有的角色面板。
    const roles: string[] = (req.user as { roles?: string[] })?.roles ?? [];
    const isSuper = roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN");
    if (!isSuper && !roles.includes(roleType)) {
      throw new ForbiddenException("无权查看该角色的仪表盘");
    }
    return this.roleSvc.getRoleDashboard(roleType);
  }

  // ───────── 平台总览 ─────────

  @Get("platform")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台总览（用户/内容/交易/收入四维聚合）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getPlatformOverview() {
    return this.svc.getPlatformOverview();
  }

  // ───────── 运营日报生成 ─────────

  @Post("report/daily")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "生成运营日报（默认昨天，可指定日期）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  generateDailyReport(@Body("date") date?: string) {
    return this.svc.generateDailyReport(date);
  }
}
