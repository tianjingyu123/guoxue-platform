// ── 星座运势计算引擎 ──

import type { XingZuoYunshiResult, XingZuo, XingZuoScores } from "@guoxue/shared";

const XINGZUO_LIST: XingZuo[] = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
const ELEMENTS: Record<XingZuo, string> = { "白羊座": "火", "金牛座": "土", "双子座": "风", "巨蟹座": "水", "狮子座": "火", "处女座": "土", "天秤座": "风", "天蝎座": "水", "射手座": "火", "摩羯座": "土", "水瓶座": "风", "双鱼座": "水" };

const ELEMENT_COLORS: Record<string, string[]> = {
  "火": ["红色", "橙色", "紫红色", "珊瑚色"],
  "土": ["棕色", "米色", "卡其色", "橄榄绿"],
  "风": ["白色", "浅蓝", "银色", "薄荷绿"],
  "水": ["蓝色", "黑色", "深紫", "海军蓝"],
};

// 星座配对（最佳配对星座索引）
const BEST_MATCH: Record<number, number> = { 0: 4, 1: 8, 2: 6, 3: 10, 4: 0, 5: 2, 6: 2, 7: 11, 8: 1, 9: 6, 10: 3, 11: 7 };

// 根据月/日判断星座
const XINGZUO_DATES: [number, number][] = [
  [3, 21], [4, 20], [5, 21], [6, 22], [7, 23], [8, 23],
  [9, 23], [10, 24], [11, 23], [12, 22], [1, 20], [2, 19],
];

function getXingZuoFromDate(month: number, day: number): XingZuo {
  for (let i = 0; i < 12; i++) {
    const [sm, sd] = XINGZUO_DATES[i];
    const [em, ed] = XINGZUO_DATES[(i + 1) % 12];
    if (em > sm) {
      if ((month === sm && day >= sd) || (month === em && day < ed) || (month > sm && month < em)) {
        return XINGZUO_LIST[i];
      }
    } else {
      if ((month === sm && day >= sd) || (month > sm) || (month < em) || (month === em && day < ed)) {
        return XINGZUO_LIST[i];
      }
    }
  }
  return "摩羯座";
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

const SUMMARIES_HIGH = [
  "今日运势极佳，适合主动出击，把握机会。",
  "星象眷顾，无论工作还是生活都有好消息传来。",
  "能量充沛的一天，创造力和行动力俱佳。",
];
const SUMMARIES_MID = [
  "今日运势平稳，按部就班即可，避免冒进。",
  "总体运势中规中矩，适合处理日常事务。",
  "平凡中见真章，踏实做事会有小收获。",
];
const SUMMARIES_LOW = [
  "今日运势略低，建议低调行事，避免争执。",
  "星象提示需要耐心，急躁只会适得其反。",
  "宜守不宜攻，把精力放在已有事务的维护上。",
];
const ADVICES = [
  "注意沟通方式，多倾听少争辩。",
  "财务方面保持理性，不宜冲动消费。",
  "关注身体信号，适当休息。",
  "人际关系上主动释放善意。",
  "工作中注重细节，可能有意外收获。",
  "保持开放心态，新机遇可能以意想不到的方式出现。",
];

export function calculateXingZuoYunshi(input: Record<string, unknown>): XingZuoYunshiResult {
  let xingZuo: XingZuo;
  if (input.xingZuo) {
    xingZuo = input.xingZuo as XingZuo;
  } else if (input.birthMonth && input.birthDay) {
    xingZuo = getXingZuoFromDate(input.birthMonth as number, input.birthDay as number);
  } else {
    xingZuo = "白羊座";
  }

  const dateStr = (input.date as string) || new Date().toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  const xzIdx = XINGZUO_LIST.indexOf(xingZuo);
  const element = ELEMENTS[xingZuo];

  const daySeed = y * 10000 + m * 100 + d + xzIdx * 13 + 7777;
  const rng = seededRandom(daySeed);

  // 基于元素和月份的基础分
  const monthBase = 60 + Math.sin((m + xzIdx) * 0.5) * 15;
  const dayVar = (rng() - 0.5) * 20;
  const total = clamp(monthBase + dayVar, 25, 95);

  const scores: XingZuoScores = {
    total,
    career: clamp(total + (rng() - 0.5) * 18, 25, 95),
    wealth: clamp(total + (rng() - 0.5) * 18, 25, 95),
    love: clamp(total + (rng() - 0.5) * 18, 25, 95),
    health: clamp(total + (rng() - 0.5) * 14, 30, 95),
  };

  const colors = ELEMENT_COLORS[element];
  const luckyColor = colors[Math.floor(rng() * colors.length)];
  const luckyNumber = Math.floor(rng() * 9) + 1;
  const partnerIdx = BEST_MATCH[xzIdx] ?? ((xzIdx + 4) % 12);

  const summaryPool = total >= 70 ? SUMMARIES_HIGH : total >= 45 ? SUMMARIES_MID : SUMMARIES_LOW;
  const summary = summaryPool[Math.floor(rng() * summaryPool.length)];
  const advice = ADVICES[Math.floor(rng() * ADVICES.length)];

  return {
    input: { xingZuo, birthMonth: input.birthMonth as number, birthDay: input.birthDay as number, date: dateStr },
    xingZuo,
    element,
    date: dateStr,
    scores,
    lucky: { color: luckyColor, number: luckyNumber, xingZuoPartner: XINGZUO_LIST[partnerIdx] },
    summary,
    advice,
  };
}
