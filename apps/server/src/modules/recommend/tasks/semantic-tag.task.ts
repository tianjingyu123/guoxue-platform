import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { SemanticTaggerService } from "../services/semantic-tagger.service";

/**
 * 语义标签自动打标定时任务
 *
 * 每 2 小时扫描 categoryLevel1 为空的内容，
 * 调用 LLM 自动分类并回写数据库。
 */
@Injectable()
export class SemanticTagTask {
  private readonly logger = new Logger(SemanticTagTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tagger: SemanticTaggerService,
  ) {}

  /** 每 2 小时执行一次语义打标 */
  @Cron("0 */2 * * *")
  async autoTagUntagged() {
    this.logger.log("开始自动语义打标...");

    let totalTagged = 0;

    try {
      totalTagged += await this.tagCourses();
      totalTagged += await this.tagArticles();
      totalTagged += await this.tagProducts();
      totalTagged += await this.tagCircles();
      totalTagged += await this.tagVideos();
    } catch (err: any) {
      this.logger.error(`语义打标任务异常: ${err.message}`);
    }

    this.logger.log(`语义打标完成: 共处理 ${totalTagged} 条内容`);
  }

  private async tagCourses(): Promise<number> {
    const items = await this.prisma.course.findMany({
      where: { categoryLevel1: null, auditStatus: "APPROVED" },
      select: { id: true, title: true, intro: true },
      take: 20,
    });
    if (items.length === 0) return 0;

    const batchInput = items.map((i) => ({
      id: i.id,
      text: `${i.title} ${i.intro ?? ""}`,
    }));
    const results = await this.tagger.tagBatch(batchInput);

    for (const [id, tag] of results) {
      await this.prisma.course.update({
        where: { id },
        data: {
          categoryLevel1: tag.categoryLevel1,
          categoryLevel2: tag.categoryLevel2,
          tags: { push: tag.tags },
        },
      }).catch((e: any) => this.logger.warn(`课程 ${id} 标签写入失败: ${e.message}`));
    }

    return results.size;
  }

  private async tagArticles(): Promise<number> {
    const items = await this.prisma.article.findMany({
      where: { categoryLevel1: null, auditStatus: "APPROVED" },
      select: { id: true, title: true, excerpt: true },
      take: 20,
    });
    if (items.length === 0) return 0;

    const batchInput = items.map((i) => ({
      id: i.id,
      text: `${i.title} ${i.excerpt ?? ""}`,
    }));
    const results = await this.tagger.tagBatch(batchInput);

    for (const [id, tag] of results) {
      await this.prisma.article.update({
        where: { id },
        data: {
          categoryLevel1: tag.categoryLevel1,
          categoryLevel2: tag.categoryLevel2,
          tags: { push: tag.tags },
        },
      }).catch((e: any) => this.logger.warn(`文章 ${id} 标签写入失败: ${e.message}`));
    }

    return results.size;
  }

  private async tagProducts(): Promise<number> {
    const items = await this.prisma.product.findMany({
      where: { categoryLevel1: null, status: "ON_SALE" },
      select: { id: true, title: true, intro: true },
      take: 20,
    });
    if (items.length === 0) return 0;

    const batchInput = items.map((i) => ({
      id: i.id,
      text: `${i.title} ${i.intro ?? ""}`,
    }));
    const results = await this.tagger.tagBatch(batchInput);

    for (const [id, tag] of results) {
      await this.prisma.product.update({
        where: { id },
        data: {
          categoryLevel1: tag.categoryLevel1,
          categoryLevel2: tag.categoryLevel2,
          tags: { push: tag.tags },
        },
      }).catch((e: any) => this.logger.warn(`商品 ${id} 标签写入失败: ${e.message}`));
    }

    return results.size;
  }

  private async tagCircles(): Promise<number> {
    const items = await this.prisma.circle.findMany({
      where: { categoryLevel1: null, status: "ACTIVE" },
      select: { id: true, name: true, intro: true },
      take: 20,
    });
    if (items.length === 0) return 0;

    const batchInput = items.map((i) => ({
      id: i.id,
      text: `${i.name} ${i.intro ?? ""}`,
    }));
    const results = await this.tagger.tagBatch(batchInput);

    for (const [id, tag] of results) {
      await this.prisma.circle.update({
        where: { id },
        data: {
          categoryLevel1: tag.categoryLevel1,
          categoryLevel2: tag.categoryLevel2,
          tags: { push: tag.tags },
        },
      }).catch((e: any) => this.logger.warn(`圈子 ${id} 标签写入失败: ${e.message}`));
    }

    return results.size;
  }

  private async tagVideos(): Promise<number> {
    const items = await this.prisma.video.findMany({
      where: { categoryLevel1: null, status: "PUBLISHED" },
      select: { id: true, title: true },
      take: 20,
    });
    if (items.length === 0) return 0;

    const batchInput = items.map((i) => ({
      id: i.id,
      text: i.title ?? "",
    }));
    const results = await this.tagger.tagBatch(batchInput);

    for (const [id, tag] of results) {
      await this.prisma.video.update({
        where: { id },
        data: {
          categoryLevel1: tag.categoryLevel1,
          categoryLevel2: tag.categoryLevel2,
          tags: { push: tag.tags },
        },
      }).catch((e: any) => this.logger.warn(`视频 ${id} 标签写入失败: ${e.message}`));
    }

    return results.size;
  }
}
