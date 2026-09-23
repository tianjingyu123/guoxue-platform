import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { createHash } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "./classic-publication-policy";

/**
 * 古籍段落服务：负责章节内容切分、段落持久化、旧锚点迁移
 *
 * 坐标系（2026-09-17 按前端实际用法核实，apps/mobile/src/pkg-classics/reader/index.vue）：
 * - ClassicReadingNote.position / 书签 position：**段落序号**（scrollToParagraph(position)），
 *   序号来自与本服务一致的 splitParagraphs 结果
 * - ClassicAnnotation.startPos/endPos：**原始 chapter.content 字符偏移**（classic.service 中 content.slice(startPos, endPos)）
 *
 * 因此段落必须同时保存：
 * - sortOrder = 前端段落序号
 * - startCharOffset/endCharOffset = 段落文本在原始 content 中的真实位置（包含被 trim 掉的换行、缩进之外的坐标）
 *
 * 迁移顺序：① 原样切分落 segment（只读取原文，不改原文）② 预览锚点映射 ③ 显式确认后写回 segmentId
 */

export interface ComputedSegment {
  sortOrder: number;
  content: string;
  startCharOffset: number;
  endCharOffset: number;
}

export interface AnchorMigrationPreview {
  chapterId: string;
  segmentsReady: boolean;
  /** 章节正文在切分后被修改，锚点不可安全迁移 */
  contentChanged: boolean;
  notes: { id: string; position: number; segmentId: string | null }[];
  annotations: {
    id: string;
    startPos: number;
    endPos: number;
    segmentId: string | null;
    crossSegment: boolean;
  }[];
  unmappedNotes: number;
  unmappedAnnotations: number;
  crossSegmentAnnotations: number;
}

@Injectable()
export class ClassicSegmentService {
  private readonly logger = new Logger(ClassicSegmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 公开可读校验（2026-09-21 补）：段落接口与正文接口同一口径——已发布、未删除、有已审计的可商用版权记录。
   * 此前 GET chapters/:id/segments 不校验，未发布或版权待审的章节正文可经段落接口读出。
   */
  async assertChapterPublic(chapterId: string) {
    const ok = await this.prisma.classicChapter.findFirst({
      where: { id: chapterId, deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE },
      select: { id: true },
    });
    if (!ok) throw new BusinessException(ErrorCode.NOT_FOUND, "章节不存在");
  }

  async assertSegmentPublic(segmentId: string) {
    const ok = await this.prisma.classicSegment.findFirst({
      where: { id: segmentId, deletedAt: null, chapter: { deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE } },
      select: { id: true },
    });
    if (!ok) throw new BusinessException(ErrorCode.NOT_FOUND, "段落不存在");
  }

  /**
   * 切分段落并计算原文坐标。
   * 切分规则与前端 reader/index.vue splitParagraphs 完全一致，保证 sortOrder 等于前端段落序号。
   */
  computeSegments(text: string): ComputedSegment[] {
    if (!text) return [];
    let parts = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) {
      parts = text
        .replace(/([。！？；])/g, "$1\n")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // 每段都是原文子串（只去掉首尾空白），从游标处顺序查找得到真实偏移；重复段落也按顺序定位
    const out: ComputedSegment[] = [];
    let cursor = 0;
    parts.forEach((content, sortOrder) => {
      const start = text.indexOf(content, cursor);
      if (start < 0) {
        throw new Error(`段落 ${sortOrder} 无法在原文中定位，拒绝生成错误坐标`);
      }
      const end = start + content.length;
      out.push({ sortOrder, content, startCharOffset: start, endCharOffset: end });
      cursor = end;
    });
    return out;
  }

  private computeContentHash(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
  }

  /**
   * 获取章节的段落列表（按 sortOrder 升序）
   */
  async getSegmentsForChapter(chapterId: string) {
    return this.prisma.classicSegment.findMany({
      where: { chapterId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        sortOrder: true,
        content: true,
        contentHash: true,
        versionTag: true,
        processingStatus: true,
        startCharOffset: true,
        endCharOffset: true,
      },
    });
  }

  /**
   * 为章节创建段落记录（首次切分，原貌版本 v1）。只读原文、不迁移任何锚点；
   * 并发首次访问时依赖 (chapterId, sortOrder) 唯一约束 + skipDuplicates 保持幂等。
   */
  async createSegmentsForChapter(chapterId: string): Promise<number> {
    const chapter = await this.prisma.classicChapter.findUnique({
      where: { id: chapterId },
      select: { id: true, content: true },
    });

    if (!chapter) {
      throw new Error(`章节不存在: ${chapterId}`);
    }

    const existingCount = await this.prisma.classicSegment.count({
      where: { chapterId },
    });
    if (existingCount > 0) {
      return 0;
    }

    const computed = this.computeSegments(chapter.content);
    const data = computed.map((seg) => ({
      chapterId: chapter.id,
      sortOrder: seg.sortOrder,
      content: seg.content,
      contentHash: this.computeContentHash(seg.content),
      originalContent: seg.content,
      startCharOffset: seg.startCharOffset,
      endCharOffset: seg.endCharOffset,
      versionTag: "v1",
      processingStatus: "raw",
    }));

    const result = await this.prisma.classicSegment.createMany({ data, skipDuplicates: true });
    this.logger.log(`章节 ${chapterId} 切分完成，共 ${result.count} 个段落`);
    return result.count;
  }

  /**
   * 预览旧锚点到段落的映射（不写库）。
   * - 笔记 position 按段落序号映射
   * - 注疏按原文字符区间与段落区间的重叠映射；跨段注疏归入起点所在（或第一个重叠）段落并单独计数
   */
  async previewAnchorMigration(chapterId: string): Promise<AnchorMigrationPreview> {
    const [chapter, segments] = await Promise.all([
      this.prisma.classicChapter.findUnique({ where: { id: chapterId }, select: { content: true } }),
      this.prisma.classicSegment.findMany({
        where: { chapterId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true, originalContent: true, startCharOffset: true, endCharOffset: true },
      }),
    ]);

    const preview: AnchorMigrationPreview = {
      chapterId,
      segmentsReady: segments.length > 0,
      contentChanged: false,
      notes: [],
      annotations: [],
      unmappedNotes: 0,
      unmappedAnnotations: 0,
      crossSegmentAnnotations: 0,
    };
    if (!chapter || segments.length === 0) return preview;

    // 原文在切分后被修改：段落坐标不再可信
    preview.contentChanged = segments.some(
      (seg) => chapter.content.slice(seg.startCharOffset, seg.endCharOffset) !== seg.originalContent,
    ) || this.computeSegments(chapter.content).length !== segments.length;
    if (preview.contentChanged) return preview;

    const bySort = new Map(segments.map((seg) => [seg.sortOrder, seg.id]));

    const notes = await this.prisma.classicReadingNote.findMany({
      where: { chapterId, position: { not: null }, segmentId: null },
      select: { id: true, position: true },
    });
    for (const note of notes) {
      const segmentId = bySort.get(note.position as number) ?? null;
      if (!segmentId) preview.unmappedNotes++;
      preview.notes.push({ id: note.id, position: note.position as number, segmentId });
    }

    const annotations = await this.prisma.classicAnnotation.findMany({
      where: { chapterId, segmentId: null },
      select: { id: true, startPos: true, endPos: true },
    });
    for (const ann of annotations) {
      const end = Math.max(ann.endPos, ann.startPos + 1);
      const overlapping = segments.filter(
        (seg) => ann.startPos < seg.endCharOffset && end > seg.startCharOffset,
      );
      const containing = segments.find(
        (seg) => ann.startPos >= seg.startCharOffset && ann.startPos < seg.endCharOffset,
      );
      const target = containing ?? overlapping[0] ?? null;
      const crossSegment = overlapping.length > 1;
      if (!target) preview.unmappedAnnotations++;
      if (crossSegment) preview.crossSegmentAnnotations++;
      preview.annotations.push({
        id: ann.id,
        startPos: ann.startPos,
        endPos: ann.endPos,
        segmentId: target?.id ?? null,
        crossSegment,
      });
    }

    return preview;
  }

  /**
   * 按预览结果写回 segmentId（单事务）。原文已变更时拒绝执行。
   * 旧 position/startPos/endPos 原值保留不改，可随时回退为按旧坐标读取。
   */
  async applyAnchorMigration(chapterId: string): Promise<AnchorMigrationPreview & { applied: boolean }> {
    const preview = await this.previewAnchorMigration(chapterId);
    if (!preview.segmentsReady || preview.contentChanged) {
      this.logger.warn(`章节 ${chapterId} 段落未就绪或原文已变更，拒绝迁移锚点`);
      return { ...preview, applied: false };
    }

    const noteUpdates = preview.notes.filter((n) => n.segmentId);
    const annotationUpdates = preview.annotations.filter((a) => a.segmentId);
    await this.prisma.$transaction([
      ...noteUpdates.map((n) =>
        this.prisma.classicReadingNote.update({ where: { id: n.id }, data: { segmentId: n.segmentId } }),
      ),
      ...annotationUpdates.map((a) =>
        this.prisma.classicAnnotation.update({ where: { id: a.id }, data: { segmentId: a.segmentId } }),
      ),
    ]);

    this.logger.log(
      `章节 ${chapterId} 锚点迁移：笔记 ${noteUpdates.length}（未映射 ${preview.unmappedNotes}），` +
        `注疏 ${annotationUpdates.length}（未映射 ${preview.unmappedAnnotations}，跨段 ${preview.crossSegmentAnnotations}）`,
    );
    return { ...preview, applied: true };
  }

  /**
   * 完整流程：切分段落 + 锚点迁移。默认只预览（apply=false），需显式确认才写回锚点。
   */
  async migrateChapterToSegments(
    chapterId: string,
    options: { apply?: boolean } = {},
  ): Promise<{
    segmentsCreated: number;
    notesMigrated: number;
    annotationsMigrated: number;
    applied: boolean;
    preview: AnchorMigrationPreview;
  }> {
    const segmentsCreated = await this.createSegmentsForChapter(chapterId);
    const result = options.apply
      ? await this.applyAnchorMigration(chapterId)
      : { ...(await this.previewAnchorMigration(chapterId)), applied: false };
    return {
      segmentsCreated,
      notesMigrated: result.applied ? result.notes.filter((n) => n.segmentId).length : 0,
      annotationsMigrated: result.applied ? result.annotations.filter((a) => a.segmentId).length : 0,
      applied: result.applied,
      preview: result,
    };
  }
}
