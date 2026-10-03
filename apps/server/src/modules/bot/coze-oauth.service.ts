import { Injectable, Logger } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { RedisService } from "../../redis/redis.service";

/**
 * Coze OAuth JWT 授权服务（服务端应用 / Service application）
 *
 * ## 为什么用 OAuth JWT 而非个人访问令牌(PAT)
 * - PAT 最长 30 天需人工到 coze.cn 手动续期，过期即断服，维护成本高
 * - OAuth JWT「服务类应用」：后端用私钥(RS256)自签 JWT → 换取 access_token（默认 900s）
 *   → 缓存并在到期前自动刷新，全程免人工维护
 *
 * ## 凭证来源（董事长在后台『第三方配置 · Coze OAuth』卡片填写，加密落库）
 * - COZE_OAUTH_CLIENT_ID      应用ID   → JWT 的 iss
 * - COZE_OAUTH_PUBLIC_KEY_ID  公钥指纹 → JWT header 的 kid
 * - COZE_OAUTH_PRIVATE_KEY    私钥PEM  → RS256 签名私钥（🔴敏感·加密存储·绝不落日志）
 * - COZE_API_BASE             API域名  → 默认 https://api.coze.cn（换取端点与 aud 由此派生）
 *
 * 规范依据 Coze 官方文档「Generate access tokens using JWT (developer)」及官方 SDK：
 * - 换取端点：POST {base}/api/permission/oauth2/token
 * - 请求头：Authorization: Bearer {自签JWT}
 * - 请求体：grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer，duration_seconds
 * - JWT：alg=RS256，header.kid=public_key_id，payload{iss=client_id, aud=api域名host,
 *        iat=now, exp=now+3600, jti=随机}
 */
@Injectable()
export class CozeOAuthService {
  private readonly logger = new Logger(CozeOAuthService.name);
  private static readonly CACHE_KEY = "coze:oauth:access_token";
  private static readonly LOCK_KEY = "coze:oauth:lock";

  constructor(private readonly redis: RedisService) {}

  /** 是否已配置 OAuth（三项核心凭证齐备）——由 ThirdPartyConfigLoader.syncToEnv 写入 process.env */
  isConfigured(): boolean {
    return !!(
      process.env.COZE_OAUTH_CLIENT_ID &&
      process.env.COZE_OAUTH_PUBLIC_KEY_ID &&
      process.env.COZE_OAUTH_PRIVATE_KEY
    );
  }

  /**
   * 获取可用的 Coze access_token（带缓存 + 自动刷新 + 防并发击穿）。
   * - 未配置 OAuth：返回 null（调用方回退 PAT）
   * - 换取失败：记录错误（不含私钥/令牌）并返回 null（调用方回退 PAT，过渡不断服务）
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;

    const cached = await this.redis.get(CozeOAuthService.CACHE_KEY);
    if (cached) return cached;

    // 防缓存击穿：抢锁失败者短暂等待后读缓存，避免多实例并发狂刷 token 端点
    const lockOk = await this.redis.setNX(CozeOAuthService.LOCK_KEY, "1", 15);
    if (!lockOk) {
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const t = await this.redis.get(CozeOAuthService.CACHE_KEY);
        if (t) return t;
      }
      // 等待超时仍无缓存：兜底自己去换一次（不再持锁）
    }

    try {
      const { token, ttl } = await this.fetchToken();
      await this.redis.set(CozeOAuthService.CACHE_KEY, token, ttl);
      return token;
    } catch (e) {
      // 🔴 仅记录错误摘要，绝不打印私钥 / JWT / access_token
      this.logger.error(`Coze OAuth 换取 access_token 失败（回退 PAT）：${(e as Error).message}`);
      return null;
    } finally {
      if (lockOk) await this.redis.del(CozeOAuthService.LOCK_KEY);
    }
  }

  /** 手动失效缓存（凭证变更后可调用，下次自动重新换取） */
  async invalidate(): Promise<void> {
    await this.redis.del(CozeOAuthService.CACHE_KEY);
  }

  /** 自签 JWT → POST 换取 access_token；返回令牌与建议缓存 TTL（提前5分钟刷新） */
  private async fetchToken(): Promise<{ token: string; ttl: number }> {
    const base = (process.env.COZE_API_BASE || "https://api.coze.cn").replace(/\/+$/, "");
    const aud = new URL(base).host; // api.coze.cn / api.coze.com
    const now = Math.floor(Date.now() / 1000);
    const clientId = process.env.COZE_OAUTH_CLIENT_ID as string;
    const publicKeyId = process.env.COZE_OAUTH_PUBLIC_KEY_ID as string;
    const privateKey = process.env.COZE_OAUTH_PRIVATE_KEY as string;

    // RS256 自签：iss=client_id，aud=API域名，exp=1h（JWT 自身短时效，仅用于换 token），jti 防重放
    const assertion = jwt.sign(
      { iss: clientId, aud, iat: now, exp: now + 3600, jti: crypto.randomBytes(16).toString("hex") },
      privateKey,
      { algorithm: "RS256", keyid: publicKeyId },
    );

    const resp = await fetch(`${base}/api/permission/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${assertion}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        duration_seconds: 900, // 单个 access_token 有效期（最长 86399s，取默认 900s）
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (!resp.ok || !data.access_token) {
      // 不含敏感信息：仅错误码/描述
      const code = data.error_code ?? data.code ?? "";
      const msg = data.error_message ?? data.error ?? data.msg ?? "";
      throw new Error(`HTTP ${resp.status} ${code} ${msg}`.trim());
    }

    const token = String(data.access_token);
    const expires = Number(data.expires_in) || 0;
    // 兼容两种口径：Coze 的 expires_in 可能是绝对 Unix 时间戳，也可能是时长秒数
    const remaining = expires > 1_000_000_000 ? expires - now : expires;
    const ttl = Math.max(remaining - 300, 60); // 提前 5 分钟刷新；异常小值至少缓存 60s
    return { token, ttl };
  }
}
