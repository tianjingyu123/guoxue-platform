import { Controller, Get, Post, Query, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { CollaborationService } from "./collaboration.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("🤖 人机协作协议")
@Controller("ai/collaborations")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}

  @Post()
  @ApiOperation({ summary: "AI发起协作建议" })
  async propose(
    @Body()
    body: {
      type: string;
      title: string;
      description: string;
      proposedBy: string;
      confidence: number;
      impactScope: Record<string, unknown>;
      alternatives?: Array<{ option: string; description: string; score: number }>;
      riskLevel: "low" | "medium" | "high";
      executionPlan: Record<string, unknown>;
      rollbackPlan?: Record<string, unknown>;
    },
  ) {
    const id = await this.collaboration.propose(body);
    return { proposalId: id };
  }

  @Post(":id/review")
  @ApiOperation({ summary: "人工审核建议" })
  async review(
    @Param("id") id: string,
    @Body()
    body: {
      action: "approved" | "rejected" | "modified";
      reviewer?: string;
      modifications?: Record<string, unknown>;
      note?: string;
    },
  ) {
    await this.collaboration.review(
      id,
      body.action,
      body.reviewer || "admin",
      body.modifications as any,
      body.note,
    );
    return { success: true };
  }

  @Post(":id/execute")
  @ApiOperation({ summary: "执行已批准的建议" })
  async execute(
    @Param("id") id: string,
    @Body() body?: { executor?: string },
  ) {
    await this.collaboration.execute(id, body?.executor || "admin");
    return { success: true };
  }

  @Post(":id/rollback")
  @ApiOperation({ summary: "回滚已执行的建议" })
  async rollback(
    @Param("id") id: string,
    @Body() body?: { operator?: string; reason?: string },
  ) {
    await this.collaboration.rollback(id, body?.operator || body?.reason || "admin");
    return { success: true };
  }

  @Post(":id/feedback")
  @ApiOperation({ summary: "记录反馈评分" })
  async feedback(
    @Param("id") id: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    await this.collaboration.feedback(id, body.rating, body.comment);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: "查询协作列表" })
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
  async getPendingReviews() {
    return this.collaboration.getPendingReviews();
  }

  @Get("overview")
  @ApiOperation({ summary: "协作概览统计" })
  async getOverview() {
    return this.collaboration.getOverview();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取协作详情" })
  async getDetail(@Param("id") id: string) {
    return this.collaboration.getDetail(id);
  }
}
