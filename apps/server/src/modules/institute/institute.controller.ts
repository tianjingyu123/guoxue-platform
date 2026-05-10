import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { InstituteService } from "./institute.service";
import { JoinInstituteDto, CreateTaskDto, VerifyTaskDto, CreateEventDto, UpdateLecturerLevelDto } from "./institute.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("研究院")
@Controller("institute")
export class InstituteController {
  constructor(private svc: InstituteService) {}

  // ───────── 成员 ─────────

  @Post("members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "加入研究院" })
  @ApiBearerAuth()
  join(@Req() req: Request, @Body() dto: JoinInstituteDto) {
    return this.svc.join(req.user.id, dto);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的研究院信息" })
  @ApiBearerAuth()
  myMembership(@Req() req: Request) {
    return this.svc.getMyMembership(req.user.id);
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

  @Put("members/:id/lecturer-level")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新讲师等级（管理员）" })
  @ApiBearerAuth()
  updateLecturerLevel(@Param("id") id: string, @Body() dto: UpdateLecturerLevelDto) {
    return this.svc.updateLecturerLevel(id, dto);
  }

  @Get("candidates")
  @ApiOperation({ summary: "候选签约讲师" })
  getCandidates() {
    return this.svc.getSigningCandidates();
  }

  // ───────── 任务 ─────────

  @Post("members/:id/tasks")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加年度任务" })
  @ApiBearerAuth()
  addTask(@Param("id") memberId: string, @Body() dto: CreateTaskDto) {
    return this.svc.addTask(memberId, dto);
  }

  @Post("tasks/:id/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "完成任务" })
  @ApiBearerAuth()
  completeTask(@Param("id") taskId: string, @Req() req: Request) {
    return this.svc.completeTask(taskId, req.user.id);
  }

  @Post("tasks/:id/verify")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "验证任务（管理员）" })
  @ApiBearerAuth()
  verifyTask(@Param("id") taskId: string, @Req() req: Request, @Body() dto?: VerifyTaskDto) {
    return this.svc.verifyTask(taskId, req.user.id);
  }

  // ───────── 活动 ─────────

  @Post("events")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建活动排期（管理员）" })
  @ApiBearerAuth()
  createEvent(@Body() dto: CreateEventDto) {
    return this.svc.createEvent(dto);
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

  @Put("events/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新活动状态（管理员）" })
  @ApiBearerAuth()
  updateEvent(@Param("id") id: string, @Body() dto: { status?: string }) {
    return this.svc.updateEvent(id, dto);
  }
}
