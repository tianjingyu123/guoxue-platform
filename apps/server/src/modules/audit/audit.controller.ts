import { Controller, Get, Post, Put, Delete, Body, Query, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ThrottleGuard } from "../../common/throttle.guard";
import { AuditService } from "./audit.service";
import { ReportService, CreateReportDto, HandleReportDto } from "./report.service";
import { SensitiveWordService } from "./sensitive-word.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { AuditListQueryDto, ModerateImageDto, ModerateTextDto, OperationLogListQueryDto, AddSensitiveWordDto, AddSensitiveWordsDto, CheckSensitiveDto } from "./audit.dto";

@ApiTags("审核与审计")
@Controller("audit")
export class AuditController {
  constructor(
    private svc: AuditService,
    private report: ReportService,
    private sensitiveWord: SensitiveWordService,
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
  listSensitiveWords() {
    return { words: this.sensitiveWord.listWords() };
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
    return this.sensitiveWord.addWord(body.word);
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
    return this.sensitiveWord.addWords(body.words);
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
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "检测文本敏感词（公开接口）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  checkSensitive(@Body() body: CheckSensitiveDto) {
    const hits = this.sensitiveWord.check(body.text);
    return { hasSensitive: hits.length > 0, hits };
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
