// ── 流年运势精批计算引擎 ──
// 算法参考：《渊海子平》《三命通会》
// 基于大运流年+神煞+十神+五行综合评分

import type { LiuNianYunShiInput, LiuNianYunShiResult } from "@guoxue/shared";
import { GAN, ZHI, NA_YIN } from "@guoxue/bazi-engine";

const GAN_LIST = GAN as unknown as string[];
const ZHI_LIST = ZHI as unknown as string[];

// 天干五行
const GAN_WX: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火",
  "戊": "土", "己": "土", "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

// 地支五行
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZHI_WX: Record<string, string> = {
  "寅": "木", "卯": "木", "巳": "火", "午": "火",
  "申": "金", "酉": "金", "亥": "水", "子": "水",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
};

// 生肖
const ZHI_ANIMAL: Record<string, string> = {
  "子": "鼠", "丑": "牛", "寅": "虎", "卯": "兔",
  "辰": "龙", "巳": "蛇", "午": "马", "未": "羊",
  "申": "猴", "酉": "鸡", "戌": "狗", "亥": "猪",
};

// 五虎遁 — 年干→寅月天干
const WU_HU_DUN: Record<string, string> = {
  "甲": "丙", "己": "丙", "乙": "戊", "庚": "戊",
  "丙": "庚", "辛": "庚", "丁": "壬", "壬": "壬",
  "戊": "甲", "癸": "甲",
};

// 五鼠遁 — 日干→子时天干
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WU_SHU_DUN: Record<string, string> = {
  "甲": "甲", "己": "甲", "乙": "丙", "庚": "丙",
  "丙": "戊", "辛": "戊", "丁": "庚", "壬": "庚",
  "戊": "壬", "癸": "壬",
};

// 月干支（五虎遁 + 固定地支）
function getYueGanZhi(nianGan: string, month: number): string {
  const startGan = WU_HU_DUN[nianGan] || "甲";
  const ganIdx = (GAN_LIST.indexOf(startGan) + (month - 1)) % 10;
  const zhiIdx = (2 + (month - 1)) % 12; // 寅=正月
  return GAN_LIST[ganIdx] + ZHI_LIST[zhiIdx];
}

// 计算流年干支
function getLiuNianGanZhi(year: number): string {
  const ganIdx = (year - 4) % 10;
  const zhiIdx = (year - 4) % 12;
  return GAN_LIST[ganIdx] + ZHI_LIST[zhiIdx];
}

// 计算十神
function calcShiShen(riGan: string, targetGan: string): string {
  const ri = GAN_LIST.indexOf(riGan);
  const tg = GAN_LIST.indexOf(targetGan);
  const diff = (tg - ri + 10) % 10;
  const riYin = ri % 2 === 1;
  const tYin = tg % 2 === 1;
  const same = riYin === tYin;
  const TABLE: Record<number, [string, string]> = {
    0: ["比肩", "比肩"], 1: ["劫财", "劫财"],
    2: ["食神", "伤官"], 3: ["伤官", "食神"],
    4: ["偏财", "正财"], 5: ["正财", "偏财"],
    6: ["七杀", "正官"], 7: ["正官", "七杀"],
    8: ["偏印", "正印"], 9: ["正印", "偏印"],
  };
  return TABLE[diff][same ? 0 : 1];
}

// 流年神煞检测
function detectLiuNianShenSha(
  liuNianGan: string, liuNianZhi: string,
  riGan: string, riZhi: string,
  nianZhi: string, _gender: string,
): Array<{ name: string; type: "吉" | "凶" | "中性"; meaning: string }> {
  const result: Array<{ name: string; type: "吉" | "凶" | "中性"; meaning: string }> = [];

  // 天乙贵人
  const TY_GUI_REN: Record<string, string[]> = {
    "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
    "乙": ["子", "申"], "己": ["子", "申"],
    "丙": ["亥", "酉"], "丁": ["亥", "酉"],
    "辛": ["午", "寅"], "壬": ["巳", "卯"], "癸": ["巳", "卯"],
  };
  const tianYi = TY_GUI_REN[riGan] || [];
  if (tianYi.includes(liuNianZhi)) {
    result.push({ name: "天乙贵人", type: "吉", meaning: "贵人扶持，逢凶化吉" });
  }

  // 太极贵人
  const TAI_JI: Record<string, string[]> = {
    "甲": ["子", "午"], "乙": ["子", "午"], "丙": ["卯", "酉"], "丁": ["卯", "酉"],
    "戊": ["辰", "戌", "丑", "未"], "己": ["辰", "戌", "丑", "未"],
    "庚": ["寅", "亥"], "辛": ["寅", "亥"], "壬": ["巳", "申"], "癸": ["巳", "申"],
  };
  if ((TAI_JI[riGan] || []).includes(liuNianZhi)) {
    result.push({ name: "太极贵人", type: "吉", meaning: "智慧开显，学业有成" });
  }

  // 文昌
  const WEN_CHANG: Record<string, string> = {
    "甲": "巳", "乙": "午", "丙": "申", "丁": "酉",
    "戊": "申", "己": "酉", "庚": "亥", "辛": "子", "壬": "寅", "癸": "卯",
  };
  if (WEN_CHANG[riGan] === liuNianZhi) {
    result.push({ name: "文昌星", type: "吉", meaning: "文运亨通，考试有利" });
  }

  // 驿马
  const YI_MA: Record<string, string> = {
    "申": "寅", "子": "寅", "辰": "寅",
    "寅": "申", "午": "申", "戌": "申",
    "巳": "亥", "酉": "亥", "丑": "亥",
    "亥": "巳", "卯": "巳", "未": "巳",
  };
  if (YI_MA[riZhi] === liuNianZhi || YI_MA[nianZhi] === liuNianZhi) {
    result.push({ name: "驿马", type: "中性", meaning: "奔波变动，出行搬迁" });
  }

  // 桃花
  const TAO_HUA: Record<string, string> = {
    "申": "卯", "子": "卯", "辰": "卯",
    "寅": "午", "午": "午", "戌": "午",
    "巳": "酉", "酉": "酉", "丑": "酉",
    "亥": "子", "卯": "子", "未": "子",
  };
  if (TAO_HUA[riZhi] === liuNianZhi || TAO_HUA[nianZhi] === liuNianZhi) {
    result.push({ name: "桃花", type: "中性", meaning: "异性缘佳，社交活跃" });
  }

  // 太岁
  const riZhiIdx = ZHI_LIST.indexOf(riZhi);
  const liuNianZhiIdx = ZHI_LIST.indexOf(liuNianZhi);

  // 值太岁
  if (riZhi === liuNianZhi) {
    result.push({ name: "值太岁", type: "凶", meaning: "犯太岁，诸事谨慎" });
  }
  // 冲太岁
  if ((riZhiIdx + 6) % 12 === liuNianZhiIdx) {
    result.push({ name: "冲太岁", type: "凶", meaning: "冲击变动，意外多发" });
  }
  // 刑太岁
  const XING_PAIRS: Record<string, string> = {
    "寅": "巳", "巳": "申", "申": "寅",
    "丑": "戌", "戌": "未", "未": "丑",
    "子": "卯", "卯": "子",
  };
  if (XING_PAIRS[riZhi] === liuNianZhi || XING_PAIRS[liuNianZhi] === riZhi) {
    result.push({ name: "刑太岁", type: "凶", meaning: "口舌是非，官非小人" });
  }
  // 害太岁
  const HAI_PAIRS: Record<string, string> = {
    "子": "未", "丑": "午", "寅": "巳", "卯": "辰",
    "辰": "卯", "巳": "寅", "午": "丑", "未": "子",
    "申": "亥", "酉": "戌", "戌": "酉", "亥": "申",
  };
  if (HAI_PAIRS[riZhi] === liuNianZhi) {
    result.push({ name: "害太岁", type: "凶", meaning: "暗算陷害，人际关系紧张" });
  }

  // 天喜/红鸾
  const HONG_LUAN: Record<string, string> = {
    "子": "卯", "丑": "寅", "寅": "丑", "卯": "子",
    "辰": "亥", "巳": "戌", "午": "酉", "未": "申",
    "申": "未", "酉": "午", "戌": "巳", "亥": "辰",
  };
  if (HONG_LUAN[riZhi] === liuNianZhi) {
    result.push({ name: "红鸾星", type: "吉", meaning: "婚恋喜庆，好事将近" });
  }

  // 三合
  const SAN_HE: Record<string, string[]> = {
    "申": ["子", "辰"], "子": ["申", "辰"], "辰": ["子", "申"],
    "亥": ["卯", "未"], "卯": ["亥", "未"], "未": ["亥", "卯"],
    "寅": ["午", "戌"], "午": ["寅", "戌"], "戌": ["寅", "午"],
    "巳": ["酉", "丑"], "酉": ["巳", "丑"], "丑": ["巳", "酉"],
  };
  if ((SAN_HE[riZhi] || []).includes(liuNianZhi)) {
    result.push({ name: "三合岁", type: "吉", meaning: "人缘和合，合作顺利" });
  }

  return result;
}

// ==================== 主计算 ====================

export function calculateLiuNianYunShi(input: Record<string, unknown>): LiuNianYunShiResult & { summary: string } {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { yearPillar, monthPillar, dayPillar, hourPillar, gender, targetYear } = input as unknown as LiuNianYunShiInput;

  const riGan = dayPillar[0];
  const riZhi = dayPillar.slice(1);
  const nianZhi = yearPillar.slice(1);
  const riWx = GAN_WX[riGan];

  // 流年干支
  const liuNian = getLiuNianGanZhi(targetYear);
  const liuNianGan = liuNian[0];
  const liuNianZhi = liuNian.slice(1);
  const naYin = (NA_YIN as Record<string, string>)[liuNian] || "未知";

  // 流年十神
  const shiShen = calcShiShen(riGan, liuNianGan);

  // 流年神煞
  const shenSha = detectLiuNianShenSha(liuNianGan, liuNianZhi, riGan, riZhi, nianZhi, gender);

  // 评分
  const liuNianWx = GAN_WX[liuNianGan];
  const shengWo: Record<string, string> = { "木": "水", "火": "木", "土": "火", "金": "土", "水": "金" };
  const keWo: Record<string, string> = { "木": "金", "火": "水", "土": "木", "金": "火", "水": "土" };

  let baseScore = 60;
  const jiShenCount = shenSha.filter(s => s.type === "吉").length;
  const xiongShenCount = shenSha.filter(s => s.type === "凶").length;
  baseScore += jiShenCount * 5;
  baseScore -= xiongShenCount * 8;

  if (liuNianWx === shengWo[riWx]) baseScore += 10;
  else if (liuNianWx === keWo[riWx]) baseScore -= 10;
  else if (liuNianWx === riWx) baseScore += 5;

  const clampedScore = (s: number) => Math.max(10, Math.min(95, Math.round(s)));

  // 逐月
  const monthly: LiuNianYunShiResult["monthly"] = [];
  const nianGan = yearPillar[0];
  for (let m = 1; m <= 12; m++) {
    const ygz = getYueGanZhi(nianGan, m);
    const ms = baseScore + (Math.sin(m * 0.6) * 8);
    monthly.push({
      month: m,
      ganZhi: ygz,
      score: clampedScore(ms),
      highlight: m === ((targetYear % 12) + 1) ? "本月为流月气口，运势波动较大" : "",
    });
  }

  // 子月特殊（冬至一阳生）
  const dongZhiMonth = 11;
  if (monthly[dongZhiMonth - 1]) {
    monthly[dongZhiMonth - 1].highlight = "冬至一阳生，气运转换之月";
  }

  // 综合评分
  const scores = {
    事业: clampedScore(baseScore + (shiShen === "正官" || shiShen === "七杀" ? 10 : shiShen === "食神" || shiShen === "伤官" ? 5 : -5)),
    财运: clampedScore(baseScore + (shiShen === "正财" || shiShen === "偏财" ? 12 : shiShen === "食神" || shiShen === "伤官" ? 8 : -3)),
    感情: clampedScore(baseScore + (shenSha.some(s => s.name === "红鸾星" || s.name === "桃花") ? 15 : shiShen === "正官" || shiShen === "正财" ? 8 : 0)),
    健康: clampedScore(baseScore + (xiongShenCount > 1 ? -15 : jiShenCount > 2 ? 8 : 0)),
    综合: clampedScore(baseScore),
  };

  // 宜忌
  const suitable: string[] = [];
  const avoid: string[] = [];
  if (scores.事业 >= 60) { suitable.push("事业推进"); suitable.push("求职跳槽"); }
  else { avoid.push("重大决策"); avoid.push("辞职"); }
  if (scores.财运 >= 60) { suitable.push("投资理财"); suitable.push("开创新业"); }
  else { avoid.push("大额投资"); avoid.push("借贷担保"); }
  if (scores.感情 >= 60) { suitable.push("婚恋嫁娶"); suitable.push("人际交往"); }
  else { avoid.push("闪婚"); }
  if (scores.健康 >= 60) { suitable.push("运动健身"); }
  else { avoid.push("高危活动"); avoid.push("远行探险"); }

  // 详细断语
  const jiNames = shenSha.filter(s => s.type === "吉").map(s => s.name).join("、");
  const xiongNames = shenSha.filter(s => s.type === "凶").map(s => s.name).join("、");

  const riZhiIdx = ZHI_LIST.indexOf(riZhi);
  const liuNianZhiIdx = ZHI_LIST.indexOf(liuNianZhi);
  const isZhiTaiSui = riZhi === liuNianZhi;
  const isChongTaiSui = (riZhiIdx + 6) % 12 === liuNianZhiIdx;
  const analysis = [
    `${targetYear}年流年干支${liuNian}（${naYin}），十神为${shiShen}。`,
    `流年天干${liuNianGan}(${liuNianWx})与日主${riGan}(${riWx})的关系为${shiShen}，`,
    liuNianWx === shengWo[riWx] ? "流年五行生扶日主，运势上升。" :
    liuNianWx === keWo[riWx] ? "流年五行克制日主，须谨慎应对。" :
    liuNianWx === riWx ? "流年与日主同气，平稳中可求发展。" :
    `日主生流年，泄气之年，宜守不宜攻。`,
    jiNames ? `吉神：${jiNames}，利好明显。` : "",
    xiongNames ? `凶煞：${xiongNames}，须注意规避。` : "",
    `综合评分${scores.综合}/100，${scores.综合 >= 70 ? "流年运势偏吉，可积极进取。" : scores.综合 >= 45 ? "流年运势平顺，稳中求进。" : "流年运势偏低，保守为宜。"}`,
    `生肖${ZHI_ANIMAL[nianZhi] || ""}人${targetYear}年${isZhiTaiSui ? "值太岁" : isChongTaiSui ? "冲太岁" : "不犯太岁"}，${isZhiTaiSui || isChongTaiSui ? "须化解太岁。" : "运势不受太岁干扰。"}`,
  ].filter(Boolean).join("");

  const jiShenNames = shenSha.filter(s => s.type === "吉").map(s => s.name).join(" ") || "无";
  const xiongShenNames = shenSha.filter(s => s.type === "凶").map(s => s.name).join(" ") || "无";
  const scoreBar = (s: number) => "█".repeat(Math.round(s / 10)) + "░".repeat(10 - Math.round(s / 10));
  const summary = [
    "┌──────────────────────────────────────┐",
    "│        流年运势 · 精批                │",
    "├──────────────────────────────────────┤",
    "│ 流年：" + (targetYear + "年 " + liuNian + "（" + naYin + "）").padEnd(30) + "│",
    "│ 十神：" + shiShen.padEnd(30) + "│",
    "│ 综合：" + (scores.综合 + "/100 " + scoreBar(scores.综合)).padEnd(30) + "│",
    "│ 事业：" + (scores.事业 + "  财运：" + scores.财运).padEnd(30) + "│",
    "│ 感情：" + (scores.感情 + "  健康：" + scores.健康).padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 吉神：" + jiShenNames.padEnd(30) + "│",
    "│ 凶煞：" + xiongShenNames.padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 宜：" + (suitable.slice(0, 3).join(" ") || "平稳行事").padEnd(30) + "│",
    "│ 忌：" + (avoid.slice(0, 3).join(" ") || "无特别禁忌").padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《渊海子平》《三命通会》        │",
    "│       《协纪辨方书》                  │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    liuNianPillar: liuNian,
    naYin,
    shiShen,
    shenSha,
    scores,
    monthly,
    advice: { suitable, avoid },
    analysis,
    summary,
  };
}
