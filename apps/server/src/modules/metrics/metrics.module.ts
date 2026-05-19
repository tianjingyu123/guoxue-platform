import { Module, Global } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MetricsService } from "../../common/metrics.service";
import { MetricsInterceptor } from "../../common/metrics.interceptor";
import { MetricsController } from "./metrics.controller";
import { AiInsightService } from "./ai-insight.service";

@Global()
@Module({
  providers: [
    MetricsService,
    AiInsightService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  controllers: [MetricsController],
  exports: [MetricsService, AiInsightService],
})
export class MetricsModule {}
