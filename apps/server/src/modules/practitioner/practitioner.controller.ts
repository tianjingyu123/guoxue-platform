import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { PractitionerService } from "./practitioner.service";
import { ReportAiService } from "./report-ai.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RedLineGate, RedLine } from "../../common/red-lines";

/**
 * 从业者工作台
 *
 * 鉴权：除「按令牌看报告」（客户拿链接看，通常无账号）外，全部 JWT；
 *      数据严格 ownerId = req.user.id 隔离（他人的 id 与不存在同样 404）。
 * 会员：入口对所有登录用户开放，报告交付/品牌落款/不限份数为会员专属（service 层闸门）。
 */
@ApiTags("从业者工作台")
@Controller("practitioner")
export class PractitionerController {
  constructor(
    private svc: PractitionerService,
    private ai: ReportAiService,
  ) {}

  // ───────── 公开：客户凭链接查看已交付的报告（令牌即凭证）─────────

  @Get("reports/shared/:token")
  @ApiOperation({ summary: "按分享令牌查看报告（公开·只读·客户无需登录）" })
  @ApiResponse({ status: 404, description: "报告不存在或已被撤回" })
  getShared(@Param("token") token: string) {
    return this.svc.getSharedReport(token);
  }

  // ───────── 以下全部需登录 ─────────

  @Get("home")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "工作台首页聚合（今日日程/待办/本月收入/最近报告）" })
  getHome(@Req() req: Request) {
    return this.svc.getHome(req.user.id);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "从业者档案（会员状态 + 品牌落款 + 执业统计）" })
  getProfile(@Req() req: Request) {
    return this.svc.getProfile(req.user.id);
  }

  @Get("pro")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "从业者会员状态与价格（¥/月·价格真源 CommissionConfig）" })
  getPro(@Req() req: Request) {
    return this.svc.getProStatus(req.user.id);
  }

  @Put("brand")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "保存品牌落款（会员专属）" })
  @ApiResponse({ status: 403, description: "非会员" })
  updateBrand(@Req() req: Request, @Body() dto: Record<string, string>) {
    return this.svc.updateBrand(req.user.id, dto);
  }

  // ───────── 报告工坊 ─────────

  @Get("reports")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "报告列表（含配额）" })
  listReports(@Req() req: Request, @Query("status") status?: string, @Query("keyword") keyword?: string) {
    return this.svc.listReports(req.user.id, { status, keyword });
  }

  @Post("reports")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "新建报告（免费版限 3 份）" })
  createReport(@Req() req: Request, @Body() dto: any) {
    return this.svc.createReport(req.user.id, dto);
  }

  @Post("reports/ai-draft")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "AI 起草某一章节（盘面由前端引擎算好后传入·AI 只写解读）" })
  aiDraft(
    @Body() dto: { chapterTitle: string; reportTypeLabel: string; clientName: string; paipan: unknown; hint?: string },
  ) {
    return this.ai.draftChapter(dto);
  }

  @Get("reports/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "报告详情" })
  getReport(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getReport(req.user.id, id);
  }

  @Put("reports/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "保存报告" })
  updateReport(@Req() req: Request, @Param("id") id: string, @Body() dto: any) {
    return this.svc.updateReport(req.user.id, id, dto);
  }

  @Delete("reports/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除报告" })
  deleteReport(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteReport(req.user.id, id);
  }

  @Post("reports/:id/share")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "生成只读交付链接（会员专属）" })
  @ApiResponse({ status: 403, description: "非会员" })
  shareReport(@Req() req: Request, @Param("id") id: string) {
    return this.svc.shareReport(req.user.id, id);
  }

  @Delete("reports/:id/share")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "撤回交付链接" })
  unshareReport(@Req() req: Request, @Param("id") id: string) {
    return this.svc.unshareReport(req.user.id, id);
  }

  // ───────── 案例库 ─────────

  @Get("cases")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "案例库列表" })
  listCases(@Req() req: Request, @Query("category") category?: string, @Query("keyword") keyword?: string) {
    return this.svc.listCases(req.user.id, { category, keyword });
  }

  @Post("cases")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "新建案例（可由报告归档）" })
  createCase(@Req() req: Request, @Body() dto: any) {
    return this.svc.createCase(req.user.id, dto);
  }

  @Put("cases/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑案例" })
  updateCase(@Req() req: Request, @Param("id") id: string, @Body() dto: any) {
    return this.svc.updateCase(req.user.id, id, dto);
  }

  @Delete("cases/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除案例" })
  deleteCase(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteCase(req.user.id, id);
  }

  // ───────── 执业日程 ─────────

  @Get("appointments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "预约日程列表" })
  listAppointments(
    @Req() req: Request,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listAppointments(req.user.id, { from, to, status });
  }

  @Post("appointments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "新建预约" })
  createAppointment(@Req() req: Request, @Body() dto: any) {
    return this.svc.createAppointment(req.user.id, dto);
  }

  @Put("appointments/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑预约（改期/确认/完成）" })
  updateAppointment(@Req() req: Request, @Param("id") id: string, @Body() dto: any) {
    return this.svc.updateAppointment(req.user.id, id, dto);
  }

  @Delete("appointments/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除预约" })
  deleteAppointment(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteAppointment(req.user.id, id);
  }

  // ───────── 收入账本（平台内收入只读 + 线下手记）─────────

  @Get("ledger")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "月度账本（平台收益 + 线下手记合并）" })
  getLedger(@Req() req: Request, @Query("month") month?: string) {
    return this.svc.getLedger(req.user.id, { month });
  }

  @Post("ledger")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "手工记一笔线下收入" })
  createLedger(@Req() req: Request, @Body() dto: any) {
    return this.svc.createLedgerEntry(req.user.id, dto);
  }

  @Delete("ledger/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除一笔线下手记（平台收益不可删）" })
  deleteLedger(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteLedgerEntry(req.user.id, id);
  }
}
