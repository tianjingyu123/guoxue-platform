import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { MetricsService } from "../common/metrics.service";
import { RequestContext } from "../common/request-context";

/** 具有 stationId 字段的模型（Prisma 中间件自动注入 stationId 过滤） */
const STATION_SCOPED_MODELS = new Set([
  "Article", "Post", "Course", "Circle", "Product", "Video", "Ebook",
  "Content", "Comment", "Favorite", "Interaction",
  "Notification", "Task", "Competition", "Order", "MemberPurchase",
  "BotConfig", "CircleBot", "BotKnowledgeBase", "BotChatLog",
  "LiveRoom", "Checkin", "Bounty", "FraudDetection", "RiskAlert",
  "ChurnPrediction", "ChurnAction", "BrowseHistory",
]);

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

    // 分站数据隔离中间件：自动为查询注入 stationId 过滤
    this.applyStationIsolation();

    // 慢查询检测 + Prometheus 指标上报
    if (process.env.NODE_ENV !== "test") {
      this.setupSlowQueryLogging(this);
    }
  }

  /** 安装分站数据隔离中间件（Prisma $extends） */
  private applyStationIsolation() {
    const extended = this.$extends({
      name: "station-isolation",
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }: {
            model?: string; operation: string; args: any; query: (args: any) => any;
          }) => {
            const stationId = RequestContext.stationId();
            if (!stationId) return query(args);
            if (!model || !STATION_SCOPED_MODELS.has(model)) return query(args);

            const readOps = ["findMany", "findFirst", "findUnique", "count", "groupBy", "aggregate"];
            const writeOps = ["updateMany", "deleteMany"];

            if (readOps.includes(operation) || writeOps.includes(operation)) {
              args.where = { ...(args.where || {}), stationId };
            }

            if (operation === "create" || operation === "createMany") {
              if (operation === "create") {
                args.data = { ...(args.data || {}), stationId };
              } else {
                args.data = (args.data || []).map((d: any) => ({ ...d, stationId }));
              }
            }

            return query(args);
          },
        },
      },
    });

    // 将扩展后的客户端代理到当前实例
    for (const key of Object.getOwnPropertyNames(extended)) {
      if (key === "constructor" || key.startsWith("_")) continue;
      try {
        (this as any)[key] = (extended as any)[key];
      } catch { /* 只读属性跳过 */ }
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

  /** 在主库或读副本上安装慢查询监听（Prisma 5.x: $on 已移除，改用 $extends 计时） */
  private setupSlowQueryLogging(client: PrismaClient) {
    try {
      // Prisma 5.x 不再支持 $on 事件监听，改用 $extends 包装所有查询计时
      client.$extends({
        name: "slow-query-logging",
        query: {
          $allModels: {
            $allOperations: async ({ model, operation, args, query }: {
              model?: string; operation: string; args: any; query: (args: any) => any;
            }) => {
              const start = Date.now();
              const result = await query(args);
              const duration = Date.now() - start;
              if (duration >= this.SLOW_QUERY_MS) {
                this.logger.warn(`慢查询 (${duration}ms): ${model}.${operation}`);
                this.metrics?.recordSlowQuery(model || "unknown");
              }
              return result;
            },
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`慢查询监控初始化失败（非关键）: ${err.message}`);
    }
  }

  /** 每 30 秒采集数据库连接池使用率，高水位自动告警 */
  private startConnectionPoolMonitoring() {
    const interval = setInterval(async () => {
      try {
        const result = await this.$queryRaw<{ used: number; max: number; idle: number }[]>`
          SELECT
            count(*)::int as used,
            current_setting('max_connections')::int as max,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle') as idle
          FROM pg_stat_activity WHERE datname = current_database()
        `;
        if (result[0]?.max) {
          const { used, max, idle } = result[0];
          const ratio = used / max;
          this.metrics?.dbConnectionPoolUsage.set(ratio);

          if (ratio > 0.8) {
            this.logger.error(`数据库连接池告警: ${used}/${max} (${(ratio * 100).toFixed(0)}%), 闲置${idle}个`);
          } else if (ratio > 0.6) {
            this.logger.warn(`数据库连接池高水位: ${used}/${max} (${(ratio * 100).toFixed(0)}%)`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`连接池监控采集失败: ${err.message}`);
      }
    }, 30_000);

    if (interval.unref) interval.unref();
  }
}
