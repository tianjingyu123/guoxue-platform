// ── 十神关系图谱计算引擎 ──
// 算法参考：《渊海子平·十神篇》《三命通会·论十神》《子平真诠》
// 十神者：比肩/劫财/食神/伤官/正财/偏财/正官/七杀/正印/偏印
// 《子平真诠》云：「十神之义，乃五行生克配合阴阳而来。」

// [lint-fix] removed unused: import { GAN } from "@guoxue/bazi-engine";
import type { ShiShenTuPuResult, ShiShenRelation } from "@guoxue/shared";

// 十神详解数据库
const SHISHEN_DETAIL: Record<string, {
  fullName: string; meaning: string; personType: string;
  favorable: string; unfavorable: string;
  careerHint: string; classicalRef: string;
}> = {
  "比肩": {
    fullName: "比肩（比和）",
    meaning: "与日主同五行同阴阳，如兄弟姊妹。代表同辈、朋友、合作伙伴、竞争对手。",
    personType: "兄弟、姐妹、朋友、同辈同事",
    favorable: "身弱时比肩帮身，增自信增力量。主合作得利、人脉拓展、得到同辈帮助。",
    unfavorable: "身强时比肩夺财争官，主竞争失利、合作破裂、朋友反目。",
    careerHint: "适合需要团队合作的工作，不宜单打独斗。",
    classicalRef: "《渊海子平》：「比肩者，兄弟也。阴阳相同，五行同类。」",
  },
  "劫财": {
    fullName: "劫财（败财）",
    meaning: "与日主同五行异阴阳，如兄妹姐弟。代表外露的朋友、竞争者、劫夺之人。",
    personType: "兄妹、姐弟、异性朋友、合伙人",
    favorable: "身弱时劫财助身旺相，主社交活跃、朋友多助。",
    unfavorable: "身强时劫财克财破财，主财务亏损、被朋友拖累。女命劫财多主感情波折。",
    careerHint: "宜与人合作但须分清账目，不宜独自管钱。",
    classicalRef: "《渊海子平》：「劫财者，败财也。阴阳相异，五行同类。」",
  },
  "食神": {
    fullName: "食神（寿星）",
    meaning: "日主所生，阴阳相同。代表才华、艺术、口福、子女、乐观。",
    personType: "子女、学生、晚辈、创作者",
    favorable: "食神泄秀生财，主才华横溢、思路清晰、口福佳。身强食神为第一福星。",
    unfavorable: "食神过旺泄身太过，主贪图安逸、不思进取。食神被偏印制（枭神夺食）大忌。",
    careerHint: "适合创意、艺术、美食、教育等发挥才华的行业。",
    classicalRef: "《三命通会》：「食神者，日干所生而与日干阴阳相同者是也。食神主寿。」",
  },
  "伤官": {
    fullName: "伤官（才华星）",
    meaning: "日主所生，阴阳相异。代表才华外露、创新、叛逆、不服管束。",
    personType: "子女、学生、晚辈（与食神同但更叛逆）",
    favorable: "伤官生财才华变现，伤官配印贵格。主创新突破、独特才能、艺术天赋。",
    unfavorable: "伤官见官为祸百端，主口舌是非、与上司不和、名声受损。身弱伤官泄身太过。",
    careerHint: "适合独立创作、艺术、设计等需要独特才华的工作，不宜体制内。",
    classicalRef: "《子平真诠》：「伤官虽非吉神，实为秀气。文人学士，多为伤官格。」",
  },
  "正财": {
    fullName: "正财（财帛星）",
    meaning: "日主所克，阴阳相异。代表正当收入、工资、固定资产、妻子（男命）。",
    personType: "妻子（男命）、稳定财源、固定资产",
    favorable: "正财稳定收入，主勤俭持家、积蓄有方。正财配正官，富贵双全。",
    unfavorable: "正财过多身弱不胜财，主为财所累。正财被劫财夺，主破财。",
    careerHint: "适合稳定收入行业：银行、会计、固定资产管理。",
    classicalRef: "《渊海子平》：「正财者，我克而阴阳相异者也。正财主掌家业。」",
  },
  "偏财": {
    fullName: "偏财（横财星）",
    meaning: "日主所克，阴阳相同。代表意外之财、投资收入、父亲、情人。",
    personType: "父亲、意外财源、投资回报",
    favorable: "偏财运旺，投资眼光独到，适合经商。偏财配七杀，商界枭雄。",
    unfavorable: "偏财多而不聚，来得快去得快。偏财被比肩夺，主投机失败。",
    careerHint: "适合投资、经商、自由职业等灵活收入行业。",
    classicalRef: "《三命通会》：「偏财者，我克而阴阳相同者也。偏财主外财，非本分之财。」",
  },
  "正官": {
    fullName: "正官（官禄星）",
    meaning: "克日主者，阴阳相异。代表法律、纪律、官职、丈夫（女命）、贵人。",
    personType: "领导、官员、丈夫（女命）、贵人",
    favorable: "正官清透主贵气，仕途顺利、正直守法。正官配正印，官印相生大贵格。",
    unfavorable: "正官过多变为杀（官多不贵），主压力大、拘束多。伤官见官大忌。",
    careerHint: "适合公务员、事业单位、大型企业等需要守规矩的行业。",
    classicalRef: "《子平真诠》：「何谓正官？克我而与我异性者也。官者，管也。」",
  },
  "七杀": {
    fullName: "七杀（偏官）",
    meaning: "克日主者，阴阳相同。代表暴力、权力、军队、黑道、意外、上司（严厉型）。",
    personType: "严厉上司、对手、敌人（化杀为权则为贵人）",
    favorable: "七杀有制化为权，主兵权、执法权、创业魄力。食神制杀贵格，杀印相生武贵。",
    unfavorable: "七杀无制攻身，主灾祸、疾病、官非、小人暗害。",
    careerHint: "适合军警、法务、外科、纪律部门等需要魄力的行业。",
    classicalRef: "《渊海子平》：「七杀者，克我而阴阳相同者也。杀者，害也。制之则为偏官。」",
  },
  "正印": {
    fullName: "正印（印绶星）",
    meaning: "生日主者，阴阳相异。代表母亲、学业、文书、贵人、名誉。",
    personType: "母亲、老师、长辈贵人、文书",
    favorable: "正印护身主学业有成、贵人扶持、心地善良。正印配正官，官印相生大贵。",
    unfavorable: "正印过多依赖性强、缺乏主见。财星破印，主文书有误、贵人远离。",
    careerHint: "适合教育、研究、文化、出版等需要学识的行业。",
    classicalRef: "《三命通会》：「印绶者，生我而阴阳相异者也。印绶主生气，为生我之父母。」",
  },
  "偏印": {
    fullName: "偏印（枭神）",
    meaning: "生日主者，阴阳相同。代表继母、特殊才能、偏门技艺、宗教玄学。",
    personType: "继母、伯叔、特殊导师、方外之人",
    favorable: "偏印成格有特殊天赋，适合冷门学术、玄学、科研。",
    unfavorable: "偏印夺食（枭神夺食），主抑郁、孤独、才华受阻。偏印过旺性格孤僻。",
    careerHint: "适合科研、玄学、冷门技术、顾问等独特知识型行业。",
    classicalRef: "《子平真诠》：「偏印者，生我而与我同性者也。又名枭神，能夺食神。」",
  },
};

// 十神组合分析（常见格局）
const COMBO_ANALYSIS: Record<string, string> = {
  "食神|正官": "食神制官，才华与纪律冲突。宜将才华用于正途，不可恃才傲物、对抗规则。",
  "食神|七杀": "食神制杀，上等格局。用智慧和才华化解危机，逢凶化吉。适合军警、外科、纪律行业。",
  "食神|正财": "食神生财，才华变现。宜将能力和兴趣转化为收入，创业或兼职可成。",
  "伤官|正印": "伤官配印，贵格。才华得到正确引导，思想深邃有创见。适合学术研究和文艺创作。",
  "伤官|正官": "伤官见官，为祸百端。才华与规则碰撞，宜保持低调，避免与权威正面冲突。需印制伤护官。",
  "伤官|七杀": "伤官合杀，化敌为友。用智慧化解敌意，适合调解、外交、谈判类工作。",
  "正财|正官": "财官双美，富贵格局。正当收入加社会地位，一生衣食无忧。适合公务员和大型企业。",
  "正财|正印": "财星坏印，求财影响学业。须在物质追求和精神追求间找平衡，不可因利废学。",
  "正财|比肩": "比肩分财，与人分享财富。合作经营可得更大收益，但须亲兄弟明算账。",
  "偏财|七杀": "偏财七杀，枭雄格局。高风险高回报，适合创业经商，但须防大起大落。",
  "七杀|正印": "杀印相生，文武双全。在压力和约束中成长，化压力为动力。适合管理和领导岗位。",
  "七杀|食神": "食神制杀，以柔克刚。用智慧化解暴力冲突，逢凶化吉遇难成祥。",
  "正官|正印": "官印相生，贵格。既有地位又有学识，仕途学术双丰收。适合体制内学术研究。",
  "正印|比肩": "印比两旺，根基深厚。得长辈和同辈共同扶持，适合传承型事业。",
};

export function calculateShiShenTuPu(input: Record<string, unknown>): ShiShenTuPuResult {
  const dayPillar = (input.dayPillar as string) || "戊辰";
  const yearPillar = (input.yearPillar as string) || "";
  const monthPillar = (input.monthPillar as string) || "";
  const hourPillar = (input.hourPillar as string) || "";

  const riGan = dayPillar[0] || "戊";
  const pillars: { label: string; gan: string }[] = [];
  if (yearPillar) pillars.push({ label: "年干", gan: yearPillar[0] });
  if (monthPillar) pillars.push({ label: "月干", gan: monthPillar[0] });
  pillars.push({ label: "日干", gan: riGan });
  if (hourPillar) pillars.push({ label: "时干", gan: hourPillar[0] });

  const wuXingMap: Record<string, string> = {
    "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土",
    "庚":"金","辛":"金","壬":"水","癸":"水",
  };
  const yinYangMap: Record<string, string> = {
    "甲":"阳","丙":"阳","戊":"阳","庚":"阳","壬":"阳",
    "乙":"阴","丁":"阴","己":"阴","辛":"阴","癸":"阴",
  };

  const riWuXing = wuXingMap[riGan];
  const riYinYang = yinYangMap[riGan];

  const shiShenMap: ShiShenRelation[] = [];
  const allShenSet = new Set<string>();

  for (const { label, gan } of pillars) {
    const wuXing = wuXingMap[gan];
    const yinYang = yinYangMap[gan];

    let shen: string, relation: string;

    if (wuXing === riWuXing) {
      shen = yinYang === riYinYang ? "比肩" : "劫财";
      relation = "同我";
    } else if (
      (riWuXing === "木" && wuXing === "水") || (riWuXing === "火" && wuXing === "木") ||
      (riWuXing === "土" && wuXing === "火") || (riWuXing === "金" && wuXing === "土") ||
      (riWuXing === "水" && wuXing === "金")
    ) {
      shen = yinYang === riYinYang ? "偏印" : "正印";
      relation = "生我";
    } else if (
      (riWuXing === "木" && wuXing === "火") || (riWuXing === "火" && wuXing === "土") ||
      (riWuXing === "土" && wuXing === "金") || (riWuXing === "金" && wuXing === "水") ||
      (riWuXing === "水" && wuXing === "木")
    ) {
      shen = yinYang === riYinYang ? "食神" : "伤官";
      relation = "我生";
    } else if (
      (riWuXing === "木" && wuXing === "金") || (riWuXing === "火" && wuXing === "水") ||
      (riWuXing === "土" && wuXing === "木") || (riWuXing === "金" && wuXing === "火") ||
      (riWuXing === "水" && wuXing === "土")
    ) {
      shen = yinYang === riYinYang ? "七杀" : "正官";
      relation = "克我";
    } else {
      shen = yinYang === riYinYang ? "偏财" : "正财";
      relation = "我克";
    }

    if (label !== "日干") allShenSet.add(shen);

    const detail = SHISHEN_DETAIL[shen];
    let desc: string;
    if (label === "日干") {
      desc = `${label}: ${gan} → 日主（自身，${riWuXing}${riYinYang}）`;
    } else {
      desc = `${label}: ${gan} → ${detail?.fullName || shen}（${relation}）`;
    }

    shiShenMap.push({ name: label, shen, from: riGan, to: gan, relation, description: desc });
  }

  const allShens = [...allShenSet];

  // 查找十神组合
  const combos: string[] = [];
  for (const key of Object.keys(COMBO_ANALYSIS)) {
    const [a, b] = key.split("|");
    if (allShens.includes(a) && allShens.includes(b)) {
      combos.push(`「${a}+${b}」${COMBO_ANALYSIS[key]}`);
    }
  }

  // 构建详细摘要
  const summary = [
    `【十神关系图谱】日主${riGan}（${riWuXing}${riYinYang}）`,
    ``,
    `┌─ 四柱十神 ─────────────────`,
    ...shiShenMap.filter(s => s.name !== "日干")
      .map(s => {
        const detail = SHISHEN_DETAIL[s.shen];
        return `│ ${s.name}${s.to} → ${detail?.fullName || s.shen}：${detail?.meaning?.substring(0, 40) || ""}`;
      }),
    ...(shiShenMap.filter(s => s.name !== "日干").length === 0
      ? [`│ （未提供年月时柱，仅显示日干）`] : []),
    ``,
    `├─ 十神分布 ─────────────────`,
    `│ ${allShens.length > 0 ? allShens.join("、") : "仅日柱"}`,
    ``,
    ...(combos.length > 0
      ? [`├─ 十神组合分析 ─────────────────`, ...combos.map(c => `│ ${c}`), ``]
      : []),
    `├─ 十神要点 ─────────────────`,
    ...allShens.map(s => {
      const d = SHISHEN_DETAIL[s];
      return `│ · ${d?.fullName || s}：${d?.favorable?.substring(0, 50) || ""}`;
    }),
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《渊海子平》：「十神之论，乃五行生克阴阳配合而成。」`,
    `   《子平真诠》：「论十神配合，实为论命之关键。」`,
    `   《三命通会》：「十神各有喜忌，须配合身旺身弱取用。」`,
    ``,
    `十神者，命理之核心也。明十神之义，则命局之结构自明；通十神之用，则命运之走向可判。`,
  ].filter(Boolean).join("\n");

  return { riGan, shiShenMap, summary };
}
