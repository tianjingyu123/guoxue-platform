// ── 紫微斗数流日流时计算器 ──
import { calcZiwei } from "@guoxue/ziwei-engine";
import { calcRiZhu, calcShiZhu, GAN, ZHI } from "@guoxue/bazi-engine";
import type { Gan, Zhi } from "@guoxue/bazi-engine";
import { Solar } from "lunar-javascript";

const GONG_NAMES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"] as const;

const SI_HUA_TABLE: [string, string, string, string][] = [
  ["廉贞", "破军", "武曲", "太阳"], // 甲
  ["天机", "天梁", "紫微", "太阴"], // 乙
  ["天同", "天机", "文昌", "廉贞"], // 丙
  ["太阴", "天同", "天机", "巨门"], // 丁
  ["贪狼", "太阴", "右弼", "天机"], // 戊
  ["武曲", "贪狼", "天梁", "文曲"], // 己
  ["太阳", "武曲", "太阴", "天同"], // 庚
  ["巨门", "太阳", "文曲", "文昌"], // 辛
  ["天梁", "紫微", "左辅", "武曲"], // 壬
  ["破军", "巨门", "太阴", "贪狼"], // 癸
];

interface ZiweiLiuRiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: "男" | "女";
  targetYear: number;
  targetMonth: number;
  targetDay: number;
  targetHour?: number;
}

interface FlowPalace {
  flowGongName: string;
  natalGongName: string;
  zhi: string;
  natalStars: string[];
  isHuaLu: boolean;
  isHuaQuan: boolean;
  isHuaKe: boolean;
  isHuaJi: boolean;
}

interface ZiweiLiuRiResult {
  natalInfo: {
    wuXingJu: string;
    mingGongZhi: string;
    shenGong: string;
  };
  flowDay: {
    ganZhi: string;
    gan: string;
    zhi: string;
  };
  flowHour: { ganZhi: string; gan: string; zhi: string } | null;
  flowDayMingGong: string;
  flowSiHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string };
  palaces: FlowPalace[];
  fortune: {
    overall: string;
    career: string;
    wealth: string;
    love: string;
    health: string;
  };
  highlights: string[];
  summary: string;
}

function getSiHua(gan: Gan) {
  const idx = GAN.indexOf(gan);
  const [huaLu, huaQuan, huaKe, huaJi] = SI_HUA_TABLE[idx];
  return { huaLu, huaQuan, huaKe, huaJi };
}

function hourToZhi(hour: number): Zhi {
  const idx = Math.floor(((hour + 1) % 24) / 2);
  return ZHI[idx];
}

export function calculateZiweiLiuRi(input: unknown): ZiweiLiuRiResult {
  const p = input as ZiweiLiuRiInput;

  const solar = Solar.fromYmd(p.year, p.month, p.day);
  const lunar = solar.getLunar();
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const lunarYearGanZhi = lunar.getYearInGanZhi();
  const lunarYearGan = lunarYearGanZhi[0] as Gan;
  const lunarYearZhi = lunarYearGanZhi[1] as Zhi;
  const lunarHour = hourToZhi(p.hour);

  const natalChart = calcZiwei({
    name: "",
    gender: p.gender,
    year: p.year,
    month: p.month,
    day: p.day,
    hour: p.hour,
    lunarMonth,
    lunarDay,
    lunarHour: lunarHour as any,
    lunarYearGan: lunarYearGan as any,
    lunarYearZhi: lunarYearZhi as any,
  });

  const dayPillar = calcRiZhu(p.targetYear, p.targetMonth, p.targetDay);
  const dayGan = dayPillar.gan;
  const dayZhi = dayPillar.zhi;

  let flowHour: { ganZhi: string; gan: string; zhi: string } | null = null;
  if (p.targetHour !== undefined) {
    const shiPillar = calcShiZhu(dayGan, p.targetHour);
    flowHour = { ganZhi: shiPillar.ganZhi, gan: shiPillar.gan, zhi: shiPillar.zhi };
  }

  let flowMingGongIdx = -1;
  for (let i = 0; i < natalChart.gongWei.length; i++) {
    if (natalChart.gongWei[i].zhi === dayZhi) {
      flowMingGongIdx = i;
      break;
    }
  }
  if (flowMingGongIdx === -1) flowMingGongIdx = 0;

  const flowSiHua = getSiHua(dayGan);

  const palaces: FlowPalace[] = [];
  for (let i = 0; i < 12; i++) {
    const natalIdx = (flowMingGongIdx + i) % 12;
    const natalPalace = natalChart.gongWei[natalIdx];
    const starNames = natalPalace.stars.map(s => s.name);

    palaces.push({
      flowGongName: GONG_NAMES[i],
      natalGongName: natalPalace.name,
      zhi: natalPalace.zhi,
      natalStars: starNames,
      isHuaLu: starNames.includes(flowSiHua.huaLu),
      isHuaQuan: starNames.includes(flowSiHua.huaQuan),
      isHuaKe: starNames.includes(flowSiHua.huaKe),
      isHuaJi: starNames.includes(flowSiHua.huaJi),
    });
  }

  const fortune = analyzeFortune(palaces);
  const highlights = generateHighlights(palaces, flowSiHua);
  const summary = buildSummary(dayPillar.ganZhi, palaces, fortune);

  return {
    natalInfo: {
      wuXingJu: natalChart.wuXingJu,
      mingGongZhi: natalChart.mingGong.zhi,
      shenGong: natalChart.shenGong,
    },
    flowDay: { ganZhi: dayPillar.ganZhi, gan: dayGan, zhi: dayZhi },
    flowHour,
    flowDayMingGong: palaces[0]?.natalGongName || "命宫",
    flowSiHua,
    palaces,
    fortune,
    highlights,
    summary,
  };
}

function analyzeFortune(palaces: FlowPalace[]) {
  const ming = palaces[0];
  const cai = palaces[4];
  const guan = palaces[8];
  const ji = palaces[5];

  const STAR_FORTUNE: Record<string, { career: number; wealth: number; love: number; health: number }> = {
    "紫微": { career: 3, wealth: 2, love: 1, health: 1 },
    "天机": { career: 1, wealth: 1, love: 2, health: 1 },
    "太阳": { career: 3, wealth: 2, love: 2, health: 0 },
    "武曲": { career: 2, wealth: 3, love: -1, health: 1 },
    "天同": { career: 0, wealth: 1, love: 2, health: 2 },
    "廉贞": { career: 2, wealth: 1, love: 1, health: -1 },
    "天府": { career: 2, wealth: 3, love: 1, health: 2 },
    "太阴": { career: 1, wealth: 2, love: 3, health: 1 },
    "贪狼": { career: 1, wealth: 2, love: 3, health: 1 },
    "巨门": { career: 1, wealth: 1, love: -1, health: 0 },
    "天相": { career: 2, wealth: 2, love: 1, health: 1 },
    "天梁": { career: 2, wealth: 1, love: 0, health: 2 },
    "七杀": { career: 2, wealth: 1, love: -1, health: -1 },
    "破军": { career: 1, wealth: 0, love: -1, health: -1 },
    "左辅": { career: 2, wealth: 1, love: 1, health: 1 },
    "右弼": { career: 2, wealth: 1, love: 1, health: 1 },
    "文昌": { career: 2, wealth: 1, love: 1, health: 1 },
    "文曲": { career: 1, wealth: 1, love: 2, health: 1 },
    "天魁": { career: 2, wealth: 1, love: 1, health: 1 },
    "天钺": { career: 2, wealth: 1, love: 1, health: 1 },
    "擎羊": { career: 0, wealth: -1, love: -2, health: -2 },
    "陀罗": { career: -1, wealth: -1, love: -1, health: -1 },
    "火星": { career: 0, wealth: -1, love: -1, health: -2 },
    "铃星": { career: 0, wealth: -1, love: -1, health: -2 },
    "地空": { career: -1, wealth: -2, love: 0, health: 0 },
    "地劫": { career: -1, wealth: -2, love: 0, health: 0 },
  };

  let careerScore = 0, wealthScore = 0, loveScore = 0, healthScore = 0;

  for (const star of ming.natalStars) {
    const f = STAR_FORTUNE[star];
    if (f) { careerScore += f.career; wealthScore += f.wealth; loveScore += f.love; healthScore += f.health; }
  }
  for (const star of cai.natalStars) {
    const f = STAR_FORTUNE[star];
    if (f) wealthScore += f.wealth;
  }
  for (const star of guan.natalStars) {
    const f = STAR_FORTUNE[star];
    if (f) careerScore += f.career;
  }

  if (ming.isHuaLu) { careerScore += 2; wealthScore += 2; }
  if (cai.isHuaLu) wealthScore += 3;
  if (guan.isHuaLu) careerScore += 3;
  if (ming.isHuaJi) { careerScore -= 2; healthScore -= 1; }
  if (cai.isHuaJi) wealthScore -= 3;
  if (ji.isHuaJi) healthScore -= 2;

  const careerText = careerScore >= 3 ? "事业运极佳，贵人相助" : careerScore >= 1 ? "事业平顺，稳步推进" : careerScore >= -1 ? "事业平淡，守成为主" : "事业有阻，宜低调";
  const wealthText = wealthScore >= 3 ? "财运旺盛，利进财" : wealthScore >= 1 ? "财运平稳，正常收支" : wealthScore >= -1 ? "财运一般，节流为上" : "防破财，不宜投资";
  const loveText = loveScore >= 3 ? "桃花旺盛，异性缘佳" : loveScore >= 1 ? "感情和谐" : loveScore >= -1 ? "感情平淡" : "感情有波折";
  const healthText = healthScore >= 2 ? "精力充沛" : healthScore >= 0 ? "身体无恙" : healthScore >= -1 ? "注意休息" : "注意健康，防小疾";

  const totalScore = careerScore + wealthScore + loveScore + healthScore;
  let overall: string;
  if (totalScore >= 8) overall = "大吉之日，诸事顺遂，宜积极进取";
  else if (totalScore >= 4) overall = "小吉之日，整体顺利";
  else if (totalScore >= 0) overall = "平稳之日，宜守不宜攻";
  else if (totalScore >= -4) overall = "小凶之日，谨慎行事";
  else overall = "不利之日，宜静不宜动";

  return { overall, career: careerText, wealth: wealthText, love: loveText, health: healthText };
}

function generateHighlights(palaces: FlowPalace[], _siHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string }): string[] {
  const highlights: string[] = [];

  const ming = palaces[0];
  if (ming.isHuaLu) highlights.push(`化禄入流日命宫(${ming.natalGongName})，今日运势加持`);
  if (ming.isHuaJi) highlights.push(`化忌入流日命宫(${ming.natalGongName})，诸事需谨慎`);

  const cai = palaces[4];
  if (cai.isHuaLu) highlights.push(`化禄入流日财帛(${cai.natalGongName})，利财运`);
  if (cai.isHuaJi) highlights.push(`化忌入流日财帛(${cai.natalGongName})，防破财`);

  const guan = palaces[8];
  if (guan.isHuaLu) highlights.push(`化禄入流日官禄(${guan.natalGongName})，事业有利`);
  if (guan.isHuaJi) highlights.push(`化忌入流日官禄(${guan.natalGongName})，工作防错`);

  const ji = palaces[5];
  if (ji.isHuaJi) highlights.push(`化忌入流日疾厄(${ji.natalGongName})，注意健康`);

  const mainStarsInMing = ming.natalStars.filter(s =>
    ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"].includes(s)
  );
  if (mainStarsInMing.length > 0) {
    highlights.push(`流日命宫有主星：${mainStarsInMing.join("、")}`);
  }

  if (highlights.length === 0) {
    highlights.push("今日流日无特殊星曜引动，平稳度日");
  }

  return highlights;
}

function buildSummary(dayGanZhi: string, palaces: FlowPalace[], fortune: { overall: string }): string {
  const ming = palaces[0];
  return `流日${dayGanZhi}，命宫落${ming.natalGongName}(${ming.zhi})，有星${ming.natalStars.slice(0, 3).join("、") || "无主星"}。${fortune.overall}`;
}
