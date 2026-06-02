import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Response, Request } from "express";
import { BotService } from "./bot.service";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto, ChatDto, AddBotKnowledgeItemDto, UpdateBotKnowledgeItemDto, RunWorkflowDto } from "./bot.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

/**
 * 智能体管理控制器
 *
 * ## 架构选型理由
 * - **为什么 Coze + 自建混合：** 智能体的创建/配置/审核走自建后台（Prisma 管理），
 *   运行时对话走 Coze API（CozeService），实现 **"自建管配置，Coze 管运行"** 的壳/核分离
 * - **为什么不是纯 Coze：** 需要管理后台审核智能体、按分站隔离、用户权限控制，
 *   这些 Coze 原生不支持
 * - **为什么不是纯自建：** 对话引擎（上下文管理、流式输出、知识库 RAG）
 *   自建成本极高，Coze 已成熟，直接借用
 * - **考虑过的方案：**
 *   1. 纯 Coze 智能体广场 → 放弃，无法做审核/分站/权限
 *   2. 完全自建对话引擎 → 放弃，重复造轮子
 *   3. 自建管理 + Coze 运行时（当前方案）→ ✅ 最佳
 * - **未来演进：** 如果某些智能体需要本地模型（隐私场景），可在 botConfig 中
 *   增加 runtime 字段，支持 `coze | local | custom-http` 三种运行时
 */
@ApiTags("智能体")
@Controller("bots")
export class BotController {
  private readonly logger = new Logger(BotController.name);
  constructor(private svc: BotService, private sse: StreamUnifierService) {}

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

  @Get("ranking")
  @ApiOperation({ summary: "智能体热度排行" })
  ranking(@Query("limit") limit = 20) {
    return this.svc.getRanking(+limit);
  }

  @Get("feed-cards")
  @ApiOperation({ summary: "信息流智能体卡片（含动态背景色）" })
  feedCards(@Query("limit") limit = 6) {
    return this.svc.getFeedCards(+limit);
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
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
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
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
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

    const obs = this.svc.chatStream(
      bot.botId,
      bot.apiKey,
      req.user.id,
      dto.query,
      dto.conversationId,
    );

    obs.subscribe({
      next: (chunk: string) => {
        res.write(this.sse.encode({ type: "chunk", content: chunk }));
      },
      error: (err: Error) => {
        this.logger.warn(`智能体SSE流错误 [${id}]: ${err.message}`);
        res.write(this.sse.encode({ type: "error", message: err.message }));
        res.end();
      },
      complete: () => {
        res.write(this.sse.encode({ type: "done" }));
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

  // ───────── 语音通话 ─────────

  @Post(":id/voice-room")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建语音通话房间（Coze RTC）" })
  @ApiBearerAuth()
  createVoiceRoom(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.svc.createVoiceRoom(id, req.user.id);
  }

  // ───────── Coze 同步 ─────────

  @Post("sync/coze")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "从 Coze 同步智能体列表" })
  @ApiBearerAuth()
  syncFromCoze() {
    return this.svc.syncFromCoze();
  }

  @Get(":id/coze-info")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取 Coze 侧智能体详细信息" })
  @ApiBearerAuth()
  getCozeBotInfo(@Param("id") id: string) {
    return this.svc.getCozeBotInfo(id);
  }

  // ───────── 工作流 ─────────

  @Post("workflow/run")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "执行 Coze 工作流" })
  @ApiBearerAuth()
  runWorkflow(@Body() dto: RunWorkflowDto) {
    return this.svc.runWorkflow(dto);
  }

  // ───────── 文件上传 ─────────

  @Post(":id/upload-file")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传文件到 Coze（多模态对话）" })
  @ApiBearerAuth()
  uploadFile(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { file: string; filename: string },
  ) {
    return this.svc.uploadFile(id, Buffer.from(body.file, "base64"), body.filename);
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
