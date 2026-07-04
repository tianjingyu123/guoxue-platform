import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SystemService } from "../modules/system/system.service";

export const REQUIRE_AUTOMATION_KEY = "require_automation";

/**
 * 一键接管守卫（OS-P1）— 数字员工写操作的前置检查
 *
 * 读 ConfigSystem `automation_enabled`（经 SystemService 带缓存读取）：
 * - 值为 "false"（管理员已一键接管）→ 403「数字员工自动化已被管理员暂停」
 * - 未配置或其他值 → 视为开启，放行
 *
 * 用法：在写操作端点上挂 @RequireAutomation()（见 require-automation.decorator.ts）。
 * 本批先在 ops 任务 complete 端点示范，未来数字员工的一切写操作统一挂此装饰器。
 */
@Injectable()
export class RequireAutomationGuard implements CanActivate {
  private readonly logger = new Logger(RequireAutomationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly systemService: SystemService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_AUTOMATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // 未标记 @RequireAutomation() 的端点不受此守卫约束
    if (!required) return true;

    const enabled = await this.systemService.isAutomationEnabled();
    if (!enabled) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(`自动化已被接管，拒绝 ${request?.method} ${request?.url}`);
      throw new ForbiddenException("数字员工自动化已被管理员暂停");
    }
    return true;
  }
}
