import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { VectorService } from "../ai-gateway/vector.service";

/**
 * 古籍文本向量化定时任务
 *
 * 将 ClassicBook 和 ClassicChapter 内容向量化后存入 pgvector，
 * 供古籍问答 RAG 检索使用。
 *
 * 注意：当前使用 circle_knowledge 表存储向量（以 circleId = "classic" 作为命名空间），
 * 后续可迁移到专用的 classic_embedding 表。
 */
@Injectable()
export class ClassicIndexTask {
  private readonly logger = new Logger(ClassicIndexTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
    private readonly redis: RedisService,
  ) {}

  /** 每天凌晨 4:00 全量检查并索引未向量化的古籍章节（分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async indexClassicChapters() {
    await this.redis.runExclusive("classic_index_chapters", 1800, () =>
      this._indexClassicChapters(),
    );
  }

  private async _indexClassicChapters() {
    this.logger.log("开始索引古籍章节...");

    // 获取所有古籍及其章节
    const books = await this.prisma.classicBook.findMany({
      select: { id: true, title: true },
    });

    // 一次性载入所有已索引的章节 sourceId 做内存查重，替代逐章 findFirst 的 N+1
    // （此前每章一次 findFirst，全量遍历产生数十万次查询，占全库执行时间 99.9%）。
    const existingRows = await this.prisma.circleKnowledge.findMany({
      where: { circleId: "classic", sourceType: "classic_chapter" },
      select: { sourceId: true },
    });
    const indexedIds = new Set(existingRows.map((r) => r.sourceId).filter(Boolean));

    let indexed = 0;
    for (const book of books) {
      const chapters = await this.prisma.classicChapter.findMany({
        where: { bookId: book.id },
        select: { id: true, title: true, content: true },
        take: 200,
      });

      for (const chapter of chapters) {
        if (!chapter.content) continue;
        if (indexedIds.has(chapter.id)) continue; // 已索引，内存查重跳过
        try {
          await this.prisma.circleKnowledge.create({
            data: {
              circleId: "classic",
              sourceType: "classic_chapter",
              sourceId: chapter.id,
              content: `《${book.title}》${chapter.title}: ${chapter.content}`,
              contentHash: this.hashContent(chapter.content),
              addedBy: "SYSTEM",
            },
          });
          indexedIds.add(chapter.id); // 防同批重复创建
          indexed++;
        } catch (err) {
          // 跳过创建失败的（如唯一约束冲突）
          this.logger.warn(`古籍章节索引创建失败`, err);
        }
      }
    }

    // 向量索引
    const count = await this.vector.findUnindexed(50);
    if (count.length > 0) {
      const texts = count.map((r) => r.content);
      const vectors = await this.vector.embed(texts);
      for (let i = 0; i < count.length && i < vectors.length; i++) {
        await this.vector.storeCircleKnowledge(count[i].id, vectors[i]);
      }
    }

    this.logger.log(`古籍索引完成: ${indexed} 章节`);
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16);
  }
}
