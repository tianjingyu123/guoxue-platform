import {
  Injectable,
  Optional,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { serverConfig } from "../config/server-config";
import { RedisService } from "../redis/redis.service";

/** 限流白名单：本地环回 + 内网管理端 */
const RATE_LIMIT_WHITELIST = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

function isWhitelisted(ip: string): boolean {
  if (RATE_LIMIT_WHITELIST.has(ip)) return true;
  // 内网 192.168.x.x 段也放行
  if (ip.startsWith("192.168.")) return true;
  return false;
}

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 压测绕过（仅非生产环境生效）
    if (serverConfig.disableRateLimit) return true;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || "unknown";

    // 白名单 IP 不限流
    if (isWhitelisted(ip)) return true;

    const key = `rate:${ip}`;

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
    super(redis, 10, 60);
  }
}
