import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { RequireAutomationGuard, REQUIRE_AUTOMATION_KEY } from "./require-automation.guard";

/**
 * @RequireAutomation() — 数字员工写操作前置检查（OS-P1）
 *
 * 组合装饰器：打元数据标记 + 挂 RequireAutomationGuard。
 * 管理员通过 POST /system/automation/toggle 关闭 automation_enabled 后，
 * 所有挂了本装饰器的端点统一返回 403「数字员工自动化已被管理员暂停」（一键接管=只读模式）。
 *
 * 示例：
 *   @Put(":id/complete")
 *   @RequireAutomation()
 *   async complete(...) {...}
 */
export function RequireAutomation() {
  return applyDecorators(SetMetadata(REQUIRE_AUTOMATION_KEY, true), UseGuards(RequireAutomationGuard));
}
