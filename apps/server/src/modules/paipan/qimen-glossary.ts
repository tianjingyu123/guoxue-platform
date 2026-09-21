/**
 * 奇门遁甲报告术语表（2026-09-18）
 *
 * 此前奇门报告借用八字词表，只偶然命中「用神」「格局」「空亡」几个通用词，
 * 值符、值使、门迫、三奇六仪这些奇门专有的词一个都点不开。
 *
 * 内容为奇门通识（概念与规则，不受著作权保护），由平台自行撰写，不摘录他人表达。
 */

import type { GlossaryTerm } from "./bazi-glossary";

export const QIMEN_GLOSSARY: GlossaryTerm[] = [
  // ── 盘面构件 ──
  { term: "九宫", group: "基础", brief: "洛书九个宫位，对应八方与中宫。", detail: "坎一北、坤二西南、震三东、巽四东南、中五、乾六西北、兑七西、艮八东北、离九南；奇门的一切都落在宫上。", alias: ["九宫格"] },
  { term: "天盘", group: "基础", brief: "转动的那一层，代表天时与当下的变化。", detail: "天盘干是断事的主要依据之一：用神所临的天盘干，说明事情当前的状态。" },
  { term: "地盘", group: "基础", brief: "固定的那一层，代表地利与事情的根基。", detail: "地盘干按局数排定不动，是判断天盘干落宫吉凶的底子。" },
  { term: "值符", group: "基础", brief: "九星之首，随旬首而动，所临之宫是全局的枢纽。", detail: "值符到处为吉方，事情的主导力量也从这一宫看起；值符受制则主事无人主张。" },
  { term: "值使", group: "基础", brief: "八门之首，随旬首所值之门，代表事情的着落处。", detail: "值使门落宫决定方位与时机，是取用的关键一环。" },
  { term: "旬首", group: "基础", brief: "本时辰所属旬的第一个干支。", detail: "旬首定值符值使，起局的关键一步；报告把它摊开，正是为了让使用者复核。" },

  // ── 八门九星八神 ──
  { term: "八门", group: "格局", brief: "开、休、生、伤、杜、景、死、惊，主人事之门户。", detail: "开休生为三吉门，死惊伤为凶门，杜景为中平；问事取用多在门上。" },
  { term: "九星", group: "格局", brief: "天蓬、天任、天冲、天辅、天英、天芮、天柱、天心、天禽，主天时。", detail: "星性说明事情的气质与走向，与门配合方能定吉凶。" },
  { term: "八神", group: "格局", brief: "值符、腾蛇、太阴、六合、白虎、玄武、九地、九天，主隐性助力与阻力。", detail: "神说的是事情背后那一层看不见的力量：吉门吉星若逢玄武腾蛇，中间仍会横生枝节。" },
  { term: "三奇", group: "格局", brief: "乙、丙、丁三干，称日奇、月奇、星奇。", detail: "三奇临吉门吉宫主事顺遂；奇门之名即由此而来。" },
  { term: "六仪", group: "格局", brief: "戊、己、庚、辛、壬、癸六干，代表甲的六种化身。", detail: "甲不独显，遁于六仪之下，这就是「遁甲」的由来。" },

  // ── 起局 ──
  { term: "阳遁", group: "基础", brief: "冬至后至夏至前，九宫飞布顺行。", detail: "只定排盘顺逆，不直接等于吉凶。" },
  { term: "阴遁", group: "基础", brief: "夏至后至冬至前，九宫飞布逆行。", detail: "同样只定排盘顺逆；不可因阴遁便通篇作衰败之论。" },
  { term: "局数", group: "基础", brief: "阴阳遁加一到九的数，决定地盘六仪三奇的排布。", detail: "由节气与三元定出，排错局则满盘皆错。" },
  { term: "三元", group: "基础", brief: "每一节气分上元、中元、下元，各领五日。", detail: "元定局数，本身不带吉凶。", alias: ["上元", "中元", "下元"] },
  { term: "转盘", group: "基础", brief: "天盘随值符整体转动的排盘法。", detail: "与飞盘相对，是目前最通行的一种；本平台服务端按转盘法存储。" },
  { term: "飞盘", group: "基础", brief: "天盘按九宫飞布顺序排定的排盘法。", detail: "与转盘并行的另一派做法，两者盘面不同，断法也有出入。" },

  // ── 判断要点 ──
  { term: "门迫", group: "关系", brief: "门的五行克所落之宫的五行。", detail: "门迫则吉门减吉、凶门增凶，是奇门最要紧的判断之一。" },
  { term: "入墓", group: "旺衰", brief: "天盘干落入自己的墓库之宫。", detail: "主力量被收藏、事情被压住，须待冲开墓库之时。" },
  { term: "击刑", group: "关系", brief: "天盘干与所落之宫地支相刑。", detail: "主事有阻碍、易生是非，宜避其锋。" },
  { term: "空亡", group: "旺衰", brief: "本旬所缺的两个地支对应之宫。", detail: "空主着力不上、事多虚而不实；出空之时往往是应期。", alias: ["旬空"] },
  { term: "马星", group: "运程", brief: "驿马所临之宫，主动、主远行、主变化。", detail: "问出行、问变动、问求财在外者，多看马星落宫。", alias: ["驿马"] },
  { term: "伏吟", group: "格局", brief: "天盘与地盘完全相同，盘面不动。", detail: "主停滞难展、原地打转，凡事宜守不宜进。" },
  { term: "反吟", group: "格局", brief: "天盘与地盘相冲，来回折腾。", detail: "主事情反复、动荡不安，过程必有波折。" },
  { term: "用神", group: "基础", brief: "按所问之事取定的那个符号（门、星、神或干）。", detail: "求财取生门、问官取开门、问人取值符、问文书取景门；取错用神，后面全错。" },
  { term: "落宫", group: "关系", brief: "用神所在的那一宫。", detail: "看落宫的五行生克、门星神配合，以及是否门迫入墓，才能定这件事成与不成。" },

  // ── 定局（观点对照「时家奇门怎么定局」用到的词）──
  { term: "定局", group: "基础", brief: "确定阴阳遁与第几局，排盘的第一步。", detail: "局定错了，值符值使、九宫布局全盘皆错，后面讲得再细也是在另一张盘上说话。" },
  { term: "符头", group: "基础", brief: "甲、己之日，一元的起头。", detail: "上中下三元各以符头起算。符头按干支走、节气按太阳走，两条线对不齐，正是各种定局法要处理的事。" },
  { term: "超神接气", group: "基础", brief: "符头跑到节气前面（超神）或落在后面（接气）。", detail: "节气每气约十五天、一元整十天，一年下来必然错开几天。怎么补这几天，分出了拆补与置闰两路。" },
  { term: "拆补", group: "基础", brief: "定局法之一：交节即换局，三元按符头拆补。", detail: "节气与局始终对齐，与历法直观一致、便于复核，是当代教材与排盘软件的通行做法，也是本平台的默认。", alias: ["拆补法"] },
  { term: "置闰", group: "基础", brief: "定局法之一：超神积累到一定程度就重复一个节气的局。", detail: "以闰局把符头与节气拉回同步，主张奇门的根在六十甲子的循环。代价是置闰时机各家不尽相同，同一天可能排出不同的局。", alias: ["置闰法"] },
  { term: "茅山", group: "基础", brief: "定局法之一：不分三元，直接由时辰干支定局。", detail: "省去符头与节气对齐的麻烦，自成体系，多用于择时应事；与拆补、置闰不是同一套坐标，断语不宜混用。", alias: ["茅山法"] },
];

const TERM_INDEX: { key: string; term: GlossaryTerm }[] = QIMEN_GLOSSARY.flatMap((t) => [
  { key: t.term, term: t },
  ...(t.alias ?? []).map((a) => ({ key: a, term: t })),
]).sort((a, b) => b.key.length - a.key.length);

export function extractQimenGlossary(texts: string[]): GlossaryTerm[] {
  const joined = texts.filter(Boolean).join("\n");
  if (!joined) return [];
  const hit = new Map<string, GlossaryTerm>();
  for (const { key, term } of TERM_INDEX) {
    if (hit.has(term.term)) continue;
    if (key.length < 2) continue;
    if (joined.includes(key)) hit.set(term.term, term);
  }
  return [...hit.values()].sort((a, b) => b.term.length - a.term.length);
}
