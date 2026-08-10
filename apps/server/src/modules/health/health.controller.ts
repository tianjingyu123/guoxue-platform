import { Controller, Get, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";
import { DegradeService } from "./degrade.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("健康检查")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthService,
    private degrade: DegradeService,
  ) {}

  @Get()
  @ApiOperation({ summary: "基础就绪检查（DB + Redis）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 503, description: "数据库或 Redis 未就绪" })
  async check() {
    return this.ensureReady();
  }

  @Get("detail")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "完整健康检查（仅管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  async detail() {
    return this.health.check();
  }

  @Get("ready")
  @ApiOperation({ summary: "就绪检查（K8s readiness probe）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 503, description: "数据库或 Redis 未就绪" })
  async ready() {
    return this.ensureReady();
  }

  @Get("live")
  @ApiOperation({ summary: "存活检查（K8s liveness probe）" })
  @ApiResponse({ status: 200, description: "成功" })
  async live() {
    return this.health.liveness();
  }

  @Get("degrade")
  @ApiOperation({ summary: "依赖降级状态（公开·前端据此展示降级横幅）" })
  @ApiResponse({ status: 200, description: "成功" })
  async degradeStatus() {
    return this.degrade.getStatus();
  }

  private async ensureReady() {
    const result = await this.health.readiness();
    if (result.status !== "ready") {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
