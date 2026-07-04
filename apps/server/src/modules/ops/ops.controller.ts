import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RequireAutomation } from "../../common/require-automation.decorator";
import { OpsService } from "./ops.service";
import { ClaimOpsTaskDto, CompleteOpsTaskDto, CreateOpsTaskDto, QueryOpsTaskDto, ReviewOpsTaskDto } from "./ops.dto";

/** 数字员工运营 OS — 任务池（OS-P1）：数字员工与真人从同一池取任务 */
@ApiTags("运营任务池")
@Controller("ops")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get("tasks")
  @ApiOperation({ summary: "任务池列表（status/type/priority 筛选 + 分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async list(@Query() query: QueryOpsTaskDto) {
    return this.opsService.list(query);
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
  async claim(@Param("id") id: string, @Body() body: ClaimOpsTaskDto, @Req() req: Request) {
    const operator = this.operator(req);
    return this.opsService.claim(id, body.executor || operator, operator);
  }

  @Put("tasks/:id/complete")
  @RequireAutomation() // 一键接管示范：automation_enabled=false 时本写操作 403
  @ApiOperation({ summary: "完成任务（in_progress → completed，落 result；受一键接管开关约束）" })
  @ApiResponse({ status: 200, description: "完成成功" })
  @ApiResponse({ status: 400, description: "状态不可完成" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限或自动化已被管理员暂停" })
  async complete(@Param("id") id: string, @Body() body: CompleteOpsTaskDto, @Req() req: Request) {
    return this.opsService.complete(id, body.result, this.operator(req));
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
