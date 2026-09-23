/**
 * 古籍简体阅读版：真实数据只读预览（S03）
 *
 * 用法：PREVIEW_DATABASE_URL=<只读或本机库> npx ts-node scripts/preview-simplified.ts [章节数上限]
 * 只执行 SELECT，不写库。输出每本书的改字比例、保留待复核的字、等长是否全部成立与样例。
 */
import { PrismaClient } from "@prisma/client";
import { toSimplified } from "../src/modules/classic/simplified/simplified-converter";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../src/modules/classic/classic-publication-policy";

async function main() {
  const url = process.env.PREVIEW_DATABASE_URL;
  if (!url) throw new Error("需要 PREVIEW_DATABASE_URL");
  const limit = Number(process.argv[2] || 60);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    // 旧版本机库没有版权表时，用 PREVIEW_LEGACY_DB=1 只按「已发布」取样（仅验证转换器，不代表公开口径）
    const legacy = process.env.PREVIEW_LEGACY_DB === "1";
    const chapters = await prisma.classicChapter.findMany({
      where: legacy ? { book: { status: "PUBLISHED" } } : { deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE },
      select: { id: true, title: true, content: true, book: { select: { title: true } } },
      orderBy: { id: "asc" },
      take: limit,
    });
    let chars = 0, changed = 0, notSame = 0;
    const kept = new Map<string, number>();
    const perBook = new Map<string, { chapters: number; chars: number; changed: number }>();
    const samples: string[] = [];
    for (const ch of chapters) {
      const text = ch.content || "";
      const r = toSimplified(text);
      if (!r.sameLength) notSame++;
      chars += text.length;
      changed += r.changedCount;
      for (const k of r.keptAmbiguous) kept.set(k.char, (kept.get(k.char) || 0) + 1);
      const b = perBook.get(ch.book.title) || { chapters: 0, chars: 0, changed: 0 };
      b.chapters++; b.chars += text.length; b.changed += r.changedCount;
      perBook.set(ch.book.title, b);
      if (samples.length < 6 && r.changedCount > 0) {
        const i = Math.max(0, text.search(/[^\x00-\x7F]/));
        samples.push(`《${ch.book.title}·${ch.title}》\n  原：${text.slice(i, i + 40)}\n  简：${r.text.slice(i, i + 40)}`);
      }
    }
    console.log(JSON.stringify({
      sampling: legacy ? "legacy-db: status=PUBLISHED only" : "public classics policy",
      chapters: chapters.length,
      totalChars: chars,
      changedChars: changed,
      changedRatio: chars ? +(changed / chars).toFixed(4) : 0,
      notSameLength: notSame,
      keptAmbiguous: Object.fromEntries(kept),
      books: Object.fromEntries(perBook),
    }, null, 2));
    console.log("\n样例：\n" + samples.join("\n"));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
