import { Controller, Get, Post, Param, Req, UseGuards, Body, Query, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { MemberService } from "./member.service";
import { SystemService } from "../system/system.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { GrantMemberDto } from "./member.dto";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";

@ApiTags("会员")
@Controller("member")
export class MemberController {
  private readonly logger = new Logger(MemberController.name);
  constructor(
    private readonly memberService: MemberService,
    private readonly systemService: SystemService,
  ) {}

  @Get("plans")
  @ApiOperation({ summary: "获取会员套餐列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getPlans() {
    return this.memberService.getPlans();
  }

  @Post("purchase/:planId")
  @UseGuards(JwtAuthGuard, FeatureFlagGuard, StrictRedisThrottleGuard)
  @RequireFeature("member_purchase")
  @ApiBearerAuth()
  @ApiOperation({ summary: "【已停用】购买会员 — 已升级为在线支付订单链路" })
  @ApiResponse({ status: 400, description: "端点已停用" })
  purchase(@Req() _req: Request, @Param("planId") _planId: string) {
    // 资金安全（2026-07-03 修复）：本端点不校验支付即直接开通会员（免费开终身漏洞），已废弃。
    // 正规链路 = POST /shop/orders(type=MEMBER, targetId=planId) → 在线支付 → 回调 processMemberPaid 开通。
    throw new BusinessException(ErrorCode.BAD_REQUEST, "会员开通已升级为在线支付：请在会员页选择套餐并完成支付");
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询我的会员状态" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getStatus(@Req() req: Request) {
    return this.memberService.getStatus(req.user.id);
  }

  @Post("renew/:planId")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "【已停用】续费会员 — 已升级为在线支付订单链路" })
  @ApiResponse({ status: 400, description: "端点已停用" })
  renew(@Req() _req: Request, @Param("planId") _planId: string) {
    // 资金安全（2026-07-03 修复）：与 purchase 同因废弃（不校验支付即续期）。续费同走订单支付链路。
    throw new BusinessException(ErrorCode.BAD_REQUEST, "会员续费已升级为在线支付：请在会员页选择套餐并完成支付");
  }

  @Get("benefits")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取当前会员权益" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getBenefits(@Req() req: Request) {
    return this.memberService.getBenefits(req.user.id);
  }

  // ───────── 管理员端点 ─────────

  @Get("admin/purchases")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理员查看会员购买记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getAdminPurchases(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.memberService.getAdminPurchases(+page, +pageSize);
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "会员统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getMemberStats() {
    return this.memberService.getMemberStats();
  }

  @Post("admin/grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "手动授予会员" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async grantMember(@Body() dto: GrantMemberDto, @Req() req: Request) {
    const result = await this.memberService.grantMember(dto.userId, dto.level, dto.durationDays ?? 30);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "GRANT_MEMBER",
      targetType: "MEMBER",
      targetId: dto.userId,
      detail: `管理员授予用户 ${dto.userId} 会员 ${dto.level}（${dto.durationDays ?? 30}天）`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志写入失败", err));
    return result;
  }

  @Post("admin/revoke/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "撤销用户会员" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async revokeMember(@Param("userId") userId: string, @Req() req: Request) {
    const result = await this.memberService.revokeMember(userId);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "REVOKE_MEMBER",
      targetType: "MEMBER",
      targetId: userId,
      detail: `管理员撤销用户 ${userId} 会员`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志写入失败", err));
    return result;
  }
}
