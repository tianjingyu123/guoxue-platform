/**
 * OCR 数据种子脚本
 * 基于已有书籍章节文字生成图像记录和 OCR 坐标数据
 * 模拟古籍竖排排版：10列 × 20行/页，每页约200字
 *
 * 用法：npx ts-node scripts/seed-ocr-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 竖排参数
const CHARS_PER_LINE = 20;   // 每列约20字（从上到下）
const COLS_PER_PAGE = 10;    // 每页10列（从右到左）
const CHARS_PER_PAGE = CHARS_PER_LINE * COLS_PER_PAGE;
const LINE_WIDTH = 160;      // 列宽（像素）
const CHAR_HEIGHT = 56;      // 字高（像素）
const PAGE_MARGIN = 120;     // 页边距

async function main() {
  // 获取有章节的书籍
  const books = await prisma.classicBook.findMany({
    where: { status: "PUBLISHED" },
    include: { chapters: { orderBy: { sortOrder: "asc" }, take: 50 } },
    take: 5, // 首批5部
  });

  console.log(`找到 ${books.length} 部书籍\n`);

  for (const book of books) {
    console.log(`📖 ${book.title} (${book.chapters.length} 章)`);

    let pageNumber = 1;
    let totalImages = 0;
    let totalOcrLines = 0;

    for (const chapter of book.chapters) {
      if (!chapter.content) continue;
      const text = chapter.content.replace(/\s/g, "");
      const totalChars = text.length;
      const pagesNeeded = Math.ceil(totalChars / CHARS_PER_PAGE);

      for (let p = 0; p < pagesNeeded; p++) {
        const pageStart = p * CHARS_PER_PAGE;
        const pageEnd = Math.min(pageStart + CHARS_PER_PAGE, totalChars);
        const pageContent = text.slice(pageStart, pageEnd);

        // 创建或更新图像记录
        const image = await prisma.classicImage.upsert({
          where: { bookId_pageNumber: { bookId: book.id, pageNumber } },
          create: {
            bookId: book.id,
            pageNumber,
            label: chapter.title
              ? `${chapter.title}·第${p + 1}页`
              : `第${pageNumber}页`,
            width: 2400,
            height: 3200,
            source: "seed-generated",
          },
          update: {
            label: chapter.title
              ? `${chapter.title}·第${p + 1}页`
              : `第${pageNumber}页`,
          },
        });

        // 生成 OCR 坐标（竖排：10列从右到左，每列20字从上到下）
        const ocrLines: Array<{
          imageId: string;
          content: string;
          x: number;
          y: number;
          w: number;
          h: number;
          pageNumber: number;
          lineNumber: number;
          charIndex: number;
          confidence: number;
        }> = [];

        // 先删除旧数据
        await prisma.classicOcrText.deleteMany({
          where: { imageId: image.id },
        });

        let globalCharIdx = 0;
        for (let col = 0; col < COLS_PER_PAGE && globalCharIdx < pageContent.length; col++) {
          const lineStart = globalCharIdx;
          const lineEnd = Math.min(lineStart + CHARS_PER_LINE, pageContent.length);
          const lineText = pageContent.slice(lineStart, lineEnd);

          // 竖排从右到左：col=0 是最右列
          const x = 2400 - PAGE_MARGIN - (col + 1) * LINE_WIDTH;

          for (let ci = 0; ci < lineText.length; ci++) {
            ocrLines.push({
              imageId: image.id,
              content: lineText[ci],
              x,
              y: PAGE_MARGIN + ci * CHAR_HEIGHT,
              w: LINE_WIDTH,
              h: CHAR_HEIGHT,
              pageNumber,
              lineNumber: col + 1,
              charIndex: ci + 1,
              confidence: 0.95,
            });
          }

          globalCharIdx = lineEnd;
        }

        // 批量插入 OCR 数据
        if (ocrLines.length > 0) {
          // 逐个插入（避免大批量事务超时）
          let inserted = 0;
          for (const t of ocrLines) {
            await prisma.classicOcrText.create({ data: t });
            inserted++;
          }
          totalOcrLines += inserted;
        }

        totalImages++;
        pageNumber++;
      }
    }

    console.log(`  → ${totalImages} 页图像, ${totalOcrLines} 条OCR坐标\n`);
  }

  // 统计
  const imageCount = await prisma.classicImage.count();
  const ocrCount = await prisma.classicOcrText.count();
  console.log(`✅ 完成！共 ${imageCount} 张图像，${ocrCount} 条OCR坐标`);
}

main()
  .catch((e) => {
    console.error("种子失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
