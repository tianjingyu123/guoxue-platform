import { createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TLSSigAPIv2 = require("tls-sig-api-v2");

export interface LiveTrtcTicket {
  sdkAppId: number;
  userId: string;
  strRoomId: string;
  userSig: string;
  privateMapKey: string;
  expiresAt: string;
}

/**
 * 平台 UUID 超过 TRTC UserID 的 32 字节上限，统一映射为不可逆、稳定的短标识。
 * 原始用户 ID 不传给腾讯云，也不把 TRTC 标识当作平台身份使用。
 */
export function toLiveTrtcUserId(platformUserId: string): string {
  return `u_${createHash("sha256").update(platformUserId).digest("hex").slice(0, 30)}`;
}

/** 签发只对指定直播间有效的短期票据；缺配置时返回 null，绝不生成伪票据。 */
export function buildLiveTrtcTicket(
  platformUserId: string,
  strRoomId: string,
  privilegeMap: number,
  expireSeconds = 600,
): LiveTrtcTicket | null {
  const sdkAppId = Number(process.env.TRTC_SDK_APP_ID || 0);
  const secretKey = String(process.env.TRTC_SECRET_KEY || "").trim();
  if (!Number.isSafeInteger(sdkAppId) || sdkAppId <= 0 || !secretKey || !strRoomId) return null;

  const userId = toLiveTrtcUserId(platformUserId);
  const api = new TLSSigAPIv2.Api(sdkAppId, secretKey);
  return {
    sdkAppId,
    userId,
    strRoomId,
    userSig: api.genUserSig(userId, expireSeconds),
    privateMapKey: api.genPrivateMapKeyWithStringRoomID(userId, expireSeconds, strRoomId, privilegeMap),
    expiresAt: new Date(Date.now() + expireSeconds * 1000).toISOString(),
  };
}
