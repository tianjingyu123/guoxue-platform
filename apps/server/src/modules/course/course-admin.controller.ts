import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { CourseService } from "./course.service";
import { SystemService } from "../system/system.service";
import { AnswerQuestionDto } from "./course.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; roles?: string[]; [key: string]: unknown };
};

@ApiTags("课程管理")
@Controller("courses")
export class CourseAdminController {
  private readonly logger = new Logger(CourseAdminController.name);
  constructor(
    private course: CourseService,
    private systemService: SystemService,
  ) {}

  // ───────── 审核 ─────────

  @Put("batch/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量审核课程" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async batchAudit(@Body("ids") ids: string[], @Body("status") status: string, @Req() req: AuthRequest) {
    const result = await this.course.batchAudit(ids, status);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "BATCH_AUDIT",
      targetType: "COURSE",
      detail: `批量审核: ${ids.length}门课程 → ${status}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
  }

  @Put(":id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  // 权限修复(角色断裂)：内容审核员负责课程审核，放行 CONTENT_AUDITOR。
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "审核课程" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async audit(
    @Param("id") id: string,
    @Body("status") status: string,
    @Req() req: AuthRequest,
    @Body("reason") reason?: string,
  ) {
    const result = await this.course.audit(id, status);
    // Course 模型无审核理由字段(仅 auditStatus)，reason 记入审计日志留痕，不加迁移
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "AUDIT",
      targetType: "COURSE",
      targetId: id,
      detail: `审核课程: ${status}${reason ? `，理由: ${reason}` : ""}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
  }

  // ───────── 强制操作 ─────────

  @Delete(":id/force")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员强制删除课程" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async forceDelete(@Param("id") id: string, @Req() req: AuthRequest) {
    const result = await this.course.forceDelete(id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "FORCE_DELETE",
      targetType: "COURSE",
      targetId: id,
      detail: `管理员强制删除课程`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
  }

  @Put(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员强制变更课程状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async forceStatus(@Param("id") id: string, @Body("status") status: string, @Req() req: AuthRequest) {
    const result = await this.course.forceStatus(id, status);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "FORCE_STATUS",
      targetType: "COURSE",
      targetId: id,
      detail: `强制状态变更: ${status}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
  }

  // ───────── 学员管理 ─────────

  @Get(":id/students")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看课程学员列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getCourseStudents(@Param("id") courseId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.course.getCourseStudents(courseId, +page, +pageSize);
  }

  @Get(":id/students/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "查看学生详细学习进度" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getStudentProgress(@Param("id") courseId: string, @Param("userId") userId: string) {
    return this.course.getStudentProgress(courseId, userId);
  }

  // ───────── 评价管理 ─────────

  @Put("reviews/:reviewId/reply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员回复评价" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  replyReview(@Param("reviewId") reviewId: string, @Body("reply") reply: string) {
    return this.course.replyReview(reviewId, reply);
  }

  @Put("reviews/:reviewId/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员隐藏/恢复评价" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  toggleReviewStatus(@Param("reviewId") reviewId: string, @Body("status") status: string) {
    return this.course.toggleReviewStatus(reviewId, status);
  }

  @Get(":id/reviews/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看所有评价（含隐藏）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  listAllReviews(@Param("id") courseId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status?: string) {
    return this.course.listAllReviews(courseId, +page, +pageSize, status);
  }

  // ───────── 作业批改 ─────────

  @Put("works/:workId/score")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批改作业评分（管理员/讲师/助教）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  scoreWork(
    @Param("workId") workId: string,
    @Req() req: AuthRequest,
    @Body("score") score: number,
    @Body("feedback") feedback?: string,
  ) {
    const isAdmin = (req.user.roles)?.some((r: string) => ['SUPER_ADMIN', 'OPERATION_ADMIN'].includes(r)) ?? false;
    return this.course.scoreWork(workId, req.user.id, score, isAdmin, feedback);
  }

  @Post("works/:workId/ai-score")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "AI 自动批改作业" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  aiScoreWork(@Param("workId") workId: string) {
    return this.course.aiScoreWork(workId);
  }

  @Post(":id/works/ai-batch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "AI 批量批改课程作业" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "chapterId", required: false })
  aiBatchScoreWorks(@Param("id") courseId: string, @Query("chapterId") chapterId?: string) {
    return this.course.aiBatchScoreWorks(courseId, chapterId);
  }

  // ───────── 问答管理 ─────────

  @Put("questions/:qaId/answer")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "回答/回复问题" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  answerQuestion(@Req() req: AuthRequest, @Param("qaId") qaId: string, @Body() dto: AnswerQuestionDto) {
    return this.course.answerQuestion(qaId, req.user.id, dto);
  }

  @Post("questions/:qaId/ai-suggest")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "AI 生成回答建议" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  aiSuggestAnswer(@Param("qaId") qaId: string) {
    return this.course.aiSuggestAnswer(qaId);
  }
}
