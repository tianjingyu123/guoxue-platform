import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { SKIP_STATION_ISOLATION_KEY } from "./station-isolation.decorator";

/**
 * 分站数据隔离守卫 — 从 JWT/user 中获取 stationId（服务端信任来源），
 * 注入到 request.stationId，供 Service 层统一过滤。
 *
 * SUPER_ADMIN / OPERATION_ADMIN 直接放行（可查看全平台数据）。
 * 普通用户：根据其绑定的 stationId 自动填充 request.stationId。
 *
 * 用法: @UseGuards(JwtAuthGuard, StationIsolationGuard)
 * 豁免: @SkipStationIsolation()
 */
@Injectable()
export class StationIsolationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_STATION_ISOLATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    // 管理员可查看全平台数据，不注入 stationId
    const roles: string[] = user.roles ?? [];
    if (roles.includes("SUPER_ADMIN") || roles.includes("OPERATION_ADMIN")) {
      request.stationId = undefined;
      return true;
    }

    // 从数据库获取用户绑定的分站
    const station = await this.prisma.station.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    // 注入可信 stationId（服务端来源，非客户端 Header）
    if (station) {
      request.stationId = station.id;
    }

    return true;
  }
}
