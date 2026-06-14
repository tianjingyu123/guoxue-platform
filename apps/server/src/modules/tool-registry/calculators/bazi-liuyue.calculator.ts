// ── 八字流月运势推算引擎 ──
// 算法参考：《渊海子平》《三命通会》《滴天髓》《星平会海》
// 基于流年+流月干支，结合日主十神/五行生克/十二长生/神煞推算逐月运势
// 出处：《三命通会》云：「月令者，提纲也。司一月之权，掌生杀之机。」

import type { BaziLiuYueInput, BaziLiuYueResult, LiuYueMonthly } from "@guoxue/shared";
import { GAN, ZHI } from "@guoxue/bazi-engine";

const GAN_LIST = GAN as unknown as string[];
const ZHI_LIST = ZHI as unknown as string[];

// 天干五行
const GAN_WX: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
  "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
};

// 地支藏干主气
const ZHI_MAIN: Record<string, string> = {
  "子": "癸", "丑": "己", "寅": "甲", "卯": "乙", "辰": "戊", "巳": "丙",
  "午": "丁", "未": "己", "申": "庚", "酉": "辛", "戌": "戊", "亥": "壬",
};

// 十二长生：天干在各地支的状态
const CHANG_SHENG_START: Record<string, string> = {
  "甲": "亥", "乙": "午", "丙": "寅", "丁": "酉", "戊": "寅",
  "己": "酉", "庚": "巳", "辛": "子", "壬": "申", "癸": "卯",
};
const ZHI_SEQ = ["亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌"];
const CHANG_SHENG_NAMES = ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];
const CHANG_SHENG_QUALITY: Record<string, { jiXiong: string; desc: string }> = {
  "长生": { jiXiong:"大吉", desc:"气机初生，万物萌发。宜开端新计划，播种希望。" },
  "沐浴": { jiXiong:"平", desc:"沐浴桃花，人缘佳美。但易生情欲之困，事业宜稳。" },
  "冠带": { jiXiong:"吉", desc:"衣冠楚楚，日渐成熟。学业进修佳，宜提升自我。" },
  "临官": { jiXiong:"大吉", desc:"禄位加身，事业有成。仕途顺遂，宜积极进取。" },
  "帝旺": { jiXiong:"大吉", desc:"气势极盛，如日中天。凡事可成，但防过刚则折。" },
  "衰": { jiXiong:"小凶", desc:"盛极而衰，力道渐退。宜守不宜攻，蓄力待机。" },
  "病": { jiXiong:"凶", desc:"气机不畅，多病多忧。注意健康，减少社交应酬。" },
  "死": { jiXiong:"凶", desc:"死气沉沉，诸事不顺。宜静养身心，以退为进。" },
  "墓": { jiXiong:"平", desc:"入库收藏，积蓄力量。宜内省反思，不宜大动干戈。" },
  "绝": { jiXiong:"大凶", desc:"气机断绝，前路迷茫。宜暂停计划，等待时机。" },
  "胎": { jiXiong:"平", desc:"胎孕新机，暗藏希望。虽未显现，暗中酝酿新局。" },
  "养": { jiXiong:"小吉", desc:"滋养培育，渐入佳境。宜学习充电，静待花开。" },
};

// 月建神煞
const MONTH_SHEN_SHA: Record<number, { yueDe: string; tianDe: string; yuePo: string; classicalRef: string }> = {
  1:  { yueDe:"丙", tianDe:"丁", yuePo:"申", classicalRef:"《渊海子平》：正月月德在丙，天德在丁。" },
  2:  { yueDe:"甲", tianDe:"坤", yuePo:"酉", classicalRef:"《渊海子平》：二月月德在甲，天德在坤。" },
  3:  { yueDe:"壬", tianDe:"壬", yuePo:"戌", classicalRef:"《渊海子平》：三月月德在壬，天德在壬。" },
  4:  { yueDe:"庚", tianDe:"辛", yuePo:"亥", classicalRef:"《渊海子平》：四月月德在庚，天德在辛。" },
  5:  { yueDe:"丙", tianDe:"亥", yuePo:"子", classicalRef:"《渊海子平》：五月月德在丙，天德在亥。" },
  6:  { yueDe:"甲", tianDe:"甲", yuePo:"丑", classicalRef:"《渊海子平》：六月月德在甲，天德在甲。" },
  7:  { yueDe:"壬", tianDe:"癸", yuePo:"寅", classicalRef:"《渊海子平》：七月月德在壬，天德在癸。" },
  8:  { yueDe:"庚", tianDe:"寅", yuePo:"卯", classicalRef:"《渊海子平》：八月月德在庚，天德在寅。" },
  9:  { yueDe:"丙", tianDe:"丙", yuePo:"辰", classicalRef:"《渊海子平》：九月月德在丙，天德在丙。" },
  10: { yueDe:"甲", tianDe:"乙", yuePo:"巳", classicalRef:"《渊海子平》：十月月德在甲，天德在乙。" },
  11: { yueDe:"壬", tianDe:"巽", yuePo:"午", classicalRef:"《渊海子平》：十一月月德在壬，天德在巽。" },
  12: { yueDe:"庚", tianDe:"庚", yuePo:"未", classicalRef:"《渊海子平》：十二月月德在庚，天德在庚。" },
};

// 月份节气区间
const MONTH_JIEQI: Record<number, { jie: string; qi: string; season: string; seasonWx: string }> = {
  1:  { jie:"立春", qi:"雨水", season:"春", seasonWx:"木" },
  2:  { jie:"惊蛰", qi:"春分", season:"春", seasonWx:"木" },
  3:  { jie:"清明", qi:"谷雨", season:"春", seasonWx:"木" },
  4:  { jie:"立夏", qi:"小满", season:"夏", seasonWx:"火" },
  5:  { jie:"芒种", qi:"夏至", season:"夏", seasonWx:"火" },
  6:  { jie:"小暑", qi:"大暑", season:"夏", seasonWx:"火" },
  7:  { jie:"立秋", qi:"处暑", season:"秋", seasonWx:"金" },
  8:  { jie:"白露", qi:"秋分", season:"秋", seasonWx:"金" },
  9:  { jie:"寒露", qi:"霜降", season:"秋", seasonWx:"金" },
  10: { jie:"立冬", qi:"小雪", season:"冬", seasonWx:"水" },
  11: { jie:"大雪", qi:"冬至", season:"冬", seasonWx:"水" },
  12: { jie:"小寒", qi:"大寒", season:"冬", seasonWx:"水" },
};

// 季节养生建议
const SEASON_ADVICE: Record<string, { emotion: string; organ: string; food: string; activity: string; classicalRef: string }> = {
  "春": { emotion:"怒", organ:"肝", food:"省酸增甘以养脾气", activity:"宜早起广步于庭", classicalRef:"《素问·四气调神大论》：春三月，此谓发陈。" },
  "夏": { emotion:"喜", organ:"心", food:"省苦增辛以养肺气", activity:"宜晚睡早起无厌于日", classicalRef:"《素问·四气调神大论》：夏三月，此谓蕃秀。" },
  "秋": { emotion:"忧", organ:"肺", food:"省辛增酸以养肝气", activity:"宜早卧早起与鸡俱兴", classicalRef:"《素问·四气调神大论》：秋三月，此谓容平。" },
  "冬": { emotion:"恐", organ:"肾", food:"省咸增苦以养心气", activity:"宜早卧晚起必待日光", classicalRef:"《素问·四气调神大论》：冬三月，此谓闭藏。" },
};

// 十神计算
function getShiShen(riGan: string, targetGan: string): string {
  const riIdx = GAN_LIST.indexOf(riGan);
  const tIdx = GAN_LIST.indexOf(targetGan);
  const diff = (tIdx - riIdx + 10) % 10;
  const same = riIdx % 2 === tIdx % 2;
  const TABLE: Record<number, [string, string]> = {
    0: ["比肩", "劫财"], 1: ["劫财", "比肩"],
    2: ["食神", "伤官"], 3: ["伤官", "食神"],
    4: ["偏财", "正财"], 5: ["正财", "偏财"],
    6: ["七杀", "正官"], 7: ["正官", "七杀"],
    8: ["偏印", "正印"], 9: ["正印", "偏印"],
  };
  return TABLE[diff][same ? 0 : 1];
}

// 十二长生
function getChangSheng(riGan: string, zhi: string): string {
  const startZhi = CHANG_SHENG_START[riGan];
  if (!startZhi) return "未知";
  const startIdx = ZHI_SEQ.indexOf(startZhi);
  const targetIdx = ZHI_SEQ.indexOf(zhi);
  const offset = ((targetIdx - startIdx + 12) % 12 + 12) % 12;
  return CHANG_SHENG_NAMES[offset] || "未知";
}

// 流月干支：按五虎遁，年上起月
function getMonthGanZhi(yearGan: string, month: number): string {
  const yIdx = GAN_LIST.indexOf(yearGan);
  const startGanMap: Record<number, number> = {
    0: 2, 1: 4, 2: 6, 3: 8, 4: 0, 5: 2, 6: 4, 7: 6, 8: 8, 9: 0,
  };
  const startGan = startGanMap[yIdx % 10] ?? 0;
  const ganIdx = (startGan + month - 1) % 10;
  const zhiIdx = (month + 1) % 12;
  return GAN_LIST[ganIdx] + ZHI_LIST[zhiIdx];
}

// 流年干支按60甲子序推算
function getYearGanZhi(year: number): string {
  const baseYear = 1984;
  const diff = year - baseYear;
  const gIdx = ((diff % 10) + 10) % 10;
  const zIdx = ((diff % 12) + 12) % 12;
  return GAN_LIST[gIdx] + ZHI_LIST[zIdx];
}

// 月运简评（含古籍出处）
function getMonthFortune(shiShen: string, score: number, changSheng: string, season: string): string {
  const csQuality = CHANG_SHENG_QUALITY[changSheng];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const seasonData = SEASON_ADVICE[season];

  const base: Record<string, { fortune: string; classicalRef: string }> = {
    "比肩": {
      fortune: "朋友相助运，适合团队协作，但竞争亦激烈，保持自信但勿固执。",
      classicalRef: "《三命通会》：比肩者，兄弟也。比和相助，亦主竞争。",
    },
    "劫财": {
      fortune: "社交活跃，机会增多但开销大，注意理财并防范小人争利。",
      classicalRef: "《渊海子平》：劫财者，羊刃也。劫夺我财，防身克妻。",
    },
    "食神": {
      fortune: "才华显露创意丰沛，适合创作表达，人际关系和谐心情愉悦。",
      classicalRef: "《三命通会》：食神者，我所生者也。主福寿、食禄、享乐。",
    },
    "伤官": {
      fortune: "灵感爆发但言辞犀利，宜发挥创意但注意谨言慎行免伤和气。",
      classicalRef: "《渊海子平》：伤官者，我生之异性。主聪明傲物，恃才傲上。",
    },
    "正财": {
      fortune: "稳定收入稳步增长，适合规划理财，脚踏实地可获实际收益。",
      classicalRef: "《三命通会》：正财者，我所克之正配。主田宅、财物、妻室。",
    },
    "偏财": {
      fortune: "意外之财机会增多，适合投资但勿贪心，人情消费增大。",
      classicalRef: "《渊海子平》：偏财者，我克之偏。主意外之财，流通之利。",
    },
    "正官": {
      fortune: "事业运上升，得贵人赏识，宜守纪律踏实做事，有晋升之机。",
      classicalRef: "《三命通会》：正官者，克我之正。主官禄、名望、职位。",
    },
    "七杀": {
      fortune: "挑战与机遇并存，压力增大但能转化动力，注意情绪管理。",
      classicalRef: "《渊海子平》：七杀者，克我之偏。主权势、威猛、竞争。",
    },
    "正印": {
      fortune: "学习进修好时机，贵人长辈助力强，适合充电和提升自我。",
      classicalRef: "《三命通会》：正印者，生我之正。主文书、学业、母亲。",
    },
    "偏印": {
      fortune: "独立思考能力增强，适合钻研学习，但注意人际关系疏离感。",
      classicalRef: "《渊海子平》：偏印者，生我之偏。主偏业、技艺、独特才能。",
    },
  };

  const b = base[shiShen] || {
    fortune: "运势平稳，宜按部就班行事，不宜大动干戈。",
    classicalRef: "《滴天髓》：日主中和，不争不妒，顺势而行。",
  };

  const csSuffix = csQuality ? `（${changSheng}：${csQuality.desc.slice(0, 20)}）` : "";
  return `${b.fortune}${csSuffix}。出处：${b.classicalRef}`;
}

function getFocus(shiShen: string, month: number, season: string): string[] {
  const seasonData = SEASON_ADVICE[season];
  const focuses: Record<string, string[]> = {
    "比肩": ["人际合作", "自身提升", "竞争应对"],
    "劫财": ["财务规划", "社交活动", "防小人是非"],
    "食神": ["创意发挥", "饮食健康", "享受生活"],
    "伤官": ["才华表达", "言辞谨慎", "艺术创作"],
    "正财": ["稳定增收", "工作表现", "理性消费"],
    "偏财": ["投资机会", "人情往来", "风险控制"],
    "正官": ["职业发展", "规章制度", "贵人关系"],
    "七杀": ["压力转化", "事业发展", "情绪调节"],
    "正印": ["学习进修", "长辈贵人", "证件文书"],
    "偏印": ["独立研究", "专业技能", "身心调养"],
  };
  const base = focuses[shiShen] || ["日常事务", "保持节奏", "稳中求进"];
  if (seasonData) base.push(`${season}季养${seasonData.organ}`);
  return base;
}

export function calculateBaziLiuYue(input: Record<string, unknown>): BaziLiuYueResult {
  const { yearPillar, monthPillar, dayPillar, hourPillar, gender, targetYear, targetMonth } =
    input as unknown as BaziLiuYueInput;

  const riGan = dayPillar[0];
  const riZhi = dayPillar[1];
  const liuNianGZ = getYearGanZhi(targetYear);
  const liuNianGan = liuNianGZ[0];
  const liuNianZhi = liuNianGZ[1];
  const riWx = GAN_WX[riGan];

  const months = targetMonth ? [targetMonth] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const monthly: LiuYueMonthly[] = months.map(m => {
    const gz = getMonthGanZhi(liuNianGan, m);
    const gan = gz[0];
    const zhi = gz[1];
    const shiShen = getShiShen(riGan, gan);
    const changSheng = getChangSheng(riGan, zhi);
    const jq = MONTH_JIEQI[m];
    const season = jq?.season || "春";

    // 月运评分：五行生克 + 十神 + 十二长生 + 月德
    const mWx = GAN_WX[gan];
    let score = 5;
    if (mWx === riWx) score += 2;
    else {
      const sheng: Record<string, string> = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
      if (sheng[mWx] === riWx) score += 1;
      else if (sheng[riWx] === mWx) score -= 1;
    }
    if (["正官", "正印", "食神", "正财"].includes(shiShen)) score += 1;
    if (["七杀", "伤官", "偏印"].includes(shiShen)) score -= 1;
    // 十二长生调整
    const csQuality = CHANG_SHENG_QUALITY[changSheng];
    if (csQuality?.jiXiong === "大吉") score += 2;
    else if (csQuality?.jiXiong === "吉") score += 1;
    else if (csQuality?.jiXiong === "大凶") score -= 2;
    else if (csQuality?.jiXiong === "凶") score -= 1;
    score = Math.max(1, Math.min(10, score));

    // 月德检查
    const shenSha = MONTH_SHEN_SHA[m];
    const zhiMain = ZHI_MAIN[liuNianZhi] || "";
    const hasYueDe = shenSha && (liuNianGan === shenSha.yueDe || zhiMain === shenSha.yueDe);

    return {
      month: m,
      ganZhi: gz,
      shiShen,
      score: hasYueDe ? Math.min(10, score + 1) : score,
      fortune: getMonthFortune(shiShen, score, changSheng, season),
      focus: getFocus(shiShen, m, season),
    };
  });

  const best = monthly.reduce((a, b) => (b.score > a.score ? b : a), monthly[0]);
  const worst = monthly.reduce((a, b) => (b.score < a.score ? b : a), monthly[0]);

  // 构建结构化summary
  const monthLines = monthly.map(mu => {
    const jq = MONTH_JIEQI[mu.month];
    const bar = "█".repeat(Math.max(1, mu.score)) + "░".repeat(Math.max(0, 10 - mu.score));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const shenSha = MONTH_SHEN_SHA[mu.month];
    const marker = mu.score >= 8 ? "★★" : mu.score >= 6 ? "★" : mu.score <= 3 ? "⚠" : "·";
    return `│ ${marker} ${String(mu.month).padStart(2)}月 ${mu.ganZhi}（${jq?.jie || ""}~${jq?.qi || ""}） ${bar} ${mu.score}/10 ${mu.shiShen}`;
  });

  const goodMonths = monthly.filter(m => m.score >= 7).map(m => `${m.month}月`).join("、") || "无";
  const badMonths = monthly.filter(m => m.score <= 3).map(m => `${m.month}月`).join("、") || "无";

  const riChangSheng = getChangSheng(riGan, riZhi);
  const riCsQuality = CHANG_SHENG_QUALITY[riChangSheng];

  const suggestion = [
    `${gender === "男" ? "男性" : "女性"}，日主${riGan}（${riWx}，${riChangSheng}）。${targetYear}年流年${liuNianGZ}。`,
    ``,
    `┌─ ${targetYear}年流月运势总览 ─────────────────`,
    `│ 日主：${riGan}(${riWx}) 流年：${liuNianGZ}（${liuNianGan}${GAN_WX[liuNianGan]}/支${liuNianZhi}）`,
    `│ 日主十二长生于日支：${riChangSheng}（${riCsQuality?.desc?.slice(0,15) || ""}）`,
    `│ 全年平均评分：${(monthly.reduce((s,m) => s + m.score, 0) / 12).toFixed(1)}/10`,
    `│ 最佳月份：${best.month}月(${best.ganZhi} ${best.shiShen} ${best.score}分)`,
    `│ 需谨慎：${worst.month}月(${worst.ganZhi} ${worst.shiShen} ${worst.score}分)`,
    `│ 吉月(${goodMonths}) 凶月(${badMonths})`,
    ``,
    `├─ 逐月详解 ─────────────────`,
    ...monthLines,
    ``,
    `├─ 行动建议 ─────────────────`,
    `│ 1. 最佳月份(${best.month}月)宜把握良机积极行动`,
    `│ 2. 低分月份(${worst.month}月)宜低调谨慎积蓄能量`,
    `│ 3. 上半年以稳为主，下半年适度冲刺`,
    `│ 4. 流年${liuNianGan}为${getShiShen(riGan, liuNianGan)}运，全年基调以此为主`,
    ``,
    `├─ 古籍参考 ─────────────────`,
    `│ 《三命通会》：「月令为提纲，司一月之权。」`,
    `│ 《渊海子平》：「月建为运元，行运之枢纽。」`,
    `│ 《滴天髓》：「月令乃提纲之府，譬之宅也。」`,
    ``,
    `└─ ${targetYear}年流月运势综合判断：${best.score >= 8 ? "大有可为之年" : best.score >= 6 ? "稳中有升" : "蓄势待发"}。依月而行，顺势而为，则事半功倍。`,
  ].join("\n");

  return {
    yearPillar, monthPillar, dayPillar, hourPillar,
    dayMaster: riGan,
    liuNian: { year: targetYear, ganZhi: liuNianGZ },
    monthly,
    suggestion,
  };
}
