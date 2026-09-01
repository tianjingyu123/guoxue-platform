import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { InstituteService } from "./institute.service";
import { InstituteAssessmentService } from "./institute-assessment.service";
import { InstituteBoardService } from "./institute-board.service";
import { LectureArchiveService } from "./lecture-archive.service";
import {
  JoinInstituteDto,
  CreateTaskDto,
  CreateEventDto,
  UpdateEventDto,
  UpdateLecturerLevelDto,
  CreateTaskTemplateDto,
  CreateDividendDto,
  ApproveMemberDto,
  AssignRoleDto,
  UpdateMemberDto,
  RecommendToTalentDto,
  AddSharePointDto,
  InviteMemberDto,
  CreateBoardGroupDto,
  ArchiveLectureDto,
} from "./institute.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("研究院")
@Controller("institute")
export class InstituteController {
  constructor(
    private svc: InstituteService,
    private assessment: InstituteAssessmentService,
    private board: InstituteBoardService,
    private lectureArchive: LectureArchiveService,
  ) {}

  // ════════════════════════════════════════
  // 公开页
  // ════════════════════════════════════════

  @Get("intro")
  @ApiOperation({ summary: "研究院介绍（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  getIntro() {
    return this.svc.getIntro();
  }

  @Get("members")
  @ApiOperation({ summary: "研究院成员列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "role", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "joinYear", required: false, type: Number })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listMembers(
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("joinYear") joinYear?: number,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listMembers({
      role,
      status,
      joinYear: joinYear ? +joinYear : undefined,
      page: +page,
      pageSize: +pageSize,
    });
  }

  @Get("members/:id")
  @ApiOperation({ summary: "成员详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getMember(@Param("id") id: string) {
    return this.svc.getMember(id);
  }

  @Get("events")
  @ApiOperation({ summary: "活动列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "upcoming", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listEvents(
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("upcoming") upcoming?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listEvents({
      type,
      status,
      upcoming: upcoming === "true",
      page: +page,
      pageSize: +pageSize,
    });
  }

  @Get("talent-pool")
  @ApiOperation({ summary: "线下老师人才库（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "level", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getTalentPool(
    @Query("level") level?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getTalentPool({ level, page: +page, pageSize: +pageSize });
  }

  @Get("events/:id")
  @ApiOperation({ summary: "活动详情（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getEvent(@Param("id") id: string) {
    return this.svc.getEvent(id);
  }

  @Get("signed-lecturers")
  @ApiOperation({ summary: "签约讲师库（供驿站选用·含已入驻驿站）" })
  @ApiResponse({ status: 200, description: "成功" })
  getSignedLecturers() {
    return this.svc.getSignedLecturers();
  }

  @Get("lectures")
  @ApiOperation({
    summary:
      "大师讲座列表（公开·研-P1·Course.courseOrigin=INSTITUTE_LECTURE·仅过审·附讲师徽章信息）",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listLectures(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.lectureArchive.listLectures(+page, +pageSize);
  }

  @Post("lectures/archive")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "归档大师讲座（研究院管理层·选回放/直播间→沉淀为讲座课程·auditStatus 走课程审核流）",
  })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/无回放/讲师非本院成员/重复归档" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅研究院管理层可操作" })
  @ApiBearerAuth()
  archiveLecture(@Req() req: Request, @Body() dto: ArchiveLectureDto) {
    return this.lectureArchive.archiveLecture(req.user.id, dto);
  }

  @Get("rankings")
  @ApiOperation({
    summary: "讲师影响力榜单（公开·默认当年·任务40%+授课30%+驿站20%+资历10%·不含收入）",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "year", required: false, type: Number, description: "榜单年度（默认当年）" })
  getRankings(@Query("year") year?: string) {
    return this.svc.getRankings(year ? +year : undefined);
  }

  // ════════════════════════════════════════
  // 成员 — 加入
  // ════════════════════════════════════════

  @Get("eligibility")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "入会资格自动校验（讲席五维/研修席三维·T9-P1）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "seatType", required: false, description: "席位类型 LECTURE（默认）/ STUDY" })
  @ApiBearerAuth()
  getEligibility(@Req() req: Request, @Query("seatType") seatType?: string) {
    return this.assessment.getEligibility(req.user.id, seatType);
  }

  @Post("members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请加入研究院" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  join(@Req() req: Request, @Body() dto: JoinInstituteDto) {
    return this.svc.join(req.user.id, dto);
  }

  // ════════════════════════════════════════
  // 成员个人中心
  // ════════════════════════════════════════

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的研究院信息（含任务进度和保证金状态）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  myMembership(@Req() req: Request) {
    return this.svc.getMyDashboard(req.user.id);
  }

  @Get("my/tasks")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的任务列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  myTasks(@Req() req: Request) {
    return this.svc.getMyTasks(req.user.id);
  }

  @Post("my/tasks/:id/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交任务完成" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  completeMyTask(@Param("id") taskId: string, @Req() req: Request) {
    return this.svc.completeTask(taskId, req.user.id);
  }

  @Post("my/deposit-refund")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请保证金退还" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  requestDepositRefund(@Req() req: Request) {
    return this.svc.requestDepositRefund(req.user.id);
  }

  @Get("my/assessment")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的年度考核（积分/季度线/线下三选一/四档判定·V5）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "不是研究院成员" })
  @ApiBearerAuth()
  myAssessment(@Req() req: Request) {
    return this.assessment.getMyAssessment(req.user.id);
  }

  @Get("my/dividends")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的分红/奖励记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  myDividends(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getMyDividends(req.user.id, +page, +pageSize);
  }

  // ════════════════════════════════════════
  // 管理层中心
  // ════════════════════════════════════════

  @Get("manage/overview")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "管理层首页统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  manageOverview(@Req() req: Request) {
    return this.svc.getManageOverview(req.user.id);
  }

  @Get("manage/pending-members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "待审核成员列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  pendingMembers(@Req() req: Request) {
    return this.svc.getPendingMembers(req.user.id);
  }

  @Put("manage/members/:id/approve")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "审核成员（通过/拒绝）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  approveMember(@Req() req: Request, @Param("id") id: string, @Body() dto: ApproveMemberDto) {
    return this.svc.approveMember(req.user.id, id, dto.status, dto.reason);
  }

  @Put("manage/members/:id/role")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "任命管理层角色（主席/副主席/秘书长）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  assignRole(@Req() req: Request, @Param("id") id: string, @Body() dto: AssignRoleDto) {
    return this.svc.assignMemberRole(req.user.id, id, dto.role);
  }

  @Get("manage/finance")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "研究院财务概览（研究院管理层；平台 SUPER/OPERATION/FINANCE_ADMIN 免会籍可查）",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅研究院管理层可操作" })
  @ApiBearerAuth()
  manageFinance(@Req() req: Request, @Query("period") period?: string) {
    // 平台管理角色（含财务）后台查账免研究院会籍；C 端（非管理角色）走原管理层会籍校验，行为零变化
    const roles = req.user.roles ?? [];
    const asAdmin = ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"].some((r) =>
      roles.includes(r as (typeof roles)[number]),
    );
    return this.svc.getFinanceOverview(req.user.id, period, { asAdmin });
  }

  @Post("manage/dividends")
  @RedLineGate(RedLine.MONEY)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发起分红/奖励分配审批（通过后生成分配记录，非到账凭证）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createDividend(@Req() req: Request, @Body() dto: CreateDividendDto) {
    return this.svc.requestDividend(req.user.id, dto);
  }

  @Post("manage/members/:id/points")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "人工记分/积分调整（研究院管理层·可负分纠错·记录操作者）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅研究院管理层可操作" })
  @ApiResponse({ status: 404, description: "成员不存在" })
  @ApiBearerAuth()
  addMemberPoints(@Req() req: Request, @Param("id") id: string, @Body() dto: AddSharePointDto) {
    return this.assessment.addManualPoints(req.user.id, id, dto);
  }

  @Put("manage/members/:id/recommend")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "推荐成员进入人才库" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  recommendToTalent(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: RecommendToTalentDto,
  ) {
    return this.svc.recommendToTalentPool(req.user.id, id, dto.lecturerLevel);
  }

  // ════════════════════════════════════════
  // 私董会小组（T9 §3.6.5·承载=私密子圈）
  // ════════════════════════════════════════

  @Get("board-groups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "私董会小组列表（本院 ACTIVE 成员可见·实时人数/满员/已入组标注·入组走圈子详情 join 审批流）",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅研究院成员可查看" })
  @ApiBearerAuth()
  listBoardGroups(@Req() req: Request) {
    return this.board.listBoardGroups(req.user.id);
  }

  @Post("manage/board-groups")
  @RedLineGate(RedLine.USER_DATA, RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "创建私董会小组（研究院管理层·建私密圈 FREE+needApproval·圈主=组长（本院 ACTIVE 讲席））",
  })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/组长非本院讲席成员" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅研究院管理层可操作" })
  @ApiBearerAuth()
  createBoardGroup(@Req() req: Request, @Body() dto: CreateBoardGroupDto) {
    return this.board.createBoardGroup(req.user.id, dto);
  }

  @Put("manage/board-groups/:id/disband")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "解散私董会小组（研究院管理层·标记 DISBANDED·圈子本体保留由圈主自管）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "小组已解散" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅研究院管理层可操作" })
  @ApiResponse({ status: 404, description: "小组不存在" })
  @ApiBearerAuth()
  disbandBoardGroup(@Req() req: Request, @Param("id") id: string) {
    return this.board.disbandBoardGroup(req.user.id, id);
  }

  // ════════════════════════════════════════
  // 管理后台：任务模板
  // ════════════════════════════════════════

  @Get("task-templates")
  @ApiOperation({ summary: "任务模板列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listTaskTemplates() {
    return this.svc.listTaskTemplates();
  }

  @Post("task-templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建任务模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createTaskTemplate(@Body() dto: CreateTaskTemplateDto) {
    return this.svc.createTaskTemplate(dto);
  }

  @Put("task-templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新任务模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateTaskTemplate(@Param("id") id: string, @Body() dto: CreateTaskTemplateDto) {
    return this.svc.updateTaskTemplate(id, dto);
  }

  // ════════════════════════════════════════
  // 事件管理（管理员）
  // ════════════════════════════════════════

  @Post("events")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建活动排期" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createEvent(@Req() req: Request, @Body() dto: CreateEventDto) {
    return this.svc.createEvent(req.user.id, dto);
  }

  @Put("events/:id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新活动" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateEvent(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.svc.updateEvent(id, dto);
  }

  // ════════════════════════════════════════
  // 管理员接口
  // ════════════════════════════════════════

  @Get("admin/members")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "平台后台研究院成员列表（含特邀与免会费留痕）" })
  @ApiBearerAuth()
  listAdminMembers(
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("joinYear") joinYear?: number,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listAdminMembers({
      role,
      status,
      joinYear: joinYear ? +joinYear : undefined,
      page: +page,
      pageSize: +pageSize,
    });
  }
  @Post("admin/members/invite")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({
    summary: "特邀席位：名师破格引入（平台管理·跳过全部准入门槛·可设永久免会费·操作留痕）",
  })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败/已是研究院成员" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "被特邀用户不存在" })
  @ApiBearerAuth()
  inviteMember(@Req() req: Request, @Body() dto: InviteMemberDto) {
    return this.svc.inviteMember(req.user.id, dto);
  }

  @Put("members/:id")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新研究院成员信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateMember(@Param("id") id: string, @Body() dto: UpdateMemberDto) {
    return this.svc.updateMember(id, dto);
  }

  @Put("members/:id/lecturer-level")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新讲师等级" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateLecturerLevel(@Param("id") id: string, @Body() dto: UpdateLecturerLevelDto) {
    return this.svc.updateLecturerLevel(id, dto);
  }

  @Get("candidates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "候选签约讲师" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getCandidates() {
    return this.svc.getSigningCandidates();
  }

  // 任务管理（保留兼容）
  @Post("members/:id/tasks")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加年度任务（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  addTask(@Param("id") memberId: string, @Body() dto: CreateTaskDto) {
    return this.svc.addTask(memberId, dto);
  }

  @Post("tasks/:id/verify")
  @RedLineGate(RedLine.USER_DATA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "验证任务" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  verifyTask(@Param("id") taskId: string, @Req() req: Request) {
    return this.svc.verifyTask(taskId, req.user.id);
  }
}
