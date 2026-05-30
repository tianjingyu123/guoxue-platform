import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 验证当前用户是否有权访问请求中的 stationId。
 * stationId 来源与 @StationId() 装饰器一致：优先 header x-station-id，fallback query.stationId
 * SUPER_ADMIN 直接放行；未指定 stationId 视为平台级访问，放行。
 *
 * 用法: @UseGuards(JwtAuthGuard, StationAccessGuard)
 * 必须与 JwtAuthGuard 同时使用，因为它依赖 request.user
 */
@Injectable()
export class StationAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const stationId =
      request.headers["x-station-id"] || request.query?.stationId;
    if (!stationId) return true;

    if (user.roles?.includes("SUPER_ADMIN")) return true;

    const station = await this.prisma.station.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!station || station.id !== stationId) {
      throw new ForbiddenException("无权访问此分站");
    }
    return true;
  }
}
