import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { CommissionService } from "./commission.service";
import { ChannelClickService } from "./channel-click.service";
import { ConfigUpdateDto, WithdrawalApplyDto, WithdrawalAuditDto, ConfirmPayoutDto, CreateReferralDto, CommissionRateDto, ChannelClickDto } from "./commission.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RedisThrottleGuard, StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("分佣")
@Controller("commission")
export class CommissionController {
  constructor(
    private svc: CommissionService,
    private channelClick: ChannelClickService,
    private prisma: PrismaService,
  ) {}

  // ───────── 配置管理（管理员） ─────────

  @Get("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有分佣配置" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getAllConfigs() {
    return this.svc.getAllConfigs();
  }

  @Put("configs/:key")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "发起分佣比例变更审批", targetType: "COMMISSION_CONFIG" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新分佣配置（提交审批，待财务审批后生效）" })
  @ApiResponse({ status: 200, description: "已提交审批" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateConfig(@Param("key") key: string, @Body() dto: ConfigUpdateDto, @Req() req: Request) {
    return this.svc.requestConfigChange(key, dto, req.user.id);
  }

  // ───────── 分站收益 ─────────

  @Get("station-earnings/:stationId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取分站收益" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  async getStationEarnings(
    @Req() req: Request,
    @Param("stationId") stationId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    await this.verifyStationAccess(stationId, req);
    return this.svc.getStationEarnings(stationId, +page, +pageSize);
  }

  @Get("station-balance/:stationId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取分站余额" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async getStationBalance(@Req() req: Request, @Param("stationId") stationId: string) {
    await this.verifyStationAccess(stationId, req);
    return this.svc.getStationBalance(stationId);
  }

  @Get("station/preempted")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "站长\"被临时抢佣\"透明化明细（佣-V2-P4·永久归属我分站但被临时链接抢佣的订单·orderId打码·不暴露抢佣者身份）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "非站长" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getStationPreempted(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getStationPreemptedOrders(req.user.id, +page, +pageSize);
  }

  // ───────── 运营商收益 ─────────

  @Get("operator-earnings/:operatorId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取运营商收益明细" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async getOperatorEarnings(
    @Req() req: Request,
    @Param("operatorId") operatorId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    await this.verifyOperatorAccess(operatorId, req);
    return this.svc.getOperatorEarnings(operatorId, +page, +pageSize);
  }

  @Get("operator-balance/:operatorId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取运营商余额" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async getOperatorBalance(@Req() req: Request, @Param("operatorId") operatorId: string) {
    await this.verifyOperatorAccess(operatorId, req);
    return this.svc.getOperatorBalance(operatorId);
  }

  // ───────── 提现 ─────────

  @Post("withdrawal")
  @UseGuards(JwtAuthGuard, ActiveUserGuard, FeatureFlagGuard, StrictRedisThrottleGuard)
  @RequireFeature("commission_withdrawal")
  @ApiOperation({ summary: "申请提现" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  applyWithdrawal(@Req() req: Request, @Body() dto: WithdrawalApplyDto) {
    return this.svc.applyWithdrawal(req.user.id, dto);
  }

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查看我的提现记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listMyWithdrawals(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserWithdrawals(req.user.id, +page, +pageSize);
  }

  @Get("admin/withdrawals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看所有提现记录（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "status", required: false, type: String, description: "提现状态过滤" })
  listAllWithdrawals(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("status") status?: string,
  ) {
    return this.svc.listWithdrawals(+page, +pageSize, status);
  }

  @Put("admin/withdrawals/:id")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "提现审核", targetType: "WITHDRAWAL" })
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核提现（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  auditWithdrawal(@Param("id") id: string, @Body() dto: WithdrawalAuditDto, @Req() req: Request) {
    return this.svc.auditWithdrawal(id, dto, req.user.id);
  }

  /**
   * 打款专用：取完整收款账户（解密）。
   * 🔴 唯一会返回明文卡号的端点 —— 权限收到财务/超管，且每次调用强制写 AuditLog（谁看了哪张卡）。
   * 列表接口一律脱敏，不要为了省事去放宽那边。
   */
  @Get("admin/withdrawals/:id/payout-account")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "查看提现收款账户", targetType: "WITHDRAWAL" })
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "查看提现收款账户完整信息（打款用·强制审计留痕）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 400, description: "仅 APPROVED 状态可查看" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  revealPayoutAccount(@Param("id") id: string, @Req() req: Request) {
    return this.svc.revealPayoutAccount(id, req.user.id, req.ip);
  }

  /** 确认已线下打款（APPROVED → PAID）。payoutRef=银行/支付宝流水号，必填且唯一（出款幂等键）。 */
  @Post("admin/withdrawals/:id/payout")
  @RedLineGate(RedLine.MONEY)
  @Auditable({ action: "确认提现打款", targetType: "WITHDRAWAL" })
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "确认已打款（需提供转账流水号·幂等防重复打款）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 400, description: "状态不合法或缺流水号" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  confirmPayout(@Param("id") id: string, @Body() dto: ConfirmPayoutDto, @Req() req: Request) {
    return this.svc.confirmPayout(id, dto.payoutRef, req.user.id);
  }

  // ───────── 推荐链接 ─────────

  @Post("referral-link")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建推荐链接" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createReferralLink(@Req() req: Request, @Body() dto: CreateReferralDto) {
    return this.svc.createReferralLink(req.user.id, dto);
  }

  @Get("referral-links")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取推荐链接列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getReferralLinks(@Req() req: Request) {
    return this.svc.getReferralLinks(req.user.id);
  }

  @Get("track/:code")
  @ApiOperation({ summary: "跟踪推荐链接点击" })
  @ApiResponse({ status: 200, description: "成功" })
  trackClick(@Param("code") code: string) {
    return this.svc.trackClick(code);
  }

  // ───────── 渠道主体临时链接点击（佣-V2-P2） ─────────

  @Post("channel-click")
  @UseGuards(JwtAuthGuard, RedisThrottleGuard)
  @ApiOperation({ summary: "上报渠道主体推广链接点击（7天窗 last-click 归因·渠道资格校验失败静默 accepted:false）" })
  @ApiResponse({ status: 201, description: "成功（accepted 表示是否落库）" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  recordChannelClick(@Req() req: Request, @Body() dto: ChannelClickDto) {
    return this.channelClick.recordClick(req.user.id, dto);
  }

  // ───────── 新增：分佣配置快捷管理 ─────────

  @Get("config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取分佣配置总览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getCommissionConfig() {
    return this.svc.getCommissionConfig();
  }

  @Put("config")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新分佣配置比例" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Auditable({ action: "发起分佣比例变更审批", targetType: "COMMISSION_CONFIG" })
  @ApiBody({ schema: { properties: { type: { type: "string" }, rate: { type: "number" } } } })
  updateCommissionConfig(@Body() dto: CommissionRateDto, @Req() req: Request) {
    return this.svc.requestRateChange(dto.type, dto.rate, req.user.id);
  }

  // ───────── 平台抽成管理（管理员） ─────────

  @Get("platform-fee/summary")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台抽成汇总" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  getPlatformFeeSummary(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.svc.getPlatformFeeSummary(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ───────── 圈主收益 ─────────

  @Get("circle-revenue/:circleId/summary")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "圈主收益汇总" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async getCircleRevenueSummary(@Req() req: Request, @Param("circleId") circleId: string) {
    await this.verifyCircleAccess(circleId, req);
    return this.svc.getCircleRevenueSummary(circleId);
  }

  @Get("circle-revenue/:circleId/records")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "圈主收益明细" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async getCircleRevenueRecords(
    @Req() req: Request,
    @Param("circleId") circleId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    await this.verifyCircleAccess(circleId, req);
    return this.svc.getCircleRevenueRecords(circleId, +page, +pageSize);
  }

  private async verifyStationAccess(stationId: string, req: Request) {
    const roles: string[] = req.user?.roles ?? [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) return;
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { userId: true },
    });
    if (!station || station.userId !== req.user?.id) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该分站数据");
    }
  }

  private async verifyCircleAccess(circleId: string, req: Request) {
    const roles: string[] = req.user?.roles ?? [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) return;
    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { ownerId: true },
    });
    if (!circle || circle.ownerId !== req.user?.id) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该圈子数据");
    }
  }

  private async verifyOperatorAccess(operatorId: string, req: Request) {
    const roles: string[] = req.user?.roles ?? [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) return;
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { userId: true },
    });
    if (!operator || operator.userId !== req.user?.id) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该运营商数据");
    }
  }
}
