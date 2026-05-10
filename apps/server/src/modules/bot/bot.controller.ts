import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Response, Request } from "express";
import { BotService } from "./bot.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto, ChatDto, AddBotKnowledgeItemDto, UpdateBotKnowledgeItemDto } from "./bot.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("智能体")
@Controller("bots")
export class BotController {
  constructor(private svc: BotService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建智能体" })
  @ApiBearerAuth()
  create(@Body() dto: CreateBotDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "获取智能体列表" })
  @ApiQuery({ name: "type", required: false, type: String, description: "智能体类型" })
  list(@Query("type") type?: string) {
    return this.svc.list(type);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取智能体详情" })
  detail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新智能体" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Body() dto: UpdateBotDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除智能体" })
  @ApiBearerAuth()
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  // 圈子绑定
  @Post(":id/bind-circle")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "绑定智能体到圈子" })
  @ApiBearerAuth()
  bindToCircle(@Param("id") id: string, @Body() dto: BindBotToCircleDto) {
    return this.svc.bindToCircle(id, dto);
  }

  @Get("circle/:circleId")
  @ApiOperation({ summary: "获取圈子绑定的智能体" })
  getCircleBot(@Param("circleId") circleId: string) {
    return this.svc.getCircleBot(circleId);
  }

  // 知识库
  @Post(":id/knowledge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加知识库条目" })
  @ApiBearerAuth()
  addKnowledge(@Param("id") id: string, @Body() dto: AddKnowledgeDto) {
    return this.svc.addKnowledge(id, dto);
  }

  @Delete("knowledge/:knowledgeId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除知识库条目" })
  @ApiBearerAuth()
  deleteKnowledge(@Param("knowledgeId") knowledgeId: string) {
    return this.svc.deleteKnowledge(knowledgeId);
  }

  // ───────── COZE 对话 ─────────

  @Post(":id/chat")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "智能体对话（非流式）" })
  @ApiBearerAuth()
  chat(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ChatDto,
  ) {
    return this.svc.chat(id, req.user.id, dto);
  }

  @Post(":id/chat/stream")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "智能体对话（流式SSE）" })
  @ApiBearerAuth()
  async chatStream(
    @Req() req: Request,
    @Res() res: Response,
    @Param("id") id: string,
    @Body() dto: ChatDto,
  ) {
    const bot = await this.svc.getBotForChat(id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = this.svc.chatStream(id, req.user.id, dto);
    const obs = stream(
      { botId: bot.botId, apiKey: bot.apiKey, userId: req.user.id, query: dto.query, conversationId: dto.conversationId },
    );

    obs.subscribe({
      next: (chunk: string) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      },
      error: (err: Error) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write("data: [DONE]\n\n");
        res.end();
      },
    });
  }

  @Get(":id/chat-history/:conversationId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取对话历史" })
  @ApiBearerAuth()
  getChatHistory(
    @Param("id") id: string,
    @Param("conversationId") conversationId: string,
  ) {
    return this.svc.getChatHistory(id, conversationId);
  }

  // ───────── 圈主助理管理（管理员） ─────────

  @Get("manage/approvals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取待审批的圈主助理开通申请" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getBotApprovalList(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.svc.getBotApprovalList(Number(page), Number(pageSize));
  }

  @Post("manage/approvals/:circleId/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批准圈主助理开通" })
  @ApiBearerAuth()
  approveBot(@Param("circleId") circleId: string) {
    return this.svc.approveBot(circleId);
  }

  @Get("manage/knowledge/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈主助理知识库列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getBotKnowledgeList(
    @Param("circleId") circleId: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.svc.getBotKnowledgeList(circleId, Number(page), Number(pageSize));
  }

  @Post("manage/knowledge/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加圈主助理知识库条目" })
  @ApiBearerAuth()
  addBotKnowledge(
    @Param("circleId") circleId: string,
    @Body() dto: AddBotKnowledgeItemDto,
  ) {
    return this.svc.addBotKnowledge(circleId, dto);
  }

  @Put("manage/knowledge/:knowledgeId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新圈主助理知识库条目" })
  @ApiBearerAuth()
  updateBotKnowledge(
    @Param("knowledgeId") knowledgeId: string,
    @Body() dto: UpdateBotKnowledgeItemDto,
  ) {
    return this.svc.updateBotKnowledge(knowledgeId, dto);
  }

  @Delete("manage/knowledge/:knowledgeId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除圈主助理知识库条目" })
  @ApiBearerAuth()
  deleteBotKnowledge(@Param("knowledgeId") knowledgeId: string) {
    return this.svc.deleteKnowledge(knowledgeId);
  }

  @Get("manage/usage/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈主助理使用数据" })
  @ApiBearerAuth()
  getBotUsageData(@Param("circleId") circleId: string) {
    return this.svc.getBotUsageData(circleId);
  }
}
