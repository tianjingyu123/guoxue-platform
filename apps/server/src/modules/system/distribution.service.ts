import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DistributionScope, versionScope } from "./distribution.util";

@Injectable()
export class DistributionService {
  constructor(private readonly prisma: PrismaService) {}

  /** 公开选择器只选服务端登记分发条目，不作为用户身份或权益凭据。 */
  async resolve(clientKey?: string) {
    if (!clientKey) return null;
    return this.prisma.appDistribution.findFirst({ where: { clientKey, enabled: true } });
  }

  async requestScope(req: { headers?: Record<string, unknown> }) {
    const raw = req.headers?.["x-app-client"];
    const distribution = typeof raw === "string" ? await this.resolve(raw) : null;
    return distribution ? versionScope(distribution) : null;
  }

  async assertRegistered(scope: DistributionScope) {
    const row = await this.prisma.appDistribution.findUnique({
      where: { applicationId_platform_channelId: versionScope(scope) },
    });
    if (!row?.enabled) throw new BadRequestException("应用渠道尚未登记或已停用");
    return row;
  }
}
