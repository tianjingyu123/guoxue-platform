import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { SKIP_ACTIVE_USER_KEY } from "./active-user.decorator";

/**
 * 活跃用户守卫 — 拦截被封禁/DISABLED 用户的所有写操作。
 *
 * 用法：在需要保护的操作上加 @UseGuards(JwtAuthGuard, ActiveUserGuard)
 * 豁免：@SkipActiveUserCheck() 装饰器（用于账户申诉/激活等）
 */
@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ACTIVE_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true; // 未认证用户由 JwtAuthGuard 拦截

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { status: true },
    });

    if (!dbUser) return false;

    // 注意：Prisma select 对带 @default 的 enum 字段的类型推断可能不完整，
    // 这里用 string 比较而非链式 if/else，避免 TS 类型收窄误判。
    const status: string = dbUser.status;

    if (status === "DISABLED") {
      throw new ForbiddenException("账户已被限制，如有疑问请联系客服");
    }

    if (status === "BANNED") {
      throw new ForbiddenException("账户已被封禁，如有疑问请联系客服");
    }

    return true;
  }
}
