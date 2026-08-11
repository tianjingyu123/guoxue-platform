import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from "@nestjs/common";
import { createHash, timingSafeEqual } from "crypto";
import { Request } from "express";

/**
 * 腾讯云直播/点播回调签名验证守卫。
 * 官方格式均为 MD5(key + 过期时间)，直播通常使用 sign/t，点播使用 Sign/T。
 *
 * 生产环境缺少 TENCENT_CALLBACK_KEY 时安全失败；仅非生产环境允许跳过。
 */
@Injectable()
export class TencentCallbackGuard implements CanActivate {
  private readonly logger = new Logger(TencentCallbackGuard.name);
  private readonly callbackKey = process.env.TENCENT_CALLBACK_KEY || "";

  canActivate(context: ExecutionContext): boolean {
    if (!this.callbackKey) {
      if (process.env.NODE_ENV === "production") {
        this.logger.error("生产环境 TENCENT_CALLBACK_KEY 未配置，回调签名验证无法执行");
        throw new UnauthorizedException("回调签名验证未配置");
      }
      this.logger.warn("TENCENT_CALLBACK_KEY 未配置，回调签名验证已跳过");
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const bodyRecord =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    // 方式1: Header 签名
    const sigHeader = this.readScalar(req.headers["x-tc-signature"]);
    const tsHeader = this.readScalar(req.headers["x-tc-timestamp"]);

    // 方式2: Query 签名
    const signQuery = this.readScalar(req.query.sign);
    const tQuery = this.readScalar(req.query.t);

    // 腾讯云直播把 sign/t 放在 JSON 包体；旧实现只读 Header/Query，
    // 会把真实推流、断流和审核回调全部误判为未授权。
    const signBody = this.readScalar(bodyRecord.sign) || this.readScalar(bodyRecord.Sign);
    const tBody = this.readScalar(bodyRecord.t) || this.readScalar(bodyRecord.T);
    const receivedSign = sigHeader || signQuery || signBody;
    const receivedTime = tsHeader || tQuery || tBody;
    if (
      receivedSign &&
      receivedTime &&
      this.isAcceptableExpiry(receivedTime) &&
      this.safeEqual(receivedSign, this.md5(this.callbackKey + receivedTime))
    ) {
      return true;
    }

    this.logger.warn(`回调签名验证失败: ${req.method} ${req.url}`);
    throw new UnauthorizedException("回调签名验证失败");
  }

  private readScalar(value: unknown): string {
    if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return typeof value === "string" ? value.trim() : "";
  }

  private isAcceptableExpiry(value: string): boolean {
    const expiry = Number(value);
    if (!Number.isInteger(expiry)) return false;
    const now = Math.floor(Date.now() / 1000);
    return expiry >= now && expiry <= now + 24 * 60 * 60;
  }

  private md5(value: string): string {
    return createHash("md5").update(value).digest("hex");
  }

  private safeEqual(received: string, expected: string): boolean {
    const left = Buffer.from(received.toLowerCase(), "utf8");
    const right = Buffer.from(expected.toLowerCase(), "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
