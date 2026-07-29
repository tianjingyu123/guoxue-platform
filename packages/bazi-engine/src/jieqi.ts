/**
 * 节气计算模块
 * 基于 Jean Meeus 天文算法计算24节气精确日期
 * 精度：±1小时（1900-2100年），远优于原有查表法
 *
 * 12「节」用于八字月柱分界：立春、惊蛰、清明、立夏、芒种、小暑、
 *   立秋、白露、寒露、立冬、大雪、小寒
 * 12「气」为辅助：雨水、春分、谷雨、小满、夏至、大暑、
 *   处暑、秋分、霜降、小雪、冬至、大寒
 */

// ── 公用：公历日期 ↔ 儒略日（JD）互转 ──

/** 公历 → 儒略日（简化，适用1900-2100） */
function gregorianToJD(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year--; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716))
       + Math.floor(30.6001 * (month + 1))
       + d + B - 1524.5
}

/** 儒略日 → 公历（返回 {y,m,d,frac}，frac=当天小数） */
function jdToGregorian(jd: number): { y: number; m: number; d: number; frac: number } {
  const Z = Math.floor(jd + 0.5)
  const F = jd + 0.5 - Z
  let A = Z
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25)
    A = Z + 1 + alpha - Math.floor(alpha / 4)
  }
  const B = A + 1524
  const C = Math.floor((B - 122.1) / 365.25)
  const D = Math.floor(365.25 * C)
  const E = Math.floor((B - D) / 30.6001)
  const day = B - D - Math.floor(30.6001 * E)
  const month = E < 14 ? E - 1 : E - 13
  const year = month > 2 ? C - 4716 : C - 4715
  return { y: year, m: month, d: Math.floor(day), frac: F + (day - Math.floor(day)) }
}

// ── 太阳黄经计算（VSOP87 截断级数，±1分钟；与寿星历法/lunar-typescript 逐分钟对拍一致） ──
// 2026-07-11 修复：原 Meeus 低精度公式（±15分钟）+ 输出漏 UT→北京时间转换（恒偏早 8 小时），
// 已替换为与前端 lib/paipan/jieqi.ts 同源的 VSOP87 实现。见 docs/progress/排盘算法核验报告-20260711.md

const VSOP_L0: [number, number, number][] = [
  [175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517],
  [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
  [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
  [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
  [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
  [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
  [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
  [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
  [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
  [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98],
  [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
  [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
  [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15],
]
const VSOP_L1: [number, number, number][] = [
  [628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517],
  [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
  [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15], [67, 4.41, 5507.55],
]
const VSOP_L2: [number, number, number][] = [
  [52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
  [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42], [10, 0.76, 18849.23],
]
const VSOP_L3: [number, number, number][] = [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15]]

function vsopSum(terms: [number, number, number][], tau: number): number {
  let s = 0
  for (const [a, b, c] of terms) s += a * Math.cos(b + c * tau)
  return s
}

/** 太阳视黄经（度）：VSOP87 截断级数 + 章动/光行差修正，含 ΔT（UT→TT） */
function sunApparentLongitude(jd: number): number {
  // ΔT ≈ 69s（2020s 年代），UT → 力学时
  const jde = jd + 69 / 86400
  const tau = (jde - 2451545.0) / 365250
  const L =
    (vsopSum(VSOP_L0, tau) +
      vsopSum(VSOP_L1, tau) * tau +
      vsopSum(VSOP_L2, tau) * tau * tau +
      vsopSum(VSOP_L3, tau) * tau * tau * tau) /
    1e8 // 弧度
  // 地心太阳黄经 = 地球日心黄经 + 180°
  let lon = (L * 180) / Math.PI + 180
  // 章动 + 光行差（视黄经）
  const T = tau * 10
  const omega = (125.04452 - 1934.136261 * T) * (Math.PI / 180)
  const nutation = (-17.2 * Math.sin(omega) - 1.32 * Math.sin(2 * ((L * 2) % (2 * Math.PI)))) / 3600
  lon += nutation - 0.005692
  lon %= 360
  if (lon < 0) lon += 360
  return lon
}

// ── 迭代求解太阳黄经到达指定角度的时刻 ──

/**
 * 二分法查找太阳黄经穿越 targetDeg 的精确时刻
 * @param year 公历年
 * @param targetDeg 目标黄经度数（0°,15°,30°,...）
 * @param monthHint 近似月份，缩小搜索范围
 * @returns JD 时刻
 */
function findSolarLongitudeCrossing(
  year: number, targetDeg: number, monthHint: number
): number {
  // 搜索范围：monthHint 月的前后15天
  const jdStart = gregorianToJD(year, monthHint, 1) - 5
  const jdEnd = jdStart + 35  // 约35天窗口

  let lo = jdStart, hi = jdEnd
  const lonLo = sunApparentLongitude(lo)

  // 将目标度数归一化到合理范围
  let target = targetDeg
  // 确保 target 在 lonLo 附近（不超过360度的跨跃）
  if (target < lonLo - 180) target += 360
  if (target > lonLo + 180) target -= 360

  // 二分法（20次迭代可达 0.0001 天 ≈ 8秒精度）
  for (let iter = 0; iter < 25; iter++) {
    const mid = (lo + hi) / 2
    const lonMid = sunApparentLongitude(mid)

    let lonAdjusted = lonMid
    if (lonAdjusted < target - 180) lonAdjusted += 360
    if (lonAdjusted > target + 180) lonAdjusted -= 360

    if (lonAdjusted < target) lo = mid
    else hi = mid
  }

  return (lo + hi) / 2
}

// ── 24节气数据结构 ──

/** 24节气：名称、黄经度数、所在月份、是否为「节」 */
interface TermDef {
  name: string
  lon: number     // 太阳黄经度数
  month: number   // 大致公历月份
  isJie: boolean  // true=节(月柱分界), false=气
}

const ALL_24_TERMS: TermDef[] = [
  { name: '小寒', lon: 285, month: 1,  isJie: true  },
  { name: '大寒', lon: 300, month: 1,  isJie: false },
  { name: '立春', lon: 315, month: 2,  isJie: true  },
  { name: '雨水', lon: 330, month: 2,  isJie: false },
  { name: '惊蛰', lon: 345, month: 3,  isJie: true  },
  { name: '春分', lon: 0,   month: 3,  isJie: false },
  { name: '清明', lon: 15,  month: 4,  isJie: true  },
  { name: '谷雨', lon: 30,  month: 4,  isJie: false },
  { name: '立夏', lon: 45,  month: 5,  isJie: true  },
  { name: '小满', lon: 60,  month: 5,  isJie: false },
  { name: '芒种', lon: 75,  month: 6,  isJie: true  },
  { name: '夏至', lon: 90,  month: 6,  isJie: false },
  { name: '小暑', lon: 105, month: 7,  isJie: true  },
  { name: '大暑', lon: 120, month: 7,  isJie: false },
  { name: '立秋', lon: 135, month: 8,  isJie: true  },
  { name: '处暑', lon: 150, month: 8,  isJie: false },
  { name: '白露', lon: 165, month: 9,  isJie: true  },
  { name: '秋分', lon: 180, month: 9,  isJie: false },
  { name: '寒露', lon: 195, month: 10, isJie: true  },
  { name: '霜降', lon: 210, month: 10, isJie: false },
  { name: '立冬', lon: 225, month: 11, isJie: true  },
  { name: '小雪', lon: 240, month: 11, isJie: false },
  { name: '大雪', lon: 255, month: 12, isJie: true  },
  { name: '冬至', lon: 270, month: 12, isJie: false },
]

/** 按年份缓存已计算的节气，避免重复迭代 */
const cacheByYear = new Map<number, Map<string, { month: number; day: number; hour: number; minute: number }>>()

/** 清除缓存 */
export function clearJieQiCache(): void { cacheByYear.clear() }

/**
 * 计算指定年份全部24节气的精确时间
 * @returns Map<节气名, {月,日,时,分}>
 */
export function calcAllJieQi(year: number): Map<string, { month: number; day: number; hour: number; minute: number }> {
  const cached = cacheByYear.get(year)
  if (cached) return cached

  const result = new Map<string, { month: number; day: number; hour: number; minute: number }>()

  for (const term of ALL_24_TERMS) {
    const jd = findSolarLongitudeCrossing(year, term.lon, term.month)
    // jd 为 UT 儒略日：+8h 转北京钟面再取年月日时分（此前漏转恒偏早 8 小时，2026-07-11 修复）
    const greg = jdToGregorian(jd + 8 / 24)

    const totalHours = greg.frac * 24
    const hour = Math.floor(totalHours)
    const minute = Math.floor((totalHours - hour) * 60)

    result.set(term.name, {
      month: greg.m,
      day: greg.d,
      hour,
      minute,
    })
  }

  cacheByYear.set(year, result)
  return result
}

// ── 对外接口（保持与旧版兼容） ──

/** 12 节对应月支 ZHI 索引映射：立春→寅(2), 惊蛰→卯(3), ..., 小寒→丑(1) */
const JIE_TO_MONTH_ZHI: Record<string, number> = {
  '立春': 2, '惊蛰': 3, '清明': 4,
  '立夏': 5, '芒种': 6, '小暑': 7,
  '立秋': 8, '白露': 9, '寒露': 10,
  '立冬': 11, '大雪': 0, '小寒': 1,
}

/** 12 节名称（按黄经顺序） */
const JIE_NAMES = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒']

/**
 * 根据公历日期获取月支索引（在 ZHI 数组中的位置）
 * 立春为寅月(ZHI索引2)，以此类推
 * 返回: ZHI 数组中的索引 (0=子, 1=丑, 2=寅, ..., 11=亥)
 */
export function getYueZhiIndex(month: number, day: number, year?: number, hour = 12, minute = 0): number {
  // 向后兼容：无年份参数时用旧查表法（保留旧SOLAR_TERM_DAY常量作为回退）
  if (year === undefined) {
    const SOLAR_TERM_DAY = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7]
    const branchMap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]
    if (day >= SOLAR_TERM_DAY[month - 1]) return branchMap[month - 1]
    return branchMap[(month - 2 + 12) % 12]
  }

  // 精确算法：查找当前日期所处的月令
  const allJieQi = calcAllJieQi(year)

  // 构造日期数值用于比较: MMDDHHmm
  // （2026-07-11 修复：原实现漏 hour/minute 位，节气交界当天时刻已过者被误判进上个月）
  const birthValue = month * 1000000 + day * 10000 + hour * 100 + minute

  // 默认取 month-1 → month 之间的节
  for (let i = 0; i < 12; i++) {
    const jieName = JIE_NAMES[i]
    const jie = allJieQi.get(jieName)!
    let jieValue = jie.month * 1000000 + jie.day * 10000 + jie.hour * 100 + jie.minute

    // 上一个节的索引
    const prevIdx = (i + 11) % 12
    const prevJieName = JIE_NAMES[prevIdx]
    const prevJie = allJieQi.get(prevJieName)!

    // 处理跨年情况（如1月出生小寒前，属于上一年的丑月）
    let prevValue: number
    if (prevJie.month > jie.month) {
      // 上一年
      prevValue = (prevJie.month) * 1000000 - 12000000 + prevJie.day * 10000 + prevJie.hour * 100 + prevJie.minute
      jieValue = jieValue + 12000000
    } else {
      prevValue = prevJie.month * 1000000 + prevJie.day * 10000 + prevJie.hour * 100 + prevJie.minute
    }

    if (birthValue >= prevValue && birthValue < jieValue) {
      return JIE_TO_MONTH_ZHI[prevJieName]
    }
  }

  // 回退：小寒后的日期（12月~次年1月小寒前）
  return 1 // 丑月
}

/**
 * 根据公历日期获取年柱所用的年份
 * 立春前出生 → 年份-1（年柱用上一年干支）
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @param hour 小时(可选，用于精确判定)
 * @returns 年柱对应的农历年
 */
export function getNianZhuYear(year: number, month: number, day: number, hour?: number, minute = 0): number {
  const allJieQi = calcAllJieQi(year)
  const lichun = allJieQi.get('立春')!

  const birthValue = month * 1000000 + day * 10000 + (hour ?? 12) * 100 + minute
  const lichunValue = lichun.month * 1000000 + lichun.day * 10000 + lichun.hour * 100 + lichun.minute

  if (birthValue < lichunValue) {
    return year - 1
  }
  return year
}

/**
 * 获取某个「节」的精确公历日期
 * @param year 公历年
 * @param jieQiIndex 节索引：0=立春, 1=惊蛰, ..., 11=小寒
 */
export function getJieQiDate(
  year: number, jieQiIndex: number
): { month: number; day: number; hour: number; minute: number } {
  const jieName = JIE_NAMES[jieQiIndex]
  const all = calcAllJieQi(year)
  const jie = all.get(jieName)!
  return { ...jie }
}

/**
 * 计算两个日期之间的天数（保留兼容）
 */
export function daysBetween(
  y1: number, m1: number, d1: number,
  y2: number, m2: number, d2: number
): number {
  const date1 = new Date(y1, m1 - 1, d1)
  const date2 = new Date(y2, m2 - 1, d2)
  return Math.floor((date2.getTime() - date1.getTime()) / 86400000)
}

/**
 * 找到最近的「节」距离出生日的天数
 * 阳男阴女顺数到下一节，阴男阳女逆数到上一节
 * @param hour 出生小时(0-23)，用于精确判断出生时刻与节气的先后
 */
export function daysToNearestJie(
  year: number, month: number, day: number,
  direction: 'forward' | 'backward',
  hour = 12,
): number {
  const birthJD = gregorianToJD(year, month, day) + hour / 24

  if (direction === 'forward') {
    // 顺排：找下一个节（搜索当年及次年）
    let minDist = Infinity
    const searchYears = [year, year + 1]
    for (const y of searchYears) {
      const jieQi = calcAllJieQi(y)
      for (const jieName of JIE_NAMES) {
        const jie = jieQi.get(jieName)!
        const jieYear = (jieName === '小寒' && jie.month === 1) ? y + 1 : y
        const jieJD = gregorianToJD(jieYear, jie.month, jie.day) + (jie.hour * 60 + jie.minute) / 1440
        const dist = jieJD - birthJD
        if (dist > 0 && dist < minDist) minDist = dist
      }
    }
    return Math.ceil(minDist)
  } else {
    // 逆排：找上一个节（搜索当年及上年）
    let minDist = Infinity
    const searchYears = [year, year - 1]
    for (const y of searchYears) {
      const jieQi = calcAllJieQi(y)
      for (const jieName of JIE_NAMES) {
        const jie = jieQi.get(jieName)!
        const jieYear = (jieName === '小寒' && jie.month === 1) ? y + 1 : y
        const jieJD = gregorianToJD(jieYear, jie.month, jie.day) + (jie.hour * 60 + jie.minute) / 1440
        const dist = birthJD - jieJD
        if (dist > 0 && dist < minDist) minDist = dist
      }
    }
    return Math.ceil(minDist)
  }
}
