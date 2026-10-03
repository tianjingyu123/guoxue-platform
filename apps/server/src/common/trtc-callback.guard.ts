import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Request } from "express";

type RawRequest = Request & { rawBody?: Buffer };

/**
 * TRTC 房间/媒体事件回调验签。
 * 官方规则：Sign = Base64(HMAC-SHA256(callbackKey, 原始请求体))。
 * 该协议与云直播 MD5(key+t) 不同，必须使用独立守卫且不能 JSON.stringify 后验签。
 */
@Injectable()
export class TrtcCallbackGuard implements CanActivate {
  private readonly logger = new Logger(TrtcCallbackGuard.name);
  private static readonly MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

  canActivate(context: ExecutionContext): boolean {
    const callbackKey = String(process.env.TRTC_CALLBACK_KEY || process.env.TENCENT_CALLBACK_KEY || "").trim();
    if (!callbackKey) {
      if (process.env.NODE_ENV === "production") {
        this.logger.error("生产环境 TRTC_CALLBACK_KEY/TENCENT_CALLBACK_KEY 未配置");
        throw new UnauthorizedException("TRTC 回调签名验证未配置");
      }
      this.logger.warn("TRTC 回调验签密钥未配置，非生产环境跳过验证");
      return true;
    }

    const req = context.switchToHttp().getRequest<RawRequest>();
    const rawBody = req.rawBody;
    const receivedSign = this.scalar(req.headers.sign);
    const receivedSdkAppId = this.scalar(req.headers.sdkappid);
    const expectedSdkAppId = String(process.env.TRTC_SDK_APP_ID || "").trim();
    const callbackTs = Number((req.body as Record<string, unknown> | undefined)?.CallbackTs);

    const timestampValid = Number.isFinite(callbackTs)
      && Math.abs(Date.now() - callbackTs) <= TrtcCallbackGuard.MAX_CLOCK_SKEW_MS;
    const appIdValid = !!expectedSdkAppId && receivedSdkAppId === expectedSdkAppId;
    if (!rawBody?.length || !receivedSign || !timestampValid || !appIdValid) {
      this.reject(req, "请求头、原始报文、应用 ID 或回调时间无效");
    }

    const expected = createHmac("sha256", callbackKey).update(rawBody).digest("base64");
    if (!this.safeEqual(receivedSign, expected)) this.reject(req, "签名不匹配");
    return true;
  }

  private scalar(value: unknown): string {
    if (Array.isArray(value)) return typeof value[0] === "string" ? value[0].trim() : "";
    return typeof value === "string" ? value.trim() : "";
  }

  private safeEqual(received: string, expected: string): boolean {
    const left = Buffer.from(received, "utf8");
    const right = Buffer.from(expected, "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private reject(req: Request, reason: string): never {
    this.logger.warn(`TRTC 回调验签失败: ${req.method} ${req.url} (${reason})`);
    throw new UnauthorizedException("TRTC 回调签名验证失败");
  }
}
