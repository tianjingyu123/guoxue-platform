import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;
const JWKS_TIMEOUT_MS = 5_000;

interface AppleJwk extends crypto.JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

interface AppleJwksResponse {
  keys?: AppleJwk[];
}

export interface VerifiedAppleIdentity {
  subject: string;
  audience: string;
  emailVerified: boolean;
  isPrivateEmail: boolean;
  realUserStatus?: number;
}

/**
 * 只使用 Apple 公钥验证原生 Sign in with Apple 返回的 identityToken。
 * 私钥、authorizationCode 和 identityToken 均不落库、不写日志。
 */
@Injectable()
export class AppleLoginService {
  private readonly keys = new Map<string, crypto.KeyObject>();
  private keysExpiresAt = 0;

  private get audience(): string {
    return (
      process.env.APPLE_LOGIN_AUDIENCE ||
      process.env.APPLE_IAP_BUNDLE_ID ||
      "com.rebu.iosapprebu"
    ).trim();
  }

  async verifyIdentityToken(identityToken: string): Promise<VerifiedAppleIdentity> {
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || typeof decoded === "string") throw new Error("APPLE_TOKEN_MALFORMED");
    if (decoded.header.alg !== "RS256" || !decoded.header.kid) {
      throw new Error("APPLE_TOKEN_HEADER_INVALID");
    }

    const publicKey = await this.getPublicKey(decoded.header.kid);
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ["RS256"],
      issuer: APPLE_ISSUER,
      audience: this.audience,
    });
    if (typeof payload === "string" || !payload.sub) throw new Error("APPLE_TOKEN_SUBJECT_MISSING");

    const audience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
    if (!audience || audience !== this.audience) throw new Error("APPLE_TOKEN_AUDIENCE_INVALID");

    return {
      subject: payload.sub,
      audience,
      emailVerified: payload.email_verified === true || payload.email_verified === "true",
      isPrivateEmail: payload.is_private_email === true || payload.is_private_email === "true",
      realUserStatus:
        typeof payload.real_user_status === "number" ? payload.real_user_status : undefined,
    };
  }

  private async getPublicKey(kid: string): Promise<crypto.KeyObject> {
    const cached = this.keys.get(kid);
    if (cached && Date.now() < this.keysExpiresAt) return cached;

    await this.refreshKeys();
    const key = this.keys.get(kid);
    if (!key) throw new Error("APPLE_SIGNING_KEY_NOT_FOUND");
    return key;
  }

  private async refreshKeys(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JWKS_TIMEOUT_MS);
    try {
      const response = await fetch(APPLE_JWKS_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("APPLE_JWKS_UNAVAILABLE");
      const body = (await response.json()) as AppleJwksResponse;
      const next = new Map<string, crypto.KeyObject>();
      for (const jwk of body.keys || []) {
        if (!jwk.kid || (jwk.alg && jwk.alg !== "RS256") || (jwk.use && jwk.use !== "sig"))
          continue;
        try {
          next.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" }));
        } catch {
          // 单个异常公钥不影响同一批次其他有效公钥。
        }
      }
      if (next.size === 0) throw new Error("APPLE_JWKS_EMPTY");
      this.keys.clear();
      for (const [keyId, key] of next) this.keys.set(keyId, key);
      this.keysExpiresAt = Date.now() + JWKS_CACHE_MS;
    } finally {
      clearTimeout(timeout);
    }
  }
}
