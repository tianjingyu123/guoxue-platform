import { createHash } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { decrypt } from "../../common/crypto.util";
import { PrismaService } from "../../prisma/prisma.service";

export interface LegacyPaipanEntry {
  mode: "legacy" | "native";
  url: string | null;
  attributionReady: boolean;
}

/**
 * 首发期旧排盘 H5 兼容入口。
 *
 * 对方当前仅提供手机号签名跳转协议，并未提供“创建用户/绑定分站/返回推广链接”的 JSON API。
 * 因此这里只实现已经确认的协议，绝不伪造远程接口或默认推广链接。
 */
@Injectable()
export class StationPaipanSyncService {
  private readonly logger = new Logger(StationPaipanSyncService.name);

  constructor(private prisma: PrismaService) {}

  async getUserEntry(userId: string): Promise<LegacyPaipanEntry> {
    if (process.env.PAIPAN_LEGACY_MODE !== "true") {
      return { mode: "native", url: null, attributionReady: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phoneEnc: true,
        attributionStationId: true,
      },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    const phone = String(user.phoneEnc ? decrypt(user.phoneEnc) : user.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "进入排盘工具前请先绑定中国大陆手机号",
      );
    }

    const url = this.buildSignedEntryUrl(phone);
    const attributionReady = await this.isAttributionReady(user.attributionStationId);
    return { mode: "legacy", url, attributionReady };
  }

  /**
   * 兼容历史调用方：仅返回已经迁入 Station.paipanLink 的真实分站推广链接。
   * 当前第三方协议没有分站开通接口，缺失时必须保持 null 并交由迁移清单处理。
   */
  async syncStationPaipanLink(stationId: string): Promise<string | null> {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, paipanLink: true },
    });
    if (!station) {
      this.logger.warn(`分站 ${stationId} 不存在`);
      return null;
    }
    if (!station.paipanLink) {
      this.logger.warn(`分站 ${station.name} 缺少旧排盘推广链接，等待旧系统导出或第三方补充协议`);
      return null;
    }
    return station.paipanLink;
  }

  async syncAll() {
    const stations = await this.prisma.station.findMany({
      where: { paipanLink: null, status: "ACTIVE" },
      select: { id: true },
    });
    return {
      total: stations.length,
      success: 0,
      pending: stations.length,
      reason: "第三方尚未提供分站创建/归属同步协议，禁止生成虚假推广链接",
    };
  }

  private buildSignedEntryUrl(phone: string): string {
    const configured =
      process.env.PAIPAN_H5_BASE || "https://www.yrydai.com/guoxueApp.php";
    let target: URL;
    try {
      target = new URL(configured);
    } catch {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "PAIPAN_H5_BASE 配置无效");
    }
    if (target.protocol !== "https:" || target.username || target.password) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        "PAIPAN_H5_BASE 必须是无账号信息的 HTTPS 地址",
      );
    }

    const key = createHash("md5")
      .update(`${phone}@rebuguoxue${phone}`, "utf8")
      .digest("hex");
    target.searchParams.set("mobile", phone);
    target.searchParams.set("key", key);
    target.searchParams.set("go", "tool");
    return target.toString();
  }

  private async isAttributionReady(stationId: string | null): Promise<boolean> {
    if (!stationId) return true;
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { paipanLink: true, paipanUserId: true },
    });
    return Boolean(station?.paipanLink || station?.paipanUserId);
  }
}
