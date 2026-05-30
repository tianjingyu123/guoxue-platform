/**
 * OCR 数据种子脚本
 * 基于已有书籍章节文字生成图像记录和 OCR 坐标数据
 * 模拟古籍竖排：10列 x 20行/页
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CHARS_PER_LINE = 20;
const COLS_PER_PAGE = 10;
const CHARS_PER_PAGE = CHARS_PER_LINE * COLS_PER_PAGE;
const LINE_WIDTH = 160;
const CHAR_HEIGHT = 56;
const PAGE_MARGIN = 120;

async function seed() {
  const books = await prisma.classicBook.findMany({
    where: { status: "PUBLISHED" },
    include: { chapters: { orderBy: { sortOrder: "asc" }, take: 50 } },
    take: 5,
  });

  console.log(`Processing ${books.length} books...\n`);

  for (const book of books) {
    console.log(`Book: ${book.title} (${book.chapters.length} chapters)`);
    let pageNumber = 1;
    let totalImages = 0;
    let totalOcr = 0;

    for (const chapter of book.chapters) {
      if (!chapter.content) continue;
      const text = chapter.content.replace(/\s/g, "");
      const pagesNeeded = Math.ceil(text.length / CHARS_PER_PAGE);

      for (let p = 0; p < pagesNeeded; p++) {
        const pageStart = p * CHARS_PER_PAGE;
        const pageEnd = Math.min(pageStart + CHARS_PER_PAGE, text.length);
        const pageContent = text.slice(pageStart, pageEnd);

        const image = await prisma.classicImage.upsert({
          where: { bookId_pageNumber: { bookId: book.id, pageNumber } },
          create: {
            bookId: book.id,
            pageNumber,
            label: chapter.title ? chapter.title + " p." + (p + 1) : "p." + pageNumber,
            width: 2400,
            height: 3200,
            source: "seed-generated",
          },
          update: { label: chapter.title ? chapter.title + " p." + (p + 1) : "p." + pageNumber },
        });

        // Clear old OCR data
        await prisma.classicOcrText.deleteMany({ where: { imageId: image.id } });

        const ocrData = [];
        let globalIdx = 0;
        for (let col = 0; col < COLS_PER_PAGE && globalIdx < pageContent.length; col++) {
          const lineLen = Math.min(CHARS_PER_LINE, pageContent.length - globalIdx);
          const x = 2400 - PAGE_MARGIN - (col + 1) * LINE_WIDTH;

          for (let ci = 0; ci < lineLen; ci++) {
            ocrData.push({
              imageId: image.id,
              content: pageContent[globalIdx + ci],
              x, y: PAGE_MARGIN + ci * CHAR_HEIGHT,
              w: LINE_WIDTH, h: CHAR_HEIGHT,
              pageNumber, lineNumber: col + 1, charIndex: ci + 1,
              confidence: 0.95,
            });
          }
          globalIdx += lineLen;
        }

        // Batch insert 100 at a time
        for (let i = 0; i < ocrData.length; i += 100) {
          await prisma.classicOcrText.createMany({
            data: ocrData.slice(i, i + 100),
          });
        }

        totalOcr += ocrData.length;
        totalImages++;
        pageNumber++;
      }
    }

    console.log(`  -> ${totalImages} pages, ${totalOcr} OCR entries`);
  }

  // Stats
  const imageCount = await prisma.classicImage.count();
  const ocrCount = await prisma.classicOcrText.count();
  console.log(`\nDone! Total: ${imageCount} images, ${ocrCount} OCR entries`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
