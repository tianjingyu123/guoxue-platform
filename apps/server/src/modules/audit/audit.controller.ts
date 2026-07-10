import { Controller, Get, Post, Put, Delete, Body, Query, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ThrottleGuard } from "../../common/throttle.guard";
import { AuditService } from "./audit.service";
import { ReportService, CreateReportDto, HandleReportDto } from "./report.service";
import { SensitiveWordService, SensitiveCategory } from "./sensitive-word.service";
import { ComplianceScanService } from "./compliance-scan.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { AuditListQueryDto, ModerateImageDto, ModerateTextDto, OperationLogListQueryDto, AddSensitiveWordDto, AddSensitiveWordsDto, CheckSensitiveDto, ComplianceScanQueryDto, ComplianceScanStatusDto, ContentAuditListQueryDto, ContentAuditReviewDto } from "./audit.dto";

@ApiTags("审核与审计")
@Controller("audit")
export class AuditController {
  constructor(
    private svc: AuditService,
    private report: ReportService,
    private sensitiveWord: SensitiveWordService,
    private complianceScan: ComplianceScanService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "查询操作审计日志" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  list(@Query() q: AuditListQueryDto) {
    return this.svc.list(q);
  }

  @Post("moderate/image")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "图片内容审核" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  moderateImage(
    @Body() body: ModerateImageDto,
  ) {
    return this.svc.moderateImage(body.imageUrl || "", body.bizType);
  }

  @Post("moderate/text")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "文本内容审核" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  moderateText(
    @Body() body: ModerateTextDto,
  ) {
    return this.svc.moderateText(body.content, body.bizType, body.dataId);
  }

  // ─── 举报管理 ───

  @Post("reports")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交举报" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  submitReport(@Req() req: Request, @Body() dto: CreateReportDto) {
    return this.report.submit(req.user.id, dto);
  }

  @Get("reports")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "获取举报列表（管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listReports(
    @Query("status") status?: string,
    @Query("targetType") targetType?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.report.list({ status, targetType, page: +page, pageSize: +pageSize });
  }

  @Put("reports/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "处理举报" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  handleReport(@Param("id") id: string, @Body() dto: HandleReportDto) {
    return this.report.handle(id, dto);
  }

  @Get("reports/stats/:type/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询内容举报统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getReportStats(@Param("type") type: string, @Param("id") id: string) {
    return this.report.getTargetStats(type, id);
  }

  // ─── 敏感词管理 ───

  @Get("sensitive-words")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "获取敏感词列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listSensitiveWords(@Query("category") category?: string) {
    return {
      words: this.sensitiveWord.listWords(),
      entries: this.sensitiveWord.listEntries(category as SensitiveCategory | undefined),
    };
  }

  @Post("sensitive-words")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "添加敏感词" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  addSensitiveWord(@Body() body: AddSensitiveWordDto) {
    return this.sensitiveWord.addWord(body.word, body.category ?? "GENERAL", body.replacement, body.remark);
  }

  @Post("sensitive-words/batch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "批量添加敏感词" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  addSensitiveWords(@Body() body: AddSensitiveWordsDto) {
    return this.sensitiveWord.addWords(body.words, body.category ?? "GENERAL");
  }

  @Delete("sensitive-words/:word")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "删除敏感词" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  removeSensitiveWord(@Param("word") word: string) {
    return this.sensitiveWord.removeWord(word);
  }

  @Post("sensitive-words/check")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "检测文本敏感词（需登录）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  checkSensitive(@Body() body: CheckSensitiveDto) {
    const hits = this.sensitiveWord.check(body.text);
    return { hasSensitive: hits.length > 0, hits };
  }

  // ─── 合规违禁词扫描（合-P1）───

  @Post("compliance-scan")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "手动触发全站合规扫描（产出扫描报告与复核队列记录）" })
  @ApiResponse({ status: 201, description: "扫描完成，返回报告" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  triggerComplianceScan() {
    return this.complianceScan.scanAll();
  }

  @Get("compliance-scan/records")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "合规扫描记录列表（复核队列）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  listComplianceRecords(@Query() q: ComplianceScanQueryDto) {
    return this.complianceScan.listRecords(q);
  }

  @Get("compliance-scan/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "合规扫描统计（按状态×级别）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  complianceStats() {
    return this.complianceScan.stats();
  }

  @Put("compliance-scan/records/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "处置合规扫描记录（RESOLVED已整改/IGNORED误报忽略/OPEN重开）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  updateComplianceStatus(@Req() req: Request, @Param("id") id: string, @Body() dto: ComplianceScanStatusDto) {
    return this.complianceScan.updateStatus(id, dto.status, req.user.id);
  }

  // ─── 平台内容审核（开放范围=PLATFORM 的五类内容统一审核队列）───

  @Get("content-audits/mine")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的发布审核状态（C端·仅本人提交的平台开放申请）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  myContentAudits(@Req() req: Request, @Query() q: ContentAuditListQueryDto) {
    return this.svc.listContentAudits({
      finalStatus: q.finalStatus || "ALL",
      contentType: q.contentType,
      page: q.page,
      pageSize: q.pageSize,
      submitterId: req.user.id,
    });
  }

  @Get("content-audits")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "平台内容审核队列（向全平台开放必审·五类内容统一台账）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  listContentAudits(@Query() q: ContentAuditListQueryDto) {
    return this.svc.listContentAudits(q);
  }

  @Put("content-audits/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "审核裁决（通过→进平台公共池 / 驳回→记原因·内容保持圈内可见）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "记录已审结" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  reviewContent(@Req() req: Request, @Param("id") id: string, @Body() dto: ContentAuditReviewDto) {
    return this.svc.reviewContent(id, req.user.id, dto.action, dto.reason);
  }

  // ─── 平台操作日志 ───

  @Get("operation-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "查询平台操作日志" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  listOperationLogs(@Query() q: OperationLogListQueryDto) {
    return this.svc.listOperationLogs(q);
  }

  @Get("operation-logs/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "查看操作日志详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  getOperationLog(@Param("id") id: string) {
    return this.svc.getOperationLog(id);
  }
}
