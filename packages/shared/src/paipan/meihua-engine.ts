/**
 * 梅花易数起卦引擎（算法真源，apps/mobile 与服务端报告共用）
 *
 * 2026-09-17 从 apps/mobile/src/pkg-paipan/meihua/result.vue 抽出：
 * 页面内联的起卦逻辑无法被服务端复用，报告若另写一套必然与用户看到的卦不一致。
 * 抽出后两端调用同一函数，同参数必出同卦。
 */

import {
  BAGUA_LINES,
  BAGUA_NAMES,
  BAGUA_WX,
  HEX_NAMES,
  getCeShu,
  getPalace,
  getTiyongRelation,
  type TiyongRelation,
} from "./meihua-data"
import { fourPillars, ZHIS } from "./ganzhi"

export interface Hexagram {
  /** 上卦先天数 1-8 */
  upper: number
  /** 下卦先天数 1-8 */
  lower: number
  /** 六爻自下而上：true=阳 false=阴 */
  lines: boolean[]
  name: string
  palace: string
}

export interface MeihuaInput {
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  /** time=时间起卦 / number1=数字起卦(前后相加) / number2=三位数字 / manual=手动指定 / auto=随机 */
  mode?: string
  numbers?: string
  /** 数字起卦是否加时辰数 */
  plusHour?: boolean
  /** 手动：自上而下六位「1阳0阴」 */
  yaos?: string
  /** 手动：动爻，自上而下索引 0=上爻 */
  moving?: string | number
  /** 农历月日（时间起卦用；不传则内部换算） */
  lunarMonth?: number
  lunarDay?: number
}

export interface MeihuaResult {
  ben: Hexagram
  hu: Hexagram
  bian: Hexagram
  cuo: Hexagram
  zong: Hexagram
  /** 动爻 1-6（自下而上），0=无动爻 */
  moving: number
  /** 起卦算式，展示给用户核对 */
  formula: string
  tiyong: {
    movingInLower: boolean
    tiName: string
    yongName: string
    tiWx: string
    yongWx: string
    relation: TiyongRelation
  }
  ceShu: number
}

const mod = (n: number, m: number) => {
  const r = n % m
  return r === 0 ? m : r
}

function trigramFromLines(lines: boolean[]): number {
  for (let n = 1; n <= 8; n++) {
    const bl = BAGUA_LINES[BAGUA_NAMES[n]]
    if (bl[0] === lines[0] && bl[1] === lines[1] && bl[2] === lines[2]) return n
  }
  return 1
}

export function hexFromTrigrams(upper: number, lower: number): Hexagram {
  const lines = [...BAGUA_LINES[BAGUA_NAMES[lower]], ...BAGUA_LINES[BAGUA_NAMES[upper]]]
  const name = HEX_NAMES[upper][lower]
  return { upper, lower, lines, name, palace: getPalace(name) }
}

export function hexFromLines(lines: boolean[]): Hexagram {
  const lower = trigramFromLines(lines.slice(0, 3))
  const upper = trigramFromLines(lines.slice(3, 6))
  const name = HEX_NAMES[upper][lower]
  return { upper, lower, lines, name, palace: getPalace(name) }
}

/** 公历 → 农历月日（与六爻、小六壬同一套内置历法） */
function lunarMD(year: number, month: number, day: number): { m: number; d: number } {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "numeric", day: "numeric" }).formatToParts(
      new Date(year, month - 1, day),
    )
    const m = Number(parts.find((p) => p.type === "month")?.value || month)
    const d = Number(parts.find((p) => p.type === "day")?.value || day)
    return { m, d }
  } catch {
    return { m: month, d: day }
  }
}

/** 起卦：与移动端页面此前的实现逐条对应 */
export function computeMeihua(input: MeihuaInput): MeihuaResult {
  const { year, month, day, hour, minute = 0 } = input
  const mode = input.mode || "time"
  const fp = fourPillars(year, month, day, hour, minute)
  const lunar = { m: input.lunarMonth ?? 0, d: input.lunarDay ?? 0 }
  if (!lunar.m || !lunar.d) {
    const l = lunarMD(year, month, day)
    lunar.m = l.m
    lunar.d = l.d
  }
  const yearZhiNum = ZHIS.indexOf(fp.year.zhi) + 1
  const hourZhiNum = ZHIS.indexOf(fp.hour.zhi) + 1
  const plusHour = input.plusHour === true

  let ben: Hexagram
  let moving = 0
  let formula = ""

  if (mode === "manual" && input.yaos && input.yaos.length === 6) {
    // yaos 自上而下 → lines 自下而上
    const lines = input.yaos.split("").map((c) => c === "1").reverse()
    const movingIdx = input.moving === undefined || input.moving === null || input.moving === "" ? -1 : Number(input.moving)
    moving = movingIdx >= 0 ? 6 - movingIdx : 0
    ben = hexFromLines(lines)
    formula = "手动指定"
  } else if (mode === "number1" && input.numbers) {
    const digits = input.numbers.replace(/\D/g, "").split("").map(Number)
    const half = Math.ceil(digits.length / 2)
    const frontSum = digits.slice(0, half).reduce((a, b) => a + b, 0)
    const backSum = digits.slice(half).reduce((a, b) => a + b, 0)
    const dongSum = frontSum + backSum + (plusHour ? hourZhiNum : 0)
    const upper = mod(frontSum, 8)
    const lower = mod(backSum, 8)
    moving = mod(dongSum, 6)
    ben = hexFromTrigrams(upper, lower)
    formula = `数字起卦1 (${input.numbers})${plusHour ? "+时辰" : ""}`
  } else if (mode === "number2" && input.numbers) {
    const s = input.numbers.replace(/\D/g, "")
    const d1 = Number(s[0] || 0)
    const d2 = Number(s[1] || 0)
    const d3 = Number(s[2] || 0)
    const upper = mod(d1 === 0 ? 8 : d1, 8)
    const lower = mod(d2 === 0 ? 8 : d2, 8)
    const dong = d3 + (plusHour ? hourZhiNum : 0)
    moving = mod(dong === 0 ? 6 : dong, 6)
    ben = hexFromTrigrams(upper, lower)
    formula = `数字起卦2 (${input.numbers})${plusHour ? "+时辰" : ""}`
  } else if (mode === "auto") {
    // 以时间参数为种子的伪随机，保证同一组参数结果一致（与移动端页面同一算式）
    let s = year * 10000 + month * 100 + day + hour * 60 + minute
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    const upper = Math.floor(rand() * 8) + 1
    const lower = Math.floor(rand() * 8) + 1
    moving = Math.floor(rand() * 6) + 1
    ben = hexFromTrigrams(upper, lower)
    formula = "自动起卦"
  } else {
    // 时间起卦：年支数+农历月+农历日 → 上卦；再加时辰数 → 下卦与动爻
    const upperSum = yearZhiNum + lunar.m + lunar.d
    const lowerSum = upperSum + hourZhiNum
    const upper = mod(upperSum, 8)
    const lower = mod(lowerSum, 8)
    moving = mod(lowerSum, 6)
    ben = hexFromTrigrams(upper, lower)
    formula = `时间起卦 (${yearZhiNum}+${lunar.m}+${lunar.d}+${hourZhiNum})`
  }

  // 五卦：互（234为下/345为上）、变（动爻翻转）、错（全爻取反）、综（上下颠倒）
  const hu = hexFromLines([ben.lines[1], ben.lines[2], ben.lines[3], ben.lines[2], ben.lines[3], ben.lines[4]])
  const bian = hexFromLines(ben.lines.map((l, i) => (moving === i + 1 ? !l : l)))
  const cuo = hexFromLines(ben.lines.map((l) => !l))
  const zong = hexFromLines([...ben.lines].reverse())

  // 体用：动爻在下卦(1~3) → 下卦为用、上卦为体；否则相反
  const movingInLower = moving >= 1 && moving <= 3
  const tiTri = movingInLower ? ben.upper : ben.lower
  const yongTri = movingInLower ? ben.lower : ben.upper
  const tiName = BAGUA_NAMES[tiTri]
  const yongName = BAGUA_NAMES[yongTri]
  const tiWx = BAGUA_WX[tiName]
  const yongWx = BAGUA_WX[yongName]

  return {
    ben,
    hu,
    bian,
    cuo,
    zong,
    moving,
    formula,
    tiyong: { movingInLower, tiName, yongName, tiWx, yongWx, relation: getTiyongRelation(tiWx, yongWx) },
    ceShu: getCeShu(ben.lines),
  }
}
