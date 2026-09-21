/**
 * 小六壬推算核心（2026-09-18 迁入 shared）
 *
 * 为什么搬到这里：此前这套算法只存在于前端（apps/mobile 的 xiaoliuren-data.ts），
 * 后端要出报告就得再实现一遍——而本项目已经吃过这个亏：
 * 奇门与大六壬曾经前端一套、admin 一套，实测局数、值符、月将大面积不同，
 * **管理员在后台看到的盘和用户看到的不是同一个盘**（见 ganzhi.ts 顶部的记录）。
 * 所以算法真源放在 shared，前后端共用，谁也不许另写一份。
 *
 * 分工：这里只管**掐指推算**（六宫落宫、干支、六神、六亲、旬空），
 * 农历月日由调用方换算好传进来——前端用它自己的 lunar 包，后端用 lunar-javascript，
 * 这样 shared 不必为了一个农历转换再背一个依赖。
 *
 * 小六壬六宫：大安、留连、速喜、赤口、小吉、空亡。
 * 起课法：月上起，数到日，再数到时；或直接用报数（三个数）。
 */

import { GANS, ZHIS, kongWang } from "./ganzhi";

/** 六宫，顺序即掐指顺序 */
export const XLR_PALACES = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"] as const;
export type XlrPalaceName = (typeof XLR_PALACES)[number];

/** 各宫五行 */
export const XLR_PALACE_WX: Record<string, string> = {
  大安: "木", 留连: "土", 速喜: "火", 赤口: "金", 小吉: "水", 空亡: "土",
};

const GAN_WX: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

const ZHI_WX: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

/** 五行对应的星名（与奇门九星同名，小六壬借其象） */
const WX_STAR: Record<string, string> = { 木: "辅", 火: "英", 土: "芮", 金: "柱", 水: "蓬" };

/** 道家一路：青龙起日宫、顺行 */
const LIUSHEN_DAOJIA = ["青龙", "朱雀", "螣蛇", "白虎", "玄武", "勾陈"];
/** 江氏一路：另一种排列，由日干定首神 */
const LIUSHEN_JIANGSHI = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
/** 日干起六神：甲乙青龙 丙丁朱雀 戊勾陈 己螣蛇 庚辛白虎 壬癸玄武 */
const DAY_GAN_SHEN: Record<string, string> = {
  甲: "青龙", 乙: "青龙", 丙: "朱雀", 丁: "朱雀", 戊: "勾陈",
  己: "螣蛇", 庚: "白虎", 辛: "白虎", 壬: "玄武", 癸: "玄武",
};

/** 小六壬支持的流派 */
export type XlrSchool = "daojia" | "jiangshi" | "jiangshi2";

export interface XlrPillar {
  gan: string;
  zhi: string;
}

export interface XlrSizhu {
  year: XlrPillar;
  month: XlrPillar;
  day: XlrPillar;
  hour: XlrPillar;
}

export interface XlrPalace {
  name: string;
  /** 六神 */
  liushen: string;
  /** 星曜，如「柱金」；逢旬空则为「任空」 */
  star: string;
  starKong: boolean;
  gan: string;
  zhi: string;
  /** 六亲：以日干五行为我 */
  qin: string;
  /** 月/日/时 落宫标记 */
  markers: string[];
}

export interface XlrResult {
  palaces: XlrPalace[];
  monthPalace: number;
  dayPalace: number;
  hourPalace: number;
  /** 三宫的宫名，报告与列表页直接用 */
  monthName: string;
  dayName: string;
  hourName: string;
  /** 日柱旬空（两支连写，如「戌亥」） */
  dayKong: string;
  school: XlrSchool;
}

/** 六十甲子序号 */
function jiaziIndex(gi: number, zi: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === gi && i % 12 === zi) return i;
  return 0;
}

/** 五行生克定六亲（me=日干五行，other=宫支五行） */
function liuqin(me: string, other: string): string {
  if (me === other) return "兄弟";
  const sheng: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  if (sheng[other] === me) return "父母";
  if (sheng[me] === other) return "子孙";
  const ke: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (ke[other] === me) return "官鬼";
  return "妻财";
}

/**
 * 排小六壬。
 *
 * @param lunarMonth 农历月（1-12，闰月按本月数）
 * @param lunarDay   农历日（1-30）
 * @param hourNum    时辰序（1=子时 … 12=亥时）
 * @param numbers    报数起课的三个数；给了就用它代替月日时
 * @param sizhu      四柱（由 fourPillars 算好传入，保证与其余工具同源）
 */
export function computeXiaoliuren(opts: {
  school?: XlrSchool;
  lunarMonth: number;
  lunarDay: number;
  hourNum: number;
  numbers?: number[] | null;
  sizhu: XlrSizhu;
}): XlrResult {
  const school: XlrSchool = opts.school ?? "daojia";
  const { lunarMonth, lunarDay, hourNum, numbers, sizhu } = opts;

  // 月上起、数到日、再数到时；报数起课则以三个数代之
  let n1 = lunarMonth;
  let n2 = lunarDay;
  let n3 = hourNum;
  if (numbers && numbers.length > 0) {
    n1 = numbers[0];
    n2 = numbers[1] ?? numbers[0];
    n3 = numbers[2] ?? numbers[numbers.length - 1];
  }
  const monthPalace = (n1 - 1) % 6;
  const dayPalace = (monthPalace + n2 - 1) % 6;
  const hourPalace = (dayPalace + n3 - 1) % 6;

  const gi = GANS.indexOf(sizhu.day.gan as any);
  const zi = ZHIS.indexOf(sizhu.day.zhi as any);
  const hourGi = GANS.indexOf(sizhu.hour.gan as any);
  const hourZi = ZHIS.indexOf(sizhu.hour.zhi as any);

  // 干支：时柱落于时宫，按宫序每宫 +2 位六十甲子
  const hourGZ = jiaziIndex(hourGi, hourZi);
  const ganzhi: XlrPillar[] = new Array(6);
  for (let d = 0; d < 6; d++) {
    const idx = (hourGZ + 2 * d) % 60;
    ganzhi[(hourPalace + d) % 6] = { gan: GANS[idx % 10], zhi: ZHIS[idx % 12] };
  }

  // 六神：道家以青龙起日宫顺行；江氏由日干定首神（江氏起大安宫，江氏2「活六神」起时宫）
  const shen: string[] = new Array(6);
  if (school === "daojia") {
    for (let d = 0; d < 6; d++) shen[(dayPalace + d) % 6] = LIUSHEN_DAOJIA[d];
  } else {
    const first = DAY_GAN_SHEN[sizhu.day.gan] ?? LIUSHEN_JIANGSHI[0];
    const startIdx = LIUSHEN_JIANGSHI.indexOf(first);
    const anchor = school === "jiangshi2" ? hourPalace : 0;
    for (let d = 0; d < 6; d++) shen[(anchor + d) % 6] = LIUSHEN_JIANGSHI[(startIdx + d) % 6];
  }

  const dayKong = gi >= 0 && zi >= 0 ? kongWang(gi, zi).join("") : "";
  const meWx = GAN_WX[sizhu.day.gan] ?? "";

  const palaces: XlrPalace[] = XLR_PALACES.map((name, i) => {
    const gz = ganzhi[i] ?? { gan: "", zhi: "" };
    const zhiWx = ZHI_WX[gz.zhi] ?? "";
    const isKongZhi = !!gz.zhi && dayKong.includes(gz.zhi);
    const star = isKongZhi ? "任空" : `${WX_STAR[zhiWx] ?? ""}${zhiWx}`;
    let qin = liuqin(meWx, zhiWx);
    // 与日干同干者作兄弟；时宫即「我」，直接标自身
    if (gz.gan && gz.gan === sizhu.day.gan) qin = "兄弟";
    if (i === hourPalace) qin = "自身";
    const markers: string[] = [];
    if (i === monthPalace) markers.push("月");
    if (i === dayPalace) markers.push("日");
    if (i === hourPalace) markers.push("时");
    return { name, liushen: shen[i], star, starKong: isKongZhi, gan: gz.gan, zhi: gz.zhi, qin, markers };
  });

  return {
    palaces,
    monthPalace,
    dayPalace,
    hourPalace,
    monthName: XLR_PALACES[monthPalace],
    dayName: XLR_PALACES[dayPalace],
    hourName: XLR_PALACES[hourPalace],
    dayKong,
    school,
  };
}
