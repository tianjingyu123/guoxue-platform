/**
 * 服务端配置中心 — 统一管理所有关键环境变量。
 *
 * 使用方式：
 * - 模块装饰器（DI 不可用）：`import { serverConfig } from "../../config/server-config"; serverConfig.jwtSecret`
 * - 服务/守卫（支持注入）：`constructor(private config: ServerConfigService) {}`
 */
import { Injectable } from "@nestjs/common";

function normalizeOriginList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  ];
}

class ServerConfig {
  // ─── JWT ───
  get jwtSecret(): string {
    return process.env.JWT_SECRET || this.required("JWT_SECRET");
  }
  get jwtPreviousSecrets(): string[] {
    return (process.env.JWT_PREVIOUS_SECRETS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ─── 加密 ───
  get encryptionKey(): string {
    return process.env.ENCRYPTION_KEY || this.required("ENCRYPTION_KEY");
  }

  // ─── 环境标识 ───
  get nodeEnv(): string {
    return process.env.NODE_ENV || "development";
  }
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }
  get isTest(): boolean {
    return this.nodeEnv === "test";
  }
  get port(): number {
    return parseInt(process.env.PORT || "3000", 10);
  }
  get host(): string {
    return process.env.HOST || "0.0.0.0";
  }

  // ─── 公网入口（域名迁移时只改环境变量，不改业务代码） ───
  private normalizedUrl(value: string, fallback: string, trailingSlash = false): string {
    const normalized = (value || fallback).trim().replace(/\/+$/, "");
    return trailingSlash ? `${normalized}/` : normalized;
  }
  get publicDomain(): string {
    return (process.env.PUBLIC_DOMAIN || "api.rebugx.cn").trim();
  }
  get publicApiUrl(): string {
    return this.normalizedUrl(process.env.PUBLIC_API_URL || "", `https://${this.publicDomain}`);
  }
  get publicH5Url(): string {
    return this.normalizedUrl(
      process.env.PUBLIC_H5_URL || process.env.H5_BASE_URL || "",
      `${this.publicApiUrl}/h5`,
      true,
    );
  }
  get publicH5BaseUrl(): string {
    return this.publicH5Url.replace(/\/+$/, "");
  }
  get publicAssetOrigin(): string {
    return this.normalizedUrl(process.env.PUBLIC_ASSET_ORIGIN || "", this.publicApiUrl);
  }
  get cookieDomain(): string {
    return (process.env.COOKIE_DOMAIN || "").trim();
  }

  // ─── 大屏 ───
  get bigscreenSecret(): string {
    return process.env.BIGSCREEN_SECRET || this.required("BIGSCREEN_SECRET");
  }

  // ─── CORS ───
  get corsOrigin(): string[] {
    const configured = normalizeOriginList(process.env.CORS_ORIGIN || "");
    if (configured.length > 0) return configured;
    return ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
  }
  get wsCorsOrigin(): string[] {
    const configured = normalizeOriginList(process.env.WS_CORS_ORIGIN || "");
    if (configured.length > 0) return configured;
    return this.isProduction
      ? []
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
  }

  // ─── 限流 ───
  get disableRateLimit(): boolean {
    return !this.isProduction && process.env.DISABLE_RATE_LIMIT === "true";
  }

  // ─── 邮件 ───
  get emailMode(): string {
    return process.env.EMAIL_MODE || "disabled";
  }
  get smtp(): { host: string; port: number; user: string; pass: string } {
    return {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    };
  }
  get emailApi(): { url: string; key: string } {
    return {
      url: process.env.EMAIL_API_URL || "",
      key: process.env.EMAIL_API_KEY || "",
    };
  }

  // ─── 汇付支付 ───
  get huifu(): {
    baseUrl: string;
    merchantId: string;
    appId: string;
    secretKey: string;
    rsaPrivateKey: string;
    rsaPublicKey: string;
    notifyUrl: string;
  } {
    return {
      baseUrl: process.env.HUIFU_BASE_URL || "",
      merchantId: process.env.HUIFU_MERCHANT_ID || "",
      appId: process.env.HUIFU_APP_ID || "",
      secretKey: process.env.HUIFU_SECRET_KEY || "",
      rsaPrivateKey: process.env.HUIFU_RSA_PRIVATE_KEY || "",
      rsaPublicKey: process.env.HUIFU_RSA_PUBLIC_KEY || "",
      notifyUrl: process.env.HUIFU_NOTIFY_URL || "",
    };
  }

  // ─── 腾讯云 ───
  get tencentCloud(): { secretId: string; secretKey: string; appId: string } {
    return {
      secretId: process.env.TENCENT_SECRET_ID || "",
      secretKey: process.env.TENCENT_SECRET_KEY || "",
      appId: process.env.TENCENT_APP_ID || "",
    };
  }

  // ─── 流媒体 ───
  get live(): { pushDomain: string; playDomain: string } {
    return {
      pushDomain: process.env.LIVE_PUSH_DOMAIN || "",
      playDomain: process.env.LIVE_PLAY_DOMAIN || "",
    };
  }

  // ─── 微信 ───
  get wechat(): {
    appId: string;
    appSecret: string;
    miniprogramAppId: string;
    miniprogramAppSecret: string;
  } {
    return {
      appId: process.env.WECHAT_APP_ID || "",
      appSecret: process.env.WECHAT_APP_SECRET || "",
      miniprogramAppId: process.env.MINIPROGRAM_APP_ID || "",
      miniprogramAppSecret: process.env.MINIPROGRAM_APP_SECRET || "",
    };
  }

  // ─── 腾讯地图 ───
  get tencentMapKey(): string {
    return process.env.TENCENT_MAP_KEY || "";
  }
  get tencentMapSk(): string {
    return process.env.TENCENT_MAP_SK || "";
  }

  // ─── 知识去重阈值 ───
  get knowledgeDedupThreshold(): number {
    return parseFloat(process.env.KNOWLEDGE_DEDUP_THRESHOLD || "0.9");
  }

  private required(name: string): never {
    throw new Error(`[ServerConfig] 环境变量 ${name} 未设置，拒绝启动`);
  }

  /** 启动前校验所有必需环境变量，一次性列出所有缺失项 */
  validateRequiredEnv(): string[] {
    const required: Array<{ name: string; value: string }> = [
      { name: "JWT_SECRET", value: process.env.JWT_SECRET || "" },
      { name: "ENCRYPTION_KEY", value: process.env.ENCRYPTION_KEY || "" },
      { name: "BIGSCREEN_SECRET", value: process.env.BIGSCREEN_SECRET || "" },
      { name: "DATABASE_URL", value: process.env.DATABASE_URL || "" },
    ];

    // Docker Compose 已对这些变量做门禁，但生产服务也可能被 systemd、PM2 或
    // 临时容器直接启动。服务自身必须再次失败闭合，不能悄悄回退到旧域名、
    // localhost Redis 或空 CORS，避免迁移后出现“接口正常、客户端不可用”的半上线状态。
    if (this.isProduction) {
      required.push(
        { name: "REDIS_URL", value: process.env.REDIS_URL || "" },
        { name: "PUBLIC_DOMAIN", value: process.env.PUBLIC_DOMAIN || "" },
        { name: "PUBLIC_API_URL", value: process.env.PUBLIC_API_URL || "" },
        { name: "PUBLIC_H5_URL", value: process.env.PUBLIC_H5_URL || "" },
        { name: "PUBLIC_ASSET_ORIGIN", value: process.env.PUBLIC_ASSET_ORIGIN || "" },
        { name: "CORS_ORIGIN", value: process.env.CORS_ORIGIN || "" },
        { name: "WS_CORS_ORIGIN", value: process.env.WS_CORS_ORIGIN || "" },
      );
    }

    const missing = required.filter((r) => !r.value).map((r) => r.name);

    if (missing.length > 0) {
      const msg = `\n╔══════════════════════════════════════════════╗\n║  [ServerConfig] 缺少必需环境变量，服务无法启动 ║\n╠══════════════════════════════════════════════╣\n${missing.map((m) => `║  ✗ ${m.padEnd(40)} ║`).join("\n")}\n╚══════════════════════════════════════════════╝\n`;
      throw new Error(msg);
    }

    if (this.isProduction) this.validatePublicTopology();

    return [];
  }

  /** 防止变量虽已填写，但协议、主机或跨域来源彼此冲突。 */
  private validatePublicTopology(): void {
    const errors: string[] = [];
    const publicDomain = (process.env.PUBLIC_DOMAIN || "").trim();
    const urlEntries = [
      ["PUBLIC_API_URL", process.env.PUBLIC_API_URL || ""],
      ["PUBLIC_H5_URL", process.env.PUBLIC_H5_URL || ""],
      ["PUBLIC_ASSET_ORIGIN", process.env.PUBLIC_ASSET_ORIGIN || ""],
    ] as const;
    const parsed = new Map<string, URL>();

    for (const [name, value] of urlEntries) {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:") errors.push(`${name} 生产环境必须使用 HTTPS`);
        parsed.set(name, url);
      } catch {
        errors.push(`${name} 不是有效 URL`);
      }
    }

    const apiUrl = parsed.get("PUBLIC_API_URL");
    if (apiUrl && apiUrl.hostname !== publicDomain) {
      errors.push("PUBLIC_DOMAIN 必须与 PUBLIC_API_URL 的主机名一致");
    }

    const h5Origin = parsed.get("PUBLIC_H5_URL")?.origin;
    const corsOrigins = normalizeOriginList(process.env.CORS_ORIGIN || "");
    const wsOrigins = normalizeOriginList(process.env.WS_CORS_ORIGIN || "");

    if (corsOrigins.includes("*") || wsOrigins.includes("*")) {
      errors.push("生产环境 CORS / WebSocket CORS 不允许使用 *");
    }
    if (h5Origin && !corsOrigins.includes(h5Origin)) {
      errors.push("CORS_ORIGIN 必须包含 PUBLIC_H5_URL 的 origin");
    }
    if (h5Origin && !wsOrigins.includes(h5Origin)) {
      errors.push("WS_CORS_ORIGIN 必须包含 PUBLIC_H5_URL 的 origin");
    }

    if (errors.length > 0) {
      throw new Error(
        `[ServerConfig] 生产公网拓扑校验失败：\n${errors.map((item) => `  ✗ ${item}`).join("\n")}`,
      );
    }
  }

  /** 启动时校验安全配置强度（密钥长度/弱值）。生产环境失败抛错拒绝启动，开发环境放行并告警。 */
  validateSecurityConfig(): void {
    const errors: string[] = [];
    const jwt = process.env.JWT_SECRET || "";
    const jwtLen = Buffer.byteLength(jwt, "utf8");
    if (jwtLen < 32) errors.push(`JWT_SECRET 长度 ${jwtLen} < 32 字节，强度不足`);
    const enc = process.env.ENCRYPTION_KEY || "";
    const encLen = Buffer.byteLength(enc, "utf8");
    if (encLen !== 32) errors.push(`ENCRYPTION_KEY 必须为 32 字节（当前 ${encLen}）`);
    const weak = [
      "change-me",
      "dev-jwt-secret-for-local-testing-only-change-in-prod",
      "your-secret",
      "password",
      "secret123",
    ];
    if (jwt && weak.some((w) => jwt.includes(w)))
      errors.push("JWT_SECRET 使用了默认/弱值，请更换为高强度随机串");

    if (errors.length === 0) return;
    const body = errors.map((e) => "  ✗ " + e).join("\n");
    if (this.isProduction) {
      throw new Error(`[ServerConfig] 安全配置校验失败，生产环境拒绝启动：\n${body}`);
    }
    process.stderr.write(
      `[ServerConfig] ⚠️ 安全配置告警（开发环境放行，生产必须修复）：\n${body}\n`,
    );
  }
}

/** 单例配置对象 — 模块装饰器等 DI 不可用场景使用 */
export const serverConfig = new ServerConfig();

/** NestJS 可注入配置服务 — 与 serverConfig 共享同一实例 */
@Injectable()
export class ServerConfigService {
  // JWT
  get jwtSecret() {
    return serverConfig.jwtSecret;
  }
  get jwtPreviousSecrets() {
    return serverConfig.jwtPreviousSecrets;
  }
  // 加密
  get encryptionKey() {
    return serverConfig.encryptionKey;
  }
  // 环境
  get nodeEnv() {
    return serverConfig.nodeEnv;
  }
  get isProduction() {
    return serverConfig.isProduction;
  }
  get port() {
    return serverConfig.port;
  }
  get host() {
    return serverConfig.host;
  }
  get publicDomain() {
    return serverConfig.publicDomain;
  }
  get publicApiUrl() {
    return serverConfig.publicApiUrl;
  }
  get publicH5Url() {
    return serverConfig.publicH5Url;
  }
  get publicH5BaseUrl() {
    return serverConfig.publicH5BaseUrl;
  }
  get publicAssetOrigin() {
    return serverConfig.publicAssetOrigin;
  }
  get cookieDomain() {
    return serverConfig.cookieDomain;
  }
  // 业务
  get bigscreenSecret() {
    return serverConfig.bigscreenSecret;
  }
  get corsOrigin() {
    return serverConfig.corsOrigin;
  }
  get wsCorsOrigin() {
    return serverConfig.wsCorsOrigin;
  }
  get disableRateLimit() {
    return serverConfig.disableRateLimit;
  }
  get emailMode() {
    return serverConfig.emailMode;
  }
  get smtp() {
    return serverConfig.smtp;
  }
  get emailApi() {
    return serverConfig.emailApi;
  }
  get huifu() {
    return serverConfig.huifu;
  }
  get tencentCloud() {
    return serverConfig.tencentCloud;
  }
  get live() {
    return serverConfig.live;
  }
  get wechat() {
    return serverConfig.wechat;
  }
  get tencentMapKey() {
    return serverConfig.tencentMapKey;
  }
  get tencentMapSk() {
    return serverConfig.tencentMapSk;
  }
  get knowledgeDedupThreshold() {
    return serverConfig.knowledgeDedupThreshold;
  }
}
