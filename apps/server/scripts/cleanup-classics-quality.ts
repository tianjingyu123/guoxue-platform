/**
 * 古籍质量清洗（D1-P0·用户拍板：宁缺毋滥，劣质版本直接删除不保留）2026-07-02
 *
 * 删除规则（仅限 daizhige/kanripo 来源；自建/NiuTrans/集注等白名单永不删）：
 *  A 空壳书：章数≥3 且 70% 以上章节正文 <100 字（如《红楼梦》有目无文）
 *  B1 多章残书：全书 <2000 字且章数≥3（书体量应更大却只剩零星）
 *  B2 极小残篇：全书 <500 字（无阅读价值；500-2000 字的 1-2 章完整短经保留）
 *  C 重复残缺版：同名书最佳版本 ≥5 万字，本书 <其 10% 且章数 <其 20%
 *
 * 安全机制：删除前导出完整清单 JSON（书目/规则/字数）；ClassicBookList.bookIds 引用的书强制保护；
 * 子表（章节/注解/笔记/导读等）外键 onDelete: Cascade 自动级联；ClassicFavorite 无外键需手动清理。
 *
 * 用法：npx tsx scripts/cleanup-classics-quality.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

interface Doomed {
  id: string;
  title: string;
  source: string | null;
  ch: number;
  totalLen: number;
  rules: string[];
}

async function main() {
  // 规则 D（先于 A-C）：删除殆知阁爬虫导航垃圾章（每书 1 章"浏览传统典籍"目录页，8600 章）
  if (!DRY_RUN) {
    const junk = await prisma.$executeRawUnsafe(
      `DELETE FROM "ClassicChapter" WHERE content LIKE '殆知阁%中国古典文献%' OR content LIKE '%浏览\n传统典籍，\n探索\n中华文化宝库%'`,
    );
    console.log(`规则D：删除爬虫导航垃圾章 ${junk} 条`);
  }

  // 书单引用的书强制保护（bookIds 为 Json 数组无外键）
  const bookLists = await prisma.classicBookList.findMany({ select: { bookIds: true } });
  const protectedIds = new Set<string>();
  for (const bl of bookLists) {
    for (const id of (bl.bookIds as unknown as string[]) ?? []) protectedIds.add(id);
  }

  // 全库聚合较重，事务内放宽语句超时（SET LOCAL 仅本事务生效）
  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '600s'`);
    return tx.$queryRaw<Array<{
      id: string; title: string; source: string | null;
      ch: bigint; short_ch: bigint; total_len: bigint; max_len: bigint; max_ch: bigint;
    }>>`
    WITH per_book AS (
      SELECT b.id, b.title, b.source,
        count(c.id) AS ch,
        count(c.id) FILTER (WHERE length(c.content) < 100) AS short_ch,
        coalesce(sum(length(c.content)), 0) AS total_len
      FROM "ClassicBook" b LEFT JOIN "ClassicChapter" c ON c."bookId" = b.id
      GROUP BY b.id, b.title, b.source
    ),
    tmax AS (SELECT title, max(total_len) AS max_len, max(ch) AS max_ch FROM per_book GROUP BY title)
    SELECT p.id, p.title, p.source, p.ch, p.short_ch, p.total_len, t.max_len, t.max_ch
    FROM per_book p JOIN tmax t ON t.title = p.title
    WHERE (p.source ILIKE '%daizhige%' OR p.source ILIKE '%kanripo%')
  `;
  }, { timeout: 600_000 });

  const doomed: Doomed[] = [];
  for (const r of rows) {
    if (protectedIds.has(r.id)) continue;
    const ch = Number(r.ch), shortCh = Number(r.short_ch), totalLen = Number(r.total_len);
    const maxLen = Number(r.max_len), maxCh = Number(r.max_ch);
    const rules: string[] = [];
    if (ch >= 3 && shortCh / ch >= 0.7) rules.push("A空壳书");
    if (totalLen < 2000 && ch >= 3) rules.push("B1多章残书");
    if (totalLen < 500) rules.push("B2极小残篇"); // 含规则D删净后变 0 章的书
    if (maxLen >= 50_000 && totalLen < maxLen * 0.1 && ch <= maxCh * 0.2) rules.push("C重复残缺版");
    if (rules.length) doomed.push({ id: r.id, title: r.title, source: r.source, ch, totalLen, rules });
  }

  console.log(`命中 ${doomed.length} 部（dry-run=${DRY_RUN}）`);
  const byRule: Record<string, number> = {};
  for (const d of doomed) for (const rule of d.rules) byRule[rule] = (byRule[rule] || 0) + 1;
  console.log("规则分布:", byRule);

  // 删除前导出完整清单（备查记录，数据本体按拍板不保留）
  const outFile = path.join(__dirname, `cleanup-classics-deleted-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ deletedAt: new Date().toISOString(), dryRun: DRY_RUN, count: doomed.length, byRule, books: doomed }, null, 2));
  console.log(`清单已导出: ${outFile}`);

  if (DRY_RUN) return;

  const ids = doomed.map((d) => d.id);
  const BATCH = 200;
  let delBooks = 0, delFavs = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const [favs, books] = await prisma.$transaction([
      prisma.classicFavorite.deleteMany({ where: { bookId: { in: batch } } }), // 无外键，手动清
      prisma.classicBook.deleteMany({ where: { id: { in: batch } } }), // 章节/注解/笔记/导读 Cascade
    ]);
    delFavs += favs.count;
    delBooks += books.count;
    console.log(`进度 ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
  }
  console.log(`✅ 删除完成：书 ${delBooks} 部，孤儿收藏 ${delFavs} 条`);

  const remain = await prisma.classicBook.count();
  console.log(`库内剩余 ${remain} 部`);
}

main().finally(() => prisma.$disconnect());
