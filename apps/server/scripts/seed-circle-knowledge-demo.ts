/* eslint-disable no-console */
/**
 * 圈主助理知识库 演示数据注入（幂等）
 * 给「国学入门」圈子注入若干真实国学知识条目（已入库）+ 候选（待审核），
 * 让知识库页与圈主助理 RAG 有真实可见内容。内容均为真实国学常识。
 *
 * 用法: cd apps/server && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-circle-knowledge-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const CIRCLE_NAME = "国学入门";

// 已入库知识（真实国学常识）
const KNOWLEDGE: { sourceType: string; content: string; quality: number }[] = [
  { sourceType: "manual", quality: 0.95, content: "天干地支：十天干为甲、乙、丙、丁、戊、己、庚、辛、壬、癸；十二地支为子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。天干配五行：甲乙木、丙丁火、戊己土、庚辛金、壬癸水。" },
  { sourceType: "manual", quality: 0.93, content: "五行相生：木生火、火生土、土生金、金生水、水生木，循环相生。五行相克：木克土、土克水、水克火、火克金、金克木。生克制化是命理与风水的基础理论。" },
  { sourceType: "free_text", quality: 0.9, content: "《论语·学而》：子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？此为《论语》开篇，讲为学、交友、修养三重境界。" },
  { sourceType: "free_text", quality: 0.92, content: "《道德经》第一章：道可道，非常道；名可名，非常名。无名天地之始，有名万物之母。老子以此揭示道之不可言说与万物本源。" },
  { sourceType: "manual", quality: 0.88, content: "二十四节气：立春、雨水、惊蛰、春分、清明、谷雨、立夏、小满、芒种、夏至、小暑、大暑、立秋、处暑、白露、秋分、寒露、霜降、立冬、小雪、大雪、冬至、小寒、大寒。反映太阳周年视运动，指导农事。" },
  { sourceType: "post", quality: 0.85, content: "紫微斗数命盘十二宫：命宫、兄弟宫、夫妻宫、子女宫、财帛宫、疾厄宫、迁移宫、奴仆宫、官禄宫、田宅宫、福德宫、父母宫。各宫主管人生不同领域。" },
];

// 候选知识（待圈主审核）
const CANDIDATES: { sourceType: string; content: string; similarity: number }[] = [
  { sourceType: "post", similarity: 0.32, content: "六爻起卦：以三枚铜钱摇卦六次，自下而上排成六爻，再装天干地支、配六亲、定世应、取用神，综合断吉凶。为民间常用的预测方法之一。" },
  { sourceType: "article", similarity: 0.41, content: "风水中的「藏风聚气」：理想格局讲究背有靠山、前有明堂、左右砂手环抱，使气流回旋聚而不散，是阳宅选址的核心原则。" },
];

async function main() {
  console.log("=== 圈主助理知识库演示数据注入 ===\n");
  const circle = await prisma.circle.findFirst({ where: { name: CIRCLE_NAME }, select: { id: true, ownerId: true } });
  if (!circle) { console.error(`未找到圈子「${CIRCLE_NAME}」`); return; }
  console.log(`目标圈子: ${CIRCLE_NAME} (${circle.id})`);

  let kn = 0;
  for (const k of KNOWLEDGE) {
    const contentHash = createHash("md5").update(k.content).digest("hex");
    const exists = await prisma.circleKnowledge.findUnique({ where: { contentHash_circleId: { contentHash, circleId: circle.id } } });
    if (exists) continue;
    await prisma.circleKnowledge.create({
      data: {
        circleId: circle.id, sourceType: k.sourceType, content: k.content, contentHash,
        status: "active", addedBy: circle.ownerId ?? "SYSTEM", scope: "circle", qualityScore: k.quality,
      },
    });
    kn++;
  }
  console.log(`已入库知识: 新增 ${kn} 条`);

  let cn = 0;
  for (const c of CANDIDATES) {
    const contentHash = createHash("md5").update(c.content).digest("hex");
    const exists = await prisma.circleKnowledgeCandidate.findFirst({ where: { contentHash, circleId: circle.id } });
    if (exists) continue;
    await prisma.circleKnowledgeCandidate.create({
      data: {
        circleId: circle.id, sourceType: c.sourceType, content: c.content, contentHash,
        similarityScore: c.similarity, status: "pending",
      },
    });
    cn++;
  }
  console.log(`候选知识: 新增 ${cn} 条`);
  console.log("\n完成。");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
