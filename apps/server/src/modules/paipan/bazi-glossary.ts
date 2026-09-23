/**
 * 八字报告术语表（2026-09-17）
 *
 * 用途：报告正文里的术语可点，弹出释义——小白读得下去，专业用户可略过。
 * 这是「同一份专业报告服务两类用户」的关键机制，不需要为小白另写一份浅版报告。
 *
 * 内容为命理通识（概念与规则，不受著作权保护），由平台自行撰写，不摘录他人表达。
 * 释义写法：一句话说清是什么（brief），再补一句它在盘上意味着什么（detail），不下吉凶断语。
 */

export interface GlossaryTerm {
  term: string;
  /** 一句话释义，弹窗标题下直接显示 */
  brief: string;
  /** 补充说明：它在盘上怎么用 */
  detail?: string;
  /** 归类，便于前端分色与统计 */
  group: "十神" | "旺衰" | "格局" | "关系" | "神煞" | "基础" | "运程";
  /** 同义写法（报告正文里可能出现的别名） */
  alias?: string[];
}

export const BAZI_GLOSSARY: GlossaryTerm[] = [
  // ── 十神 ──
  { term: "比肩", group: "十神", brief: "与日主同类同性的五行，像并肩的同伴。", detail: "代表同辈、合伙人与自身的力量；身弱时是帮手，身旺时容易分财。", alias: ["比"] },
  { term: "劫财", group: "十神", brief: "与日主同类但阴阳相异，像争夺的同伴。", detail: "代表竞争、合作中的变数；身弱得其助，身旺则耗财。", alias: ["劫"] },
  { term: "食神", group: "十神", brief: "日主所生、同性者，代表表达与享受。", detail: "主才艺、口福与平和的输出方式，也是生财的源头。", alias: ["食"] },
  { term: "伤官", group: "十神", brief: "日主所生、异性者，代表锋芒与创造。", detail: "聪明外露、不喜拘束；生财有力，但与正官相克。", alias: ["伤"] },
  { term: "偏财", group: "十神", brief: "日主所克、同性者，代表流动的财。", detail: "多指意外之财、经营之财与人情往来的资源。", alias: ["才"] },
  { term: "正财", group: "十神", brief: "日主所克、异性者，代表稳定的财。", detail: "多指劳动所得与可掌控的资产；男命亦看配偶。", alias: ["财"] },
  { term: "七杀", group: "十神", brief: "克日主、同性者，压力最直接的一种。", detail: "代表压力、约束与魄力；有制化则成担当，无制则为负担。", alias: ["杀", "偏官"] },
  { term: "正官", group: "十神", brief: "克日主、异性者，是有规矩的约束。", detail: "代表秩序、职位与自律；女命亦看配偶。", alias: ["官"] },
  { term: "偏印", group: "十神", brief: "生日主、同性者，偏门的滋养。", detail: "代表独到的思路与非常规学习；过旺则思虑多、夺食。", alias: ["枭", "枭神"] },
  { term: "正印", group: "十神", brief: "生日主、异性者，正统的滋养。", detail: "代表庇护、学业与名誉；身弱时是重要的帮身力量。", alias: ["印"] },

  // ── 旺衰与结构 ──
  { term: "日主", group: "基础", brief: "出生那天的天干，代表命主本人。", detail: "全盘以它为中心，其余干支都相对它论生克。", alias: ["日元", "命主"] },
  { term: "身弱", group: "旺衰", brief: "日主得到的帮扶偏少、承担偏重。", detail: "喜印比来帮身；不是不好，而是提示要先把根基做实。" },
  { term: "身旺", group: "旺衰", brief: "日主得到的帮扶偏多、力量偏强。", detail: "喜财官食伤来发挥；过旺无泄则容易刚而少变。", alias: ["身强"] },
  { term: "月令", group: "基础", brief: "出生月份的地支，是全盘力量最重的一个字。", detail: "决定日主当令与否，取格与论旺衰都先看它。", alias: ["提纲"] },
  { term: "藏干", group: "基础", brief: "地支里暗含的天干。", detail: "一个地支可藏一到三个天干，是判断力量与取格的重要依据。", alias: ["人元"] },
  { term: "用神", group: "格局", brief: "全盘最需要的那种五行或十神。", detail: "扶弱抑强、调候通关，取用的思路各派不同，报告会注明所依门派。" },
  { term: "喜神", group: "格局", brief: "帮助用神发挥作用的五行。", detail: "与用神同一方向，遇之为顺。" },
  { term: "忌神", group: "格局", brief: "妨碍用神、加重失衡的五行。", detail: "不等于灾祸，而是提示这方面用力要有分寸。" },
  { term: "格局", group: "格局", brief: "以月令为主判定的命局结构类型。", detail: "如正官格、偏财格；格局成败决定这一盘走什么路子。" },
  { term: "调候", group: "格局", brief: "按寒暖燥湿调节全盘的取用思路。", detail: "冬生喜暖、夏生喜润，是《穷通宝鉴》一路的取用重点。" },
  { term: "旺相休囚死", group: "旺衰", brief: "五行在不同月份的五种强弱状态。", detail: "当令为旺、我生为相、生我为休、克我为囚、我克为死。", alias: ["旺相", "休囚"] },

  // ── 关系 ──
  { term: "天干五合", group: "关系", brief: "相隔五位的两个天干相合。", detail: "甲己、乙庚、丙辛、丁壬、戊癸；合有牵绊之意，能否化要看月令。", alias: ["五合", "天干合"] },
  { term: "地支六合", group: "关系", brief: "两个地支相合。", detail: "子丑、寅亥、卯戌、辰酉、巳申、午未；主亲近、结合与牵制。", alias: ["六合"] },
  { term: "地支三合", group: "关系", brief: "三个地支合成一个五行局。", detail: "申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金，力量成势。", alias: ["三合", "三合局"] },
  { term: "地支三会", group: "关系", brief: "同方位的三个地支会成一方之气。", detail: "寅卯辰会木、巳午未会火、申酉戌会金、亥子丑会水，比三合更专一有力。", alias: ["三会"] },
  { term: "地支六冲", group: "关系", brief: "相对的两个地支相冲。", detail: "子午、丑未、寅申、卯酉、辰戌、巳亥；主动荡、变化与调整。", alias: ["六冲", "相冲"] },
  { term: "地支相刑", group: "关系", brief: "地支之间的一种不协调关系。", detail: "含三刑与自刑；提示某方面需要磨合，不作凶祸论。", alias: ["三刑", "自刑"] },
  { term: "地支六害", group: "关系", brief: "地支之间的一种妨碍关系。", detail: "多主人事上的隔阂与消耗。", alias: ["六害", "相害"] },
  { term: "地支相破", group: "关系", brief: "地支之间的一种损耗关系。", detail: "力量较轻，多作辅助参考。", alias: ["相破"] },

  // ── 基础概念 ──
  { term: "纳音", group: "基础", brief: "六十甲子各配一个五行名目。", detail: "如「路旁土」「白蜡金」，古法论命常用，现代多作参考。" },
  { term: "十二长生", group: "基础", brief: "天干在十二地支上的十二种状态。", detail: "长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养，描述力量的盛衰节律。", alias: ["星运", "长生"] },
  { term: "空亡", group: "基础", brief: "每一旬中缺少的两个地支。", detail: "落空亡处主虚、不实，需结合全盘看，不单独论断。", alias: ["旬空"] },
  { term: "胎元", group: "基础", brief: "受孕之月推出的干支。", detail: "作为先天信息的补充参考。" },
  { term: "命宫", group: "基础", brief: "按出生月时推出的一个宫位干支。", detail: "古法用以补充看性情与主线。" },
  { term: "身宫", group: "基础", brief: "与命宫相对的一个宫位。", detail: "多用于看后天着力之处。" },
  { term: "真太阳时", group: "基础", brief: "按出生地经度校正后的当地实际时间。", detail: "与钟表时间可差数十分钟，可能影响时柱甚至换柱，是起盘第一道关。" },
  { term: "自坐", group: "基础", brief: "日干坐在日支上的关系。", detail: "常用来看命主的自身状态与配偶宫。" },

  // ── 神煞（常见，只作参考不作断语）──
  { term: "天乙贵人", group: "神煞", brief: "最常用的吉神之一，主贵人相助。", detail: "神煞是辅助参考，需与格局用神一起看，不单独定吉凶。" },
  { term: "太极贵人", group: "神煞", brief: "主对玄学、学术有兴趣与悟性。", detail: "同为辅助参考。" },
  { term: "天德贵人", group: "神煞", brief: "主逢凶化吉、得庇护。", detail: "同为辅助参考。" },
  { term: "月德贵人", group: "神煞", brief: "主平顺与长辈助力。", detail: "同为辅助参考。" },
  { term: "文昌", group: "神煞", brief: "主读书、考试与文书之利。", detail: "同为辅助参考。", alias: ["文昌贵人"] },
  { term: "华盖", group: "神煞", brief: "主艺术、宗教与独处的气质。", detail: "常见于心思独立、喜欢钻研的人。" },
  { term: "驿马", group: "神煞", brief: "主走动、变迁与外出。", detail: "现代多应在出差、搬迁、异地发展。" },
  { term: "桃花", group: "神煞", brief: "主人缘与异性缘。", detail: "不等于感情问题，需结合全盘看。", alias: ["咸池"] },
  { term: "羊刃", group: "神煞", brief: "刚强之气，力量偏锐。", detail: "有制则成果断魄力，无制则易冲动。", alias: ["阳刃"] },
  { term: "将星", group: "神煞", brief: "主统领与担当。", detail: "同为辅助参考。" },
  { term: "攀鞍", group: "神煞", brief: "主晋升与助力。", detail: "同为辅助参考。" },
  { term: "劫煞", group: "神煞", brief: "主耗损与意外的变动。", detail: "提示留心，不作灾祸定论。" },
  { term: "亡神", group: "神煞", brief: "主内耗与心事。", detail: "提示留心，不作灾祸定论。" },
  { term: "孤辰", group: "神煞", brief: "主孤单、独处的倾向。", detail: "不作婚姻结论，仅为性情参考。" },
  { term: "寡宿", group: "神煞", brief: "与孤辰同类，主独处。", detail: "不作婚姻结论，仅为性情参考。" },

  // ── 运程 ──
  { term: "大运", group: "运程", brief: "每十年一步的运程阶段。", detail: "按出生后顺逆排布，是看人生阶段主题的主要依据。" },
  { term: "流年", group: "运程", brief: "每一年的干支。", detail: "与原局和大运相互作用，决定当年的具体起伏。" },
  { term: "起运", group: "运程", brief: "从几岁开始走第一步大运。", detail: "按出生到节气的天数折算，不同口径可能差几个月。" },
  { term: "交运", group: "运程", brief: "从上一步大运换到下一步的时点。", detail: "交运前后一段时间往往变化感明显。" },
  { term: "岁运并临", group: "运程", brief: "流年与大运干支相同。", detail: "力量集中，起伏感较明显，需看喜忌再判断方向。" },
];

/** 词典索引：包含别名，长词优先（「偏财格」先于「偏财」命中） */
const TERM_INDEX: { key: string; term: GlossaryTerm }[] = (() => {
  const list: { key: string; term: GlossaryTerm }[] = [];
  for (const t of BAZI_GLOSSARY) {
    list.push({ key: t.term, term: t });
    for (const a of t.alias ?? []) list.push({ key: a, term: t });
  }
  // 长词优先，避免「偏财」抢先匹配掉「偏财格」这类场景
  return list.sort((a, b) => b.key.length - a.key.length);
})();

/**
 * 从文本中提取出现过的术语。
 *
 * 只返回确实出现的词，报告随文附带，前端据此把正文里的词做成可点——
 * 不下发整本词典（一份报告通常只用到十几个词）。
 */
export function extractGlossary(texts: string[]): GlossaryTerm[] {
  const joined = texts.filter(Boolean).join("\n");
  if (!joined) return [];
  const hit = new Map<string, GlossaryTerm>();
  for (const { key, term } of TERM_INDEX) {
    if (hit.has(term.term)) continue;
    // 单字别名（十神简写「才」「枭」「官」「印」）在正文里随处可见，按它匹配会大面积误伤，
    // 因此正文只按两字以上的词匹配；单字仍可通过 findTerm 精确查询（四柱卡上的十神标注即走这条路）。
    if (key.length < 2) continue;
    if (joined.includes(key)) hit.set(term.term, term);
  }
  return [...hit.values()].sort((a, b) => b.term.length - a.term.length);
}

export function findTerm(word: string): GlossaryTerm | null {
  const k = word.trim();
  return TERM_INDEX.find((x) => x.key === k)?.term ?? null;
}
