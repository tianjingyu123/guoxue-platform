import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Autonomy, AutonomyLevel } from "../../common/autonomy";
import { OpsService } from "./ops.service";
import { InspectionService } from "./inspection.service";
import { ApproveOpsTaskDto, CompleteOpsTaskDto, CreateOpsTaskDto, QueryOpsTaskDto, ReviewOpsTaskDto } from "./ops.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

/** 数字员工运营 OS — 任务池（OS-P1）：数字员工与真人从同一池取任务 */
@ApiTags("运营任务池")
@Controller("ops")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly inspectionService: InspectionService,
  ) {}

  @Post("inspect")
  @Roles("SUPER_ADMIN")
  @Autonomy(AutonomyLevel.L3_AUTO_ROLLBACK) // 巡检+分级自动处置（白名单内自动修复+落台账）
  @ApiOperation({ summary: "手动触发每日巡检（五项检查+分级处置，返回巡检报告·SUPER_ADMIN）" })
  @ApiResponse({ status: 201, description: "巡检完成，返回巡检报告（同时落一条 completed 巡检日志任务）" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async inspect() {
    return this.inspectionService.runInspection("MANUAL");
  }

  @Get("tasks")
  @ApiOperation({ summary: "任务池列表（status/type/priority 筛选 + 分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async list(@Query() query: QueryOpsTaskDto) {
    return this.opsService.list(query);
  }

  @Get("overview")
  @ApiOperation({ summary: "数字员工运营总览（任务状态、待审批、24小时 AI 产出）" })
  async overview() {
    return this.opsService.overview();
  }

  @Post("tasks")
  @ApiOperation({ summary: "创建任务（巡检/修复/审核/运营动作）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async create(@Body() body: CreateOpsTaskDto, @Req() req: Request) {
    return this.opsService.create(body, this.operator(req));
  }

  @Put("tasks/:id/claim")
  @ApiOperation({ summary: "认领任务（pending/needs_review → in_progress，一键接管双向通道）" })
  @ApiResponse({ status: 200, description: "认领成功" })
  @ApiResponse({ status: 400, description: "状态不可认领" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async claim(@Param("id") id: string, @Req() req: Request) {
    const operator = this.operator(req);
    // 管理端只能以当前登录人身份认领，禁止通过请求体冒充数字员工或其他管理员。
    return this.opsService.claim(id, operator, operator);
  }

  @Put("tasks/:id/complete")
  @Autonomy(AutonomyLevel.L2_ONE_CLICK) // 人点/AI 执行的一键动作
  @ApiOperation({ summary: "完成任务（in_progress → completed；真人接管不受自动化总开关阻断）" })
  @ApiResponse({ status: 200, description: "完成成功" })
  @ApiResponse({ status: 400, description: "状态不可完成" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限、非当前执行者或高风险任务尚未审批" })
  async complete(@Param("id") id: string, @Body() body: CompleteOpsTaskDto, @Req() req: Request) {
    return this.opsService.complete(id, body.result, this.operator(req));
  }

  @Put("tasks/:id/approval")
  @RedLineGate(RedLine.COMPLIANCE)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "审批或驳回高风险任务（执行与审批职责分离）" })
  @ApiResponse({ status: 200, description: "审批状态已更新" })
  @ApiResponse({ status: 400, description: "任务无需审批、状态错误或执行者自审" })
  async approve(@Param("id") id: string, @Body() body: ApproveOpsTaskDto, @Req() req: Request) {
    return this.opsService.approve(id, body.approved, this.operator(req), body.note);
  }

  @Put("tasks/:id/review")
  @ApiOperation({ summary: "转人工复核（→ needs_review 附原因）" })
  @ApiResponse({ status: 200, description: "转办成功" })
  @ApiResponse({ status: 400, description: "已完成任务不可转办" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async review(@Param("id") id: string, @Body() body: ReviewOpsTaskDto, @Req() req: Request) {
    return this.opsService.review(id, body.reason, this.operator(req));
  }

  private operator(req: Request): string {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return u?.id || u?.nickname || "ADMIN";
  }
}
