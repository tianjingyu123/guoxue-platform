import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { MetricsService } from "../common/metrics.service";

/**
 * Prisma 数据库服务
 * - 慢查询监控（默认阈值 500ms）
 * - Prometheus 指标上报（慢查询计数 + 连接池状态）
 * - 连接池管理
 * - 优雅关闭
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_MS = parseInt(process.env.PRISMA_SLOW_QUERY_MS || "500", 10);

  constructor(
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
  ) {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ],
    });

    // 慢查询检测 + Prometheus 指标上报
    if (process.env.NODE_ENV !== "test") {
      (this as any).$on("query", (e: { duration: number; query: string }) => {
        if (e.duration >= this.SLOW_QUERY_MS) {
          const shortQuery = e.query.replace(/\s+/g, " ").trim().substring(0, 200);
          this.logger.warn(`慢查询 (${e.duration}ms): ${shortQuery}`);

          // 提取模型名用于指标标签
          const modelMatch = shortQuery.match(/FROM\s+"(\w+)"/i) || shortQuery.match(/INTO\s+"(\w+)"/i);
          const model = modelMatch?.[1] ?? "unknown";
          this.metrics?.recordSlowQuery(model);
        }
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`数据库已连接 (慢查询阈值: ${this.SLOW_QUERY_MS}ms)`);

    // 定期采集连接池使用率
    this.startConnectionPoolMonitoring();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("数据库已断开");
  }

  /** 获取慢查询阈值（供外部读取） */
  get slowQueryThreshold(): number {
    return this.SLOW_QUERY_MS;
  }

  /** 每 30 秒采集数据库连接池使用率 */
  private startConnectionPoolMonitoring() {
    if (!this.metrics) return;
    const interval = setInterval(async () => {
      try {
        const result = await this.$queryRaw<{ used: number; max: number }[]>`
          SELECT count(*)::int as used, current_setting('max_connections')::int as max
          FROM pg_stat_activity WHERE datname = current_database()
        `;
        if (result[0]?.max) {
          this.metrics!.dbConnectionPoolUsage.set(result[0].used / result[0].max);
        }
      } catch { /* 静默失败，避免监控自身导致问题 */ }
    }, 30_000);

    // 防止定时器阻止进程退出
    if (interval.unref) interval.unref();
  }
}
