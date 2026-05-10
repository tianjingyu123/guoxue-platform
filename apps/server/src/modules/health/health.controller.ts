import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@ApiTags("健康检查")
@Controller("health")
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: "健康检查（DB + Redis + 第三方服务 + 内存）" })
  async check() {
    const checks: Record<string, string> = {};

    // 数据库检查
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = "ok";
    } catch {
      checks.db = "fail";
    }

    // Redis/缓存检查
    try {
      await this.redis.set("health:check", "1", 10);
      const val = await this.redis.get("health:check");
      checks.redis = val === "1" ? "ok" : "fail";
    } catch {
      checks.redis = "fail";
    }

    // 第三方服务配置检查（不消耗 API 配额，仅验证凭证是否已配置）
    checks.deepseek = process.env.DEEPSEEK_API_KEY ? "ok" : "unconfigured";
    checks.tencentCloud = process.env.TENCENT_SECRET_ID ? "ok" : "unconfigured";
    checks.wechatPay = process.env.WECHAT_PAY_MCH_ID ? "ok" : "unconfigured";
    checks.cos = process.env.COS_BUCKET ? "ok" : "unconfigured";
    checks.liveStream = process.env.LIVE_PUSH_DOMAIN ? "ok" : "unconfigured";

    // "unconfigured" 视为降级（非致命）
    const hasFail = Object.values(checks).some((v) => v === "fail");
    const hasDegraded = Object.values(checks).some((v) => v === "unconfigured");
    const status = hasFail ? "degraded" : hasDegraded ? "degraded" : "ok";

    const mem = process.memoryUsage();
    return {
      status,
      uptime: process.uptime(),
      timestamp: Date.now(),
      memory: {
        rss: this.fmt(mem.rss),
        heapUsed: this.fmt(mem.heapUsed),
        heapTotal: this.fmt(mem.heapTotal),
      },
      version: process.version,
      checks,
    };
  }

  private fmt(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return mb.toFixed(1) + " MB";
  }
}
