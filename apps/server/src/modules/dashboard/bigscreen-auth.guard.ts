import { ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Request } from "express";

const screenTypes = ["platform", "transactions", "content_eco", "ai_capability", "offline_map"] as const;
export type BigScreenType = typeof screenTypes[number];
export const BIGSCREEN_TYPE_KEY = "bigscreen:token-type";
export const BigScreenScope = (type: BigScreenType) => SetMetadata(BIGSCREEN_TYPE_KEY, type);
const adminRoles = new Set(["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR"]);

@Injectable()
export class BigScreenAuthGuard extends JwtAuthGuard {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) { super(); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    // 专题必须由服务端路由显式声明，缺少或未知范围一律拒绝。
    const expectedType = this.reflector.getAllAndOverride<BigScreenType>(BIGSCREEN_TYPE_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!expectedType || !screenTypes.includes(expectedType)) {
      throw new ForbiddenException("未配置大屏访问范围");
    }
    const token = req.headers["x-bigscreen-token"] ?? req.query["token"];

    // ── 方式一：大屏独立令牌（用于对外演示/展厅大屏） ──
    if (token !== undefined) {
      if (typeof token !== "string" || !token.trim()) throw new UnauthorizedException("无效的大屏令牌");
      const record = await this.prisma.bigScreenToken.findUnique({ where: { token } });

      if (!record) throw new UnauthorizedException("无效的大屏令牌");
      // 审批态兼容：审批服务写 ACTIVE，历史/文档口径为 APPROVED，两值均视为有效（存量兼容）
      if (record.status !== "APPROVED" && record.status !== "ACTIVE") throw new UnauthorizedException("令牌未审批或已撤销");

      const now = new Date();
      if (now < record.validFrom || now >= record.validTo) {
        throw new UnauthorizedException("令牌已过期");
      }

      if (record.type !== expectedType) throw new ForbiddenException("大屏令牌无权访问该专题");

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
    // 复用完整 Passport 策略，统一处理撤销、禁用/封禁、历史密钥和实时角色。
    // 不在这里另行验签或吞掉认证错误，避免再次形成登录失效旁路。
    const authenticated = await super.canActivate(context);
    if (!authenticated || !req.user?.roles?.some(role => adminRoles.has(role))) {
      throw new ForbiddenException("无权访问管理大屏");
    }
    return true;
  }
}
