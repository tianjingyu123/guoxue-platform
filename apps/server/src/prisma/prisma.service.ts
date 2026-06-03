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
 *
 * ## 架构：静态工厂 + NestJS 自定义 Provider
 * 使用 PrismaService.create() 静态工厂构建扩展后的客户端，
 * 通过 Object.assign 将扩展客户端的模型委托复制到实例，
 * 消除直接 this 别名和反射属性拷贝的类型绕过风险。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_MS = parseInt(process.env.PRISMA_SLOW_QUERY_MS || "500", 10);
  private replicaClient?: PrismaClient;

  /**
   * 静态工厂：创建具有分站隔离 + 慢查询监控的 PrismaService 实例
   *
   * NestJS 通过 PrismaModule 中的自定义 Provider 调用此工厂，
   * 而非直接 new PrismaService()——确保所有注入点拿到的是扩展后的客户端。
   */
  static create(metrics?: MetricsService): PrismaService {
    const instance = new PrismaService(metrics);
    instance.applyExtensions();
    return instance;
  }

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

    // 注意：扩展安装移至 applyExtensions()，由静态工厂 create() 调用
  }

  /** 链式安装 Prisma $extends：分站隔离 → 慢查询监控，通过 Object.assign 代理到实例 */
  private applyExtensions() {
    // Layer 1：分站数据隔离
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extended: any = this.$extends({
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

    // Layer 2：慢查询监控（非测试环境）
    if (process.env.NODE_ENV !== "test") {
      extended = extended.$extends({
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
    }

    // 将扩展客户端的模型委托复制到当前实例（仅复制属性，不复制构造函数和私有属性）
    // 使用 Object.assign 替代 for-in 反射，更明确且 TypeScript 友好
    const delegatedKeys = Object.keys(extended).filter(
      (k) => k !== "constructor" && !k.startsWith("_") && !k.startsWith("$"),
    );
    for (const key of delegatedKeys) {
      try {
        Object.defineProperty(this, key, {
          get: () => (extended as any)[key],
          enumerable: true,
          configurable: true,
        });
      } catch {
        // Prisma 内部属性可能不可重定义，跳过
      }
    }
  }

  async onModuleInit() {
    await this.$connect();
    if (this.replicaClient) {
      await this.replicaClient.$connect();
      // 为读副本安装慢查询监控
      if (process.env.NODE_ENV !== "test") {
        this.replicaClient = (this.replicaClient as any).$extends({
          name: "replica-slow-query-logging",
          query: {
            $allModels: {
              $allOperations: async ({ model, operation, args, query }: {
                model?: string; operation: string; args: any; query: (args: any) => any;
              }) => {
                const start = Date.now();
                const result = await query(args);
                const duration = Date.now() - start;
                if (duration >= this.SLOW_QUERY_MS) {
                  this.logger.warn(`读副本慢查询 (${duration}ms): ${model}.${operation}`);
                  this.metrics?.recordSlowQuery(model || "unknown");
                }
                return result;
              },
            },
          },
        }) as PrismaClient;
      }
    }
    this.logger.log(`数据库已连接 (慢查询阈值: ${this.SLOW_QUERY_MS}ms, 读副本: ${this.replicaClient ? "已启用" : "未配置"})`);

    this.startConnectionPoolMonitoring();
  }

  async onModuleDestroy() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
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

  private connectionMonitorInterval: NodeJS.Timeout | null = null;

  /** 每 30 秒采集数据库连接池使用率，高水位自动告警 */
  private startConnectionPoolMonitoring() {
    this.connectionMonitorInterval = setInterval(async () => {
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

    if (this.connectionMonitorInterval.unref) this.connectionMonitorInterval.unref();
  }
}
