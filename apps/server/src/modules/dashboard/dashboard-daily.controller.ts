import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { DashboardDailyService } from "./dashboard-daily.service";
import { FunnelDailyService } from "./funnel-daily.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

/**
 * 运营看板（看-P1）：天级聚合序列 + 今日实时轻查 + 手动重算
 * 序列查询只打 DashboardDaily 聚合表，永不打原始大表
 */
@ApiTags("运营看板")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardDailyController {
  constructor(
    private readonly svc: DashboardDailyService,
    private readonly funnel: FunnelDailyService,
  ) {}

  @Get("funnel")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "转化漏斗近 N 日序列（F1_activation/F2_member/F3_commerce/F4_practitioner）" })
  @ApiQuery({ name: "funnel", required: true, description: "漏斗键" })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getFunnel(@Query("funnel") funnel: string, @Query("days") days?: string) {
    return this.funnel.series(funnel, days ? Number(days) : 14);
  }

  @Post("funnel/rebuild")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "手动重算某日漏斗聚合（默认昨日·upsert 幂等）" })
  @ApiQuery({ name: "date", required: false, description: "YYYY-MM-DD，缺省为昨日" })
  @ApiResponse({ status: 201, description: "重算成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async rebuildFunnel(@Query("date") date?: string) {
    const d = date || this.funnel.dateStrShanghai(-1);
    await this.funnel.rebuildDate(d);
    return { ok: true, date: d };
  }

  @Get("daily")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "近 N 日天级聚合序列（默认30·最大90）" })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getDaily(@Query("days") days?: string) {
    return this.svc.getDaily(days ? Number(days) : 30);
  }

  @Get("today")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "今日实时轻查（dau/pv/支付订单数·直查不落表）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getToday() {
    return this.svc.getToday();
  }

  @Post("rebuild")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiOperation({ summary: "手动重算某日聚合（默认昨日·upsert 幂等）" })
  @ApiQuery({ name: "date", required: false, description: "YYYY-MM-DD，缺省为昨日" })
  @ApiResponse({ status: 201, description: "重算成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  rebuild(@Query("date") date?: string) {
    return this.svc.rebuildDate(date || this.svc.dateStrShanghai(-1));
  }
}
