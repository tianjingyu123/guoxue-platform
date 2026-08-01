/**
 * ⚠️ 本文件是**全平台唯一**的排盘算法真源（2026-07-14 由 apps/mobile 迁入）。
 *
 * 迁入原因：此前 C 端用前端引擎、admin 用 apps/server 的 tool-registry/calculators，
 * 两套算法实测结果大面积不同（奇门局数/值符/值使、大六壬月将全错），
 * 出现「管理员与用户看到不同的盘」。现统一到这里，前后端共用一套。
 *
 * 🔴 改动本文件必须跑：pnpm --filter @guoxue/mobile verify（14 套黄金测试 + 前后端一致性）
 */
// ─── 共享干支四柱引擎 ───
// 年柱以立春分界、月柱以节气（节）分界、日柱 JDN 公式、时柱五鼠遁
// 已用竞品实测数据校准：2025-07-25=乙未日、2025-07-30=庚子日、2020-07-15=庚子日

import { findTerm } from "./jieqi"

export const GANS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const
export const ZHIS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const
export type Gan = (typeof GANS)[number]
export type Zhi = (typeof ZHIS)[number]

export const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
}
export const ZHI_WUXING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
}
export const GAN_YANG: Record<string, boolean> = {
  甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false,
}

// 地支藏干（本气/中气/余气）
export const ZHI_CANG: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "庚", "戊"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
}

// ─── 十神（通用，任意日主） ───
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }

/** 十神全称 */
export function shiShen(dayGan: string, otherGan: string): string {
  const dw = GAN_WUXING[dayGan]
  const ow = GAN_WUXING[otherGan]
  const sameYinYang = GAN_YANG[dayGan] === GAN_YANG[otherGan]
  if (dw === ow) return sameYinYang ? "比肩" : "劫财"
  if (SHENG[dw] === ow) return sameYinYang ? "食神" : "伤官"
  if (KE[dw] === ow) return sameYinYang ? "偏财" : "正财"
  if (KE[ow] === dw) return sameYinYang ? "七杀" : "正官"
  return sameYinYang ? "偏印" : "正印" // ow 生 dw
}

/** 十神简称（竞品风格单字） */
export function shiShenShort(dayGan: string, otherGan: string): string {
  const MAP: Record<string, string> = {
    比肩: "比", 劫财: "劫", 食神: "食", 伤官: "伤", 偏财: "才", 正财: "财",
    七杀: "杀", 正官: "官", 偏印: "枭", 正印: "印",
  }
  return MAP[shiShen(dayGan, otherGan)]
}

// ─── 日柱（JDN） ───
export function toJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
}

/** 日柱干支。默认（主流换日派）23:00 后日柱算次日；earlyZi=true（早晚子时派）晚子不换日 */
export function dayGanzhi(y: number, m: number, d: number, hour = 12, earlyZi = false): { gan: Gan; zhi: Zhi; idx: number } {
  let jdn = toJDN(y, m, d)
  if (!earlyZi && hour >= 23) jdn += 1
  // 校准：2025-07-25 (JDN 2460882) = 乙未(31)
  const idx = (((jdn - 2460882 + 31) % 60) + 60) % 60
  return { gan: GANS[idx % 10], zhi: ZHIS[idx % 12], idx }
}

/** 北京钟面时间 → 绝对时刻（ms）。输入按北京时间解释，任何设备时区下结果一致（沙箱UTC坑防御） */
function beijingMs(y: number, m: number, d: number, hour: number, minute: number): number {
  return Date.UTC(y, m - 1, d, hour, minute) - 8 * 3600000
}

// ─── 年柱（立春分界，精确到分钟） ───
export function yearGanzhi(y: number, m: number, d: number, hour = 12, minute = 0): { gan: Gan; zhi: Zhi; year: number } {
  const t = beijingMs(y, m, d, hour, minute)
  const lichun = findTerm(y, "立春").getTime()
  const effYear = t >= lichun ? y : y - 1
  const idx = (((effYear - 4) % 60) + 60) % 60
  return { gan: GANS[idx % 10], zhi: ZHIS[idx % 12], year: effYear }
}

// ─── 月柱（节分界 + 五虎遁） ───
const JIE_LIST = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]

/** 月柱。返回 gan/zhi 及月序（1=寅月） */
export function monthGanzhi(y: number, m: number, d: number, hour = 12, minute = 0): { gan: Gan; zhi: Zhi; monthNo: number } {
  const t = beijingMs(y, m, d, hour, minute)
  // 找最近已过的"节"：先扫本年立春..大雪（时间单调递增，最后一个已过者即当月）
  let monthNo = 0 // 1=寅月...12=丑月
  for (let i = 0; i < 11; i++) {
    const term = findTerm(y, JIE_LIST[i]).getTime()
    if (t >= term) monthNo = i + 1
  }
  // 立春前（1 月全月与 2 月立春前）：以本年小寒分丑月/子月。
  // （V0 原版把小寒混在循环里且对非 1 月取次年小寒，导致 2 月立春前的丑月被判成子月，
  //  三方对拍发现后重写此段：见 docs/progress/排盘算法核验报告-20260711.md）
  if (monthNo === 0) {
    monthNo = t >= findTerm(y, '小寒').getTime() ? 12 : 11
  }
  const zhi = ZHIS[(monthNo + 1) % 12] // 寅=idx2
  // 五虎遁：甲己之年丙作首
  const yg = yearGanzhi(y, m, d, hour, minute).gan
  const start = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }[yg]! // 丙=2...
  const gan = GANS[(start + monthNo - 1) % 10]
  return { gan, zhi, monthNo }
}

// ─── 时柱（五鼠遁） ───
export function hourGanzhi(dayGan: string, hour: number): { gan: Gan; zhi: Zhi } {
  const zhiIdx = Math.floor(((hour + 1) % 24) / 2)
  const start = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 }[dayGan]!
  return { gan: GANS[(start + zhiIdx) % 10], zhi: ZHIS[zhiIdx] }
}

// ─── 空亡（旬空） ───
export function kongWang(ganIdx: number, zhiIdx: number): [Zhi, Zhi] {
  const diff = ((zhiIdx - ganIdx) % 12 + 12) % 12
  const kw1 = (10 + diff) % 12
  return [ZHIS[kw1], ZHIS[(kw1 + 1) % 12]]
}

export function kongWangOf(gan: string, zhi: string): [Zhi, Zhi] {
  return kongWang(GANS.indexOf(gan as Gan), ZHIS.indexOf(zhi as Zhi))
}

// ─── 纳音（三十纳音表） ───
const NAYIN = [
  "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
  "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水",
]
export function naYin(gan: string, zhi: string): string {
  const gi = GANS.indexOf(gan as Gan)
  const zi = ZHIS.indexOf(zhi as Zhi)
  const jiaziIdx = ((gi % 10) + [0, 10, 20, 30, 40, 50][(((zi - gi) % 12 + 12) % 12) / 2]) % 60
  return NAYIN[Math.floor(jiaziIdx / 2)]
}

// ─── 长生十二宫（地势） ───
const CHANGSHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
const CS_START: Record<string, number> = { 甲: 11, 丙: 2, 戊: 2, 庚: 5, 壬: 8, 乙: 6, 丁: 9, 己: 9, 辛: 0, 癸: 3 }
export function changSheng(dayGan: string, zhi: string): string {
  const zi = ZHIS.indexOf(zhi as Zhi)
  const start = CS_START[dayGan]
  const yang = GAN_YANG[dayGan]
  const step = yang ? (zi - start + 12) % 12 : (start - zi + 12) % 12
  return CHANGSHENG[step]
}

// ─── 真太阳时 ───
/** 均时差（分钟），d 为一年中的第几天 */
function equationOfTime(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}

/** 真太阳时修正：输入北京时间与当地经度，返回修正后的 Date */
export function trueSolarTime(date: Date, longitude: number): Date {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000)
  const offsetMin = 4 * (longitude - 120) + equationOfTime(dayOfYear)
  return new Date(date.getTime() + offsetMin * 60000)
}

// ─── 四柱汇总 ───
export interface Pillar {
  gan: Gan
  zhi: Zhi
  nayin: string
  kong: [Zhi, Zhi]
}
export interface FourPillars {
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar
  effYear: number
  monthNo: number
}

export function fourPillars(y: number, m: number, d: number, hour: number, minute = 0, earlyZi = false): FourPillars {
  const yp = yearGanzhi(y, m, d, hour, minute)
  const mp = monthGanzhi(y, m, d, hour, minute)
  const dp = dayGanzhi(y, m, d, hour, earlyZi)
  // 晚子时（23:00后）时干恒按次日日干五鼠遁起子时（早晚子派日柱不换但时干用次日）
  const dpForHour = hour >= 23 ? dayGanzhi(y, m, d, hour, false) : dp
  const hp = hourGanzhi(dpForHour.gan, hour)
  const mk = (gan: string, zhi: string): Pillar => ({
    gan: gan as Gan,
    zhi: zhi as Zhi,
    nayin: naYin(gan, zhi),
    kong: kongWangOf(gan, zhi),
  })
  return { year: mk(yp.gan, yp.zhi), month: mk(mp.gan, mp.zhi), day: mk(dp.gan, dp.zhi), hour: mk(hp.gan, hp.zhi), effYear: yp.year, monthNo: mp.monthNo }
}

// ─── 常用神煞 ───
export function shenSha(fp: FourPillars): Record<string, string[]> {
  const dg = fp.day.gan
  const dz = fp.day.zhi
  const yz = fp.year.zhi
  const out: Record<string, string[]> = {}
  const add = (name: string, v: string) => {
    if (!out[name]) out[name] = []
    if (!out[name].includes(v)) out[name].push(v)
  }
  // 天乙贵人
  const TIANYI: Record<string, string[]> = {
    甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
    乙: ["子", "申"], 己: ["子", "申"],
    丙: ["亥", "酉"], 丁: ["亥", "酉"],
    壬: ["卯", "巳"], 癸: ["卯", "巳"],
    辛: ["午", "寅"],
  }
  TIANYI[dg]?.forEach((z) => add("天乙贵人", z))
  // 驿马（三合）
  const YIMA: Record<string, string> = { 申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" }
  add("驿马", YIMA[yz])
  // 桃花（咸池）
  const TAOHUA: Record<string, string> = { 申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" }
  add("桃花", TAOHUA[yz])
  // 禄神
  const LU: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" }
  add("禄神", LU[dg])
  // 羊刃（阳干）
  const YANGREN: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" }
  if (YANGREN[dg]) add("羊刃", YANGREN[dg])
  // 文昌
  const WENCHANG: Record<string, string> = { 甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" }
  add("文昌", WENCHANG[dg])
  // 华盖
  const HUAGAI: Record<string, string> = { 寅: "戌", 午: "戌", 戌: "戌", 申: "辰", 子: "辰", 辰: "辰", 巳: "丑", 酉: "丑", 丑: "丑", 亥: "未", 卯: "未", 未: "未" }
  add("华盖", HUAGAI[dz])
  // 将星
  const JIANGXING: Record<string, string> = { 寅: "午", 午: "午", 戌: "午", 申: "子", 子: "子", 辰: "子", 巳: "酉", 酉: "酉", 丑: "酉", 亥: "卯", 卯: "卯", 未: "卯" }
  add("将星", JIANGXING[yz])
  return out
}

// ─── 大运 ───
export interface DaYun {
  gan: Gan
  zhi: Zhi
  startAge: number
  startYear: number
}

/** 起大运：阳男阴女顺排，阴男阳女逆排；起运岁数=距节天数/3 */
export function daYun(
  fp: FourPillars,
  gender: "male" | "female",
  y: number,
  m: number,
  d: number,
  hour: number,
  minute = 0,
): { list: DaYun[]; qiyunText: string; forward: boolean } {
  const yangYear = GAN_YANG[fp.year.gan]
  const forward = (yangYear && gender === "male") || (!yangYear && gender === "female")
  const birth = new Date(y, m - 1, d, hour, minute)
  // 找出生前后最近的节
  let target: Date | null = null
  if (forward) {
    // 顺排：找下一个节
    let best = Number.POSITIVE_INFINITY
    for (const yy of [y, y + 1]) {
      for (const name of JIE_LIST) {
        const t = findTerm(yy, name)
        if (t.getTime() > birth.getTime() && t.getTime() < best) {
          best = t.getTime()
          target = t
        }
      }
    }
  } else {
    let best = Number.NEGATIVE_INFINITY
    for (const yy of [y - 1, y]) {
      for (const name of JIE_LIST) {
        const t = findTerm(yy, name)
        if (t.getTime() <= birth.getTime() && t.getTime() > best) {
          best = t.getTime()
          target = t
        }
      }
    }
  }
  const diffDays = Math.abs((target!.getTime() - birth.getTime()) / 86400000)
  const years = Math.floor(diffDays / 3)
  const months = Math.floor((diffDays % 3) * 4)
  const startAge = years + (months >= 6 ? 1 : 0) || 1
  // 大运干支从月柱顺/逆推
  const mgIdx = GANS.indexOf(fp.month.gan)
  const mzIdx = ZHIS.indexOf(fp.month.zhi)
  const list: DaYun[] = []
  for (let i = 1; i <= 8; i++) {
    const step = forward ? i : -i
    list.push({
      gan: GANS[((mgIdx + step) % 10 + 10) % 10],
      zhi: ZHIS[((mzIdx + step) % 12 + 12) % 12],
      startAge: startAge + (i - 1) * 10,
      startYear: y + startAge + (i - 1) * 10,
    })
  }
  return { list, qiyunText: `出生后${years}年${months}个月起运`, forward }
}
