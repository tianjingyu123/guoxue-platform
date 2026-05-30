import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { RevenueService } from "./revenue.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("收益分账")
@ApiBearerAuth()
@Controller("revenue")
export class RevenueController {
  constructor(private svc: RevenueService) {}

  @Get("summary")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的收益汇总" })
  summary(@Req() req: Request) {
    return this.svc.getUserSummary(req.user.id);
  }

  @Get("earnings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的收益明细" })
  earnings(@Req() req: Request, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.svc.getUserEarnings(req.user.id, +page, +pageSize);
  }

  // ───────── 平台管理 ─────────

  @Get("platform/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台营收总览（管理员）" })
  platformOverview() {
    return this.svc.getPlatformOverview();
  }

  @Get("platform/trends")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台营收趋势（管理员）" })
  @ApiQuery({ name: "days", required: false, type: Number })
  platformTrends(@Query("days") days = "30") {
    return this.svc.getRevenueTrends(+days);
  }

  // ───────── 新增：收入统计（管理员）─────────

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "收入统计（管理员，可选平台级）" })
  @ApiQuery({ name: "userId", required: false, type: String, description: "用户ID（不传则平台级）" })
  @ApiQuery({ name: "startDate", required: false, type: String, description: "开始日期" })
  @ApiQuery({ name: "endDate", required: false, type: String, description: "结束日期" })
  @ApiQuery({ name: "days", required: false, type: Number, description: "近N天" })
  revenueStats(
    @Query("userId") userId?: string,
    @Query("period") period?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("days") days?: string,
  ) {
    return this.svc.getRevenueStats(userId, period, startDate, endDate, days ? +days : undefined);
  }

  @Get("breakdown")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "收入分类明细（管理员，可选平台级）" })
  @ApiQuery({ name: "userId", required: false, type: String, description: "用户ID（不传则平台级）" })
  @ApiQuery({ name: "startDate", required: false, type: String, description: "开始日期" })
  @ApiQuery({ name: "endDate", required: false, type: String, description: "结束日期" })
  revenueBreakdown(
    @Query("userId") userId?: string,
    @Query("period") period?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.svc.getRevenueBreakdown(userId, period, startDate, endDate);
  }
}
