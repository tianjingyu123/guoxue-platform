import { Controller, Post, Get, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { KnowledgeSyncService } from "./knowledge-sync.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("圈主助理知识库同步")
@ApiBearerAuth()
@Controller("circle-knowledge")
@UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
export class KnowledgeSyncController {
  constructor(private readonly syncService: KnowledgeSyncService) {}

  @Post("sync/:circleId")
  @ApiOperation({ summary: "同步指定圈子的知识库" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async syncCircle(@Param("circleId") circleId: string) {
    const synced = await this.syncService.syncCircleKnowledge(circleId);
    return { circleId, syncedCount: synced };
  }

  @Post("sync-all")
  @ApiOperation({ summary: "全量同步所有圈子知识库" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async syncAll() {
    await this.syncService.autoSyncAll();
    return { message: "全量同步已触发" };
  }

  @Post("add")
  @ApiOperation({ summary: "手动添加内容到知识库（圈主操作）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async addToKnowledge(
    @Body()
    body: {
      circleId: string;
      userId: string;
      targetType: "post" | "article";
      targetId: string;
    },
  ) {
    return this.syncService.manuallyAddToKnowledge(
      body.circleId,
      body.userId,
      body.targetType,
      body.targetId,
    );
  }

  @Post("remove/:knowledgeId")
  @ApiOperation({ summary: "从知识库移除内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async removeFromKnowledge(
    @Param("knowledgeId") knowledgeId: string,
    @Body() body: { circleId: string; userId: string },
  ) {
    return this.syncService.removeFromKnowledge(body.circleId, body.userId, knowledgeId);
  }

  @Get("candidates/:circleId")
  @ApiOperation({ summary: "获取候选内容列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false })
  async getCandidates(
    @Param("circleId") circleId: string,
    @Query("status") status?: string,
  ) {
    return this.syncService.getCandidates(circleId, status as any);
  }

  @Post("candidates/:candidateId/confirm")
  @ApiOperation({ summary: "确认候选内容加入知识库" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async confirmCandidate(@Param("candidateId") candidateId: string) {
    return this.syncService.confirmCandidate(candidateId);
  }

  @Post("candidates/:candidateId/reject")
  @ApiOperation({ summary: "拒绝候选内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async rejectCandidate(@Param("candidateId") candidateId: string) {
    return this.syncService.rejectCandidate(candidateId);
  }
}
