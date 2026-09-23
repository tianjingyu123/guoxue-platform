import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { CircleKnowledgeShowcaseService } from "./circle-knowledge-showcase.service";
import { CircleKnowledgeShowcaseReviewService } from "./circle-knowledge-showcase-review.service";

@ApiTags("圈外知识星图")
@Controller("circles")
export class CircleKnowledgeShowcaseController {
  constructor(
    private readonly showcase: CircleKnowledgeShowcaseService,
    private readonly review: CircleKnowledgeShowcaseReviewService,
  ) {}

  @Get(":circleId/knowledge-showcase")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "获取圈子已审核公开的知识点星图（无可公开内容时返回空图）" })
  @ApiResponse({ status: 200, description: "仅返回公开短摘要与审核过的关系" })
  getPublicGraph(@Param("circleId") circleId: string) {
    return this.showcase.getPublicGraph(circleId);
  }

  @Post(":circleId/knowledge-showcase/drafts/nodes")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "圈管理者提交知识点公开展示草稿（不会自动公开）" })
  createNodeDraft(
    @Param("circleId") circleId: string,
    @Req() req: Request,
    @Body() body: { sourceKnowledgeId?: string; name?: string; summary?: string },
  ) {
    return this.review.createNodeDraft(circleId, req.user.id, body || {});
  }

  @Post(":circleId/knowledge-showcase/drafts/edges")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "圈管理者提交知识点关系草稿（不会自动公开）" })
  createEdgeDraft(
    @Param("circleId") circleId: string,
    @Req() req: Request,
    @Body() body: { fromId?: string; toId?: string; relation?: string },
  ) {
    return this.review.createEdgeDraft(circleId, req.user.id, body || {});
  }

  @Post(":circleId/knowledge-showcase/admin/drafts/nodes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "平台运营代提交知识点展示草稿（仍须单独审核）" })
  createNodeDraftAsAdmin(
    @Param("circleId") circleId: string,
    @Req() req: Request,
    @Body() body: { sourceKnowledgeId?: string; name?: string; summary?: string },
  ) {
    return this.review.createNodeDraftAsAdmin(circleId, req.user.id, body || {});
  }

  @Post(":circleId/knowledge-showcase/admin/drafts/edges")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "平台运营代提交知识点关系草稿（仍须单独审核）" })
  createEdgeDraftAsAdmin(
    @Param("circleId") circleId: string,
    @Req() req: Request,
    @Body() body: { fromId?: string; toId?: string; relation?: string },
  ) {
    return this.review.createEdgeDraftAsAdmin(circleId, req.user.id, body || {});
  }

  @Get(":circleId/knowledge-showcase/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "平台运营查看待审核公开快照及来源片段" })
  listForReview(@Param("circleId") circleId: string, @Query() pages: { sourcePage?: string; nodePage?: string; edgePage?: string }) {
    return this.review.listForReview(circleId, pages);
  }

  @Get(":circleId/knowledge-showcase/review/nodes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "平台运营搜索本圈仍有效的已公开知识点，用于跨页建立关系" })
  searchPublishedNodes(@Param("circleId") circleId: string, @Query("q") query = "") {
    return this.review.searchPublishedNodes(circleId, query);
  }

  @Post(":circleId/knowledge-showcase/nodes/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "平台运营确认知识点公开权利并发布" })
  publishNode(@Param("circleId") circleId: string, @Param("id") id: string, @Req() req: Request, @Body() body: { rightsNote?: string }) {
    return this.review.publishNode(circleId, id, req.user.id, body?.rightsNote);
  }

  @Post(":circleId/knowledge-showcase/edges/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "平台运营确认关系证据并发布" })
  publishEdge(@Param("circleId") circleId: string, @Param("id") id: string, @Req() req: Request, @Body() body: { evidenceNote?: string }) {
    return this.review.publishEdge(circleId, id, req.user.id, body?.evidenceNote);
  }

  @Post(":circleId/knowledge-showcase/nodes/:id/revoke")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "平台运营撤回公开知识点，关系随公开查询失效" })
  revokeNode(@Param("circleId") circleId: string, @Param("id") id: string, @Req() req: Request) {
    return this.review.revokeNode(circleId, id, req.user.id);
  }

  @Post(":circleId/knowledge-showcase/edges/:id/revoke")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "平台运营撤回公开关系" })
  revokeEdge(@Param("circleId") circleId: string, @Param("id") id: string, @Req() req: Request) {
    return this.review.revokeEdge(circleId, id, req.user.id);
  }
}
