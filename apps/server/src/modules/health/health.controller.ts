import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("健康检查")
@Controller("health")
export class HealthController {
  constructor(private health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "完整健康检查（DB + Redis + 第三方服务 + 内存）" })
  @ApiResponse({ status: 200, description: "成功" })
  async check() {
    return this.health.check();
  }

  @Get("ready")
  @ApiOperation({ summary: "就绪检查（K8s readiness probe）" })
  @ApiResponse({ status: 200, description: "成功" })
  async ready() {
    return this.health.readiness();
  }

  @Get("live")
  @ApiOperation({ summary: "存活检查（K8s liveness probe）" })
  @ApiResponse({ status: 200, description: "成功" })
  async live() {
    return this.health.liveness();
  }
}
