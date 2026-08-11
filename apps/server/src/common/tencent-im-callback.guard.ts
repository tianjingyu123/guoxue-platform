import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from "@nestjs/common";
import { createHash, timingSafeEqual } from "crypto";
import { Request } from "express";

/** 腾讯云 IM 回调应用层签名验证。 */
@Injectable()
export class TencentImCallbackGuard implements CanActivate {
  private readonly logger = new Logger(TencentImCallbackGuard.name);

  canActivate(context: ExecutionContext): boolean {
    // 后台保存第三方配置后会热同步到 process.env；按请求读取才能真正即时生效。
    const callbackToken = process.env.IM_CALLBACK_TOKEN || "";
    const sdkAppId = process.env.IM_APP_ID || "";
    if (!callbackToken || !sdkAppId) {
      if (process.env.NODE_ENV === "production") {
        this.logger.error("生产环境 IM_CALLBACK_TOKEN 或 IM_APP_ID 未配置");
        throw new UnauthorizedException("IM 回调验签未配置");
      }
      this.logger.warn("IM_CALLBACK_TOKEN 或 IM_APP_ID 未配置，非生产环境跳过验签");
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const query = req.query as Record<string, unknown>;
    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
    const appId = this.readScalar(query.SdkAppid) || this.readScalar(query.SdkAppID) || this.readScalar(query.SDKAppID);
    const sign = this.readScalar(query.Sign) || this.readScalar(query.sign);
    const requestTime = this.readScalar(query.RequestTime) || this.readScalar(query.requestTime);
    const queryCommand = this.readScalar(query.CallbackCommand);
    const bodyCommand = this.readScalar(body.CallbackCommand);

    const timestamp = Number(requestTime);
    const isFresh = Number.isInteger(timestamp) && Math.abs(Math.floor(Date.now() / 1000) - timestamp) <= 60;
    const commandMatches = Boolean(queryCommand && bodyCommand && queryCommand === bodyCommand);
    const expected = this.sha256(callbackToken + requestTime);

    if (
      appId === sdkAppId &&
      sign &&
      isFresh &&
      commandMatches &&
      this.safeEqual(sign, expected)
    ) {
      return true;
    }

    this.logger.warn(`IM 回调签名验证失败: ${req.method} ${req.url}`);
    throw new UnauthorizedException("IM 回调签名验证失败");
  }

  private readScalar(value: unknown): string {
    if (Array.isArray(value)) return typeof value[0] === "string" ? value[0].trim() : "";
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return typeof value === "string" ? value.trim() : "";
  }

  private sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private safeEqual(received: string, expected: string): boolean {
    const left = Buffer.from(received.toLowerCase(), "utf8");
    const right = Buffer.from(expected.toLowerCase(), "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
