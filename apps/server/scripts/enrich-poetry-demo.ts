/**
 * 诗词雅集·数据注入（幂等，可重复运行）
 *
 * 注入 60 首真实公版经典诗词（逐句拼音/逐句白话译文/人工赏析/AI赏析/注释/作者小传）
 * + 8 个真实题材分类 + 7 个策划诗单。对齐真实 schema：Poetry / PoetryCategory / PoetryCollection。
 * 作者信息内嵌于 Poetry（authorIntro/authorYears/authorTitle），无独立 Poet 表。
 * 诗词数据来自 _poetry_batch1~4.json。
 * 运行：cd apps/server && npx tsx scripts/enrich-poetry-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

process.env.DATABASE_URL ||= "postgresql://guoxue:guoxue123@localhost:5433/guoxue";
const prisma = new PrismaClient();

interface RawPoem {
  title: string; author: string; dynasty: string; form: string;
  content: string; pinyin: string[]; translation: string[];
  tags: string[]; notes: { word: string; note: string }[];
  appreciation: string; aiAppreciation: string;
}

// 作者小传（内嵌进 Poetry：intro/years/title）
const AUTHORS: Record<string, { years: string; title: string; intro: string }> = {
  "李白": { years: "701-762", title: "诗仙", intro: "字太白，号青莲居士，唐代伟大的浪漫主义诗人，被誉为“诗仙”。其诗想象奇绝、豪放飘逸，代表盛唐气象的巅峰。" },
  "杜甫": { years: "712-770", title: "诗圣", intro: "字子美，自号少陵野老，唐代现实主义诗人，被誉为“诗圣”，其诗忧国忧民、沉郁顿挫，被称为“诗史”。" },
  "王维": { years: "701-761", title: "诗佛", intro: "字摩诘，号摩诘居士，盛唐山水田园派代表，诗画兼绝、禅意盎然，有“诗佛”之称。" },
  "白居易": { years: "772-846", title: "诗魔", intro: "字乐天，号香山居士，唐代新乐府运动倡导者，诗风平易通俗、老妪能解，主张“文章合为时而著”。" },
  "李商隐": { years: "约813-858", title: "", intro: "字义山，号玉谿生，晚唐诗人，以“无题”诗及朦胧深婉、用典精工著称，与杜牧并称“小李杜”。" },
  "杜牧": { years: "803-852", title: "", intro: "字牧之，号樊川居士，晚唐诗人，七绝清丽俊爽、咏史以小见大，与李商隐并称“小李杜”。" },
  "王之涣": { years: "688-742", title: "", intro: "盛唐边塞诗人，性豪放，其《凉州词》《登鹳雀楼》气象雄浑，传诵千古。" },
  "王昌龄": { years: "698-757", title: "七绝圣手", intro: "字少伯，盛唐边塞诗人，擅七言绝句，世称“七绝圣手”，有“诗家夫子王江宁”之誉。" },
  "张继": { years: "约715-779", title: "", intro: "字懿孙，唐代诗人，以《枫桥夜泊》一首名垂诗史，使寒山寺因诗而名扬天下。" },
  "孟郊": { years: "751-814", title: "诗囚", intro: "字东野，唐代诗人，诗风苦寒清峭，与贾岛并称“郊寒岛瘦”，《游子吟》传为母爱绝唱。" },
  "陈子昂": { years: "659-700", title: "", intro: "字伯玉，初唐诗文革新先驱，力倡风骨兴寄，《登幽州台歌》苍劲悲凉，开盛唐之先声。" },
  "苏轼": { years: "1037-1101", title: "东坡居士", intro: "字子瞻，号东坡居士，北宋文学巨匠，豪放词派开创者，诗词文书画俱臻绝顶，旷达通透为千古之冠。" },
  "辛弃疾": { years: "1140-1207", title: "词中之龙", intro: "字幼安，号稼轩，南宋豪放派词人，词风沉雄豪迈、悲壮苍凉，人称“词中之龙”。" },
  "李清照": { years: "1084-约1155", title: "千古第一才女", intro: "号易安居士，宋代婉约词宗，被誉为“千古第一才女”，前期清丽、后期沉痛，自成“易安体”。" },
  "柳永": { years: "约984-约1053", title: "", intro: "字耆卿，北宋婉约派词人，慢词长调的开创者，“凡有井水处，皆能歌柳词”。" },
  "秦观": { years: "1049-1100", title: "", intro: "字少游，号淮海居士，北宋婉约词人，“苏门四学士”之一，词风情致缠绵、清丽典雅。" },
  "陆游": { years: "1125-1210", title: "", intro: "字务观，号放翁，南宋爱国诗人，存诗近万首，一生力主抗金，爱国之情至死不渝。" },
  "王安石": { years: "1021-1086", title: "", intro: "字介甫，号半山，北宋政治家、文学家，“唐宋八大家”之一，主持熙宁变法，诗文遒劲峭拔。" },
  "朱熹": { years: "1130-1200", title: "", intro: "字元晦，号晦庵，南宋理学集大成者，其诗多含理趣，于写景咏物中寄寓哲思。" },
  "陶渊明": { years: "约365-427", title: "田园诗派之祖", intro: "字元亮，号五柳先生，东晋诗人，中国田园诗派开创者，不为五斗米折腰，诗风冲淡自然。" },
  "曹操": { years: "155-220", title: "", intro: "字孟德，东汉末政治家、军事家、诗人，建安文学领袖，诗以乐府见长，慷慨悲凉、气韵沉雄。" },
};

// 题材分类（真实·icon/intro/subCategories）
const CATEGORIES: { name: string; icon: string; intro: string; subCategories: string[] }[] = [
  { name: "唐诗经典", icon: "📜", intro: "盛唐气象与晚唐余韵，五七言诗的黄金时代", subCategories: ["五言绝句", "七言绝句", "五言律诗", "七言律诗", "乐府歌行"] },
  { name: "宋词之美", icon: "🪷", intro: "倚声填词，婉约与豪放交相辉映", subCategories: ["小令", "中调", "长调", "婉约", "豪放"] },
  { name: "山水田园", icon: "🏔️", intro: "寄情山水，归隐田园，物我两忘", subCategories: ["山水", "田园", "隐逸", "写景"] },
  { name: "边塞征戍", icon: "🏜️", intro: "大漠孤烟，铁马冰河，家国与苍凉", subCategories: ["边塞", "征戍", "苍凉", "家国"] },
  { name: "咏史怀古", icon: "🏯", intro: "登临凭吊，借古鉴今，兴亡之叹", subCategories: ["咏史", "怀古", "议论", "忧时"] },
  { name: "送别思乡", icon: "🌙", intro: "长亭折柳，明月寄情，离愁与归思", subCategories: ["送别", "思乡", "羁旅", "思亲", "母爱"] },
  { name: "爱情闺怨", icon: "💗", intro: "相思缠绵，闺怨悼亡，至情至性", subCategories: ["爱情", "相思", "闺怨", "悼亡", "婉约"] },
  { name: "咏物言志", icon: "🖌️", intro: "托物寄兴，咏怀言志，理趣盎然", subCategories: ["咏物", "言志", "哲理", "抒怀"] },
];

// 策划诗单（showcase）
const COLLECTIONS: { title: string; author: string; dynasty: string; excerpt: string; category: string; likes: number }[] = [
  { title: "唐诗经典选读", author: "国学编辑部", dynasty: "唐", excerpt: "天生我材必有用，千金散尽还复来。——李白《将进酒》", category: "唐诗经典", likes: 9800 },
  { title: "宋词婉约与豪放", author: "国学编辑部", dynasty: "宋", excerpt: "大江东去，浪淘尽，千古风流人物。——苏轼《念奴娇》", category: "宋词之美", likes: 9200 },
  { title: "山水田园辑", author: "国学编辑部", dynasty: "—", excerpt: "明月松间照，清泉石上流。——王维《山居秋暝》", category: "山水田园", likes: 7600 },
  { title: "边塞征戍辑", author: "国学编辑部", dynasty: "—", excerpt: "但使龙城飞将在，不教胡马度阴山。——王昌龄《出塞》", category: "边塞征戍", likes: 7100 },
  { title: "千古爱情诗词", author: "国学编辑部", dynasty: "—", excerpt: "春蚕到死丝方尽，蜡炬成灰泪始干。——李商隐《无题》", category: "爱情闺怨", likes: 8300 },
  { title: "思乡怀人辑", author: "国学编辑部", dynasty: "—", excerpt: "谁言寸草心，报得三春晖。——孟郊《游子吟》", category: "送别思乡", likes: 8800 },
  { title: "咏物言志哲思", author: "国学编辑部", dynasty: "—", excerpt: "采菊东篱下，悠然见南山。——陶渊明《饮酒》", category: "咏物言志", likes: 6900 },
];

// 推荐到首页 + 每日一首
const RECOMMENDED = new Set(["将进酒", "登高", "春望", "山居秋暝", "送元二使安西", "念奴娇·赤壁怀古", "定风波·莫听穿林打叶声", "雨霖铃·寒蝉凄切", "青玉案·元夕", "锦瑟", "游子吟", "饮酒·其五"]);
const TODAY_TITLE = "将进酒";

function deriveLikes(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return 2000 + (h % 9000);
}

/** 据 tags / form / dynasty 归类到分类 name */
function pickCategory(p: RawPoem): string {
  if ((p.form || "").includes("词")) return "宋词之美";
  for (const c of CATEGORIES) {
    if (c.subCategories.some((s) => p.tags.includes(s))) return c.name;
  }
  if (p.dynasty === "唐") return "唐诗经典";
  return "咏物言志";
}

async function main() {
  // 1) 分类
  const catIdByName = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const row = await prisma.poetryCategory.upsert({
      where: { name: c.name },
      create: { name: c.name, icon: c.icon, intro: c.intro, subCategories: c.subCategories, sortOrder: i },
      update: { icon: c.icon, intro: c.intro, subCategories: c.subCategories, sortOrder: i },
    });
    catIdByName.set(c.name, row.id);
  }
  console.log(`✓ 分类 ${CATEGORIES.length} 个`);

  // 2) 诗词（读 4 批 JSON）
  const all: RawPoem[] = [];
  for (const n of [1, 2, 3, 4]) {
    all.push(...JSON.parse(readFileSync(join(__dirname, `_poetry_batch${n}.json`), "utf-8")));
  }

  // 先清掉旧的 isToday 标记
  await prisma.poetry.updateMany({ where: { isToday: true }, data: { isToday: false } });

  let created = 0, updated = 0;
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    const a = AUTHORS[p.author];
    const likes = deriveLikes(p.title);
    const catName = pickCategory(p);
    const data: Record<string, unknown> = {
      title: p.title, author: p.author, dynasty: p.dynasty, form: p.form,
      content: p.content,
      pinyin: p.pinyin,
      translation: p.translation.join("\n"),
      appreciation: p.appreciation,
      aiAppreciation: p.aiAppreciation,
      notes: p.notes,
      tags: p.tags,
      authorIntro: a?.intro ?? "",
      authorYears: a?.years ?? "",
      authorTitle: a?.title ?? "",
      categoryId: catIdByName.get(catName) ?? null,
      likes,
      collectCount: Math.floor(likes * 0.7),
      viewCount: Math.floor(likes * 1.5),
      isRecommended: RECOMMENDED.has(p.title),
      isToday: p.title === TODAY_TITLE,
      status: "PUBLISHED",
      sortOrder: i,
    };
    const existing = await prisma.poetry.findFirst({ where: { title: p.title, author: p.author } });
    if (existing) {
      await prisma.poetry.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.poetry.create({ data: data as any });
      created++;
    }
  }
  console.log(`✓ 诗词 注入 ${all.length} 首（新建 ${created}·更新 ${updated}）`);

  // 3) 策划诗单
  for (let i = 0; i < COLLECTIONS.length; i++) {
    const c = COLLECTIONS[i];
    const existing = await prisma.poetryCollection.findFirst({ where: { title: c.title } });
    const data = {
      title: c.title, author: c.author, dynasty: c.dynasty, excerpt: c.excerpt,
      category: c.category, likes: c.likes, authorAvatar: "编",
      status: "PUBLISHED", sortOrder: i,
    };
    if (existing) await prisma.poetryCollection.update({ where: { id: existing.id }, data });
    else await prisma.poetryCollection.create({ data });
  }
  console.log(`✓ 策划诗单 ${COLLECTIONS.length} 个`);

  // 统计
  const total = await prisma.poetry.count({ where: { status: "PUBLISHED" } });
  console.log(`\n✅ 诗词雅集数据注入完成（库内已发布诗词共 ${total} 首）`);
}

main()
  .catch((e) => { console.error("❌ 失败:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
