import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RedisService } from "../../redis/redis.service";
import { UgcKnowledgeService } from "./ugc-knowledge.service";

/**
 * UGC 知识萃取定时任务
 *
 * 每天凌晨 4:00 运行完整萃取管道：
 * 精华帖 → 高赞问答 → 深度评论 → AI 结构化入库
 */
@Injectable()
export class UgcKnowledgeTask {
  private readonly logger = new Logger(UgcKnowledgeTask.name);

  constructor(
    private readonly ugc: UgcKnowledgeService,
    private readonly redis: RedisService,
  ) {}

  /** 每日完整萃取管道（分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async dailyExtraction() {
    await this.redis.runExclusive("ugc_knowledge_daily_extraction", 1800, async () => {
      this.logger.log("每日UGC知识萃取开始");
      try {
        const result = await this.ugc.runFullPipeline();
        this.logger.log(
          `每日萃取完成: 帖子${result.posts} 问答${result.paidQuestions} 评论${result.comments}`,
        );
      } catch (err: any) {
        this.logger.error(`每日萃取失败: ${err.message}`);
      }
    });
  }

  /** 每6小时增量萃取（只处理精华帖·分布式锁防多实例重复） */
  @Cron("0 */6 * * *")
  async incrementalExtraction() {
    await this.redis.runExclusive("ugc_knowledge_incremental_extraction", 1800, async () => {
      this.logger.log("增量UGC萃取开始");
      try {
        const count = await this.ugc.extractFromEssencePosts(5);
        if (count > 0) {
          this.logger.log(`增量萃取完成: ${count} 条`);
        }
      } catch (err: any) {
        this.logger.error(`增量萃取失败: ${err.message}`);
      }
    });
  }
}
