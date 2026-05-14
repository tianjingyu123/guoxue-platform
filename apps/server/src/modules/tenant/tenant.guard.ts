import { Injectable, CanActivate, ExecutionContext, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"] as string;

    if (!apiKey) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "缺少 X-API-Key 请求头");
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { apiKey } });
    if (!tenant) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "API Key 无效");
    }

    if (tenant.status === "DISABLED") {
      throw new BusinessException(ErrorCode.AUTH_USER_BANNED, "租户已被禁用");
    }

    if (tenant.status === "EXPIRED" || (tenant.expireAt && tenant.expireAt < new Date())) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, "租户已过期");
    }

    // IP 白名单校验
    if (tenant.ipWhitelist?.length) {
      const clientIp = (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        || request.ip;
      if (!tenant.ipWhitelist.includes(clientIp)) {
        this.logger.warn(`租户 ${tenant.name} IP白名单拒绝: ${clientIp}`);
        throw new BusinessException(ErrorCode.FORBIDDEN, "IP不在白名单内");
      }
    }

    (request as any).tenant = tenant;
    return true;
  }
}
