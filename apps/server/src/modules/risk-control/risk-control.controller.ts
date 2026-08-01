import { Request } from "express";
import { Controller, Get, Post, Put, Delete, Body, Query, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { RiskControlService } from "./risk-control.service";
import { DistributionRiskService } from "./distribution-risk.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { Roles } from "../../common/roles.decorator";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { Auditable } from "../../common/audit.decorator";
import {
  CreateRuleDto,
  UpdateRuleDto,
  RuleListQueryDto,
  AlertListQueryDto,
  HandleAlertDto,
  AlertActionDto,
  FraudDetectionListQueryDto,
  AppealListQueryDto,
  RejectAppealDto,
  DeviceFingerprintQueryDto,
  UserTimelineQueryDto,
} from "./risk-control.dto";

@ApiTags("风控中心")
@Controller("risk-control")
export class RiskControlController {
  constructor(
    private svc: RiskControlService,
    private distributionRisk: DistributionRiskService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  1. 预警规则 CRUD（仅超级管理员）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post("rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "创建预警规则" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createRule(@Body() dto: CreateRuleDto) {
    return this.svc.createRule(dto);
  }

  @Get("rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取预警规则列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listRules(@Query() q: RuleListQueryDto) {
    return this.svc.listRules(q);
  }

  @Put("rules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新预警规则" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateRule(@Param("id") id: string, @Body() dto: UpdateRuleDto) {
    return this.svc.updateRule(id, dto);
  }

  @Delete("rules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除预警规则" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteRule(@Param("id") id: string) {
    return this.svc.deleteRule(id);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2. 预警列表（超级管理员 / 运营管理员）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get("alerts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取预警列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listAlerts(@Query() q: AlertListQueryDto) {
    return this.svc.listAlerts(q);
  }

  @Put("alerts/:id/handle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "处理预警" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  handleAlert(@Param("id") id: string, @Req() req: Request, @Body() dto: HandleAlertDto) {
    return this.svc.handleAlert(id, req.user.id, dto.note);
  }

  @Put("alerts/:id/dismiss")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "忽略预警" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  dismissAlert(@Param("id") id: string) {
    return this.svc.dismissAlert(id);
  }

  @Post("alerts/:id/action")
  @Auditable({ action: "风控预警处置", targetType: "RISK_ALERT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "预警处置（封禁用户/升级）" })
  @ApiResponse({ status: 201, description: "处置成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  actionAlert(@Param("id") id: string, @Req() req: Request, @Body() dto: AlertActionDto) {
    return this.svc.actionAlert(id, req.user.id, dto.action, dto.note);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  3. 刷单识别
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get("fraud-detections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取刷单检测列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listFraudDetections(@Query() q: FraudDetectionListQueryDto) {
    return this.svc.listFraudDetections(q);
  }

  @Post("fraud-detections/scan")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
  @Roles("SUPER_ADMIN")
  @RequireFeature("risk_fraud_scan")
  @ApiOperation({ summary: "手动触发刷单扫描" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  scanFraud() {
    return this.svc.scanFraud();
  }

  @Put("fraud-detections/:id/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @RequireFeature("risk_fraud_scan")
  @ApiOperation({ summary: "确认为刷单" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  confirmFraudDetection(@Param("id") id: string) {
    return this.svc.confirmFraudDetection(id);
  }

  @Put("fraud-detections/:id/dismiss")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @RequireFeature("risk_fraud_scan")
  @ApiOperation({ summary: "标记为误报" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  dismissFraudDetection(@Param("id") id: string) {
    return this.svc.dismissFraudDetection(id);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  3.5 分销风控（商-P1·违禁词扫描 + 归因异常四规则）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post("distribution-scan")
  @Auditable({ action: "分销风控扫描", targetType: "RISK_ALERT" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "手动触发分销风控扫描（违禁词+归因异常四规则·与日检 02:30 cron 共用）" })
  @ApiResponse({ status: 201, description: "扫描完成，返回报告" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  distributionScan() {
    return this.distributionRisk.scanAll();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  4. 用户行为时间线
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get("user-timeline/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查询用户行为时间线" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getUserTimeline(@Param("userId") userId: string, @Query() q: UserTimelineQueryDto) {
    return this.svc.getUserTimeline(userId, q);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  5. 申诉处理
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get("appeals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：客服工作台负责用户申诉受理，放行 CUSTOMER_SERVICE。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "获取申诉列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listAppeals(@Query() q: AppealListQueryDto) {
    return this.svc.listAppeals(q);
  }

  @Put("appeals/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：申诉裁决原仅 SUPER_ADMIN，路由放行的运营/客服全 403，对齐为三角色。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "批准申诉" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  approveAppeal(@Param("id") id: string, @Req() req: Request) {
    return this.svc.approveAppeal(id, req.user.id);
  }

  @Put("appeals/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：申诉裁决原仅 SUPER_ADMIN，路由放行的运营/客服全 403，对齐为三角色。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "驳回申诉" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  rejectAppeal(@Param("id") id: string, @Req() req: Request, @Body() dto: RejectAppealDto) {
    return this.svc.rejectAppeal(id, req.user.id, dto.reviewNote);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  6. 设备指纹
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get("device-fingerprints")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取设备指纹列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listDeviceFingerprints(@Query() q: DeviceFingerprintQueryDto) {
    return this.svc.listDeviceFingerprints(q);
  }

  @Get("device-fingerprints/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看用户的所有设备" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getDeviceFingerprintsByUser(@Param("userId") userId: string) {
    return this.svc.getDeviceFingerprintsByUser(userId);
  }
}
