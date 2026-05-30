/**
 * 精准清理 V2：分批扫描章节找日文 → 仅删Kanripo来源
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const KANA = /[぀-ゟ゠-ヿ]/g;

async function main() {
  console.log("=== 清理 Kanripo 日文古籍 V2 ===\n");

  // 1. 分批扫描所有章节，收集含日文的 bookId 及其 kana 总数
  const bookKana = {}; // bookId -> totalKana
  let offset = 0;
  let scanned = 0;

  while (true) {
    const chapters = await prisma.classicChapter.findMany({
      select: { bookId: true, content: true },
      skip: offset,
      take: 20000,
    });
    if (chapters.length === 0) break;

    for (const ch of chapters) {
      const matches = (ch.content || "").match(KANA);
      if (matches && matches.length > 0) {
        bookKana[ch.bookId] = (bookKana[ch.bookId] || 0) + matches.length;
      }
    }
    offset += 20000;
    scanned += chapters.length;
    if (scanned % 100000 === 0) console.log("  扫描: " + scanned + " 章节...");
  }

  console.log("扫描完成: " + scanned + " 章节");
  console.log("含日文的书目 (所有来源): " + Object.keys(bookKana).length);

  // 2. 获取这些书的信息，过滤 Kanripo 来源
  const allIds = Object.keys(bookKana);
  const books = await prisma.classicBook.findMany({
    where: { id: { in: allIds } },
    select: { id: true, title: true, source: true, category: true },
  });

  const kanripoTainted = [];
  const nonKanripo = [];
  for (const b of books) {
    const entry = { ...b, kanaCount: bookKana[b.id] };
    if ((b.source || "").startsWith("github.com/kanripo")) {
      kanripoTainted.push(entry);
    } else {
      nonKanripo.push(entry);
    }
  }

  kanripoTainted.sort((a, b) => b.kanaCount - a.kanaCount);

  console.log("\nKanripo 含日文: " + kanripoTainted.length + " 部");
  console.log("其他来源含日文 (保留): " + nonKanripo.length + " 部");

  if (kanripoTainted.length === 0) {
    console.log("\n无需清理！");
    await prisma.$disconnect();
    return;
  }

  console.log("\n待删除 (Kanripo):");
  for (const b of kanripoTainted) {
    console.log("  [" + b.category + "] " + b.title + " - " + b.kanaCount + " 假名");
  }

  // 3. 删除
  const ids = kanripoTainted.map((b) => b.id);
  console.log("\n共 " + ids.length + " 部 Kanripo 日文书将被删除。");

  const delChapters = await prisma.classicChapter.deleteMany({
    where: { bookId: { in: ids } },
  });
  console.log("删除章节: " + delChapters.count);

  const delBooks = await prisma.classicBook.deleteMany({
    where: { id: { in: ids } },
  });
  console.log("删除书目: " + delBooks.count);

  // 4. 对其他来源的"日文"书进行说明
  console.log("\n--- 保留的其他来源 (OCR错误，非真日文) ---");
  nonKanripo.sort((a, b) => b.kanaCount - a.kanaCount);
  for (const b of nonKanripo.slice(0, 10)) {
    const src = (b.source || "").substring(0, 40);
    console.log("  " + b.title + " - " + b.kanaCount + " 假名 | " + src);
  }
  if (nonKanripo.length > 10)
    console.log("  ... (共" + nonKanripo.length + "部，均为OCR错误，已保留)");

  const remaining = await prisma.classicBook.count();
  console.log("\n清理后总书目: " + remaining);
  console.log("✅ 完成");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("失败:", e);
  await prisma.$disconnect();
  process.exit(1);
});
