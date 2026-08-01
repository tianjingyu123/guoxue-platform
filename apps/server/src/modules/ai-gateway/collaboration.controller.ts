import { Controller, Get, Post, Query, Body, Param, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { CollaborationService } from "./collaboration.service";
import {
  ProposeCollaborationDto,
  ReviewCollaborationDto,
  RollbackCollaborationDto,
  FeedbackCollaborationDto,
} from "./dto/ai-infra.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; roles: string[]; [key: string]: unknown };
};

@ApiTags("🤖 人机协作协议")
@Controller("ai/collaborations")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}

  @Post()
  @ApiOperation({ summary: "AI发起协作建议" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async propose(@Req() req: AuthRequest, @Body() body: ProposeCollaborationDto) {
    // proposedBy 从登录态注入，禁止前端伪造操作人
    const id = await this.collaboration.propose({
      ...body,
      proposedBy: req.user.id,
    });
    return { proposalId: id };
  }

  @Post(":id/review")
  @ApiOperation({ summary: "人工审核建议" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async review(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() body: ReviewCollaborationDto,
  ) {
    // reviewer 从登录态注入
    await this.collaboration.review(
      id,
      body.action,
      req.user.id,
      body.modifications as any,
      body.note,
    );
    return { success: true };
  }

  @Post(":id/execute")
  @ApiOperation({ summary: "执行已批准的建议" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async execute(@Param("id") id: string, @Req() req: AuthRequest) {
    // executor 从登录态注入
    await this.collaboration.execute(id, req.user.id);
    return { success: true };
  }

  @Post(":id/rollback")
  @ApiOperation({ summary: "回滚已执行的建议" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async rollback(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() _body?: RollbackCollaborationDto,
  ) {
    // operator 从登录态注入
    await this.collaboration.rollback(id, req.user.id);
    return { success: true };
  }

  @Post(":id/feedback")
  @ApiOperation({ summary: "记录反馈评分" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async feedback(
    @Param("id") id: string,
    @Body() body: FeedbackCollaborationDto,
  ) {
    await this.collaboration.feedback(id, body.rating, body.comment);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: "查询协作列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "riskLevel", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "proposedBy", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async query(
    @Query("status") status?: string,
    @Query("riskLevel") riskLevel?: string,
    @Query("type") type?: string,
    @Query("proposedBy") proposedBy?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.collaboration.query({
      status,
      riskLevel,
      type,
      proposedBy,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("pending")
  @ApiOperation({ summary: "获取待审核列表" })
  @ApiResponse({ status: 200, description: "成功" })
  async getPendingReviews() {
    return this.collaboration.getPendingReviews();
  }

  @Get("overview")
  @ApiOperation({ summary: "协作概览统计" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview() {
    return this.collaboration.getOverview();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取协作详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async getDetail(@Param("id") id: string) {
    return this.collaboration.getDetail(id);
  }
}
