import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { SensitiveRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { FeedbackService } from "./feedback.service";
import { SubmitFeedbackDto } from "./feedback.dto";
import { FeedbackListQueryDto, UpdateFeedbackStatusDto } from "./feedback-admin.dto";

@ApiTags("反馈")
@ApiBearerAuth()
@Controller("users")
export class FeedbackController {
  constructor(private readonly svc: FeedbackService) {}

  @Get("feedback/types")
  @ApiOperation({ summary: "获取反馈类型列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getFeedbackTypes() {
    return this.svc.getFeedbackTypes();
  }

  @Get("feedback/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取历史反馈列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getHistoryFeedbacks(@Req() req: Request) {
    return this.svc.getHistoryFeedbacks(req.user.id);
  }

  @Post("feedback")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交意见反馈" })
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  submitFeedback(@Req() req: Request, @Body() dto: SubmitFeedbackDto) {
    return this.svc.submitFeedback(req.user.id, dto);
  }

  // ══════════════════ 管理端（任务包 A · 反馈处理闭环） ══════════════════
  //
  // 权限分三档（《轻量反馈方案》§1.1）：
  //  - 列表 / 详情 / 状态流转：SUPER_ADMIN、OPERATION_ADMIN、CUSTOMER_SERVICE
  //  - 查看明文联系方式 / 正文原文：同上三个角色；截图仅 SUPER_ADMIN、OPERATION_ADMIN
  //  - 三类敏感查看都必须**独立调用 + 审计留痕 + 独立限流**
  //  - 导出：仅 SUPER_ADMIN（与 CRM「禁导出防数据贩卖」同口径），本批不实现，先不开口子
  //
  // 「谁在什么时候做了什么」由 @Auditable 写进 AuditLog（含操作人、targetId、IP、时间），
  // 可在 views/system/OperationLogList.vue 按 targetType=FEEDBACK 查询。
  // 不在 Feedback 表里加处理人字段 —— 本任务包不改 schema。

  @Get("admin/feedback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "用户反馈列表（管理端·脱敏视图，默认排除 feed_dislike 信号）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminList(@Query() query: FeedbackListQueryDto) {
    return this.svc.adminList(query);
  }

  @Get("admin/feedback/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "用户反馈统计（按状态/类型 + 诊断编号有效率）" })
  @ApiResponse({ status: 200, description: "成功" })
  adminStats() {
    return this.svc.adminStats();
  }

  @Get("admin/feedback/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "用户反馈详情（管理端·脱敏视图）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "反馈不存在" })
  adminDetail(@Param("id") id: string) {
    return this.svc.adminDetail(id);
  }

  @Post("admin/feedback/:id/reveal-contact")
  @UseGuards(JwtAuthGuard, RolesGuard, SensitiveRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @Auditable({ action: "查看反馈联系方式", targetType: "FEEDBACK" })
  @ApiOperation({ summary: "查看反馈联系方式明文（留痕 + 限流）" })
  @ApiResponse({ status: 200, description: "成功" })
  adminRevealContact(@Param("id") id: string) {
    return this.svc.adminRevealContact(id);
  }

  @Post("admin/feedback/:id/reveal-content")
  @UseGuards(JwtAuthGuard, RolesGuard, SensitiveRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @Auditable({ action: "查看反馈正文原文", targetType: "FEEDBACK" })
  @ApiOperation({ summary: "查看反馈正文原文（留痕 + 限流）" })
  @ApiResponse({ status: 200, description: "成功" })
  adminRevealContent(@Param("id") id: string) {
    return this.svc.adminRevealContent(id);
  }

  @Post("admin/feedback/:id/reveal-images")
  @UseGuards(JwtAuthGuard, RolesGuard, SensitiveRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @Auditable({ action: "查看反馈截图", targetType: "FEEDBACK" })
  @ApiOperation({ summary: "查看反馈截图（留痕 + 限流）" })
  @ApiResponse({ status: 200, description: "成功" })
  adminRevealImages(@Param("id") id: string) {
    return this.svc.adminRevealImages(id);
  }

  @Put("admin/feedback/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  @Auditable({ action: "反馈状态流转", targetType: "FEEDBACK" })
  @ApiOperation({ summary: "流转反馈状态（结案必须填处理结果）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 400, description: "结案未填结果 / 状态已被他人变更" })
  adminUpdateStatus(@Param("id") id: string, @Body() dto: UpdateFeedbackStatusDto) {
    return this.svc.adminUpdateStatus(id, dto);
  }
}
