import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from "@nestjs/swagger";
import { Request } from "express";
import { CommissionService } from "./commission.service";
import { ConfigUpdateDto, WithdrawalApplyDto, WithdrawalAuditDto, CreateReferralDto, CommissionRateDto } from "./commission.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("分佣")
@Controller("commission")
export class CommissionController {
  constructor(
    private svc: CommissionService,
    private prisma: PrismaService,
  ) {}

  // ───────── 配置管理（管理员） ─────────

  @Get("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有分佣配置" })
  @ApiBearerAuth()
  getAllConfigs() {
    return this.svc.getAllConfigs();
  }

  @Put("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新分佣配置" })
  @ApiBearerAuth()
  updateConfig(@Param("key") key: string, @Body() dto: ConfigUpdateDto) {
    return this.svc.updateConfig(key, dto);
  }

  // ───────── 分站收益 ─────────

  @Get("station-earnings/:stationId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取分站收益" })
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
  @ApiBearerAuth()
  async getStationBalance(@Req() req: Request, @Param("stationId") stationId: string) {
    await this.verifyStationAccess(stationId, req);
    return this.svc.getStationBalance(stationId);
  }

  // ───────── 运营商收益 ─────────

  @Get("operator-earnings/:operatorId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取运营商收益明细" })
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
  @ApiBearerAuth()
  applyWithdrawal(@Req() req: Request, @Body() dto: WithdrawalApplyDto) {
    return this.svc.applyWithdrawal(req.user.id, dto);
  }

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查看我的提现记录" })
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
  @UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核提现（管理员）" })
  @ApiBearerAuth()
  auditWithdrawal(@Param("id") id: string, @Body() dto: WithdrawalAuditDto) {
    return this.svc.auditWithdrawal(id, dto);
  }

  // ───────── 推荐链接 ─────────

  @Post("referral-link")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建推荐链接" })
  @ApiBearerAuth()
  createReferralLink(@Req() req: Request, @Body() dto: CreateReferralDto) {
    return this.svc.createReferralLink(req.user.id, dto);
  }

  @Get("referral-links")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取推荐链接列表" })
  @ApiBearerAuth()
  getReferralLinks(@Req() req: Request) {
    return this.svc.getReferralLinks(req.user.id);
  }

  @Get("track/:code")
  @ApiOperation({ summary: "跟踪推荐链接点击" })
  trackClick(@Param("code") code: string) {
    return this.svc.trackClick(code);
  }

  // ───────── 新增：分佣配置快捷管理 ─────────

  @Get("config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取分佣配置总览" })
  @ApiBearerAuth()
  getCommissionConfig() {
    return this.svc.getCommissionConfig();
  }

  @Put("config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新分佣配置比例" })
  @ApiBearerAuth()
  @ApiBody({ schema: { properties: { type: { type: "string" }, rate: { type: "number" } } } })
  updateCommissionConfig(@Body() dto: CommissionRateDto) {
    return this.svc.updateCommissionConfig(dto.type, dto.rate);
  }

  // ───────── 平台抽成管理（管理员） ─────────

  @Get("platform-fee/summary")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台抽成汇总" })
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
  @ApiBearerAuth()
  async getCircleRevenueSummary(@Req() req: Request, @Param("circleId") circleId: string) {
    await this.verifyCircleAccess(circleId, req);
    return this.svc.getCircleRevenueSummary(circleId);
  }

  @Get("circle-revenue/:circleId/records")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "圈主收益明细" })
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
