// ── 八字合婚计算引擎 ──

import type { BaziHehunResult, HehunDimension } from "@guoxue/shared";
import { calcBazi, type BaziResult, type Gan, type Zhi } from "@guoxue/bazi-engine";

// ── 生肖关系表 ──
const LIU_HE: Record<string, string> = { "鼠": "牛", "牛": "鼠", "虎": "猪", "猪": "虎", "兔": "狗", "狗": "兔", "龙": "鸡", "鸡": "龙", "蛇": "猴", "猴": "蛇", "马": "羊", "羊": "马" };
const SAN_HE: Record<string, string[]> = { "鼠": ["龙", "猴"], "牛": ["蛇", "鸡"], "虎": ["马", "狗"], "兔": ["羊", "猪"], "龙": ["鼠", "猴"], "蛇": ["牛", "鸡"], "马": ["虎", "狗"], "羊": ["兔", "猪"], "猴": ["鼠", "龙"], "鸡": ["牛", "蛇"], "狗": ["虎", "马"], "猪": ["兔", "羊"] };
const XIANG_CHONG: Record<string, string> = { "鼠": "马", "马": "鼠", "牛": "羊", "羊": "牛", "虎": "猴", "猴": "虎", "兔": "鸡", "鸡": "兔", "龙": "狗", "狗": "龙", "蛇": "猪", "猪": "蛇" };
const XIANG_HAI: Record<string, string> = { "鼠": "羊", "羊": "鼠", "牛": "马", "马": "牛", "虎": "蛇", "蛇": "虎", "兔": "龙", "龙": "兔", "狗": "鸡", "鸡": "狗", "猴": "猪", "猪": "猴" };

// ── 天干合 ──
const GAN_HE: [Gan, Gan][] = [["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]];

// ── 地支六合 ──
const ZHI_LIU_HE: [Zhi, Zhi][] = [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]];

// ── 地支六冲 ──
const ZHI_CHONG: [Zhi, Zhi][] = [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]];

// ── 五行属性 ──
const GAN_WUXING: Record<string, string> = { "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水" };

// ── 五行相生 ──
const SHENG_CHAIN = ["木", "火", "土", "金", "水"];
function isSheng(a: string, b: string): boolean {
  const ia = SHENG_CHAIN.indexOf(a);
  return SHENG_CHAIN[(ia + 1) % 5] === b;
}

function isPairIn(a: string, b: string, pairs: [string, string][]): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function analyzeShengXiao(maleXiao: string, femaleXiao: string): HehunDimension {
  const details: string[] = [];
  let score = 12;

  if (LIU_HE[maleXiao] === femaleXiao) {
    score = 20;
    details.push(`${maleXiao}${femaleXiao}六合，天作之合`);
  } else if (SAN_HE[maleXiao]?.includes(femaleXiao)) {
    score = 17;
    details.push(`${maleXiao}${femaleXiao}三合，志趣相投`);
  } else if (XIANG_CHONG[maleXiao] === femaleXiao) {
    score = 5;
    details.push(`${maleXiao}${femaleXiao}相冲，性格对立`);
  } else if (XIANG_HAI[maleXiao] === femaleXiao) {
    score = 7;
    details.push(`${maleXiao}${femaleXiao}相害，易生嫌隙`);
  } else {
    details.push(`${maleXiao}${femaleXiao}无特殊冲合，平和相处`);
  }

  return { name: "生肖关系", score, maxScore: 20, desc: details[0], details };
}

function analyzeRiZhu(male: BaziResult, female: BaziResult): HehunDimension {
  const mGan = male.siZhu.ri.gan;
  const mZhi = male.siZhu.ri.zhi;
  const fGan = female.siZhu.ri.gan;
  const fZhi = female.siZhu.ri.zhi;
  const details: string[] = [];
  let score = 10;

  if (isPairIn(mGan, fGan, GAN_HE)) {
    score += 6;
    details.push(`日干${mGan}${fGan}相合，感情融洽`);
  }
  if (isPairIn(mZhi, fZhi, ZHI_LIU_HE)) {
    score += 6;
    details.push(`日支${mZhi}${fZhi}六合，配偶宫和谐`);
  }
  if (isPairIn(mZhi, fZhi, ZHI_CHONG)) {
    score -= 6;
    details.push(`日支${mZhi}${fZhi}相冲，配偶宫冲突`);
  }

  const mWx = GAN_WUXING[mGan];
  const fWx = GAN_WUXING[fGan];
  if (mWx === fWx) {
    score += 2;
    details.push(`日主五行同属${mWx}，性情相近`);
  } else if (isSheng(mWx, fWx) || isSheng(fWx, mWx)) {
    score += 3;
    details.push(`日主${mWx}${fWx}相生，相互扶持`);
  }

  if (details.length === 0) details.push("日柱关系平和");
  return { name: "日柱配合", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc: details[0] || "日柱平和", details };
}

function analyzeWuXing(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  if (!male.wuXingEnergy || !female.wuXingEnergy) {
    return { name: "五行互补", score: 12, maxScore: 20, desc: "五行均衡", details: ["双方五行大致均衡"] };
  }

  const mE = male.wuXingEnergy;
  const fE = female.wuXingEnergy;
  const elements = ["mu", "huo", "tu", "jin", "shui"] as const;
  const labels = ["木", "火", "土", "金", "水"];

  let complementCount = 0;
  for (let i = 0; i < 5; i++) {
    const mVal = mE[elements[i]];
    const fVal = fE[elements[i]];
    if (mVal < 10 && fVal > 25) {
      complementCount++;
      details.push(`男命${labels[i]}弱，女命${labels[i]}旺，互补`);
    } else if (fVal < 10 && mVal > 25) {
      complementCount++;
      details.push(`女命${labels[i]}弱，男命${labels[i]}旺，互补`);
    }
  }

  score += complementCount * 3;
  if (complementCount === 0) {
    const mTotal = elements.reduce((s, e) => s + mE[e], 0);
    const fTotal = elements.reduce((s, e) => s + fE[e], 0);
    const diff = elements.reduce((s, e, _i) => {
      const mP = mE[e] / (mTotal || 1);
      const fP = fE[e] / (fTotal || 1);
      return s + Math.abs(mP - fP);
    }, 0);
    if (diff < 0.4) {
      score += 4;
      details.push("双方五行分布相近，气场协调");
    } else {
      details.push("五行分布差异较大，需相互包容");
    }
  }

  return { name: "五行互补", score: Math.min(20, score), maxScore: 20, desc: details[0] || "五行分析", details };
}

function analyzeShiShen(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  const mGan = male.siZhu.ri.gan;
  const fGan = female.siZhu.ri.gan;

  if (isPairIn(mGan, fGan, GAN_HE)) {
    score += 5;
    details.push("日主天干相合，十神互为正缘");
  }

  const mWx = GAN_WUXING[mGan];
  const fWx = GAN_WUXING[fGan];
  if (isSheng(mWx, fWx)) {
    score += 3;
    details.push(`男命${mWx}生女命${fWx}，男方付出型`);
  } else if (isSheng(fWx, mWx)) {
    score += 3;
    details.push(`女命${fWx}生男命${mWx}，女方贤助型`);
  }

  const maleShenSha = male.shenSha.map(s => s.name);
  const femaleShenSha = female.shenSha.map(s => s.name);
  if (maleShenSha.includes("天乙贵人") || femaleShenSha.includes("天乙贵人")) {
    score += 2;
    details.push("一方带天乙贵人，婚姻得贵人助力");
  }
  if (maleShenSha.includes("桃花") && femaleShenSha.includes("桃花")) {
    score -= 2;
    details.push("双方均带桃花，需注意感情忠诚度");
  }

  if (details.length === 0) details.push("十神关系平和");
  return { name: "十神配对", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc: details[0], details };
}

function analyzeYongShen(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  if (!male.geJu || !female.geJu) {
    return { name: "用神协调", score: 12, maxScore: 20, desc: "用神需详批", details: ["格局信息不足，建议详批八字"] };
  }

  const mYong = male.geJu.yongShen;
  const fYong = female.geJu.yongShen;
  const mXi = male.geJu.xiShen;
  const fXi = female.geJu.xiShen;
  const mJi = male.geJu.jiShen;
  const fJi = female.geJu.jiShen;

  if (mYong === fYong) {
    score += 5;
    details.push(`双方用神同为${mYong}，发展方向一致`);
  } else if (mYong === fXi || fYong === mXi) {
    score += 4;
    details.push("一方用神为对方喜神，相互助益");
  }

  if (mYong === fJi || fYong === mJi) {
    score -= 4;
    details.push("一方用神为对方忌神，价值观冲突");
  }

  if (isSheng(mYong, fYong) || isSheng(fYong, mYong)) {
    score += 3;
    details.push(`用神${mYong}${fYong}相生，互相成就`);
  }

  if (details.length === 0) details.push("用神关系中性");
  return { name: "用神协调", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc: details[0], details };
}

function getLevel(score: number): string {
  if (score >= 85) return "上上婚";
  if (score >= 75) return "上等婚";
  if (score >= 65) return "中上婚";
  if (score >= 55) return "中等婚";
  if (score >= 45) return "中下婚";
  if (score >= 35) return "下等婚";
  return "下下婚";
}

function getSummary(score: number, _dims: HehunDimension[]): string {
  if (score >= 80) return "天作之合，百年好合。双方命格相配，五行互补，宜早定姻缘。";
  if (score >= 65) return "良缘佳配，相互扶持。双方大体和谐，小有摩擦亦能化解。";
  if (score >= 50) return "中平之合，需要磨合。双方各有优劣互补之处，需包容经营。";
  return "配合欠佳，波折较多。建议详参八字，或择吉日化解不利因素。";
}

function getAdvice(dims: HehunDimension[]): string[] {
  const advice: string[] = [];
  for (const d of dims) {
    if (d.score < d.maxScore * 0.5) {
      advice.push(`${d.name}方面欠佳：${d.details[d.details.length - 1]}`);
    }
  }
  if (advice.length === 0) advice.push("整体配合良好，建议选择吉日吉时成婚。");
  return advice;
}

export function calculateBaziHehun(input: Record<string, unknown>): BaziHehunResult {
  const mInput = input.male as { year: number; month: number; day: number; hour: number; minute?: number };
  const fInput = input.female as { year: number; month: number; day: number; hour: number; minute?: number };

  const maleResult = calcBazi({
    name: "男", gender: "男",
    year: mInput.year, month: mInput.month, day: mInput.day,
    hour: mInput.hour, minute: mInput.minute ?? 0,
  });

  const femaleResult = calcBazi({
    name: "女", gender: "女",
    year: fInput.year, month: fInput.month, day: fInput.day,
    hour: fInput.hour, minute: fInput.minute ?? 0,
  });

  const d1 = analyzeShengXiao(maleResult.shengXiao, femaleResult.shengXiao);
  const d2 = analyzeRiZhu(maleResult, femaleResult);
  const d3 = analyzeWuXing(maleResult, femaleResult);
  const d4 = analyzeShiShen(maleResult, femaleResult);
  const d5 = analyzeYongShen(maleResult, femaleResult);

  const dims = [d1, d2, d3, d4, d5];
  const totalScore = dims.reduce((s, d) => s + d.score, 0);

  return {
    input: { male: mInput, female: fInput },
    maleShengXiao: maleResult.shengXiao,
    femaleShengXiao: femaleResult.shengXiao,
    maleDayPillar: `${maleResult.siZhu.ri.gan}${maleResult.siZhu.ri.zhi}`,
    femaleDayPillar: `${femaleResult.siZhu.ri.gan}${femaleResult.siZhu.ri.zhi}`,
    dimensions: { shengXiao: d1, riZhu: d2, wuXing: d3, shiShen: d4, yongShen: d5 },
    totalScore,
    level: getLevel(totalScore),
    summary: getSummary(totalScore, dims),
    advice: getAdvice(dims),
  };
}
