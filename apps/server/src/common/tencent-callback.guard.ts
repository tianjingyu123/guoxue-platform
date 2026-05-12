import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { Request } from "express";

/**
 * 腾讯云回调签名验证守卫
 *
 * 腾讯云回调鉴权方式：
 * - Header: X-TC-Signature = MD5(key + body)，X-TC-Timestamp
 * - Query:  ?sign=MD5(key + t)&t=timestamp
 *
 * 若未配置 TENCENT_CALLBACK_KEY 环境变量，则跳过验证（向后兼容），仅记录警告。
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
    const body = JSON.stringify(req.body || {});

    // 方式1: Header 签名
    const sigHeader = req.headers["x-tc-signature"] as string | undefined;
    const tsHeader = req.headers["x-tc-timestamp"] as string | undefined;
    if (sigHeader && tsHeader) {
      const expected = createHash("md5").update(this.callbackKey + tsHeader).digest("hex");
      if (sigHeader === expected) return true;
    }

    // 方式2: Query 签名
    const signQuery = req.query.sign as string | undefined;
    const tQuery = req.query.t as string | undefined;
    if (signQuery && tQuery) {
      const expected = createHash("md5").update(this.callbackKey + tQuery).digest("hex");
      if (signQuery === expected) return true;
    }

    // 方式3: Body + key 签名（VOD 常见）
    if (sigHeader && body !== "{}") {
      const expected = createHash("md5").update(body + this.callbackKey).digest("hex");
      if (sigHeader === expected) return true;
    }

    this.logger.warn(`回调签名验证失败: ${req.method} ${req.url}`);
    throw new UnauthorizedException("回调签名验证失败");
  }
}
