import { Controller, Post, Get, Param, Query, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { KnowledgeSyncService } from "./knowledge-sync.service";

@ApiTags("圈主助理知识库同步")
@Controller("circle-knowledge")
export class KnowledgeSyncController {
  constructor(private readonly syncService: KnowledgeSyncService) {}

  @Post("sync/:circleId")
  @ApiOperation({ summary: "同步指定圈子的知识库" })
  async syncCircle(@Param("circleId") circleId: string) {
    const synced = await this.syncService.syncCircleKnowledge(circleId);
    return { circleId, syncedCount: synced };
  }

  @Post("sync-all")
  @ApiOperation({ summary: "全量同步所有圈子知识库" })
  async syncAll() {
    await this.syncService.autoSyncAll();
    return { message: "全量同步已触发" };
  }

  @Post("add")
  @ApiOperation({ summary: "手动添加内容到知识库（圈主操作）" })
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
  async removeFromKnowledge(
    @Param("knowledgeId") knowledgeId: string,
    @Body() body: { circleId: string; userId: string },
  ) {
    return this.syncService.removeFromKnowledge(body.circleId, body.userId, knowledgeId);
  }

  @Get("candidates/:circleId")
  @ApiOperation({ summary: "获取候选内容列表" })
  @ApiQuery({ name: "status", required: false })
  async getCandidates(
    @Param("circleId") circleId: string,
    @Query("status") status?: string,
  ) {
    return this.syncService.getCandidates(circleId, status as any);
  }

  @Post("candidates/:candidateId/confirm")
  @ApiOperation({ summary: "确认候选内容加入知识库" })
  async confirmCandidate(@Param("candidateId") candidateId: string) {
    return this.syncService.confirmCandidate(candidateId);
  }

  @Post("candidates/:candidateId/reject")
  @ApiOperation({ summary: "拒绝候选内容" })
  async rejectCandidate(@Param("candidateId") candidateId: string) {
    return this.syncService.rejectCandidate(candidateId);
  }
}
