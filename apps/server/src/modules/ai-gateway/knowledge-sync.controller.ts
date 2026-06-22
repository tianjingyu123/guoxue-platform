import { Controller, Post, Get, Param, Query, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { KnowledgeSyncService } from "./knowledge-sync.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

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
  async syncCircle(@Req() req: Request, @Param("circleId") circleId: string) {
    // 安全：仅圈主可触发同步
    await this.syncService.assertCircleOwner(circleId, req.user.id);
    const synced = await this.syncService.syncCircleKnowledge(circleId);
    return { circleId, syncedCount: synced };
  }

  @Post("sync-all")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
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
    @Req() req: Request,
    @Body()
    body: {
      circleId: string;
      targetType: "post" | "article";
      targetId: string;
    },
  ) {
    // 安全：操作人强制取自 req.user.id，不信任 body.userId；service 内校验圈主
    return this.syncService.manuallyAddToKnowledge(
      body.circleId,
      req.user.id,
      body.targetType,
      body.targetId,
    );
  }

  @Post("remove/:knowledgeId")
  @ApiOperation({ summary: "从知识库移除内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async removeFromKnowledge(
    @Req() req: Request,
    @Param("knowledgeId") knowledgeId: string,
    @Body() body: { circleId: string },
  ) {
    // 安全：操作人强制取自 req.user.id；service 内校验圈主 + where 加 circleId 约束
    return this.syncService.removeFromKnowledge(body.circleId, req.user.id, knowledgeId);
  }

  @Get("candidates/:circleId")
  @ApiOperation({ summary: "获取候选内容列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false })
  async getCandidates(
    @Req() req: Request,
    @Param("circleId") circleId: string,
    @Query("status") status?: string,
  ) {
    // 安全：仅圈主可查看本圈子候选内容
    await this.syncService.assertCircleOwner(circleId, req.user.id);
    return this.syncService.getCandidates(circleId, status as any);
  }

  @Post("candidates/:candidateId/confirm")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "确认候选内容加入知识库" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async confirmCandidate(@Param("candidateId") candidateId: string) {
    return this.syncService.confirmCandidate(candidateId);
  }

  @Post("candidates/:candidateId/reject")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "拒绝候选内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async rejectCandidate(@Param("candidateId") candidateId: string) {
    return this.syncService.rejectCandidate(candidateId);
  }
}
