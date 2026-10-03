import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RedisService } from "../../../redis/redis.service";
import { ContentVectorizeService } from "../services/content-vectorize.service";

/**
 * 内容向量化对账定时任务 —— 「消费审核通过状态 → 算向量入库」的托底 worker。
 *
 * - 每 30 分钟对账一次：补齐审核通过内容缺失的向量、清理已下架内容的向量（幂等、控成本）。
 * - 分布式锁防多实例重复调用（重复调用只是浪费 embedding 费用）。
 * - 🔒 未开通混元密钥时 reconcile 自身 no-op，本任务安全空转，不产生任何费用。
 *   董事长在后台配好『腾讯混元 Embedding』并启用后，本任务下一轮自动开始向量化。
 */
@Injectable()
export class ContentVectorizeTask {
  private readonly logger = new Logger(ContentVectorizeTask.name);

  constructor(
    private readonly redis: RedisService,
    private readonly vectorize: ContentVectorizeService,
  ) {}

  @Cron("*/30 * * * *")
  async reconcileVectors() {
    if (!this.vectorize.isEnabled) return; // 未开启混元，直接空转（连锁都不抢）
    await this.redis.runExclusive("content_vectorize_reconcile", 1500, async () => {
      try {
        await this.vectorize.reconcile(500); // 单轮最多新算 500 条，控 API 成本
      } catch (err: any) {
        this.logger.error(`内容向量化对账异常: ${err.message}`);
      }
    });
  }
}
