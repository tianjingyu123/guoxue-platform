import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

export interface HealthCheck {
  status: "ok" | "degraded" | "fail" | "unconfigured";
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: "ok" | "degraded" | "fail";
  uptime: number;
  timestamp: number;
  version: string;
  memory: { rss: string; heapUsed: string; heapTotal: string; external: string };
  checks: Record<string, HealthCheck>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async check(): Promise<HealthReport> {
    const checks: Record<string, HealthCheck> = {};

    // DB + Redis + 第三方服务并发检查
    await Promise.allSettled([
      this.checkDb().then((r) => (checks.db = r)),
      this.checkRedis().then((r) => (checks.redis = r)),
      this.checkDeepSeek().then((r) => { if (r.status !== "unconfigured") checks.ai = r; }),
      this.checkTencentCloud().then((r) => { if (r.status !== "unconfigured") checks.cloud = r; }),
      this.checkSms().then((r) => { if (r.status !== "unconfigured") checks.sms = r; }),
      this.checkCos().then((r) => { if (r.status !== "unconfigured") checks.storage = r; }),
      this.checkWechatPay().then((r) => { if (r.status !== "unconfigured") checks.payment = r; }),
      this.checkWechatOpen().then((r) => { if (r.status !== "unconfigured") checks.wechat = r; }),
      this.checkLiveService().then((r) => { if (r.status !== "unconfigured") checks.live = r; }),
      this.checkIm().then((r) => { if (r.status !== "unconfigured") checks.im = r; }),
      this.checkVod().then((r) => { if (r.status !== "unconfigured") checks.vod = r; }),
    ]);

    // 汇总状态
    const hasFail = Object.values(checks).some((c) => c.status === "fail");
    const hasDegraded = Object.values(checks).some((c) => c.status === "degraded" || c.status === "unconfigured");
    const status = hasFail ? "fail" : hasDegraded ? "degraded" : "ok";

    const mem = process.memoryUsage();

    return {
      status,
      uptime: process.uptime(),
      timestamp: Date.now(),
      version: "1.0",
      memory: {
        rss: this.fmt(mem.rss),
        heapUsed: this.fmt(mem.heapUsed),
        heapTotal: this.fmt(mem.heapTotal),
        external: this.fmt(mem.external),
      },
      checks,
    };
  }

  /** 获取简洁的就绪检查（K8s readiness probe 用） */
  async readiness(): Promise<{ status: string; db: string; redis: string }> {
    const [db, redis] = await Promise.allSettled([this.checkDb(), this.checkRedis()]);
    const dbOk = db.status === "fulfilled" && db.value.status === "ok";
    const redisOk = redis.status === "fulfilled" && redis.value.status === "ok";
    return {
      status: dbOk ? "ready" : "not_ready",
      db: dbOk ? "ok" : "fail",
      redis: redisOk ? "ok" : "fail",
    };
  }

  /** 获取简洁的存活检查（K8s liveness probe 用，不做任何外部依赖检查） */
  liveness(): { status: string; uptime: number } {
    return { status: "alive", uptime: process.uptime() };
  }

  // ═══════════ 私有检查方法 ═══════════

  private async checkDb(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", latencyMs: Date.now() - start };
    } catch (e) {
      this.logger.error("DB 健康检查失败", (e as Error).message);
      return { status: "fail", error: (e as Error).message };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      const testKey = "health:check:" + Date.now();
      await this.redis.set(testKey, "1", 10);
      const val = await this.redis.get(testKey);
      if (val !== "1") throw new Error("Redis 读写不一致");
      return { status: "ok", latencyMs: Date.now() - start };
    } catch (e) {
      this.logger.error("Redis 健康检查失败", (e as Error).message);
      return { status: "fail", error: (e as Error).message };
    }
  }

  private async checkDeepSeek(): Promise<HealthCheck> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { status: "unconfigured" };
    try {
      const start = Date.now();
      const res = await fetch("https://api.deepseek.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok
        ? { status: "ok", latencyMs: Date.now() - start }
        : { status: "degraded", error: `HTTP ${res.status}` };
    } catch (e) {
      this.logger.warn("DeepSeek API 健康检查失败", (e as Error).message);
      return { status: "degraded", error: (e as Error).message };
    }
  }

  private async checkTencentCloud(): Promise<HealthCheck> {
    const secretId = process.env.TENCENT_SECRET_ID;
    if (!secretId) return { status: "unconfigured" };
    try {
      const start = Date.now();
      const res = await fetch("https://cvm.tencentcloudapi.com/", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return res.status < 500
        ? { status: "ok", latencyMs: Date.now() - start }
        : { status: "degraded", error: `HTTP ${res.status}` };
    } catch (e) {
      this.logger.warn("腾讯云 API 健康检查失败", (e as Error).message);
      return { status: "degraded", error: (e as Error).message };
    }
  }

  private async checkSms(): Promise<HealthCheck> {
    const appId = process.env.SMS_APP_ID;
    if (!appId) return { status: "unconfigured" };
    // SMS 无免费探测端点，仅验证配置完整
    if (process.env.SMS_SIGN_NAME && process.env.SMS_TEMPLATE_ID) {
      return { status: "ok" };
    }
    return { status: "unconfigured", error: "SMS 配置不完整" };
  }

  private async checkCos(): Promise<HealthCheck> {
    const bucket = process.env.COS_BUCKET;
    const region = process.env.COS_REGION;
    if (!bucket || !region) return { status: "unconfigured" };
    try {
      const start = Date.now();
      const url = `https://${bucket}.cos.${region}.myqcloud.com`;
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      // COS 无权限返回 403，说明 bucket 存在可达
      return res.status === 403 || res.status === 200
        ? { status: "ok", latencyMs: Date.now() - start }
        : { status: "degraded", error: `HTTP ${res.status}` };
    } catch (e) {
      this.logger.warn("COS 健康检查失败", (e as Error).message);
      return { status: "degraded", error: (e as Error).message };
    }
  }

  private async checkWechatPay(): Promise<HealthCheck> {
    const mchId = process.env.WECHAT_PAY_MCH_ID;
    if (!mchId) return { status: "unconfigured" };
    try {
      const start = Date.now();
      const res = await fetch("https://api.mch.weixin.qq.com/", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return res.status < 500
        ? { status: "ok", latencyMs: Date.now() - start }
        : { status: "degraded", error: `HTTP ${res.status}` };
    } catch (e) {
      this.logger.warn("微信支付 API 健康检查失败", (e as Error).message);
      return { status: "degraded", error: (e as Error).message };
    }
  }

  private async checkWechatOpen(): Promise<HealthCheck> {
    const appId = process.env.WECHAT_APP_ID;
    if (!appId) return { status: "unconfigured" };
    try {
      const start = Date.now();
      const res = await fetch("https://api.weixin.qq.com/cgi-bin/token", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return res.status < 500
        ? { status: "ok", latencyMs: Date.now() - start }
        : { status: "degraded", error: `HTTP ${res.status}` };
    } catch (e) {
      this.logger.warn("微信开放平台 API 健康检查失败", (e as Error).message);
      return { status: "degraded", error: (e as Error).message };
    }
  }

  private async checkLiveService(): Promise<HealthCheck> {
    const pushDomain = process.env.LIVE_PUSH_DOMAIN;
    if (!pushDomain) return { status: "unconfigured" };
    return { status: "ok" };
  }

  private async checkIm(): Promise<HealthCheck> {
    const appId = process.env.IM_APP_ID;
    if (!appId) return { status: "unconfigured" };
    try {
      const start = Date.now();
      const res = await fetch("https://console.tim.qq.com/", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return res.status < 500
        ? { status: "ok", latencyMs: Date.now() - start }
        : { status: "degraded", error: `HTTP ${res.status}` };
    } catch (e) {
      this.logger.warn("IM 健康检查失败", (e as Error).message);
      return { status: "degraded", error: (e as Error).message };
    }
  }

  private async checkVod(): Promise<HealthCheck> {
    const subAppId = process.env.VOD_SUB_APP_ID;
    if (!subAppId) return { status: "unconfigured" };
    return { status: "ok" };
  }

  private fmt(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return mb.toFixed(1) + " MB";
  }
}
