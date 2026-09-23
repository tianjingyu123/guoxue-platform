import type { ReportKnowledgeSeed } from "./types";

/**
 * 观点对照条目（2026-09-18）
 *
 * 决策人对报告的定位：不是知识条目的罗列，而是「各门派、各典籍对这个盘的观点汇总 + 梳理 + 主线引导」。
 * 用户不必自己去查哪本古籍怎么说、哪派怎么看；但看完也不能觉得各说各话、自相矛盾。
 *
 * 因此每个议题（debateKey）下成组地写：
 *   consensus     各派共识——这一层可以当定论讲
 *   mainstream    主流说法——多数派怎么取
 *   alternative   另一说——有影响力的不同取法，说清它为什么这么看
 *   minority      少数说——存录备考，不作主线
 *   platform_line 本报告主线——我们取哪一说、为什么，以及给学习者的建议
 *
 * 主线不是和稀泥：要明确说「本报告按哪一说来讲」，同时说清另一说在什么情况下更合适，
 * 让用户既知其然，也知其所以然。
 *
 * 同一议题的条目 tags 必须一致（都挂在同一个检索信号上），否则命中时只来一半，对照就残了。
 */

const src = (label: string) => [{ label, note: "平台自行重述，非逐字摘录" }];

type DebateSeed = Omit<ReportKnowledgeSeed, "paipanType" | "sourceKind" | "sourceRefs"> & {
  sourceKind?: ReportKnowledgeSeed["sourceKind"];
  sourceRefs?: ReportKnowledgeSeed["sourceRefs"];
};

const mk = (paipanType: string, label: string) => (x: DebateSeed): ReportKnowledgeSeed => ({
  paipanType,
  sourceKind: "platform_expert",
  sourceRefs: src(label),
  ...x,
});

const bazi = mk("bazi", "《子平真诠》《滴天髓》及盲派口传的公开讲法");
const liuyao = mk("liuyao", "《增删卜易》《卜筮正宗》《黄金策》通行说法");
const ziwei = mk("ziwei", "《紫微斗数全书》通行本与三合、飞星两派公开讲法");
const meihua = mk("meihua", "《梅花易数》通行本基本法则");
const qimen = mk("qimen", "《烟波钓叟歌》《奇门遁甲元灵经》通行说法");
const daliuren = mk("daliuren", "《六壬大全》《六壬指南》通行说法");

/**
 * 当代网络上的通行讲法（决策人 2026-09-18 要求一并参考）。
 *
 * 这类说法影响面最大——多数爱好者最先接触到的就是它——但往往只有结论没有条件，
 * 一句口诀套所有盘。把它单列出来，既让用户看到「网上一般这么说」，
 * 也让他明白那只是一句口诀，本报告的结论才是按盘面逐条推出来的。
 */
const web = (paipanType: string) => (x: DebateSeed): ReportKnowledgeSeed => ({
  paipanType,
  sourceKind: "web",
  sourceRefs: [{ label: "当代网络命理文章与教学视频的通行讲法汇总", note: "平台归纳重述，非摘录某一篇" }],
  ...x,
});
const baziWeb = web("bazi");
const ziweiWeb = web("ziwei");

// ══════════════ 八字 ══════════════

/** 议题一：身弱财旺怎么取用——初学者最容易被各派说法绕晕的地方 */
const KEY_SHEN_RUO_CAI = "bazi:身弱财旺:取用";
const SHEN_RUO_CAI: ReportKnowledgeSeed[] = [
  bazi({
    kind: "school_theory", topic: "身弱财旺如何取用", debateKey: KEY_SHEN_RUO_CAI, stance: "consensus",
    tags: ["正财格", "偏财格", "用神金(生)", "用神木(生)", "用神水(生)", "用神火(生)", "用神土(生)"],
    title: "共识：身弱财旺，财是担不动的负担而非现成的福气",
    content:
      "无论哪一派，都承认「财旺身弱」时财星不能直接当成好事：日主没有力量去驾驭它，财越旺，耗身越重，现实里常表现为忙碌、操心、钱经手得多而留不住。分歧不在这一层，而在「怎么办」——是先把自己补起来，还是顺着财的势去做事。看盘时先把这一层共识认清，再看各派的取舍，就不会觉得各说各话。",
  }),
  bazi({
    kind: "school_theory", school: "ziping", topic: "身弱财旺如何取用", debateKey: KEY_SHEN_RUO_CAI, stance: "mainstream",
    tags: ["正财格", "偏财格", "用神金(生)", "用神木(生)", "用神水(生)", "用神火(生)", "用神土(生)"],
    title: "子平主流：取印比帮身，先立自己再谈求财",
    content:
      "子平法的通行取法是扶抑：身弱则补身，取印星生身、比劫帮身为用神，财星为忌。落到现实，就是先把专业、资历、身体、人脉这些「自己的本钱」做厚，再谈扩张与投资；岁运走印比之地顺，走财地则辛苦。这是流传最广、也最稳妥的一路，初学者先照这条线理解不会出大错。",
  }),
  bazi({
    kind: "school_theory", school: "mangpai", topic: "身弱财旺如何取用", debateKey: KEY_SHEN_RUO_CAI, stance: "alternative",
    tags: ["正财格", "偏财格", "用神金(生)", "用神木(生)", "用神水(生)", "用神火(生)", "用神土(生)"],
    title: "盲派另一说：不问强弱，只问日主与财之间有没有「做功」",
    content:
      "盲派不先分强弱，而看日主与财之间有没有成立的「做功」关系：日主能制财、合财，或财入库而日主能开库，就算把财拿到手；财虽旺而与日主毫无瓜葛，身再强也只是看着。因此同一个身弱财旺的盘，盲派可能断为有财，只是取财的方式辛苦。这一说重在「事怎么成」，与子平重在「力量够不够」，问的其实是两个问题。",
  }),
  baziWeb({
    kind: "knowledge_point", topic: "身弱财旺如何取用", debateKey: KEY_SHEN_RUO_CAI, stance: "mainstream",
    tags: ["正财格", "偏财格", "用神金(生)", "用神木(生)", "用神水(生)", "用神火(生)", "用神土(生)"],
    title: "网上一般这么说：身弱财旺即「财多身弱，富屋贫人」",
    content:
      "网络文章与短视频里最常见的说法是「财多身弱，富屋贫人」——财看着多却享不到，还常被引申成「命里有财但守不住」「要靠贵人才能发」。这句话出自旧籍，方向与子平扶抑一致，可以当口诀记；但它只是一句结论，没说清楚该怎么办，也不区分财旺到什么程度、日主有没有根。照着口诀对号入座，很容易把普通的身弱盘说得过于悲观——这正是本报告要把话讲完整的原因。",
  }),
  bazi({
    kind: "school_theory", topic: "身弱财旺如何取用", debateKey: KEY_SHEN_RUO_CAI, stance: "minority",
    tags: ["正财格", "偏财格", "用神金(生)", "用神木(生)", "用神水(生)", "用神火(生)", "用神土(生)"],
    title: "少数说：身弱至极反从财势，弃命从财",
    content:
      "若日主孤立无根、全局尽是财星，有一路取法是不再扶身而顺从财势，作从财格论，此时行财地反吉、行印比之地反凶。但成立条件极严（日主须真正无根无助），判定稍宽就会把普通的身弱盘误作从格，结论全盘颠倒。存录备考，不轻易取用。",
  }),
  bazi({
    kind: "knowledge_point", topic: "身弱财旺如何取用", debateKey: KEY_SHEN_RUO_CAI, stance: "platform_line",
    tags: ["正财格", "偏财格", "用神金(生)", "用神木(生)", "用神水(生)", "用神火(生)", "用神土(生)"],
    title: "本报告主线：以子平扶抑为主线，盲派做功作为参照",
    content:
      "本报告按子平扶抑法立论：身弱财旺取印比为用，先把自己立住，再谈求财。" +
      "取这条线的理由是它规则清晰、可复核，也最贴合大多数人的实际处境：把专业、资历、身体、人脉这些本钱做厚，比急着扩张更要紧。" +
      "盲派「做功」一说我们一并列出，因为它解释了一类现象——有些身弱的人照样赚得到钱，只是过程费力；两说其实不矛盾，一个回答「力量够不够」，一个回答「事怎么成」，你可以把它当成同一件事的另一个侧面。" +
      "从财格一路条件太严、误判代价太大，本报告不采用，只在少数说里标明有这回事。",
  }),
];

/** 议题二：伤官见官——古书说得最吓人、实际最需要辨明的一条 */
const KEY_SHANG_GUAN = "bazi:伤官见官:吉凶";
const SHANG_GUAN: ReportKnowledgeSeed[] = [
  bazi({
    kind: "school_theory", topic: "伤官见官如何看", debateKey: KEY_SHANG_GUAN, stance: "consensus",
    tags: ["伤官格", "正官格"],
    title: "共识：伤官与正官同现，是一组需要处理的张力",
    content:
      "伤官主才气外露、不受拘束，正官主规矩约束，两者同现在一盘之中，性质相反、彼此克制，这一点各派没有异议。表现出来常是「有本事但不服管」「能做事但容易得罪人」。争的是这组张力算不算祸，以及要不要化解。",
  }),
  bazi({
    kind: "classic_excerpt", topic: "伤官见官如何看", debateKey: KEY_SHANG_GUAN, stance: "mainstream",
    tags: ["伤官格", "正官格"],
    title: "古籍旧说：伤官见官，为祸百端",
    content:
      "旧籍有「伤官见官，为祸百端」的说法，视之为大忌，主口舌、官非、名位受损。这句话流传极广，很多人一见此组合便心生恐惧。读的时候要注意它的语境：古人所论多针对以功名为唯一出路的情形——伤官冲撞官星，等于自断仕途之路。",
    sourceKind: "platform_expert",
  }),
  bazi({
    kind: "school_theory", school: "ziping", topic: "伤官见官如何看", debateKey: KEY_SHANG_GUAN, stance: "alternative",
    tags: ["伤官格", "正官格"],
    title: "子平细分：伤官佩印或伤官生财，则化忌为用",
    content:
      "子平法不把这一组合一概作凶论，而看有没有救应：有印星制伤，叫伤官佩印，才气受约束而成器，多主有学识、有名望；有财星泄伤生官，叫伤官生财，才气转成实际所得，两不冲突。真正难办的是既无印也无财，伤官直冲官星——那才是旧说所指的情形。",
  }),
  bazi({
    kind: "knowledge_point", topic: "伤官见官如何看", debateKey: KEY_SHANG_GUAN, stance: "platform_line",
    tags: ["伤官格", "正官格"],
    title: "本报告主线：按有无救应分情形讲，不搬旧断语吓人",
    content:
      "本报告按子平的细分来讲：先看有没有印或财作救应，有则说明它化解的路径，无则如实说明这组张力会在哪些场合显出来（不受约束、易与上级或规则冲突）。旧籍「为祸百端」一句照录，但会讲清它的语境——那是以科举功名为唯一出路时的判词，今天的职业选择远比那时宽，同样的组合放在创意、技术、自由职业上，反而是长处。我们不用旧断语制造恐惧，也不把它抹去不提：知道古人为什么这么说，才算真懂这一条。",
  }),
];

/** 议题三：真太阳时要不要校正——实务里天天遇到、各家做法不同 */
const KEY_ZHEN_TAI_YANG = "bazi:真太阳时:是否校正";
const ZHEN_TAI_YANG: ReportKnowledgeSeed[] = [
  bazi({
    kind: "school_theory", topic: "真太阳时是否校正", debateKey: KEY_ZHEN_TAI_YANG, stance: "consensus",
    tags: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
    title: "共识：时柱一错，全盘推论跟着错",
    content:
      "时柱决定时干时支、影响格局取用与六亲宫位，出生时间落在两个时辰交界处时，差几分钟就是两个完全不同的盘。各派对此没有异议：拿不准出生时间的，任何结论都要打折扣。分歧在于要不要按经度与均时差把钟表时间换算成当地真太阳时。",
  }),
  bazi({
    kind: "school_theory", topic: "真太阳时是否校正", debateKey: KEY_ZHEN_TAI_YANG, stance: "mainstream",
    tags: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
    title: "主流：按出生地经度与均时差校正为真太阳时",
    content:
      "多数从业者主张校正：干支时辰本来就是按太阳位置划分的，而钟表时间是行政时区的产物，同一时区内东西两端可相差近一小时。不校正，等于用北京的太阳给新疆的人定时辰。",
  }),
  bazi({
    kind: "school_theory", topic: "真太阳时是否校正", debateKey: KEY_ZHEN_TAI_YANG, stance: "alternative",
    tags: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
    title: "另一说：以报出生的钟表时间为准，不作换算",
    content:
      "也有一路主张按当事人报的钟表时间起盘，理由是命理体系是在历代通行历法上验证出来的，换算反而破坏了原有的验证基础；何况出生时间的记录本身往往就有误差，再作精细换算是虚假的精确。",
  }),
  bazi({
    kind: "knowledge_point", topic: "真太阳时是否校正", debateKey: KEY_ZHEN_TAI_YANG, stance: "platform_line",
    tags: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
    title: "本报告主线：校正真太阳时，按校正后的时辰起盘",
    content:
      "本报告采用校正：按出生地经度与均时差把钟表时间换算成真太阳时，再定时柱，校正了多少分钟在「起盘校验」里写明。理由是干支时辰本就按太阳位置划分，而钟表时间是行政时区的产物，同一时区东西两端可差近一小时——不校正等于用别处的太阳给你定时辰。你照着本报告的时柱看即可，不必在两说之间反复权衡。只有一种情况需要多做一步：出生时间距时辰交界不足半小时时，记录本身的误差可能超过校正量，这时把相邻两个时辰都排一遍、对照已发生的经历来定，比纠结算法更管用。",
  }),
];

// ══════════════ 六爻 ══════════════

const KEY_LIUYAO_YONG = "liuyao:用神多现:如何取";
const LIUYAO_YONG: ReportKnowledgeSeed[] = [
  liuyao({
    kind: "school_theory", topic: "用神多现如何取", debateKey: KEY_LIUYAO_YONG, stance: "consensus",
    tags: ["妻财持世", "官鬼持世", "父母持世", "兄弟持世", "子孙持世"],
    title: "共识：用神取错，后面全错",
    content:
      "六爻断卦第一步是取用神，这一步错了，旺衰、动变、应期全都无从谈起。各派在这一点上完全一致。分歧出现在一卦之中同一六亲出现两爻以上时，该取哪一爻。",
  }),
  liuyao({
    kind: "school_theory", topic: "用神多现如何取", debateKey: KEY_LIUYAO_YONG, stance: "mainstream",
    tags: ["妻财持世", "官鬼持世", "父母持世", "兄弟持世", "子孙持世"],
    title: "主流：取发动之爻，无动则取临日月者",
    content:
      "用神两现时，通行的取法是先取发动的那一爻——动则有意，静则无为；若都静，则取得月建日辰生扶的那一爻；再无分别，取临世爻或与世爻有生合关系的那一爻。",
  }),
  liuyao({
    kind: "school_theory", topic: "用神多现如何取", debateKey: KEY_LIUYAO_YONG, stance: "alternative",
    tags: ["妻财持世", "官鬼持世", "父母持世", "兄弟持世", "子孙持世"],
    title: "另一说：按爻位对应人事，取所问之人所居之位",
    content:
      "另一路做法是按爻位分人事：初爻为幼、二爻为宅与妻、三爻为兄弟门户、四爻为外事、五爻为尊长君上、六爻为祖上宗庙。用神两现时取所问之人对应的那一爻，而不看动静。问自家之妻取二爻财，问外面的财取四爻财，取法完全不同。",
  }),
  liuyao({
    kind: "knowledge_point", topic: "用神多现如何取", debateKey: KEY_LIUYAO_YONG, stance: "platform_line",
    tags: ["妻财持世", "官鬼持世", "父母持世", "兄弟持世", "子孙持世"],
    title: "本报告主线：先动静后爻位，两说都摆出来给你复核",
    content:
      "本报告按主流取法立论：先看动静，再看月建日辰，最后看与世爻的关系。同时会把爻位一路的取法标出来——当两种取法指向不同的爻时，这一点必须让你看见，否则你照着报告推下去却与自己的习惯对不上，只会更糊涂。实务建议：所问之事若明确指向某个人（自家的、外面的、长辈的），爻位取法往往更贴切；问事不问人时，动静取法更稳。",
  }),
];

// ══════════════ 紫微 ══════════════

const KEY_ZIWEI_SIHUA = "ziwei:四化:用生年还是用宫干";
const ZIWEI_SIHUA: ReportKnowledgeSeed[] = [
  ziwei({
    kind: "school_theory", topic: "四化怎么用", debateKey: KEY_ZIWEI_SIHUA, stance: "consensus",
    tags: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
    title: "共识：四化是紫微的动力，没有四化的盘只是一张星图",
    content:
      "禄权科忌把静态的星曜配置变成有方向的力量：同样的星盘，四化落在不同宫，际遇完全不同。这一点三合派与飞星派都承认。分歧在于「用哪一套四化」——只看生年四化，还是进一步用宫干飞化。",
  }),
  ziwei({
    kind: "school_theory", school: "sanhe", topic: "四化怎么用", debateKey: KEY_ZIWEI_SIHUA, stance: "mainstream",
    tags: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
    title: "三合派主流：以生年四化为主，重星曜组合与三方四正",
    content:
      "三合派把生年四化看作一生的基调，论断重心放在星曜本身的组合与三方四正的会照上：什么星坐命、成什么格、吉凶星如何配。四化是重要参考，但不是全部。这一路规则相对稳定，入门容易。",
  }),
  ziwei({
    kind: "school_theory", school: "feixing", topic: "四化怎么用", debateKey: KEY_ZIWEI_SIHUA, stance: "alternative",
    tags: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
    title: "飞星派另一说：以宫干飞化论宫与宫的牵连",
    content:
      "飞星派（钦天四化一路）以各宫宫干起四化，看这一宫飞向哪一宫、哪一宫又飞回来，由此论宫与宫之间的牵连与因果，还讲自化（本宫飞回本宫）。同一张盘，飞星派看到的是一张关系网，三合派看到的是一组格局，两者论断角度差别很大。",
  }),
  ziweiWeb({
    kind: "knowledge_point", topic: "四化怎么用", debateKey: KEY_ZIWEI_SIHUA, stance: "mainstream",
    tags: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
    title: "网上一般这么说：化忌落哪一宫，哪一宫就出问题",
    content:
      "网络上关于紫微讲得最多的就是化忌，常见说法是「化忌入夫妻宫感情不顺」「化忌入财帛宫破财」，一一对应、干脆利落，传播极广。这类说法抓住了化忌「牵绊、执着」的核心，方向不算错，但把它绝对化成灾祸预告就偏了：化忌所在往往也是一个人最肯下功夫的地方，很多人的专业就出在化忌宫。看到这类说法，要补上「化忌是功课不是判决」这一层，才不至于自己吓自己。",
  }),
  ziwei({
    kind: "knowledge_point", topic: "四化怎么用", debateKey: KEY_ZIWEI_SIHUA, stance: "platform_line",
    tags: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
    title: "本报告主线：以生年四化立论，宫干已列出供飞星派自行推演",
    content:
      "本报告按三合派的路子讲：以生年四化落宫为主线，配合星曜组合与三方四正。原因是这条线规则清晰、可复核，也适合大多数使用者建立整体认识。但我们把每一宫的宫干都排在盘面上——学飞星的可以直接据此自行起飞化，不必另行排盘。要提醒的是：两派的结论有时看起来矛盾，那多半不是谁错了，而是在回答不同的问题（一个问「这个人是什么格局」，一个问「哪件事牵动哪件事」）。",
  }),
];

// ══════════════ 梅花 ══════════════

const KEY_MEIHUA_TIYONG = "meihua:体用:变卦之后体用是否随之而变";
const MEIHUA_TIYONG: ReportKnowledgeSeed[] = [
  meihua({
    kind: "school_theory", topic: "变卦之后体用怎么算", debateKey: KEY_MEIHUA_TIYONG, stance: "consensus",
    tags: ["体克用", "用克体", "体生用", "用生体", "体用比和"],
    title: "共识：体用定吉凶，体卦自始至终代表求测人",
    content:
      "梅花以体为我、用为事，五行生克定吉凶；体卦代表求测人这一点贯穿全局，不会中途换人。各派一致。分歧在于本卦变出变卦之后，比较生克时该拿变卦的哪一半与体卦相比。",
  }),
  meihua({
    kind: "school_theory", topic: "变卦之后体用怎么算", debateKey: KEY_MEIHUA_TIYONG, stance: "mainstream",
    tags: ["体克用", "用克体", "体生用", "用生体", "体用比和"],
    title: "主流：体卦不动，以变卦中对应用位的那一卦与体相比",
    content:
      "通行做法是体卦固定不变，互卦与变卦都拿来与体卦比生克：互卦看中间过程——事情从开头到结局之间会经过什么；变卦看最终结果——变卦生体则终局有利，克体则不利。这一路的好处是全程只有一个「我」，推演链条清楚，不会中途乱掉。",
  }),
  meihua({
    kind: "school_theory", topic: "变卦之后体用怎么算", debateKey: KEY_MEIHUA_TIYONG, stance: "alternative",
    tags: ["体克用", "用克体", "体生用", "用生体", "体用比和"],
    title: "另一说：动爻在体卦时，变后之体亦须参看",
    content:
      "若动爻恰好落在体卦上，有一路主张把体卦变出来的那一卦也拿来参看，理由是求测人自身的处境也在变化之中。此说在「动在体」的卦上与主流取法结论可能不同。",
  }),
  meihua({
    kind: "knowledge_point", topic: "变卦之后体用怎么算", debateKey: KEY_MEIHUA_TIYONG, stance: "platform_line",
    tags: ["体克用", "用克体", "体生用", "用生体", "体用比和"],
    title: "本报告主线：体卦固定，动在体时另作提示",
    content:
      "本报告按主流取法立论：体卦固定不变，互卦看过程、变卦看结果，结论直接按这条线给出。动爻落在体卦的卦，我们仍按体卦不变来断，只在正文里附一句提示，说明另有一路会把变后之体一并参看——附这句是让你知道有这回事，不是要你重算一遍。梅花重感应与外应，同一卦断出不同侧重是常事，但一份报告只给一条线，你才有得照着用。",
  }),
];

// ══════════════ 奇门 ══════════════

const KEY_QIMEN_PAN = "qimen:排盘法:转盘与飞盘";
const QIMEN_PAN: ReportKnowledgeSeed[] = [
  qimen({
    kind: "school_theory", topic: "转盘与飞盘怎么选", debateKey: KEY_QIMEN_PAN, stance: "consensus",
    tags: ["阳遁", "阴遁"],
    title: "共识：排盘法不同，盘面就不同，断法也随之不同",
    content:
      "转盘与飞盘排出来的天盘位置不同，同一时辰的两种盘不能混着断。这一点没有争议。要紧的是使用者必须知道自己手上这张盘是按哪一法排的。",
  }),
  qimen({
    kind: "school_theory", topic: "转盘与飞盘怎么选", debateKey: KEY_QIMEN_PAN, stance: "mainstream",
    tags: ["阳遁", "阴遁"],
    title: "主流：转盘法，天盘随值符整体转动",
    content:
      "目前流传最广的是转盘法：值符随本时旬首所遁之干落宫，天盘六仪三奇随值符整体转动，像一个圆盘转到相应位置。多数教材、案例集与排盘软件都以此为准，学习时最容易找到可对照的材料。",
  }),
  qimen({
    kind: "school_theory", topic: "转盘与飞盘怎么选", debateKey: KEY_QIMEN_PAN, stance: "alternative",
    tags: ["阳遁", "阴遁"],
    title: "另一说：飞盘法，天盘按九宫飞布顺序排定",
    content:
      "飞盘一路按九宫飞布的顺序排天盘，另有一套断法与格局判定。持此说者认为飞布更合洛书本义。两法各有传承与验证，不宜简单判定孰优孰劣。",
  }),
  qimen({
    kind: "knowledge_point", topic: "转盘与飞盘怎么选", debateKey: KEY_QIMEN_PAN, stance: "platform_line",
    tags: ["阳遁", "阴遁"],
    title: "本报告主线：按转盘法解读，并在起局校验中标明",
    content:
      "本报告按转盘法解读：值符随时干落宫、天盘整体转动，方位与格局判断都据此给出，「起局校验」里也会标明这一点，你照着看即可。取转盘的理由是它流传最广、教材与实战案例最多，便于复核与对照学习。若你习惯飞盘，本报告已把局数、值符值使、四柱这些起局参数全部摊开，可据此自行飞布——这是本报告目前的限制，我们不掩饰：用飞盘的读者看方位与格局那两节时需自行换算，其余部分（局数、四柱、旬空、马星）两法通用。",
  }),
];

// ══════════════ 六壬 ══════════════

const KEY_LIUREN_GUI = "daliuren:昼夜贵:分界如何取";
const LIUREN_GUI: ReportKnowledgeSeed[] = [
  daliuren({
    kind: "school_theory", topic: "昼夜贵分界怎么取", debateKey: KEY_LIUREN_GUI, stance: "consensus",
    tags: ["昼贵", "夜贵"],
    title: "共识：昼夜贵取错，十二天将全盘皆错",
    content:
      "贵人顺行还是逆行，决定十二天将在盘上的整个排布；取错则三传所乘之将全部错位，谁在帮你、谁在挡你全反过来，人事判断无一可信。各派在这一点上完全一致。真正有分歧的是：昼与夜的分界该怎么定。",
  }),
  daliuren({
    kind: "school_theory", topic: "昼夜贵分界怎么取", debateKey: KEY_LIUREN_GUI, stance: "mainstream",
    tags: ["昼贵", "夜贵"],
    title: "主流：卯至申为昼用昼贵，酉至寅为夜用夜贵",
    content:
      "按固定时辰分界：卯时到申时为昼，用昼贵、贵人顺行；酉时到寅时为夜，用夜贵、贵人逆行。这一路的好处是分界固定，不随地点与季节变动，任何人拿同一个时辰起课都能排出同一张盘，便于复核与互相验证，是目前最通行的取法。",
  }),
  daliuren({
    kind: "school_theory", topic: "昼夜贵分界怎么取", debateKey: KEY_LIUREN_GUI, stance: "alternative",
    tags: ["昼贵", "夜贵"],
    title: "另一说：以实际日出日入为界",
    content:
      "另一路主张按占课当地当日的实际日出日入时刻分昼夜，理由是昼夜本是天象而非固定时辰，冬夏日照长短相差很大，一概按卯申划分与天象不合。",
  }),
  daliuren({
    kind: "knowledge_point", topic: "昼夜贵分界怎么取", debateKey: KEY_LIUREN_GUI, stance: "platform_line",
    tags: ["昼贵", "夜贵"],
    title: "本报告主线：按固定时辰分界，并把所用算法标出",
    content:
      "本报告按卯至申为昼、酉至寅为夜取贵人，本课用的是昼贵还是夜贵已写在「起课校验」里，三传天将都据此排定，你照着看即可。之所以取这一路：分界固定、可复核，不随地点与季节浮动，这对要反复验证的学习者更重要。另有一路按当地实际日出日入分昼夜，两说只在清晨与傍晚那两个时辰才产生差别，其余时候结论完全一致——知道这一层就够了，不必每次起课都先纠结一遍。",
  }),
];

export const DEBATE_SEEDS: ReportKnowledgeSeed[] = [
  ...SHEN_RUO_CAI,
  ...SHANG_GUAN,
  ...ZHEN_TAI_YANG,
  ...LIUYAO_YONG,
  ...ZIWEI_SIHUA,
  ...MEIHUA_TIYONG,
  ...QIMEN_PAN,
  ...LIUREN_GUI,
];
