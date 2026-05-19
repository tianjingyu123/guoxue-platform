import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { CourseService } from "./course.service";
import { SystemService } from "../system/system.service";
import { LiveService } from "../live/live.service";
import {
  CreateCourseDto, UpdateCourseDto,
  CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto,
  CourseListQueryDto,
  PurchaseCourseDto, CreateReviewDto, ReviewListQueryDto,
  AskQuestionDto, AnswerQuestionDto, QaListQueryDto,
} from "./course.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StationId } from "../../common/station-id.decorator";

/** 已认证请求，附带 JWT 解析后的 user 信息 */
type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; [key: string]: unknown };
};

@ApiTags("课程")
@Controller("courses")
export class CourseController {
  private readonly logger = new Logger(CourseController.name);
  constructor(
    private course: CourseService,
    private systemService: SystemService,
    private liveService: LiveService,
  ) {}

  // ───────── 课程 CRUD ─────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建课程" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未认证" })
  async create(@Req() req: AuthRequest, @Body() dto: CreateCourseDto) {
    const result = await this.course.create(req.user.id, dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "CREATE",
      targetType: "COURSE",
      targetId: result.id,
      detail: `创建课程: ${dto.title}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Get()
  @ApiOperation({ summary: "获取课程列表" })
  @ApiResponse({ status: 200, description: "成功返回课程列表" })
  list(@Query() q: CourseListQueryDto, @StationId() stationId?: string) {
    return this.course.listCourses({
      page: q.page || 1,
      pageSize: q.pageSize || 20,
      circleId: q.circleId,
      auditStatus: q.auditStatus,
      stationId: stationId || q.stationId,
      type: q.type,
      keyword: q.keyword,
    });
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我购买的课程" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回已购课程" })
  @ApiResponse({ status: 401, description: "未认证" })
  getMyCourses(@Req() req: AuthRequest, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.course.getMyCourses(req.user.id, page || 1, pageSize || 20);
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的学习看板" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回学习看板数据" })
  @ApiResponse({ status: 401, description: "未认证" })
  getMyDashboard(@Req() req: AuthRequest) {
    return this.course.getMyLearningDashboard(req.user.id);
  }

  @Get("user/valid")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取用户有效期内课程列表" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回有效课程列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  getUserValidCourses(@Req() req: AuthRequest) {
    return this.course.getUserValidCourses(req.user.id);
  }

  @Get(":id/expiry-check")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "检查课程是否过期" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回过期检查结果" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  checkCourseExpiry(@Req() req: AuthRequest, @Param("id") courseId: string) {
    return this.course.checkCourseExpiry(req.user.id, courseId);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取课程详情" })
  @ApiResponse({ status: 200, description: "成功返回课程详情" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  detail(@Param("id") id: string) {
    return this.course.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新课程" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（只能编辑自己的课程）" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  async update(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: UpdateCourseDto) {
    const result = await this.course.update(id, req.user.id, dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "COURSE",
      targetId: id,
      detail: `更新课程: ${dto.title || id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除课程" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（只能删除自己的课程）" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  async delete(@Param("id") id: string, @Req() req: AuthRequest) {
    const result = await this.course.delete(id, req.user.id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "DELETE",
      targetType: "COURSE",
      targetId: id,
      detail: `删除课程: ${id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 审核 ─────────

  @Put(":id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核课程" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "审核成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需管理员）" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  async audit(@Param("id") id: string, @Body("status") status: string, @Req() req: AuthRequest) {
    const result = await this.course.audit(id, status);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "AUDIT",
      targetType: "COURSE",
      targetId: id,
      detail: `审核课程: ${status}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 课程购买 ─────────

  @Post(":id/purchase")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "购买课程（创建订单）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "订单创建成功" })
  @ApiResponse({ status: 400, description: "已购买或课程不存在" })
  @ApiResponse({ status: 401, description: "未认证" })
  purchase(@Req() req: AuthRequest, @Param("id") courseId: string, @Body() dto?: PurchaseCourseDto) {
    return this.course.purchase(req.user.id, courseId, dto);
  }

  @Get(":id/access")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "检查课程访问权限" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回是否有权限" })
  @ApiResponse({ status: 401, description: "未认证" })
  async checkAccess(@Req() req: AuthRequest, @Param("id") courseId: string) {
    const hasAccess = await this.course.checkAccess(req.user.id, courseId);
    return { hasAccess };
  }

  // ───────── 章节管理 ─────────

  @Post(":id/chapters")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加课程章节" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "添加成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  addChapter(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: CreateChapterDto) {
    return this.course.addChapter(id, req.user.id, dto);
  }

  @Get(":id/chapters")
  @ApiOperation({ summary: "获取课程章节列表（仅元数据）" })
  @ApiResponse({ status: 200, description: "成功返回章节列表" })
  getChapters(@Param("id") id: string) {
    return this.course.getChapters(id);
  }

  @Get("chapters/:chapterId/content")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取章节完整内容（需购买权限）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回章节内容" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "未购买课程" })
  @ApiResponse({ status: 404, description: "章节不存在" })
  getChapterContent(@Req() req: AuthRequest, @Param("chapterId") chapterId: string) {
    return this.course.getChapterContent(req.user.id, chapterId);
  }

  @Put(":id/chapters/:chapterId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新课程章节" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "章节不存在" })
  updateChapter(
    @Param("id") id: string,
    @Param("chapterId") chapterId: string,
    @Req() req: AuthRequest,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.course.updateChapter(chapterId, id, req.user.id, dto);
  }

  @Delete(":id/chapters/:chapterId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除课程章节" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "章节不存在" })
  deleteChapter(
    @Param("id") id: string,
    @Param("chapterId") chapterId: string,
    @Req() req: AuthRequest,
  ) {
    return this.course.deleteChapter(chapterId, id, req.user.id);
  }

  // ───────── 学习进度 ─────────

  @Put("chapters/:chapterId/progress")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新学习进度" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "章节不存在" })
  updateProgress(@Req() req: AuthRequest, @Param("chapterId") chapterId: string, @Body() dto: UpdateProgressDto) {
    return this.course.updateProgress(req.user.id, chapterId, dto);
  }

  @Get(":id/progress")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的学习进度" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回学习进度" })
  @ApiResponse({ status: 401, description: "未认证" })
  getMyProgress(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.course.getMyProgress(req.user.id, id);
  }

  // ───────── 作业 ─────────

  @Post("chapters/:chapterId/works")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交作业" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "章节不存在" })
  submitWork(@Req() req: AuthRequest, @Param("chapterId") chapterId: string, @Body() dto: SubmitWorkDto) {
    return this.course.submitWork(req.user.id, chapterId, dto);
  }

  @Get(":id/works")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取作业列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "chapterId", required: false, type: String, description: "章节ID" })
  @ApiResponse({ status: 200, description: "成功返回作业列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  getWorks(
    @Param("id") id: string,
    @Query("chapterId") chapterId?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return this.course.getWorks(id, chapterId, page || 1, pageSize || 20);
  }

  @Put("works/:workId/score")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批改作业评分（管理员/讲师/助教）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "评分成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "作业不存在" })
  scoreWork(
    @Param("workId") workId: string,
    @Req() req: AuthRequest,
    @Body("score") score: number,
    @Body("feedback") feedback?: string,
  ) {
    const isAdmin = (req.user.roles as string[])?.some((r: string) => ['SUPER_ADMIN', 'OPERATION_ADMIN'].includes(r));
    return this.course.scoreWork(workId, req.user.id, score, isAdmin, feedback);
  }

  @Post("works/:workId/ai-score")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "AI 自动批改作业" })
  @ApiBearerAuth()
  aiScoreWork(@Param("workId") workId: string) {
    return this.course.aiScoreWork(workId);
  }

  @Post(":id/works/ai-batch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "AI 批量批改课程作业" })
  @ApiBearerAuth()
  @ApiQuery({ name: "chapterId", required: false })
  aiBatchScoreWorks(@Param("id") courseId: string, @Query("chapterId") chapterId?: string) {
    return this.course.aiBatchScoreWorks(courseId, chapterId);
  }

  // ───────── 课程评价 ─────────

  @Post(":id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建课程评价" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "评价成功" })
  @ApiResponse({ status: 400, description: "已评价或参数错误" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "未购买课程" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  createReview(@Req() req: AuthRequest, @Param("id") courseId: string, @Body() dto: CreateReviewDto) {
    return this.course.createReview(req.user.id, courseId, dto);
  }

  @Get(":id/reviews")
  @ApiOperation({ summary: "获取课程评价列表" })
  @ApiResponse({ status: 200, description: "成功返回评价列表" })
  getReviews(@Param("id") courseId: string, @Query() q: ReviewListQueryDto) {
    return this.course.listReviews(courseId, q.page || 1, q.pageSize || 20);
  }

  @Get(":id/rating")
  @ApiOperation({ summary: "获取课程评分统计" })
  @ApiResponse({ status: 200, description: "成功返回评分统计" })
  getRating(@Param("id") courseId: string) {
    return this.course.getCourseRating(courseId);
  }

  // ───────── 讲师统计 ─────────

  @Get(":id/stats")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取课程统计（讲师）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回统计数据" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "只能查看自己课程的统计" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  getStats(@Req() req: AuthRequest, @Param("id") courseId: string) {
    return this.course.getCourseStats(req.user.id, courseId);
  }

  // ───────── 课程直播联动 ─────────

  @Get(":id/live-rooms")
  @ApiOperation({ summary: "获取课程关联的直播间列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiResponse({ status: 200, description: "成功返回直播间列表" })
  getLiveRooms(@Param("id") courseId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.liveService.listCourseRooms(courseId, +page, +pageSize);
  }

  // ───────── 管理端 — 学员管理 ─────────

  @Get(":id/students")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看课程学员列表" })
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
  @ApiBearerAuth()
  getStudentProgress(@Param("id") courseId: string, @Param("userId") userId: string) {
    return this.course.getStudentProgress(courseId, userId);
  }

  // ───────── 管理端 — 批量操作 ─────────

  @Put("batch/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量审核课程" })
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

  @Delete(":id/force")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "管理员强制删除课程" })
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

  // ───────── 管理端 — 评价管理 ─────────

  @Put("reviews/:reviewId/reply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员回复评价" })
  @ApiBearerAuth()
  replyReview(@Param("reviewId") reviewId: string, @Body("reply") reply: string) {
    return this.course.replyReview(reviewId, reply);
  }

  @Put("reviews/:reviewId/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员隐藏/恢复评价" })
  @ApiBearerAuth()
  toggleReviewStatus(@Param("reviewId") reviewId: string, @Body("status") status: string) {
    return this.course.toggleReviewStatus(reviewId, status);
  }

  @Get(":id/reviews/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看所有评价（含隐藏）" })
  @ApiBearerAuth()
  listAllReviews(@Param("id") courseId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("status") status?: string) {
    return this.course.listAllReviews(courseId, +page, +pageSize, status);
  }

  // ───────── 相关课程 ─────────

  @Get(":id/related")
  @ApiOperation({ summary: "获取相关课程推荐" })
  @ApiQuery({ name: "useAi", required: false, type: Boolean, description: "是否使用 AI 语义推荐" })
  getRelatedCourses(@Param("id") courseId: string, @Query("limit") limit = 6, @Query("useAi") useAi?: string) {
    return this.course.getRelatedCourses(courseId, +limit, useAi === "true" || useAi === "1");
  }

  // ───────── 课程问答 ─────────

  @Post(":id/questions")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "学生提问" })
  @ApiBearerAuth()
  askQuestion(@Req() req: AuthRequest, @Param("id") courseId: string, @Body() dto: AskQuestionDto) {
    return this.course.askQuestion(req.user.id, courseId, dto);
  }

  @Get(":id/questions")
  @ApiOperation({ summary: "课程问答列表" })
  @ApiQuery({ name: "chapterId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listQuestions(@Param("id") courseId: string, @Query() q: QaListQueryDto) {
    return this.course.listQuestions(courseId, q);
  }

  @Get(":id/questions/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的提问" })
  @ApiBearerAuth()
  getMyQuestions(@Req() req: AuthRequest, @Param("id") courseId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.course.getMyQuestions(req.user.id, courseId, +page, +pageSize);
  }

  @Get(":id/questions/tags")
  @ApiOperation({ summary: "课程问答标签列表" })
  getQuestionTags(@Param("id") courseId: string) {
    return this.course.getQuestionTags(courseId);
  }

  @Put("questions/:qaId/answer")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "回答/回复问题" })
  @ApiBearerAuth()
  answerQuestion(@Req() req: AuthRequest, @Param("qaId") qaId: string, @Body() dto: AnswerQuestionDto) {
    return this.course.answerQuestion(qaId, req.user.id, dto);
  }

  @Post("questions/:qaId/ai-suggest")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "AI 生成回答建议" })
  @ApiBearerAuth()
  aiSuggestAnswer(@Param("qaId") qaId: string) {
    return this.course.aiSuggestAnswer(qaId);
  }

  @Put("questions/:qaId/close")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "关闭问题" })
  @ApiBearerAuth()
  closeQuestion(@Req() req: AuthRequest, @Param("qaId") qaId: string) {
    return this.course.closeQuestion(qaId, req.user.id);
  }

  // ───────── 完成评估 + 证书 ─────────

  @Post(":id/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "标记课程完成" })
  @ApiBearerAuth()
  completeCourse(@Req() req: AuthRequest, @Param("id") courseId: string) {
    return this.course.completeCourse(req.user.id, courseId);
  }

  @Get(":id/certificate")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取结课证书数据" })
  @ApiBearerAuth()
  getCertificate(@Req() req: AuthRequest, @Param("id") courseId: string) {
    return this.course.getCertificate(req.user.id, courseId);
  }

  // ───────── 课程分类 ─────────

  @Get("categories")
  @ApiOperation({ summary: "获取课程品类树" })
  getCourseCategories() {
    return this.course.getCourseCategories();
  }

  // ───────── 草稿管理（讲师端）─────────

  @Get("drafts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的课程草稿" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getMyDrafts(@Req() req: AuthRequest, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.course.getMyDrafts(req.user.id, +page, +pageSize);
  }

  @Post("drafts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "保存课程草稿" })
  @ApiBearerAuth()
  saveDraft(@Req() req: AuthRequest, @Body() dto: CreateCourseDto) {
    return this.course.saveDraft(req.user.id, dto);
  }

  @Put("drafts/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新课程草稿" })
  @ApiBearerAuth()
  updateDraft(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: UpdateCourseDto) {
    return this.course.updateDraft(id, req.user.id, dto);
  }

  @Delete("drafts/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除课程草稿" })
  @ApiBearerAuth()
  deleteDraft(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.course.deleteDraft(id, req.user.id);
  }

  @Post("drafts/:id/publish")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发布课程草稿" })
  @ApiBearerAuth()
  publishDraft(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.course.publishDraft(id, req.user.id);
  }
}
