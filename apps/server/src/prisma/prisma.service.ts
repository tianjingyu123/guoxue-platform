import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 数据库服务
 * - 慢查询监控（默认阈值 500ms）
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

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ],
    });

    // 慢查询检测
    if (process.env.NODE_ENV !== "test") {
      (this as any).$on("query", (e: { duration: number; query: string }) => {
        if (e.duration >= this.SLOW_QUERY_MS) {
          this.logger.warn(
            `慢查询 (${e.duration}ms): ${e.query.replace(/\s+/g, " ").trim().substring(0, 200)}`,
          );
        }
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`数据库已连接 (慢查询阈值: ${this.SLOW_QUERY_MS}ms)`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("数据库已断开");
  }

  /** 获取慢查询阈值（供外部读取） */
  get slowQueryThreshold(): number {
    return this.SLOW_QUERY_MS;
  }
}
