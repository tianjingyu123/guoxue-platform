/**
 * 二十四节气引擎
 * 交节时刻：lunar-typescript（寿星天文历法，精确到秒），已与 astronomy-engine(VSOP87) 交叉验证
 * 功能：任意年份节气表、当前节气定位、七十二候进度、倒计时、数九/三伏。
 *
 * 🔴 时区（2026-07-14 修）：节气交节时刻是按**北京时间（UTC+8）**定义的，lunar-typescript 返回的
 * 也是北京时间的年月日时分秒。原实现直接 `new Date(y, m-1, d, hh, mm, ss)` —— 这是按**运行设备的本地
 * 时区**去解释这串数字。设备在中国（+08）恰好蒙对；设备时区一旦不是 +08（海外用户、手机时区设错），
 * 交节的绝对瞬时就整体偏移一个时区差（实测本机 America/Los_Angeles 偏 16 小时），导致「当前节气」
 * 在交节前后判错、倒计时差出十几个小时。
 * 现在：北京时间分量 ⇄ 绝对瞬时显式换算；显示字段（月日/时刻/星期）一律取北京时间分量，
 * 不再用 date.getHours()/getDay() 这类本地时区读数。
 */
import { Solar } from "./lunar/index.js"
import { JIEQI_LIST, jieqiInfoOf, type JieqiInfo } from "./jieqi-data"

export interface JieqiMoment {
  name: string
  /** 交节时刻（绝对瞬时；显示请用下面的北京时间分量） */
  date: Date
  /** 北京时间的年/月/日（跨时区安全，年表筛选与数九计算依赖它） */
  year: number
  month: number
  day: number
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

/** 北京时区偏移（中国全境统一 UTC+8，无夏令时） */
const CST_MS = 8 * 3600 * 1000

/** 绝对瞬时 → 北京时间的日历分量 */
export function beijingParts(d: Date): { y: number; m: number; d: number; hh: number; mm: number; ss: number; week: number } {
  const t = new Date(d.getTime() + CST_MS)
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    hh: t.getUTCHours(), mm: t.getUTCMinutes(), ss: t.getUTCSeconds(),
    week: t.getUTCDay(),
  }
}

/** 北京时间的日历分量 → 绝对瞬时 */
function fromBeijing(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss) - CST_MS)
}

function toMoment(name: string, solar: { toYmdHms(): string }): JieqiMoment {
  const [ymd, hms] = solar.toYmdHms().split(" ")
  const [y, m, d] = ymd.split("-").map(Number)
  const [hh, mm, ss] = hms.split(":").map(Number)
  // lunar 给的是北京时间的读数 → 换算成绝对瞬时（下游一切时间比较都用它）
  const date = fromBeijing(y, m, d, hh, mm, ss)
  const lunar = Solar.fromYmdHms(y, m, d, hh, mm, ss).getLunar()
  return {
    name,
    date,
    year: y,
    month: m,
    day: d,
    dateText: `${m}月${d}日`,
    timeText: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
    // 星期同样按北京日期算，不能用 date.getDay()（那是设备本地时区）
    weekText: `周${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`,
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
    return m.year === year ? m : null
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
        if (m.year === year) { out.push(m); break }
      }
    }
    out.sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  return out
}

/** 数九进度（冬至起 81 天；按北京日历日计数） */
function shujiuOf(now: Date): string | null {
  const nb = beijingParts(now)
  const nowDay = Date.UTC(nb.y, nb.m - 1, nb.d)
  for (const y of [nb.y, nb.y - 1]) {
    const dz = jieqiTableOfYear(y).find((j) => j.name === "冬至")
    if (!dz) continue
    const days = Math.floor((nowDay - Date.UTC(dz.year, dz.month - 1, dz.day)) / 86400000)
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
  const p = beijingParts(now)
  const lunar = Solar.fromYmdHms(p.y, p.m, p.d, p.hh, p.mm, p.ss).getLunar()
  const fu = lunar.getFu()
  if (!fu) return null
  return `${fu.getName()}第${fu.getIndex()}天`
}

/**
 * 当前节气定位与候（七十二候）进度
 *
 * 🔴 不用 lunar.getPrevJieQi()/getNextJieQi()：实测它是**按天**判定的——2026 立春交节在 04:02，
 * 而当天 04:01（尚未交节）问它，它已经答「立春」。节气恰恰也是八字月柱的分界线，
 * 交节当天凌晨那几个小时判错，盘就错。
 * 改为：拿本引擎自己的精确时刻表（已与 VSOP87 对撞到 ±1 分钟内），按**绝对瞬时**取
 * 「最后一个 ≤ now 的交节点」，跨年用相邻年份的表兜住。
 */
export function currentJieqi(now: Date = new Date()): CurrentJieqi {
  const y = beijingParts(now).y
  const all = [...jieqiTableOfYear(y - 1), ...jieqiTableOfYear(y), ...jieqiTableOfYear(y + 1)].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
  const t = now.getTime()
  let idx = -1
  for (let i = 0; i < all.length; i++) {
    if (all[i].date.getTime() <= t) idx = i
    else break
  }
  // 理论上不会越界（前后各兜了一年），越界则退回首尾以免崩页
  const current = all[Math.max(0, Math.min(idx, all.length - 2))]
  const nextM = all[Math.max(1, Math.min(idx + 1, all.length - 1))]
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

/**
 * 某个北京时刻所处的节气区间（上一节气 ~ 下一节气），按**绝对瞬时**判定。
 *
 * 给 feigong / jinkoujue / qizheng 等引擎显示「节气区间」用。
 * 🔴 别再用 lunar.getPrevJieQi()——它按天判：2026 立春交节在 04:02，当天 03:00 问它就已答「立春」，
 * 而同一时刻 getMonthInGanZhiExact() 给的月柱还是己丑（丑月）。两者打架 = 盘面自相矛盾。
 */
export function jieqiRangeAt(y: number, m: number, d: number, hh = 0, mi = 0): { prev: JieqiMoment; next: JieqiMoment } {
  const c = currentJieqi(fromBeijing(y, m, d, hh, mi, 0))
  return { prev: c.current, next: c.next }
}
