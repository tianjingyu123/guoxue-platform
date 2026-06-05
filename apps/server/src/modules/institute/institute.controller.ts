import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { InstituteService } from "./institute.service";
import { JoinInstituteDto, CreateTaskDto, CreateEventDto, UpdateEventDto, UpdateLecturerLevelDto, CreateTaskTemplateDto, CreateDividendDto, ApproveMemberDto, AssignRoleDto, UpdateMemberDto, RecommendToTalentDto } from "./institute.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("研究院")
@Controller("institute")
export class InstituteController {
  constructor(private svc: InstituteService) {}

  // ════════════════════════════════════════
  // 公开页
  // ════════════════════════════════════════

  @Get("intro")
  @ApiOperation({ summary: "研究院介绍（公开）" })
  getIntro() {
    return this.svc.getIntro();
  }

  @Get("members")
  @ApiOperation({ summary: "研究院成员列表" })
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
    return this.svc.listMembers({ role, status, joinYear: joinYear ? +joinYear : undefined, page: +page, pageSize: +pageSize });
  }

  @Get("members/:id")
  @ApiOperation({ summary: "成员详情" })
  getMember(@Param("id") id: string) {
    return this.svc.getMember(id);
  }

  @Get("events")
  @ApiOperation({ summary: "活动列表" })
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
    return this.svc.listEvents({ type, status, upcoming: upcoming === "true", page: +page, pageSize: +pageSize });
  }

  @Get("talent-pool")
  @ApiOperation({ summary: "线下老师人才库（公开）" })
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

  // ════════════════════════════════════════
  // 成员 — 加入
  // ════════════════════════════════════════

  @Post("members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请加入研究院" })
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
  @ApiBearerAuth()
  myMembership(@Req() req: Request) {
    return this.svc.getMyDashboard(req.user.id);
  }

  @Get("my/tasks")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的任务列表" })
  @ApiBearerAuth()
  myTasks(@Req() req: Request) {
    return this.svc.getMyTasks(req.user.id);
  }

  @Post("my/tasks/:id/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交任务完成" })
  @ApiBearerAuth()
  completeMyTask(@Param("id") taskId: string, @Req() req: Request) {
    return this.svc.completeTask(taskId, req.user.id);
  }

  @Post("my/deposit-refund")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "申请保证金退还" })
  @ApiBearerAuth()
  requestDepositRefund(@Req() req: Request) {
    return this.svc.requestDepositRefund(req.user.id);
  }

  @Get("my/dividends")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的分红/奖励记录" })
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
  @ApiBearerAuth()
  manageOverview(@Req() req: Request) {
    return this.svc.getManageOverview(req.user.id);
  }

  @Get("manage/pending-members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "待审核成员列表" })
  @ApiBearerAuth()
  pendingMembers(@Req() req: Request) {
    return this.svc.getPendingMembers(req.user.id);
  }

  @Put("manage/members/:id/approve")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "审核成员（通过/拒绝）" })
  @ApiBearerAuth()
  approveMember(@Req() req: Request, @Param("id") id: string, @Body() dto: ApproveMemberDto) {
    return this.svc.approveMember(req.user.id, id, dto.status, dto.reason);
  }

  @Put("manage/members/:id/role")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "任命管理层角色（主席/副主席/秘书长）" })
  @ApiBearerAuth()
  assignRole(@Req() req: Request, @Param("id") id: string, @Body() dto: AssignRoleDto) {
    return this.svc.assignMemberRole(req.user.id, id, dto.role);
  }

  @Get("manage/finance")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "研究院财务概览" })
  @ApiBearerAuth()
  manageFinance(@Req() req: Request, @Query("period") period?: string) {
    return this.svc.getFinanceOverview(req.user.id, period);
  }

  @Post("manage/dividends")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发放分红/奖励" })
  @ApiBearerAuth()
  createDividend(@Req() req: Request, @Body() dto: CreateDividendDto) {
    return this.svc.createDividend(req.user.id, dto);
  }

  @Put("manage/members/:id/recommend")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "推荐成员进入人才库" })
  @ApiBearerAuth()
  recommendToTalent(@Req() req: Request, @Param("id") id: string, @Body() dto: RecommendToTalentDto) {
    return this.svc.recommendToTalentPool(req.user.id, id, dto.lecturerLevel);
  }

  // ════════════════════════════════════════
  // 管理后台：任务模板
  // ════════════════════════════════════════

  @Get("task-templates")
  @ApiOperation({ summary: "任务模板列表" })
  listTaskTemplates() {
    return this.svc.listTaskTemplates();
  }

  @Post("task-templates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建任务模板" })
  @ApiBearerAuth()
  createTaskTemplate(@Body() dto: CreateTaskTemplateDto) {
    return this.svc.createTaskTemplate(dto);
  }

  @Put("task-templates/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新任务模板" })
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
  @ApiBearerAuth()
  createEvent(@Req() req: Request, @Body() dto: CreateEventDto) {
    return this.svc.createEvent(req.user.id, dto);
  }

  @Put("events/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新活动" })
  @ApiBearerAuth()
  updateEvent(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.svc.updateEvent(id, dto);
  }

  // ════════════════════════════════════════
  // 管理员接口
  // ════════════════════════════════════════

  @Put("members/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新研究院成员信息" })
  @ApiBearerAuth()
  updateMember(@Param("id") id: string, @Body() dto: UpdateMemberDto) {
    return this.svc.updateMember(id, dto);
  }

  @Put("members/:id/lecturer-level")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新讲师等级" })
  @ApiBearerAuth()
  updateLecturerLevel(@Param("id") id: string, @Body() dto: UpdateLecturerLevelDto) {
    return this.svc.updateLecturerLevel(id, dto);
  }

  @Get("candidates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "候选签约讲师" })
  @ApiBearerAuth()
  getCandidates() {
    return this.svc.getSigningCandidates();
  }

  // 任务管理（保留兼容）
  @Post("members/:id/tasks")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "添加年度任务（管理员）" })
  @ApiBearerAuth()
  addTask(@Param("id") memberId: string, @Body() dto: CreateTaskDto) {
    return this.svc.addTask(memberId, dto);
  }

  @Post("tasks/:id/verify")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "验证任务" })
  @ApiBearerAuth()
  verifyTask(@Param("id") taskId: string, @Req() req: Request) {
    return this.svc.verifyTask(taskId, req.user.id);
  }
}
