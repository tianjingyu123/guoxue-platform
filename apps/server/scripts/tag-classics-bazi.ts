/**
 * 给古籍馆「命」类书的章节打八字命理标签 —— 八字结果页「古籍参考」靠这些标签检索。
 *
 * 🔴 为什么是规则而不是 AI 打标：
 *    这些标签决定了「用户排出丁火日主的盘，系统推哪一章给他」。标签打歪了，
 *    页面就又变回「假的针对性」——推一段不相干的原文，却让用户以为是为他这盘检索的。
 *    规则可解释、可复算、可抽查；AI 打标不可复算，错了也说不出为什么错。
 *
 * 🔴 两条严格的克制：
 *    1. **天干/地支标签只从章标题抽**。古文正文里「甲」「子」常作序数、纪年用
 *       （「甲第」「子曰」），按正文词频打标必然滥标。章标题「论丁火」才是作者
 *       明确宣告「本章论的就是丁」。
 *    2. **多字词（格局/十神/神煞）才允许从正文抽，且要求出现 ≥2 次**。
 *       一章里顺带提一句「正官」不代表这章论正官。
 *    宁可少打，不可乱打：召回不到只是空态（诚实），召回错了是骗人。
 *
 * 原文一个字都不动，只写 tags 字段。
 *
 * 用法：
 *   npx tsx scripts/tag-classics-bazi.ts          # 预演：打印每章将打的标签，不写库
 *   npx tsx scripts/tag-classics-bazi.ts --apply  # 写入
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
/**
 * 天干 → 五行。**不再用来打标**（见下方「只打天干不打五行」的教训），
 * 只留着让 MANAGED 认得旧版打上的五行标签，重跑时好清掉。
 */
const GAN_WX: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

/** 多字词表：这些词歧义低，允许从正文抽 */
const SHI_SHEN = ["正官", "七杀", "偏官", "正印", "偏印", "枭神", "正财", "偏财", "食神", "伤官", "比肩", "劫财"];
const GE_JU = [
  "正官格", "七杀格", "偏官格", "正财格", "偏财格", "财格", "正印格", "偏印格", "印格",
  "食神格", "伤官格", "建禄格", "羊刃格", "月劫格",
  "从格", "从财格", "从杀格", "从儿格", "从强格", "从弱格", "化气格", "曲直格", "炎上格", "润下格",
];
const SHEN_SHA = [
  "天乙贵人", "太极贵人", "文昌", "词馆", "学堂", "驿马", "桃花", "咸池", "红艳",
  "华盖", "羊刃", "空亡", "孤辰", "寡宿", "金舆", "将星", "天德", "月德",
  "禄神", "劫煞", "亡神", "阴差阳错", "魁罡", "十恶大败",
];
/** 主题词：不指向具体盘面，但能标出这章在谈什么 */
const TOPIC = [
  "用神", "调候", "通关", "病药", "扶抑", "旺衰", "强弱", "格局",
  "大运", "流年", "太岁", "六亲", "女命", "纳音", "藏干", "十二长生", "刑冲",
];

/** 本打标器管辖的全部标签 —— 重跑时先清掉它们，保证幂等（古籍馆原有的分类标签不动） */
const MANAGED = new Set([
  ...GAN, ...ZHI, ...Object.values(GAN_WX), ...SHI_SHEN, ...GE_JU, ...SHEN_SHA, ...TOPIC,
]);

interface Hit { tag: string; why: string }

function tagsOf(title: string, content: string): Hit[] {
  const hits: Hit[] = [];
  const seen = new Set<string>();
  const add = (tag: string, why: string) => {
    if (!seen.has(tag)) { seen.add(tag); hits.push({ tag, why }); }
  };

  // ── 1. 天干/地支：只信标题 ──
  for (const g of GAN) {
    // 「论丁火」「丁火日元」「丁日」「论丁」—— 作者明确宣告本章论的是这个天干
    if (new RegExp(`论${g}|${g}[木火土金水]日|${g}日|${g}[木火土金水]日元|论${g}[木火土金水]`).test(title)) {
      // 🔴 只打天干，不打五行。曾经这里顺手加了 add(GAN_WX[g])，结果
      //    检索侧的「用神五行」信号（庚金日主用神为土）撞上了《论戊土》章的「土」标签，
      //    给庚金的人推了四章论戊己土 —— 章上的「土」是「本章论土日主」，
      //    用神的「土」是「这盘需要土帮扶」，两个土根本不是一回事。
      add(g, `标题「${title.slice(0, 12)}」`);
    }
  }
  for (const z of ZHI) {
    // 「甲日寅月」「生于午月」—— 月令
    if (new RegExp(`${z}月`).test(title)) add(z, `标题含「${z}月」`);
  }

  // ── 2. 多字词：标题命中即打；正文需出现 ≥2 次 ──
  const countIn = (s: string, w: string) => s.split(w).length - 1;
  for (const list of [GE_JU, SHI_SHEN, SHEN_SHA, TOPIC] as const) {
    for (const w of list) {
      if (title.includes(w)) { add(w, `标题含「${w}」`); continue; }
      const n = countIn(content, w);
      if (n >= 2) add(w, `正文出现 ${n} 次`);
    }
  }

  return hits;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const books = await prisma.classicBook.findMany({
    where: { category: "命", deletedAt: null },
    select: { id: true, title: true },
  });

  let total = 0, tagged = 0, empty = 0;
  const tagFreq = new Map<string, number>();

  for (const b of books) {
    const chapters = await prisma.classicChapter.findMany({
      where: { bookId: b.id, deletedAt: null },
      select: { id: true, title: true, content: true, tags: true },
      orderBy: { sortOrder: "asc" },
    });
    console.log(`\n《${b.title}》 ${chapters.length} 章`);

    for (const ch of chapters) {
      total++;
      const hits = tagsOf(ch.title, ch.content);
      if (!hits.length) {
        empty++;
        console.log(`  ○ ${ch.title.replace(/\s+/g, " ").slice(0, 24)} —— 无标签（不参与八字检索）`);
        continue;
      }
      tagged++;
      for (const h of hits) tagFreq.set(h.tag, (tagFreq.get(h.tag) ?? 0) + 1);
      console.log(`  ● ${ch.title.replace(/\s+/g, " ").slice(0, 24)}  →  ${hits.map((h) => h.tag).join(" ")}`);

      if (apply) {
        // 覆盖式：先剔掉本器管辖的旧命理标签（否则改了规则重跑，上一版的错标签会残留），
        // 保留古籍馆自己的分类标签（「五行」「术数」「经」等，不在 MANAGED 词表里）。
        const old = Array.isArray(ch.tags) ? (ch.tags as unknown[]).map(String) : [];
        const kept = old.filter((t) => !MANAGED.has(t));
        const merged = [...new Set([...kept, ...hits.map((h) => h.tag)])];
        await prisma.classicChapter.update({ where: { id: ch.id }, data: { tags: merged } });
      }
    }
  }

  console.log(`\n════ ${books.length} 本 / ${total} 章：打上标签 ${tagged}，无标签 ${empty} ════`);
  const top = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`标签分布（共 ${top.length} 种）：`);
  console.log("  " + top.map(([t, n]) => `${t}:${n}`).join("  "));

  // 关键抽查：十天干每个都得有章可推，否则某些日主的用户永远看不到内容
  const missing = GAN.filter((g) => !tagFreq.has(g));
  console.log(
    missing.length
      ? `\n⚠️ 这些日主没有任何章命中，其用户会看到空态：${missing.join(" ")}`
      : `\n✅ 十天干日主各有章可推`,
  );

  if (!apply) console.log("\n[预演] 未写库。抽查无误后加 --apply。");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
