import { Controller, Get, Param, UseGuards, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { LiveDashboardService } from "./live-dashboard.service";
import { LiveReportService } from "./live-report.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("直播间数据大屏")
@Controller("live/rooms")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveDashboardController {
  constructor(
    private readonly svc: LiveDashboardService,
    private readonly reportSvc: LiveReportService,
  ) {}

  @Get(":id/dashboard/overview")
  @ApiOperation({ summary: "直播实时概览 — 在线/峰值/累计观看/打赏/GMV/互动率" })
  getOverview(@Param("id") id: string) {
    return this.svc.getOverview(id);
  }

  @Get(":id/dashboard/trends")
  @ApiOperation({ summary: "实时趋势 — 在线人数/成交/互动 分钟级曲线" })
  getTrends(@Param("id") id: string) {
    return this.svc.getTrends(id);
  }

  @Get(":id/dashboard/products")
  @ApiOperation({ summary: "商品讲解与转化 — 各商品销量/转化" })
  getProducts(@Param("id") id: string) {
    return this.svc.getProducts(id);
  }

  @Get(":id/dashboard/interactions")
  @ApiOperation({ summary: "互动与打赏 — 评论流/打赏排行" })
  getInteractions(@Param("id") id: string) {
    return this.svc.getInteractions(id);
  }

  @Get(":id/dashboard/host-stats")
  @ApiOperation({ summary: "主播表现 — 讲解时长/商品覆盖" })
  getHostStats(@Param("id") id: string) {
    return this.svc.getHostStats(id);
  }

  @Get(":id/dashboard/audience")
  @ApiOperation({ summary: "观众画像 — 性别/年龄/地域/兴趣分布" })
  getAudience(@Param("id") id: string) {
    return this.svc.getAudience(id);
  }

  @Get(":id/report")
  @ApiOperation({ summary: "直播复盘报告 — 关键指标汇总+分钟级趋势" })
  getReport(@Param("id") id: string) {
    return this.reportSvc.getReport(id);
  }

  @Get(":id/compare")
  @ApiOperation({ summary: "直播对比 — 本场 vs 上一场关键指标" })
  getCompare(@Param("id") id: string) {
    return this.reportSvc.getCompare(id);
  }

  @Get(":id/report/export")
  @ApiOperation({ summary: "导出直播报告 — JSON格式输出" })
  @ApiQuery({ name: "format", required: false, type: String, enum: ["json", "csv"] })
  async exportReport(@Param("id") id: string, @Query("format") format: string = "json", @Res() res: Response) {
    const report = await this.reportSvc.getReport(id);

    if (format === "csv") {
      const headers = "指标,数值\n";
      const rows = Object.entries(report.summary)
        .map(([k, v]) => `${k},${v}`)
        .join("\n");
      const csv = "﻿" + headers + rows;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="live-report-${id}.csv"`);
      return res.send(csv);
    }

    return res.json(report);
  }
}
