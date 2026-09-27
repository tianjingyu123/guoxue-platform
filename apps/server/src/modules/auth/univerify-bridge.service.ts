import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { RedisService } from "../../redis/redis.service";
import { AuthService } from "./auth.service";
import { UniverifyCallbackDto } from "./auth.dto";

/** 云函数已核验运营商凭据后，以短时签名消息换取本站会话。 */
@Injectable()
export class UniverifyBridgeService {
  constructor(private readonly auth: AuthService, private readonly redis: RedisService) {}

  async exchange(dto: UniverifyCallbackDto) {
    const secret = process.env.REBU_UNIVERIFY_SHARED_SECRET || "";
    if (secret.length < 32) throw new BusinessException(ErrorCode.NOT_FOUND, "资源不存在");
    if (!Number.isSafeInteger(dto.timestamp) || Math.abs(Date.now() - dto.timestamp) > 60_000) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "授权已过期");
    }
    const message = `${dto.phone}\n${dto.timestamp}\n${dto.nonce}\n${dto.referrerCode || ""}`;
    const expected = crypto.createHmac("sha256", secret).update(message).digest();
    const actual = Buffer.from(dto.signature, "hex");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "授权无效");
    }
    // 共享 Redis 故障时拒绝交换，不允许两个节点各自用内存防重放。
    const firstUse = await this.redis.setNXShared(`auth:univerify:${dto.nonce}`, "1", 120);
    if (!firstUse) throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "授权已使用");
    return this.auth.loginVerifiedPhone(dto.phone, dto.referrerCode);
  }
}
