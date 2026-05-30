import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { serverConfig } from "../../config/server-config";
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
    // 访问日志存储在 BigScreenAccessLog 表中，当前表尚未创建，先返回空
    return [];
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
