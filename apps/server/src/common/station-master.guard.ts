import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 验证当前用户是否为指定分站的站长
 * SUPER_ADMIN 直接放行；其他用户需通过 UserRole(bindId=stationId) 验证
 * stationId 优先级: param.stationId > query.stationId > header x-station-id
 */
@Injectable()
export class StationMasterGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("请先登录");

    const stationId =
      request.params.stationId ||
      request.query.stationId ||
      request.headers["x-station-id"];
    if (!stationId) throw new ForbiddenException("缺少分站信息");

    if (user.roles?.includes("SUPER_ADMIN")) return true;

    const role = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleType: "STATION_MASTER",
        bindId: stationId,
      },
    });

    if (!role) throw new ForbiddenException("无分站管理权限");
    return true;
  }
}
