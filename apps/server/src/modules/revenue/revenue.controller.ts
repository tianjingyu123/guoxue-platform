import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  summary(@Req() req: Request) {
    return this.svc.getUserSummary(req.user.id);
  }

  @Get("earnings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的收益明细" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  earnings(@Req() req: Request, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.svc.getUserEarnings(req.user.id, +page, +pageSize);
  }

  // ───────── 平台管理 ─────────

  @Get("platform/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "平台营收总览（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  platformOverview() {
    return this.svc.getPlatformOverview();
  }

  @Get("platform/trends")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "平台营收趋势（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "days", required: false, description: "近N天数字，或 month（本月至今）/ year（本年至今）" })
  platformTrends(@Query("days") days = "30") {
    return this.svc.getRevenueTrends(RevenueController.parseTrendDays(days));
  }

  /**
   * days 三态解析：数字 | "month" | "year"。
   * 此前 `+days` 对 "month"/"year" 得 NaN → startDate 变 Invalid Date → 趋势查询整段坏掉。
   */
  private static parseTrendDays(raw: string): number {
    const v = String(raw ?? "").trim().toLowerCase();
    const now = new Date();
    if (v === "month") {
      // 本月 1 日至今
      return Math.max(now.getDate() - 1, 1);
    }
    if (v === "year") {
      // 本年 1 月 1 日至今
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return Math.max(Math.floor((now.getTime() - yearStart.getTime()) / 86400000), 1);
    }
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n <= 0) return 30;
    return Math.min(n, 366); // 上限防全表逐日聚合被撑爆
  }

  // ───────── 新增：收入统计（管理员）─────────

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "收入统计（管理员，可选平台级）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "收入分类明细（管理员，可选平台级）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
