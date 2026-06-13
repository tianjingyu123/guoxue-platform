// ── 八字流日流时计算器 ──
// 算法参考：《渊海子平》《三命通会》《滴天髓》
import type { BaziLiuRiInput, BaziLiuRiResult, LiuRiPillar, LiuRiInteraction } from "@guoxue/shared";
import {
  calcBazi, calcRiZhu, calcShiZhu, calcShiShen,
  GAN, ZHI, NA_YIN,
  GAN_HE_PAIRS, ZHI_HE_PAIRS, ZHI_CHONG_PAIRS, ZHI_HAI_PAIRS,
  ZHI_SAN_HE, ZHI_SAN_XING, ZHI_ZI_XING,
} from "@guoxue/bazi-engine";
import type { Gan, Zhi, ShiShen } from "@guoxue/bazi-engine";

const SHI_SHEN_DESC: Record<string, string> = {
  "比": "比肩主竞争、合作，平辈助力",
  "劫": "劫财主争夺、破财，需防小人",
  "食": "食神主才华发挥、口福、平安",
  "伤": "伤官主聪明叛逆、创新突破",
  "才": "偏财主意外之财、投资、人缘",
  "财": "正财主稳定收入、踏实进财",
  "杀": "七杀主压力、权威、行动力",
  "官": "正官主事业、名声、贵人",
  "枭": "偏印主孤独思考、冷门技能",
  "印": "正印主学习、贵人相助、文书",
};

function buildPillar(gan: Gan, zhi: Zhi, riGan: Gan): LiuRiPillar {
  const ganShiShen = calcShiShen(riGan, gan);
  const zhiShiShen = calcShiShen(riGan, zhi);
  const ganZhi = gan + zhi;
  return {
    ganZhi,
    gan,
    zhi,
    ganShiShen,
    zhiShiShen,
    nayin: NA_YIN[ganZhi] || "",
  };
}

function findInteractions(flowZhi: Zhi, natalPillars: { label: string; zhi: Zhi }[], flowGan: Gan, natalGans: { label: string; gan: Gan }[]): LiuRiInteraction[] {
  const results: LiuRiInteraction[] = [];

  for (const { label, gan } of natalGans) {
    for (const [a, b] of GAN_HE_PAIRS) {
      if ((flowGan === a && gan === b) || (flowGan === b && gan === a)) {
        results.push({ type: "天干合", from: `流${flowGan}`, to: `${label}${gan}`, desc: `${flowGan}${gan}合` });
      }
    }
  }

  for (const { label, zhi } of natalPillars) {
    for (const [a, b] of ZHI_HE_PAIRS) {
      if ((flowZhi === a && zhi === b) || (flowZhi === b && zhi === a)) {
        results.push({ type: "地支六合", from: `流${flowZhi}`, to: `${label}${zhi}`, desc: `${flowZhi}${zhi}合` });
      }
    }
    for (const [a, b] of ZHI_CHONG_PAIRS) {
      if ((flowZhi === a && zhi === b) || (flowZhi === b && zhi === a)) {
        results.push({ type: "地支六冲", from: `流${flowZhi}`, to: `${label}${zhi}`, desc: `${flowZhi}${zhi}冲` });
      }
    }
    for (const [a, b] of ZHI_HAI_PAIRS) {
      if ((flowZhi === a && zhi === b) || (flowZhi === b && zhi === a)) {
        results.push({ type: "地支六害", from: `流${flowZhi}`, to: `${label}${zhi}`, desc: `${flowZhi}${zhi}害` });
      }
    }
    for (const trio of ZHI_SAN_XING) {
      if (trio.includes(flowZhi) && trio.includes(zhi) && flowZhi !== zhi) {
        results.push({ type: "地支刑", from: `流${flowZhi}`, to: `${label}${zhi}`, desc: `${flowZhi}${zhi}刑` });
      }
    }
    if (ZHI_ZI_XING.includes(flowZhi) && flowZhi === zhi) {
      results.push({ type: "地支自刑", from: `流${flowZhi}`, to: `${label}${zhi}`, desc: `${flowZhi}自刑` });
    }
    for (const trio of ZHI_SAN_HE) {
      if (trio.includes(flowZhi) && trio.includes(zhi) && flowZhi !== zhi) {
        results.push({ type: "地支三合", from: `流${flowZhi}`, to: `${label}${zhi}`, desc: `${flowZhi}${zhi}半合` });
      }
    }
  }

  return results;
}

function generateFortune(ganSS: ShiShen, zhiSS: ShiShen, interactions: LiuRiInteraction[]) {
  const hasChi = interactions.some(i => i.type === "地支六冲");
  const hasHe = interactions.some(i => i.type === "地支六合" || i.type === "天干合");
  const hasHai = interactions.some(i => i.type === "地支六害");
  const hasXing = interactions.some(i => i.type === "地支刑" || i.type === "地支自刑");

  const careerMap: Record<string, string> = {
    "官": "事业运佳，宜处理公务、面见领导",
    "杀": "事业压力大但有突破机遇，宜果断决策",
    "印": "利学习考试，宜处理文书、签约",
    "枭": "宜独立思考，不宜合作谈判",
    "食": "才华显露，宜展示能力、社交公关",
    "伤": "创意旺盛但易得罪人，言语谨慎",
    "财": "正财运好，宜收账、签合同",
    "才": "偏财运佳，利投资、交际",
    "比": "宜合作共事，不宜独断",
    "劫": "竞争激烈，防被人抢功",
  };

  const wealthMap: Record<string, string> = {
    "财": "正财稳进，收入平稳增长",
    "才": "偏财有望，利投资理财",
    "官": "因名得利，贵人带财",
    "杀": "财来有压力，需付出方得",
    "印": "进财缓慢但稳定",
    "枭": "不宜大额投资",
    "食": "凭技艺生财，正常收入",
    "伤": "有意外开支，花销较大",
    "比": "财运平平，不宜借贷",
    "劫": "防破财、被骗，谨慎理财",
  };

  const loveMap: Record<string, string> = {
    "财": "感情和谐，利表白、约会",
    "才": "桃花运旺，异性缘佳",
    "官": "利见长辈、谈婚论嫁",
    "杀": "感情有压力或竞争",
    "印": "宜陪伴家人，感情稳定",
    "枭": "感情冷淡，独处为宜",
    "食": "心情愉快，利社交聚会",
    "伤": "易口角，注意言辞",
    "比": "平淡如水，不生不灭",
    "劫": "小心第三者，防感情纠纷",
  };

  const healthMap: Record<string, string> = {
    "印": "精力充沛，睡眠质量好",
    "枭": "注意用脑过度",
    "食": "食欲好，但防暴饮暴食",
    "伤": "注意运动伤害",
    "官": "肝胆注意，勿过劳",
    "杀": "压力大，注意心血管",
    "财": "脾胃注意，饮食规律",
    "才": "防应酬过多伤身",
    "比": "身体平稳",
    "劫": "注意碰伤磕伤",
  };

  let overall: string;
  if (hasHe && !hasChi && !hasHai) {
    overall = "今日合局，诸事顺遂，宜积极行动";
  } else if (hasChi) {
    overall = "今日逢冲，变动较大，宜守不宜攻";
  } else if (hasHai) {
    overall = "今日逢害，防小人暗算，低调行事";
  } else if (hasXing) {
    overall = "今日逢刑，刑中带动，谨慎处事可化险为夷";
  } else {
    overall = SHI_SHEN_DESC[ganSS] || "平稳度日";
  }

  return {
    overall,
    career: careerMap[ganSS] || "事业平稳",
    wealth: wealthMap[ganSS] || "财运平平",
    love: loveMap[zhiSS] || "感情平淡",
    health: healthMap[zhiSS] || "身体无恙",
  };
}

export function calculateBaziLiuRi(input: unknown): BaziLiuRiResult {
  const p = input as BaziLiuRiInput;

  const bazi = calcBazi({
    name: "", year: p.year, month: p.month, day: p.day,
    hour: p.hour, minute: 0, gender: p.gender,
  });

  const siZhu = bazi.siZhu;
  const riGan = siZhu.ri.gan;

  const liuRiRaw = calcRiZhu(p.targetYear, p.targetMonth, p.targetDay);
  const liuRi = buildPillar(liuRiRaw.gan, liuRiRaw.zhi, riGan);

  let liuShi: LiuRiPillar | null = null;
  if (p.targetHour !== undefined) {
    const shiRaw = calcShiZhu(liuRiRaw.gan, p.targetHour);
    liuShi = buildPillar(shiRaw.gan, shiRaw.zhi, riGan);
  }

  const natalPillars = [
    { label: "年", zhi: siZhu.nian.zhi },
    { label: "月", zhi: siZhu.yue.zhi },
    { label: "日", zhi: siZhu.ri.zhi },
    { label: "时", zhi: siZhu.shi.zhi },
  ];
  const natalGans = [
    { label: "年", gan: siZhu.nian.gan },
    { label: "月", gan: siZhu.yue.gan },
    { label: "日", gan: siZhu.ri.gan },
    { label: "时", gan: siZhu.shi.gan },
  ];

  const interactions = findInteractions(liuRiRaw.zhi, natalPillars, liuRiRaw.gan, natalGans);

  if (liuShi) {
    const shiInteractions = findInteractions(
      liuShi.zhi as Zhi, natalPillars,
      liuShi.gan as Gan, natalGans,
    );
    for (const si of shiInteractions) {
      si.from = si.from.replace("流", "流时");
      interactions.push(si);
    }
  }

  const targetYear = p.targetYear;
  const birthYear = p.year;
  const age = targetYear - birthYear + 1;

  let currentDaYun = null;
  for (const dy of bazi.qiYun.daYun) {
    if (age >= dy.startAge && age <= dy.endAge) {
      currentDaYun = {
        ganZhi: dy.ganZhi,
        ganShiShen: dy.ganShiShen,
        zhiShiShen: dy.zhiShiShen,
        startAge: dy.startAge,
        endAge: dy.endAge,
      };
      break;
    }
  }

  const nianIdx = (targetYear - 1984 + 60000) % 60;
  const nianGan = GAN[nianIdx % 10];
  const nianZhi = ZHI[nianIdx % 12];
  const liuNianGanZhi = nianGan + nianZhi;
  const currentLiuNian = {
    year: targetYear,
    ganZhi: liuNianGanZhi,
    ganShiShen: calcShiShen(riGan, nianGan as Gan),
    zhiShiShen: calcShiShen(riGan, nianZhi as Zhi),
  };

  const fortune = generateFortune(liuRi.ganShiShen as ShiShen, liuRi.zhiShiShen as ShiShen, interactions);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const interactionSummary = interactions.length > 0
    ? `，与命局有${interactions.map(i => i.desc).join("、")}`
    : "";
  const advice = generateAdvice(liuRi.ganShiShen as ShiShen, interactions);
  const natalStr = `${siZhu.nian.gan}${siZhu.nian.zhi} ${siZhu.yue.gan}${siZhu.yue.zhi} ${siZhu.ri.gan}${siZhu.ri.zhi} ${siZhu.shi.gan}${siZhu.shi.zhi}`;
  const daYunStr = currentDaYun ? `${currentDaYun.ganZhi}（${currentDaYun.startAge}-${currentDaYun.endAge}岁）` : "—";
  const interactionNames = interactions.map(i => i.desc).join(" ") || "无冲合";
  const summary = [
    "┌──────────────────────────────────────┐",
    "│        八字流日 · 逐日运程            │",
    "├──────────────────────────────────────┤",
    "│ 命局：" + natalStr.padEnd(30) + "│",
    "│ 大运：" + daYunStr.padEnd(30) + "│",
    "│ 流年：" + (currentLiuNian.year + "年 " + currentLiuNian.ganZhi + "（" + currentLiuNian.ganShiShen + "/" + currentLiuNian.zhiShiShen + "）").padEnd(30) + "│",
    "│ 流日：" + (liuRi.ganZhi + "（" + liuRi.ganShiShen + "/" + liuRi.zhiShiShen + "·" + liuRi.nayin + "）").padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 综合：" + fortune.overall.padEnd(30) + "│",
    "│ 事业：" + fortune.career.padEnd(30) + "│",
    "│ 财运：" + fortune.wealth.padEnd(30) + "│",
    "│ 感情：" + fortune.love.padEnd(30) + "│",
    "│ 健康：" + fortune.health.padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 互动：" + interactionNames.padEnd(30) + "│",
    "│ 建议：" + (advice.length > 30 ? advice.slice(0, 30) + "…" : advice).padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《渊海子平》《三命通会》        │",
    "│       《滴天髓》                      │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    natalChart: {
      nian: siZhu.nian.gan + siZhu.nian.zhi,
      yue: siZhu.yue.gan + siZhu.yue.zhi,
      ri: siZhu.ri.gan + siZhu.ri.zhi,
      shi: siZhu.shi.gan + siZhu.shi.zhi,
      riGan,
    },
    currentDaYun,
    currentLiuNian,
    liuRi,
    liuShi,
    interactions,
    fortune,
    advice,
    summary,
  };
}

function generateAdvice(ganSS: ShiShen, interactions: LiuRiInteraction[]): string {
  const parts: string[] = [];

  if (interactions.some(i => i.type === "地支六冲")) {
    parts.push("逢冲之日变动较大，不宜签约、搬迁、重大决定");
  }
  if (interactions.some(i => i.type === "地支六害")) {
    parts.push("逢害防暗损，交际中注意言辞，防被利用");
  }
  if (interactions.some(i => i.type === "地支刑" || i.type === "地支自刑")) {
    parts.push("逢刑主动变，有压力但可催动行动力");
  }
  if (interactions.some(i => i.type === "天干合" || i.type === "地支六合")) {
    parts.push("逢合主和谐，利合作、签约、社交");
  }

  if (parts.length === 0) {
    const ssAdvice: Record<string, string> = {
      "官": "宜见领导、处理公事",
      "杀": "行动果断，但避免冲动",
      "印": "宜读书学习、处理文件",
      "枭": "宜独处思考，不宜社交",
      "食": "宜展现才华、美食社交",
      "伤": "创意好但管好嘴巴",
      "财": "稳步进财日，宜收账",
      "才": "利投资理财、异性交际",
      "比": "宜团队协作",
      "劫": "谨慎花钱，防被骗",
    };
    parts.push(ssAdvice[ganSS] || "平稳度日即可");
  }

  return parts.join("。");
}
