// ── 择日大全计算引擎 ──
import { Solar } from "lunar-javascript";

interface ZeRiInput {
  eventType: string;
  startDate: string;
  endDate: string;
  maxResults?: number;
}

interface DateScore {
  date: string;
  lunarDate: string;
  ganZhi: string;
  score: number;
  level: string;
  zhiXing: string;
  xiu: string;
  tianShen: string;
  reasons: string[];
  yi: string[];
  ji: string[];
}

interface ZeRiResult {
  eventType: string;
  dateRange: { start: string; end: string };
  totalDays: number;
  recommendedDates: DateScore[];
  summary: string;
}

const LUNAR_MONTHS = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

// 建除十二直基础分（黄道+、黑道-，参照《协纪辨方书》）
// 口诀：除危定执黄，成开皆可用，建满平收黑，闭破不相当
const ZHI_XING_SCORE: Record<string, number> = {
  "建": -2, "除": 7, "满": -1, "平": -2, "定": 6,
  "执": 4, "破": -6, "危": 2, "成": 9, "收": -1, "开": 8, "闭": -5,
};

// 建除十二直宜事（参照《协纪辨方书》）
const ZHI_XING_YI: Record<string, string[]> = {
  "建": ["出行", "上梁", "上任"],
  "除": ["祈福", "解除", "求医", "沐浴"],
  "满": ["开业", "交易", "纳财", "祈福"],
  "平": ["修造", "栽种"],
  "定": ["嫁娶", "订婚", "纳采", "安床", "搬家", "入宅"],
  "执": ["祈福", "捕捉"],
  "破": [],
  "危": ["祈福", "安床", "入宅"],
  "成": ["嫁娶", "开业", "交易", "纳财", "入宅", "搬家", "纳采", "上任"],
  "收": ["纳财", "入宅", "栽种"],
  "开": ["开业", "出行", "动土", "修造", "开光", "祈福"],
  "闭": ["安葬"],
};

// 建除十二直忌事（参照《协纪辨方书》）
const ZHI_XING_JI: Record<string, string[]> = {
  "建": ["嫁娶", "动土", "修造"],
  "除": ["开业", "上任"],
  "满": ["嫁娶", "出行"],
  "平": [],
  "定": [],
  "执": ["嫁娶", "开业", "搬家", "出行"],
  "破": ["嫁娶", "开业", "入宅", "搬家", "动土", "纳采", "祈福"],
  "危": ["出行"],
  "成": [],
  "收": ["嫁娶", "开业", "出行"],
  "开": ["安葬"],
  "闭": ["嫁娶", "开业", "出行", "搬家", "开光", "祈福"],
};

const EVENT_ALIASES: Record<string, string[]> = {
  "嫁娶": ["嫁娶", "结婚", "婚嫁"],
  "搬家": ["搬家", "入宅", "移徙"],
  "开业": ["开业", "开市", "开张", "纳财"],
  "出行": ["出行", "旅行"],
  "动土": ["动土", "破土"],
  "安床": ["安床"],
  "入宅": ["入宅", "搬家", "移徙"],
  "上梁": ["上梁"],
  "开光": ["开光"],
  "纳采": ["纳采", "订婚"],
  "祈福": ["祈福", "求嗣"],
  "解除": ["解除"],
  "修造": ["修造", "装修"],
  "栽种": ["栽种"],
  "交易": ["交易", "纳财"],
  "安葬": ["安葬", "葬礼"],
};

function getEventAliases(eventType: string): string[] {
  for (const [key, aliases] of Object.entries(EVENT_ALIASES)) {
    if (key === eventType || aliases.includes(eventType)) {
      return aliases;
    }
  }
  return [eventType];
}

function scoreDate(y: number, m: number, d: number, eventType: string): DateScore | null {
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();

  let yi: string[] = [];
  let ji: string[] = [];
  try { yi = lunar.getDayYi(); } catch { /* empty */ }
  try { ji = lunar.getDayJi(); } catch { /* empty */ }

  const ganZhi = lunar.getDayInGanZhi();
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const lunarDate = `${LUNAR_MONTHS[lunarMonth]}月${LUNAR_DAYS[lunarDay]}`;

  let zhiXing = "";
  try { zhiXing = lunar.getZhiXing(); } catch { /* empty */ }

  let xiu = "";
  let xiuLuck = "";
  try { xiu = lunar.getXiu(); xiuLuck = lunar.getXiuLuck(); } catch { /* empty */ }

  let tianShen = "";
  let tianShenLuck = "";
  try { tianShen = lunar.getDayTianShen(); tianShenLuck = lunar.getDayTianShenLuck(); } catch { /* empty */ }

  const aliases = getEventAliases(eventType);
  const inYi = yi.some(item => aliases.some(a => item.includes(a)));
  const inJi = ji.some(item => aliases.some(a => item.includes(a)));

  if (inJi) return null;

  let score = 0;
  const reasons: string[] = [];

  if (inYi) {
    score += 30;
    reasons.push(`黄历宜${eventType}`);
  }

  if (zhiXing) {
    const zhiScore = ZHI_XING_SCORE[zhiXing] ?? 0;
    score += zhiScore;
    if (zhiScore > 5) reasons.push(`${zhiXing}日吉`);
    if (zhiScore < 0) reasons.push(`${zhiXing}日不利`);

    const zhiYi = ZHI_XING_YI[zhiXing] || [];
    if (zhiYi.some(e => aliases.includes(e))) {
      score += 8;
      reasons.push(`${zhiXing}日利${eventType}`);
    }

    const zhiJi = ZHI_XING_JI[zhiXing] || [];
    if (zhiJi.some(e => aliases.includes(e))) {
      score -= 10;
      reasons.push(`${zhiXing}日忌${eventType}`);
    }
  }

  if (tianShenLuck === "吉") {
    score += 6;
    reasons.push(`${tianShen}值日(吉)`);
  } else if (tianShenLuck === "凶") {
    score -= 4;
    reasons.push(`${tianShen}值日(凶)`);
  }

  if (xiuLuck === "吉") {
    score += 4;
    reasons.push(`${xiu}宿(吉)`);
  } else if (xiuLuck === "凶") {
    score -= 3;
  }

  let jiShen: string[] = [];
  try { jiShen = lunar.getDayJiShen(); } catch { /* empty */ }
  if (jiShen.length >= 3) {
    score += 3;
    reasons.push(`吉神${jiShen.slice(0, 2).join("、")}等`);
  }

  if (score < 0 && !inYi) return null;

  let level: string;
  if (score >= 40) level = "上上吉";
  else if (score >= 30) level = "上吉";
  else if (score >= 20) level = "中吉";
  else if (score >= 10) level = "小吉";
  else level = "可用";

  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return {
    date: dateStr,
    lunarDate,
    ganZhi,
    score,
    level,
    zhiXing,
    xiu,
    tianShen,
    reasons,
    yi,
    ji,
  };
}

export function calculateZeRi(input: unknown): ZeRiResult {
  const p = input as ZeRiInput;
  const eventType = p.eventType || "嫁娶";
  const maxResults = p.maxResults || 10;

  const [sy, sm, sd] = p.startDate.split("-").map(Number);
  const [ey, em, ed] = p.endDate.split("-").map(Number);

  const startMs = new Date(sy, sm - 1, sd).getTime();
  const endMs = new Date(ey, em - 1, ed).getTime();
  const dayMs = 86400000;
  const totalDays = Math.min(Math.floor((endMs - startMs) / dayMs) + 1, 90);

  const candidates: DateScore[] = [];

  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(startMs + i * dayMs);
    const result = scoreDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), eventType);
    if (result) candidates.push(result);
  }

  candidates.sort((a, b) => b.score - a.score);
  const recommended = candidates.slice(0, maxResults);

  const summary = recommended.length > 0
    ? `在${p.startDate}至${p.endDate}期间，共${totalDays}天中筛选出${recommended.length}个适合${eventType}的吉日，最佳日期为${recommended[0].date}(${recommended[0].lunarDate}，${recommended[0].level})`
    : `在${p.startDate}至${p.endDate}期间，未找到特别适合${eventType}的吉日，建议扩大日期范围`;

  return {
    eventType,
    dateRange: { start: p.startDate, end: p.endDate },
    totalDays,
    recommendedDates: recommended,
    summary,
  };
}
