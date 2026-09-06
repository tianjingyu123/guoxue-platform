import { createHash } from "crypto";
import { consultTrtcSettings } from "../../common/consult-trtc-settings";
// 复用仓库已锁定的腾讯签名实现，不维护另一份自定义签名协议。
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TLSSigAPIv2 = require("tls-sig-api-v2");

export interface TrtcConfig {
  sdkAppId: number;
  userId: string;
  roomId: string;
  strRoomId: string;
  userSig: string | null; // 密钥未配置时为 null
  privateMapKey: string | null;
  expiresAt: string | null;
  configured: boolean;
}

export const consultTrtcUserId = (platformUserId: string, roomId: string) =>
  `c_${createHash("sha256").update(JSON.stringify([roomId, platformUserId])).digest("hex").slice(0, 30)}`;

/**
 * 咨询双方使用同一字符串房间、各自的短身份与类型匹配权限。
 * PrivateMapKey 需与云端高级权限控制和客户端入房参数共同启用；configured 只表示本地配置可签名。
 * 业务入口显式传入等待/预扣对应窗口；最长一天仅作为底层兼容上限，票据到期不代表媒体已停止。
 */
export function buildTrtcConfig(platformUserId: string, roomId: string, type: "VOICE" | "VIDEO", expireSec = 86400): TrtcConfig {
  const { sdkAppId, secretKey, configured } = consultTrtcSettings();
  const validIdentity = typeof platformUserId === "string" && platformUserId.trim() === platformUserId && platformUserId.length > 0 && platformUserId.length <= 128;
  const validRoom = typeof roomId === "string" && /^consult_[a-f0-9]{16}$/.test(roomId);
  const userId = validIdentity && validRoom ? consultTrtcUserId(platformUserId, roomId) : "";
  const empty = (): TrtcConfig => ({ sdkAppId: Number.isSafeInteger(sdkAppId) && sdkAppId > 0 && sdkAppId <= 0xffffffff ? sdkAppId : 0,
    userId, roomId, strRoomId: roomId, userSig: null, privateMapKey: null, expiresAt: null, configured: false });
  if (!configured || !validIdentity || !validRoom
    || !["VOICE", "VIDEO"].includes(type) || !Number.isSafeInteger(expireSec) || expireSec < 1 || expireSec > 86400) return empty();
  // 仅开通创建/进入/收发音频，视频另加收发视频；不开放屏幕分享。
  const privilegeMap = type === "VOICE" ? 15 : 63;
  try {
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey);
    return { sdkAppId, userId, roomId, strRoomId: roomId,
      userSig: api.genUserSig(userId, expireSec),
      privateMapKey: api.genPrivateMapKeyWithStringRoomID(userId, expireSec, roomId, privilegeMap),
      expiresAt: new Date(Date.now() + expireSec * 1000).toISOString(), configured: true };
  } catch {
    // 不在错误日志中记录密钥或部分票据；调用方在预扣/接听前失败停止。
    return empty();
  }
}
