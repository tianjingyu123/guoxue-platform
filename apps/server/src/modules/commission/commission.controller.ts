import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { CommissionService } from "./commission.service";
import { ConfigUpdateDto, WithdrawalApplyDto, WithdrawalAuditDto, CreateReferralDto } from "./commission.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("commission")
export class CommissionController {
  constructor(private svc: CommissionService) {}

  // ───────── 配置管理（管理员） ─────────

  @Get("configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  getAllConfigs() {
    return this.svc.getAllConfigs();
  }

  @Put("configs/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  updateConfig(@Param("key") key: string, @Body() dto: ConfigUpdateDto) {
    return this.svc.updateConfig(key, dto);
  }

  // ───────── 分站收益 ─────────

  @Get("station-earnings/:stationId")
  getStationEarnings(
    @Param("stationId") stationId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getStationEarnings(stationId, +page, +pageSize);
  }

  @Get("station-balance/:stationId")
  getStationBalance(@Param("stationId") stationId: string) {
    return this.svc.getStationBalance(stationId);
  }

  // ───────── 提现 ─────────

  @Post("withdrawal")
  @UseGuards(JwtAuthGuard)
  applyWithdrawal(@Req() req: any, @Body() dto: WithdrawalApplyDto) {
    return this.svc.applyWithdrawal(req.user.id, dto);
  }

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard)
  listMyWithdrawals(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getUserWithdrawals(req.user.id, +page, +pageSize);
  }

  @Get("admin/withdrawals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listAllWithdrawals(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("status") status?: string,
  ) {
    return this.svc.listWithdrawals(+page, +pageSize, status);
  }

  @Put("admin/withdrawals/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  auditWithdrawal(@Param("id") id: string, @Body() dto: WithdrawalAuditDto) {
    return this.svc.auditWithdrawal(id, dto);
  }

  // ───────── 推荐链接 ─────────

  @Post("referral-link")
  @UseGuards(JwtAuthGuard)
  createReferralLink(@Req() req: any, @Body() dto: CreateReferralDto) {
    return this.svc.createReferralLink(req.user.id, dto);
  }

  @Get("referral-links")
  @UseGuards(JwtAuthGuard)
  getReferralLinks(@Req() req: any) {
    return this.svc.getReferralLinks(req.user.id);
  }

  @Get("track/:code")
  trackClick(@Param("code") code: string) {
    return this.svc.trackClick(code);
  }
}
