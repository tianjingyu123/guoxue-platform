import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { CircleDashboardService } from "./circle-dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("圈主仪表盘")
@Controller("circles")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CircleDashboardController {
  constructor(private readonly svc: CircleDashboardService) {}

  @Get(":id/dashboard/overview")
  @ApiOperation({ summary: "圈主概览 — 成员数/本月新增/收入/互动率" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getOverview(@Param("id") id: string) {
    return this.svc.getOverview(id);
  }

  @Get(":id/dashboard/trends")
  @ApiOperation({ summary: "成员增长+收入趋势（近30天）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getTrends(@Param("id") id: string) {
    return this.svc.getTrends(id);
  }

  @Get(":id/dashboard/revenue-breakdown")
  @ApiOperation({ summary: "收入来源占比（入圈费/课程/商品/问答）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRevenueBreakdown(@Param("id") id: string) {
    return this.svc.getRevenueBreakdown(id);
  }

  @Get(":id/dashboard/top-contributors")
  @ApiOperation({ summary: "活跃成员贡献榜 Top10" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getTopContributors(@Param("id") id: string) {
    return this.svc.getTopContributors(id);
  }

  @Get(":id/dashboard/hot-content")
  @ApiOperation({ summary: "热门内容 Top5" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getHotContent(@Param("id") id: string) {
    return this.svc.getHotContent(id);
  }

  @Get(":id/dashboard/recent-members")
  @ApiOperation({ summary: "最近加入成员" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRecentMembers(@Param("id") id: string) {
    return this.svc.getRecentMembers(id);
  }

  @Get(":id/dashboard/churn-warning")
  @ApiOperation({ summary: "成员流失预警（近14天不活跃）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getChurnWarning(@Param("id") id: string) {
    return this.svc.getChurnWarning(id);
  }

  @Get(":id/dashboard/pending-questions")
  @ApiOperation({ summary: "待回复付费提问" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getPendingQuestions(@Param("id") id: string) {
    return this.svc.getPendingQuestions(id);
  }

  @Get(":id/dashboard/knowledge-candidates")
  @ApiOperation({ summary: "待确认知识库候选" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getKnowledgeCandidates(@Param("id") id: string) {
    return this.svc.getKnowledgeCandidates(id);
  }
}
