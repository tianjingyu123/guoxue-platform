import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { MetricsService } from "../../common/metrics.service";
import { AiInsightService } from "./ai-insight.service";
import { SkipFormat } from "../../common/skip-format.decorator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ThrottleGuard } from "../../common/throttle.guard";

@ApiTags("可观测性")
@Controller("metrics")
export class MetricsController {
  constructor(
    private metrics: MetricsService,
    private insight: AiInsightService,
  ) {}

  @Get()
  @SkipFormat()
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "Prometheus 指标采集端点（限流保护）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getMetrics(@Res() res: Response) {
    res.setHeader("Content-Type", this.metrics.contentType());
    res.send(await this.metrics.metrics());
  }

  // ── AI 数据飞轮看板（仅管理员可访问） ──
  @Get("flywheel/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "AI 数据飞轮总览（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getFlywheelOverview() {
    return this.insight.getFlywheelOverview();
  }

  @Get("flywheel/quality-trend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "AI 质量趋势（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "days", required: false, type: Number, description: "天数，默认7" })
  getQualityTrend(@Query("days") days = 7) {
    return this.insight.getQualityTrend(+days);
  }

  @Get("flywheel/cache-stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "语义缓存统计（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  getCacheStats() {
    return this.insight.getCacheStats();
  }
}
