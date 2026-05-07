import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CommissionService } from "./commission.service";
import { ConfigUpdateDto, WithdrawalApplyDto, WithdrawalAuditDto, CreateReferralDto } from "./commission.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("分佣")
@Controller("commission")
export class CommissionController {
  constructor(private svc: CommissionService) {}

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
  getStationEarnings(
    @Param("stationId") stationId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getStationEarnings(stationId, +page, +pageSize);
  }

  @Get("station-balance/:stationId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取分站余额" })
  @ApiBearerAuth()
  getStationBalance(@Param("stationId") stationId: string) {
    return this.svc.getStationBalance(stationId);
  }

  // ───────── 提现 ─────────

  @Post("withdrawal")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请提现" })
  @ApiBearerAuth()
  applyWithdrawal(@Req() req: any, @Body() dto: WithdrawalApplyDto) {
    return this.svc.applyWithdrawal(req.user.id, dto);
  }

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查看我的提现记录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listMyWithdrawals(@Req() req: any, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  createReferralLink(@Req() req: any, @Body() dto: CreateReferralDto) {
    return this.svc.createReferralLink(req.user.id, dto);
  }

  @Get("referral-links")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取推荐链接列表" })
  @ApiBearerAuth()
  getReferralLinks(@Req() req: any) {
    return this.svc.getReferralLinks(req.user.id);
  }

  @Get("track/:code")
  @ApiOperation({ summary: "跟踪推荐链接点击" })
  trackClick(@Param("code") code: string) {
    return this.svc.trackClick(code);
  }
}
