import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { HealthService } from "./health.service";

/**
 * 依赖自动降级（O-T2·设计真源 docs/design/运维守护体系-监控告警应急灾备-20260705.md §二）
 *
 * 双轨降级：
 * 1. 自动轨（仅真探测依赖 im/ai）：每 2 分钟探测，连续 3 次非 ok → Redis 降级 flag
 *    （TTL 10 分钟自愈）；恢复探测成功 → 立即清 flag。
 * 2. 手动轨（live/vod/pay 等无真探测或需人工拍板的）：运营在 ConfigSystem 设
 *    `degrade.manual.{key}` = "true" 即挂降级（改回非 true 即摘）。
 * 前端经公开端点 GET /health/degrade 读合成状态展示降级横幅。
 */

const AUTO_KEYS = ["im", "ai"] as const;
const MANUAL_KEYS = ["live", "im", "vod", "ai", "pay"] as const;
export type DegradeKey = (typeof MANUAL_KEYS)[number];

const FAIL_THRESHOLD = 3;
const FLAG_TTL = 600; // 10 分钟自愈兜底
const FAIL_TTL = 600;

@Injectable()
export class DegradeService {
  private readonly logger = new Logger(DegradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly health: HealthService,
  ) {}

  @Cron("*/2 * * * *")
  async probeCron() {
    await this.redis.runExclusive("health_degrade_probe", 110, () => this.probe());
  }

  /** 探测主体（独立出来便于测试/手动触发） */
  async probe(): Promise<void> {
    const results: Record<string, string> = {
      im: (await this.health.checkIm()).status,
      ai: (await this.health.checkDeepSeek()).status,
    };
    for (const key of AUTO_KEYS) {
      const status = results[key];
      if (status === "unconfigured") continue; // 未配置的依赖不参与降级
      if (status === "ok") {
        const hadFlag = await this.redis.get(`degrade:flag:${key}`);
        await this.redis.del(`degrade:fail:${key}`);
        if (hadFlag) {
          await this.redis.del(`degrade:flag:${key}`);
          this.logger.log(`【降级恢复】依赖 ${key} 探测恢复，降级解除`);
        }
        continue;
      }
      const fails = await this.redis.incrBy(`degrade:fail:${key}`, 1, FAIL_TTL);
      if (fails >= FAIL_THRESHOLD) {
        const isNew = !(await this.redis.get(`degrade:flag:${key}`));
        await this.redis.set(`degrade:flag:${key}`, "1", FLAG_TTL);
        if (isNew) {
          this.logger.warn(`【自动降级】依赖 ${key} 连续 ${fails} 次探测异常，已挂降级 flag（TTL ${FLAG_TTL}s 自愈）`);
          await this.notifyAdmins(`【降级】依赖 ${key} 连续探测异常已自动降级，前端展示维护提示；恢复后自动解除`);
        }
      }
    }
  }

  /** 合成降级状态（自动 flag ∪ 手动开关）——公开端点用 */
  async getStatus(): Promise<Record<DegradeKey, boolean>> {
    const result = {} as Record<DegradeKey, boolean>;
    for (const key of MANUAL_KEYS) {
      const [auto, manual] = await Promise.all([
        this.redis.get(`degrade:flag:${key}`),
        this.prisma.configSystem.findUnique({
          where: { configKey: `degrade.manual.${key}` },
          select: { configValue: true },
        }).catch(() => null),
      ]);
      result[key] = auto === "1" || manual?.configValue?.trim().toLowerCase() === "true";
    }
    return result;
  }

  private async notifyAdmins(content: string) {
    try {
      const admins = await this.prisma.userRole.findMany({
        where: { roleType: { in: ["SUPER_ADMIN", "OPERATION_ADMIN"] } },
        select: { userId: true },
        take: 10,
      });
      if (admins.length === 0) return;
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.userId,
          type: "SYSTEM",
          title: "依赖降级通知",
          content,
          targetType: "DEGRADE",
          targetId: new Date().toISOString(),
        })),
      });
    } catch (e) {
      this.logger.warn("降级通知发送失败", e as Error);
    }
  }
}
