/**
 * 生产空壳经典修复·导入端（D1-P0 第二步）2026-07-03
 * 1. 按 title 匹配生产书，原地替换章节（保留书 id/作者/简介等精修元数据，更新 source 标注底本）
 * 2. 替换不了的空壳书（全书 <500 字且无完整版可换）按用户拍板直接删除，并从书单 bookIds 移除死引用
 * 用法（服务器）：DATABASE_URL=<真库> tsx scripts/import-classics-prod.ts scripts/classics-prod-payload.json [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

interface PayloadChapter {
  title: string; content: string; translation: string | null; annotation: string | null;
  tags: unknown; sortOrder: number;
}
interface PayloadBook {
  meta: { author: string | null; dynasty: string | null; category: string; intro: string | null; source: string | null };
  chapterCount: number; totalLen: number; chapters: PayloadChapter[];
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("用法：tsx scripts/import-classics-prod.ts <payload.json> [--dry-run]");
  const payload: Record<string, PayloadBook> = JSON.parse(fs.readFileSync(file, "utf-8"));

  // ── 1. 替换 ──
  let replaced = 0;
  for (const [title, pb] of Object.entries(payload)) {
    const book = await prisma.classicBook.findFirst({ where: { title }, select: { id: true } });
    if (!book) { console.log(`跳过（生产无此书）: ${title}`); continue; }
    console.log(`替换: ${title} → ${pb.chapters.length}章 ${pb.totalLen}字${DRY_RUN ? "（dry-run）" : ""}`);
    if (DRY_RUN) continue;
    await prisma.$transaction(
      async (tx) => {
        await tx.classicChapter.deleteMany({ where: { bookId: book.id } });
        // createMany 分批防单语句过大
        const rows = pb.chapters.map((c) => ({
          bookId: book.id, title: c.title, content: c.content,
          translation: c.translation, annotation: c.annotation,
          tags: (c.tags as never) ?? undefined, sortOrder: c.sortOrder,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          await tx.classicChapter.createMany({ data: rows.slice(i, i + 100) });
        }
        await tx.classicBook.update({
          where: { id: book.id },
          data: { chapterCount: pb.chapters.length, source: pb.meta.source || undefined, status: "PUBLISHED" },
        });
      },
      { timeout: 300_000 },
    );
    replaced++;
  }

  // ── 2. 删除无法修复的空壳（<500 字且不在替换清单）──
  const hollow = await prisma.$queryRaw<Array<{ id: string; title: string; len: bigint }>>`
    SELECT b.id, b.title, coalesce(sum(length(c.content)),0) AS len
    FROM "ClassicBook" b LEFT JOIN "ClassicChapter" c ON c."bookId"=b.id
    GROUP BY b.id, b.title HAVING coalesce(sum(length(c.content)),0) < 500`;
  const doomed = hollow.filter((h) => !payload[h.title]);
  console.log(`待删空壳（无完整版可换）: ${doomed.map((d) => `${d.title}(${d.len})`).join("、") || "无"}`);
  if (!DRY_RUN && doomed.length) {
    const ids = doomed.map((d) => d.id);
    await prisma.classicFavorite.deleteMany({ where: { bookId: { in: ids } } });
    await prisma.classicBook.deleteMany({ where: { id: { in: ids } } });
    // 书单移除死引用
    const lists = await prisma.classicBookList.findMany({ select: { id: true, bookIds: true } });
    for (const l of lists) {
      const cur = (l.bookIds as unknown as string[]) ?? [];
      const next = cur.filter((id) => !ids.includes(id));
      if (next.length !== cur.length) {
        await prisma.classicBookList.update({ where: { id: l.id }, data: { bookIds: next } });
        console.log(`书单 ${l.id} 移除死引用 ${cur.length - next.length} 条`);
      }
    }
  }

  const books = await prisma.classicBook.count();
  console.log(`✅ 替换 ${replaced} 部，删除空壳 ${DRY_RUN ? 0 : doomed.length} 部，库内剩余 ${books} 部`);
}

main().finally(() => prisma.$disconnect());
