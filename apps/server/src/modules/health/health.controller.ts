import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
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

    const allOk = Object.values(checks).every((v) => v === "ok");
    return {
      status: allOk ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: Date.now(),
      checks,
    };
  }
}
