import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("仪表盘")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "获取统计数据" })
  getStats() {
    return this.svc.getStats();
  }

  @Get("trends")
  @ApiOperation({ summary: "获取趋势数据" })
  getTrends() {
    return this.svc.getTrends();
  }

  @Get("charts")
  @ApiOperation({ summary: "获取图表数据" })
  getCharts() {
    return this.svc.getCharts();
  }
}
