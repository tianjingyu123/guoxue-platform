import { Injectable, Logger } from "@nestjs/common";
import { ClassicSegmentService } from "../classic/classic-segment.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 古籍段落迁移任务：批量为章节创建段落记录并迁移旧锚点
 *
 * 使用方式：
 * 默认只预览（切分段落 + 统计锚点映射，不写回 segmentId）；核对报告与备份后传 { apply: true } 才写回。
 * 1. 通过管理后台或 CLI 调用 `migrateAllChapters()` 批量迁移所有章节
 * 2. 或调用 `migrateBookChapters(bookId)` 迁移单本古籍的所有章节
 */
@Injectable()
export class ClassicSegmentMigrationTask {
  private readonly logger = new Logger(ClassicSegmentMigrationTask.name);

  constructor(
    private segmentService: ClassicSegmentService,
    private prisma: PrismaService,
  ) {}

  /**
   * 为单本古籍的所有章节创建段落并迁移锚点
   */
  async migrateBookChapters(bookId: string, options: { apply?: boolean } = {}): Promise<{
    bookId: string;
    chaptersProcessed: number;
    segmentsCreated: number;
    notesMigrated: number;
    annotationsMigrated: number;
    unmappedNotes: number;
    unmappedAnnotations: number;
    crossSegmentAnnotations: number;
    contentChangedChapters: number;
    applied: boolean;
  }> {
    const chapters = await this.prisma.classicChapter.findMany({
      where: { bookId, deletedAt: null },
      select: { id: true, title: true },
      orderBy: { sortOrder: "asc" },
    });

    let totalSegments = 0;
    let totalNotes = 0;
    let totalAnnotations = 0;
    let unmappedNotes = 0;
    let unmappedAnnotations = 0;
    let crossSegmentAnnotations = 0;
    let contentChangedChapters = 0;

    for (const chapter of chapters) {
      this.logger.log(`迁移章节: ${chapter.title} (${chapter.id})`);
      try {
        const result = await this.segmentService.migrateChapterToSegments(
          chapter.id,
          { apply: options.apply },
        );
        totalSegments += result.segmentsCreated;
        totalNotes += result.notesMigrated;
        totalAnnotations += result.annotationsMigrated;
        unmappedNotes += result.preview.unmappedNotes;
        unmappedAnnotations += result.preview.unmappedAnnotations;
        crossSegmentAnnotations += result.preview.crossSegmentAnnotations;
        if (result.preview.contentChanged) contentChangedChapters++;
      } catch (error: any) {
        this.logger.error(
          `章节 ${chapter.id} 迁移失败: ${error?.message || error}`,
        );
      }
    }

    return {
      bookId,
      chaptersProcessed: chapters.length,
      segmentsCreated: totalSegments,
      notesMigrated: totalNotes,
      annotationsMigrated: totalAnnotations,
      unmappedNotes,
      unmappedAnnotations,
      crossSegmentAnnotations,
      contentChangedChapters,
      applied: !!options.apply,
    };
  }

  /**
   * 批量迁移所有古籍的章节（分批处理，避免一次性加载过多数据）
   */
  async migrateAllChapters(batchSize: number = 10, options: { apply?: boolean } = {}): Promise<{
    booksProcessed: number;
    chaptersProcessed: number;
    segmentsCreated: number;
    notesMigrated: number;
    annotationsMigrated: number;
  }> {
    const books = await this.prisma.classicBook.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    });

    let totalChapters = 0;
    let totalSegments = 0;
    let totalNotes = 0;
    let totalAnnotations = 0;

    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      this.logger.log(
        `处理古籍批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(books.length / batchSize)}`,
      );

      for (const book of batch) {
        this.logger.log(`迁移古籍: ${book.title} (${book.id})`);
        try {
          const result = await this.migrateBookChapters(book.id, options);
          totalChapters += result.chaptersProcessed;
          totalSegments += result.segmentsCreated;
          totalNotes += result.notesMigrated;
          totalAnnotations += result.annotationsMigrated;
        } catch (error: any) {
          this.logger.error(
            `古籍 ${book.id} 迁移失败: ${error?.message || error}`,
          );
        }
      }
    }

    return {
      booksProcessed: books.length,
      chaptersProcessed: totalChapters,
      segmentsCreated: totalSegments,
      notesMigrated: totalNotes,
      annotationsMigrated: totalAnnotations,
    };
  }
}
