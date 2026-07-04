import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { RedisThrottleGuard } from "./redis-throttle.guard";

/**
 * 局部限流守卫（M3·cluster 前置）：曾是进程内存 Map 实现，多实例下限额×N 失效，
 * 现统一走 RedisThrottleGuard（RedisService.incrWithTtl 内部已处理 Redis→内存降级）。
 * 保留原类名，30+ 个 controller 的 @UseGuards(ThrottleGuard/StrictThrottleGuard) 零改动。
 * key 前缀与全局守卫(rate:)区分，避免同一请求被计数两次。
 *
 * 默认：单个 IP 每 60 秒最多 30 次请求
 */
@Injectable()
export class ThrottleGuard extends RedisThrottleGuard {
  constructor(redis: RedisService) {
    super(redis, 30, 60, "rate:local");
  }
}

/**
 * 严格限流 — 每分钟 10 次（用于登录/注册/验证码）
 */
@Injectable()
export class StrictThrottleGuard extends RedisThrottleGuard {
  constructor(redis: RedisService) {
    super(redis, 10, 60, "rate:strict");
  }
}
