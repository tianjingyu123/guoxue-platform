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
import { BaziInputDto, BaziRecordQueryDto, AdminRecordQueryDto, ZiweiInputDto, QimenInputDto, YangpanInputDto, LiuYaoInputDto, DaLiuRenInputDto, AnalyzeDto, AnalysisQueryDto, GroupListQueryDto, CreateGroupDto, RenameGroupDto, DeleteGroupDto, CaseQueryDto, HehunDto } from "./paipan.dto";
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
  async hehun(@Req() req: Request, @Body() dto: HehunDto) {
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
