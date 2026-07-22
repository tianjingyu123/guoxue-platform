import {
  Injectable,
  Optional,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { serverConfig } from "../config/server-config";
import { RedisService } from "../redis/redis.service";
import { isWhitelisted } from "./rate-limit-whitelist";

/**
 * Redis 分布式限流守卫，多实例部署下共享计数。
 * RedisService.incrWithTtl 内部已处理 Redis→内存降级。
 *
 * 默认：单个 IP 每 60 秒最多 30 次请求
 */
@Injectable()
export class RedisThrottleGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    @Optional() private readonly limit: number = 30,
    @Optional() private readonly ttl: number = 60,
    /** 计数键前缀：局部守卫须与全局守卫(rate:)区分，否则同请求双计数 */
    @Optional() private readonly keyPrefix: string = "rate",
  ) {}

  private readonly logger = new Logger(RedisThrottleGuard.name);

  private async isUserRateLimitWhitelisted(userId: unknown): Promise<boolean> {
    if (typeof userId !== "string" || !userId.trim()) return false;

    try {
      const raw = await this.redis.getJson<unknown>("admin:whitelist");
      if (!Array.isArray(raw)) return false;
      return raw.slice(0, 1000).some((entry) => {
        if (typeof entry === "string") return entry === userId;
        if (!entry || typeof entry !== "object") return false;
        return (entry as Record<string, unknown>).userId === userId;
      });
    } catch (error) {
      this.logger.warn(
        "读取用户限流白名单失败，继续执行正常限流",
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 压测绕过（仅非生产环境生效）
    if (serverConfig.disableRateLimit) return true;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || "unknown";

    // 基础设施 IP 白名单不受限流。
    if (isWhitelisted(ip)) return true;

    // JwtAuthGuard 位于路由附加限流守卫之前时 request.user 已可信；
    // 这里只豁免附加频率限制，全局基础防护、权限、审核及资金风控仍保留。
    if (await this.isUserRateLimitWhitelisted(request.user?.id)) return true;

    const key = `${this.keyPrefix}:${ip}`;

    const { count, ttl: remainingTtl } = await this.redis.incrWithTtl(key, this.ttl);

    if (count > this.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "请求过于频繁，请稍后再试",
          retryAfter: remainingTtl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

/** 严格限流 — 每分钟 10 次（登录/注册/验证码） */
@Injectable()
export class StrictRedisThrottleGuard extends RedisThrottleGuard {
  constructor(redis: RedisService) {
    super(redis, 10, 60, "rate:strict");
  }
}
