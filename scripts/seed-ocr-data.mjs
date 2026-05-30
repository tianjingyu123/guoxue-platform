/**
 * OCR 数据种子脚本
 * 基于已有书籍章节文字生成图像记录和 OCR 坐标数据
 * 模拟古籍竖排排版：10列 × 20行/页，每页约200字
 *
 * 注意：全程用 code point 数组操作，避免 slice 切断代理对
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CHARS_PER_LINE = 20;
const COLS_PER_PAGE = 10;
const CHARS_PER_PAGE = CHARS_PER_LINE * COLS_PER_PAGE;
const LINE_WIDTH = 160;
const CHAR_HEIGHT = 56;
const PAGE_MARGIN = 120;

function safeCodePoint(cp) {
  if (cp >= 0x20 && cp <= 0x7E) return true;       // ASCII 可打印
  if (cp >= 0x3000 && cp <= 0x303F) return true;    // CJK 标点
  if (cp >= 0xFF00 && cp <= 0xFFEF) return true;    // 全角/中文标点
  if (cp >= 0x4E00 && cp <= 0x9FFF) return true;    // CJK 统一汉字
  if (cp >= 0x3400 && cp <= 0x4DBF) return true;    // CJK 扩展 A
  if (cp >= 0x20000 && cp <= 0x2FA1F) return true;  // CJK 扩展 B~I + 兼容补充
  if (cp >= 0xF900 && cp <= 0xFAFF) return true;    // CJK 兼容汉字
  if (cp >= 0x2F00 && cp <= 0x2FDF) return true;    // 康熙部首
  if (cp >= 0x2E80 && cp <= 0x2EFF) return true;    // CJK 部首补充
  return false;
}

// 返回 code point 数组（正确处理代理对）
function toChars(str) {
  const chars = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    // 跳过控制字符和空白
    if (ch === "\n" || ch === "\r" || ch === "\t" || ch === "\v" || ch === "\f") continue;
    if (ch === "\\") continue;
    if (cp === 0x0A || cp === 0x0D || cp === 0x09) continue;
    if (cp < 0x20) continue;
    if (cp >= 0x7F && cp <= 0x9F) continue;
    if (cp >= 0xD800 && cp <= 0xDFFF) continue; // 未配对的代理（安全网）
    if (safeCodePoint(cp)) chars.push(ch);
  }
  return chars;
}

async function main() {
  const books = await prisma.classicBook.findMany({
    where: { status: "PUBLISHED" },
    include: { chapters: { orderBy: { sortOrder: "asc" }, take: 50 } },
    take: 5,
  });

  console.log(`找到 ${books.length} 部书籍\n`);

  for (const book of books) {
    console.log(`📖 ${book.title} (${book.chapters.length} 章)`);

    let pageNumber = 1;
    let totalImages = 0;
    let totalOcr = 0;

    for (const chapter of book.chapters) {
      if (!chapter.content) continue;
      const chars = toChars(chapter.content);
      if (chars.length === 0) continue;
      const pagesNeeded = Math.ceil(chars.length / CHARS_PER_PAGE);

      for (let p = 0; p < pagesNeeded; p++) {
        const pageStart = p * CHARS_PER_PAGE;
        const pageEnd = Math.min(pageStart + CHARS_PER_PAGE, chars.length);
        const pageChars = chars.slice(pageStart, pageEnd);

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

        // 删除旧 OCR 数据
        await prisma.classicOcrText.deleteMany({
          where: { imageId: image.id },
        });

        // 构建 OCR 坐标（竖排：10列从右到左，每列20字从上到下）
        const ocrLines = [];
        let idx = 0;
        for (let col = 0; col < COLS_PER_PAGE && idx < pageChars.length; col++) {
          const lineLen = Math.min(CHARS_PER_LINE, pageChars.length - idx);
          const x = 2400 - PAGE_MARGIN - (col + 1) * LINE_WIDTH;

          for (let ci = 0; ci < lineLen; ci++) {
            ocrLines.push({
              imageId: image.id,
              content: pageChars[idx + ci],
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
          idx += lineLen;
        }

        // 逐个插入
        for (const t of ocrLines) {
          await prisma.classicOcrText.create({ data: t });
        }

        totalOcr += ocrLines.length;
        totalImages++;
        pageNumber++;
      }
    }

    console.log(`  → ${totalImages} 页图像, ${totalOcr} 条OCR坐标`);
  }

  const imageCount = await prisma.classicImage.count();
  const ocrCount = await prisma.classicOcrText.count();
  console.log(`\n✅ 完成！共 ${imageCount} 张图像，${ocrCount} 条OCR坐标`);
}

main()
  .catch((e) => {
    console.error("种子失败:", (e && e.message) || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
