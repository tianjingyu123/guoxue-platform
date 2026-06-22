import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Response, Request } from "express";
import { BotService } from "./bot.service";
import { CozeService } from "./coze.service";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto, ChatDto, AddBotKnowledgeItemDto, UpdateBotKnowledgeItemDto, RunWorkflowDto } from "./bot.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SkipFormat } from "../../common/skip-format.decorator";

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
  constructor(private svc: BotService, private cozeSvc: CozeService, private sse: StreamUnifierService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建智能体" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  create(@Body() dto: CreateBotDto) {
    return this.svc.create(dto);
  }

  /** 通过 Coze API 一键创建+发布智能体，并同步到本地 BotConfig */
  @Post("create-coze")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "Coze 创建智能体并同步" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async createOnCoze(@Body() body: {
    name: string; description?: string; prompt?: string; type?: string;
    isFree?: boolean; dailyLimit?: number;
    modelConfig?: Record<string, unknown>; pluginIds?: string[]; workflowIds?: string[];
    onboarding?: Record<string, unknown>; voiceId?: string;
  }) {
    const apiKey = process.env.COZE_API_KEY || "";
    if (!apiKey) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "COZE_API_KEY 未配置");

    // 1. 在 Coze 平台创建智能体
    const botData = await this.cozeSvc.createBot({
      apiKey,
      name: body.name,
      description: body.description,
      prompt: body.prompt,
      modelConfig: body.modelConfig,
      pluginIds: body.pluginIds,
      workflowIds: body.workflowIds,
      onboarding: body.onboarding,
      voiceId: body.voiceId,
    });

    // 2. 同步到本地 BotConfig
    const bot = await this.svc.create({
      name: body.name,
      type: body.type || "CUSTOMER_SERVICE",
      botId: botData.bot_id as string,
      apiKey,
      intro: body.description || "",
      isFree: body.isFree ?? true,
      dailyLimit: body.dailyLimit ?? 10,
    });

    return { code: 200, data: bot, message: "智能体已创建并发布" };
  }

  @Get()
  @ApiOperation({ summary: "获取智能体列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false, type: String, description: "智能体类型" })
  list(@Query("type") type?: string) {
    return this.svc.list(type);
  }

  @Get("ranking")
  @ApiOperation({ summary: "智能体热度排行" })
  @ApiResponse({ status: 200, description: "成功" })
  ranking(@Query("limit") limit = 20) {
    return this.svc.getRanking(+limit);
  }

  @Get("feed-cards")
  @ApiOperation({ summary: "信息流智能体卡片（含动态背景色）" })
  @ApiResponse({ status: 200, description: "成功" })
  feedCards(@Query("limit") limit = 6) {
    return this.svc.getFeedCards(+limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取智能体详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  detail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新智能体" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Body() dto: UpdateBotDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除智能体" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  // 圈子绑定
  @Post(":id/bind-circle")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "绑定智能体到圈子" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  bindToCircle(@Req() req: Request, @Param("id") id: string, @Body() dto: BindBotToCircleDto) {
    // 安全：service 内校验当前用户为目标圈子圈主
    return this.svc.bindToCircle(id, dto, req.user.id);
  }

  @Get("circle/:circleId")
  @ApiOperation({ summary: "获取圈子绑定的智能体" })
  @ApiResponse({ status: 200, description: "成功" })
  getCircleBot(@Param("circleId") circleId: string) {
    return this.svc.getCircleBot(circleId);
  }

  // 知识库
  @Post(":id/knowledge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加知识库条目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  addKnowledge(@Req() req: Request, @Param("id") id: string, @Body() dto: AddKnowledgeDto) {
    // 安全：service 内校验当前用户为该智能体绑定圈子的圈主
    return this.svc.addKnowledge(id, dto, req.user.id);
  }

  @Delete("knowledge/:knowledgeId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除知识库条目" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteKnowledge(@Req() req: Request, @Param("knowledgeId") knowledgeId: string) {
    // 安全：service 内校验当前用户为该知识条目所属圈子的圈主
    return this.svc.deleteKnowledgeAsOwner(knowledgeId, req.user.id);
  }

  // ───────── COZE 对话 ─────────

  @Post(":id/chat")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "智能体对话（非流式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  chat(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ChatDto,
  ) {
    return this.svc.chat(id, req.user.id, dto);
  }

  @Post(":id/chat/stream")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "智能体对话（流式SSE）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  syncFromCoze() {
    return this.svc.syncFromCoze();
  }

  @Get(":id/coze-info")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取 Coze 侧智能体详细信息" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getCozeBotInfo(@Param("id") id: string) {
    return this.svc.getCozeBotInfo(id);
  }

  // ───────── 工作流 ─────────

  @Post("workflow/run")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "执行 Coze 工作流" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  runWorkflow(@Body() dto: RunWorkflowDto) {
    return this.svc.runWorkflow(dto);
  }

  // ───────── 文件上传 ─────────

  @Post(":id/upload-file")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传文件到 Coze（多模态对话）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  uploadFile(
    @Req() _req: Request,
    @Param("id") id: string,
    @Body() body: { file: string; filename: string },
  ) {
    // 安全：解码前先按 base64 字符串长度预检，避免超大载荷在内存中解码（5MB 二进制 ≈ 6.99MB base64）
    if (!body?.file) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "文件内容不能为空");
    }
    const MAX_BASE64_LEN = Math.ceil((5 * 1024 * 1024) / 3) * 4; // 5MB 对应的 base64 长度上限
    if (body.file.length > MAX_BASE64_LEN) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "文件大小超过 5MB 上限");
    }
    // service 内再次按解码后的真实字节数校验（双重保险）
    return this.svc.uploadFile(id, Buffer.from(body.file, "base64"), body.filename);
  }

  // ───────── 圈主助理管理（管理员） ─────────

  @Get("manage/approvals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取待审批的圈主助理开通申请" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  approveBot(@Param("circleId") circleId: string) {
    return this.svc.approveBot(circleId);
  }

  @Get("manage/knowledge/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈主助理知识库列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteBotKnowledge(@Param("knowledgeId") knowledgeId: string) {
    return this.svc.deleteKnowledge(knowledgeId);
  }

  @Get("manage/usage/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈主助理使用数据" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getBotUsageData(@Param("circleId") circleId: string) {
    return this.svc.getBotUsageData(circleId);
  }
}
