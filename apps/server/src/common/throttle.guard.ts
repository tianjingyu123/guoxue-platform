import {
  Injectable,
  Optional,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** 限流白名单：本地环回 + 内网管理端 */
const RATE_LIMIT_WHITELIST = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

function isWhitelisted(ip: string): boolean {
  if (RATE_LIMIT_WHITELIST.has(ip)) return true;
  if (ip.startsWith("192.168.")) return true;
  return false;
}

/**
 * 简易内存限流守卫
 * 默认：单个 IP 每 60 秒最多 30 次请求
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();

  // 每 60 秒清理一次过期记录
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @Optional() private readonly limit: number = 30,
    @Optional() private readonly ttl: number = 60,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    // Node.js 退出时清理定时器
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || "unknown";

    // 白名单 IP 不限流
    if (isWhitelisted(ip)) return true;

    const key = `rate:${ip}`;

    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.ttl * 1000 });
      return true;
    }

    entry.count++;

    if (entry.count > this.limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "请求过于频繁，请稍后再试",
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * 严格限流 — 每分钟 10 次（用于登录/注册/验证码）
 */
@Injectable()
export class StrictThrottleGuard extends ThrottleGuard {
  constructor() {
    super(10, 60);
  }
}
