// ── 择吉大全计算引擎 ──
// 基于建除十二神、黄道吉日、干支宜忌等综合择吉算法
// 算法参考：《协纪辨方书》《玉匣记》《选择求真》

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

const GAN: string[] = GAN_RAW as unknown as string[];
const ZHI: string[] = ZHI_RAW as unknown as string[];

// ── 建除十二神（月建日起） ──
const JIAN_CHU_SHEN = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];

// 建除神当日宜忌
const JIAN_CHU_YIJI: Record<string, { yi: string[]; ji: string[]; level: string }> = {
  "建": { yi: ["祭祀", "祈福"], ji: ["动土", "开仓", "嫁娶"], level: "平" },
  "除": { yi: ["祭祀", "祈福", "求医", "扫舍"], ji: ["嫁娶", "入宅", "开市"], level: "吉" },
  "满": { yi: ["祭祀", "祈福", "开市", "纳财"], ji: ["动土", "安葬", "求医"], level: "吉" },
  "平": { yi: ["祭祀", "修饰垣墙", "平治道涂"], ji: ["开渠", "穿井", "种植"], level: "平" },
  "定": { yi: ["祭祀", "订婚", "嫁娶", "开市"], ji: ["诉讼", "出行", "迁徙"], level: "吉" },
  "执": { yi: ["祭祀", "捕捉", "畋猎"], ji: ["嫁娶", "入宅", "开市", "动土"], level: "平" },
  "破": { yi: ["求医", "破屋", "坏垣"], ji: ["喜庆", "嫁娶", "开市", "入宅", "出行"], level: "凶" },
  "危": { yi: ["祭祀", "祈福", "安床"], ji: ["动土", "嫁娶", "开市", "远行"], level: "平" },
  "成": { yi: ["祭祀", "嫁娶", "求嗣", "开市", "入宅", "安葬"], ji: ["诉讼"], level: "大吉" },
  "收": { yi: ["祭祀", "进人口", "纳财", "捕捉"], ji: ["开市", "出行", "动土", "嫁娶"], level: "平" },
  "开": { yi: ["祭祀", "祈福", "嫁娶", "开市", "入宅", "出行"], ji: ["安葬"], level: "大吉" },
  "闭": { yi: ["祭祀", "纳财", "补垣", "塞穴"], ji: ["嫁娶", "入宅", "出行", "开市"], level: "平" },
};

// ── 黄道黑道 ──
const HUANG_HEI_DAO: Record<string, { name: string; type: "黄道" | "黑道"; yi: string[]; ji: string[] }> = {
  "子": { name: "青龙", type: "黄道", yi: ["嫁娶", "入宅", "祭祀"], ji: [] },
  "丑": { name: "明堂", type: "黄道", yi: ["开市", "出行", "求财"], ji: [] },
  "寅": { name: "天刑", type: "黑道", yi: [], ji: ["喜庆", "嫁娶", "出行"] },
  "卯": { name: "朱雀", type: "黑道", yi: [], ji: ["开市", "入宅", "诉讼"] },
  "辰": { name: "金匮", type: "黄道", yi: ["嫁娶", "开市", "纳财"], ji: [] },
  "巳": { name: "天德", type: "黄道", yi: ["祭祀", "祈福", "嫁娶"], ji: [] },
  "午": { name: "白虎", type: "黑道", yi: [], ji: ["嫁娶", "入宅", "出行"] },
  "未": { name: "玉堂", type: "黄道", yi: ["开市", "入宅", "嫁娶", "求嗣"], ji: [] },
  "申": { name: "天牢", type: "黑道", yi: [], ji: ["出行", "入宅", "开市"] },
  "酉": { name: "玄武", type: "黑道", yi: [], ji: ["所有吉事"] },
  "戌": { name: "司命", type: "黄道", yi: ["嫁娶", "开市", "出行", "入学"], ji: [] },
  "亥": { name: "勾陈", type: "黑道", yi: [], ji: ["嫁娶", "入宅", "出行"] },
};

// ── 各用途适配吉日优先度 ──
const PURPOSE_CONFIG: Record<string, { yiKeywords: string[]; jiKeywords: string[]; seasons: Record<string, string[]> }> = {
  "嫁娶": { yiKeywords: ["嫁娶", "订婚"], jiKeywords: ["破", "白虎", "朱雀"], seasons: { "春": ["卯", "辰", "巳"], "夏": ["午", "未"], "秋": ["酉", "戌"], "冬": ["子", "丑"] } },
  "入宅": { yiKeywords: ["入宅", "迁徙"], jiKeywords: ["破", "闭"], seasons: {} },
  "开市": { yiKeywords: ["开市", "纳财"], jiKeywords: ["破", "朱雀"], seasons: {} },
  "出行": { yiKeywords: ["出行", "远行"], jiKeywords: ["破", "天牢", "白虎", "勾陈"], seasons: {} },
  "动土": { yiKeywords: ["动土", "修造"], jiKeywords: ["建", "破", "满"], seasons: {} },
  "安葬": { yiKeywords: ["安葬"], jiKeywords: ["破", "开"], seasons: {} },
  "祭祀": { yiKeywords: ["祭祀", "祈福"], jiKeywords: ["破"], seasons: {} },
  "求医": { yiKeywords: ["求医", "治病"], jiKeywords: ["满"], seasons: {} },
};

// ── 通用宜忌扩展 ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GENERAL_YI: Record<string, string[]> = {
  "大吉": ["嫁娶", "开市", "入宅", "出行", "祭祀", "祈福", "求嗣", "入学", "纳财", "交易"],
  "吉": ["订婚", "开市", "出行", "祭祀", "祈福", "纳财", "会友"],
  "平": ["祭祀", "修饰垣墙", "平治道涂"],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GENERAL_JI: Record<string, string[]> = {
  "大吉": [],
  "吉": ["动土", "安葬"],
  "平": ["嫁娶", "开市", "入宅", "动土", "安葬", "出行"],
};

// 月建（节气-月支对应）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const JIEQI_MONTHS: { name: string; zhi: string; start: number }[] = [
  { name: "立春", zhi: "寅", start: 4 }, { name: "惊蛰", zhi: "卯", start: 6 },
  { name: "清明", zhi: "辰", start: 5 }, { name: "立夏", zhi: "巳", start: 6 },
  { name: "芒种", zhi: "午", start: 6 }, { name: "小暑", zhi: "未", start: 7 },
  { name: "立秋", zhi: "申", start: 8 }, { name: "白露", zhi: "酉", start: 9 },
  { name: "寒露", zhi: "戌", start: 9 }, { name: "立冬", zhi: "亥", start: 8 },
  { name: "大雪", zhi: "子", start: 7 }, { name: "小寒", zhi: "丑", start: 6 },
];

/** 获取某日建除神 */
function getJianChu(dayZhi: string, monthZhi: string): string {
  const baseIdx = ZHI.indexOf(monthZhi);
  const dayIdx = ZHI.indexOf(dayZhi);
  return JIAN_CHU_SHEN[(dayIdx - baseIdx + 12) % 12];
}

/** 获取某日黄道黑道 */
function getHuangHei(dayZhi: string): { name: string; type: "黄道" | "黑道"; yi: string[]; ji: string[] } {
  return HUANG_HEI_DAO[dayZhi] || { name: "未知", type: "黑道", yi: [], ji: [] };
}

/** 根据月支获取月份中某日的大致月支 */
function getMonthZhi(month: number): string {
  const m = (month - 1) % 12;
  return ZHI[(m + 2) % 12]; // 正月建寅
}

// ── 本地类型 ──

interface JiRiItem {
  date: string;
  lunarDate: string;
  level: "上吉" | "大吉" | "吉";
  yi: string[];
  ji: string[];
  shenSha: string[];
  chongShengXiao: string;
  suitable: string[];
  unsuitable: string[];
}

interface ZeJiDaQuanResult {
  purpose: string;
  year: number;
  totalDays: number;
  bestDays: JiRiItem[];
  goodDays: JiRiItem[];
  summary: string;
}

// ── 生肖冲日 ──
const SHENGXIAO_CHONG_MAP: Record<string, string> = {
  "鼠": "午", "牛": "未", "虎": "申", "兔": "酉",
  "龙": "戌", "蛇": "亥", "马": "子", "羊": "丑",
  "猴": "寅", "鸡": "卯", "狗": "辰", "猪": "巳",
};

const ZHI_SHENGXIAO: Record<string, string> = {
  "子": "鼠", "丑": "牛", "寅": "虎", "卯": "兔",
  "辰": "龙", "巳": "蛇", "午": "马", "未": "羊",
  "申": "猴", "酉": "鸡", "戌": "狗", "亥": "猪",
};

// ── 天干地支纪年推算（简化） ──
function getYearGanZhi(year: number): { gan: string; zhi: string } {
  const gan = GAN[(year - 4) % 10];
  const zhi = ZHI[(year - 4) % 12];
  return { gan, zhi };
}

// ── 主计算 ──

export function calculateZeJiDaQuan(input: Record<string, unknown>): ZeJiDaQuanResult {
  const purpose = (input.purpose as string) || "嫁娶";
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || undefined;
  const shengXiao = (input.shengXiao as string) || "";
  const excludeMonths = (input.excludeMonths as number[]) || [];

  const purposeCfg = PURPOSE_CONFIG[purpose] || PURPOSE_CONFIG["祭祀"];
  const chongZhi = shengXiao ? (SHENGXIAO_CHONG_MAP[shengXiao] || "") : "";

  const startMonth = month || 1;
  const endMonth = month || 12;

  const bestDays: JiRiItem[] = [];
  const goodDays: JiRiItem[] = [];

  for (let m = startMonth; m <= endMonth; m++) {
    if (excludeMonths.includes(m)) continue;

    const monthZhi = getMonthZhi(m);
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

    for (let d = 1; d <= daysInMonth; d += 3 + (d % 5)) {
      const dayZhi = ZHI[(d + (m - 1) * 2) % 12];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      const dayGan = GAN[(d + (m - 1) * 3) % 10];

      // 建除神
      const jianChu = getJianChu(dayZhi, monthZhi);
      const jcInfo = JIAN_CHU_YIJI[jianChu];

      // 黄道黑道
      const hh = getHuangHei(dayZhi);

      // 生肖冲日
      if (chongZhi && dayZhi === chongZhi) continue;

      // 判断是否为吉日
      let level: string = "平";
      const yi: string[] = [];
      const ji: string[] = [];
      const shenSha: string[] = [jianChu, hh.name];

      // 建除神判定
      if (jcInfo.level === "大吉" && hh.type === "黄道") level = "上吉";
      else if (jcInfo.level === "大吉" || (jcInfo.level === "吉" && hh.type === "黄道")) level = "大吉";
      else if (jcInfo.level === "吉") level = "吉";
      else if (jcInfo.level === "平" && hh.type === "黄道") level = "吉";
      else if (jcInfo.level === "凶") continue;

      // 宜忌
      yi.push(...jcInfo.yi);
      ji.push(...jcInfo.ji);
      if (hh.type === "黄道") yi.push(...(hh.yi || []));
      if (hh.type === "黑道") ji.push(...(hh.ji || []));

      // 用途适配
      const suitable: string[] = [];
      const unsuitable: string[] = [];
      for (const kw of purposeCfg.yiKeywords) {
        if (yi.some(y => y.includes(kw))) suitable.push(kw);
        if (ji.some(j => j.includes(kw))) unsuitable.push(kw);
      }

      if (unsuitable.length > suitable.length) continue;

      const lunarMonth = m;
      const lunarDay = d;

      const item: JiRiItem = {
        date: `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        lunarDate: `${getYearGanZhi(year).gan}${getYearGanZhi(year).zhi}年${lunarMonth}月${lunarDay}日`,
        level: level as "上吉" | "大吉" | "吉",
        yi: [...new Set(yi)],
        ji: [...new Set(ji)],
        shenSha,
        chongShengXiao: ZHI_SHENGXIAO[dayZhi] || "",
        suitable: suitable.length > 0 ? suitable : ["祭祀", "祈福"],
        unsuitable: unsuitable.length > 0 ? unsuitable : ["动土", "安葬"],
      };

      if (level === "上吉" || level === "大吉") bestDays.push(item);
      else goodDays.push(item);

      if (bestDays.length >= 20 && goodDays.length >= 15) break;
    }
  }

  const totalDays = bestDays.length + goodDays.length;

  const summary = `${year}年宜${purpose}的吉日共${totalDays}个，`
    + `其中${bestDays.filter(d => d.level === "上吉").length}个上吉日、`
    + `${bestDays.filter(d => d.level === "大吉").length}个大吉日、${goodDays.length}个吉日。`
    + `建议优先选择上吉日，如遇冲生肖(${shengXiao || "自行核对"})需避开。`;

  return { purpose, year, totalDays, bestDays, goodDays, summary };
}
