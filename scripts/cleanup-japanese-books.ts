/**
 * 清理数据库中含日文假名的古籍
 * 匹配范围: 平假名 (U+3040-309F) + 片假名 (U+30A0-30FF)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 日文假名字符范围 (用字节检测更可靠，但PostgreSQL支持unicode regex)
const KANA_PATTERN = `[\\u3040-\\u309F\\u30A0-\\u30FF]`;

async function main() {
  console.log("=== 古籍日文内容清理 ===\n");

  // 1. 查找所有含日文假名的章节
  const taintedChapters = await prisma.$queryRawUnsafe<
    { id: string; book_id: string; title: string }[]
  >(
    `SELECT c.id, c."bookId" AS book_id, c.title
     FROM "ClassicChapter" c
     WHERE c.content ~ '${KANA_PATTERN}'
        OR c.translation ~ '${KANA_PATTERN}'
        OR c.annotation ~ '${KANA_PATTERN}'`
  );

  // 2. 获取涉及的去重 bookId
  const bookIdSet = new Set<string>();
  for (const ch of taintedChapters) {
    bookIdSet.add(ch.book_id);
  }

  console.log(`含日文假名的章节数: ${taintedChapters.length}`);
  console.log(`涉及书目数: ${bookIdSet.size}\n`);

  if (bookIdSet.size === 0) {
    console.log("未发现含日文的古籍，无需清理。");
    await prisma.$disconnect();
    return;
  }

  // 3. 获取这些书的名称和来源
  const bookIds = Array.from(bookIdSet);
  const books = await prisma.classicBook.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, title: true, source: true, category: true },
  });

  console.log("待删除书目:");
  for (const b of books) {
    const chCount = taintedChapters.filter((c) => c.book_id === b.id).length;
    console.log(`  - [${b.source}] ${b.title} (${b.category}) | ${chCount} 章含日文`);
  }

  // 4. 统计各来源分布
  const sourceCount: Record<string, number> = {};
  for (const b of books) {
    sourceCount[b.source || "null"] = (sourceCount[b.source || "null"] || 0) + 1;
  }
  console.log("\n来源分布:");
  for (const [s, n] of Object.entries(sourceCount)) {
    console.log(`  ${s}: ${n} 部`);
  }

  // 5. 确认删除
  console.log(`\n共 ${books.length} 部书将被删除。`);
  console.log("开始删除...\n");

  // 删除章节 (CASCADE 会处理关联数据)
  const deletedChapters = await prisma.classicChapter.deleteMany({
    where: { bookId: { in: bookIds } },
  });
  console.log(`已删除 ${deletedChapters.count} 个章节`);

  // 删除书目
  const deletedBooks = await prisma.classicBook.deleteMany({
    where: { id: { in: bookIds } },
  });
  console.log(`已删除 ${deletedBooks.count} 部书`);

  console.log("\n✅ 日文古籍清理完成");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("清理失败:", e);
  await prisma.$disconnect();
  process.exit(1);
});
