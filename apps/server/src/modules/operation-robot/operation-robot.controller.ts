import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OperationRobotService } from "./operation-robot.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("虚拟运营机器人")
@ApiBearerAuth()
@Controller("operation-robots")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class OperationRobotController {
  constructor(private readonly service: OperationRobotService) {}

  @Get()
  @ApiOperation({ summary: "获取所有机器人状态" })
  async getStatus() {
    return this.service.getRobotStatus();
  }

  @Post(":role/toggle")
  @ApiOperation({ summary: "切换机器人开关" })
  async toggle(
    @Param("role") role: string,
    @Body("enabled") enabled: boolean,
  ) {
    return this.service.toggleRobot(role as any, enabled);
  }

  @Post("init")
  @ApiOperation({ summary: "初始化机器人系统" })
  async init() {
    await this.service.init();
    return { message: "机器人系统已初始化" };
  }
}
