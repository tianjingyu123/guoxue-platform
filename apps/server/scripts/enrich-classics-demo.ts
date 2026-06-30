/**
 * 古籍馆·数据增强（幂等，可重复运行，可随时清理）
 *
 * 目的：里程碑5 只给「经/子」两部注入了 viewCount，导致首页排行/精选/今日导读
 *       翻来覆去只有论语/庄子/三字经几本，史/集/释/道/道藏/命/医 全 0 排不上榜。
 *       本脚本给跨「经史子集释道命医」八部的代表名著注入合理热度 + 精致导读文案，
 *       让排行/分类/搜索/详情真实丰满，达到顶级产品观感。
 *
 * 策略：每个书名可能有多版本（论语 11 版、庄子 12 版），热度与文案落到
 *       **章节数最多的版本**（内容最全），dedupeByTitle 会优先保留它 → 用户读到最全文本。
 *
 * 运行：cd apps/server && npx tsx scripts/enrich-classics-demo.ts
 * 清理：viewCount 本身即运营热度数据，无副作用；intro/author/dynasty 为史实补全。
 *       如需回退，可将下列书目 viewCount 归零。
 */
import { PrismaClient } from "@prisma/client";

// 保证脱离 nest 运行时也能连库（根 .env 的 DATABASE_URL）
process.env.DATABASE_URL ||= "postgresql://guoxue:guoxue123@localhost:5433/guoxue";

const prisma = new PrismaClient();

type Enrich = { title: string; view: number; author?: string; dynasty?: string; intro?: string };

// 八部代表名著：view=展示热度，intro=精撰导读（仅核心书给，其余沿用库内简介）
const BOOKS: Enrich[] = [
  // ── 经部 ──
  { title: "论语", view: 162000, author: "孔子及其弟子", dynasty: "春秋", intro: "儒家第一经典，孔门师徒的言行录。“学而时习之”“己所不欲，勿施于人”，二十篇语录两千年来塑造了中国人的伦理底色与处世之道。" },
  { title: "周易", view: 155000, author: "伏羲·周文王·孔子", dynasty: "先秦", intro: "群经之首，大道之源。六十四卦推演天地万物的变化之理，既是占筮之书，更是一部洞察宇宙与人生的哲学经典。" },
  { title: "道德经", view: 152000, author: "老子", dynasty: "春秋", intro: "道家开山之作，五千言道尽天地至理。“道可道，非常道”“上善若水”，老子启示世人顺应自然、返璞归真的大智慧。" },
  { title: "三字经", view: 118000, author: "王应麟（传）", dynasty: "宋", intro: "中华蒙学第一书，三字一句，朗朗上口。从“人之初，性本善”讲到为学次第，是千百年来孩童识字明理的启蒙经典。" },
  { title: "诗经", view: 109000, author: "佚名（孔子删订）", dynasty: "先秦", intro: "中国最早的诗歌总集，三百零五篇风雅颂。“关关雎鸠”起兴，记下了周人最质朴动人的情感与生活。" },
  { title: "孟子", view: 98000, author: "孟轲", dynasty: "战国", intro: "亚圣孟子的论辩集，雄辩滔滔。“民为贵，社稷次之，君为轻”，性善之论与王道仁政，挺立起儒家的浩然之气。" },
  { title: "大学", view: 76000, author: "曾子（传）", dynasty: "先秦", intro: "儒门入德之门。“格物、致知、诚意、正心、修身、齐家、治国、平天下”，八条目铺就一条从自我到天下的修养之路。" },
  { title: "中庸", view: 72000, author: "子思", dynasty: "战国", intro: "儒家心法之书。“天命之谓性，率性之谓道”，讲求不偏不倚、执两用中的处世智慧与天人合一的境界。" },
  { title: "千字文", view: 67000, author: "周兴嗣", dynasty: "南朝梁", intro: "一千个不重复的汉字，缀成一篇华美韵文。“天地玄黄，宇宙洪荒”，识字与博物兼备的千古奇文。" },
  { title: "弟子规", view: 63000, author: "李毓秀", dynasty: "清", intro: "依《论语》“弟子入则孝”敷演而成的童蒙行为规范，从孝悌谨信到泛爱亲仁，是日常立身的处世手册。" },
  { title: "增广贤文", view: 58000, author: "佚名", dynasty: "明", intro: "民间智慧的格言集萃。“读书须用意，一字值千金”，集世态人情、劝学修身之精警于一编。" },
  { title: "尚书", view: 54000, author: "佚名（孔子编订）", dynasty: "先秦", intro: "上古之书，政事典谟。记录尧舜禹汤文武的训诰誓命，是华夏政治文明最早的源头文献。" },
  { title: "百家姓", view: 52000, author: "佚名", dynasty: "宋", intro: "“赵钱孙李，周吴郑王”，将常见姓氏编成四言韵语，是流传最广的蒙学姓氏读本。" },
  { title: "颜氏家训", view: 44000, author: "颜之推", dynasty: "南北朝", intro: "中国家训之祖。颜之推以一生阅历训诫子孙，论治家、为学、处世，朴实恳切，影响后世千年。" },
  { title: "声律启蒙", view: 41000, author: "车万育", dynasty: "清", intro: "“云对雨，雪对风，晚照对晴空”，按韵编排的对仗启蒙书，诵读之间领略汉语音韵之美。" },
  { title: "幼学琼林", view: 36000, author: "程登吉", dynasty: "明", intro: "“天文地理、人事典故”无所不包的蒙学百科，骈俪成文，旧称“读了《幼学》走天下”。" },

  // ── 史部 ──
  { title: "史记", view: 148000, author: "司马迁", dynasty: "西汉", intro: "“史家之绝唱，无韵之离骚”。司马迁究天人之际、通古今之变，以纪传体写尽三千年人物风云，是中国正史的开山典范。" },
  { title: "资治通鉴", view: 132000, author: "司马光", dynasty: "北宋", intro: "“鉴于往事，资于治道”。司马光编年记叙一千三百年治乱兴衰，为帝王将相提供了一面以史为镜的明鉴。" },
  { title: "三国志", view: 115000, author: "陈寿", dynasty: "西晋", intro: "魏蜀吴三国正史，简而有要、叙事谨严。乱世群雄的真实记载，也是《三国演义》取材的史源。" },
  { title: "汉书", view: 71000, author: "班固", dynasty: "东汉", intro: "中国第一部断代史，体例严整、文辞典雅。继《史记》而专叙西汉一朝，与之并称“史汉”。" },
  { title: "左传", view: 68000, author: "左丘明", dynasty: "先秦", intro: "编年体史学名著，为《春秋》作传。叙事详赡、文采斐然，战争辞令尤为后世散文典范。" },
  { title: "战国策", view: 62000, author: "刘向（辑）", dynasty: "西汉", intro: "纵横捭阖的谋士风云录。苏秦张仪的雄辩、士人策士的机变，写尽战国一代的权谋与风骨。" },
  { title: "贞观政要", view: 39000, author: "吴兢", dynasty: "唐", intro: "贞观之治的治国实录。君臣论道、纳谏任贤，是历代帝王案头的政治教科书。" },
  { title: "梦溪笔谈", view: 33000, author: "沈括", dynasty: "北宋", intro: "中国科学史的里程碑。沈括笔记天文、历法、数学、地质、物理，被誉为“中国科学史上的坐标”。" },
  { title: "水经注", view: 28000, author: "郦道元", dynasty: "北魏", intro: "以水道为纲的地理巨著，更兼山川风物、历史掌故，文笔清丽，是地理与文学的双璧。" },

  // ── 子部 ──
  { title: "孙子兵法", view: 142000, author: "孙武", dynasty: "春秋", intro: "“兵者，国之大事”。十三篇兵学圣典，言谋攻、论虚实、贵知己知彼，智慧早已超越战场，通行于天下。" },
  { title: "庄子", view: 128000, author: "庄周及其后学", dynasty: "战国", intro: "又名《南华经》，道家奇书。逍遥齐物，汪洋恣肆，以寓言说至理，是中国浪漫想象与精神自由的源头。" },
  { title: "山海经", view: 96000, author: "佚名", dynasty: "先秦", intro: "上古奇书，神话之渊薮。山川异兽、奇方异国，光怪陆离的想象保存了华夏最古老的地理与神话记忆。" },
  { title: "老子", view: 91000, author: "老子", dynasty: "春秋", intro: "即《道德经》八十一章之全本，道家思想的源头活水。无为而无不为，柔弱胜刚强，字字玑珠。" },
  { title: "菜根谭", view: 79000, author: "洪应明", dynasty: "明", intro: "“嚼得菜根，百事可做”。融儒释道于一炉的处世格言，于淡泊宁静中见人生真味。" },
  { title: "鬼谷子", view: 76000, author: "鬼谷子（王诩）", dynasty: "战国", intro: "纵横家的谋略秘典。捭阖、反应、揣摩之术，论游说与权变之道，奇诡深邃，自成一家。" },
  { title: "韩非子", view: 58000, author: "韩非", dynasty: "战国", intro: "法家集大成之作。法、术、势三者并举，冷峻犀利地剖析人性与权力，为中央集权奠定理论基石。" },
  { title: "列子", view: 47000, author: "列御寇", dynasty: "战国", intro: "道家寓言名典。“愚公移山”“杞人忧天”“朝三暮四”皆出于此，于奇思妙喻中藏养生达观之道。" },
  { title: "荀子", view: 49000, author: "荀况", dynasty: "战国", intro: "先秦儒学的总结者。主张“性恶”而重礼法、倡“制天命而用之”，思想雄健，自成体系。" },
  { title: "墨子", view: 42000, author: "墨翟", dynasty: "战国", intro: "墨家学派经典。兼爱、非攻、尚贤、尚同，兼论逻辑与科技，是先秦平民思想的高峰。" },
  { title: "天工开物", view: 34000, author: "宋应星", dynasty: "明", intro: "“中国十七世纪的工艺百科全书”。详记农耕、纺织、制盐、采矿、冶金诸般技艺，图文并茂。" },
  { title: "茶经", view: 31000, author: "陆羽", dynasty: "唐", intro: "世界第一部茶学专著。陆羽论茶之源、采、煮、饮，立茶道之规模，被尊为“茶圣”。" },
  { title: "齐民要术", view: 22000, author: "贾思勰", dynasty: "北魏", intro: "中国现存最完整的古代农学巨著。耕作、园艺、畜牧、酿造无所不录，是农耕文明的百科全书。" },
  { title: "梅花易数", view: 67000, author: "邵雍（传）", dynasty: "北宋", intro: "象数易学的代表，以梅花观象起卦闻名。即物寓意、心易相通，是民间预测术数的经典法门。" },
  { title: "紫微斗数", view: 54000, author: "陈抟（传）", dynasty: "宋", intro: "以星曜入十二宫推演命局的术数体系，结构精密、推断细致，与子平八字并称命理两大宗。" },

  // ── 集部 ──
  { title: "唐诗三百首", view: 121000, author: "蘅塘退士（编）", dynasty: "清", intro: "“熟读唐诗三百首，不会作诗也会吟”。精选唐代名家名作，是流传最广的唐诗入门选本。" },
  { title: "宋词三百首", view: 108000, author: "朱孝臧（编）", dynasty: "清", intro: "婉约豪放，尽收一编。从柳永苏轼到李清照辛弃疾，一窥宋代词坛的极致风华。" },
  { title: "楚辞", view: 87000, author: "屈原等", dynasty: "战国", intro: "香草美人，浪漫之源。屈原《离骚》开辟了与《诗经》并峙的南方诗歌传统，忠愤缠绵，千古绝唱。" },
  { title: "文心雕龙", view: 38000, author: "刘勰", dynasty: "南朝梁", intro: "“体大思精”的文学理论巨著。刘勰论文之枢纽、剖情析采，是中国古典文论的最高成就。" },

  // ── 释部 ──
  { title: "金刚经", view: 103000, author: "鸠摩罗什（译）", dynasty: "后秦", intro: "般若智慧的精髓。“一切有为法，如梦幻泡影”，破执去相、明心见性，是流传最广的大乘经典。" },
  { title: "心经", view: 92000, author: "玄奘（译）", dynasty: "唐", intro: "仅二百六十字而摄尽般若大义。“色不异空，空不异色”，言简意赅，是佛门日诵的第一经。" },
  { title: "六祖坛经", view: 71000, author: "慧能", dynasty: "唐", intro: "唯一由中国人所说而称“经”的佛典。六祖慧能直指人心、顿悟成佛，奠定了禅宗的根本旗帜。" },

  // ── 道部 ──
  { title: "抱朴子", view: 44000, author: "葛洪", dynasty: "东晋", intro: "道教理论与方术的集成。内篇论神仙金丹、养生延年，外篇议人间得失，是研究早期道教的渊薮。" },
  { title: "周易参同契", view: 29000, author: "魏伯阳", dynasty: "东汉", intro: "“万古丹经王”。借《周易》爻象阐丹道修炼之理，是道教内外丹学的开山经典。" },
  { title: "太上感应篇", view: 33000, author: "佚名", dynasty: "宋", intro: "“祸福无门，惟人自召”。道教劝善第一书，以善恶报应训诫世人存心向善。" },

  // ── 命部（术数·命理） ──
  { title: "滴天髓", view: 88000, author: "京图（撰）·刘基（注）·任铁樵（疏）", dynasty: "明清", intro: "子平命理的巅峰之作。以天道阐人命，论气势格局精微透辟，为历代命家奉为圭臬。" },
  { title: "渊海子平", view: 73000, author: "徐升（徐子平）", dynasty: "宋", intro: "八字命理的奠基之书。系统确立了以日干为主、四柱推命的格局体系，子平之学由此得名。" },
  { title: "三命通会", view: 69000, author: "万民英", dynasty: "明", intro: "命理学的集大成百科。万民英汇纳历代命法、神煞、格局于一编，包罗宏富，考据精详。" },
  { title: "子平真诠", view: 61000, author: "沈孝瞻", dynasty: "清", intro: "格局用神的经典教材。沈孝瞻条分缕析十神格局，说理清晰严密，是学习子平的入门正途。" },
  { title: "袁天罡称骨", view: 51000, author: "袁天罡", dynasty: "唐", intro: "以生辰“称骨”论命的通俗术数，口诀简明、流传极广，是民间最熟知的论命歌诀。" },
  { title: "穷通宝鉴", view: 47000, author: "余春台（整理）", dynasty: "清", intro: "调候用神的实用宝典。以月令寒暖燥湿论五行喜忌，按月详列取用之法，切于实占。" },
  { title: "千里命稿", view: 35000, author: "韦千里", dynasty: "民国", intro: "近代命理名家韦千里的论命实录。说理通俗、案例翔实，是衔接古今命学的桥梁之作。" },
  { title: "神峰通考", view: 29000, author: "张楠（神峰子）", dynasty: "明", intro: "以“动静说”“盖头说”等独到见解辨正命理，张楠论病药扶抑，于子平诸法多有发明。" },
  { title: "李虚中命书", view: 26000, author: "鬼谷子（撰）·李虚中（注）", dynasty: "唐", intro: "现存最早的论命专书之一，以年为主的古法命学渊源，上承禄命、下启子平。" },

  // ── 医部 ──
  { title: "本草纲目", view: 96000, author: "李时珍", dynasty: "明", intro: "“东方药物学巨典”。李时珍历三十年遍考本草，载药一千八百余种，被达尔文誉为“中国古代的百科全书”。" },
  { title: "伤寒论", view: 58000, author: "张仲景", dynasty: "东汉", intro: "中医临床的奠基之作。张仲景立六经辨证、创经方体系，被尊为“众方之祖”，医圣由此得名。" },
  { title: "神农本草经", view: 43000, author: "佚名（托名神农）", dynasty: "汉", intro: "现存最早的中药学专著。分上中下三品载药三百六十五种，奠定了中药理论的基本框架。" },
];

async function main() {
  let updated = 0;
  let skipped = 0;
  for (const b of BOOKS) {
    // 选该书名下章节数最多（内容最全）的版本
    const best = await prisma.classicBook.findFirst({
      where: { title: b.title, status: "PUBLISHED" },
      orderBy: [{ chapterCount: "desc" }, { viewCount: "desc" }],
      select: { id: true, chapterCount: true, author: true, dynasty: true },
    });
    if (!best) {
      skipped++;
      console.log(`  ⊘ 未找到《${b.title}》，跳过`);
      continue;
    }
    const data: Record<string, unknown> = { viewCount: b.view };
    if (b.author) data.author = b.author;
    if (b.dynasty) data.dynasty = b.dynasty;
    if (b.intro) data.intro = b.intro;
    await prisma.classicBook.update({ where: { id: best.id }, data });
    updated++;
    console.log(`  ✓ 《${b.title}》 view=${b.view} chap=${best.chapterCount}`);
  }
  console.log(`\n✅ 古籍热度/文案增强完成：更新 ${updated} 部，跳过 ${skipped} 部`);

  // 概览：各部 top3，确认排行丰富
  const cats = ["经", "史", "子", "集", "释", "道", "命", "医"];
  for (const c of cats) {
    const top = await prisma.classicBook.findMany({
      where: { category: c, status: "PUBLISHED", viewCount: { gt: 0 } },
      orderBy: { viewCount: "desc" }, take: 3,
      select: { title: true, viewCount: true },
    });
    console.log(`  [${c}] ` + top.map((t) => `${t.title}(${t.viewCount})`).join("  "));
  }
}

main()
  .catch((e) => { console.error("❌ 失败:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
