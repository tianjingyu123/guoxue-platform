import { createHmac } from "crypto";
import * as zlib from "zlib";

/**
 * 腾讯云 TRTC UserSig 生成（标准算法：HMAC-SHA256 + zlib + base64url）。
 * 需配置环境变量 TRTC_SDK_APP_ID / TRTC_SECRET_KEY；未配置时返回 null（前端据此提示"通话服务待配置"，不伪造）。
 */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "*").replace(/\//g, "-").replace(/=/g, "_");
}

export interface TrtcConfig {
  sdkAppId: number;
  userId: string;
  roomId: string;
  userSig: string | null; // 密钥未配置时为 null
  configured: boolean;
}

export function buildTrtcConfig(userId: string, roomId: string, expireSec = 86400): TrtcConfig {
  const sdkAppId = Number(process.env.TRTC_SDK_APP_ID) || 0;
  const secretKey = process.env.TRTC_SECRET_KEY || "";
  if (!sdkAppId || !secretKey) {
    return { sdkAppId, userId, roomId, userSig: null, configured: false };
  }
  const currTime = Math.floor(Date.now() / 1000);
  const content =
    `TLS.identifier:${userId}\n` +
    `TLS.sdkappid:${sdkAppId}\n` +
    `TLS.time:${currTime}\n` +
    `TLS.expire:${expireSec}\n`;
  const sig = createHmac("sha256", secretKey).update(content).digest("base64");
  const doc = {
    "TLS.ver": "2.0",
    "TLS.identifier": userId,
    "TLS.sdkappid": sdkAppId,
    "TLS.expire": expireSec,
    "TLS.time": currTime,
    "TLS.sig": sig,
  };
  const compressed = zlib.deflateSync(Buffer.from(JSON.stringify(doc)));
  return { sdkAppId, userId, roomId, userSig: base64url(compressed), configured: true };
}
