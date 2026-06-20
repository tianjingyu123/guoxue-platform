// ── 格局详解计算引擎 ──
// 算法参考：《渊海子平》《子平真诠》《滴天髓》
// 基于《子平真诠》《三命通会》《渊海子平》等经典
// 月令取格 → 透干判断 → 成格条件 → 破格检测 → 层次判定

import type { GeJuXiangJieInput, GeJuXiangJieResult } from "@guoxue/shared";
import { GAN } from "@guoxue/bazi-engine";

// ==================== 基础映射 ====================

const GAN_WU_XING: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火",
  "戊": "土", "己": "土", "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

const ZHI_WU_XING: Record<string, string> = {
  "寅": "木", "卯": "木", "巳": "火", "午": "火",
  "申": "金", "酉": "金", "亥": "水", "子": "水",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
};

// 地支藏干（完整）
const ZHI_CANG: Record<string, string[]> = {
  "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"],
  "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "戊", "庚"],
  "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"],
  "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "戊"],
};

// 月令五行→天干
const WX_GANS: Record<string, string[]> = {
  "木": ["甲", "乙"], "火": ["丙", "丁"], "土": ["戊", "己"],
  "金": ["庚", "辛"], "水": ["壬", "癸"],
};

// 十神→格局名
const SHI_SHEN_PATTERN: Record<string, string> = {
  "正官": "正官格", "七杀": "七杀格", "正印": "正印格", "偏印": "偏印格",
  "正财": "正财格", "偏财": "偏财格", "食神": "食神格", "伤官": "伤官格",
  "比肩": "建禄格", "劫财": "阳刃格",
};

// 格局出处
const PATTERN_SOURCES: Record<string, string> = {
  "正官格": "《子平真诠》卷二·论正官", "七杀格": "《子平真诠》卷二·论七杀",
  "正印格": "《子平真诠》卷三·论正印", "偏印格": "《子平真诠》卷三·论偏印",
  "正财格": "《子平真诠》卷三·论正财", "偏财格": "《子平真诠》卷三·论偏财",
  "食神格": "《子平真诠》卷四·论食神", "伤官格": "《子平真诠》卷四·论伤官",
  "建禄格": "《子平真诠》卷五·论建禄", "阳刃格": "《子平真诠》卷五·论阳刃",
  "从强格": "《滴天髓》·从象篇", "从弱格": "《滴天髓》·从象篇",
  "化气格": "《渊海子平》·化气十段锦", "两神成象格": "《滴天髓》·形象篇",
};

// 天干相合
const GAN_HE: Record<string, string> = {
  "甲": "己", "乙": "庚", "丙": "辛", "丁": "壬", "戊": "癸",
  "己": "甲", "庚": "乙", "辛": "丙", "壬": "丁", "癸": "戊",
};

// 日干禄位
const LU_MAP: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午",
  "戊": "巳", "己": "午", "庚": "申", "辛": "酉",
  "壬": "亥", "癸": "子",
};

// 日干羊刃
const REN_MAP: Record<string, string> = {
  "甲": "卯", "乙": "寅", "丙": "午", "丁": "巳",
  "戊": "午", "己": "巳", "庚": "酉", "辛": "申",
  "壬": "子", "癸": "亥",
};

// ==================== 十神计算 ====================

function calcShiShen(riGan: string, target: string): string {
  const GAN_LIST = GAN as unknown as string[];
  const riIdx = GAN_LIST.indexOf(riGan);
  const tIdx = GAN_LIST.indexOf(target);
  const diff = (tIdx - riIdx + 10) % 10;

  const SHI_TABLE: Record<number, [string, string]> = {
    0: ["比肩", "比肩"], 1: ["劫财", "劫财"],
    2: ["食神", "伤官"], 3: ["伤官", "食神"],
    4: ["偏财", "正财"], 5: ["正财", "偏财"],
    6: ["七杀", "正官"], 7: ["正官", "七杀"],
    8: ["偏印", "正印"], 9: ["正印", "偏印"],
  };
  // 简化：用天干奇偶区分阴阳
  const riIsYin = GAN_LIST.indexOf(riGan) % 2 === 1;
  const tIsYin = GAN_LIST.indexOf(target) % 2 === 1;
  const sameYinYang = riIsYin === tIsYin;
  return SHI_TABLE[diff][sameYinYang ? 0 : 1];
}

// ==================== 成格条件 ====================

interface PatternCondition {
  conditions: string[];
  supportingGod: string;
  description: string;
}

function getPatternConditions(patternName: string, _riWx: string): PatternCondition {
  const condMap: Record<string, PatternCondition> = {
    "正官格": {
      conditions: ["月令正官星透出天干", "官星有财印相随（财生官/印护官）", "无伤官克破官星", "无七杀混杂"],
      supportingGod: `财星(生官)或印星(护官)`,
      description: "正官格贵在清正，官星得令透干，须财生官、印护官，忌伤官破官、七杀混杂。身强官旺为上格。",
    },
    "七杀格": {
      conditions: ["月令七杀星透出天干", "有食神制杀或印星化杀", "杀星有制化为权", "身强足以任杀"],
      supportingGod: `食神(制杀)或印星(化杀)`,
      description: "七杀凶神，须制化方能为用。食神制杀、印绶化杀均为成格。杀无制化为害，身弱杀旺为凶。",
    },
    "正印格": {
      conditions: ["月令正印星透出天干", "印星不遭财破", "官印相生为佳", "身强印旺须见食伤泄秀"],
      supportingGod: `官星(生印)或食伤(泄秀)`,
      description: "正印格主贵气文秀，印绶得令须官星生印方显。身强印旺宜食伤泄秀，身弱印旺为福。",
    },
    "偏印格": {
      conditions: ["月令偏印星透出天干", "偏印需有制化（正财制偏印）", "或见食神引化"],
      supportingGod: `正财(制偏印)或比肩(分担)`,
      description: "偏印格（枭神格）须制化，偏印夺食非吉，须正财制偏印或比肩分担方为成格。",
    },
    "正财格": {
      conditions: ["月令正财星透出天干", "财星有食伤来生", "官星护财", "身强足以任财"],
      supportingGod: `食伤(生财)或官星(护财)`,
      description: "正财格富格之基，财旺须身强方可任之。食伤生财为富之源，官星护财可免劫夺。",
    },
    "偏财格": {
      conditions: ["月令偏财星透出天干", "偏财有食伤来生", "身强能任财", "财不遭劫夺"],
      supportingGod: `食伤(生财)或官星(护财)`,
      description: "偏财格主横财大富，偏财得令透干且身强，方可驾驭。食伤生财源源不断，官星护财不受劫夺。",
    },
    "食神格": {
      conditions: ["月令食神星透出天干", "食神有财星引化", "不遭偏印来夺", "身强食旺为佳"],
      supportingGod: `财星(引化食神)`,
      description: "食神格主福寿温厚，食神泄秀须有财星引化。食神生财为顺局，忌偏印夺食。",
    },
    "伤官格": {
      conditions: ["月令伤官星透出天干", "伤官有财星引化或印星制伏", "不遭官星冲克", "身强伤旺为吉"],
      supportingGod: `财星(引化)或印星(制伤)`,
      description: "伤官格聪明傲气，须财星引化或印星制伏。伤官生财为佳，伤官配印为贵，忌伤官见官。",
    },
    "建禄格": {
      conditions: ["月令为日主禄位", "身强须见财官", "有财官则贵", "无财官则为孤旺"],
      supportingGod: `财星(养命)或官星(显贵)`,
      description: "建禄格日主得令身强，喜财官为用。建禄生提纲，有财官为贵，无财官则贫寒无依。",
    },
    "阳刃格": {
      conditions: ["月令为日主羊刃位", "阳刃须有制化（七杀制刃/官星制刃）", "有财官印绶配刃", "忌无制而逞凶"],
      supportingGod: `七杀(制刃)或官星(抚刃)`,
      description: "阳刃格刚暴之格，须官杀制刃方能成器。阳刃驾杀、官星抚刃均为大贵之格。无制则为凶。",
    },
  };

  return condMap[patternName] || {
    conditions: ["格局须透干得令", "有相神配合"],
    supportingGod: "视格局而定",
    description: "此格较为特殊，须结合具体命局分析。",
  };
}

// ==================== 破格检测 ====================

interface BrokenCheck {
  pattern: string;
  breaks: string[];
  remedy?: string;
}

function detectBrokenPatterns(
  patternName: string,
  allGans: string[],
  riGan: string,
): BrokenCheck[] {
  const result: BrokenCheck[] = [];
  const shiShenMap = allGans.map(g => ({ gan: g, ss: calcShiShen(riGan, g) }));

  if (patternName === "正官格") {
    if (shiShenMap.some(s => s.ss === "伤官")) {
      result.push({
        pattern: "正官格",
        breaks: ["四柱见伤官，伤官克破官星"],
        remedy: "若有印星制伤官（印制伤护官），则可救应",
      });
    }
    if (shiShenMap.some(s => s.ss === "七杀")) {
      result.push({
        pattern: "正官格",
        breaks: ["官杀混杂，正官不清"],
        remedy: "须去杀留官或去官留杀（合杀留官为佳）",
      });
    }
  }

  if (patternName === "七杀格") {
    const hasShiShen = shiShenMap.some(s => s.ss === "食神");
    const hasYin = shiShenMap.some(s => s.ss === "正印" || s.ss === "偏印");
    if (!hasShiShen && !hasYin) {
      result.push({
        pattern: "七杀格",
        breaks: ["七杀无制（无食神制杀/无印星化杀），凶神逞威"],
        remedy: "须大运逢食神或印星方可化解",
      });
    }
  }

  if (patternName === "食神格") {
    if (shiShenMap.some(s => s.ss === "偏印")) {
      result.push({
        pattern: "食神格",
        breaks: ["偏印夺食，福神受损"],
        remedy: "若有财星制偏印（财破印护食），则可化解",
      });
    }
  }

  if (patternName === "伤官格") {
    if (shiShenMap.some(s => s.ss === "正官")) {
      result.push({
        pattern: "伤官格",
        breaks: ["伤官见官，为祸百端"],
        remedy: "须印星制伤官护官，或财星通关化解伤官克官",
      });
    }
  }

  if (patternName === "正印格" || patternName === "偏印格") {
    if (shiShenMap.some(s => s.ss === "正财" || s.ss === "偏财")) {
      result.push({
        pattern: patternName,
        breaks: ["财星破印，贵气受损"],
        remedy: "须官星通关（财生官、官生印），或比劫制财护印",
      });
    }
  }

  if (patternName === "正财格" || patternName === "偏财格") {
    if (shiShenMap.some(s => s.ss === "劫财")) {
      result.push({
        pattern: patternName,
        breaks: ["劫财夺财，财富难聚"],
        remedy: "须官星制劫财护财，或食伤泄劫生财",
      });
    }
  }

  if (patternName === "阳刃格") {
    const hasGuanSha = shiShenMap.some(s => s.ss === "七杀" || s.ss === "正官");
    if (!hasGuanSha) {
      result.push({
        pattern: "阳刃格",
        breaks: ["阳刃无制，刚暴不羁"],
        remedy: "须官杀制刃，或印星化刃生身",
      });
    }
  }

  return result;
}

// ==================== 日主强弱快速评估 ====================

function quickStrength(riGan: string, riWx: string, yueZhi: string, allGans: string[], allZhis: string[]): number {
  const shengWo: Record<string, string> = { "木": "水", "火": "木", "土": "火", "金": "土", "水": "金" };
  const keWo: Record<string, string> = { "木": "金", "火": "水", "土": "木", "金": "火", "水": "土" };

  let s = 0;
  const yueWx = ZHI_WU_XING[yueZhi];
  if (yueWx === riWx) s += 40;
  else if (yueWx === shengWo[riWx]) s += 25;
  else if (yueWx === keWo[riWx]) s -= 30;

  for (const g of allGans) {
    if (g === riGan) continue;
    const wx = GAN_WU_XING[g];
    if (wx === riWx) s += 12;
    else if (wx === shengWo[riWx]) s += 8;
    else if (wx === keWo[riWx]) s -= 8;
  }

  for (const z of allZhis) {
    if (z === yueZhi) continue;
    const wx = ZHI_WU_XING[z];
    if (wx === riWx) s += 8;
    else if (wx === shengWo[riWx]) s += 5;
    else if (wx === keWo[riWx]) s -= 6;
  }

  return s;
}

// ==================== 主计算函数 ====================

export function calculateGeJuXiangJie(input: GeJuXiangJieInput): GeJuXiangJieResult {
  const { yearPillar, monthPillar, dayPillar, hourPillar, gender } = input;

  const yearGan = yearPillar[0];
  const yearZhi = yearPillar.slice(1);
  const monthGan = monthPillar[0];
  const monthZhi = monthPillar.slice(1);
  const dayGan = dayPillar[0];
  const dayZhi = dayPillar.slice(1);
  const hourGan = hourPillar[0];
  const hourZhi = hourPillar.slice(1);

  const allGans = [yearGan, monthGan, dayGan, hourGan];
  const allZhis = [yearZhi, monthZhi, dayZhi, hourZhi];
  const riWx = GAN_WU_XING[dayGan];
  const yueWx = ZHI_WU_XING[monthZhi];

  const analysis: string[] = [];
  analysis.push(`日主${dayGan}(${riWx})生于${monthZhi}月（月令${yueWx}），性别${gender}。`);

  // ── 一、月令格局 ──
  const monthWxGans = WX_GANS[yueWx] || [];

  // 判断月令是否透出天干
  let patternGan = "";
  let patternShen = "";
  let formed = false;

  // 月干优先
  if (monthWxGans.includes(monthGan)) {
    patternGan = monthGan;
  }
  // 年干
  else if (monthWxGans.includes(yearGan)) {
    patternGan = yearGan;
  }
  // 时干
  else if (monthWxGans.includes(hourGan)) {
    patternGan = hourGan;
  }

  // 月令为日主同气 → 建禄/阳刃
  const isLu = LU_MAP[dayGan] === monthZhi;
  const isRen = REN_MAP[dayGan] === monthZhi;

  if (patternGan && patternGan !== dayGan) {
    // 月令透出且非日主
    patternShen = calcShiShen(dayGan, patternGan);
  } else if (isLu) {
    patternGan = dayGan;
    patternShen = "比肩"; // → 建禄格
  } else if (isRen) {
    patternGan = dayGan;
    patternShen = "劫财"; // → 阳刃格
  } else if (riWx === yueWx) {
    // 日主同月令五行但非禄非刃
    patternGan = dayGan;
    patternShen = "比肩";
  } else {
    // 月令不透，以月令本气十神定格
    const cangGan = ZHI_CANG[monthZhi]?.[0] || monthWxGans[0] || "甲";
    patternGan = cangGan;
    patternShen = calcShiShen(dayGan, cangGan);
  }

  const patternName = SHI_SHEN_PATTERN[patternShen] || `${patternShen}格`;

  // 判断成格条件
  const condInfo = getPatternConditions(patternName, riWx);

  // 自动判定成格（简化规则）
  if (patternName === "正官格") {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const hasCai = allGans.some(g => calcShiShen(dayGan, g) === "正财" || calcShiShen(dayGan, g) === "偏财");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const hasYin = allGans.some(g => calcShiShen(dayGan, g) === "正印" || calcShiShen(dayGan, g) === "偏印");
    const hasShang = allGans.some(g => calcShiShen(dayGan, g) === "伤官");
    formed = !hasShang && patternGan !== dayGan;
    if (!formed) analysis.push("正官格：月令透官但见伤官破格，或官星不透。");
    else analysis.push("正官格：月令官星透出天干，清正可取。");
  } else if (patternName === "七杀格") {
    const hasShi = allGans.some(g => calcShiShen(dayGan, g) === "食神");
    const hasYin = allGans.some(g => calcShiShen(dayGan, g) === "正印" || calcShiShen(dayGan, g) === "偏印");
    formed = (hasShi || hasYin) && patternGan !== dayGan;
    if (!formed) analysis.push("七杀格：杀虽得令但乏制化，格局有损。");
    else analysis.push(`七杀格：日主${dayGan}见杀有${hasShi ? "食神制" : ""}${hasYin ? "印星化" : ""}，杀化为权。`);
  } else if (patternName === "食神格") {
    const hasPianYin = allGans.some(g => calcShiShen(dayGan, g) === "偏印");
    formed = !hasPianYin && patternGan !== dayGan;
    if (!formed) analysis.push("食神格：偏印夺食，格局受损。");
    else analysis.push("食神格：食神透干有气，福寿可期。");
  } else if (patternName === "阳刃格") {
    const hasGuanSha = allGans.some(g => {
      const ss = calcShiShen(dayGan, g);
      return ss === "正官" || ss === "七杀";
    });
    formed = hasGuanSha;
    if (!formed) analysis.push("阳刃格：刃旺无官杀制伏，格局不纯。");
    else analysis.push("阳刃格：刃星得官杀制伏，刚暴有制。");
  } else {
    // 通用判定：透出即半成
    formed = patternGan !== dayGan || isLu || isRen;
    analysis.push(`${patternName}：月令之气${patternGan ? `透于天干（${patternGan}）` : "不透"}，格局${formed ? "基本成立" : "难以成立"}。`);
  }

  const strengthScore = quickStrength(dayGan, riWx, monthZhi, allGans, allZhis);

  const monthPattern = {
    name: patternName,
    type: (isLu || isRen) ? "变格" as const : "正格" as const,
    category: (patternShen === "正财" || patternShen === "偏财") ? "财格" as const
      : (patternShen === "正官" || patternShen === "七杀") ? "官格" as const
      : (patternShen === "正印" || patternShen === "偏印") ? "印格" as const
      : (patternShen === "食神" || patternShen === "伤官") ? "食伤格" as const
      : isLu ? "建禄格" as const
      : isRen ? "羊刃格" as const
      : "其他" as const,
    conditions: condInfo.conditions,
    formed,
    supportingGod: condInfo.supportingGod,
    source: PATTERN_SOURCES[patternName] || "《三命通会》",
    description: condInfo.description,
  };

  // ── 二、其他可能格局 ──
  const alternativePatterns: { name: string; type: string; category: string; conditions: string[]; formed: boolean; supportingGod: string; source: string; description: string }[] = [];

  // 检测化气格
  const heGan = GAN_HE[dayGan];
  if (heGan && (monthGan === heGan || hourGan === heGan)) {
    const heWx = GAN_WU_XING[heGan];
    const heSupport = allGans.filter(g => GAN_WU_XING[g] === heWx).length >= 2;
    alternativePatterns.push({
      name: `化${heWx}格（${dayGan}${heGan}合化）`,
      type: "特殊格局" as const,
      category: "化格" as const,
      conditions: [
        `日干${dayGan}与${heGan}相合`,
        `月令${monthZhi}化神${heWx}当令或有根`,
        "四柱无克破化神者",
        "化神有生扶",
      ],
      formed: heSupport && (yueWx === heWx || allZhis.some(z => ZHI_WU_XING[z] === heWx)),
      supportingGod: `化神${heWx}(助化)`,
      source: "《渊海子平》·化气十段锦",
      description: `${dayGan}${heGan}合化为${heWx}，须化神得令得地，四柱无克破化神方为真化。`,
    });
  }

  // 检测从格
  if (strengthScore >= 55) {
    const allSupport = allGans.filter(g => g !== dayGan).every(g => {
      const ss = calcShiShen(dayGan, g);
      return ["比肩", "劫财", "正印", "偏印"].includes(ss);
    });
    if (allSupport) {
      alternativePatterns.push({
        name: "从强格",
        type: "特殊格局" as const,
        category: "从格" as const,
        conditions: ["日主极旺，全局生扶", "无官杀克身", "无食伤泄秀", "顺其旺势为用"],
        formed: true,
        supportingGod: `${riWx}(助旺)`,
        source: "《滴天髓》·从象篇",
        description: "日主极旺，全局皆生扶比助，无一克泄耗，顺其旺势而行，为从强格。",
      });
    }
  }

  if (strengthScore <= -50) {
    const allWeaken = allGans.filter(g => g !== dayGan).every(g => {
      const ss = calcShiShen(dayGan, g);
      return ["正官", "七杀", "正财", "偏财", "食神", "伤官"].includes(ss);
    });
    if (allWeaken) {
      alternativePatterns.push({
        name: "从弱格",
        type: "特殊格局" as const,
        category: "从格" as const,
        conditions: ["日主极弱，全局克泄耗", "无印比生扶", "顺势从弱"],
        formed: true,
        supportingGod: "克泄耗日主之五行",
        source: "《滴天髓》·从象篇",
        description: "日主极弱无依，全局克泄耗，顺势从弱为佳，忌印比扶身。",
      });
    }
  }

  // ── 三、层次判定 ──
  let quality: "上等" | "中等" | "下等";
  if (formed && strengthScore > -10 && strengthScore < 40) {
    quality = "上等";
  } else if (formed || (strengthScore > -30 && strengthScore < 50)) {
    quality = "中等";
  } else {
    quality = "下等";
  }

  analysis.push(`层次评定：${quality === "上等" ? "格局端整，用神得力，层次上等。" : quality === "中等" ? "格局有瑕疵或用神偏弱，层次中等。" : "格局不全或用神无力，层次下等。"}`);

  // ── 四、破格 ──
  const brokenPatterns = detectBrokenPatterns(patternName, allGans, dayGan);
  for (const bp of brokenPatterns) {
    analysis.push(`破格：${bp.breaks.join("；")}${bp.remedy ? `。救应：${bp.remedy}` : ""}`);
  }

  // 综合补充
  if (alternativePatterns.length > 0) {
    analysis.push(`另有${alternativePatterns.length}个可能格局，详见"其他可能格局"列表。`);
  }

  analysis.push(`综合：此命以${patternName}为主格，日主${dayGan}(${riWx})${strengthScore >= 15 ? "身强" : strengthScore <= -15 ? "身弱" : "中和"}（评分约${Math.round(strengthScore + 50)}/100），${formed ? "格局成立" : "格局有损"}。` +
    `${brokenPatterns.length > 0 ? `存在${brokenPatterns.length}处破格须注意。` : "未见明显破格。"}`);

  // 构建 box-drawing 摘要
  const src = PATTERN_SOURCES[patternName] || "《子平真诠》";
  const lines: string[] = [
    `┌─ 格局详解 ─────────────────`,
    `│ 日主：${dayGan}（${riWx}） 得分：${Math.round(strengthScore + 50)}/100 ${strengthScore >= 15 ? "身强" : strengthScore <= -15 ? "身弱" : "中和"}`,
    `│ 主格：${patternName} 层次：${quality} ${formed ? "格局成立" : "格局有损"}`,
    `│ 出处：${src}`,
    ``,
    `├─ 月令取格 ─────────────────`,
  ];
  if (monthPattern) {
    lines.push(`│ 月令：${monthZhi}（${yueWx}） 透干：${patternGan || "无"}`);
    lines.push(`│ ${monthPattern.description}`);
    lines.push(`│ 条件：${monthPattern.conditions.join("；")}`);
  }
  lines.push(``);
  lines.push(`├─ 层次评定 ─────────────────`);
  lines.push(`│ ${quality === "上等" ? "★ 格局端整，用神得力，层次上等" : quality === "中等" ? "◎ 格局有瑕疵或用神偏弱，层次中等" : "△ 格局不全或用神无力，层次下等"}`);
  if (brokenPatterns.length > 0) {
    lines.push(`│`);
    lines.push(`├─ 破格检测 ─────────────────`);
    for (const bp of brokenPatterns) {
      lines.push(`│ ☠ ${bp.breaks.join("；")}`);
      if (bp.remedy) lines.push(`│   救应：${bp.remedy}`);
    }
  }
  if (alternativePatterns.length > 0) {
    lines.push(`│`);
    lines.push(`├─ 其他可能格局 ───────────────`);
    for (const ap of alternativePatterns) {
      lines.push(`│ ▸ ${ap.name}（${ap.type}）— ${ap.description.slice(0, 40)}…`);
    }
  }
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《子平真诠》—— 清·沈孝瞻，「八字格局，专求月令」格局论命集大成`);
  lines.push(`│ 《渊海子平》—— 宋·徐大升，格局论命之奠基`);
  lines.push(`│ 《三命通会》—— 明·万民英，卷四至卷十二详论各格局`);
  lines.push(`│ 《滴天髓》—— 格局配合/通关/清浊/真假之精论`);
  lines.push(`│ 《命理约言》—— 清·陈素庵，格局简而明之系统总结`);
  lines.push(`│`);
  lines.push(`└─ 命理提示 ─────────────────`);
  lines.push(`   格局为八字论命之骨架，须配合喜忌用神方见真功。`);
  lines.push(`   「有格有局者，富贵可期；有格无局者，六亲冷淡。」`);
  lines.push(`   成格不破 + 用神得力 = 上命；`);
  lines.push(`   格破有救 + 运程配合 = 中命；格破无救 = 下命。`);
  const summary = lines.join("\n");

  return {
    monthPattern,
    alternativePatterns,
    quality,
    brokenPatterns,
    analysis: [...new Set(analysis)].join("\n"),
    summary,
  } as GeJuXiangJieResult & { summary: string };
}
