import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { SystemService } from "../modules/system/system.service";

/**
 * 自动化守卫 — 检查全局自动化开关是否开启
 * 开关关闭时，拒绝所有写操作（POST/PUT/DELETE/PATCH），只允许 GET
 */
@Injectable()
export class AutomationGuard implements CanActivate {
  private readonly logger = new Logger(AutomationGuard.name);

  constructor(private readonly systemService: SystemService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // GET/HEAD 请求始终放行（只读操作）
    if (method === "GET" || method === "HEAD") return true;

    // 检查全局自动化开关
    const enabled = await this.systemService.isAutomationEnabled();
    if (!enabled) {
      this.logger.warn(`自动化已关闭，拒绝 ${method} ${request.url}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: "自动化运营已暂停，管理员已接管。写操作暂不可用，只读接口正常。",
          error: "Automation Disabled",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return true;
  }
}
