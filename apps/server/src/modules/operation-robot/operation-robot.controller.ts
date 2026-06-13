import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { OperationRobotService } from "./operation-robot.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Request } from "express";

@ApiTags("虚拟运营机器人")
@ApiBearerAuth()
@Controller("operation-robots")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class OperationRobotController {
  private readonly logger = new Logger(OperationRobotController.name);
  constructor(
    private readonly service: OperationRobotService,
    private readonly systemService: SystemService,
  ) {}

  @Get()
  @ApiOperation({ summary: "获取所有机器人状态" })
  @ApiResponse({ status: 200, description: "成功" })
  async getStatus() {
    return this.service.getRobotStatus();
  }

  @Get("logs")
  @ApiOperation({ summary: "获取执行日志" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "role", required: false, description: "按机器人筛选" })
  @ApiQuery({ name: "limit", required: false, description: "返回条数" })
  async getLogs(
    @Query("role") role?: string,
    @Query("limit") limit?: number,
  ) {
    return this.service.getExecutionLogs(role as any, limit ? +limit : 50);
  }

  @Get(":role/config")
  @ApiOperation({ summary: "获取机器人详细配置" })
  @ApiResponse({ status: 200, description: "成功" })
  async getConfig(@Param("role") role: string) {
    return this.service.getRobotConfig(role as any);
  }

  @Post(":role/trigger")
  @ApiOperation({ summary: "手动触发机器人任务" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async trigger(@Param("role") role: string, @Req() req: Request) {
    const result = await this.service.triggerRobot(role as any);
    this.systemService.logAudit({
      userId: (req as any).user?.id,
      action: "TRIGGER_ROBOT",
      targetType: "OPERATION_ROBOT",
      targetId: role,
      detail: `手动触发运营机器人 ${role}，结果: ${result.success ? "成功" : result.error}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志写入失败", err));
    return result;
  }

  @Post(":role/toggle")
  @ApiOperation({ summary: "切换机器人开关" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async toggle(@Param("role") role: string, @Body("enabled") enabled: boolean, @Req() req: Request) {
    const result = await this.service.toggleRobot(role as any, enabled);
    this.systemService.logAudit({
      userId: (req as any).user?.id,
      action: "TOGGLE_ROBOT",
      targetType: "OPERATION_ROBOT",
      targetId: role,
      detail: `${enabled ? "启用" : "禁用"}运营机器人 ${role}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志写入失败", err));
    return result;
  }

  @Post("init")
  @ApiOperation({ summary: "初始化机器人系统" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async init(@Req() req: Request) {
    await this.service.init();
    this.systemService.logAudit({
      userId: (req as any).user?.id,
      action: "INIT_ROBOTS",
      targetType: "OPERATION_ROBOT",
      targetId: "system",
      detail: "重新初始化运营机器人系统",
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志写入失败", err));
    return { message: "机器人系统已初始化" };
  }
}
