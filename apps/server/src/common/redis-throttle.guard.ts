import {
  Injectable,
  Optional,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

/**
 * Redis 分布式限流守卫，多实例部署下共享计数。
 * RedisService.incrWithTtl 内部已处理 Redis→内存降级。
 *
 * 默认：单个 IP 每 60 秒最多 60 次请求
 */
@Injectable()
export class RedisThrottleGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    @Optional() private readonly limit: number = 60,
    @Optional() private readonly ttl: number = 60,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.SKIP_THROTTLE === "true") return true;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || "unknown";
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
