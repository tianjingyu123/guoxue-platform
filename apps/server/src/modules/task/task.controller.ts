import {
  Controller, Get, Post, Put,
  Param, Body, Query, UseGuards, Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { TaskService } from "./task.service";
import { CreateTaskDto, UpdateTaskDto, TransferTaskDto, ClaimTaskDto, ApproveTaskDto } from "./task.dto";
import { Request } from "express";

@ApiTags("任务池")
@Controller("tasks")
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "任务列表（分页 + 筛选）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async list(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("priority") priority?: string,
    @Query("executorType") executorType?: string,
    @Query("needsApproval") needsApproval?: string,
  ) {
    return this.taskService.list({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      type,
      priority,
      executorType,
      needsApproval: needsApproval !== undefined ? needsApproval === "true" : undefined,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建任务" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "任务详情（含流转日志）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async detail(@Param("id") id: string) {
    return this.taskService.detail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新任务状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.taskService.update(id, dto, u?.nickname || u?.id);
  }

  @Post(":id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "认领任务" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async claim(
    @Param("id") id: string,
    @Body() dto: ClaimTaskDto,
  ) {
    return this.taskService.claim(id, dto.executorType, dto.executorId);
  }

  @Post(":id/transfer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "转交任务" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async transfer(
    @Param("id") id: string,
    @Body() dto: TransferTaskDto,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const fromId = u?.nickname || u?.id;
    return this.taskService.transfer(id, dto.toType, dto.toId, dto.reason, "HUMAN", fromId);
  }

  @Post(":id/force-reclaim")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "强制收回任务（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async forceReclaim(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.taskService.forceReclaim(id, u?.nickname || u?.id || "ADMIN");
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审批任务" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async approve(
    @Param("id") id: string,
    @Body() dto: ApproveTaskDto,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.taskService.approve(id, dto.approved, u?.nickname || u?.id || "ADMIN", dto.remark);
  }

  @Post(":id/rollback")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "回滚任务操作" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  async rollback(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    return this.taskService.rollback(id, u?.nickname || u?.id || "ADMIN");
  }

  @Get("stats/pending")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "待处理任务统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "executorType", required: false, description: "CLAUDE | HUMAN" })
  async pendingStats(@Query("executorType") executorType?: string) {
    return { count: await this.taskService.pendingCount(executorType) };
  }
}
