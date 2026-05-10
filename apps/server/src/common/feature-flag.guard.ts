import { Injectable, CanActivate, ExecutionContext, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureFlagService } from "../modules/feature-flag/feature-flag.service";
import { FEATURE_FLAG_KEY } from "./feature-flag.decorator";

/** 功能开关守卫 — 开关未启用时返回 404 隐藏功能存在 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlag: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!key) return true; // 没有装饰器标注则放行

    const request = context.switchToHttp().getRequest();
    const userId = (request as any).user?.id;

    const enabled = await this.featureFlag.isEnabled(key, userId);
    if (!enabled) {
      throw new NotFoundException("资源不存在");
    }

    return true;
  }
}
