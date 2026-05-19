import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { Request } from "express";

@Injectable()
export class BigScreenAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers["x-bigscreen-token"] as string || req.query["token"] as string;

    // ── 方式一：大屏独立令牌（用于对外演示/展厅大屏） ──
    if (token) {
      const record = await this.prisma.bigScreenToken.findUnique({ where: { token } });

      if (!record) throw new UnauthorizedException("无效的大屏令牌");
      if (record.status !== "APPROVED") throw new UnauthorizedException("令牌未审批或已撤销");

      const now = new Date();
      if (now < record.validFrom || now > record.validTo) {
        throw new UnauthorizedException("令牌已过期");
      }

      if (record.ipWhitelist) {
        const allowedIps = record.ipWhitelist.split(",").map(ip => ip.trim());
        const clientIp = req.ip || req.socket.remoteAddress || "";
        if (!allowedIps.includes(clientIp) && !allowedIps.includes("*")) {
          throw new UnauthorizedException("IP 不在白名单中");
        }
      }

      return true;
    }

    // ── 方式二：JWT 管理员登录（管理后台内嵌查看） ──
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwtToken = authHeader.slice(7);
        const payload = this.jwt.verify(jwtToken);
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { roles: { select: { roleType: true } } } });
        if (user && user.roles.some(r => ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR"].includes(r.roleType))) {
          return true;
        }
      } catch (err) {
        console.warn(`大屏 JWT 验证失败: ${(err as Error).message}`);
      }
    }

    throw new UnauthorizedException("缺少大屏访问令牌，请先登录管理后台或创建大屏Token");
  }
}
