// ── 生肖运势计算引擎 ──

import type { ShengXiaoYunshiResult, ShengXiao, YunshiScores } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const XIAO_LIST: ShengXiao[] = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const XIAO_WUXING: Record<ShengXiao, string> = { "鼠": "水", "牛": "土", "虎": "木", "兔": "木", "龙": "土", "蛇": "火", "马": "火", "羊": "土", "猴": "金", "鸡": "金", "狗": "土", "猪": "水" };

const LIU_HE_MAP: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const SAN_HE_MAP: Record<number, number[]> = { 0: [4, 8], 1: [5, 9], 2: [6, 10], 3: [7, 11], 4: [0, 8], 5: [1, 9], 6: [2, 10], 7: [3, 11], 8: [0, 4], 9: [1, 5], 10: [2, 6], 11: [3, 7] };
const CHONG_MAP: Record<number, number> = { 0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11, 6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5 };
const HAI_MAP: Record<number, number> = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 10: 9, 9: 10, 8: 11, 11: 8 };
const XING_MAP: Record<number, number[]> = { 0: [3], 1: [10, 7], 2: [5, 8], 3: [0], 4: [4], 5: [2, 8], 6: [6], 7: [1], 8: [2, 5], 9: [9], 10: [1], 11: [11] };
const PO_MAP: Record<number, number> = { 0: 9, 9: 0, 1: 4, 4: 1, 2: 11, 11: 2, 3: 6, 6: 3, 5: 8, 8: 5, 7: 10, 10: 7 };

const WUXING_COLORS: Record<string, string[]> = { "金": ["白色", "银色", "金色"], "木": ["绿色", "青色", "翠色"], "水": ["黑色", "蓝色", "深蓝"], "火": ["红色", "紫色", "粉色"], "土": ["黄色", "棕色", "米色"] };
const WUXING_DIRECTIONS: Record<string, string> = { "金": "正西", "木": "正东", "水": "正北", "火": "正南", "土": "中央" };

const YI_POOL = ["签约", "谈判", "出行", "投资", "社交", "学习", "运动", "约会", "面试", "搬家", "求财", "开业", "置业", "修缮", "进货", "拜访"];
const JI_POOL = ["赌博", "争执", "熬夜", "冲动消费", "远行", "手术", "借贷", "跳槽", "诉讼", "动土", "大额消费", "冒险"];

function getShengXiaoFromYear(year: number): ShengXiao {
  return XIAO_LIST[(year - 4) % 12];
}

function getTaiSuiRelation(xiaoIdx: number, yearIdx: number): { name: string; baseScore: number } {
  if (xiaoIdx === yearIdx) return { name: "值太岁", baseScore: 55 };
  if (CHONG_MAP[xiaoIdx] === yearIdx) return { name: "冲太岁", baseScore: 40 };
  if (HAI_MAP[xiaoIdx] === yearIdx) return { name: "害太岁", baseScore: 50 };
  if (XING_MAP[xiaoIdx]?.includes(yearIdx)) return { name: "刑太岁", baseScore: 48 };
  if (PO_MAP[xiaoIdx] === yearIdx) return { name: "破太岁", baseScore: 52 };
  if (LIU_HE_MAP[xiaoIdx] === yearIdx) return { name: "六合太岁", baseScore: 88 };
  if (SAN_HE_MAP[xiaoIdx]?.includes(yearIdx)) return { name: "三合太岁", baseScore: 82 };
  return { name: "无犯太岁", baseScore: 70 };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function calculateShengXiaoYunshi(input: Record<string, unknown>): ShengXiaoYunshiResult {
  let shengXiao: ShengXiao;
  const birthYear = input.birthYear as number | undefined;
  if (input.shengXiao) {
    shengXiao = input.shengXiao as ShengXiao;
  } else if (birthYear) {
    shengXiao = getShengXiaoFromYear(birthYear);
  } else {
    shengXiao = "龙";
  }

  const dateStr = (input.date as string) || new Date().toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();

  const yearZhi = lunar.getYearZhi();
  const yearIdx = ZHI_LIST.indexOf(yearZhi);
  const xiaoIdx = XIAO_LIST.indexOf(shengXiao);
  const dayZhi = lunar.getDayZhi();
  const dayIdx = ZHI_LIST.indexOf(dayZhi);

  const { name: taiSuiRelation, baseScore } = getTaiSuiRelation(xiaoIdx, yearIdx);

  // 基于日期的确定性随机变化
  const daySeed = y * 10000 + m * 100 + d + xiaoIdx * 7;
  const rng = seededRandom(daySeed);

  // 日支关系调整
  let dayAdj = 0;
  if (LIU_HE_MAP[xiaoIdx] === dayIdx) dayAdj = 10;
  else if (SAN_HE_MAP[xiaoIdx]?.includes(dayIdx)) dayAdj = 7;
  else if (CHONG_MAP[xiaoIdx] === dayIdx) dayAdj = -10;
  else if (HAI_MAP[xiaoIdx] === dayIdx) dayAdj = -5;
  else dayAdj = Math.round((rng() - 0.5) * 10);

  const totalBase = baseScore + dayAdj + Math.round((rng() - 0.5) * 8);
  const total = clamp(totalBase, 20, 98);

  const scores: YunshiScores = {
    total,
    career: clamp(total + Math.round((rng() - 0.5) * 16), 20, 98),
    wealth: clamp(total + Math.round((rng() - 0.5) * 16), 20, 98),
    love: clamp(total + Math.round((rng() - 0.5) * 16), 20, 98),
    health: clamp(total + Math.round((rng() - 0.5) * 12), 25, 98),
  };

  const wx = XIAO_WUXING[shengXiao];
  const colors = WUXING_COLORS[wx];
  const luckyColor = colors[Math.floor(rng() * colors.length)];
  const luckyNumber = Math.floor(rng() * 9) + 1;
  const luckyDirection = WUXING_DIRECTIONS[wx];
  const partnerIdx = LIU_HE_MAP[xiaoIdx] ?? ((xiaoIdx + 4) % 12);
  const luckyPartner = XIAO_LIST[partnerIdx];

  // 宜忌（基于当日分数选取）
  const yiCount = total >= 70 ? 4 : total >= 50 ? 3 : 2;
  const jiCount = total >= 70 ? 2 : total >= 50 ? 3 : 4;
  const yi: string[] = [];
  const ji: string[] = [];
  const yiCopy = [...YI_POOL];
  const jiCopy = [...JI_POOL];
  for (let i = 0; i < yiCount; i++) {
    const idx = Math.floor(rng() * yiCopy.length);
    yi.push(yiCopy.splice(idx, 1)[0]);
  }
  for (let i = 0; i < jiCount; i++) {
    const idx = Math.floor(rng() * jiCopy.length);
    ji.push(jiCopy.splice(idx, 1)[0]);
  }

  let summary: string;
  if (total >= 80) summary = `今日${shengXiao}运势大吉，诸事顺遂，宜大胆行动。`;
  else if (total >= 65) summary = `今日${shengXiao}运势较好，适合推进计划中的事务。`;
  else if (total >= 50) summary = `今日${shengXiao}运势平稳，平常心对待即可。`;
  else if (total >= 35) summary = `今日${shengXiao}运势偏弱，宜守不宜攻，低调行事。`;
  else summary = `今日${shengXiao}运势不佳，建议静观其变，避免冲动。`;

  return {
    input: { shengXiao, birthYear, date: dateStr },
    shengXiao,
    date: dateStr,
    yearZhi,
    taiSuiRelation,
    scores,
    lucky: { color: luckyColor, number: luckyNumber, direction: luckyDirection, partner: luckyPartner },
    yiJi: { yi, ji },
    summary,
  };
}
