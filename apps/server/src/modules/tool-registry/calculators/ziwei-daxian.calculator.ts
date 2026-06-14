// ── 紫微大限十年吉凶计算引擎 ──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
// 大限起法：阳男阴女顺行，阴男阳女逆行；每宫十年

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

const GAN: string[] = GAN_RAW as unknown as string[];
const ZHI: string[] = ZHI_RAW as unknown as string[];

// 十二宫顺序
const GONG_NAMES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];

// 四化表（十天干四化）
const SIHUA_TABLE: Record<string, { lu: string; quan: string; ke: string; ji: string }> = {
  "甲": { lu: "廉贞", quan: "破军", ke: "武曲", ji: "太阳" },
  "乙": { lu: "天机", quan: "天梁", ke: "紫微", ji: "太阴" },
  "丙": { lu: "天同", quan: "天机", ke: "文昌", ji: "廉贞" },
  "丁": { lu: "太阴", quan: "天同", ke: "天机", ji: "巨门" },
  "戊": { lu: "贪狼", quan: "太阴", ke: "右弼", ji: "天机" },
  "己": { lu: "武曲", quan: "贪狼", ke: "天梁", ji: "文曲" },
  "庚": { lu: "太阳", quan: "武曲", ke: "太阴", ji: "天同" },
  "辛": { lu: "巨门", quan: "太阳", ke: "文曲", ji: "文昌" },
  "壬": { lu: "天梁", quan: "紫微", ke: "左辅", ji: "武曲" },
  "癸": { lu: "破军", quan: "巨门", ke: "太阴", ji: "贪狼" },
};

// 大限吉凶评分：主星权重
const STAR_LEVEL: Record<string, number> = {
  "紫微": 5, "天机": 3, "太阳": 4, "武曲": 4, "天同": 4, "廉贞": 3, "天府": 5,
  "太阴": 4, "贪狼": 3, "巨门": 1, "天相": 4, "天梁": 4, "七杀": 1, "破军": 1,
  "文昌": 2, "文曲": 2, "左辅": 3, "右弼": 3, "天魁": 3, "天钺": 3,
  "禄存": 4, "天马": 2, "擎羊": -2, "陀罗": -2, "火星": -2, "铃星": -2,
  "地空": -3, "地劫": -3, "化禄": 5, "化权": 4, "化科": 4, "化忌": -5,
};

function getStarScore(stars: string[]): number {
  let score = 0;
  for (const s of stars) {
    score += STAR_LEVEL[s] || 0;
  }
  return score;
}

function judgeLevel(score: number): "大吉" | "吉" | "平" | "凶" | "大凶" {
  if (score >= 15) return "大吉";
  if (score >= 8) return "吉";
  if (score >= 0) return "平";
  if (score >= -8) return "凶";
  return "大凶";
}

// 每宫的默认星耀配置（基于命宫主星按顺序分布）
const DEFAULT_STARS_BY_GONG: Record<string, string[]> = {
  "命宫": ["紫微", "天相"],
  "兄弟": ["天机", "天梁"],
  "夫妻": ["太阳", "巨门"],
  "子女": ["武曲", "七杀"],
  "财帛": ["天府", "廉贞"],
  "疾厄": ["天同", "文昌"],
  "迁移": ["太阴", "文曲"],
  "交友": ["贪狼", "禄存"],
  "官禄": ["天相", "左辅"],
  "田宅": ["天梁", "右弼"],
  "福德": ["七杀", "天魁"],
  "父母": ["破军", "天钺"],
};

// ── 本地类型 ──

interface SiHuaItem {
  star: string;
  huaType: "化禄" | "化权" | "化科" | "化忌";
  meaning: string;
}

interface DaXianItem {
  startAge: number;
  endAge: number;
  daXianZhi: string;
  daXianGan: string;
  gongWei: string;
  stars: string[];
  siHua: SiHuaItem[];
  level: "大吉" | "吉" | "平" | "凶" | "大凶";
  generalSummary: string;
  careerTip: string;
  wealthTip: string;
  healthTip: string;
  relationshipTip: string;
}

interface ZiWeiDaXianResult {
  mingGong: string;
  xianTianGeJu: string;
  daXianList: DaXianItem[];
  summary: string;
}

// ── 辅助 ──

/** 获取该天干的四化 */
function getSiHua(gan: string): SiHuaItem[] {
  const s = SIHUA_TABLE[gan];
  if (!s) return [];
  return [
    { star: s.lu, huaType: "化禄", meaning: "财禄丰足，机会增多，心想事成" },
    { star: s.quan, huaType: "化权", meaning: "掌权得势，主导局面，事业有成" },
    { star: s.ke, huaType: "化科", meaning: "名声显达，学业有成，科甲顺利" },
    { star: s.ji, huaType: "化忌", meaning: "阻碍挫折，需谨慎小心，宜退守" },
  ];
}

// ── 主计算 ──

export function calculateZiWeiDaXian(input: Record<string, unknown>): ZiWeiDaXianResult {
  const mingGongZhi = (input.mingGongZhi as string) || "子";
  const mingGongGan = (input.mingGongGan as string) || "甲";
  const wuXingJu = (input.wuXingJu as number) || 5;
  const gender = (input.gender as "男" | "女") || "男";
  const mingGongStars = (input.mingGongStars as string[]) || ["紫微", "天相"];
  const shenGongStars = (input.shenGongStars as string[]) || [];

  const mingGongIdx = ZHI.indexOf(mingGongZhi);
  const isYang = GAN.indexOf(mingGongGan) % 2 === 0; // 甲丙戊庚壬为阳
  const isShunXing = (isYang && gender === "男") || (!isYang && gender === "女");

  // 先天格局
  const xianTianScore = getStarScore(mingGongStars);
  const xianTianGeJu = xianTianScore >= 12 ? "命宫强旺，星曜会集，天生贵格"
    : xianTianScore >= 5 ? "格局中上，有发展潜力，中年后成就"
    : "格局平平，需后天努力和大运推动";

  // 生成十二大限
  const daXianList: DaXianItem[] = [];

  for (let i = 0; i < 12; i++) {
    const gongIdx = (mingGongIdx + (isShunXing ? i : 12 - i)) % 12;
    const gongName = GONG_NAMES[gongIdx];
    const zhi = ZHI[gongIdx];
    const gan = GAN[(GAN.indexOf(mingGongGan) + gongIdx) % 10];

    const baseStars = DEFAULT_STARS_BY_GONG[gongName] || [];
    const extraStars: string[] = [];

    // 命宫和身宫叠加主星
    if (gongName === "命宫") extraStars.push(...mingGongStars);
    if (gongName === GONG_NAMES[(mingGongIdx + 2) % 12] && shenGongStars.length > 0) extraStars.push(...shenGongStars);

    const allStars = [...new Set([...baseStars, ...extraStars])];
    const siHua = getSiHua(gan);
    const starScore = getStarScore(allStars) + (siHua.find(s => s.huaType === "化忌") ? -5 : 0)
      + (siHua.filter(s => s.huaType !== "化忌").length * 3);

    const level = judgeLevel(starScore);

    const startAge = i * 10 + wuXingJu;
    const endAge = startAge + 9;

    const generalSummaryMap: Record<string, string> = {
      "大吉": "十年好运，心想事成，诸事顺遂",
      "吉": "运势上扬，机遇增多，把握好时机",
      "平": "运势平稳，稳扎稳打，不宜冒进",
      "凶": "运势低迷，谨慎行事，以守为上",
      "大凶": "运途多舛，凡事三思，避免冒险",
    };

    daXianList.push({
      startAge, endAge, daXianZhi: zhi, daXianGan: gan, gongWei: gongName,
      stars: allStars, siHua, level,
      generalSummary: generalSummaryMap[level],
      careerTip: level === "大吉" || level === "吉" ? "积极进取，事业有突破性进展" : level === "平" ? "稳定现有工作，不宜跳槽创业" : "宜守不宜攻，避免重大投资决策",
      wealthTip: level === "大吉" || level === "吉" ? "财运亨通，投资理财有收益" : level === "平" ? "收支平衡，量入为出" : "财运欠佳，避免高风险投资",
      healthTip: level === "大吉" ? "身心康泰，精力充沛" : level === "大凶" ? "注意身体健康，定期体检" : "保持良好作息，适当运动",
      relationshipTip: level === "大吉" || level === "吉" ? "人际关系和谐，感情顺利" : level === "平" ? "感情平淡，需多沟通" : "注意口舌是非，避免冲突",
    });
  }

  const overall = daXianList.filter(d => d.level === "大吉" || d.level === "吉").length;
  const summary = `命宫在${mingGongZhi}(${mingGongGan})，${xianTianGeJu}。`
    + `十二大限中${overall}宫为吉，整体运势${
      overall >= 6 ? "较好，一生多有贵人相助" : overall >= 3 ? "中等，有起有落" : "波折较多，需自强不息"
    }。`;

  return { mingGong: `${mingGongGan}${mingGongZhi}`, xianTianGeJu, daXianList, summary };
}
