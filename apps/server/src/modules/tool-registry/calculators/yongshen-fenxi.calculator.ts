// ── 用神喜忌分析计算引擎 ──
// 算法参考：《渊海子平》《子平真诠》《滴天髓》
// 基于《子平真诠》《穷通宝鉴》《三命通会》等典籍
// 日主旺衰 → 扶抑/调候/通关用神 → 喜忌判断

import type { YongShenFenXiInput, YongShenFenXiResult } from "@guoxue/shared";
import { GAN, ZHI } from "@guoxue/bazi-engine";

// ==================== 五行基础映射 ====================

const GAN_WU_XING: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火",
  "戊": "土", "己": "土", "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

const GAN_YIN_YANG: Record<string, string> = {
  "甲": "阳", "乙": "阴", "丙": "阳", "丁": "阴",
  "戊": "阳", "己": "阴", "庚": "阳", "辛": "阴",
  "壬": "阳", "癸": "阴",
};

const ZHI_WU_XING: Record<string, string> = {
  "寅": "木", "卯": "木", "巳": "火", "午": "火",
  "申": "金", "酉": "金", "亥": "水", "子": "水",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
};

// 地支藏干（主气）
const ZHI_CANG_GAN: Record<string, string[]> = {
  "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"],
  "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "戊", "庚"],
  "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"],
  "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "戊"],
};

const WU_XING_LIST = ["木", "火", "土", "金", "水"];

// 五行生克
const SHENG_MAP: Record<string, string> = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
const KE_MAP: Record<string, string> = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };
const BEI_SHENG: Record<string, string> = { "火": "木", "土": "火", "金": "土", "水": "金", "木": "水" };
const BEI_KE: Record<string, string> = { "土": "木", "水": "土", "火": "水", "金": "火", "木": "金" };

// 月令旺衰表
const YUE_LING_QIANG_DU: Record<string, Record<string, string>> = {
  "木": { "寅": "旺", "卯": "旺", "辰": "休", "巳": "休", "午": "休", "未": "囚", "申": "死", "酉": "死", "戌": "囚", "亥": "相", "子": "相", "丑": "囚" },
  "火": { "寅": "相", "卯": "相", "辰": "休", "巳": "旺", "午": "旺", "未": "休", "申": "囚", "酉": "囚", "戌": "休", "亥": "死", "子": "死", "丑": "囚" },
  "土": { "寅": "死", "卯": "死", "辰": "旺", "巳": "相", "午": "相", "未": "旺", "申": "休", "酉": "休", "戌": "旺", "亥": "囚", "子": "囚", "丑": "旺" },
  "金": { "寅": "囚", "卯": "囚", "辰": "相", "巳": "死", "午": "死", "未": "相", "申": "旺", "酉": "旺", "戌": "相", "亥": "休", "子": "休", "丑": "相" },
  "水": { "寅": "休", "卯": "休", "辰": "死", "巳": "囚", "午": "囚", "未": "死", "申": "相", "酉": "相", "戌": "死", "亥": "旺", "子": "旺", "丑": "死" },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const QIANG_DU_LABEL: Record<string, string> = {
  "旺": "旺", "相": "相", "休": "休", "囚": "囚", "死": "死",
};

// 月令季节
const ZHI_SEASON: Record<string, string> = {
  "寅": "春", "卯": "春", "辰": "春末",
  "巳": "夏", "午": "夏", "未": "夏末",
  "申": "秋", "酉": "秋", "戌": "秋末",
  "亥": "冬", "子": "冬", "丑": "冬末",
};

// ==================== 调候数据库（穷通宝鉴精华） ====================

interface TiaoHouRule {
  monthBranches: string[];
  needed: boolean;
  description: string;
  recommended: string[];
}

const TIAO_HOU_RULES: Record<string, TiaoHouRule[]> = {
  "甲": [
    { monthBranches: ["子", "丑"], needed: true, description: "冬木寒凝，急须火暖局", recommended: ["丙", "丁", "巳", "午"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏木枯焦，须水润泽", recommended: ["壬", "癸", "亥", "子"] },
  ],
  "乙": [
    { monthBranches: ["子", "丑"], needed: true, description: "寒木须向阳，喜丙火暖局", recommended: ["丙", "巳", "午"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏木枯稿，须癸水滋养", recommended: ["癸", "子", "亥"] },
  ],
  "丙": [
    { monthBranches: ["子", "丑"], needed: true, description: "冬火微弱，须甲乙生扶", recommended: ["甲", "乙", "寅", "卯"] },
    { monthBranches: ["巳", "午", "未"], needed: false, description: "夏火炎炎，须壬水调候", recommended: ["壬", "癸", "亥", "子"] },
  ],
  "丁": [
    { monthBranches: ["子", "丑"], needed: true, description: "冬火将熄，须甲木引火", recommended: ["甲", "寅"] },
    { monthBranches: ["巳", "午", "未"], needed: false, description: "夏火过旺，喜金发水源", recommended: ["庚", "辛", "申", "酉"] },
  ],
  "戊": [
    { monthBranches: ["子", "丑"], needed: true, description: "冬土寒凝，须丙火解冻", recommended: ["丙", "巳", "午"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏土焦裂，须水润泽", recommended: ["壬", "癸", "子", "亥"] },
  ],
  "己": [
    { monthBranches: ["子", "丑"], needed: true, description: "冻土不生，须丙火温暖", recommended: ["丙", "巳", "午"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "火炎土燥，须壬癸润泽", recommended: ["壬", "癸", "子", "亥"] },
  ],
  "庚": [
    { monthBranches: ["子", "丑"], needed: true, description: "金寒水冷，须丁火暖局", recommended: ["丁", "午"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏金销熔，须水淬炼", recommended: ["壬", "癸", "子", "亥"] },
  ],
  "辛": [
    { monthBranches: ["子", "丑"], needed: true, description: "寒金须火暖，喜丙丁", recommended: ["丙", "丁", "巳", "午"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏金熔融，须壬水解炎", recommended: ["壬", "亥"] },
  ],
  "壬": [
    { monthBranches: ["子", "丑"], needed: false, description: "冬水极旺，须戊土制水", recommended: ["戊", "辰", "戌", "未", "丑"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏水干涸，须金发水源", recommended: ["庚", "辛", "申", "酉"] },
  ],
  "癸": [
    { monthBranches: ["子", "丑"], needed: false, description: "冬水泛滥，须戊土筑堤", recommended: ["戊", "辰", "戌", "未", "丑"] },
    { monthBranches: ["巳", "午", "未"], needed: true, description: "夏水枯竭，须金生水", recommended: ["庚", "辛", "申", "酉"] },
  ],
};

// ==================== 十神映射 ====================

// 计算十神
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calcShiShenSimple(riGan: string, targetGan: string): string {
  const riIdx = GAN.indexOf(riGan as any);
  const tIdx = GAN.indexOf(targetGan as any);
  const diff = (tIdx - riIdx + 10) % 10;
  const riYin = (GAN_YIN_YANG[riGan] === "阴");
  const tYin = (GAN_YIN_YANG[targetGan] === "阴");
  const sameYinYang = riYin === tYin;

  const SHI_SHEN_TABLE: Record<number, [string, string]> = {
    0: ["比肩", "比肩"],
    1: ["劫财", "劫财"],
    2: ["食神", "伤官"],
    3: ["伤官", "食神"],
    4: ["偏财", "正财"],
    5: ["正财", "偏财"],
    6: ["七杀", "正官"],
    7: ["正官", "七杀"],
    8: ["偏印", "正印"],
    9: ["正印", "偏印"],
  };

  return SHI_SHEN_TABLE[diff][sameYinYang ? 0 : 1];
}

// ==================== 主计算函数 ====================

export function calculateYongShenFenXi(input: YongShenFenXiInput): YongShenFenXiResult {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { yearPillar, monthPillar, dayPillar, hourPillar, gender, solarAdjustment } = input;

  // 1. 解析四柱
  const pillars = [
    { label: "年柱", gan: yearPillar[0], zhi: yearPillar.slice(1) },
    { label: "月柱", gan: monthPillar[0], zhi: monthPillar.slice(1) },
    { label: "日柱", gan: dayPillar[0], zhi: dayPillar.slice(1) },
    { label: "时柱", gan: hourPillar[0], zhi: hourPillar.slice(1) },
  ];

  const riGan = pillars[2].gan;
  const riZhi = pillars[2].zhi;
  const riWx = GAN_WU_XING[riGan];
  const riYinYang = GAN_YIN_YANG[riGan];
  const yueZhi = pillars[1].zhi;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const yueGan = pillars[1].gan;

  // 2. 日主信息
  const dayMaster = {
    stem: riGan,
    element: riWx,
    yinYang: riYinYang,
  };

  // 3. 月令旺衰
  const season = ZHI_SEASON[yueZhi] || "未知";
  const strengthLabel = YUE_LING_QIANG_DU[riWx]?.[yueZhi] || "休";
  const monthOrder = {
    branch: yueZhi,
    season,
    strength: strengthLabel as "旺" | "相" | "休" | "囚" | "死",
  };

  // 4. 五行力量分布
  const wxScores: Record<string, number> = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };
  for (const p of pillars) {
    // 天干权重
    wxScores[GAN_WU_XING[p.gan]] += 12;
    // 地支权重
    wxScores[ZHI_WU_XING[p.zhi]] += 8;
    // 藏干权重
    const cangGan = ZHI_CANG_GAN[p.zhi] || [];
    for (const cg of cangGan) {
      wxScores[GAN_WU_XING[cg]] += 4;
    }
  }

  // 归一化为百分比
  const totalScore = Object.values(wxScores).reduce((a, b) => a + b, 0);
  const elementDistribution: Record<string, number> = {};
  for (const wx of WU_XING_LIST) {
    elementDistribution[wx] = Math.round((wxScores[wx] / totalScore) * 100);
  }

  // 5. 日主综合评分
  const shengWo = BEI_SHENG[riWx];
  const keWo = BEI_KE[riWx];
  const woSheng = SHENG_MAP[riWx];
  const woKe = KE_MAP[riWx];

  let score = 0;
  const analysis: string[] = [];

  // 月支权重最高
  const yueWx = ZHI_WU_XING[yueZhi];
  if (yueWx === riWx) { score += 40; analysis.push(`日主${riWx}生于${yueWx}月，月令同气，得令得地（+40）`); }
  else if (yueWx === shengWo) { score += 30; analysis.push(`月令${yueWx}生扶日主${riWx}，得月令生助（+30）`); }
  else if (yueWx === keWo) { score -= 30; analysis.push(`月令${yueWx}克制日主${riWx}，月令为忌（-30）`); }
  else if (yueWx === woSheng) { score -= 15; analysis.push(`日主生月令${yueWx}，泄气（-15）`); }
  else if (yueWx === woKe) { score += 5; analysis.push(`日主克月令${yueWx}，耗力但有所得（+5）`); }

  // 日支
  const riZhiWx = ZHI_WU_XING[riZhi];
  if (riZhiWx === riWx) { score += 25; analysis.push(`日支${riZhi}为日主同气，坐禄得地（+25）`); }
  else if (riZhiWx === shengWo) { score += 18; analysis.push(`日支${riZhi}生扶日主（+18）`); }
  else if (riZhiWx === keWo) { score -= 20; analysis.push(`日支${riZhi}克制日主（-20）`); }
  else if (riZhiWx === woSheng) { score -= 10; analysis.push(`日主生日支${riZhi}，气泄于下（-10）`); }

  // 其他天干
  const otherGans = [pillars[0].gan, pillars[1].gan, pillars[3].gan];
  for (const g of otherGans) {
    if (g === riGan) continue;
    const wx = GAN_WU_XING[g];
    if (wx === riWx) { score += 12; analysis.push(`天干${g}与日主同气（+12）`); }
    else if (wx === shengWo) { score += 8; analysis.push(`天干${g}生扶日主（+8）`); }
    else if (wx === keWo) { score -= 8; analysis.push(`天干${g}克制日主（-8）`); }
    else if (wx === woSheng) { score -= 6; analysis.push(`日主生天干${g}，泄气（-6）`); }
  }

  // 其他地支
  const otherZhis = [pillars[0].zhi, pillars[3].zhi];
  for (const z of otherZhis) {
    const wx = ZHI_WU_XING[z];
    if (wx === riWx) { score += 8; }
    else if (wx === shengWo) { score += 5; }
    else if (wx === keWo) { score -= 6; }
  }

  // 真太阳时微调
  if (solarAdjustment && Math.abs(solarAdjustment) > 30) {
    const adj = solarAdjustment > 0 ? -3 : 3;
    score += adj;
    analysis.push(`真太阳时调整 ${solarAdjustment}分钟（${adj > 0 ? "+" : ""}${adj}）`);
  }

  // 6. 旺衰判断
  let strengthLevel: "极旺" | "身强" | "中和" | "身弱" | "极弱";
  if (score >= 60) strengthLevel = "极旺";
  else if (score >= 15) strengthLevel = "身强";
  else if (score >= -15) strengthLevel = "中和";
  else if (score >= -50) strengthLevel = "身弱";
  else strengthLevel = "极弱";

  const dayMasterScore = Math.max(0, Math.min(100, Math.round(50 + score)));

  // 7. 用神判断
  let yongShenPrimary: string;
  let yongShenSecondary: string[];
  let yongShenReasoning: string;
  let yongStrength: "有力" | "中等" | "偏弱";
  let xiShenStrs: string[];
  let jiShenStrs: string[];

  if (strengthLevel === "极旺" || strengthLevel === "身强") {
    // 身强用克泄耗
    const suppressOptions: string[] = [];
    if (score >= 60) {
      // 极旺优先克
      suppressOptions.push(`${keWo}(克制)`);
      suppressOptions.push(`${woSheng}(泄秀)`);
      suppressOptions.push(`${woKe}(耗财)`);
      yongShenReasoning = `日主${riWx}极旺（${dayMasterScore}分），顺其旺势须克泄耗。优先用${keWo}克制过旺日主，次以${woSheng}泄其秀气`;
    } else {
      // 身强优先泄
      suppressOptions.push(`${woSheng}(泄秀)`);
      suppressOptions.push(`${keWo}(克制)`);
      suppressOptions.push(`${woKe}(耗财)`);
      yongShenReasoning = `日主${riWx}身强（${dayMasterScore}分），宜克泄耗以求中和。优先以${woSheng}泄其旺气，次用${keWo}制衡`;
    }
    yongShenPrimary = suppressOptions[0];
    yongShenSecondary = suppressOptions.slice(1);
    xiShenStrs = [keWo, woSheng, woKe];
    jiShenStrs = [riWx, shengWo];
  } else if (strengthLevel === "极弱" || strengthLevel === "身弱") {
    // 身弱用生扶
    const supportOptions: string[] = [];
    supportOptions.push(`${shengWo}(生扶)`);
    supportOptions.push(`${riWx}(比助)`);
    yongShenPrimary = supportOptions[0];
    yongShenSecondary = supportOptions.slice(1);
    yongShenReasoning = `日主${riWx}${strengthLevel}（${dayMasterScore}分），须生扶助身。以${shengWo}生扶日主为第一用神，次取${riWx}比助`;
    xiShenStrs = [shengWo, riWx];
    jiShenStrs = [keWo, woSheng];
  } else {
    // 中和 → 调候取用
    yongShenPrimary = "调候取用";
    yongShenSecondary = ["通关为助"];
    yongShenReasoning = `日主${riWx}中和（${dayMasterScore}分），不偏不倚，以调候为用，通关为辅`;
    xiShenStrs = [];
    jiShenStrs = [];
  }

  // 判断用神在四柱中是否有根
  let yongPresent = false;
  for (const p of pillars) {
    if (GAN_WU_XING[p.gan] === keWo || GAN_WU_XING[p.gan] === shengWo) {
      yongPresent = true;
      break;
    }
    const cangGan = ZHI_CANG_GAN[p.zhi] || [];
    for (const cg of cangGan) {
      if (GAN_WU_XING[cg] === keWo || GAN_WU_XING[cg] === shengWo) {
        yongPresent = true;
        break;
      }
    }
  }

  if (yongPresent) yongStrength = "有力";
  else if (Math.abs(score) > 40) yongStrength = "偏弱";
  else yongStrength = "中等";

  // 大运支持简判
  let luckSupport = "当前十岁运干支各管五年，大运扶抑须结合具体起运时间判断。";
  if (strengthLevel === "身强" || strengthLevel === "极旺") {
    luckSupport += "身强喜行克泄耗之运（官杀/食伤/财星运），忌行印比运。";
  } else if (strengthLevel === "身弱" || strengthLevel === "极弱") {
    luckSupport += "身弱喜行生扶之运（印运/比劫运），忌行官杀/食伤运。";
  } else {
    luckSupport += "中和之命，大运或助或抑皆可，重在调候通关。";
  }

  // 8. 调候分析
  const matchedRule = TIAO_HOU_RULES[riGan]?.find(r => r.monthBranches.includes(yueZhi));
  const tiaoHou = matchedRule
    ? {
        needed: matchedRule.needed,
        season,
        description: matchedRule.description,
        recommended: matchedRule.recommended,
      }
    : {
        needed: false,
        season,
        description: `日主${riGan}生于${season}季，无需特殊调候。`,
        recommended: [],
      };

  // 9. 综合补充分析文本
  analysis.push(`综合结论：日主${riWx}${riYinYang}，生于${yueZhi}月（${season}季），${monthOrder.strength}令。`);
  analysis.push(`四柱五行分布：${WU_XING_LIST.map(w => `${w}${elementDistribution[w]}%`).join("、")}。`);

  // 扶抑分析
  if (strengthLevel === "极旺" || strengthLevel === "身强") {
    analysis.push(`扶抑分析：${yongShenReasoning}。`);
  } else if (strengthLevel === "极弱" || strengthLevel === "身弱") {
    analysis.push(`扶抑分析：${yongShenReasoning}。`);
  } else {
    analysis.push(`扶抑分析：${yongShenReasoning}。`);
  }

  // 通关分析（如果有五行交战）
  const ganWxSet = new Set(pillars.map(p => GAN_WU_XING[p.gan]));
  const hasConflict = [...ganWxSet].some(wx1 =>
    [...ganWxSet].some(wx2 => KE_MAP[wx1] === wx2)
  );
  if (hasConflict && strengthLevel !== "极旺" && strengthLevel !== "极弱") {
    const conflictPairs: string[] = [];
    for (const wx1 of ganWxSet) {
      for (const wx2 of ganWxSet) {
        if (KE_MAP[wx1] === wx2) {
          conflictPairs.push(`${wx1}克${wx2}`);
        }
      }
    }
    if (conflictPairs.length > 0) {
      analysis.push(`通关分析：四柱存在${[...new Set(conflictPairs)].join("、")}，宜用通关之神调和。`);
    }
  }

  // 病药分析
  if (strengthLevel === "极旺") {
    analysis.push(`病药分析：病在日主过旺无制，药在${keWo}制之或${woSheng}泄之，若全局无克泄则为孤旺不吉。`);
  } else if (strengthLevel === "极弱") {
    analysis.push(`病药分析：病在日主过弱无依，药在${shengWo}扶之或${riWx}助之，若全局无生扶则为从弱格。`);
  }

  // ── box-drawing 结构化总结 ──
  const wxBar = (wxName: string) => {
    const pct = elementDistribution[wxName] || 0;
    const blocks = Math.round(pct / 5);
    return `${wxName.padEnd(2, " ")} ${"█".repeat(blocks)}${"░".repeat(20 - blocks)} ${pct}%`;
  };
  const strengthEmoji = strengthLevel === "极旺" ? "🔥" : strengthLevel === "身强" ? "▲" : strengthLevel === "中和" ? "◆" : strengthLevel === "身弱" ? "▼" : "▽";
  const yongShenDisplay = yongShenPrimary + (yongShenSecondary.length > 0 ? ` → ${yongShenSecondary.join(" → ")}` : "");

  const summary = [
    `┌─ 用神喜忌分析 ─────────────────`,
    `│ 日主：${dayMaster.stem}（${dayMaster.element}·${dayMaster.yinYang}） 评分：${dayMasterScore}分 ${strengthLevel} ${strengthEmoji}`,
    `│ 月令：${monthOrder.branch}（${monthOrder.season}季·${monthOrder.strength}令）`,
    `│`,
    `├─ 五行力量分布 ──────────────`,
    `│ ${wxBar("木")}`,
    `│ ${wxBar("火")}`,
    `│ ${wxBar("土")}`,
    `│ ${wxBar("金")}`,
    `│ ${wxBar("水")}`,
    `│`,
    `├─ 用神 ────────────────────`,
    `│ 主用神：${yongShenDisplay}`,
    `│ 用神力量：${yongStrength}`,
    `│ 理据：${yongShenReasoning}`,
    `│`,
    `├─ 喜忌 ────────────────────`,
    `│ 喜神：${xiShenStrs.length > 0 ? xiShenStrs.join("、") : "调候取用，无固定喜神"}`,
    `│ 忌神：${jiShenStrs.length > 0 ? jiShenStrs.join("、") : "中和命局，无特定忌神"}`,
    `│`,
    `├─ 调候 ────────────────────`,
    `│ ${tiaoHou.needed ? "需" : "无需"}调候：${tiaoHou.description}`,
    ...(tiaoHou.recommended.length > 0 ? [`│ 推荐调候：${tiaoHou.recommended.join("、")}`] : []),
    `│`,
    `├─ 大运提示 ──────────────────`,
    `│ ${luckSupport.substring(0, 60)}`,
    ...(luckSupport.length > 60 ? [`│ ${luckSupport.substring(60, 120)}`] : []),
    `│`,
    `├─ 古籍出处 ──────────────────`,
    `│ 《子平真诠》清·沈孝瞻，格局用神之宗`,
    `│ 《穷通宝鉴》明·佚名，调候用神之经典`,
    `│ 《滴天髓》宋·京图/明·刘基注，命理哲学`,
    `│ 《渊海子平》宋·徐大升，子平法之祖`,
    `│ 「用神者，八字所用之神」——子平真诠`,
    `│`,
    `└─ 命理提示 ──────────────────`,
    `   ${strengthLevel === "极旺" || strengthLevel === "身强" ? "身强喜克泄耗，宜官杀/食伤/财星方向。" : strengthLevel === "极弱" || strengthLevel === "身弱" ? "身弱喜生扶，宜印星/比劫方向。" : "中和命局，重在调候通关，顺其自然。"}`,
    `   ${yongStrength === "有力" ? "用神得力，运势可期。" : yongStrength === "偏弱" ? "用神乏力，需后天补益。" : "用神尚可，宜顺势而为。"}`,
    `   「有病方为贵，无伤不是奇」——滴天髓`,
  ].join("\n");

  return {
    dayMaster,
    monthOrder,
    elementDistribution,
    dayMasterScore,
    strengthLevel,
    yongShen: {
      primary: yongShenPrimary,
      secondary: yongShenSecondary,
      reasoning: yongShenReasoning,
      strength: yongStrength,
      luckSupport,
    },
    xiShen: xiShenStrs,
    jiShen: jiShenStrs,
    tiaoHou,
    analysis,
    summary,
  } as YongShenFenXiResult & { summary: string };
}
