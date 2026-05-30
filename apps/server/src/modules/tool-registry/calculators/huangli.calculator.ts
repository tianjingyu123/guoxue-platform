// ── 每日黄历计算引擎 ──

import type { HuangLiResult } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

const LUNAR_MONTHS = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

export function calculateHuangLi(input: Record<string, unknown>): HuangLiResult {
  const dateStr = (input.date as string) || new Date().toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);

  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();

  const yearGZ = lunar.getYearInGanZhi();
  const monthGZ = lunar.getMonthInGanZhi();
  const dayGZ = lunar.getDayInGanZhi();

  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const lunarDate = `${yearGZ}年${LUNAR_MONTHS[lunarMonth]}月${LUNAR_DAYS[lunarDay]}`;

  const jieQi = lunar.getJieQi() || null;

  const chongDesc = lunar.getDayChongDesc();
  const sha = lunar.getDaySha();
  const chongSha = `冲${chongDesc} 煞${sha}`;

  const dayGan = lunar.getDayGan();
  const caiShen = getPositionFromGan(dayGan, "财");
  const xiShen = getPositionFromGan(dayGan, "喜");
  const fuShen = getPositionFromGan(dayGan, "福");

  let jiShen: string[] = [];
  let xiongShen: string[] = [];
  try {
    jiShen = lunar.getDayJiShen().slice(0, 5);
    xiongShen = lunar.getDayXiongSha().slice(0, 5);
  } catch { /* some dates may not have data */ }

  let yi: string[] = [];
  let ji: string[] = [];
  try {
    yi = lunar.getDayYi();
    ji = lunar.getDayJi();
  } catch { /* fallback */ }
  if (yi.length === 0) yi = getDefaultYi(dayGZ);
  if (ji.length === 0) ji = getDefaultJi(dayGZ);

  const jiShi = getJiShi(dayGZ);
  const summary = buildSummary(dateStr, lunarDate, dayGZ, jieQi, yi, ji);

  return {
    date: dateStr,
    lunarDate,
    ganZhi: { year: yearGZ, month: monthGZ, day: dayGZ },
    jieQi,
    chongSha,
    caiShen,
    xiShen,
    fuShen,
    jiShen,
    xiongShen,
    yi: yi.slice(0, 8),
    ji: ji.slice(0, 8),
    jiShi,
    summary,
  };
}

function getPositionFromGan(gan: string, type: string): string {
  const caiMap: Record<string, string> = { "甲": "东北", "乙": "东方", "丙": "东南", "丁": "正南", "戊": "正南", "己": "正北", "庚": "西南", "辛": "正西", "壬": "正北", "癸": "正东" };
  const xiMap: Record<string, string> = { "甲": "东北", "乙": "西北", "丙": "正南", "丁": "正南", "戊": "东南", "己": "东北", "庚": "西南", "辛": "正西", "壬": "正南", "癸": "东南" };
  const fuMap: Record<string, string> = { "甲": "正北", "乙": "西南", "丙": "西北", "丁": "正东", "戊": "正北", "己": "东南", "庚": "西南", "辛": "东南", "壬": "东北", "癸": "正南" };
  if (type === "财") return caiMap[gan] || "正南";
  if (type === "喜") return xiMap[gan] || "东北";
  return fuMap[gan] || "正北";
}

const YI_POOL = ["嫁娶", "祭祀", "开光", "出行", "解除", "纳采", "冠笄", "入宅", "安门", "修造", "动土", "安床", "移徙", "挂匾", "栽种", "交易", "立券", "入殓", "启攒", "安葬"];
const JI_POOL = ["开市", "动土", "破土", "安葬", "嫁娶", "修造", "移徙", "入宅", "出行", "安门", "安床", "祈福"];

function getDefaultYi(dayGZ: string): string[] {
  const seed = dayGZ.charCodeAt(0) * 100 + dayGZ.charCodeAt(1);
  const count = 4 + (seed % 4);
  const result: string[] = [];
  const pool = [...YI_POOL];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 7) % pool.length;
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function getDefaultJi(dayGZ: string): string[] {
  const seed = dayGZ.charCodeAt(0) * 50 + dayGZ.charCodeAt(1);
  const count = 3 + (seed % 3);
  const result: string[] = [];
  const pool = [...JI_POOL];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 5) % pool.length;
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function getJiShi(dayGZ: string): string[] {
  const shiChen = ["子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时"];
  const seed = dayGZ.charCodeAt(0) + dayGZ.charCodeAt(1);
  const count = 3 + (seed % 3);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shiChen[(seed + i * 3) % 12]);
  }
  return [...new Set(result)];
}

function buildSummary(date: string, lunarDate: string, dayGZ: string, jieQi: string | null, yi: string[], ji: string[]): string {
  let s = `${date}（${lunarDate}）${dayGZ}日`;
  if (jieQi) s += `，${jieQi}`;
  s += `。宜：${yi.slice(0, 3).join("、")}`;
  s += `；忌：${ji.slice(0, 3).join("、")}。`;
  return s;
}
