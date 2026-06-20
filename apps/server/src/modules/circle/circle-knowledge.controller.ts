import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { SkipFormat } from "../../common/skip-format.decorator";

@ApiTags("圈子知识库")
@Controller("circles")
export class CircleKnowledgeController {
  constructor(private readonly knowledge: CircleKnowledgeService) {}

  // ───────── 知识库 CRUD ─────────

  @Post(":circleId/knowledge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "手动添加知识条目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  addKnowledge(
    @Param("circleId") circleId: string,
    @Body() body: { sourceType: string; sourceId?: string; content: string },
    @Req() req: Request,
  ) {
    return this.knowledge.add({
      circleId,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      content: body.content,
      addedBy: req.user.id,
    });
  }

  @Get(":circleId/knowledge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取知识库列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "sourceType", required: false })
  listKnowledge(
    @Param("circleId") circleId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("sourceType") sourceType?: string,
  ) {
    return this.knowledge.list(circleId, { page: Number(page), pageSize: Number(pageSize), sourceType });
  }

  @Put(":circleId/knowledge/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新知识条目内容" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateKnowledge(
    @Param("circleId") circleId: string,
    @Param("id") id: string,
    @Body() body: { content: string },
  ) {
    return this.knowledge.update(circleId, id, body.content);
  }

  @Delete(":circleId/knowledge/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除知识条目" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  removeKnowledge(
    @Param("circleId") circleId: string,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.knowledge.remove(circleId, id, req.user.id);
  }

  // ───────── 候选内容审核 ─────────

  @Get(":circleId/knowledge/candidates")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取候选知识列表（待圈主审核）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listCandidates(
    @Param("circleId") circleId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.knowledge.listCandidates(circleId, Number(page), Number(pageSize));
  }

  @Post(":circleId/knowledge/candidates/:candidateId/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "确认候选条目入库" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  confirmCandidate(
    @Param("circleId") circleId: string,
    @Param("candidateId") candidateId: string,
    @Req() req: Request,
  ) {
    return this.knowledge.confirmCandidate(circleId, candidateId, req.user.id);
  }

  @Post(":circleId/knowledge/candidates/:candidateId/reject")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "拒绝候选条目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  rejectCandidate(
    @Param("circleId") circleId: string,
    @Param("candidateId") candidateId: string,
  ) {
    return this.knowledge.rejectCandidate(circleId, candidateId);
  }

  // ───────── 知识库导出 ─────────

  @Get(":circleId/knowledge/export/json")
  @SkipFormat()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "导出知识库（JSON 格式）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "sourceType", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportJson(
    @Param("circleId") circleId: string,
    @Query("sourceType") sourceType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Res() res?: Response,
  ) {
    const data = await this.knowledge.exportJson(circleId, {
      sourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (res) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="knowledge-${circleId.slice(0, 8)}.json"`);
      return res.json(data);
    }
    return data;
  }

  @Get(":circleId/knowledge/export/markdown")
  @SkipFormat()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "导出知识库（Markdown 格式）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "sourceType", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async exportMarkdown(
    @Param("circleId") circleId: string,
    @Query("sourceType") sourceType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Res() res?: Response,
  ) {
    const data = await this.knowledge.exportMarkdown(circleId, {
      sourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (res) {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${data.filename}"`);
      return res.send(data.markdown);
    }
    return data;
  }
}
