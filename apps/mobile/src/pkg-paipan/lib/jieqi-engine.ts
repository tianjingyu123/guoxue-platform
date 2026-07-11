/**
 * 二十四节气引擎
 * 交节时刻：lunar-typescript（寿星天文历法，精确到秒）
 * 功能：任意年份节气表、当前节气定位、七十二候进度、倒计时、数九/三伏。
 */
import { Solar } from "./lunar/index.js"
import { JIEQI_LIST, jieqiInfoOf, type JieqiInfo } from "./jieqi-data"

export interface JieqiMoment {
  name: string
  /** 交节时刻（本地时间） */
  date: Date
  dateText: string
  timeText: string
  /** 星期 */
  weekText: string
  /** 农历日期 */
  lunarText: string
  info: JieqiInfo
}

export interface CurrentJieqi {
  /** 当前所处节气 */
  current: JieqiMoment
  /** 下一节气 */
  next: JieqiMoment
  /** 当前节气已过天数（第 N 天，1 起） */
  dayIn: number
  /** 节气总天数 */
  dayTotal: number
  /** 当前候（1/2/3） */
  houIndex: number
  /** 当前候名 */
  houName: string
  /** 候内第几天（1-5） */
  houDay: number
  /** 距下一节气毫秒数 */
  msToNext: number
  /** 节气进度 0-1 */
  progress: number
  /** 数九或三伏提示（不在其中则为 null） */
  shujiu: string | null
  sanfu: string | null
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"]

function toMoment(name: string, solar: { toYmdHms(): string }): JieqiMoment {
  const [ymd, hms] = solar.toYmdHms().split(" ")
  const [y, m, d] = ymd.split("-").map(Number)
  const [hh, mm, ss] = hms.split(":").map(Number)
  const date = new Date(y, m - 1, d, hh, mm, ss)
  const lunar = Solar.fromYmdHms(y, m, d, hh, mm, ss).getLunar()
  return {
    name,
    date,
    dateText: `${m}月${d}日`,
    timeText: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
    weekText: `周${WEEK[date.getDay()]}`,
    lunarText: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    info: jieqiInfoOf(name)!,
  }
}

/** 某公历年份的完整二十四节气表（小寒起，冬至止） */
export function jieqiTableOfYear(year: number): JieqiMoment[] {
  // 6月1日所属农历年的节气表覆盖当年 小寒→大雪 + DONG_ZHI(当年冬至)
  const table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable()
  const pick = (key: string, name: string): JieqiMoment | null => {
    const s = table[key]
    if (!s) return null
    const m = toMoment(name, s)
    return m.date.getFullYear() === year ? m : null
  }
  const names = JIEQI_LIST.map((j) => j.name)
  const out: JieqiMoment[] = []
  // 顺序：小寒 大寒 立春 … 大雪 冬至
  const ordered = ["小寒", "大寒", ...names.filter((n) => !["小寒", "大寒", "冬至"].includes(n)), "冬至"]
  for (const n of ordered) {
    // lunar-typescript 表中：当年 冬至 的 key 是 DONG_ZHI，当年 小寒/大寒 是中文 key
    const key = n === "冬至" ? "DONG_ZHI" : n
    const m = pick(key, n)
    if (m) out.push(m)
  }
  // 个别年份边界兜底：从相邻月份的表补齐缺失项
  if (out.length < 24) {
    const table2 = Solar.fromYmd(year, 1, 15).getLunar().getJieQiTable()
    for (const n of ordered) {
      if (out.some((o) => o.name === n)) continue
      for (const key of [n, `${n}_2`, n === "冬至" ? "DONG_ZHI" : "", n === "小寒" ? "XIAO_HAN" : "", n === "大寒" ? "DA_HAN" : ""]) {
        if (!key || !table2[key]) continue
        const m = toMoment(n, table2[key])
        if (m.date.getFullYear() === year) { out.push(m); break }
      }
    }
    out.sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  return out
}

/** 数九进度（冬至起 81 天） */
function shujiuOf(now: Date): string | null {
  for (const y of [now.getFullYear(), now.getFullYear() - 1]) {
    const dz = jieqiTableOfYear(y).find((j) => j.name === "冬至")
    if (!dz) continue
    const days = Math.floor((now.getTime() - new Date(dz.date.getFullYear(), dz.date.getMonth(), dz.date.getDate()).getTime()) / 86400000)
    if (days >= 0 && days < 81) {
      const jiu = Math.floor(days / 9) + 1
      const JIU = ["一九", "二九", "三九", "四九", "五九", "六九", "七九", "八九", "九九"]
      return `${JIU[jiu - 1]}第${(days % 9) + 1}天`
    }
  }
  return null
}

/** 三伏（夏至后第三庚日入伏） */
function sanfuOf(now: Date): string | null {
  const lunar = Solar.fromDate(now).getLunar()
  const fu = lunar.getFu()
  if (!fu) return null
  return `${fu.getName()}第${fu.getIndex()}天`
}

/** 当前节气定位与候（七十二候）进度 */
export function currentJieqi(now: Date = new Date()): CurrentJieqi {
  const lunar = Solar.fromDate(now).getLunar()
  const prev = lunar.getPrevJieQi(true)
  const next = lunar.getNextJieQi(true)
  const current = toMoment(prev.getName(), prev.getSolar())
  const nextM = toMoment(next.getName(), next.getSolar())
  const spanMs = nextM.date.getTime() - current.date.getTime()
  const passedMs = now.getTime() - current.date.getTime()
  const dayIn = Math.floor(passedMs / 86400000) + 1
  const dayTotal = Math.round(spanMs / 86400000)
  const houIndex = Math.min(3, Math.floor((dayIn - 1) / 5) + 1)
  const houDay = Math.min(5, dayIn - (houIndex - 1) * 5)
  return {
    current,
    next: nextM,
    dayIn,
    dayTotal,
    houIndex,
    houName: current.info.sanhou[houIndex - 1]?.name ?? "",
    houDay,
    msToNext: nextM.date.getTime() - now.getTime(),
    progress: Math.max(0, Math.min(1, passedMs / spanMs)),
    shujiu: shujiuOf(now),
    sanfu: sanfuOf(now),
  }
}

/** 倒计时文本（X天X时X分） */
export function countdownText(ms: number): string {
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${d}天${h}时${m}分`
}
