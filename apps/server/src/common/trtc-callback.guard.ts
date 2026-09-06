import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { Request } from "express";
import { consultTrtcSettings } from "./consult-trtc-settings";

type RawRequest = Request & { rawBody?: Buffer };
export interface VerifiedTrtcCallback {
  sdkAppId: number;
  receivedAt: number;
  bodyDigest: string;
  body: Record<string, unknown>;
}
// 仅守卫可写；不能通过请求头、DTO 或给 req 添加同名属性伪造可信回调。
const verifiedCallbacks = new WeakMap<object, VerifiedTrtcCallback>();
export function getVerifiedTrtcCallback(req: object): VerifiedTrtcCallback {
  const verified = verifiedCallbacks.get(req);
  if (!verified) throw new UnauthorizedException("TRTC 回调尚未通过原文验证");
  // 返回独立快照，调用方后续修改不污染该请求的可信原始记录。
  return { ...verified, body: structuredClone(verified.body) };
}

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
    const req = context.switchToHttp().getRequest<RawRequest>();
    verifiedCallbacks.delete(req);
    const receivedSdkAppId = this.scalar(req.headers.sdkappid);
    const publicId = String(process.env.TRTC_SDK_APP_ID || "").trim();
    const consult = consultTrtcSettings();
    const isConsult = receivedSdkAppId === String(consult.sdkAppId) && consult.sdkAppId > 0;
    // 应用头不在签名体内，禁止两应用共用回调密钥，避免换头重放。
    if (isConsult && !consult.isolated) this.reject("咨询应用配置未隔离");
    const expectedSdkAppId = isConsult ? String(consult.sdkAppId) : publicId;
    const callbackKey = isConsult ? consult.callbackKey : String(process.env.TRTC_CALLBACK_KEY || process.env.TENCENT_CALLBACK_KEY || "").trim();
    if (!callbackKey) {
      this.logger.error("TRTC_CALLBACK_KEY/TENCENT_CALLBACK_KEY 未配置");
      throw new UnauthorizedException("TRTC 回调签名验证未配置");
    }

    const rawBody = req.rawBody;
    const receivedSign = this.scalar(req.headers.sign);
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = rawBody && JSON.parse(rawBody.toString("utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) this.reject("原始报文不是对象");
      body = parsed as Record<string, unknown>;
    } catch { this.reject("原始报文解析失败"); }
    const callbackTs = body.CallbackTs;

    const receivedAt = Date.now();
    const timestampValid = typeof callbackTs === "number" && Number.isSafeInteger(callbackTs)
      && Math.abs(receivedAt - callbackTs) <= TrtcCallbackGuard.MAX_CLOCK_SKEW_MS;
    const sdkAppId = Number(expectedSdkAppId);
    const appIdValid = /^[1-9][0-9]{0,9}$/.test(expectedSdkAppId) && sdkAppId <= 0xffffffff && receivedSdkAppId === expectedSdkAppId;
    if (!rawBody?.length || !receivedSign || !timestampValid || !appIdValid) {
      this.reject("请求头、原始报文、应用 ID 或回调时间无效");
    }

    const expected = createHmac("sha256", callbackKey).update(rawBody).digest("base64");
    if (!this.safeEqual(receivedSign, expected)) this.reject("签名不匹配");
    verifiedCallbacks.set(req, { sdkAppId, receivedAt, bodyDigest: createHash("sha256").update(rawBody).digest("hex"), body });
    return true;
  }

  private scalar(value: unknown): string {
    if (Array.isArray(value)) return "";
    return typeof value === "string" ? value.trim() : "";
  }

  private safeEqual(received: string, expected: string): boolean {
    const left = Buffer.from(received, "utf8");
    const right = Buffer.from(expected, "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private reject(reason: string): never {
    this.logger.warn(`TRTC 回调验签失败 (${reason})`);
    throw new UnauthorizedException("TRTC 回调签名验证失败");
  }
}
