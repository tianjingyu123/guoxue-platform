import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { serverConfig } from "../../config/server-config";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import * as crypto from "crypto";

@Injectable()
export class BigScreenAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private generateToken(type: string, createdBy: string): string {
    const payload = `${type}:${createdBy}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
    const secret = serverConfig.bigscreenSecret;
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  async createToken(params: { type: string; validHours: number; ipWhitelist?: string; createdBy: string }) {
    const token = this.generateToken(params.type, params.createdBy);
    const validFrom = new Date();
    const validTo = new Date(validFrom.getTime() + params.validHours * 3600000);

    return this.prisma.bigScreenToken.create({
      data: {
        type: params.type,
        token,
        validFrom,
        validTo,
        ipWhitelist: params.ipWhitelist || null,
        status: "PENDING",
        createdBy: params.createdBy,
      },
    });
  }

  async approveToken(tokenId: string, approvedBy: string) {
    const record = await this.prisma.bigScreenToken.findUnique({ where: { id: tokenId } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "大屏令牌不存在");
    // 四眼原则：审批人不得为创建人自己，防止自建自批绕过管控
    if (record.createdBy && record.createdBy === approvedBy) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己创建的大屏令牌");
    }
    if (record.status === "REVOKED" || record.status === "EXPIRED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该令牌已撤销或过期，不可审批");
    }
    const validTo = new Date(Date.now() + 24 * 3600000); // 审批通过后默认24h有效
    return this.prisma.bigScreenToken.update({
      where: { id: tokenId },
      data: { status: "ACTIVE", approvedBy, approvedAt: new Date(), validFrom: new Date(), validTo },
    });
  }

  async revokeToken(tokenId: string, revokedBy: string) {
    return this.prisma.bigScreenToken.update({
      where: { id: tokenId },
      data: { status: "REVOKED", revokedBy, revokedAt: new Date() },
    });
  }

  async deleteToken(tokenId: string) {
    return this.prisma.bigScreenToken.delete({ where: { id: tokenId } });
  }

  async listTokens(status?: string) {
    const where = status ? { status } : {};
    return this.prisma.bigScreenToken.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getAccessLogs(_params: { pageSize?: number }) {
    // 访问日志表（BigScreenAccessLog）尚未建立 → 返回统一契约 available:false，
    // 供前端明确区分"功能未建"与"暂无数据"，避免展示空列表误导为已支持。
    return { items: [] as unknown[], total: 0, available: false };
  }

  async cleanExpired() {
    const now = new Date();
    const result = await this.prisma.bigScreenToken.updateMany({
      where: { validTo: { lt: now }, status: "ACTIVE" },
      data: { status: "EXPIRED", revokedAt: now },
    });
    return { expired: result.count };
  }
}
