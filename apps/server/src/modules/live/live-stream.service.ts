import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";

/**
 * 腾讯云直播 CSS API 服务（纯原生API，不依赖SDK）
 * 负责推流/拉流地址生成、防盗链鉴权、回调签名验证
 */
@Injectable()
export class LiveStreamService {
  private readonly logger = new Logger(LiveStreamService.name);
  private readonly pushDomain: string;
  private readonly playDomain: string;
  private readonly pushKey: string;
  private readonly playKey: string;
  private readonly appName: string;

  constructor() {
    this.pushDomain = process.env.LIVE_PUSH_DOMAIN || "";
    this.playDomain = process.env.LIVE_PLAY_DOMAIN || "";
    this.pushKey = process.env.LIVE_PUSH_KEY || "";
    this.playKey = process.env.LIVE_PLAY_KEY || "";
    this.appName = process.env.LIVE_APP_NAME || "live";

    if (!this.pushDomain || !this.playDomain) {
      this.logger.warn("直播推拉流域名未配置，请在 .env 中设置 LIVE_PUSH_DOMAIN 和 LIVE_PLAY_DOMAIN");
    }
  }

  /** 生成 txTime（十六进制时间戳） */
  private genTxTime(validitySeconds: number = 86400): string {
    const expireTime = Math.floor(Date.now() / 1000) + validitySeconds;
    return expireTime.toString(16).toUpperCase();
  }

  /** 生成 txSecret = MD5(key + streamKey + txTime) */
  private genTxSecret(key: string, streamKey: string, txTime: string): string {
    return createHash("md5").update(key + streamKey + txTime).digest("hex");
  }

  /** 生成推流地址（带防盗链） */
  genPushUrl(streamKey: string, validitySeconds: number = 86400): string {
    if (!this.pushDomain) {
      this.logger.error("推流域名未配置");
      return "";
    }
    const txTime = this.genTxTime(validitySeconds);
    const txSecret = this.genTxSecret(this.pushKey, streamKey, txTime);
    return `rtmp://${this.pushDomain}/${this.appName}/${streamKey}?txSecret=${txSecret}&txTime=${txTime}`;
  }

  /** 生成拉流/播放地址（多格式） */
  genPlayUrls(streamKey: string): { flv: string; hls: string; rtmp: string } {
    if (!this.playDomain) {
      this.logger.error("播放域名未配置");
      return { flv: "", hls: "", rtmp: "" };
    }
    const base = `${this.playDomain}/${this.appName}/${streamKey}`;
    return {
      flv: `https://${base}.flv`,
      hls: `https://${base}.m3u8`,
      rtmp: `rtmp://${base}`,
    };
  }

  /** 生成拉流地址（带防盗链鉴权） */
  genPlayUrlWithAuth(streamKey: string, userId: string, validitySeconds: number = 86400): {
    flv: string;
    hls: string;
  } {
    if (!this.playDomain) return { flv: "", hls: "" };
    const txTime = this.genTxTime(validitySeconds);
    const txSecret = this.genTxSecret(this.playKey, streamKey, txTime);
    const base = `https://${this.playDomain}/${this.appName}/${streamKey}`;
    return {
      flv: `${base}.flv?txSecret=${txSecret}&txTime=${txTime}`,
      hls: `${base}.m3u8?txSecret=${txSecret}&txTime=${txTime}`,
    };
  }

  /** 验证直播回调签名是否合法 */
  verifyCallbackSign(body: Record<string, any>, receivedSign: string): boolean {
    // 腾讯云直播回调签名规则：MD5(key + JSON(sorted(body)))
    const sortedKeys = Object.keys(body).sort();
    const sortedJson = JSON.stringify(body, sortedKeys);
    const computedSign = createHash("md5")
      .update(this.pushKey + sortedJson)
      .digest("hex");
    return computedSign === receivedSign;
  }

  /** 获取流状态（推流/断流回调等） */
  getCallbackInfo(): { pushDomain: string; playDomain: string } {
    return {
      pushDomain: this.pushDomain,
      playDomain: this.playDomain,
    };
  }
}
