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

/**
 * TRTC 的字符串房间号只允许数字、字母和下划线，且最长 64 字节。
 * 平台直播间通常是 UUID（含连字符），不能直接拼到 RTMP 进房地址里。
 * 已符合规范的短 ID 保持可读；其他 ID 使用稳定哈希，避免字符替换造成碰撞。
 */
export function toLiveTrtcRoomId(platformRoomId: string): string {
  const readable = `room_${platformRoomId}`;
  if (/^[A-Za-z0-9_]+$/.test(readable) && Buffer.byteLength(readable) <= 64) return readable;
  return `room_${createHash("sha256").update(platformRoomId).digest("hex").slice(0, 40)}`;
}

/** OBS 在 TRTC 房间内使用独立、不可冒充平台用户的稳定机器人标识。 */
export function toLiveObsTrtcUserId(platformRoomId: string): string {
  return toLiveTrtcUserId(`live-obs-ingest:${platformRoomId}`);
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

/**
 * 生成 OBS 直推 TRTC 房间的完整 RTMP 地址。
 * UserSig 只在服务端短期签发；SecretKey 永远不会出现在返回值或客户端包中。
 */
export function buildLiveObsRtmpPushUrl(platformRoomId: string, expireSeconds = 24 * 60 * 60): {
  pushUrl: string;
  trtcRoomId: string;
  trtcUserId: string;
  expiresAt: string;
} | null {
  const trtcRoomId = toLiveTrtcRoomId(platformRoomId);
  const ticket = buildLiveTrtcTicket(`live-obs-ingest:${platformRoomId}`, trtcRoomId, 255, expireSeconds);
  if (!ticket) return null;
  const query = new URLSearchParams({
    sdkappid: String(ticket.sdkAppId),
    userid: ticket.userId,
    usersig: ticket.userSig,
  });
  return {
    pushUrl: `rtmp://rtmp.rtc.qq.com/push/${trtcRoomId}?${query.toString()}`,
    trtcRoomId,
    trtcUserId: ticket.userId,
    expiresAt: ticket.expiresAt,
  };
}
