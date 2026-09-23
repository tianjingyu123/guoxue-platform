import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Header,
} from "@nestjs/common";
import { Request } from "express";
import type { BaziResult } from "@guoxue/bazi-engine";
import type { ZiweiResult } from "@guoxue/ziwei-engine";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { PaipanService } from "./paipan.service";
import { PaipanAiService } from "./paipan-ai.service";
import { PaipanReportService } from "./paipan-report.service";
import { PaipanReportDialogueService } from "./paipan-report-dialogue.service";
import { BaziInputDto, BaziRecordQueryDto, AdminRecordQueryDto, ZiweiInputDto, QimenInputDto, YangpanInputDto, LiuYaoInputDto, MeihuaInputDto, DaLiuRenInputDto, AnalyzeDto, AnalysisQueryDto, GroupListQueryDto, CreateGroupDto, RenameGroupDto, DeleteGroupDto, CaseQueryDto, HehunDto, GenerateReportDto, AskReportDto, XiaoliurenInputDto, XuankongInputDto, JinkoujueInputDto, BazhaiInputDto, YinpanInputDto, ShanxiangMapDto, ShanxiangImageDto } from "./paipan.dto";
import { SubmitCaseFeedbackDto, ReviewCaseFeedbackDto, CaseFeedbackQueryDto, FollowUpQueryDto } from "./paipan-case-feedback.dto";
import { PaipanCaseFeedbackService } from "./paipan-case-feedback.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { NativePaipanGuard } from "../../common/paipan-runtime.service";

/**
 * 存库的 resultData 经 sanitizeResult 脱敏后不含 input（生辰单独加密于 clientBirth），
 * 而 AI prompt 构建需要 input——从 inputParams/clientName/解密后的 clientBirth 重组补回。
 * （此前八字/紫微/合婚 AI 分析对已存记录一直因 input undefined 而 500，本函数是统一修复点）
 */
function hydrateInput(record: {
  resultData: unknown;
  clientName?: string | null;
  clientBirth?: string | null;
  inputParams?: unknown;
}): unknown {
  const rd = (record.resultData ?? {}) as Record<string, unknown>;
  if (!rd.input) {
    const ip = (record.inputParams ?? {}) as Record<string, unknown>;
    rd.input = {
      name: record.clientName || ip.name || "",
      gender: ip.gender || "",
      birth: record.clientBirth || "",
    };
  }
  return rd;
}
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("排盘")
@Controller("paipan")
@UseGuards(NativePaipanGuard)
export class PaipanController {
  constructor(
    private paipan: PaipanService,
    private paipanAi: PaipanAiService,
    private paipanReport: PaipanReportService,
    private reportDialogue: PaipanReportDialogueService,
    private caseFeedback: PaipanCaseFeedbackService,
    private prisma: PrismaService,
  ) {}

  /** 八字排盘预览（不登录也可用） */
  @Post("bazi/preview")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=600")
  @ApiOperation({ summary: "八字排盘预览（无需登录，结果缓存10分钟）" })
  @ApiResponse({ status: 201, description: "排盘成功" })
  @ApiResponse({ status: 400, description: "参数校验失败（缺少必填字段或格式错误）" })
  baziPreview(@Body() dto: BaziInputDto) {
    return this.paipan.calcBaziPreview(dto);
  }

  /** 八字排盘 GET 接口（兼容前端 /paipan/bazi/calculate 调用） */
  /** 校验八字数值入参：非有限整数或越界时，有 fallback 回退默认、否则抛 400（防 NaN 直入排盘引擎致 500） */
  private parseBaziInt(v: unknown, min: number, max: number, name: string, fallback?: number): number {
    const n = Number(v);
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    if (fallback !== undefined) return fallback;
    throw new BusinessException(ErrorCode.BAD_REQUEST, `参数 ${name} 无效`);
  }

  @Get("bazi/calculate")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=600")
  @ApiOperation({ summary: "八字排盘计算（GET，兼容前端）" })
  baziCalculate(
    @Query("year") year?: number,
    @Query("month") month?: number,
    @Query("day") day?: number,
    @Query("hour") hour?: number,
    @Query("minute") minute?: number,
    @Query("gender") gender?: string,
  ) {
    return this.paipan.calcBaziPreview({
      year: this.parseBaziInt(year, 1900, 2100, "year", 1983),
      month: this.parseBaziInt(month, 1, 12, "month", 6),
      day: this.parseBaziInt(day, 1, 31, "day", 18),
      hour: this.parseBaziInt(hour, 0, 23, "hour", 14),
      minute: this.parseBaziInt(minute, 0, 59, "minute", 0),
      gender: (gender === "女" ? "女" : "男"),
    } as BaziInputDto);
  }

  /** 八字排盘 CDN 静态化 GET 接口（不敏感部分，公开可缓存） */
  @Get("bazi/public")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=3600, s-maxage=86400")
  @ApiOperation({ summary: "八字排盘公开结果（CDN缓存1天，无需登录）" })
  baziPublic(
    @Query("year") year: number,
    @Query("month") month: number,
    @Query("day") day: number,
    @Query("hour") hour: number,
    @Query("minute") minute?: number,
    @Query("gender") gender?: string,
  ) {
    return this.paipan.calcBaziPreview({
      year: this.parseBaziInt(year, 1900, 2100, "year"),
      month: this.parseBaziInt(month, 1, 12, "month"),
      day: this.parseBaziInt(day, 1, 31, "day"),
      hour: this.parseBaziInt(hour, 0, 23, "hour"),
      minute: this.parseBaziInt(minute, 0, 59, "minute", 0),
      gender: (gender === "female" ? "女" : "男"),
    } as BaziInputDto);
  }

  /** 八字排盘并保存 */
  @Post("bazi")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "八字排盘并保存" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "保存成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  baziCalc(@Req() req: Request, @Body() dto: BaziInputDto) {
    return this.paipan.calcBaziAndSave(req.user.id, dto);
  }

  /** 获取排盘记录详情 */
  @Get("bazi/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取八字排盘记录详情" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘详情" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "记录不存在或不属于当前用户" })
  baziRecord(@Param("id") id: string, @Req() req: Request) {
    return this.paipan.getBaziRecord(id, req.user.id);
  }

  /** 我的排盘历史 */
  @Get("bazi")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取八字排盘历史" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘历史" })
  @ApiResponse({ status: 401, description: "未认证" })
  baziHistory(@Req() req: Request, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserBaziHistory(
      req.user.id,
      q.page || 1,
      q.pageSize || 20,
    );
  }

  // ────────── AI 排盘解析 ──────────

  /** 对已保存的排盘记录进行 AI 分析 */
  @Post("bazi/analyze")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI分析八字排盘" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "分析请求已提交" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "排盘记录不存在" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async baziAnalyze(@Req() req: Request, @Body() dto: AnalyzeDto) {
    const record = await this.paipan.getBaziRecord(dto.recordId, req.user.id);
    return this.paipanAi.analyzeBazi(
      req.user.id,
      dto.recordId,
      hydrateInput(record) as unknown as BaziResult,
      dto.school,
    );
  }

  /** 获取排盘记录的 AI 分析结果（可选 school 查询流派点评） */
  @Get("bazi/:id/analysis")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取八字AI分析结果（?school=可查指定流派点评）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回分析结果" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "分析不存在" })
  baziGetAnalysis(@Param("id") id: string, @Req() req: Request, @Query("school") school?: string) {
    return this.paipanAi.getAnalysisByPaipanRecord(id, req.user.id, school);
  }

  /** 获取某排盘记录的全部 AI 分析（通用+各流派点评，含 school/master 标注，供对照展示） */
  @Get("records/:id/analyses")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取排盘记录的全部AI分析（含流派师父标注）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回分析列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  getRecordAnalyses(@Param("id") id: string, @Req() req: Request) {
    return this.paipanAi.getAnalysesByPaipanRecord(id, req.user.id);
  }

  // ────────── 排盘报告（S07：结构化报告 + 版本管理）──────────

  /** 生成结构化排盘报告（固化引擎结果，报告版本化存储） */
  @Post("report/generate")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "生成结构化排盘报告" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "报告已生成" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权访问该排盘记录" })
  @ApiResponse({ status: 404, description: "排盘记录不存在" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  generateReport(@Req() req: Request, @Body() dto: GenerateReportDto) {
    return this.paipanReport.generateReport(
      req.user.id,
      dto.recordId,
      dto.reportType || "general",
      {
        includeReferences: dto.includeReferences,
        school: dto.school,
        regenerate: dto.regenerate,
      },
    );
  }

  /** 推演页数据：报告生成前先如实展示校时、盘面、取格与依据命中（确定性计算，不调模型） */
  @Get("report/preflight")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "报告推演页数据（不调模型，用于生成前的过程展示）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回推演步骤" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权访问该排盘记录" })
  @ApiResponse({ status: 404, description: "排盘记录不存在" })
  reportPreflight(@Req() req: Request, @Query("recordId") recordId: string, @Query("school") school?: string) {
    return this.paipanReport.preflight(req.user.id, recordId, school);
  }

  /** 这份报告能否生成：免费 / 会员 / 已购 / 需购买（附价格与会员档位）。须在 report/:id 之前声明 */
  @Get("report/access")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "报告生成权限与价格（单份购买或小卜AI会员）" })
  @ApiBearerAuth()
  reportAccess(@Req() req: Request, @Query("recordId") recordId: string, @Query("reportType") reportType?: string) {
    return this.paipanReport.reportAccess(req.user.id, recordId, reportType || "general");
  }

  /** 本人已生成的报告；放在 report/:id 之前，避免将 mine 当作报告 ID。 */
  @Get("report/mine")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "分页获取本人已生成的排盘报告" })
  @ApiBearerAuth()
  myReports(@Req() req: Request, @Query("page") page?: string) {
    return this.paipanReport.listReports(req.user.id, page);
  }

  /** 获取排盘报告详情（校验用户归属） */
  @Get("report/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取排盘报告详情" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回报告详情" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权访问该报告" })
  @ApiResponse({ status: 404, description: "报告不存在" })
  getReport(@Param("id") id: string, @Req() req: Request) {
    return this.paipanReport.getReport(req.user.id, id);
  }

  /** 围绕报告向小卜提问（文字版；按报告提纲与已审核依据回答） */
  @Post("report/:id/ask")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "围绕排盘报告提问（小卜文字问答）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "回答及对应小节、依据" })
  @ApiResponse({ status: 403, description: "无权访问该报告" })
  @ApiResponse({ status: 404, description: "报告不存在" })
  askReport(@Param("id") id: string, @Body() dto: AskReportDto, @Req() req: Request) {
    return this.reportDialogue.ask(req.user.id, id, dto);
  }

  /** 本人某份报告的问答记录与进度（接着上次聊） */
  @Get("report/:id/dialogue")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "报告问答记录与进度" })
  @ApiBearerAuth()
  getReportDialogue(@Param("id") id: string, @Req() req: Request) {
    return this.reportDialogue.history(req.user.id, id);
  }

  /** 报告“继续学习”：平台公共内容卡片 */
  @Get("report/:id/related")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "报告相关的公开学习内容" })
  @ApiBearerAuth()
  getReportRelated(@Param("id") id: string, @Req() req: Request) {
    return this.reportDialogue.related(req.user.id, id);
  }

  /** 清空本人某份报告的问答记录 */
  @Delete("report/:id/dialogue")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "清空报告问答记录" })
  @ApiBearerAuth()
  clearReportDialogue(@Param("id") id: string, @Req() req: Request) {
    return this.reportDialogue.clearHistory(req.user.id, id);
  }

  /** 我的 AI 分析历史 */
  @Get("bazi/analysis/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取AI分析历史" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回分析历史" })
  @ApiResponse({ status: 401, description: "未认证" })
  baziAnalysisHistory(@Req() req: Request, @Query() q: AnalysisQueryDto) {
    return this.paipanAi.getUserAnalysisHistory(
      req.user.id,
      q.page || 1,
      q.pageSize || 20,
    );
  }

  // ────────── 紫微斗数 ──────────

  /** 紫微斗数预览（不登录也可用） */
  @Post("ziwei/preview")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "紫微斗数预览（无需登录）" })
  @ApiResponse({ status: 201, description: "排盘成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  ziweiPreview(@Body() dto: ZiweiInputDto) {
    return this.paipan.calcZiweiPreview(dto);
  }

  /** 紫微斗数排盘并保存 */
  @Post("ziwei")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "紫微斗数排盘并保存" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "保存成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  ziweiCalc(@Req() req: Request, @Body() dto: ZiweiInputDto) {
    return this.paipan.calcZiweiAndSave(req.user.id, dto);
  }

  /** 获取紫微排盘记录详情 */
  @Get("ziwei/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取紫微排盘记录详情" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘详情" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "记录不存在" })
  ziweiRecord(@Param("id") id: string, @Req() req: Request) {
    return this.paipan.getZiweiRecord(id, req.user.id);
  }

  /** 我的紫微排盘历史 */
  @Get("ziwei")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取紫微排盘历史" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘历史" })
  @ApiResponse({ status: 401, description: "未认证" })
  ziweiHistory(@Req() req: Request, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserZiweiHistory(
      req.user.id,
      q.page || 1,
      q.pageSize || 20,
    );
  }

  // ────────── 管理员端点 ──────────

  // ────────── 紫微斗数 AI 分析 ──────────

  /** 对已保存的紫微排盘记录进行 AI 分析 */
  @Post("ziwei/analyze")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI分析紫微斗数排盘" })
  @ApiBearerAuth()
  async ziweiAnalyze(@Req() req: Request, @Body() dto: AnalyzeDto) {
    const record = await this.paipan.getZiweiRecord(dto.recordId, req.user.id);
    return this.paipanAi.analyzeZiwei(
      req.user.id,
      dto.recordId,
      hydrateInput(record) as unknown as ZiweiResult,
    );
  }

  /** 获取紫微排盘记录的 AI 分析结果 */
  @Get("ziwei/:id/analysis")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取紫微AI分析结果" })
  @ApiBearerAuth()
  ziweiGetAnalysis(@Param("id") id: string, @Req() req: Request) {
    return this.paipanAi.getAnalysisByPaipanRecord(id, req.user.id);
  }

  /** 紫微 AI 分析历史 */
  @Get("ziwei/analysis/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取紫微AI分析历史" })
  @ApiBearerAuth()
  ziweiAnalysisHistory(@Req() req: Request, @Query() q: AnalysisQueryDto) {
    return this.paipanAi.getUserAnalysisHistory(req.user.id, q.page || 1, q.pageSize || 20, "ZIWEI");
  }

  // ────────── 合婚 ──────────

  /** 八字合婚 */
  @Post("hehun")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "八字合婚（两人八字配对分析）" })
  @ApiBearerAuth()
  async hehun(@Req() req: Request, @Body() dto: HehunDto) {
    const [maleRecord, femaleRecord] = await Promise.all([
      this.paipan.getBaziRecord(dto.male, req.user.id),
      this.paipan.getBaziRecord(dto.female, req.user.id),
    ]);
    return this.paipanAi.analyzeHehun(
      req.user.id,
      hydrateInput(maleRecord) as unknown as BaziResult,
      hydrateInput(femaleRecord) as unknown as BaziResult,
    );
  }

  // ────────── 奇门遁甲 ──────────

  /** 奇门遁甲排盘（无需登录，公开排盘） */
  @Post("qimen")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=600")
  @ApiOperation({ summary: "奇门遁甲排盘（无需登录，结果缓存10分钟）" })
  @ApiResponse({ status: 201, description: "排盘成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  qimenCalc(@Body() dto: QimenInputDto) {
    return this.paipan.calcQimen(dto);
  }

  /** 奇门排盘并保存 */
  @Post("qimen/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "奇门遁甲排盘并保存" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "保存成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  qimenSave(@Req() req: Request, @Body() dto: QimenInputDto) {
    return this.paipan.calcQimenAndSave(req.user.id, dto);
  }

  /** 我的奇门排盘历史 */
  @Get("qimen/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取奇门排盘历史" })
  @ApiBearerAuth()
  qimenHistory(@Req() req: Request, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserQimenHistory(req.user.id, q.page || 1, q.pageSize || 20);
  }

  /** 获取奇门排盘记录详情 */
  @Get("qimen/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取奇门排盘记录详情" })
  @ApiBearerAuth()
  qimenRecord(@Param("id") id: string, @Req() req: Request) {
    return this.paipan.getQimenRecord(id, req.user.id);
  }

  /** 阳盘命理奇门排盘（无需登录） */
  @Post("yangpan")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=600")
  @ApiOperation({ summary: "阳盘命理奇门排盘（无需登录，结果缓存10分钟）" })
  @ApiResponse({ status: 201, description: "排盘成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  yangpanCalc(@Body() dto: YangpanInputDto) {
    return this.paipan.calcYangpan(dto);
  }

  /** 阳盘排盘并保存 */
  @Post("yangpan/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "阳盘命理奇门排盘并保存" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "保存成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  yangpanSave(@Req() req: Request, @Body() dto: YangpanInputDto) {
    return this.paipan.calcYangpanAndSave(req.user.id, dto);
  }

  /** 我的阳盘排盘历史 */
  @Get("yangpan/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取阳盘排盘历史" })
  @ApiBearerAuth()
  yangpanHistory(@Req() req: Request, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserYangpanHistory(req.user.id, q.page || 1, q.pageSize || 20);
  }

  /** 获取阳盘排盘记录详情 */
  @Get("yangpan/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取阳盘排盘记录详情" })
  @ApiBearerAuth()
  yangpanRecord(@Param("id") id: string, @Req() req: Request) {
    return this.paipan.getYangpanRecord(id, req.user.id);
  }

  // ────────── 六爻排盘 ──────────

  @Post("liuyao")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=600")
  @ApiOperation({ summary: "六爻排盘（无需登录）" })
  liuyaoCalc(@Body() dto: LiuYaoInputDto) {
    return this.paipan.calcLiuYao(dto);
  }

  @Post("liuyao/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "六爻排盘并保存" })
  @ApiBearerAuth()
  liuyaoSave(@Req() req: Request, @Body() dto: LiuYaoInputDto) {
    return this.paipan.calcLiuYaoAndSave(req.user.id, dto);
  }

  @Post("meihua/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "保存梅花易数起卦记录（用于生成卦书）" })
  @ApiBearerAuth()
  meihuaSave(@Req() req: Request, @Body() dto: MeihuaInputDto) {
    return this.paipan.saveMeihuaRecord(req.user.id, dto);
  }

  // ────────── 金口诀（2026-09-18 第 11 个工具）──────────

  @Post("jinkoujue")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "金口诀起课（不保存）" })
  jinkoujueCalc(@Body() dto: JinkoujueInputDto) {
    return this.paipan.calcJinkoujue(dto);
  }

  @Post("jinkoujue/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "金口诀起课并保存记录（用于生成课书）" })
  @ApiBearerAuth()
  jinkoujueSave(@Req() req: Request, @Body() dto: JinkoujueInputDto) {
    return this.paipan.calcJinkoujueAndSave(req.user.id, dto);
  }

  // ────────── 玄空飞星（2026-09-18 第 10 个工具）──────────

  @Post("xuankong")
  // 预览接口与 qimen/bazi 一致：不强制登录（允许试用），但必须限流——
  // 排盘计算接口敞着，等于把算力和实现白送给批量调用者
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "玄空飞星排盘（不保存）" })
  xuankongCalc(@Body() dto: XuankongInputDto) {
    return this.paipan.calcXuankong(dto);
  }

  @Post("xuankong/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "玄空飞星排盘并保存记录（用于生成宅书）" })
  @ApiBearerAuth()
  xuankongSave(@Req() req: Request, @Body() dto: XuankongInputDto) {
    return this.paipan.calcXuankongAndSave(req.user.id, dto);
  }

  // ────────── 报告应验回访（2026-09-19）──────────
  //
  // 这一组是案例库的活水来源：报告已经存了，补上「后来怎么样了」，
  // 每一次排盘 + 一次回访就是一条带完整推理链的候选案例。
  // 网上流传的案例只有盘面和结论、没有推理链，靠抄是攒不出能训练模型的东西的。

  @Post("case-feedback")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "提交报告应验回访（这一盘后来准不准）" })
  @ApiBearerAuth()
  submitCaseFeedback(@Req() req: Request, @Body() dto: SubmitCaseFeedbackDto) {
    return this.caseFeedback.submit(req.user.id, dto);
  }

  @Get("case-feedback/due")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "列出该回访的排盘（已出报告、未回访、已过冷却期）" })
  @ApiBearerAuth()
  dueForFollowUp(@Query() q: FollowUpQueryDto) {
    return this.caseFeedback.dueForFollowUp(q);
  }

  @Get("case-feedback/pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "待审的回访记录" })
  @ApiBearerAuth()
  listPendingFeedback(@Query() q: CaseFeedbackQueryDto) {
    return this.caseFeedback.listPending(q);
  }

  @Get("case-feedback/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({
    summary: "应验统计（分母为同期全部回访，回访推送与用户自发分开算）",
  })
  @ApiBearerAuth()
  caseFeedbackStats(@Query() q: CaseFeedbackQueryDto) {
    return this.caseFeedback.stats(q);
  }

  @Post("case-feedback/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核回访记录（通过时必须填写「可迁移规律」）" })
  @ApiBearerAuth()
  reviewCaseFeedback(@Req() req: Request, @Param("id") id: string, @Body() dto: ReviewCaseFeedbackDto) {
    return this.caseFeedback.review(req.user.id, id, dto);
  }

  @Get("case-feedback/export/:paipanType")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "导出已审核案例（七段结构，仍需人工补盘面与取象两段）" })
  @ApiBearerAuth()
  exportApprovedCases(@Param("paipanType") paipanType: string, @Query() q: CaseFeedbackQueryDto) {
    return this.caseFeedback.exportApproved(paipanType, q.limit);
  }

  // ────────── 阴盘奇门（2026-09-19 第 13 个工具）──────────

  /**
   * 山向地图判读。
   *
   * 纯计算不落库（地图上拖一个点就要重算）。无需登录——
   * 它不读用户数据、不写库，和 `bazi/preview` 同一性质。
   */
  @Post("shanxiang-map")
  @ApiOperation({
    summary: "山向地图：以太极点算周边标注的方位、距离、所在山与煞忌",
    description:
      "坐标须为 WGS-84（GPS 原始值）。返回真北方位；给了磁偏角则一并附罗盘（磁北）读数。" +
      "只判有明确口诀的八曜煞与八路四路黄泉，不产出综合吉凶评分。",
  })
  @ApiResponse({ status: 201, description: "计算成功" })
  shanxiangMap(@Body() dto: ShanxiangMapDto) {
    return this.paipan.shanxiangMap(dto);
  }

  /**
   * 山向地图·截图路径。
   *
   * 原生 `<map>` 只在微信端开箱可用，H5/App 需各自配 key；
   * 本端点零依赖，用户上传截图即可用，是那条缺口的兜底。
   */
  @Post("shanxiang-image")
  @ApiOperation({
    summary: "山向地图（截图）：在用户上传的图上算方位、所在山与煞忌",
    description:
      "无需经纬度。注意图像 y 轴向下；未给比例尺时距离按像素输出并标明单位。" +
      "煞忌判据与 shanxiang-map 共用，两条路结论一致。",
  })
  @ApiResponse({ status: 201, description: "计算成功" })
  shanxiangImage(@Body() dto: ShanxiangImageDto) {
    return this.paipan.shanxiangImage(dto);
  }

  @Post("yinpan")
  // 与 qimen/bazi 一致：不强制登录（允许试用），但必须限流
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "阴盘奇门起局（不保存）" })
  yinpanCalc(@Body() dto: YinpanInputDto) {
    return this.paipan.calcYinpan(dto);
  }

  @Post("yinpan/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "阴盘奇门起局并保存记录（用于生成课书）" })
  @ApiBearerAuth()
  yinpanSave(@Req() req: Request, @Body() dto: YinpanInputDto) {
    return this.paipan.calcYinpanAndSave(req.user.id, dto);
  }

  // ────────── 八宅（2026-09-19 第 12 个工具）──────────

  @Post("bazhai")
  // 与 qimen/bazi 一致：不强制登录（允许试用），但必须限流——
  // 排盘计算接口敞着，等于把算力和实现白送给批量调用者
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "八宅排盘（不保存）" })
  bazhaiCalc(@Body() dto: BazhaiInputDto) {
    return this.paipan.calcBazhai(dto);
  }

  @Post("bazhai/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "八宅排盘并保存记录（用于生成宅书）" })
  @ApiBearerAuth()
  bazhaiSave(@Req() req: Request, @Body() dto: BazhaiInputDto) {
    return this.paipan.calcBazhaiAndSave(req.user.id, dto);
  }

  // ────────── 小六壬（2026-09-18 第 9 个工具：补后端链路才能出报告）──────────

  @Post("xiaoliuren")
  // 预览接口与 qimen/bazi 一致：不强制登录（允许试用），但必须限流——
  // 排盘计算接口敞着，等于把算力和实现白送给批量调用者
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "小六壬起课（不保存）" })
  xiaoliurenCalc(@Body() dto: XiaoliurenInputDto) {
    return this.paipan.calcXiaoliuren(dto);
  }

  @Post("xiaoliuren/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "小六壬起课并保存记录（用于生成课书）" })
  @ApiBearerAuth()
  xiaoliurenSave(@Req() req: Request, @Body() dto: XiaoliurenInputDto) {
    return this.paipan.calcXiaoliurenAndSave(req.user.id, dto);
  }

  @Get("liuyao/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "六爻排盘历史" })
  @ApiBearerAuth()
  liuyaoHistory(@Req() req: Request, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserLiuYaoHistory(req.user.id, q.page || 1, q.pageSize || 20);
  }

  @Get("liuyao/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "六爻排盘详情" })
  @ApiBearerAuth()
  liuyaoRecord(@Param("id") id: string, @Req() req: Request) {
    return this.paipan.getLiuYaoRecord(id, req.user.id);
  }

  // ────────── 大六壬排盘 ──────────

  @Post("daliuren")
  @UseGuards(StrictRedisThrottleGuard)
  @Header("Cache-Control", "public, max-age=600")
  @ApiOperation({ summary: "大六壬排盘（无需登录）" })
  daliurenCalc(@Body() dto: DaLiuRenInputDto) {
    return this.paipan.calcDaLiuRen(dto);
  }

  @Post("daliuren/save")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "大六壬排盘并保存" })
  @ApiBearerAuth()
  daliurenSave(@Req() req: Request, @Body() dto: DaLiuRenInputDto) {
    return this.paipan.calcDaLiuRenAndSave(req.user.id, dto);
  }

  @Get("daliuren/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "大六壬排盘历史" })
  @ApiBearerAuth()
  daliurenHistory(@Req() req: Request, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserDaLiuRenHistory(req.user.id, q.page || 1, q.pageSize || 20);
  }

  @Get("daliuren/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "大六壬排盘详情" })
  @ApiBearerAuth()
  daliurenRecord(@Param("id") id: string, @Req() req: Request) {
    return this.paipan.getDaLiuRenRecord(id, req.user.id);
  }

  // ────────── 案例库 ──────────

  /** 获取八字案例库（公开，无需登录） */
  @Get("cases")
  @Header("Cache-Control", "public, max-age=3600")
  @ApiOperation({ summary: "获取八字案例库（公开）" })
  getCases(@Query() q: CaseQueryDto) {
    return this.paipan.getCases(q);
  }

  // ────────── 分组管理 ──────────

  /** 获取用户分组列表（含计数） */
  @Get("groups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取分组列表（含排盘记录计数）" })
  @ApiBearerAuth()
  getGroups(@Req() req: Request, @Query() q: GroupListQueryDto) {
    return this.paipan.getGroups(req.user.id, q.paipanType);
  }

  /** 新建分组 */
  @Post("groups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "新建分组" })
  @ApiBearerAuth()
  createGroup(@Req() req: Request, @Body() dto: CreateGroupDto) {
    return this.paipan.createGroup(req.user.id, dto);
  }

  /** 重命名分组（同步更新该分组下的所有排盘记录） */
  @Put("groups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "重命名分组" })
  @ApiBearerAuth()
  renameGroup(@Req() req: Request, @Body() dto: RenameGroupDto) {
    return this.paipan.renameGroup(req.user.id, dto);
  }

  /** 删除分组（该分组下的排盘记录 groupName 置空） */
  @Delete("groups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除分组" })
  @ApiBearerAuth()
  deleteGroup(@Req() req: Request, @Body() dto: DeleteGroupDto) {
    return this.paipan.deleteGroup(req.user.id, dto);
  }

  // ────────── 分享 ──────────

  /** 排盘结果分享（仅记录所有者可查看，防止枚举主键泄露他人命理隐私） */
  @Get("record/:id/share")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "排盘结果分享（仅所有者可查看）" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（非记录所有者）" })
  @ApiResponse({ status: 404, description: "记录不存在" })
  async shareRecord(@Param("id") id: string, @Req() req: Request) {
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id },
      select: { id: true, userId: true, paipanType: true, resultData: true, inputParams: true, createdAt: true },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "记录不存在");
    // IDOR 防护：仅记录所有者可读取，避免可枚举主键泄露他人命理隐私
    if (record.userId !== req.user.id) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看该记录");
    }
    const input = (record.inputParams as any) || {};
    return {
      type: record.paipanType,
      createdAt: record.createdAt,
      gender: input.gender,
      result: record.resultData,
    };
  }

  /** 管理员初始化案例库种子数据 */
  @Post("admin/cases/seed")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "初始化案例库种子数据（管理员）" })
  @ApiBearerAuth()
  seedCases() {
    return this.paipan.seedCases();
  }

  // ────────── 管理员端点 ──────────

  /** 管理员查看所有排盘记录（覆盖八字/紫微/奇门/阳盘/六爻/大六壬全部类型） */
  @Get("admin/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看所有排盘记录（全类型）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘记录列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需管理员）" })
  adminRecords(@Query() q: AdminRecordQueryDto) {
    return this.paipan.getAllRecords({
      page: q.page || 1,
      pageSize: q.pageSize || 20,
      type: q.type,
      keyword: q.keyword,
    });
  }

  /** 管理员查看单条排盘记录详情（不限所有者，覆盖全部类型） */
  @Get("admin/records/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看单条排盘记录详情（全类型）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘记录详情" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需管理员）" })
  @ApiResponse({ status: 404, description: "记录不存在" })
  adminRecordDetail(@Param("id") id: string) {
    return this.paipan.getRecordByIdForAdmin(id);
  }
}
