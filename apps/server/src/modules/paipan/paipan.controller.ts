import {
  Controller,
  Get,
  Post,
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
import { BaziInputDto, BaziRecordQueryDto, ZiweiInputDto, AnalyzeDto, AnalysisQueryDto } from "./paipan.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("排盘")
@Controller("paipan")
export class PaipanController {
  constructor(
    private paipan: PaipanService,
    private paipanAi: PaipanAiService,
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
      year: +year, month: +month, day: +day, hour: +hour,
      minute: minute ? +minute : 0,
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
      record.resultData as unknown as BaziResult,
    );
  }

  /** 获取排盘记录的 AI 分析结果 */
  @Get("bazi/:id/analysis")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取八字AI分析结果" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回分析结果" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "分析不存在" })
  baziGetAnalysis(@Param("id") id: string, @Req() req: Request) {
    return this.paipanAi.getAnalysisByPaipanRecord(id, req.user.id);
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
      record.resultData as unknown as ZiweiResult,
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
  async hehun(@Req() req: Request, @Body() dto: { male: string; female: string }) {
    const [maleRecord, femaleRecord] = await Promise.all([
      this.paipan.getBaziRecord(dto.male, req.user.id),
      this.paipan.getBaziRecord(dto.female, req.user.id),
    ]);
    return this.paipanAi.analyzeHehun(
      req.user.id,
      maleRecord.resultData as unknown as BaziResult,
      femaleRecord.resultData as unknown as BaziResult,
    );
  }

  // ────────── 分享 ──────────

  /** 排盘结果公开分享 */
  @Get("record/:id/share")
  @ApiOperation({ summary: "排盘结果公开分享（无需登录）" })
  async shareRecord(@Param("id") id: string) {
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id },
      select: { id: true, paipanType: true, resultData: true, inputParams: true, createdAt: true },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "记录不存在");
    const input = (record.inputParams as any) || {};
    return {
      type: record.paipanType,
      createdAt: record.createdAt,
      gender: input.gender,
      result: record.resultData,
    };
  }

  // ────────── 管理员端点 ──────────

  /** 管理员查看所有排盘记录 */
  @Get("admin/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看所有排盘记录" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回排盘记录列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需管理员）" })
  ziweiAdminRecords(@Query() q: BaziRecordQueryDto & { type?: string; keyword?: string }) {
    return this.paipan.getAllRecords({
      page: q.page || 1,
      pageSize: q.pageSize || 20,
      type: q.type,
      keyword: q.keyword,
    });
  }
}
