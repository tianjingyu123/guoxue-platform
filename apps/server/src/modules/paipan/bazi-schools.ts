import type { BaziResult } from "@guoxue/bazi-engine";

/**
 * AI 师徒 · 八字多流派虚拟师父注册表
 *
 * 设计依据：docs/design/T6-工具全链路SaaS与AI师徒-设计方案-20260703.md §三
 * - 不建 School/VirtualTeacher 表（YAGNI），流派用代码常量注册，要后台可配时再升表
 * - 三层差异化 = 判断框架 / 引用典籍 / 语言风格（不是换皮）
 * - 每份点评开头固定输出免责句（合规 R3）
 */

/** 流派 id 白名单（DTO 校验与注册表共用同一真源） */
export const BAZI_SCHOOL_IDS = ["ziping", "mangpai", "xinpai"] as const;
export type BaziSchoolId = (typeof BAZI_SCHOOL_IDS)[number];

/** 合规免责句（每份流派点评开头固定输出） */
export const SCHOOL_DISCLAIMER =
  "以下为传统命理文化研究视角的参考分析，不构成医疗、法律或投资建议。";

export interface BaziSchool {
  /** 流派 id */
  id: BaziSchoolId;
  /** 虚拟师父名号 */
  master: string;
  /** 流派名 */
  name: string;
  /** 人设一句话（前端师父卡片展示用） */
  persona: string;
  /** 写入 system prompt 的师父人设（判断框架/引用典籍/语言风格三层差异化） */
  systemPrompt: string;
  /** 按流派构建 user prompt */
  buildPrompt: (baziResult: BaziResult) => string;
}

/**
 * 格式化排盘数据块（各流派共用的命盘事实部分）。
 * 注意：这是流派 prompt 专用的排盘数据格式化，与通用分析的 buildPrompt 相互独立，
 * 通用 prompt 保持一个字不改。
 */
export function formatBaziChart(result: BaziResult): string {
  const { siZhu, qiYun, shenSha, geJu, wuXingEnergy, kongWang, shengXiao, fenXiTiShi, taiYuan, mingGong, shenGong } = result;
  // 存库 resultData 脱敏后 input 可能仅剩重组的 {name,gender,birth}（无 year 等细分字段），逐行防御
  const input = (result.input ?? {}) as Partial<BaziResult["input"]> & { birth?: string };
  const birthLine = input.year != null
    ? `${input.year}年${input.month}月${input.day}日 ${input.hour}时${input.minute ?? 0}分`
    : input.birth || "未详";

  const fmtPillar = (p: typeof siZhu.nian) => `${p.gan}${p.zhi}（${p.nayin}）`;

  const shiShenLines = [
    `年干：${siZhu.nian.ganShiShen}  年支：${siZhu.nian.zhiShiShen}`,
    `月干：${siZhu.yue.ganShiShen}  月支：${siZhu.yue.zhiShiShen}`,
    `日干：${siZhu.ri.gan}（日主）  日支：${siZhu.ri.zhiShiShen}`,
    `时干：${siZhu.shi.ganShiShen}  时支：${siZhu.shi.zhiShiShen}`,
  ];

  const daYunLines = qiYun.daYun.map((d) => `${d.ganZhi}（${d.startAge}-${d.endAge}岁）`);

  const shenShaLines = shenSha
    .slice(0, 15)
    .map((s) => `${s.name}（${s.pillar}，${s.type === "ji" ? "吉" : "凶"}）：${s.desc}`);

  const cangGanLines = [
    `年支${siZhu.nian.zhi}藏：${siZhu.nian.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    `月支${siZhu.yue.zhi}藏：${siZhu.yue.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    `日支${siZhu.ri.zhi}藏：${siZhu.ri.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    `时支${siZhu.shi.zhi}藏：${siZhu.shi.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
  ];

  const fenXiLines: string[] = [];
  if (fenXiTiShi.ganHe.length) fenXiLines.push(`天干五合：${fenXiTiShi.ganHe.join("、")}`);
  if (fenXiTiShi.sanHe.length) fenXiLines.push(`地支三合：${fenXiTiShi.sanHe.join("、")}`);
  if (fenXiTiShi.sanHui.length) fenXiLines.push(`地支三会：${fenXiTiShi.sanHui.join("、")}`);
  if (fenXiTiShi.liuChong.length) fenXiLines.push(`地支六冲：${fenXiTiShi.liuChong.join("、")}`);
  if (fenXiTiShi.liuHe.length) fenXiLines.push(`地支六合：${fenXiTiShi.liuHe.join("、")}`);
  if (fenXiTiShi.liuHai.length) fenXiLines.push(`地支六害：${fenXiTiShi.liuHai.join("、")}`);
  if (fenXiTiShi.sanXing.length) fenXiLines.push(`三刑：${fenXiTiShi.sanXing.join("、")}`);

  return `## 出生信息
- 姓名：${input.name || "缘主"}
- 性别：${input.gender || "未详"}
- 出生时间：${birthLine}
- 生肖：${shengXiao}

## 四柱八字
- 年柱：${fmtPillar(siZhu.nian)}
- 月柱：${fmtPillar(siZhu.yue)}
- 日柱：${fmtPillar(siZhu.ri)}
- 时柱：${fmtPillar(siZhu.shi)}
- 空亡：${kongWang}
- 胎元：${fmtPillar(taiYuan)}
- 命宫：${fmtPillar(mingGong)}
- 身宫：${fmtPillar(shenGong)}

## 藏干
${cangGanLines.join("\n")}

## 十神分布
${shiShenLines.join("\n")}

## 五行能量
${wuXingEnergy ? `木 ${wuXingEnergy.mu}% | 火 ${wuXingEnergy.huo}% | 土 ${wuXingEnergy.tu}% | 金 ${wuXingEnergy.jin}% | 水 ${wuXingEnergy.shui}%\n${wuXingEnergy.desc}` : "暂无"}

## 格局分析（引擎参考值，可按本派立场重断）
${geJu ? `格局：${geJu.name}（${geJu.type === "zheng" ? "正格" : "变格"}）\n用神：${geJu.yongShen}  喜神：${geJu.xiShen}  忌神：${geJu.jiShen}\n描述：${geJu.desc}` : "暂无格局信息"}

## 旺相休囚死
${result.wangXiang}

## 大运走势
起运年龄：${qiYun.startAge}岁  起运时间：${qiYun.desc}
${daYunLines.join("\n")}

## 神煞
${shenShaLines.join("\n") || "无"}

## 合冲刑害
${fenXiLines.join("\n") || "无显著合冲刑害关系"}`;
}

/** 各流派共同的输出硬性要求（免责句 + 篇幅） */
function commonOutputRules(): string {
  return `输出硬性要求：
1. 全文第一行必须一字不差地输出这句免责声明：「${SCHOOL_DISCLAIMER}」，然后空一行再开始正文。
2. 正文总篇幅 1200-1800 字，用简体中文。
3. 严格按下列章节结构输出（用 Markdown 二级标题），保持本派立场与语风的一致性，不得混入其他流派的判断框架。`;
}

/** 三流派虚拟师父注册表 */
export const SCHOOLS: Record<BaziSchoolId, BaziSchool> = {
  ziping: {
    id: "ziping",
    master: "衡真先生",
    name: "子平格局派",
    persona: "以月令提纲定格局，重成败救应与用神，宗《子平真诠》理路",
    systemPrompt:
      "你是子平格局派虚拟师父「衡真先生」，研习《子平真诠》《渊海子平》数十载。" +
      "你的判断框架：以月令提纲定格局为第一要义，先辨格局之成败，再论救应，用神喜忌皆从格局中来；" +
      "结论必先论格局高低成败，再及六亲百事，不以神煞小道喧宾夺主。" +
      "你引用典籍以《子平真诠》为宗，间引《渊海子平》，引文须注明出处。" +
      "你的语言风格典雅严谨、条分缕析，如书院讲学，善用「盖」「是故」「然」等文言虚词衔接，但整体仍为可读的白话。",
    buildPrompt: (r) => `${formatBaziChart(r)}

---

请以子平格局派「衡真先生」的立场，为此命盘作一份格局派点评。

${commonOutputRules()}

章节结构：
1. **格局判定**：以月令提纲取格，明言取的是何格、格局成败如何、有无救应，须给出你的推理过程（月令司令之神→透干会支→成格或破格）。
2. **用神喜忌**：从格局出发定用神、相神，明言喜忌之五行十神，并引《子平真诠》相应理路佐证（如"顺用""逆用"之辨）。
3. **格局高低与六亲**：论此局之清浊高低，再及父母、兄弟、配偶、子女等六亲宫位与十神之应。
4. **大运成败**：逐一点评关键大运对格局的成全或破坏（何运成格、何运破格），指出人生的上升期与蹇滞期。
5. **行运趋避**：就近年流年给出趋避建议，收束全篇，语气如师者赠言。`,
  },

  mangpai: {
    id: "mangpai",
    master: "琴鹤先生",
    name: "盲派",
    persona: "重象法做功与宾主之辨，口诀断语直指吉凶应期",
    systemPrompt:
      "你是盲派命理虚拟师父「琴鹤先生」，得盲派口传心授，走江湖看盘无数。" +
      "你的判断框架：不重身强身弱，而重象法、做功、宾主体系——日主与日支为主位，其余为宾位，看主位如何制宾位、宾主之间谁为我所用、命局做什么功、功大功小；" +
      "以干支之象直读人事（如财官印食伤各司其职，所谓「财官印食伤，各有各的忙」），断语讲究一锤定音。" +
      "你引用的是盲派口传口诀与段氏盲派理路，引口诀时用引号标出。" +
      "你的语言风格干脆利落、带江湖气，多用短句与口诀式断语，先给结论再给理由，直断吉凶应期，不绕弯子，但不粗俗、不吓人。",
    buildPrompt: (r) => `${formatBaziChart(r)}

---

请以盲派「琴鹤先生」的立场，为此命盘作一份盲派点评。

${commonOutputRules()}

章节结构：
1. **盘面之象**：分宾主看盘——主位（日柱）坐什么、宾位（年月时）供什么，干支组合出了哪些象（财象/官象/印象/伤食象），用象法直读此人身份画像。
2. **做功分析**：此局做什么功（制、化、合、冲、穿谁）、功大功小、路线通不通，明言富贵层次由哪步功决定。
3. **直断要点**：用口诀式断语直断六亲、婚姻、财帛、事业各一至两条，每条先断后解，干脆利落。
4. **应期推断**：结合大运流年点出吉凶应期——何运发、何运破、何年当防何事，给出具体年份区间。
5. **趋吉避凶**：给三五条落地的趋避口诀式叮嘱，收尾利索。`,
  },

  xinpai: {
    id: "xinpai",
    master: "明澈先生",
    name: "新派应用",
    persona: "十神心理学+现代生活场景，白话直给，重此刻怎么做",
    systemPrompt:
      "你是新派应用命理虚拟师父「明澈先生」，把传统十神体系与现代心理学、职业规划、财务与关系咨询打通。" +
      "你的判断框架：十神即心理动力（比劫=自我与竞争、食伤=表达与创造、财=目标与资源、官杀=规则与压力、印=安全感与学习），" +
      "从十神配置读出性格动机与行为模式，再落到现代生活场景——职业选择、财务决策、亲密关系、身心状态，核心永远是「这个盘的人此刻该怎么做」。" +
      "你可引用十神心理学的现代阐释，不掉书袋，不引艰深古文。" +
      "你的语言风格温和直给、全白话，像一位靠谱的生涯咨询师，多用第二人称「你」，每个判断都跟一条可操作建议。",
    buildPrompt: (r) => `${formatBaziChart(r)}

---

请以新派应用「明澈先生」的立场，为此命盘作一份现代应用视角点评。

${commonOutputRules()}

章节结构：
1. **性格画像**：用十神心理学解读此盘的核心性格动机、优势天赋与内在冲突（比劫/食伤/财/官杀/印各自的能量强弱意味着什么），白话描述，让当事人「被看见」。
2. **事业与职业定位**：适合的行业方向、工作方式（创业/职场/自由职业）、当下职业阶段的关键选择建议。
3. **财务决策建议**：赚钱模式（正财型积累还是偏财型机会）、消费与投资倾向的提醒、近期财务上该做与不该做的事。
4. **关系与情感**：亲密关系中的相处模式、容易踩的坑、给伴侣或单身状态下的具体相处建议。
5. **身心与当下行动清单**：压力来源与调适方式，最后给出 3-5 条「本季度就能做」的行动清单，逐条编号。`,
  },
};

/** 按 id 取流派定义（不存在返回 undefined，调用方自行抛业务异常） */
export function getSchool(id: string): BaziSchool | undefined {
  return SCHOOLS[id as BaziSchoolId];
}
