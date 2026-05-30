import { Controller, Post, Get, Body, Query, UseGuards, Param, Put, Delete } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ThrottleGuard } from "../../common/throttle.guard";
import { SentenceRecognizeDto, CreateRecTaskDto, ImageOcrDto, SentimentAnalyzeDto, ExtractKeywordsDto, TranslateTextDto } from "./ai.dto";

@ApiTags("AI能力")
@Controller("ai")
export class AiController {
  constructor(private ai: AiService) {}

  // ───────── 语音识别 ─────────

  @Post("asr/sentence")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "一句话识别（60秒内）" })
  @ApiBearerAuth()
  sentenceRecognize(@Body() dto: SentenceRecognizeDto) {
    return this.ai.sentenceRecognition(dto.audio, { format: dto.format || "wav" });
  }

  @Post("asr/task")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建长语音识别任务" })
  @ApiBearerAuth()
  createRecTask(@Body() dto: CreateRecTaskDto) {
    return this.ai.createRecTask(dto.audioUrl, { callbackUrl: dto.callbackUrl });
  }

  @Get("asr/task")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询语音识别结果" })
  @ApiBearerAuth()
  queryRecTask(@Query("taskId") taskId: number) {
    return this.ai.queryRecTask(taskId);
  }

  // ───────── OCR ─────────

  @Post("ocr/general")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "通用印刷体识别" })
  @ApiBearerAuth()
  generalOCR(@Body() dto: ImageOcrDto) {
    return this.ai.generalBasicOCR(dto.image);
  }

  @Post("ocr/handwriting")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "手写体识别" })
  @ApiBearerAuth()
  handwritingOCR(@Body() dto: ImageOcrDto) {
    return this.ai.generalHandwritingOCR(dto.image);
  }

  @Post("ocr/ancient")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "古籍文字识别（高精度）" })
  @ApiBearerAuth()
  ancientBookOCR(@Body() dto: ImageOcrDto) {
    return this.ai.ancientBookOCR(dto.image);
  }

  // ───────── NLP ─────────

  @Post("nlp/sentiment")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "情感分析" })
  @ApiBearerAuth()
  sentimentAnalyze(@Body() dto: SentimentAnalyzeDto) {
    return this.ai.sentimentAnalyze(dto.text);
  }

  @Post("nlp/keywords")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "关键词提取" })
  @ApiBearerAuth()
  extractKeywords(@Body() dto: ExtractKeywordsDto) {
    return this.ai.extractKeywords(dto.text, dto.count);
  }

  // ───────── 翻译 ─────────

  @Post("translate")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "文本翻译" })
  translateText(@Body() dto: TranslateTextDto) {
    return this.ai.translateText(dto.text, dto.sourceLang, dto.targetLang);
  }

  @Post("detect-language")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "语种识别" })
  detectLanguage(@Body() dto: SentimentAnalyzeDto) {
    return this.ai.detectLanguage(dto.text);
  }

  // ───────── AI 调用监控（管理员） ─────────

  @Get("usage-stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取AI使用统计" })
  @ApiBearerAuth()
  @ApiQuery({ name: "period", required: false, enum: ["day", "week", "month"] })
  getAiUsageStats(@Query("period") period: "day" | "week" | "month" = "day") {
    return this.ai.getAiUsageStats(period);
  }

  @Get("call-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取AI调用日志" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "service", required: false })
  getAiCallLogs(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("service") service?: string,
  ) {
    return this.ai.getAiCallLogs(Number(page), Number(pageSize), service);
  }

  @Get("abnormal-alerts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "获取AI异常告警" })
  @ApiBearerAuth()
  getAiAbnormalAlerts() {
    return this.ai.getAiAbnormalAlerts();
  }

  @Get("circuit-breaker")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "AI断路器状态" })
  @ApiBearerAuth()
  getCircuitBreakerStatus() {
    return this.ai.getCircuitBreakerStatus();
  }

  // ───────── 圈主助理管理（管理员） ─────────

  @Get("circle-assistants")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈主助理列表" })
  @ApiBearerAuth()
  getCircleAssistants() {
    return this.ai.getCircleAssistants();
  }

  @Post("circle-assistants/:circleId/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审批通过圈主助理" })
  @ApiBearerAuth()
  approveCircleAssistant(@Param("circleId") circleId: string) {
    return this.ai.approveCircleAssistant(circleId);
  }

  @Post("circle-assistants/:circleId/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驳回圈主助理" })
  @ApiBearerAuth()
  rejectCircleAssistant(@Param("circleId") circleId: string, @Body("reason") reason?: string) {
    return this.ai.rejectCircleAssistant(circleId, reason);
  }

  @Get("knowledge/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈子知识库" })
  @ApiBearerAuth()
  getKnowledgeBase(@Param("circleId") circleId: string) {
    return this.ai.getKnowledgeBase(circleId);
  }

  @Post("knowledge/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加知识库条目" })
  @ApiBearerAuth()
  createKnowledgeEntry(@Param("circleId") circleId: string, @Body() body: { title: string; content: string }) {
    return this.ai.createKnowledgeEntry(circleId, body);
  }

  @Put("knowledge/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新知识库条目" })
  @ApiBearerAuth()
  updateKnowledgeEntry(@Param("id") id: string, @Body() body: { title?: string; content?: string }) {
    return this.ai.updateKnowledgeEntry(id, body);
  }

  @Delete("knowledge/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除知识库条目" })
  @ApiBearerAuth()
  deleteKnowledgeEntry(@Param("id") id: string) {
    return this.ai.deleteKnowledgeEntry(id);
  }

  @Get("usage/:circleId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取圈子AI使用数据" })
  @ApiBearerAuth()
  getCircleUsage(@Param("circleId") circleId: string) {
    return this.ai.getCircleUsage(circleId);
  }
}
