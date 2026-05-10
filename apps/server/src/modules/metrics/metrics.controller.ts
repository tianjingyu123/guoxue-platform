import { Controller, Get, Res } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { MetricsService } from "../../common/metrics.service";

@ApiTags("可观测性")
@Controller("metrics")
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get()
  @ApiOperation({ summary: "Prometheus 指标采集端点" })
  async getMetrics(@Res() res: Response) {
    res.setHeader("Content-Type", this.metrics.contentType());
    res.send(await this.metrics.metrics());
  }
}
