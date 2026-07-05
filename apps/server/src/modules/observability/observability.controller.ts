import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ApiPerfService } from "./api-perf.service";
import { WebVitalsService } from "./web-vitals.service";
import { RedisService } from "../../redis/redis.service";
import { NginxWindowStat } from "./nginx-log.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

/** 可观测看板数据（T3·admin 性能观测页） */
@ApiTags("可观测性")
@ApiBearerAuth()
@Controller("observability")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class ObservabilityController {
  constructor(
    private readonly apiPerf: ApiPerfService,
    private readonly webVitals: WebVitalsService,
    private readonly redis: RedisService,
  ) {}

  @Get("api-perf")
  @ApiOperation({ summary: "服务端 API 性能：近 N 分钟路由级 count/错误率/avg/p95/p99 + 每分钟总量序列（跨实例聚合）" })
  @ApiQuery({ name: "minutes", required: false, type: Number, description: "5-120，默认 60" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  apiPerfQuery(@Query("minutes") minutes?: string) {
    return this.apiPerf.query(minutes ? Number(minutes) : 60);
  }

  @Get("web-vitals")
  @ApiOperation({ summary: "RUM 真实用户性能：近 N 天按日 LCP/INP/CLS/TTFB p75（H5 web-vitals 埋点）" })
  @ApiQuery({ name: "days", required: false, type: Number, description: "1-30，默认 7" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  webVitalsQuery(@Query("days") days?: string) {
    return this.webVitals.daily(days ? Number(days) : 7);
  }

  @Get("nginx")
  @ApiOperation({ summary: "nginx 接入层：最近 5 分钟窗口 + 近 12 窗口（QPS/4xx/5xx率/top路由）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async nginx() {
    const [latest, recent] = await Promise.all([
      this.redis.getJson<NginxWindowStat>("obs:nginx:latest"),
      this.redis.getJson<NginxWindowStat[]>("obs:nginx:recent"),
    ]);
    return { latest, recent: recent ?? [] };
  }
}
