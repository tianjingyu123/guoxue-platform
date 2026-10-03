/**
 * 阴盘奇门（道家阴盘奇门／王凤麟一路）的定局法 —— 2026-09-19 迁入 shared
 *
 * 为什么单开一个文件：**阴盘奇门的定局与阳盘根本不是一回事**，
 * 不能拿阳盘的拆补／置闰去套，也不能反过来拿阳盘的标准去指摘它。
 *
 * 阳盘按太阳走：以二十四节气与六十甲子为据，用拆补或置闰求局，一节气管五天（三元）。
 * 阴盘按月亮走：把年、月、日、时各自取数相加，除九取余即为局数，**完全不查节气表**，
 * 掌上就能算，而且每个时辰都换一个新盘。
 *
 * 定局公式（本实现所依据的通行讲法）：
 *   局数 =（年支序数 + 农历月数 + 农历日数 + 时支序数）÷ 9 的余数，整除则取 9
 *   其中年支、时支序数按 子=1、丑=2 …… 亥=12。
 * 遁型仍分阴阳：**冬至后夏至前为阳遁，夏至后冬至前为阴遁**
 * （这一点常被误会——「阴盘」是流派名，不是「一律阴遁」的意思）。
 *
 * 两个公开流传的算例，已写进 spec 钉死：
 *   1) 2019-05-02 09:09，农历三月廿八，己亥年己巳时
 *      → (亥12 + 3 + 28 + 巳6) = 49，49 % 9 = 4 → **阳 4 局**
 *   2) 2006-05-23 19:45，农历四月廿六，丙戌年庚戌时
 *      → (戌11 + 4 + 26 + 戌11) = 52，52 % 9 = 7 → **阳 7 局**
 *
 * ⚠️ 出处与效力要说在前面：阴盘奇门是近二十余年成形的现代体系，
 * 没有《金函玉镜》那样来历明确的古籍可依，网上讲法与各家弟子的发挥并不完全一致，
 * 学界与传统奇门圈对其传承说法亦有争议。本实现依据的是**流传最广的定局讲法**，
 * 并以上面两个算例为基准；若决策人另指流派口径，改这里一处即可。
 *
 * 本文件只做「定局」这一步——历法（农历月日、年支时支、冬夏至判断）由调用方传入，
 * shared 不为一个农历转换背依赖（与 xiaoliuren-engine 同一处理方式）。
 * 排盘本身仍走 `computeQimenWithJu`，与阳盘共用一套九宫推演。
 */

/** 十二地支，序数即下标 +1（子=1 …… 亥=12） */
export const YINPAN_ZHI = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

/** 地支序数：子=1 …… 亥=12；不认识的返回 0 */
export function zhiOrdinal(zhi: string): number {
  const i = (YINPAN_ZHI as readonly string[]).indexOf(String(zhi ?? "").trim());
  return i < 0 ? 0 : i + 1;
}

export interface YinpanJuInput {
  /** 年支，如「亥」 */
  yearZhi: string;
  /** 农历月（1-12，闰月按本月数） */
  lunarMonth: number;
  /** 农历日（1-30） */
  lunarDay: number;
  /** 时支，如「巳」 */
  hourZhi: string;
  /** 是否阳遁：冬至后夏至前为 true。由调用方按节气判断后传入 */
  isYang: boolean;
}

export interface YinpanJu {
  isYang: boolean;
  /** 局数 1-9 */
  num: number;
  /** 如「阳4局」 */
  label: string;
  /** 四项取数与和，写进报告的「起局校验」一节，便于用户自己复核 */
  parts: { yearZhi: number; lunarMonth: number; lunarDay: number; hourZhi: number; sum: number };
}

/**
 * 阴盘奇门定局。
 *
 * 取数相加除九，余零取九——这一步就是阴盘与阳盘分家的地方。
 */
export function computeYinpanJu(input: YinpanJuInput): YinpanJu {
  const y = zhiOrdinal(input.yearZhi);
  const h = zhiOrdinal(input.hourZhi);
  const m = Math.trunc(Number(input.lunarMonth) || 0);
  const d = Math.trunc(Number(input.lunarDay) || 0);

  const sum = y + m + d + h;
  const num = sum % 9 || 9; // 整除取九
  return {
    isYang: input.isYang,
    num,
    label: `${input.isYang ? "阳" : "阴"}${num}局`,
    parts: { yearZhi: y, lunarMonth: m, lunarDay: d, hourZhi: h, sum },
  };
}
