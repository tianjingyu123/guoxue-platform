// ── 八字合婚计算引擎 ──
// 算法参考：《渊海子平·合婚篇》《三命通会·论夫妇》《星平会海》
// 纳音参考：《三命通会·纳音篇》《五行精纪》《玉匣记》
// 涵盖：生肖冲合、日元生克、五行互补、十神匹配、用神协调、纳音对比（六维）

import type { BaziHehunResult, HehunDimension } from "@guoxue/shared";
import { calcBazi, type BaziResult, type Gan, type Zhi } from "@guoxue/bazi-engine";

// ── 生肖关系表 ──
const LIU_HE: Record<string, string> = { "鼠": "牛", "牛": "鼠", "虎": "猪", "猪": "虎", "兔": "狗", "狗": "兔", "龙": "鸡", "鸡": "龙", "蛇": "猴", "猴": "蛇", "马": "羊", "羊": "马" };
const SAN_HE: Record<string, string[]> = { "鼠": ["龙", "猴"], "牛": ["蛇", "鸡"], "虎": ["马", "狗"], "兔": ["羊", "猪"], "龙": ["鼠", "猴"], "蛇": ["牛", "鸡"], "马": ["虎", "狗"], "羊": ["兔", "猪"], "猴": ["鼠", "龙"], "鸡": ["牛", "蛇"], "狗": ["虎", "马"], "猪": ["兔", "羊"] };
const XIANG_CHONG: Record<string, string> = { "鼠": "马", "马": "鼠", "牛": "羊", "羊": "牛", "虎": "猴", "猴": "虎", "兔": "鸡", "鸡": "兔", "龙": "狗", "狗": "龙", "蛇": "猪", "猪": "蛇" };
const XIANG_HAI: Record<string, string> = { "鼠": "羊", "羊": "鼠", "牛": "马", "马": "牛", "虎": "蛇", "蛇": "虎", "兔": "龙", "龙": "兔", "狗": "鸡", "鸡": "狗", "猴": "猪", "猪": "猴" };
const XIANG_XING: Record<string, string[]> = { "鼠": ["兔"], "牛": ["狗", "羊"], "虎": ["蛇", "猴"], "兔": ["鼠"], "龙": ["龙"], "马": ["马"], "羊": ["狗"], "猴": ["虎", "猪"], "鸡": ["鸡"], "狗": ["牛", "羊"], "猪": ["猴"] };

// ── 天干合 ──
const GAN_HE: [Gan, Gan][] = [["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]];

// ── 地支六合/三合/六冲 ──
const ZHI_LIU_HE: [Zhi, Zhi][] = [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]];
const ZHI_CHONG: [Zhi, Zhi][] = [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]];
const ZHI_SAN_HE: Record<string, string[]> = { "申": ["子", "辰"], "子": ["申", "辰"], "辰": ["子", "申"], "亥": ["卯", "未"], "卯": ["亥", "未"], "未": ["亥", "卯"], "寅": ["午", "戌"], "午": ["寅", "戌"], "戌": ["寅", "午"], "巳": ["酉", "丑"], "酉": ["巳", "丑"], "丑": ["巳", "酉"] };

// ── 五行属性 ──
const GAN_WUXING: Record<string, string> = { "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水" };

// ── 五行相生 ──
const SHENG_CHAIN = ["木", "火", "土", "金", "水"];
function isSheng(a: string, b: string): boolean {
  const ia = SHENG_CHAIN.indexOf(a);
  return SHENG_CHAIN[(ia + 1) % 5] === b;
}
function isKe(a: string, b: string): boolean {
  const ia = SHENG_CHAIN.indexOf(a);
  return SHENG_CHAIN[(ia + 2) % 5] === b;
}

function isPairIn(a: string, b: string, pairs: [string, string][]): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// ── 纳音五行映射（30纳音 → 五行）──
// 来源：《三命通会·纳音篇》
const NAYIN_WUXING: Record<string, { wx: string; jiXiong: string; desc: string }> = {
  "海中金": { wx: "金", jiXiong: "吉", desc: "深藏不露之金，外柔内刚，需火炼方显价值" },
  "炉中火": { wx: "火", jiXiong: "吉", desc: "温暖和煦之火，能炼金成器，宜配金水" },
  "大林木": { wx: "木", jiXiong: "吉", desc: "参天巨木，气势恢宏，宜配水土滋养" },
  "路旁土": { wx: "土", jiXiong: "平", desc: "路边微土，平凡实用，宜配木火生机" },
  "剑锋金": { wx: "金", jiXiong: "吉", desc: "锋利刚硬之金，锋芒毕露，宜配水润火炼" },
  "山头火": { wx: "火", jiXiong: "平", desc: "山野之火，性急猛烈，宜配土制水济" },
  "涧下水": { wx: "水", jiXiong: "吉", desc: "山涧清泉，灵动纯净，宜配木泄金生" },
  "城头土": { wx: "土", jiXiong: "平", desc: "城墙厚土，稳固坚实，宜配木疏金泄" },
  "白蜡金": { wx: "金", jiXiong: "平", desc: "精致小巧之金，细腻敏感，宜配水润土生" },
  "杨柳木": { wx: "木", jiXiong: "平", desc: "柔韧飘逸之木，随风而动，宜配水土扎根" },
  "泉中水": { wx: "水", jiXiong: "吉", desc: "甘泉之水，清澈甘甜，宜配金生木泄" },
  "屋上土": { wx: "土", jiXiong: "平", desc: "屋顶之土，高而不稳，宜配木固金成" },
  "霹雳火": { wx: "火", jiXiong: "凶", desc: "雷电之火，暴烈短暂，宜配水制土晦" },
  "松柏木": { wx: "木", jiXiong: "吉", desc: "松柏长青，坚韧不拔，宜配水土金剪" },
  "长流水": { wx: "水", jiXiong: "吉", desc: "滔滔长流，奔腾不息，宜配土制木泄" },
  "砂中金": { wx: "金", jiXiong: "平", desc: "沙中淘金，需筛选方显，宜配火炼水淘" },
  "山下火": { wx: "火", jiXiong: "平", desc: "山脚之火，温和持久，宜配木助土收" },
  "平地木": { wx: "木", jiXiong: "平", desc: "平原之木，中正平和，宜配水土阳光" },
  "壁上土": { wx: "土", jiXiong: "平", desc: "墙壁之士，依附而生，宜配木撑金饰" },
  "金箔金": { wx: "金", jiXiong: "平", desc: "薄如蝉翼之金，装饰华丽，宜配水润火衬" },
  "覆灯火": { wx: "火", jiXiong: "吉", desc: "灯盏之火，照亮黑暗，宜配油木续航" },
  "天河水": { wx: "水", jiXiong: "吉", desc: "银河之水，浩瀚清澈，宜配土堤金生" },
  "大驿土": { wx: "土", jiXiong: "平", desc: "驿道之土，承载往来，宜配木固火暖" },
  "钗环金": { wx: "金", jiXiong: "吉", desc: "首饰之金，精美贵重，宜配水洁火耀" },
  "桑柘木": { wx: "木", jiXiong: "平", desc: "桑树之木，养蚕吐丝，宜配水土金修" },
  "大溪水": { wx: "水", jiXiong: "平", desc: "山溪之水，奔腾汹涌，宜配土堤木桥" },
  "沙中土": { wx: "土", jiXiong: "平", desc: "沙中之土，松散不固，宜配木根水润" },
  "天上火": { wx: "火", jiXiong: "凶", desc: "太阳之火，光耀夺目，宜配水济土晦" },
  "石榴木": { wx: "木", jiXiong: "吉", desc: "石榴多子，繁荣昌盛，宜配水土金盆" },
  "大海水": { wx: "水", jiXiong: "吉", desc: "大海之水，包容万象，宜配土堤木舟" },
};

// ── 纳音相配吉凶 ──
// 参考：《五行精纪·纳音婚配》
function analyzeNaYin(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  const mNianNaYin = male.siZhu.nian.nayin;
  const fNianNaYin = female.siZhu.nian.nayin;
  const mRiNaYin = male.siZhu.ri.nayin;
  const fRiNaYin = female.siZhu.ri.nayin;

  const mNianInfo = NAYIN_WUXING[mNianNaYin] || { wx: "?", jiXiong: "?", desc: "?" };
  const fNianInfo = NAYIN_WUXING[fNianNaYin] || { wx: "?", jiXiong: "?", desc: "?" };
  const mRiInfo = NAYIN_WUXING[mRiNaYin] || { wx: "?", jiXiong: "?", desc: "?" };
  const fRiInfo = NAYIN_WUXING[fRiNaYin] || { wx: "?", jiXiong: "?", desc: "?" };

  details.push(`男命年柱纳音【${mNianNaYin}】${mNianInfo.desc}，女命年柱纳音【${fNianNaYin}】${fNianInfo.desc}`);
  details.push(`男命日柱纳音【${mRiNaYin}】${mRiInfo.desc}，女命日柱纳音【${fRiNaYin}】${fRiInfo.desc}`);

  // 年柱纳音五行关系
  if (mNianInfo.wx === fNianInfo.wx) {
    score += 4;
    details.push(`年柱纳音同为${mNianInfo.wx}，比和相助，根基相合`);
  } else if (isSheng(mNianInfo.wx, fNianInfo.wx)) {
    score += 3;
    details.push(`年柱纳音男${mNianInfo.wx}生女${fNianInfo.wx}，男方滋养女方，根基有利`);
  } else if (isSheng(fNianInfo.wx, mNianInfo.wx)) {
    score += 3;
    details.push(`年柱纳音女${fNianInfo.wx}生男${mNianInfo.wx}，女方助益男方，根基有靠`);
  } else if (isKe(mNianInfo.wx, fNianInfo.wx)) {
    score -= 3;
    details.push(`年柱纳音男${mNianInfo.wx}克女${fNianInfo.wx}，根基有损，需调和`);
  } else if (isKe(fNianInfo.wx, mNianInfo.wx)) {
    score -= 3;
    details.push(`年柱纳音女${fNianInfo.wx}克男${mNianInfo.wx}，根基有损，需调和`);
  }

  // 日柱纳音五行关系
  if (mRiInfo.wx === fRiInfo.wx) {
    score += 4;
    details.push(`日柱纳音同为${mRiInfo.wx}，比和相助，夫妻同心`);
  } else if (isSheng(mRiInfo.wx, fRiInfo.wx)) {
    score += 3;
    details.push(`日柱纳音男${mRiInfo.wx}生女${fRiInfo.wx}，男方付出爱护女方，婚姻美满`);
  } else if (isSheng(fRiInfo.wx, mRiInfo.wx)) {
    score += 3;
    details.push(`日柱纳音女${fRiInfo.wx}生男${mRiInfo.wx}，女方贤惠助夫，婚姻和谐`);
  } else if (isKe(mRiInfo.wx, fRiInfo.wx)) {
    score -= 3;
    details.push(`日柱纳音男${mRiInfo.wx}克女${fRiInfo.wx}，夫妻气场相克，需多包容`);
  } else if (isKe(fRiInfo.wx, mRiInfo.wx)) {
    score -= 3;
    details.push(`日柱纳音女${fRiInfo.wx}克男${mRiInfo.wx}，夫妻气场相克，需多包容`);
  }

  // 年日柱纳音综合
  if (mNianNaYin === fRiNaYin) {
    score += 2;
    details.push(`男命年柱纳音${mNianNaYin}与女命日柱纳音相同，缘分深厚`);
  }
  if (fNianNaYin === mRiNaYin) {
    score += 2;
    details.push(`女命年柱纳音${fNianNaYin}与男命日柱纳音相同，缘分深厚`);
  }

  const desc = score >= 16 ? "纳音极为相配，根基与日常气场俱佳" :
    score >= 13 ? "纳音配合良好，气场基本和谐" :
    score >= 10 ? "纳音配合尚可，部分气场需调和" :
    "纳音配合欠佳，气场冲突较多，需留意化解";

  return { name: "纳音对比", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc, details };
}

// ── 生肖关系分析 ──
function analyzeShengXiao(maleXiao: string, femaleXiao: string): HehunDimension {
  const details: string[] = [];
  let score = 12;

  if (LIU_HE[maleXiao] === femaleXiao) {
    score = 20;
    details.push(`${maleXiao}${femaleXiao}六合，地支六合为最吉之配，天地阴阳交泰，夫妻恩爱白头偕老。`);
    details.push(`《渊海子平》云："六合为阴阳和合，婚配最宜"。`);
  } else if (SAN_HE[maleXiao]?.includes(femaleXiao)) {
    score = 17;
    details.push(`${maleXiao}${femaleXiao}三合，志趣相投，有共同理想和目标，事业生活皆可协力同行。`);
    details.push(`《三命通会》云："三合为同类相聚，夫妇同心其利断金"。`);
  } else if (XIANG_CHONG[maleXiao] === femaleXiao) {
    score = 5;
    details.push(`${maleXiao}${femaleXiao}相冲，性格对立明显，遇事意见相左。冲有动意，若能相互理解，亦能化冲为动力。`);
    details.push(`化解之法：选择三合六合之日成婚，或居家摆放调和五行之风水物。`);
  } else if (XIANG_HAI[maleXiao] === femaleXiao) {
    score = 7;
    details.push(`${maleXiao}${femaleXiao}相害，暗中易生嫌隙误会，需加强沟通避免积怨。`);
    details.push(`化解之法：多行善积德，家中宜开阔明亮，减少阴暗角落。`);
  } else if (XIANG_XING[maleXiao]?.includes(femaleXiao)) {
    score = 8;
    details.push(`${maleXiao}${femaleXiao}相刑，关系易生摩擦争执，需各自收敛锋芒。`);
    details.push(`化解之法：分开发展事业避免同领域竞争，家庭决策互相尊重。`);
  } else {
    details.push(`${maleXiao}${femaleXiao}无特殊冲合，平和相处。虽无天作之合之缘，但亦无冲害之忧，平平淡淡才是真。`);
  }

  return { name: "生肖关系", score, maxScore: 20, desc: details[0], details };
}

// ── 日柱配合分析 ──
function analyzeRiZhu(male: BaziResult, female: BaziResult): HehunDimension {
  const mGan = male.siZhu.ri.gan;
  const mZhi = male.siZhu.ri.zhi;
  const fGan = female.siZhu.ri.gan;
  const fZhi = female.siZhu.ri.zhi;
  const details: string[] = [];
  let score = 10;

  // 天干五合
  if (isPairIn(mGan, fGan, GAN_HE)) {
    score += 6;
    details.push(`日干${mGan}${fGan}天干五合，为夫妇正道，感情深厚融洽。${mGan}${fGan}合化为${mGan === "甲" || mGan === "己" ? "土" : mGan === "乙" || mGan === "庚" ? "金" : mGan === "丙" || mGan === "辛" ? "水" : mGan === "丁" || mGan === "壬" ? "木" : "火"}，相互吸引。`);
  }

  // 地支六合
  if (isPairIn(mZhi, fZhi, ZHI_LIU_HE)) {
    score += 6;
    details.push(`日支${mZhi}${fZhi}地支六合，配偶宫和谐共振，夫妻生活融洽美满。`);
  }

  // 地支三合
  const mSanHe = ZHI_SAN_HE[mZhi];
  if (mSanHe?.includes(fZhi)) {
    score += 4;
    details.push(`日支${mZhi}${fZhi}三合，不仅有夫妻之缘，更有志同道合之谊。`);
  }

  // 地支六冲
  if (isPairIn(mZhi, fZhi, ZHI_CHONG)) {
    score -= 6;
    details.push(`日支${mZhi}${fZhi}相冲，配偶宫受冲，夫妻关系易波动不稳定。需多包容忍让，避免正面冲突。`);
  }

  // 五行关系
  const mWx = GAN_WUXING[mGan];
  const fWx = GAN_WUXING[fGan];
  if (mWx === fWx) {
    score += 2;
    details.push(`日主五行同属${mWx}，性情相投，有共同的处事风格和价值取向。`);
  } else if (isSheng(mWx, fWx)) {
    score += 3;
    details.push(`日主男命${mWx}生女命${fWx}，男方愿为女方付出，感情模式为男方主导付出型。`);
  } else if (isSheng(fWx, mWx)) {
    score += 3;
    details.push(`日主女命${fWx}生男命${mWx}，女方贤惠助夫，感情模式为女方体贴贡献型。`);
  } else if (isKe(mWx, fWx)) {
    score -= 2;
    details.push(`日主男${mWx}克女${fWx}，男方可能过于强势，需注意给对方空间。`);
  } else if (isKe(fWx, mWx)) {
    score -= 2;
    details.push(`日主女${fWx}克男${mWx}，女方可能过于强势，需注意给对方空间。`);
  }

  if (details.length === 0) details.push("日柱关系平和，无特殊冲合");
  return { name: "日柱配合", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc: details[0] || "日柱平和", details };
}

// ── 五行互补分析 ──
function analyzeWuXing(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  if (!male.wuXingEnergy || !female.wuXingEnergy) {
    return { name: "五行互补", score: 12, maxScore: 20, desc: "五行均衡", details: ["双方五行大致均衡，需详批八字进一步分析"] };
  }

  const mE = male.wuXingEnergy;
  const fE = female.wuXingEnergy;
  const elements = ["mu", "huo", "tu", "jin", "shui"] as const;
  const labels = ["木", "火", "土", "金", "水"];

  let complementCount = 0;
  const complementNotes: string[] = [];
  for (let i = 0; i < 5; i++) {
    const mVal = mE[elements[i]];
    const fVal = fE[elements[i]];
    if (mVal < 10 && fVal > 25) {
      complementCount++;
      complementNotes.push(`男命${labels[i]}弱(${mVal})，女命${labels[i]}旺(${fVal})，阴阳互补，女能补男之不足`);
    } else if (fVal < 10 && mVal > 25) {
      complementCount++;
      complementNotes.push(`女命${labels[i]}弱(${fVal})，男命${labels[i]}旺(${mVal})，阴阳互补，男能补女之不足`);
    }
  }
  details.push(...complementNotes);

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
      details.push(`双方五行分布相近（差异度${(diff*100).toFixed(0)}%），气场协调，相互理解度高`);
    } else {
      score += 1;
      details.push(`五行分布差异较大（差异度${(diff*100).toFixed(0)}%），但差异可互补。需在相处中互相包容对方的不同处事方式`);
    }
    details.push(`男命五行：木${mE.mu} 火${mE.huo} 土${mE.tu} 金${mE.jin} 水${mE.shui}`);
    details.push(`女命五行：木${fE.mu} 火${fE.huo} 土${fE.tu} 金${fE.jin} 水${fE.shui}`);
  }

  return { name: "五行互补", score: Math.min(20, score), maxScore: 20, desc: details[0] || "五行分析", details };
}

// ── 十神配对分析 ──
function analyzeShiShen(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  const mGan = male.siZhu.ri.gan;
  const fGan = female.siZhu.ri.gan;

  if (isPairIn(mGan, fGan, GAN_HE)) {
    score += 5;
    details.push("日主天干五合，十神关系为正配，乃是天定良缘之象。");
  }

  const mWx = GAN_WUXING[mGan];
  const fWx = GAN_WUXING[fGan];
  if (isSheng(mWx, fWx)) {
    score += 3;
    details.push(`男命${mWx}生女命${fWx}，男方付出型。男为女之食伤，付出关爱多；女为男之印星，得呵护照顾。`);
  } else if (isSheng(fWx, mWx)) {
    score += 3;
    details.push(`女命${fWx}生男命${mWx}，女方贤助型。女为男之财星，旺夫益子；男为女之官星，有担当依靠。`);
  }

  const maleShenSha = male.shenSha.map(s => s.name);
  const femaleShenSha = female.shenSha.map(s => s.name);
  if (maleShenSha.includes("天乙贵人") || femaleShenSha.includes("天乙贵人")) {
    score += 2;
    details.push("一方带天乙贵人，婚姻有贵人护佑，遇难呈祥逢凶化吉。");
  }
  if (maleShenSha.includes("天月德贵人") && femaleShenSha.includes("天月德贵人")) {
    score += 2;
    details.push("双方均带天月德贵人，积善之家必有余庆，福泽深厚。");
  }
  if (maleShenSha.includes("桃花") && femaleShenSha.includes("桃花")) {
    score -= 2;
    details.push("双方均带桃花星，异性缘皆旺，需互相信任避免猜忌。");
  }
  if (maleShenSha.includes("孤辰") || femaleShenSha.includes("寡宿") || maleShenSha.includes("寡宿") || femaleShenSha.includes("孤辰")) {
    score -= 2;
    details.push("一方带孤辰寡宿，可能晚婚或对婚姻投入度不足，需更多关爱。");
  }

  if (details.length === 0) details.push("十神关系平和，无特殊吉凶配置");
  return { name: "十神配对", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc: details[0], details };
}

// ── 用神协调分析 ──
function analyzeYongShen(male: BaziResult, female: BaziResult): HehunDimension {
  const details: string[] = [];
  let score = 10;

  if (!male.geJu || !female.geJu) {
    return { name: "用神协调", score: 12, maxScore: 20, desc: "用神需详批", details: ["格局信息不足，建议详批八字以深入分析用神协调度"] };
  }

  const mYong = male.geJu.yongShen;
  const fYong = female.geJu.yongShen;
  const mXi = male.geJu.xiShen;
  const fXi = female.geJu.xiShen;
  const mJi = male.geJu.jiShen;
  const fJi = female.geJu.jiShen;

  details.push(`男命格局：${male.geJu.name}，用神${mYong}，喜神${mXi}，忌神${mJi}`);
  details.push(`女命格局：${female.geJu.name}，用神${fYong}，喜神${fXi}，忌神${fJi}`);

  if (mYong === fYong) {
    score += 6;
    details.push(`双方用神同为${mYong}，人生追求方向高度一致。共同爱好、共同发展，是灵魂伴侣之象。`);
  } else if (mYong === fXi || fYong === mXi) {
    score += 5;
    details.push("一方用神为对方喜神，相互助益。在人生关键节点，一方的好运恰是另一方的助力。");
  }

  if (mYong === fJi || fYong === mJi) {
    score -= 5;
    details.push("一方用神为对方忌神，核心价值观存在冲突。一方追求之事恰是另一方排斥之事，需加强沟通妥协。");
  }

  if (mJi === fJi) {
    score += 2;
    details.push(`双方忌神同为${mJi}，共同的软肋让彼此更能理解对方的难处。`);
  }

  if (isSheng(mYong, fYong) || isSheng(fYong, mYong)) {
    score += 3;
    details.push(`用神五行${mYong}${fYong}相生，双方发展互相促进，是共赢型伴侣。`);
  }

  if (isKe(mYong, fYong) || isKe(fYong, mYong)) {
    score -= 2;
    details.push(`用神五行${mYong}${fYong}相克，发展路径可能互相掣肘，建议各有独立事业空间。`);
  }

  if (details.length === 2) details.push("用神关系中性，各有发展方向");
  return { name: "用神协调", score: Math.max(0, Math.min(20, score)), maxScore: 20, desc: details[2] || details[0], details };
}

// ── 等级评定 ──
function getLevel(score: number): string {
  if (score >= 90) return "上上婚（天作之合）";
  if (score >= 80) return "上等婚（良缘佳配）";
  if (score >= 70) return "中上婚（门当户对）";
  if (score >= 60) return "中等婚（寻常好合）";
  if (score >= 50) return "中下婚（需要磨合）";
  if (score >= 40) return "下等婚（多有波折）";
  return "下下婚（慎重考虑）";
}

function getSummary(score: number, dims: HehunDimension[]): string {
  const goodDims = dims.filter(d => d.score >= d.maxScore * 0.7).map(d => d.name);
  const badDims = dims.filter(d => d.score < d.maxScore * 0.4).map(d => d.name);

  let summary = "";
  if (score >= 80) {
    summary = `天作之合，百年好合。综合评分${score}/100。${goodDims.length > 0 ? `在${goodDims.join("、")}等方面尤为般配。` : ""}《星平会海》云："合婚见六合三合，夫妇齐眉。"此配宜早定姻缘，选择吉日良辰成婚。`;
  } else if (score >= 65) {
    summary = `良缘佳配，相互扶持。综合评分${score}/100。${goodDims.length > 0 ? `在${goodDims.join("、")}等方面配合良好。` : ""}${badDims.length > 0 ? `在${badDims.join("、")}等方面稍欠，可注意调和。` : ""}《三命通会》云："婚配贵在同心，五行相济即为良缘。"`;
  } else if (score >= 50) {
    summary = `中平之合，需要经营。综合评分${score}/100。${goodDims.length > 0 ? `在${goodDims.join("、")}等方面有优势。` : ""}${badDims.length > 0 ? `但在${badDims.join("、")}等方面需特别用心经营。` : ""}婚姻需要双方包容理解，用心经营可得善果。`;
  } else if (score >= 35) {
    summary = `配合欠佳，波折较多。综合评分${score}/100。${badDims.length > 0 ? `在${badDims.join("、")}等方面存在明显冲突。` : ""}建议详参八字，或择吉日吉方化解不利因素。《渊海子平》云："合婚不顺者，可借吉日良辰化解冲克。"`;
  } else {
    summary = `配合困难，需慎重考虑。综合评分${score}/100。${badDims.length > 0 ? `${badDims.join("、")}等方面严重不合。` : ""}如已确立关系，建议请高人详细合婚，或从风水择日等多维度化解。《五行精纪》有化解冲克之法可参考。`;
  }
  return summary;
}

function getAdvice(dims: HehunDimension[]): string[] {
  const advice: string[] = [];
  for (const d of dims) {
    if (d.score < d.maxScore * 0.5) {
      advice.push(`【${d.name}】方面需重点调和：${d.desc}。建议参考前述化解之法。`);
    } else if (d.score < d.maxScore * 0.7) {
      advice.push(`【${d.name}】方面仍有提升空间：${d.desc}`);
    }
  }
  if (advice.length === 0) advice.push("六维配合良好，天时地利人和，建议选择良辰吉日举办婚礼，以锦上添花。");
  advice.push("—— 参考来源：《渊海子平》《三命通会》《星平会海》《五行精纪》");
  return advice;
}

// ── 主计算函数 ──
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
  const d6 = analyzeNaYin(maleResult, femaleResult);

  const dims = [d1, d2, d3, d4, d5, d6];
  const totalScore = dims.reduce((s, d) => s + d.score, 0);
  const maxPossible = dims.reduce((s, d) => s + d.maxScore, 0);
  const score100 = Math.round((totalScore / maxPossible) * 100);

  const dimNames = ["生肖关系","日柱配合","五行互补","十神配对","用神协调","纳音对比"];
  const scoreBars = [d1, d2, d3, d4, d5, d6].map((d, i) => {
    const bar = "█".repeat(Math.max(1, Math.round(d.score / d.maxScore * 10)));
    const empty = "░".repeat(10 - bar.length);
    return `│ ${dimNames[i].padEnd(4)} ${String(d.score).padStart(2)}/${d.maxScore} ${bar}${empty} │`;
  }).join("\n");

  const boxSummary = [
    "┌──────────────────────────────────────┐",
    "│       八字合婚 · 六维匹配分析         │",
    "├──────────────────────────────────────┤",
    "│ 男命：" + maleResult.shengXiao.padEnd(2) + " · " + (maleResult.siZhu.ri.gan + maleResult.siZhu.ri.zhi).padEnd(4) + " · " + maleResult.siZhu.nian.gan + maleResult.siZhu.nian.zhi + "年" + maleResult.siZhu.yue.gan + maleResult.siZhu.yue.zhi + "月" + maleResult.siZhu.ri.gan + maleResult.siZhu.ri.zhi + "日" + " ".repeat(5) + "│",
    "│ 女命：" + femaleResult.shengXiao.padEnd(2) + " · " + (femaleResult.siZhu.ri.gan + femaleResult.siZhu.ri.zhi).padEnd(4) + " · " + femaleResult.siZhu.nian.gan + femaleResult.siZhu.nian.zhi + "年" + femaleResult.siZhu.yue.gan + femaleResult.siZhu.yue.zhi + "月" + femaleResult.siZhu.ri.gan + femaleResult.siZhu.ri.zhi + "日" + " ".repeat(5) + "│",
    "├──────────────────────────────────────┤",
    "│ 维度    得分  匹配度                  │",
    scoreBars,
    "├──────────────────────────────────────┤",
    "│ 总分：" + String(score100) + "/100  " + getLevel(score100).padEnd(24) + "│",
    "│ 评语：" + getSummary(score100, dims).slice(0, 30).padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《渊海子平·合婚篇》            │",
    "│ 参校：《三命通会》《星平会海》        │",
    "│ 纳音理论考据《五行精纪》《玉匣记》    │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { male: mInput, female: fInput },
    maleShengXiao: maleResult.shengXiao,
    femaleShengXiao: femaleResult.shengXiao,
    maleDayPillar: `${maleResult.siZhu.ri.gan}${maleResult.siZhu.ri.zhi}`,
    femaleDayPillar: `${femaleResult.siZhu.ri.gan}${femaleResult.siZhu.ri.zhi}`,
    dimensions: { shengXiao: d1, riZhu: d2, wuXing: d3, shiShen: d4, yongShen: d5, nayin: d6 },
    totalScore: score100,
    level: getLevel(score100),
    summary: boxSummary,
    advice: getAdvice(dims),
  };
}
