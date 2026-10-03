/**
 * 大六壬报告术语表（2026-09-18）
 *
 * 此前六壬报告借用八字词表，实测只命中「地支六合」「空亡」两个通用词，
 * 四课、三传、月将、天将这些六壬的骨架词一个都点不开。
 *
 * 内容为六壬通识（概念与规则，不受著作权保护），由平台自行撰写，不摘录他人表达。
 */

import type { GlossaryTerm } from "./bazi-glossary";

export const DALIUREN_GLOSSARY: GlossaryTerm[] = [
  // ── 起课 ──
  { term: "月将", group: "基础", brief: "随中气更替的十二神将之一，加在占时上起天盘。", detail: "月将取错则天地盘全错，三传与天将无一可信；报告单列它，正是为了让使用者复核这一步。" },
  { term: "占时", group: "基础", brief: "起课那一刻的时辰。", detail: "月将加占时，天盘由此排定，是六壬起课的第一步。" },
  { term: "天盘", group: "基础", brief: "月将加时后转动的那一层。", detail: "天盘十二神落在地盘十二支上，四课三传都从这里取。" },
  { term: "地盘", group: "基础", brief: "固定不动的十二地支。", detail: "地盘是底子，天盘是变化，两者叠加才成一课。" },
  { term: "昼贵", group: "基础", brief: "卯至申起课用昼贵，贵人顺行十二宫。", detail: "昼夜贵取错，十二天将全盘皆错；各派对分界的算法略有出入。" },
  { term: "夜贵", group: "基础", brief: "酉至寅起课用夜贵，贵人逆行十二宫。", detail: "夜占之事多主暗处、私下、曲折。" },

  // ── 课体 ──
  { term: "四课", group: "基础", brief: "由日干、日支及其天盘神组成的四组关系。", detail: "一二课取自日干，三四课取自日支；四课是取三传的依据。", alias: ["立四课"] },
  { term: "三传", group: "基础", brief: "初传、中传、末传，代表事情的开端、经过与结局。", detail: "三传是六壬断事的主线：一传一节，递进成一条完整的事理。" },
  { term: "初传", group: "关系", brief: "三传之首，代表事情的起因与当下。", detail: "初传所乘天将尤为要紧，它是事情的主导力量。", alias: ["发用"] },
  { term: "中传", group: "关系", brief: "三传之中，代表事情的经过与转折。", detail: "中传生初克末之类的关系，说明中途会遇到什么。" },
  { term: "末传", group: "关系", brief: "三传之末，代表事情的结局与归宿。", detail: "断辞的落点常在末传：末传得力则事成，末传受制则终局不利。" },
  { term: "九宗门", group: "格局", brief: "取三传的九种法则：元首、重审、知一、涉害、遥克、昴星、别责、八专、伏吟。", detail: "取传之法不同，事体的性质就不同；先认课体，再看三传递进。", alias: ["课体"] },
  { term: "元首课", group: "格局", brief: "四课只有一处上克下，取之发用。", detail: "事出有主、名正言顺，为九宗门第一吉课。" },
  { term: "重审课", group: "格局", brief: "四课只有一处下克上，取之发用。", detail: "事由下而上，主需反复审度、不可仓促决断。" },
  { term: "涉害课", group: "格局", brief: "克有多处而无比用，取涉害深者发用。", detail: "主牵扯纠缠、利害交错，历尽艰阻而后成。" },
  { term: "伏吟", group: "格局", brief: "月将与占时相同，天地盘不动。", detail: "主停滞原地、谋动必阻；问病主缠绵，问行人主不至。" },
  { term: "反吟", group: "格局", brief: "天盘与地盘相冲。", detail: "主事情反复动荡、来回折腾。" },

  // ── 天将 ──
  { term: "天将", group: "格局", brief: "贵人、螣蛇、朱雀、六合、勾陈、青龙、天空、白虎、太常、玄武、太阴、天后十二位。", detail: "天将乘于三传之上，说明「什么人、以什么方式」参与这件事。", alias: ["十二天将"] },
  { term: "贵人", group: "关系", brief: "天将之首，主尊长提携、事得正助。", detail: "所临之处为全课最有力处；问官求贵最宜。" },
  { term: "青龙", group: "关系", brief: "主财喜庆贺、官职升迁，诸将中第一吉将。", detail: "问财问喜最宜；乘衰地则吉而无力。" },
  { term: "白虎", group: "关系", brief: "主疾病伤灾、道路凶险，亦主消息急至。", detail: "问病问行最忌；然其性急速，问速成之事反有可取。" },
  { term: "玄武", group: "关系", brief: "主盗窃遗失、暗昧欺瞒。", detail: "问失物防盗多应，凡事须防人不实。" },
  { term: "天空", group: "关系", brief: "主虚耗诈伪、承诺落空。", detail: "问诚信最忌，得之须防所托非人。" },

  // ── 其他 ──
  { term: "日干", group: "基础", brief: "起课当日的天干，代表求测人自己。", detail: "一二课自日干上起，日干的处境即求测人的处境。" },
  { term: "日支", group: "基础", brief: "起课当日的地支，代表对方或事体。", detail: "三四课自日支上起，与日干相对而看。" },
  { term: "旬空", group: "旺衰", brief: "本旬所缺的两个地支。", detail: "落空之处主着力不上、事多虚；出空之时往往是应期。", alias: ["空亡"] },
  { term: "课格", group: "格局", brief: "四课三传呈现的特定组合，各有专名。", detail: "课格是在课体之上的细分，用来说明事情的具体面貌。" },
  { term: "应期", group: "运程", brief: "事情应验的时间。", detail: "常取末传所值、旬空出空、天将值日等思路推断；给区间不给确定日期。" },

  // ── 月将过宫（观点对照「月将按中气还是交节」用到的词）──
  { term: "过宫", group: "基础", brief: "月将换到下一个地支。", detail: "月将本意是太阳所在之宫，太阳走一宫、月将换一位。何时算换，正是中气与交节两说的分歧所在。", alias: ["换将"] },
  { term: "中气", group: "基础", brief: "二十四节气中排在偶数位的那一半：雨水、春分、谷雨……", detail: "太阳过宫之时即中气，故通行诸书以中气换将——雨水后亥将登明，依次退行。这是本平台的默认。" },
  { term: "交节", group: "基础", brief: "二十四节气中排在奇数位的那一半：立春、惊蛰、清明……", detail: "月建以交节为界，故有一路主张月将也按交节换，与四柱保持一致。与中气换将相差半个月，天盘会整体错开一宫。", alias: ["节气"] },
  { term: "登明", group: "基础", brief: "亥将之名，雨水后所用。", detail: "十二月将各有专名：登明亥、河魁戌、从魁酉、传送申、小吉未、胜光午、太乙巳、天罡辰、太冲卯、功曹寅、大吉丑、神后子。" },
];

const TERM_INDEX: { key: string; term: GlossaryTerm }[] = DALIUREN_GLOSSARY.flatMap((t) => [
  { key: t.term, term: t },
  ...(t.alias ?? []).map((a) => ({ key: a, term: t })),
]).sort((a, b) => b.key.length - a.key.length);

export function extractDaliurenGlossary(texts: string[]): GlossaryTerm[] {
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
