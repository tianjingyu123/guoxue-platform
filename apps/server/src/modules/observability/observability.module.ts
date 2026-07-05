import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ObservabilityController } from "./observability.controller";
import { ApiPerfService } from "./api-perf.service";
import { ApiPerfInterceptor } from "./api-perf.interceptor";
import { WebVitalsService } from "./web-vitals.service";
import { NginxLogService } from "./nginx-log.service";

/**
 * 可观测模块（T3）：API 路由级性能（跨实例 Redis 分钟桶）+ RUM web-vitals 聚合 +
 * nginx 接入层增量分析。哨兵 R9（nginx 5xx 率）读本模块产出的 Redis 键。
 */
@Module({
  controllers: [ObservabilityController],
  providers: [
    ApiPerfService,
    WebVitalsService,
    NginxLogService,
    { provide: APP_INTERCEPTOR, useClass: ApiPerfInterceptor },
  ],
  exports: [ApiPerfService],
})
export class ObservabilityModule {}
