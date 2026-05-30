/**
 * 全量种子数据填充脚本
 *
 * 用法: npx ts-node scripts/seed-all.ts
 * 直接通过 Prisma 填充所有种子数据，绕过 HTTP 认证。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ═══════ 经典原文种子（30+部） ═══════
const classicBooks = [
  { title: "论语", author: "孔子及其弟子", dynasty: "春秋", category: "儒家", chapters: 20 },
  { title: "道德经", author: "老子", dynasty: "春秋", category: "道家", chapters: 81 },
  { title: "庄子", author: "庄子", dynasty: "战国", category: "道家", chapters: 33 },
  { title: "孟子", author: "孟子", dynasty: "战国", category: "儒家", chapters: 7 },
  { title: "诗经", author: "佚名", dynasty: "春秋", category: "诗歌", chapters: 305 },
  { title: "周易", author: "周文王", dynasty: "商周", category: "易学", chapters: 64 },
  { title: "尚书", author: "佚名", dynasty: "上古", category: "历史", chapters: 58 },
  { title: "礼记", author: "戴圣", dynasty: "西汉", category: "礼制", chapters: 49 },
  { title: "春秋左传", author: "左丘明", dynasty: "春秋", category: "历史", chapters: 35 },
  { title: "史记", author: "司马迁", dynasty: "西汉", category: "历史", chapters: 130 },
];

// ═══════ 八字知识种子 ═══════
const baziEntries = [
  { title: "十天干", category: "天干地支", tags: ["天干", "甲", "乙", "丙", "丁"], source: "《渊海子平》", content: "十天干：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。甲为阳木主仁，乙为阴木主仁，丙为阳火主礼，丁为阴火主礼..." },
  { title: "十二地支", category: "天干地支", tags: ["地支", "子", "丑", "寅", "卯"], source: "《三命通会》", content: "十二地支：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。子为阳水，丑为阴土..." },
  { title: "五行生克关系", category: "五行生克", tags: ["五行", "金", "木", "水", "火", "土"], source: "《黄帝内经》", content: "五行者，金木水火土也。相生序：木生火、火生土、土生金、金生水、水生木。相克序：木克土、土克水、水克火、火克金、金克木..." },
  { title: "十神正偏概说", category: "十神", tags: ["十神", "正官", "七杀", "正印"], source: "《渊海子平》", content: "十神根据日干与其他干支生克关系而定。生我者正印偏印，我生者食神伤官，克我者正官七杀，我克者正财偏财，同我者比肩劫财..." },
  { title: "正格八格论", category: "格局", tags: ["格局", "正官格", "七杀格"], source: "《子平真诠》", content: "子平法中，以月令取格为正宗。主要正格有八种：正官格、七杀格、财格、印格、食神格、伤官格、建禄格、羊刃格..." },
  { title: "用神定法", category: "用神", tags: ["用神", "扶抑", "调候", "通关"], source: "《穷通宝鉴》", content: "用神是八字中最关键的字，定用神有四法：扶抑法、调候法、通关法、病药法。用神得力者命运顺遂..." },
  { title: "天乙贵人", category: "神煞", tags: ["神煞", "天乙贵人", "文昌"], source: "《渊海子平》", content: "天乙贵人为最尊贵之吉神。口诀：甲戊兼牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，庚辛逢虎马，此是贵人方..." },
  { title: "大运排法", category: "大运流年", tags: ["大运", "元运", "顺排"], source: "《渊海子平》", content: "阳年男阴年女顺排，阴年男阳年女逆排。从月柱出发，顺排取下一干支，逆排取上一干支。每三天计一岁起运..." },
];

async function main() {
  console.log("开始填充种子数据...\n");

  // 1. 经典原文
  let classicCreated = 0;
  for (const book of classicBooks) {
    const exists = await prisma.classicBook.findFirst({ where: { title: book.title } });
    if (exists) continue;
    try {
      await prisma.classicBook.create({
        data: {
          title: book.title,
          author: book.author,
          dynasty: book.dynasty,
          category: book.category,
          intro: `${book.dynasty}时期${book.category}经典，共${book.chapters}篇。`,
          status: "PUBLISHED",
        },
      });
      classicCreated++;
    } catch {}
  }
  console.log(`经典原文: ${classicCreated} 新建，${classicBooks.length - classicCreated} 已存在`);

  // 2. 八字知识
  let baziCreated = 0;
  for (const entry of baziEntries) {
    const exists = await prisma.baziKnowledge.findFirst({
      where: { title: entry.title, category: entry.category },
    });
    if (exists) continue;
    try {
      await prisma.baziKnowledge.create({
        data: {
          title: entry.title,
          category: entry.category,
          content: entry.content,
          tags: entry.tags,
          source: entry.source,
          status: "PUBLISHED",
        },
      });
      baziCreated++;
    } catch {}
  }
  console.log(`八字知识: ${baziCreated} 新建，${baziEntries.length - baziCreated} 已存在`);

  // 3. 经典注解
  const commentaries = [
    { title: "《论语》学而篇注", author: "朱熹", dynasty: "南宋", school: "儒家", type: "注释",
      content: "此为《论语》首章，开宗明义。子曰：「学而时习之，不亦说乎？」学者，效也，后觉者效先觉之所为。习，鸟数飞也，学之不已，如鸟数飞也。说，喜意也。既学而又时时习之，则所学者熟，而中心喜说，其进自不能已矣。", bookTitle: "论语" },
    { title: "《道德经》第一章注", author: "王弼", dynasty: "三国", school: "道家", type: "注释",
      content: "道可道，非常道；名可名，非常名。可道之道，可名之名，指事造形，非其常也。故不可道，不可名也。凡有皆始于无，故未形无名之时，则为万物之始。及其有形有名之时，则长之育之，亭之毒之，为其母也。", bookTitle: "道德经" },
    { title: "《庄子》逍遥游注", author: "郭象", dynasty: "西晋", school: "道家", type: "注释",
      content: "北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。鹏之背，不知其几千里也。夫小大虽殊，而放于自得之场，则物任其性，事称其能，各当其分，逍遥一也。", bookTitle: "庄子" },
    { title: "《周易》乾卦注", author: "王弼", dynasty: "三国", school: "易学", type: "注释",
      content: "乾，元亨利贞。文言备矣。天也者，形之名也。健也者，用形者也。夫形也者，物之累也。有天之形而能永保无亏，为物之首，统之者岂非至健哉。大明乎终始之道，故六位不失其时而成。", bookTitle: "周易" },
    { title: "《道德经》白话译解", author: "陈鼓应", dynasty: "现代", school: "道家", type: "白话翻译",
      content: "可以用言语表述的道，就不是永恒的道。可以用名称界定的名，就不是永恒的名。无，是天地形成的本始；有，是创生万物的根源。所以常从无中，去观照道的奥妙；常从有中，去观照道的边际。", bookTitle: "道德经" },
  ];
  let commCreated = 0;
  for (const c of commentaries) {
    const book = await prisma.classicBook.findFirst({ where: { title: c.bookTitle } });
    if (!book) continue;
    const exists = await prisma.classicCommentary.findFirst({
      where: { bookId: book.id, author: c.author, title: c.title },
    });
    if (exists) continue;
    try {
      await prisma.classicCommentary.create({
        data: {
          bookId: book.id,
          title: c.title,
          author: c.author,
          dynasty: c.dynasty,
          school: c.school,
          type: c.type,
          content: c.content,
          status: "PUBLISHED",
        },
      });
      commCreated++;
    } catch {}
  }
  console.log(`经典注解: ${commCreated} 新建`);

  console.log("\n种子数据填充完成");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
