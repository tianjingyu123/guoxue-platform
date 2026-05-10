import { Injectable, Logger } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TLSSigAPIv2 = require("tls-sig-api-v2");

@Injectable()
export class TrtcService {
  private readonly logger = new Logger(TrtcService.name);
  private readonly sdkAppId: number;
  private readonly key: string;

  constructor() {
    this.sdkAppId = parseInt(process.env.IM_APP_ID || "0", 10);
    this.key = process.env.IM_ADMIN_KEY || "";
    if (!this.sdkAppId || !this.key) {
      this.logger.warn("IM AppId/Key 未配置，TRTC房间创建将不可用");
    }
  }

  /** 生成唯一房间ID */
  generateRoomId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /** 为用户生成进入指定房间的 PrivateMapKey */
  genRoomToken(userId: string, roomId: string, expireSeconds = 3600): string {
    if (!this.sdkAppId || !this.key) {
      throw new Error("IM 未配置，无法生成TRTC房间Token");
    }
    const api = new TLSSigAPIv2.Api(this.sdkAppId, this.key);
    // 为TRTC房间生成权限签名
    return api.genPrivateMapKey(userId, expireSeconds, roomId, 255);
  }

  getAppId(): number {
    return this.sdkAppId;
  }
}
