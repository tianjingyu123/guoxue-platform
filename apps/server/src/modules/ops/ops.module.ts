import { Module } from "@nestjs/common";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";
import { InspectionService } from "./inspection.service";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { CollaborationInspectionService } from "./collaboration-inspection.service";

/**
 * 数字员工运营 OS（OS-P1/P2）— 任务池 + 一键接管守卫示范 + 每日巡检分级处置
 * SystemService 来自 @Global 的 SystemModule，无需显式 import。
 * 一键接管开关端点归属侦察结论：POST /system/automation/toggle 已存在于 system.controller
 * （SUPER_ADMIN + 审计），维持原归属不重复建设。
 * InspectionService 白名单补跑依赖（DashboardDailyService/MerchantMetricService）经 ModuleRef
 * strict:false 惰性取全局单例，不在此重复注册 provider（避免 @Cron 重复挂载）。
 */
@Module({
  imports: [AiGatewayModule],
  controllers: [OpsController],
  providers: [OpsService, InspectionService, CollaborationInspectionService],
  exports: [OpsService, InspectionService],
})
export class OpsModule {}
