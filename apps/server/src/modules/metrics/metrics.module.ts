import { Module, Global } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MetricsService } from "../../common/metrics.service";
import { MetricsInterceptor } from "../../common/metrics.interceptor";
import { MetricsController } from "./metrics.controller";

@Global()
@Module({
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
