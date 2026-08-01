/**
 * ⚠️ 本文件是**全平台唯一**的排盘算法真源（2026-07-14 由 apps/mobile 迁入）。
 *
 * 迁入原因：此前 C 端用前端引擎、admin 用 apps/server 的 tool-registry/calculators，
 * 两套算法实测结果大面积不同（奇门局数/值符/值使、大六壬月将全错），
 * 出现「管理员与用户看到不同的盘」。现统一到这里，前后端共用一套。
 *
 * 🔴 改动本文件必须跑：pnpm --filter @guoxue/mobile verify（14 套黄金测试 + 前后端一致性）
 */
/**
 * 二十四节气近似计算（基于太阳黄经，精度约±30分钟，满足排盘展示需求）
 */

const JIEQI_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
  "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
  "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
]

/** 计算儒略日 */
function toJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

// ─── 截断 VSOP87D 地球日心黄经级数（Meeus《天文算法》表32.a，精度约1″≈半分钟内）───
// 每项: [A, B, C] → A·cos(B + C·τ)，τ 为 J2000 起儒略千年数（力学时）
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

/** 太阳视黄经（度）：VSOP87 截断级数 + 章动/光行差修正，含 ΔT（UT→TT）；精度约±1分钟 */
function sunLongitude(jd: number): number {
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

/** 求太阳黄经达到 target 度的时刻（在 approx 附近搜索） */
function findJieqiTime(targetDeg: number, approxDate: Date): Date {
  let lo = approxDate.getTime() - 20 * 86400000
  let hi = approxDate.getTime() + 20 * 86400000
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    let diff = sunLongitude(toJulian(new Date(mid))) - targetDeg
    // 归一化到 [-180, 180)
    diff = ((diff + 180) % 360 + 360) % 360 - 180
    if (diff < 0) lo = mid
    else hi = mid
  }
  return new Date((lo + hi) / 2)
}

export interface JieqiInfo {
  name: string
  date: Date
}

/**
 * 返回给定日期的前一个（或当天已过的）节气与下一个节气
 */
export function getJieqiRange(date: Date): { prev: JieqiInfo; next: JieqiInfo } {
  const year = date.getFullYear()
  const list: JieqiInfo[] = []
  // 覆盖上一年12月到下一年1月的所有节气
  for (let y = year - 1; y <= year + 1; y++) {
    for (let i = 0; i < 24; i++) {
      // 节气 i 的太阳黄经：小寒=285°，此后每个+15°
      const deg = (285 + i * 15) % 360
      // 近似日期：小寒约1月5日
      const approxMonth = Math.floor(i / 2) // 0..11 对应 1..12月
      const approxDay = i % 2 === 0 ? 6 : 21
      const approx = new Date(y, approxMonth, approxDay)
      list.push({ name: JIEQI_NAMES[i], date: findJieqiTime(deg, approx) })
    }
  }
  list.sort((a, b) => a.date.getTime() - b.date.getTime())
  // 传入 Date 的钟面读数按北京时间解释（任何设备时区结果一致；沙箱UTC坑防御）
  const t =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()) -
    8 * 3600000
  let prevIdx = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i].date.getTime() <= t) prevIdx = i
    else break
  }
  return { prev: list[prevIdx], next: list[prevIdx + 1] }
}

/** 求某公历年中指定节气的时刻（如 findTerm(2026, "立春")） */
export function findTerm(year: number, name: string): Date {
  const i = JIEQI_NAMES.indexOf(name)
  const deg = (285 + i * 15) % 360
  const approxMonth = Math.floor(i / 2)
  const approxDay = i % 2 === 0 ? 6 : 21
  return findJieqiTime(deg, new Date(year, approxMonth, approxDay))
}

/** 格式化为竞品样式（北京时间）："夏至2026.06.21 16:24 ~ 小暑2026.07.07 09:56" */
export function formatJieqiRange(date: Date): string {
  const { prev, next } = getJieqiRange(date)
  const fmt = (j: JieqiInfo) => {
    // 统一以北京时间（UTC+8）展示，避免设备时区差异
    const d = new Date(j.date.getTime() + (8 * 60 + j.date.getTimezoneOffset()) * 60000)
    const p = (n: number) => String(n).padStart(2, "0")
    return `${j.name}${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  return `${fmt(prev)} ~ ${fmt(next)}`
}
