import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@Injectable()
export class ClassicImageService {
  private readonly logger = new Logger(ClassicImageService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 获取书籍页面图像（分页） */
  async listBookImages(bookId: string, page = 1, pageSize = 100) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.classicImage.findMany({
        where: { bookId },
        orderBy: { pageNumber: "asc" },
        select: {
          id: true, pageNumber: true, label: true,
          iiifUrl: true, width: true, height: true, source: true,
        },
        skip,
        take: pageSize,
      }),
      this.prisma.classicImage.count({ where: { bookId } }),
    ]);
    return { items: data, total, page, pageSize };
  }

  /** 获取单页图像 + OCR 坐标数据 */
  async getPageImage(bookId: string, pageNumber: number) {
    const image = await this.prisma.classicImage.findUnique({
      where: { bookId_pageNumber: { bookId, pageNumber } },
      include: {
        ocrTexts: {
          orderBy: [{ lineNumber: "asc" }, { charIndex: "asc" }],
        },
      },
    });
    return image;
  }

  /** 创建/更新书籍图像记录（幂等 upsert） */
  async createImage(bookId: string, dto: {
    pageNumber: number; label?: string; iiifUrl?: string;
    manifestUrl?: string; width?: number; height?: number; source?: string;
  }) {
    return this.prisma.classicImage.upsert({
      where: { bookId_pageNumber: { bookId, pageNumber: dto.pageNumber } },
      create: { bookId, ...dto },
      update: { label: dto.label, iiifUrl: dto.iiifUrl, manifestUrl: dto.manifestUrl, width: dto.width, height: dto.height, source: dto.source },
    });
  }

  /** 更新图像记录 */
  async updateImage(id: string, dto: {
    pageNumber?: number; label?: string; iiifUrl?: string;
    manifestUrl?: string; width?: number; height?: number; source?: string;
  }) {
    const existing = await this.prisma.classicImage.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "图像记录不存在");
    return this.prisma.classicImage.update({ where: { id }, data: dto });
  }

  /** 批量创建书籍图像记录 */
  async createImagesBulk(bookId: string, images: Array<{
    pageNumber: number; label?: string; iiifUrl?: string;
    manifestUrl?: string; width?: number; height?: number; source?: string;
  }>) {
    let created = 0;
    let skipped = 0;
    for (const img of images) {
      try {
        await this.prisma.classicImage.upsert({
          where: { bookId_pageNumber: { bookId, pageNumber: img.pageNumber } },
          create: { bookId, ...img },
          update: { label: img.label, iiifUrl: img.iiifUrl, manifestUrl: img.manifestUrl, width: img.width, height: img.height, source: img.source },
        });
        created++;
      } catch (err) {
        this.logger.warn(`跳过图像 bookId=${bookId} page=${img.pageNumber}: ${(err as Error).message}`);
        skipped++;
      }
    }
    return { created, skipped };
  }

  /** 删除图像记录 */
  async deleteImage(id: string) {
    const existing = await this.prisma.classicImage.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "图像记录不存在");
    return this.prisma.classicImage.delete({ where: { id } });
  }

  /** 生成 IIIF Manifest（Presentation API 3.0） */
  async generateManifest(bookId: string, baseUrl: string) {
    const images = await this.prisma.classicImage.findMany({
      where: { bookId },
      orderBy: { pageNumber: "asc" },
    });
    const book = await this.prisma.classicBook.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, author: true },
    });
    if (!book) return null;

    const canvases = images.map((img, i) => ({
      id: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}`,
      type: "Canvas",
      label: { none: [img.label || `第${img.pageNumber}页`] },
      width: img.width || 2400,
      height: img.height || 3200,
      items: [{
        id: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}/page`,
        type: "AnnotationPage",
        items: [{
          id: `${baseUrl}/classic/books/${bookId}/annotation/${img.pageNumber}`,
          type: "Annotation",
          motivation: "painting",
          body: {
            id: img.iiifUrl ? `${img.iiifUrl}/full/max/0/default.jpg` : `${baseUrl}/classic/images/${img.id}`,
            type: "Image",
            format: "image/jpeg",
            width: img.width || 2400,
            height: img.height || 3200,
            service: img.iiifUrl ? [{
              id: img.iiifUrl,
              type: "ImageService3",
              profile: "level1",
            }] : undefined,
          },
          target: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}`,
        }],
      }],
    }));

    return {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id: `${baseUrl}/classic/books/${bookId}/manifest`,
      type: "Manifest",
      label: { none: [book.title] },
      metadata: book.author ? [{ label: { none: ["作者"] }, value: { none: [book.author] } }] : [],
      items: canvases,
    };
  }

  /** OCR 坐标批量写入 */
  async saveOcrTexts(imageId: string, texts: Array<{
    content: string; x: number; y: number; w: number; h: number;
    pageNumber: number; lineNumber: number; charIndex: number; confidence?: number;
  }>) {
    let inserted = 0;
    // 先清旧数据
    await this.prisma.classicOcrText.deleteMany({ where: { imageId } });
    for (const t of texts) {
      await this.prisma.classicOcrText.create({ data: { imageId, ...t } });
      inserted++;
    }
    return { inserted };
  }

  /** 全文搜索 OCR 文本，返回匹配字符在图像上的坐标 */
  async searchOcrText(bookId: string, keyword: string) {
    const results = await this.prisma.classicOcrText.findMany({
      where: {
        image: { bookId },
        content: { contains: keyword },
      },
      select: {
        id: true,
        content: true,
        x: true, y: true, w: true, h: true,
        pageNumber: true, lineNumber: true, charIndex: true,
        imageId: true,
        image: { select: { id: true, pageNumber: true, label: true, iiifUrl: true, width: true, height: true } },
      },
      take: 200,
      orderBy: [{ pageNumber: "asc" }, { lineNumber: "asc" }, { charIndex: "asc" }],
    });
    return { keyword, matches: results, total: results.length };
  }

  // ═══════════════════ 图文对照 ═══════════════════

  /** 获取章节的文字→图像页面位置映射（可指定单页以减小响应体积） */
  async getChapterImageMapping(chapterId: string, targetPage?: number) {
    const chapter = await this.prisma.classicChapter.findUnique({
      where: { id: chapterId },
      select: { id: true, bookId: true, title: true, content: true },
    });
    if (!chapter) return null;

    // 获取该书所有页面图像（按页码排序），可选单页过滤
    const imageWhere: any = { bookId: chapter.bookId };
    if (targetPage) imageWhere.pageNumber = targetPage;
    const images = await this.prisma.classicImage.findMany({
      where: imageWhere,
      orderBy: { pageNumber: "asc" },
      include: {
        ocrTexts: {
          orderBy: [{ lineNumber: "asc" }, { charIndex: "asc" }],
        },
      },
    });

    // 有 OCR 数据时精确映射
    if (images.some((img) => img.ocrTexts.length > 0)) {
      return this.buildOcrMapping(chapter, images);
    }

    // 无 OCR 数据时用启发式估算
    return this.buildEstimatedMapping(chapter, images);
  }

  /** 基于 OCR 坐标的精确映射 */
  private buildOcrMapping(
    chapter: { id: string; bookId: string; title: string; content: string },
    images: Array<{ id: string; pageNumber: number; label: string | null; iiifUrl: string | null; width: number | null; height: number | null; ocrTexts: Array<{ content: string; x: number; y: number; w: number; h: number; lineNumber: number; charIndex: number }> }>,
  ) {
    const pages: Array<{
      imageId: string; pageNumber: number; label: string;
      iiifUrl: string | null; width: number | null; height: number | null;
      textStart: number; textEnd: number; lines: Array<{
        lineNumber: number; textStart: number; textEnd: number;
        x: number; y: number; w: number; h: number; content: string;
      }>;
    }> = [];

    let globalCharIndex = 0;

    for (const img of images) {
      if (img.ocrTexts.length === 0) continue;

      const lines = new Map<number, { chars: Array<{ charIndex: number; content: string; x: number; y: number; w: number; h: number }> }>();

      for (const t of img.ocrTexts) {
        if (!lines.has(t.lineNumber)) {
          lines.set(t.lineNumber, { chars: [] });
        }
        lines.get(t.lineNumber)!.chars.push({
          charIndex: t.charIndex, content: t.content,
          x: t.x, y: t.y, w: t.w, h: t.h,
        });
      }

      const textStart = globalCharIndex;
      const lineInfos: Array<{
        lineNumber: number; textStart: number; textEnd: number;
        x: number; y: number; w: number; h: number; content: string;
      }> = [];

      for (const [ln, lineData] of [...lines.entries()].sort((a, b) => a[0] - b[0])) {
        lineData.chars.sort((a, b) => a.charIndex - b.charIndex);
        const lineContent = lineData.chars.map((c) => c.content).join("");
        const lineStart = globalCharIndex;
        const lineEnd = lineStart + lineContent.length;
        globalCharIndex = lineEnd;

        // 合并行内所有字符的边界框
        const minX = Math.min(...lineData.chars.map((c) => c.x));
        const minY = Math.min(...lineData.chars.map((c) => c.y));
        const maxX = Math.max(...lineData.chars.map((c) => c.x + c.w));
        const maxY = Math.max(...lineData.chars.map((c) => c.y + c.h));

        lineInfos.push({
          lineNumber: ln,
          textStart: lineStart,
          textEnd: lineEnd,
          x: minX, y: minY, w: maxX - minX, h: maxY - minY,
          content: lineContent,
        });
      }

      pages.push({
        imageId: img.id, pageNumber: img.pageNumber,
        label: img.label || `第${img.pageNumber}页`,
        iiifUrl: img.iiifUrl, width: img.width, height: img.height,
        textStart,
        textEnd: globalCharIndex,
        lines: lineInfos,
      });
    }

    return {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      totalChars: chapter.content.length,
      mappingType: "ocr" as const,
      pages,
    };
  }

  /** 无 OCR 数据时基于字数的启发式估算 */
  private buildEstimatedMapping(
    chapter: { id: string; bookId: string; title: string; content: string },
    images: Array<{ id: string; pageNumber: number; label: string | null; iiifUrl: string | null; width: number | null; height: number | null }>,
  ) {
    const totalChars = chapter.content.length;
    const pageCount = images.length || 1;
    // 古籍善本每页约 200-400 字（竖排 10 列 × 20 行）
    const charsPerPage = Math.max(200, Math.ceil(totalChars / pageCount));

    const pages = images.map((img, i) => {
      const textStart = i * charsPerPage;
      const textEnd = Math.min((i + 1) * charsPerPage, totalChars);
      // 竖排模拟：10列，每列 textEnd-textStart 个字分布
      const colCount = 10;
      const linesPerCol = Math.ceil((textEnd - textStart) / colCount);
      const lines: Array<{
        lineNumber: number; textStart: number; textEnd: number;
        x: number; y: number; w: number; h: number; content: string;
      }> = [];

      for (let col = 0; col < colCount && col * linesPerCol < (textEnd - textStart); col++) {
        const colStart = textStart + col * linesPerCol;
        const colEnd = Math.min(colStart + linesPerCol, textEnd);
        // 竖排从右到左：x 从右往左排列
        const x = (img.width || 2400) - (col + 1) * 180;
        lines.push({
          lineNumber: col + 1,
          textStart: colStart,
          textEnd: colEnd,
          x: Math.max(0, x),
          y: 100,
          w: 160,
          h: 2800,
          content: chapter.content.slice(colStart, colEnd),
        });
      }

      return {
        imageId: img.id, pageNumber: img.pageNumber,
        label: img.label || `第${img.pageNumber}页`,
        iiifUrl: img.iiifUrl, width: img.width, height: img.height,
        textStart, textEnd,
        lines,
      };
    }).filter((p) => p.textStart < totalChars);

    return {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      totalChars,
      mappingType: "estimated" as const,
      pages,
    };
  }

  /** 生成含文字叠加层的 IIIF Manifest */
  async generateManifestWithTextOverlay(bookId: string, baseUrl: string) {
    const images = await this.prisma.classicImage.findMany({
      where: { bookId },
      orderBy: { pageNumber: "asc" },
      include: { ocrTexts: { orderBy: [{ lineNumber: "asc" }, { charIndex: "asc" }] } },
    });
    const book = await this.prisma.classicBook.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, author: true },
    });
    if (!book) return null;

    const canvases = images.map((img) => {
      // 基础 Annotation（图像本身）
      const paintingAnnotation = {
        id: `${baseUrl}/classic/books/${bookId}/annotation/${img.pageNumber}/painting`,
        type: "Annotation",
        motivation: "painting",
        body: {
          id: img.iiifUrl ? `${img.iiifUrl}/full/max/0/default.jpg` : `${baseUrl}/classic/images/${img.id}`,
          type: "Image",
          format: "image/jpeg",
          width: img.width || 2400,
          height: img.height || 3200,
          service: img.iiifUrl ? [{ id: img.iiifUrl, type: "ImageService3", profile: "level1" }] : undefined,
        },
        target: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}`,
      };

      // W3C 文字叠加层 Annotation（mirador-textoverlay 格式）
      const textAnnotations = img.ocrTexts.map((t, idx) => ({
        id: `${baseUrl}/classic/books/${bookId}/annotation/${img.pageNumber}/text/${idx}`,
        type: "Annotation",
        motivation: "supplementing",
        body: {
          type: "TextualBody",
          value: t.content,
          format: "text/plain",
          language: "zh-Hant",
        },
        target: {
          source: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}`,
          selector: {
            type: "FragmentSelector",
            conformsTo: "http://www.w3.org/TR/media-frags/",
            value: `#xywh=${t.x},${t.y},${t.w},${t.h}`,
          },
        },
        // mirador-textoverlay 需要的行号
        dc: t.lineNumber ? { identifier: `${img.pageNumber}-line-${t.lineNumber}` } : undefined,
      }));

      return {
        id: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}`,
        type: "Canvas",
        label: { none: [img.label || `第${img.pageNumber}页`] },
        width: img.width || 2400,
        height: img.height || 3200,
        items: [
          {
            id: `${baseUrl}/classic/books/${bookId}/canvas/${img.pageNumber}/page`,
            type: "AnnotationPage",
            items: textAnnotations.length > 0
              ? [paintingAnnotation, ...textAnnotations]
              : [paintingAnnotation],
          },
        ],
      };
    });

    return {
      "@context": [
        "http://iiif.io/api/presentation/3/context.json",
        "http://www.w3.org/ns/anno.jsonld",
      ],
      id: `${baseUrl}/classic/books/${bookId}/manifest`,
      type: "Manifest",
      label: { none: [book.title] },
      metadata: book.author ? [{ label: { none: ["作者"] }, value: { none: [book.author] } }] : [],
      items: canvases,
    };
  }
}
