/**
 * 服务端配置中心 — 统一管理所有关键环境变量。
 *
 * 使用方式：
 * - 模块装饰器（DI 不可用）：`import { serverConfig } from "../../config/server-config"; serverConfig.jwtSecret`
 * - 服务/守卫（支持注入）：`constructor(private config: ServerConfigService) {}`
 */
import { Injectable } from "@nestjs/common";

class ServerConfig {
  // ─── JWT ───
  get jwtSecret(): string { return process.env.JWT_SECRET || this.required("JWT_SECRET"); }
  get jwtPreviousSecrets(): string[] {
    return (process.env.JWT_PREVIOUS_SECRETS || "").split(",").map(s => s.trim()).filter(Boolean);
  }

  // ─── 加密 ───
  get encryptionKey(): string { return process.env.ENCRYPTION_KEY || this.required("ENCRYPTION_KEY"); }

  // ─── 环境标识 ───
  get nodeEnv(): string { return process.env.NODE_ENV || "development"; }
  get isProduction(): boolean { return this.nodeEnv === "production"; }
  get isTest(): boolean { return this.nodeEnv === "test"; }
  get port(): number { return parseInt(process.env.PORT || "3000", 10); }
  get host(): string { return process.env.HOST || "0.0.0.0"; }

  // ─── 大屏 ───
  get bigscreenSecret(): string { return process.env.BIGSCREEN_SECRET || this.required("BIGSCREEN_SECRET"); }

  // ─── CORS ───
  get corsOrigin(): string[] {
    return process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
  }

  // ─── 限流 ───
  get disableRateLimit(): boolean {
    return !this.isProduction && process.env.DISABLE_RATE_LIMIT === "true";
  }

  // ─── 邮件 ───
  get emailMode(): string { return process.env.EMAIL_MODE || "log"; }
  get smtp(): { host: string; port: number; user: string; pass: string } {
    return {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
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
  get huifu(): { baseUrl: string; merchantId: string; appId: string; secretKey: string; rsaPrivateKey: string; rsaPublicKey: string; notifyUrl: string } {
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
  get wechat(): { appId: string; appSecret: string; miniprogramAppId: string; miniprogramAppSecret: string } {
    return {
      appId: process.env.WECHAT_APP_ID || "",
      appSecret: process.env.WECHAT_APP_SECRET || "",
      miniprogramAppId: process.env.MINIPROGRAM_APP_ID || "",
      miniprogramAppSecret: process.env.MINIPROGRAM_APP_SECRET || "",
    };
  }

  // ─── 腾讯地图 ───
  get tencentMapKey(): string { return process.env.TENCENT_MAP_KEY || ""; }
  get tencentMapSk(): string { return process.env.TENCENT_MAP_SK || ""; }

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

    const missing = required.filter((r) => !r.value).map((r) => r.name);

    if (missing.length > 0) {
      const msg = `\n╔══════════════════════════════════════════════╗\n║  [ServerConfig] 缺少必需环境变量，服务无法启动 ║\n╠══════════════════════════════════════════════╣\n${missing.map((m) => `║  ✗ ${m.padEnd(40)} ║`).join("\n")}\n╚══════════════════════════════════════════════╝\n`;
      throw new Error(msg);
    }

    return [];
  }
}

/** 单例配置对象 — 模块装饰器等 DI 不可用场景使用 */
export const serverConfig = new ServerConfig();

/** NestJS 可注入配置服务 — 与 serverConfig 共享同一实例 */
@Injectable()
export class ServerConfigService {
  // JWT
  get jwtSecret() { return serverConfig.jwtSecret; }
  get jwtPreviousSecrets() { return serverConfig.jwtPreviousSecrets; }
  // 加密
  get encryptionKey() { return serverConfig.encryptionKey; }
  // 环境
  get nodeEnv() { return serverConfig.nodeEnv; }
  get isProduction() { return serverConfig.isProduction; }
  get port() { return serverConfig.port; }
  get host() { return serverConfig.host; }
  // 业务
  get bigscreenSecret() { return serverConfig.bigscreenSecret; }
  get corsOrigin() { return serverConfig.corsOrigin; }
  get disableRateLimit() { return serverConfig.disableRateLimit; }
  get emailMode() { return serverConfig.emailMode; }
  get smtp() { return serverConfig.smtp; }
  get emailApi() { return serverConfig.emailApi; }
  get huifu() { return serverConfig.huifu; }
  get tencentCloud() { return serverConfig.tencentCloud; }
  get live() { return serverConfig.live; }
  get wechat() { return serverConfig.wechat; }
  get tencentMapKey() { return serverConfig.tencentMapKey; }
  get tencentMapSk() { return serverConfig.tencentMapSk; }
  get knowledgeDedupThreshold() { return serverConfig.knowledgeDedupThreshold; }
}
