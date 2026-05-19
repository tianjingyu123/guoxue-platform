import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Response } from "express";
import { MetricsService } from "../../common/metrics.service";
import { AiInsightService } from "./ai-insight.service";

@ApiTags("可观测性")
@Controller("metrics")
export class MetricsController {
  constructor(
    private metrics: MetricsService,
    private insight: AiInsightService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Prometheus 指标采集端点" })
  async getMetrics(@Res() res: Response) {
    res.setHeader("Content-Type", this.metrics.contentType());
    res.send(await this.metrics.metrics());
  }

  // ── AI 数据飞轮看板 ──
  @Get("flywheel/overview")
  @ApiOperation({ summary: "AI 数据飞轮总览" })
  getFlywheelOverview() {
    return this.insight.getFlywheelOverview();
  }

  @Get("flywheel/quality-trend")
  @ApiOperation({ summary: "AI 质量趋势（近N天）" })
  @ApiQuery({ name: "days", required: false, type: Number, description: "天数，默认7" })
  getQualityTrend(@Query("days") days = 7) {
    return this.insight.getQualityTrend(+days);
  }

  @Get("flywheel/cache-stats")
  @ApiOperation({ summary: "语义缓存统计" })
  getCacheStats() {
    return this.insight.getCacheStats();
  }
}
