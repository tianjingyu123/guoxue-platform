import { createHash } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PaipanRuntimeService } from "../../common/paipan-runtime.service";
import { decrypt } from "../../common/crypto.util";
import { PrismaService } from "../../prisma/prisma.service";

export interface LegacyPaipanEntry {
  mode: "legacy" | "native";
  url: string | null;
  attributionReady: boolean;
}

export type StationPaipanSyncState = "SYNCED" | "PENDING_AUTHORIZATION" | "FAILED" | "PENDING";

@Injectable()
export class StationPaipanSyncService {
  private readonly logger = new Logger(StationPaipanSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runtime: PaipanRuntimeService,
  ) {}

  getRuntime() {
    return { mode: this.runtime.getMode() };
  }

  async getUserEntry(userId: string): Promise<LegacyPaipanEntry> {
    return this.getSignedUserEntry(userId, "tool");
  }

  async getUserAccountEntry(userId: string): Promise<LegacyPaipanEntry> {
    return this.getSignedUserEntry(userId, "my");
  }

  async getStationEntry(
    stationId: string,
  ): Promise<{ mode: "legacy" | "native"; url: string | null }> {
    if (this.runtime.isNative()) return { mode: "native", url: null };
    const station = await this.prisma.station.findFirst({
      where: { id: stationId, status: "ACTIVE" },
      select: { paipanLink: true, paipanUserId: true },
    });
    if (!station?.paipanLink || !/^\d+$/.test(String(station.paipanUserId || ""))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该分站排盘入口尚未同步完成，请稍后重试");
    }
    const expected = this.buildReferralUrl(String(station.paipanUserId));
    if (station.paipanLink !== expected) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        "该分站排盘入口配置异常，请联系平台处理",
      );
    }
    return { mode: "legacy", url: expected };
  }

  /** 支付事务提交后调用；第三方失败不得反向修改本地支付和分站状态。 */
  async syncByUserId(userId: string): Promise<string | null> {
    const station = await this.prisma.station.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { id: true },
    });
    return station ? this.syncStationPaipanLink(station.id) : null;
  }

  /** 幂等同步：查用户→已有则开通合伙人→复查 userid→原子保存映射。 */
  async syncStationPaipanLink(stationId: string): Promise<string | null> {
    const station = await this.prisma.station.findFirst({
      where: { id: stationId, status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        paipanLink: true,
        paipanUserId: true,
        user: { select: { phone: true, phoneEnc: true } },
      },
    });
    if (!station) return null;

    if (/^\d+$/.test(String(station.paipanUserId || ""))) {
      const link = this.buildReferralUrl(String(station.paipanUserId));
      if (station.paipanLink !== link) {
        await this.prisma.station.update({ where: { id: station.id }, data: { paipanLink: link } });
      }
      await this.audit(station, "SYNCED", "MAPPING_CONFIRMED");
      return link;
    }

    let phone: string;
    try {
      phone = this.readPhone(station.user);
    } catch (error) {
      await this.audit(station, "FAILED", "PHONE_UNAVAILABLE");
      throw error;
    }

    try {
      const existing = await this.lookupUser(phone);
      if (!existing.exists) {
        await this.audit(station, "PENDING_AUTHORIZATION", "REMOTE_USER_NOT_FOUND");
        return null;
      }
      await this.openPartner(phone);
      const confirmed = await this.lookupUser(phone);
      if (!confirmed.userId) throw new Error("REMOTE_USER_ID_INVALID");
      const link = this.buildReferralUrl(confirmed.userId);
      await this.prisma.station.update({
        where: { id: station.id },
        data: { paipanUserId: confirmed.userId, paipanLink: link },
      });
      await this.audit(station, "SYNCED", "PARTNER_CONFIRMED");
      return link;
    } catch (error) {
      const code = this.safeFailureCode(error);
      await this.audit(station, "FAILED", code);
      this.logger.warn(`旧排盘分站同步失败 station=${station.id} code=${code}`);
      return null;
    }
  }

  async getOwnSyncState(userId: string) {
    const station = await this.prisma.station.findFirst({
      where: { userId, status: "ACTIVE" },
      select: {
        id: true,
        paipanLink: true,
        paipanUserId: true,
        user: { select: { phone: true, phoneEnc: true } },
      },
    });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "未找到已开通的分站");
    if (station.paipanLink && /^\d+$/.test(String(station.paipanUserId || ""))) {
      return {
        state: "SYNCED" as StationPaipanSyncState,
        referralUrl: station.paipanLink,
        authorizationUrl: null,
      };
    }
    const latest = await this.prisma.auditLog.findFirst({
      where: { action: "LEGACY_PAIPAN_STATION_SYNC", targetType: "Station", targetId: station.id },
      orderBy: { createdAt: "desc" },
      select: { detail: true },
    });
    let state: StationPaipanSyncState = "PENDING";
    try {
      const parsed = JSON.parse(latest?.detail || "{}") as { state?: StationPaipanSyncState };
      if (parsed.state) state = parsed.state;
    } catch {
      state = "PENDING";
    }
    return {
      state,
      referralUrl: null,
      authorizationUrl:
        state === "PENDING_AUTHORIZATION"
          ? this.buildPartnerAuthorizationUrl(this.readPhone(station.user))
          : null,
    };
  }

  async syncAll() {
    const stations = await this.prisma.station.findMany({
      where: { paipanUserId: null, status: "ACTIVE" },
      select: { id: true },
    });
    let success = 0;
    for (const station of stations) {
      if (await this.syncStationPaipanLink(station.id)) success += 1;
    }
    return { total: stations.length, success, pending: stations.length - success };
  }

  private async getSignedUserEntry(
    userId: string,
    target: "tool" | "my",
  ): Promise<LegacyPaipanEntry> {
    if (this.runtime.isNative()) return { mode: "native", url: null, attributionReady: true };
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneEnc: true, attributionStationId: true },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
    const phone = this.readPhone(user);
    const url = this.buildSignedEntryUrl(phone, target);
    const attributionReady = await this.isAttributionReady(user.attributionStationId);
    return { mode: "legacy", url, attributionReady };
  }

  private readPhone(user: { phone?: string | null; phoneEnc?: string | null }): string {
    const phone = String(user.phoneEnc ? decrypt(user.phoneEnc) : user.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "进入排盘服务前请先绑定中国大陆手机号");
    }
    return phone;
  }

  private buildSignedEntryUrl(phone: string, target: "tool" | "my"): string {
    const url = this.parseHttpsUrl(
      process.env.PAIPAN_OPERATION_H5_BASE ||
        process.env.PAIPAN_H5_BASE ||
        "https://www.yrydai.cn/guoxueApp.php",
      "PAIPAN_OPERATION_H5_BASE",
    );
    const key = createHash("md5").update(`${phone}@rebuguoxue${phone}`, "utf8").digest("hex");
    url.searchParams.set("mobile", phone);
    url.searchParams.set("key", key);
    url.searchParams.set("go", target);
    if (target === "tool")
      url.searchParams.set("v", String(process.env.PAIPAN_LEGACY_DISPLAY_VERSION || "1"));
    else url.searchParams.delete("v");
    return url.toString();
  }

  private async lookupUser(phone: string): Promise<{ exists: boolean; userId: string | null }> {
    const url = this.parseHttpsUrl(
      process.env.PAIPAN_USER_LOOKUP_URL || "https://www.yrydai.cn/recommend/mobileUser.php",
      "PAIPAN_USER_LOOKUP_URL",
    );
    url.searchParams.set("mobile", phone);
    const data = await this.fetchJson(url);
    const userId = String(data?.userid || "");
    return {
      exists: String(data?.status) === "1" && /^\d+$/.test(userId),
      userId: /^\d+$/.test(userId) ? userId : null,
    };
  }

  private async openPartner(phone: string): Promise<void> {
    const url = this.parseHttpsUrl(
      process.env.PAIPAN_PARTNER_OPEN_URL || "https://www.yrydai.cn/recommend/partner.php",
      "PAIPAN_PARTNER_OPEN_URL",
    );
    url.searchParams.set("mobile", phone);
    await this.fetchJson(url, false);
  }

  private buildPartnerAuthorizationUrl(phone: string): string {
    const url = this.parseHttpsUrl(
      process.env.PAIPAN_PARTNER_OAUTH_URL ||
        "https://www.yrydai.cn/my.php?mod=member&act=addPartner",
      "PAIPAN_PARTNER_OAUTH_URL",
    );
    url.searchParams.set("mobile", phone);
    return url.toString();
  }

  private buildReferralUrl(userId: string): string {
    const url = this.parseHttpsUrl(
      process.env.PAIPAN_REFERRAL_BASE || "https://www.yrydai.com/p1.php",
      "PAIPAN_REFERRAL_BASE",
    );
    url.searchParams.set("ruid", userId);
    return url.toString();
  }

  private parseHttpsUrl(value: string, name: string): URL {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, `${name} 配置无效`);
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        `${name} 必须是无账号信息的 HTTPS 地址`,
      );
    }
    return url;
  }

  private async fetchJson(url: URL, requireJson = true): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) throw new Error(`REMOTE_HTTP_${response.status}`);
      const text = await response.text();
      if (!requireJson && !text.trim().startsWith("{")) return {};
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("REMOTE_RESPONSE_INVALID");
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private safeFailureCode(error: unknown): string {
    const message = error instanceof Error ? error.message : "";
    if (/^REMOTE_HTTP_\d+$/.test(message)) return message;
    if (message === "REMOTE_RESPONSE_INVALID" || message === "REMOTE_USER_ID_INVALID")
      return message;
    if (error instanceof Error && error.name === "AbortError") return "REMOTE_TIMEOUT";
    return "REMOTE_NETWORK_ERROR";
  }

  private async audit(
    station: { id: string; userId: string },
    state: StationPaipanSyncState,
    code: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: station.userId,
        executor: "SYSTEM",
        autonomyLevel: "L1",
        action: "LEGACY_PAIPAN_STATION_SYNC",
        targetType: "Station",
        targetId: station.id,
        detail: JSON.stringify({ state, code }),
      },
    });
  }

  private async isAttributionReady(stationId: string | null): Promise<boolean> {
    if (!stationId) return true;
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { paipanLink: true, paipanUserId: true },
    });
    return Boolean(station?.paipanLink && /^\d+$/.test(String(station.paipanUserId || "")));
  }
}
