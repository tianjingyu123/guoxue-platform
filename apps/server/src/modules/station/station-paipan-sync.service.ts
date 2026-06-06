import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 分站 ↔ 旧排盘系统 用户同步服务
 *
 * 背景：
 * 旧排盘系统是独立的 PHP H5，通过 WebView 嵌入。
 * 每个分站需要一个专属推广链接，排盘系统据此识别分站并结算佣金。
 * 新用户（本站）注册后需在排盘系统同步创建账号，两边用户一一对应。
 *
 * 同步时机：
 * - 分站创建/开通时 → 调用同步
 * - 用户首次进入排盘 → 懒加载同步（兜底）
 */
@Injectable()
export class StationPaipanSyncService {
  private readonly logger = new Logger(StationPaipanSyncService.name);

  /** 旧排盘系统 API 地址 */
  private readonly paipanApiBase = process.env.PAIPAN_API_BASE || "";
  /** 旧排盘系统 API 密钥 */
  private readonly paipanApiKey = process.env.PAIPAN_API_KEY || "";

  constructor(private prisma: PrismaService) {}

  /**
   * 为指定分站同步排盘账号并获取专属推广链接
   *
   * 场景1：用户在排盘系统已存在 → 直接获取链接
   * 场景2：用户不存在 → 先在排盘系统注册，再获取链接
   */
  async syncStationPaipanLink(stationId: string): Promise<string | null> {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      include: { user: { select: { id: true, phone: true, nickname: true } } },
    });

    if (!station || !station.user) {
      this.logger.warn(`分站 ${stationId} 或关联用户不存在`);
      return null;
    }

    const { user } = station;

    // 如果已有排盘链接且未过期，直接返回
    if (station.paipanLink) {
      return station.paipanLink;
    }

    // 尝试调用旧排盘系统 API
    let paipanUserId: string | undefined;
    let paipanLink: string | undefined;

    if (this.paipanApiBase) {
      try {
        const result = await this.callPaipanApi("syncUser", {
          phone: user.phone,
          nickname: user.nickname,
          stationName: station.name,
          promotionCode: station.code,
        });

        paipanUserId = result?.userId;
        paipanLink = result?.promotionLink;
      } catch (err: any) {
        this.logger.warn(`排盘API同步失败，降级为默认链接: ${err.message}`);
      }
    }

    // 降级：用默认格式拼接链接
    if (!paipanLink) {
      const base = process.env.PAIPAN_H5_BASE || "https://paipan.rebu.com";
      paipanLink = `${base}/?stationCode=${station.code}&from=app`;
    }

    // 保存到数据库
    const updateData: any = { paipanLink };
    if (paipanUserId) updateData.paipanUserId = paipanUserId;

    await this.prisma.station.update({
      where: { id: stationId },
      data: updateData,
    });

    this.logger.log(
      `分站 ${station.name} 排盘链接已配置: ${paipanLink}${
        paipanUserId ? ` (排盘UID: ${paipanUserId})` : " (降级模式)"
      }`,
    );

    return paipanLink;
  }

  /**
   * 批量同步所有未配置排盘链接的分站
   */
  async syncAll() {
    const stations = await this.prisma.station.findMany({
      where: { paipanLink: null, status: "ACTIVE" },
      select: { id: true, name: true },
    });

    this.logger.log(`开始批量同步 ${stations.length} 个分站...`);

    let success = 0;
    for (const s of stations) {
      const link = await this.syncStationPaipanLink(s.id);
      if (link) success++;
    }

    this.logger.log(`批量同步完成: ${success}/${stations.length}`);
    return { total: stations.length, success };
  }

  // ── 私有方法 ──

  private async callPaipanApi(
    action: string,
    data: Record<string, unknown>,
  ): Promise<{ userId?: string; promotionLink?: string } | null> {
    const url = `${this.paipanApiBase}/api/${action}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.paipanApiKey}`,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    return json?.data || json;
  }
}
