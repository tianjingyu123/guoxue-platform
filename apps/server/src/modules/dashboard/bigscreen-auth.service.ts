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
    return this.prisma.bigScreenToken.update({
      where: { id: tokenId },
      data: { status: "APPROVED", approvedBy, approvedAt: new Date() },
    });
  }

  async revokeToken(tokenId: string, revokedBy: string) {
    return this.prisma.bigScreenToken.update({
      where: { id: tokenId },
      data: { status: "REVOKED", revokedBy, revokedAt: new Date() },
    });
  }

  async listTokens(status?: string) {
    const where = status ? { status } : {};
    return this.prisma.bigScreenToken.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async cleanExpired() {
    const now = new Date();
    const result = await this.prisma.bigScreenToken.updateMany({
      where: { validTo: { lt: now }, status: "APPROVED" },
      data: { status: "REVOKED", revokedAt: now },
    });
    return { expired: result.count };
  }
}
