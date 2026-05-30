/**
 * 殆知阁古籍批量导入脚本
 *
 * 用法:
 *   npx ts-node scripts/import-daizhige-seeds.ts           # 导入全部
 *   npx ts-node scripts/import-daizhige-seeds.ts --max 100  # 导入前100部
 *   npx ts-node scripts/import-daizhige-seeds.ts --stats     # 仅统计
 *
 * 数据源: temp_daizhige_all_seeds.json (由 daizhige-scraper.py generate 生成)
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ChapterSeed {
  title: string;
  content: string;
  tags: string[];
}

interface BookSeed {
  title: string;
  author: string;
  dynasty: string;
  category: string;
  intro: string;
  source: string;
  chapters: ChapterSeed[];
}

async function main() {
  const args = process.argv.slice(2);
  const statsOnly = args.includes("--stats");
  const maxIdx = args.indexOf("--max");
  const maxBooks = maxIdx >= 0 ? parseInt(args[maxIdx + 1]) : Infinity;
  const categoryIdx = args.indexOf("--category");
  const categoryFilter = categoryIdx >= 0 ? args[categoryIdx + 1] : undefined;

  const seedFile = path.resolve(__dirname, "../temp_daizhige_all_seeds.json");

  if (!fs.existsSync(seedFile)) {
    console.error(`种子文件不存在: ${seedFile}`);
    console.error("请先运行: py scripts/daizhige-scraper.py generate");
    process.exit(1);
  }

  const seeds: BookSeed[] = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
  console.log(`加载种子: ${seeds.length} 部古籍\n`);

  // 统计
  const catStats: Record<string, number> = {};
  let totalChapters = 0;
  for (const s of seeds) {
    catStats[s.category] = (catStats[s.category] || 0) + 1;
    totalChapters += s.chapters.length;
  }
  console.log("分类统计:");
  for (const [cat, n] of Object.entries(catStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${n} 部`);
  }
  console.log(`  总章节: ${totalChapters}\n`);

  if (statsOnly) {
    await prisma.$disconnect();
    return;
  }

  // 筛选
  let books = seeds;
  if (categoryFilter) {
    books = books.filter((b) => b.category === categoryFilter);
    console.log(`筛选分类: ${categoryFilter} → ${books.length} 部\n`);
  }
  const targetBooks = books.slice(0, maxBooks);
  console.log(`准备导入: ${targetBooks.length} 部\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < targetBooks.length; i++) {
    const seed = targetBooks[i];

    try {
      const existing = await prisma.classicBook.findFirst({
        where: { title: seed.title, category: seed.category },
      });
      if (existing) {
        skipped++;
        if (skipped % 200 === 0) {
          console.log(
            `  [${i + 1}/${targetBooks.length}] 跳过 ${skipped} (已存在)`,
          );
        }
        continue;
      }

      const book = await prisma.classicBook.create({
        data: {
          title: seed.title,
          author: seed.author || null,
          dynasty: seed.dynasty || null,
          category: seed.category,
          intro: seed.intro,
          source: seed.source,
          chapterCount: seed.chapters.length,
          status: "PUBLISHED",
        },
      });

      // Batch insert chapters
      await prisma.classicChapter.createMany({
        data: seed.chapters.map((ch, j) => ({
          bookId: book.id,
          title: ch.title.slice(0, 255),
          content: ch.content,
          tags: ch.tags || [],
          sortOrder: j + 1,
        })),
      });

      created++;

      if (created % 100 === 0) {
        console.log(
          `  [${i + 1}/${targetBooks.length}] 新建 ${created}, 跳过 ${skipped}`,
        );
      }
    } catch (err: any) {
      errors++;
      console.error(`  ✗ ${seed.title}: ${err.message}`);
      if (errors > 20) {
        console.error("错误过多，中止导入");
        break;
      }
    }
  }

  console.log(`\n导入完成: 新建 ${created}, 跳过 ${skipped}, 失败 ${errors}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
