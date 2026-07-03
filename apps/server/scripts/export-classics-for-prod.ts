/**
 * 生产空壳经典修复·导出端（D1-P0 第二步）2026-07-03
 * 从本地库为生产空壳书导出同名最佳完整版（书元数据+全部章节）。
 * 判定：本地最佳版总字数 > 生产版 5 倍且 >5000 字才导出（心经等本就短的完整经文不动）。
 * 用法：npx tsx scripts/export-classics-for-prod.ts '<生产书目JSON路径>'
 *   生产书目 JSON 格式：[{ title, len }]（由生产端查询导出）
 * 输出：scripts/classics-prod-payload.json（title→{meta, chapters[]}）
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

/** 生产简体书名 → 本地繁体书名（kanripo 完整版按繁体存库） */
const TRADITIONAL_ALIAS: Record<string, string[]> = {
  论语: ["論語"], 资治通鉴: ["資治通鑑"], 史记: ["史記"], 礼记: ["禮記"],
  尚书: ["尚書"], 楚辞: ["楚辭"], 春秋左传: ["春秋左傳"], 文心雕龙: ["文心雕龍"],
  庄子: ["莊子"], 韩非子: ["韓非子"], 荀子: ["荀子"], 列子: ["列子"],
  诗经: ["詩經", "毛詩注疏"], 周易: ["周易註疏"], 孟子: ["孟子注疏"],
  // 道德经：本地仅《老子校释》（朱谦之现代整理本·点校著作权红线）与道藏注疏本，均不宜顶名，留待 P1 补公版白文
};

/** 爬虫导航垃圾内容检测（殆知阁目录页误存为正文） */
function isJunk(content: string): boolean {
  return content.startsWith("殆知阁") && content.includes("中国古典文献");
}

async function main() {
  const prodListFile = process.argv[2];
  if (!prodListFile) throw new Error("用法：npx tsx scripts/export-classics-for-prod.ts <生产书目JSON>");
  const prodBooks: Array<{ title: string; len: number }> = JSON.parse(fs.readFileSync(prodListFile, "utf-8"));

  const payload: Record<string, unknown> = {};
  let exported = 0;

  for (const pb of prodBooks) {
    // 本地同名最佳版（总字数最大；简体优先，找不到再按繁体别名）
    const titles = [pb.title, ...(TRADITIONAL_ALIAS[pb.title] ?? [])];
    const candidates = await prisma.$queryRaw<Array<{ id: string; total_len: bigint }>>`
      SELECT b.id, coalesce(sum(length(c.content)),0) AS total_len
      FROM "ClassicBook" b LEFT JOIN "ClassicChapter" c ON c."bookId"=b.id
      WHERE b.title = ANY(${titles})
      GROUP BY b.id ORDER BY total_len DESC LIMIT 1`;
    if (!candidates.length) { console.log(`跳过（本地无同名）: ${pb.title}`); continue; }
    const best = candidates[0];
    const bestLen = Number(best.total_len);
    if (bestLen <= pb.len * 5 || bestLen < 5000) {
      console.log(`跳过（本地版无明显优势）: ${pb.title} 本地=${bestLen} 生产=${pb.len}`);
      continue;
    }
    const book = await prisma.classicBook.findUnique({
      where: { id: best.id },
      select: { author: true, dynasty: true, category: true, intro: true, source: true },
    });
    const chaptersRaw = await prisma.classicChapter.findMany({
      where: { bookId: best.id },
      select: { title: true, content: true, translation: true, annotation: true, tags: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
    const chapters = chaptersRaw.filter((c) => !isJunk(c.content));
    if (!chapters.length || chapters.reduce((s, c) => s + c.content.length, 0) < 5000) {
      console.log(`跳过（过滤垃圾章后无有效内容）: ${pb.title}`);
      continue;
    }
    payload[pb.title] = { meta: book, chapterCount: chapters.length, totalLen: bestLen, chapters };
    exported++;
    console.log(`导出: ${pb.title} ${chapters.length}章 ${bestLen}字`);
  }

  const out = path.join(__dirname, "classics-prod-payload.json");
  fs.writeFileSync(out, JSON.stringify(payload));
  const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  console.log(`✅ 导出 ${exported} 部 → ${out}（${mb} MB）`);
}

main().finally(() => prisma.$disconnect());
