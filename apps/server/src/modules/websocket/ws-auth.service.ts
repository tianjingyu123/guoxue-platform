import { Injectable, Logger } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

export interface WsUser {
  userId: string;
  role: string;
  nickname?: string;
}

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "";
    if (!this.jwtSecret) {
      throw new Error("JWT_SECRET 环境变量未设置，WebSocket 认证服务无法启动");
    }
  }

  /** 使用原生 crypto 验证 JWT HS256 签名并解析 payload */
  verifyToken(token: string): WsUser | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, sigB64] = parts;

      // 验证签名
      const signed = `${headerB64}.${payloadB64}`;
      const expectedSig = base64UrlToBase64(sigB64);
      const hmac = createHmac("sha256", this.jwtSecret);
      hmac.update(signed);
      const computedSig = hmac.digest("base64");

      if (expectedSig.length !== computedSig.length ||
          !timingSafeEqual(Buffer.from(expectedSig), Buffer.from(computedSig))) {
        this.logger.warn("JWT签名验证失败");
        return null;
      }

      // 解析 payload
      const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const payload = JSON.parse(payloadJson);

      // 检查过期
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logger.warn("JWT已过期");
        return null;
      }

      return {
        userId: payload.sub || payload.id,
        role: payload.role || "USER",
        nickname: payload.nickname,
      };
    } catch (err: unknown) {
      this.logger.warn(`JWT解析失败: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** 从 handshake 提取并验证 token */
  extractUser(handshake: Record<string, unknown>): WsUser | null {
    const auth = handshake.auth as Record<string, unknown> | undefined;
    const query = handshake.query as Record<string, unknown> | undefined;
    const headers = handshake.headers as Record<string, unknown> | undefined;
    const token: string =
      (auth?.token as string) ||
      (query?.token as string) ||
      (headers?.authorization as string)?.replace("Bearer ", "") ||
      "";
    if (!token) return null;
    return this.verifyToken(token);
  }
}

/** base64url → base64 转换 */
function base64UrlToBase64(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return base64;
}
