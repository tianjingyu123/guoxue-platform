import { Module } from "@nestjs/common";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";

/**
 * 数字员工运营 OS（OS-P1）— 任务池 + 一键接管守卫示范
 * SystemService 来自 @Global 的 SystemModule，无需显式 import。
 * 一键接管开关端点归属侦察结论：POST /system/automation/toggle 已存在于 system.controller
 * （SUPER_ADMIN + 审计），维持原归属不重复建设。
 */
@Module({
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
