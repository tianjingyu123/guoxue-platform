import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
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
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getOverview(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getOverview(id, req.user.id);
  }

  @Get(":id/dashboard/trends")
  @ApiOperation({ summary: "成员增长+收入趋势（近30天）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getTrends(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getTrends(id, req.user.id);
  }

  @Get(":id/dashboard/revenue-breakdown")
  @ApiOperation({ summary: "收入来源占比（入圈费/课程/商品/问答）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRevenueBreakdown(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getRevenueBreakdown(id, req.user.id);
  }

  @Get(":id/dashboard/top-contributors")
  @ApiOperation({ summary: "活跃成员贡献榜 Top10" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getTopContributors(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getTopContributors(id, req.user.id);
  }

  @Get(":id/dashboard/hot-content")
  @ApiOperation({ summary: "热门内容 Top5" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getHotContent(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getHotContent(id, req.user.id);
  }

  @Get(":id/dashboard/recent-members")
  @ApiOperation({ summary: "最近加入成员" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRecentMembers(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getRecentMembers(id, req.user.id);
  }

  @Get(":id/dashboard/churn-warning")
  @ApiOperation({ summary: "成员流失预警（近14天不活跃）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getChurnWarning(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getChurnWarning(id, req.user.id);
  }

  @Get(":id/dashboard/pending-questions")
  @ApiOperation({ summary: "待回复付费提问" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getPendingQuestions(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getPendingQuestions(id, req.user.id);
  }

  @Get(":id/dashboard/members-insight")
  @ApiOperation({ summary: "成员洞察：本圈成员画像列表（活跃/消费/兴趣标签·智能名片）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getMembersInsight(
    @Param("id") id: string,
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getMembersInsight(id, req.user.id, +page, Math.min(50, +pageSize));
  }

  @Get(":id/dashboard/members-insight/:userId/timeline")
  @ApiOperation({ summary: "成员洞察：单个成员最近行为时间线（归属校验防越权）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据/该用户不是本圈成员" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getMemberTimeline(@Param("id") id: string, @Param("userId") userId: string, @Req() req: Request) {
    return this.svc.getMemberTimeline(id, req.user.id, userId);
  }

  @Get(":id/dashboard/knowledge-candidates")
  @ApiOperation({ summary: "待确认知识库候选" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该圈子数据" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getKnowledgeCandidates(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getKnowledgeCandidates(id, req.user.id);
  }
}
