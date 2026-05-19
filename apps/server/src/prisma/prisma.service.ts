import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { MetricsService } from "../common/metrics.service";

/**
 * Prisma 数据库服务
 * - 读写分离（有 DATABASE_REPLICA_URL 时自动启用读副本）
 * - 慢查询监控（默认阈值 500ms）
 * - Prometheus 指标上报（慢查询计数 + 连接池状态）
 * - 连接池管理 + 优雅关闭
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_MS = parseInt(process.env.PRISMA_SLOW_QUERY_MS || "500", 10);
  private replicaClient?: PrismaClient;

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

    // 读副本：有 DATABASE_REPLICA_URL 时创建独立读副本客户端并应用扩展
    if (process.env.DATABASE_REPLICA_URL && process.env.NODE_ENV !== "test") {
      this.replicaClient = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_REPLICA_URL } },
        log: [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ],
      });
      this.logger.log("读副本已启用: " + process.env.DATABASE_REPLICA_URL.replace(/\/\/.*@/, "//***@"));
    }

    // 慢查询检测 + Prometheus 指标上报
    if (process.env.NODE_ENV !== "test") {
      this.setupSlowQueryLogging(this);
    }
  }

  async onModuleInit() {
    await this.$connect();
    if (this.replicaClient) {
      await this.replicaClient.$connect();
      this.setupSlowQueryLogging(this.replicaClient);
    }
    this.logger.log(`数据库已连接 (慢查询阈值: ${this.SLOW_QUERY_MS}ms, 读副本: ${this.replicaClient ? "已启用" : "未配置"})`);

    this.startConnectionPoolMonitoring();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.replicaClient) {
      await this.replicaClient.$disconnect();
    }
    this.logger.log("数据库已断开");
  }

  get slowQueryThreshold(): number {
    return this.SLOW_QUERY_MS;
  }

  /** 获取写库 PrismaClient（关键业务使用：支付验证、认证） */
  getPrimary(): PrismaClient {
    return this;
  }

  /** 获取读副本 PrismaClient。未配置读副本时回退到主库。 */
  get replica(): PrismaClient {
    return this.replicaClient || this;
  }

  /** 在主库或读副本上安装慢查询监听 */
  private setupSlowQueryLogging(client: PrismaClient) {
    (client as any).$on("query", (e: { duration: number; query: string; params: string }) => {
      if (e.duration >= this.SLOW_QUERY_MS) {
        const shortQuery = e.query.replace(/\s+/g, " ").trim().substring(0, 300);
        const paramStr = e.params ? ` [${e.params.substring(0, 200)}]` : "";
        this.logger.warn(`慢查询 (${e.duration}ms): ${shortQuery}${paramStr}`);

        const modelMatch = shortQuery.match(/FROM\s+"(\w+)"/i) || shortQuery.match(/INTO\s+"(\w+)"/i);
        const model = modelMatch?.[1] ?? "unknown";
        this.metrics?.recordSlowQuery(model);
      }
    });
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
      } catch (err: any) {
        this.logger.warn(`连接池监控采集失败: ${err.message}`);
      }
    }, 30_000);

    if (interval.unref) interval.unref();
  }
}
