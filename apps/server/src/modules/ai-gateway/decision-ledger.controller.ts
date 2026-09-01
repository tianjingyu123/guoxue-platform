import { Controller, Get, Post, Query, Body, Param, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { DecisionLedgerService } from "./decision-ledger.service";
import { ReviewDecisionDto, RecordOutcomeDto } from "./dto/ai-infra.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; roles: string[]; [key: string]: unknown };
};

@ApiTags("🤖 AI决策记录与回溯")
@Controller("ai/decisions")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class DecisionLedgerController {
  constructor(private readonly ledger: DecisionLedgerService) {}

  @Post(":id/review")
  @RedLineGate(RedLine.COMPLIANCE)
  @ApiOperation({ summary: "人工审核决策" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async review(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() dto: ReviewDecisionDto,
  ) {
    // reviewer 从登录态注入，禁止前端伪造审核人
    await this.ledger.reviewDecision(id, dto.action, req.user.id, dto.note);
    return { success: true };
  }

  @Post(":id/outcome")
  @ApiOperation({ summary: "记录决策效果" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @Roles("SUPER_ADMIN")
  async recordOutcome(@Param("id") id: string, @Body() body: RecordOutcomeDto, @Req() req: AuthRequest) {
    await this.ledger.recordOutcome(
      id,
      body.metric,
      body.expectedValue,
      body.actualValue,
      req.user.id,
    );
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: "查询决策历史" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "agentId", required: false })
  @ApiQuery({ name: "capabilityId", required: false })
  @ApiQuery({ name: "riskLevel", required: false })
  @ApiQuery({ name: "humanAction", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async query(
    @Query("agentId") agentId?: string,
    @Query("capabilityId") capabilityId?: string,
    @Query("riskLevel") riskLevel?: string,
    @Query("humanAction") humanAction?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.ledger.query({
      agentId,
      capabilityId,
      riskLevel,
      humanAction,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get("overview")
  @ApiOperation({ summary: "决策概览统计" })
  @ApiResponse({ status: 200, description: "成功" })
  async getOverview() {
    return this.ledger.getOverview();
  }

  @Get("trace/:id")
  @ApiOperation({ summary: "获取决策完整追溯链" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async getTrace(@Param("id") id: string) {
    return this.ledger.getTrace(id);
  }

  @Get("retrospective/:id")
  @ApiOperation({ summary: "决策复盘分析" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async retrospective(@Param("id") id: string) {
    return this.ledger.retrospective(id);
  }

  @Get("compare")
  @ApiOperation({ summary: "模型版本对比" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "modelA", required: true })
  @ApiQuery({ name: "modelB", required: true })
  @ApiQuery({ name: "agentId", required: true })
  async compareModels(
    @Query("modelA") modelA: string,
    @Query("modelB") modelB: string,
    @Query("agentId") agentId: string,
  ) {
    return this.ledger.compareModels(modelA, modelB, agentId);
  }
}
