/**
 * 六爻报告术语表（2026-09-18）
 *
 * 此前六爻报告借用八字词表，正文里只偶然命中「用神」「驿马」三两个词，
 * 世应、旬空、月破、伏神这些断卦必备的词一个都点不开——等于没有注解。
 *
 * 内容为卜筮通识（概念与规则，不受著作权保护），由平台自行撰写，不摘录他人表达。
 * 释义写法：一句话说清是什么（brief），再补一句它在卦上怎么用（detail），不下吉凶断语。
 */

import type { GlossaryTerm } from "./bazi-glossary";

export const LIUYAO_GLOSSARY: GlossaryTerm[] = [
  // ── 卦的基本构件 ──
  { term: "用神", group: "基础", brief: "代表所问之事的那一爻，全卦围绕它来断。", detail: "问财取妻财、问功名取官鬼、问文书取父母、问子女取子孙、问兄弟朋友取兄弟；取错用神，后面全错。" },
  { term: "世爻", group: "基础", brief: "代表求测人自己的那一爻。", detail: "世爻的旺衰与所临六亲，说明求测人当下的处境与心态。", alias: ["持世"] },
  { term: "应爻", group: "基础", brief: "代表对方、或事情本身的那一爻。", detail: "与世爻相对：世应相生则两相得力，世应相冲则彼此有隔。" },
  { term: "六亲", group: "基础", brief: "父母、兄弟、官鬼、妻财、子孙五类，按卦宫五行推定。", detail: "生我者父母、我生者子孙、克我者官鬼、我克者妻财、同我者兄弟；六亲是六爻断事的语言。" },
  { term: "父母", group: "关系", brief: "主文书、契约、房屋、长辈与辛劳。", detail: "父母克子孙：问子女、问出行平安时，父母有力反成阻碍。" },
  { term: "兄弟", group: "关系", brief: "主同辈、竞争、分夺与口舌。", detail: "兄弟克妻财：问求财时最忌兄弟旺动，主被分被夺。" },
  { term: "官鬼", group: "关系", brief: "主功名、职位、诉讼，也主疾病与忧患。", detail: "问功名为得位之神，问平安则为克身之神，须看子孙是否能制。" },
  { term: "妻财", group: "关系", brief: "主财物、买卖、所得，男测亦看配偶。", detail: "妻财克父母：问文书契约时，财旺反主手续凭据生变。" },
  { term: "子孙", group: "关系", brief: "主福德、解忧、子女与下属，为解神。", detail: "子孙克官鬼：问病问忧得之可解，问功名问诉讼则不利。" },

  // ── 旺衰与生克 ──
  { term: "月建", group: "旺衰", brief: "起卦当月的地支，管一卦之令。", detail: "判爻的旺衰先看月建：得月建生扶则旺，被月建克制则衰。", alias: ["月令"] },
  { term: "日辰", group: "旺衰", brief: "起卦当日的地支，力量最活、最能左右吉凶。", detail: "日辰能生能克、能冲能合，静爻逢日辰冲可成暗动，旬空逢日辰填实即不空。" },
  { term: "旺相休囚死", group: "旺衰", brief: "爻在当月当日所处的五种力量状态。", detail: "当令为旺、受生为相、泄气为休、受克为囚、克尽为死；力量不足的爻，纵有吉象也难成事。", alias: ["旺相", "休囚"] },
  { term: "旬空", group: "旺衰", brief: "本旬中缺的那两个地支，落在爻上即为空。", detail: "空不等于凶，而是「此处着力不上」；出空之日往往就是应期。", alias: ["空亡", "逢空"] },
  { term: "月破", group: "旺衰", brief: "被当月地支冲的那一爻。", detail: "破主受损、难当大用；出月或逢合有可能补回来。" },
  { term: "入墓", group: "旺衰", brief: "爻落入自己的墓库，力量被收藏。", detail: "入墓主暂时使不出力、事情被压住，须待冲开墓库之时。" },

  // ── 动变 ──
  { term: "动爻", group: "关系", brief: "摇卦时变动的那一爻，是卦中主动施加影响的力量。", detail: "动则生克随之而变：动爻生克谁、自身是否得力，是断卦的关键一环。", alias: ["发动"] },
  { term: "变爻", group: "关系", brief: "动爻变出来的那一爻。", detail: "变爻回头生则动爻力增，回头克则动而自伤。" },
  { term: "进神", group: "关系", brief: "动爻变出同类而更进一位（如寅变卯）。", detail: "主事情步步推进、越来越顺。" },
  { term: "退神", group: "关系", brief: "动爻变出同类而退一位（如卯变寅）。", detail: "主事情有始无终、逐渐回缩。" },
  { term: "伏神", group: "关系", brief: "卦中不现的六亲，藏在本宫首卦对应爻下。", detail: "用神不上卦时要找伏神：伏而得生可用，伏而受制则事难成。" },
  { term: "飞神", group: "关系", brief: "压在伏神上面的那一爻。", detail: "飞来克伏则伏神难出，飞来生伏则伏神可用。" },
  { term: "暗动", group: "关系", brief: "静爻被日辰所冲而暗中生效。", detail: "暗动之爻虽未摇动，却实实在在参与生克，最容易被漏看。" },

  // ── 卦体 ──
  { term: "卦宫", group: "格局", brief: "本卦所归的八宫之一，决定六亲配置与整卦五行。", detail: "先认宫，六亲之位才不乱。" },
  { term: "静卦", group: "格局", brief: "六爻皆不动，事体按原状推进。", detail: "断静卦全凭用神与世爻的旺衰，以及月建日辰的生克。" },
  { term: "六冲", group: "格局", brief: "卦中上下卦地支相冲，或变出六冲。", detail: "主散、主快、主不长久：问长久之事不利，问脱难求快反宜。" },
  { term: "六合", group: "格局", brief: "卦中上下卦地支相合。", detail: "主合、主缓、主稳固：问和合婚姻有利，问脱身求快则迟滞。" },
  { term: "游魂", group: "格局", brief: "八宫中第七卦，主心神不定、事在远方。", detail: "问行人主在外未归，问事主反复不定。" },
  { term: "归魂", group: "格局", brief: "八宫中第八卦，主事归本位、去而复返。", detail: "问行人主将归，问旧事主重提。" },
  { term: "反吟", group: "格局", brief: "卦与变卦地支相冲，来回折腾。", detail: "主事情反复、先成后败或先败后成，过程必有波折。" },
  { term: "伏吟", group: "格局", brief: "卦与变卦地支相同，原地不动。", detail: "主停滞、呻吟难展，凡事宜守不宜进。" },

  // ── 应期 ──
  { term: "应期", group: "运程", brief: "事情应验的时间。", detail: "常取逢值、逢合、出空、填实、冲实之日月；给区间不给确定日期，这是推断不是保证。" },

  // ── 空破的还原（观点对照「旬空月破怎么判」用到的词）──
  { term: "出空", group: "旺衰", brief: "过了本旬，旬空之爻恢复受力。", detail: "旬空是「眼下悬着」不是「没戏」：待出了本旬，或到该爻地支的值日，事情才动得了，应期常落在这里。" },
  { term: "填实", group: "旺衰", brief: "到了与月破之爻地支相同的日子，破处补实。", detail: "月破之爻待出了本月，或逢填实之日，方能受力。与出空一样，说的是时机而不是结果。" },
  { term: "真空", group: "旺衰", brief: "休囚无气又受克的旬空，出空也难有作为。", detail: "与假空相对。判定「有气无气」本身要拿捏，标准一宽就容易把话说过头，所以本报告只用它调整力度，不用它推翻结论。" },
  { term: "假空", group: "旺衰", brief: "得日月生扶或本爻发动的旬空，出空即能用。", detail: "旺不为空、动不为空、有日辰生扶不为空——这正是有些逢空的卦照样成事的原因。" },
];

const TERM_INDEX: { key: string; term: GlossaryTerm }[] = LIUYAO_GLOSSARY.flatMap((t) => [
  { key: t.term, term: t },
  ...(t.alias ?? []).map((a) => ({ key: a, term: t })),
]).sort((a, b) => b.key.length - a.key.length);

export function extractLiuyaoGlossary(texts: string[]): GlossaryTerm[] {
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
