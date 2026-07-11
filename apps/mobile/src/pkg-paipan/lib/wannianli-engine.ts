// 万年历真实历法引擎
// 干支/四柱以项目自有 ganzhi+jieqi 引擎为准（已用竞品实测校准），
// 老黄历宜忌/神煞/建除/28宿/胎神/彭祖/九星等《协纪辨方书》语料
// 由成熟的 lunar-typescript(6tail, MIT) 提供，二者干支已交叉校验一致。
// 输出结构与 lib/yijing/mock/wannianli.ts 完全一致，供 UI 直接消费。

import { Solar, Lunar } from "./lunar/index.js"
import type {
  AlmanacRow,
  AuspiciousGod,
  CountdownItem,
  DirectionItem,
  GanZhiPillar,
  HourLuck,
  HourOmen,
  VernacularYiJi,
  WuXing,
  WuXingRatio,
  WuxingDress,
  YiJiItem,
} from "@/lib/paipan/types"
import type { DayData, FlyingStarChart } from "./wannianli-types"
import { HOUR_OMENS, PHENOLOGY_TABLE, YIJI_GLOSSARY } from "./almanac-data"

/* ============ 基础映射 ============ */

const WUXING_EN: Record<string, WuXing> = { 木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water" }
const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
}
const ZHI_WUXING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
}
const CN_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
const CN_MONTHS = ["", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
const EN_MONTHS = ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
const WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"]

// 方位描述 → 八方定位键
const DIR_KEY: Record<string, DirectionItem["key"]> = {
  正北: "N", 东北: "NE", 正东: "E", 东南: "SE", 正南: "S", 西南: "SW", 正西: "W", 西北: "NW",
}
// 煞方单字 → 键
const SHA_KEY: Record<string, DirectionItem["key"]> = { 北: "N", 东: "E", 南: "S", 西: "W" }

// 九星（玄空名）吉凶
const NINE_STAR_LUCK: Record<string, "good" | "bad" | "neutral"> = {
  一: "good", 二: "bad", 三: "bad", 四: "good", 五: "bad", 六: "good", 七: "bad", 八: "good", 九: "good",
}

const HOUR_RANGES = [
  "23:00–01:00", "01:00–03:00", "03:00–05:00", "05:00–07:00", "07:00–09:00", "09:00–11:00",
  "11:00–13:00", "13:00–15:00", "15:00–17:00", "17:00–19:00", "19:00–21:00", "21:00–23:00",
]
const HOUR_NAMES = ["子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时"]

/* ============ 小工具 ============ */

const wx = (ch: string): WuXing => WUXING_EN[ch] ?? "earth"

function yearToCn(year: number): string {
  return String(year)
    .split("")
    .map((d) => CN_DIGITS[Number(d)])
    .join("")
}

function tianShenLuck(luck: string): "good" | "bad" | "neutral" {
  if (luck === "吉") return "good"
  if (luck === "凶") return "bad"
  return "neutral"
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/* ============ 四柱 ============ */

function buildPillars(lunar: Lunar): GanZhiPillar[] {
  const ec = lunar.getEightChar()
  const mk = (
    label: string,
    gan: string,
    zhi: string,
    hide: string[],
    shishen: string,
    nayin: string,
  ): GanZhiPillar => ({
    label,
    gan,
    ganWuxing: wx(GAN_WUXING[gan]),
    zhi,
    zhiWuxing: wx(ZHI_WUXING[zhi]),
    ganShiShen: shishen,
    cangGan: hide,
    naYin: nayin,
  })
  return [
    mk("年柱", ec.getYearGan(), ec.getYearZhi(), ec.getYearHideGan(), ec.getYearShiShenGan(), ec.getYearNaYin()),
    mk("月柱", ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthHideGan(), ec.getMonthShiShenGan(), ec.getMonthNaYin()),
    mk("日柱", ec.getDayGan(), ec.getDayZhi(), ec.getDayHideGan(), ec.getDayShiShenGan(), ec.getDayNaYin()),
    mk("时柱", ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeHideGan(), ec.getTimeShiShenGan(), ec.getTimeNaYin()),
  ]
}

/* ============ 五行分布（八字五行个数） ============ */

function buildWuxingRatio(lunar: Lunar): WuXingRatio[] {
  const ec = lunar.getEightChar()
  const chars = [
    ec.getYearGan(), ec.getYearZhi(), ec.getMonthGan(), ec.getMonthZhi(),
    ec.getDayGan(), ec.getDayZhi(), ec.getTimeGan(), ec.getTimeZhi(),
  ]
  const count: Record<WuXing, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const c of chars) {
    const w = GAN_WUXING[c] ?? ZHI_WUXING[c]
    if (w) count[wx(w)]++
  }
  const order: { key: WuXing; cn: string }[] = [
    { key: "wood", cn: "木" }, { key: "fire", cn: "火" }, { key: "earth", cn: "土" },
    { key: "metal", cn: "金" }, { key: "water", cn: "水" },
  ]
  return order.map(({ key, cn }) => ({
    wuxing: key,
    value: count[key],
    label: count[key] === 0 ? `缺${cn}` : `${count[key]}${cn}`,
  }))
}

/* ============ 时辰吉凶 ============ */

function buildHours(lunar: Lunar): HourLuck[] {
  const times = lunar.getTimes()
  const nowHour = new Date().getHours()
  const curZhiIdx = Math.floor(((nowHour + 1) % 24) / 2)
  const isToday = isSameDay(lunar)
  return HOUR_NAMES.map((name, i) => {
    const t = times[i]
    const luck = tianShenLuck(t.getTianShenLuck())
    return {
      name,
      range: HOUR_RANGES[i],
      ganzhi: t.getGanZhi(),
      luck,
      note: t.getTianShen(),
      current: isToday && i === curZhiIdx,
    }
  })
}

function isSameDay(lunar: Lunar): boolean {
  const s = lunar.getSolar()
  const now = new Date()
  return s.getYear() === now.getFullYear() && s.getMonth() === now.getMonth() + 1 && s.getDay() === now.getDate()
}

/* ============ 方位 ============ */

function buildDirections(lunar: Lunar): DirectionItem[] {
  const base: Record<DirectionItem["key"], DirectionItem> = {
    N: { name: "正北", key: "N", luck: "neutral" },
    NE: { name: "东北", key: "NE", luck: "neutral" },
    E: { name: "正东", key: "E", luck: "neutral" },
    SE: { name: "东南", key: "SE", luck: "neutral" },
    S: { name: "正南", key: "S", luck: "neutral" },
    SW: { name: "西南", key: "SW", luck: "neutral" },
    W: { name: "正西", key: "W", luck: "neutral" },
    NW: { name: "西北", key: "NW", luck: "neutral" },
  }
  const setGood = (desc: string, tag: string) => {
    const k = DIR_KEY[desc]
    if (k) {
      base[k].luck = "good"
      base[k].tag = base[k].tag ? `${base[k].tag}·${tag}` : tag
    }
  }
  setGood(lunar.getDayPositionXiDesc(), "喜神")
  setGood(lunar.getDayPositionCaiDesc(), "财神")
  setGood(lunar.getDayPositionFuDesc(), "福神")
  setGood(lunar.getDayPositionYangGuiDesc(), "阳贵")
  setGood(lunar.getDayPositionYinGuiDesc(), "阴贵")
  // 煞方
  const shaKey = SHA_KEY[lunar.getDaySha()]
  if (shaKey) {
    base[shaKey].luck = "bad"
    base[shaKey].tag = "煞方"
  }
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((k) => base[k as DirectionItem["key"]])
}

/* ============ 九宫飞星 ============ */

const STAR_META: Record<number, { star: string; wuxing: WuXing; positionName: string; keywords: string[]; luck: "good" | "bad" | "neutral" }> = {
  1: { star: "一白贪狼星", wuxing: "water", positionName: "桃花位", keywords: ["偏财", "升职", "桃花"], luck: "good" },
  2: { star: "二黑巨门星", wuxing: "earth", positionName: "病符位", keywords: ["小病", "忧愁", "抑郁"], luck: "bad" },
  3: { star: "三碧禄存星", wuxing: "wood", positionName: "小人位", keywords: ["是非", "口舌", "情绪"], luck: "bad" },
  4: { star: "四绿文昌星", wuxing: "wood", positionName: "文昌位", keywords: ["文昌", "学业", "事业"], luck: "good" },
  5: { star: "五黄廉贞星", wuxing: "earth", positionName: "五黄煞", keywords: ["病毒", "灾祸", "血光"], luck: "bad" },
  6: { star: "六白武曲星", wuxing: "metal", positionName: "事业位", keywords: ["偏财", "贵人", "文昌"], luck: "good" },
  7: { star: "七赤破军星", wuxing: "metal", positionName: "破财位", keywords: ["官非", "破财", "贼劫"], luck: "bad" },
  8: { star: "八白左辅星", wuxing: "earth", positionName: "正财位", keywords: ["正财", "加薪", "置业"], luck: "good" },
  9: { star: "九紫右弼星", wuxing: "fire", positionName: "喜神位", keywords: ["添丁", "喜庆", "姻缘"], luck: "good" },
}

const PALACE_ORDER: { palace: string; direction: string; key: FlyingStarChart["stars"][number]["key"]; offset: number }[] = [
  { palace: "巽宫", direction: "东南", key: "SE", offset: 3 },
  { palace: "离宫", direction: "正南", key: "S", offset: -1 },
  { palace: "坤宫", direction: "西南", key: "SW", offset: 1 },
  { palace: "震宫", direction: "正东", key: "E", offset: 2 },
  { palace: "中宫", direction: "中", key: "CENTER", offset: 0 },
  { palace: "兑宫", direction: "正西", key: "W", offset: -2 },
  { palace: "艮宫", direction: "东北", key: "NE", offset: -3 },
  { palace: "坎宫", direction: "正北", key: "N", offset: 4 },
  { palace: "乾宫", direction: "西北", key: "NW", offset: -4 },
]

const CN_NUM_STAR: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
const wrap9 = (n: number) => ((((n - 1) % 9) + 9) % 9) + 1

function buildChart(key: FlyingStarChart["key"], label: string, centerNum: number): FlyingStarChart {
  const cm = STAR_META[centerNum]
  return {
    key,
    label,
    centerInfo: `${["", "一白", "二黑", "三碧", "四绿", "五黄", "六白", "七赤", "八白", "九紫"][centerNum]}-${cm.star.slice(2)}(${{ wood: "木", fire: "火", earth: "土", metal: "金", water: "水" }[cm.wuxing]})`,
    stars: PALACE_ORDER.map((p) => {
      const num = wrap9(centerNum + p.offset)
      const meta = STAR_META[num]
      return { palace: p.palace, direction: p.direction, key: p.key, star: meta.star, num, wuxing: meta.wuxing, positionName: meta.positionName, keywords: meta.keywords, luck: meta.luck }
    }),
  }
}

function buildFlyingStarCharts(lunar: Lunar): FlyingStarChart[] {
  const centerNum = (ns: { getNumber(): string }) => CN_NUM_STAR[ns.getNumber()] ?? 5
  return [
    buildChart("year", "流年", centerNum(lunar.getYearNineStar())),
    buildChart("month", "流月", centerNum(lunar.getMonthNineStar())),
    buildChart("day", "流日", centerNum(lunar.getDayNineStar())),
    buildChart("hour", "流时", centerNum(lunar.getTimeNineStar())),
  ]
}

/* ============ 五行穿衣 ============ */

const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }
const WX_COLOR: Record<string, { color: string; wuxing: WuXing }> = {
  金: { color: "白色系", wuxing: "metal" },
  木: { color: "绿色系", wuxing: "wood" },
  水: { color: "黑蓝色系", wuxing: "water" },
  火: { color: "红紫色系", wuxing: "fire" },
  土: { color: "黄棕色系", wuxing: "earth" },
}

function buildWuxingDress(lunar: Lunar): WuxingDress[] {
  // 以当日日干五行为「日主」，颜色生克定吉凶
  const master = GAN_WUXING[lunar.getEightChar().getDayGan()]
  const shengMe = Object.keys(SHENG).find((k) => SHENG[k] === master)! // 生我者(印)
  const meSheng = SHENG[master] // 我生者(泄)
  const meKe = KE[master] // 我克者(财，耗)
  const keMe = Object.keys(KE).find((k) => KE[k] === master)! // 克我者(官杀)
  const item = (el: string, level: string, luck: WuxingDress["luck"], note: string): WuxingDress => ({
    level, color: WX_COLOR[el].color, wuxing: WX_COLOR[el].wuxing, luck, note,
  })
  return [
    item(shengMe, "大吉", "good", "生助运势 · 贵人相扶"),
    item(master, "次吉", "good", "旺我本命 · 稳中求进"),
    item(meSheng, "小吉", "neutral", "顺气泄秀 · 平和顺遂"),
    item(meKe, "不宜", "bad", "耗气破财 · 慎穿此色"),
    item(keMe, "忌", "bad", "克身受制 · 尽量避开"),
  ]
}

/* ============ 白话文宜忌 ============ */

function buildVernacular(yi: string[], ji: string[]): VernacularYiJi[] {
  const out: VernacularYiJi[] = []
  for (const term of yi) {
    if (YIJI_GLOSSARY[term]) out.push({ type: "yi", term, plain: YIJI_GLOSSARY[term] })
  }
  for (const term of ji) {
    if (YIJI_GLOSSARY[term]) out.push({ type: "ji", term, plain: YIJI_GLOSSARY[term] })
  }
  return out
}

/* ============ 节气 / 物候 ============ */

function termDistance(lunar: Lunar): { jiRi: string; solarTerm: string } {
  const solar = lunar.getSolar()
  const today = dayStart(new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay()))
  const prev = lunar.getPrevJieQi(true)
  const next = lunar.getNextJieQi(true)
  const prevSolar = prev.getSolar()
  const nextSolar = next.getSolar()
  const prevMs = dayStart(new Date(prevSolar.getYear(), prevSolar.getMonth() - 1, prevSolar.getDay()))
  const nextMs = dayStart(new Date(nextSolar.getYear(), nextSolar.getMonth() - 1, nextSolar.getDay()))
  const daysAfter = Math.round((today - prevMs) / 86400000)
  const daysTo = Math.round((nextMs - today) / 86400000)
  const todayTerm = lunar.getJieQi()
  const line = daysAfter === 0 ? `${prev.getName()}` : `${prev.getName()}后 ${daysAfter} 日 · 距${next.getName()} ${daysTo} 日`
  return { jiRi: line, solarTerm: todayTerm || line }
}

function buildPhenology(lunar: Lunar): { term: string; phase: string; name: string; desc: string } {
  const prev = lunar.getPrevJieQi(true)
  const solar = lunar.getSolar()
  const today = dayStart(new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay()))
  const prevSolar = prev.getSolar()
  const prevMs = dayStart(new Date(prevSolar.getYear(), prevSolar.getMonth() - 1, prevSolar.getDay()))
  const daysAfter = Math.round((today - prevMs) / 86400000)
  const phaseIdx = Math.min(2, Math.floor(daysAfter / 5)) // 每候约5日
  const phaseName = ["初候", "二候", "三候"][phaseIdx]
  const table = PHENOLOGY_TABLE[prev.getName()]
  if (!table) return { term: prev.getName(), phase: phaseName, name: "—", desc: "物候资料待补。" }
  const hou = table[phaseIdx]
  return { term: prev.getName(), phase: phaseName, name: hou.name, desc: hou.desc }
}

/* ============ 节气倒计时 ============ */

function buildSolarTermCountdowns(lunar: Lunar): CountdownItem[] {
  const solar = lunar.getSolar()
  const today = dayStart(new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay()))
  const table = lunar.getJieQiTable()
  const entries: { name: string; ms: number; dateLabel: string }[] = []
  for (const name of Object.keys(table)) {
    // 过滤 lunar 内部带方向标记的重复项（如 "DONG_ZHI"），仅保留中文名
    if (!/[\u4e00-\u9fa5]/.test(name)) continue
    const s = table[name]
    const ms = dayStart(new Date(s.getYear(), s.getMonth() - 1, s.getDay()))
    entries.push({
      name,
      ms,
      dateLabel: `${String(s.getMonth()).padStart(2, "0")}月${String(s.getDay()).padStart(2, "0")}日 ${String(s.getHour()).padStart(2, "0")}:${String(s.getMinute()).padStart(2, "0")}`,
    })
  }
  entries.sort((a, b) => a.ms - b.ms)
  const future = entries.filter((e) => e.ms >= today).slice(0, 4)
  const iconFor = (name: string): CountdownItem["icon"] =>
    name.includes("暑") || name.includes("夏") ? "sun" : name.includes("寒") || name.includes("冬") || name.includes("雪") ? "flame" : "sprout"
  return future.map((e) => ({ name: e.name, dateLabel: e.dateLabel, deltaDays: Math.round((e.ms - today) / 86400000), icon: iconFor(e.name) }))
}

/* ============ 节日倒计时 ============ */

interface FestivalSpec {
  name: string
  type: "solar" | "lunar" | "eve"
  m: number
  d: number
  badge?: string
  icon?: CountdownItem["icon"]
}

const FESTIVALS: FestivalSpec[] = [
  { name: "元旦", type: "solar", m: 1, d: 1, badge: "1天假", icon: "gift" },
  { name: "春节", type: "lunar", m: 1, d: 1, badge: "8天假", icon: "flame" },
  { name: "元宵节", type: "lunar", m: 1, d: 15, icon: "moon" },
  { name: "劳动节", type: "solar", m: 5, d: 1, badge: "5天假", icon: "flag" },
  { name: "端午节", type: "lunar", m: 5, d: 5, badge: "3天假", icon: "gift" },
  { name: "七夕节", type: "lunar", m: 7, d: 7, icon: "gift" },
  { name: "中元节", type: "lunar", m: 7, d: 15, icon: "moon" },
  { name: "中秋节", type: "lunar", m: 8, d: 15, badge: "3天假", icon: "moon" },
  { name: "重阳节", type: "lunar", m: 9, d: 9, icon: "sprout" },
  { name: "国庆节", type: "solar", m: 10, d: 1, badge: "7天假", icon: "flag" },
  { name: "腊八节", type: "lunar", m: 12, d: 8, icon: "flame" },
  { name: "除夕", type: "eve", m: 1, d: 1, badge: "假期", icon: "flame" },
]

function festivalSolar(spec: FestivalSpec, gy: number): Solar | null {
  try {
    if (spec.type === "solar") return Solar.fromYmd(gy, spec.m, spec.d)
    if (spec.type === "lunar") return Lunar.fromYmd(gy, spec.m, spec.d).getSolar()
    // 除夕 = 次年春节前一天
    const spring = Lunar.fromYmd(gy + 1, 1, 1).getSolar()
    return spring.next(-1)
  } catch {
    return null
  }
}

function buildHolidayCountdowns(lunar: Lunar): CountdownItem[] {
  const solar = lunar.getSolar()
  const today = dayStart(new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay()))
  const gy = solar.getYear()
  const items: CountdownItem[] = []
  for (const spec of FESTIVALS) {
    for (const year of [gy, gy + 1]) {
      const s = festivalSolar(spec, year)
      if (!s) continue
      const ms = dayStart(new Date(s.getYear(), s.getMonth() - 1, s.getDay()))
      const delta = Math.round((ms - today) / 86400000)
      if (delta < 0 || delta > 400) continue
      items.push({
        name: spec.name,
        dateLabel: `${s.getYear()}年${String(s.getMonth()).padStart(2, "0")}月${String(s.getDay()).padStart(2, "0")}日 周${WEEK_CN[s.getWeek()]}`,
        deltaDays: delta,
        badge: spec.badge,
        icon: spec.icon,
      })
    }
  }
  const seen = new Set<string>()
  return items
    .sort((a, b) => a.deltaDays - b.deltaDays)
    .filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)))
    .slice(0, 4)
}

/* ============ 老黄历详解表格 ============ */

function buildAlmanacRows(lunar: Lunar, day: DayData): AlmanacRow[] {
  const ec = lunar.getEightChar()
  const nineStar = lunar.getDayNineStar()
  return [
    { label: "值神", value: day.zhiShen, tone: lunar.getDayTianShenLuck() === "吉" ? "good" : "bad" },
    { label: "纳音", value: ec.getDayNaYin() },
    { label: "冲煞", value: day.chongSha, tone: "bad" },
    { label: "喜神", value: lunar.getDayPositionXiDesc() },
    { label: "福神", value: lunar.getDayPositionFuDesc() },
    { label: "财神", value: lunar.getDayPositionCaiDesc() },
    { label: "阳贵神", value: lunar.getDayPositionYangGuiDesc() },
    { label: "阴贵神", value: lunar.getDayPositionYinGuiDesc() },
    { label: "胎神", value: day.taiShen },
    { label: "二十八星宿", value: `${lunar.getGong()}方${lunar.getXiu()}${lunar.getZheng()}${lunar.getAnimal()}-${lunar.getXiuLuck()}`, tone: lunar.getXiuLuck() === "吉" ? "good" : "bad" },
    { label: "建除十二神", value: day.jianChu },
    { label: "九星", value: `${nineStar.getNumber()}${nineStar.getColor()}${nineStar.getWuXing()} · ${nineStar.getNameInXuanKong()}` },
    { label: "月相", value: lunar.getYueXiang() },
    { label: "物候", value: buildPhenology(lunar).name },
    { label: "吉神宜趋", value: day.jiShen || "无", tone: "good", wide: true },
    { label: "凶神宜忌", value: day.xiongShen || "无", tone: "bad", wide: true },
    { label: "彭祖百忌", value: day.pengZu.join("；"), wide: true },
  ]
}

/* ============ 每日吉凶判定（建除 + 黄黑道 + 宜忌数） ============ */

// 建除十二神吉凶：建除满平定执破危成收开闭
const JIANCHU_LUCK: Record<string, "good" | "bad" | "neutral"> = {
  建: "neutral", 除: "good", 满: "good", 平: "neutral", 定: "good", 执: "neutral",
  破: "bad", 危: "bad", 成: "good", 收: "neutral", 开: "good", 闭: "bad",
}

/** 综合建除、黄黑道、宜忌条数给出单日吉凶（用于月/年视图打点）。 */
export function dayLuck(lunar: Lunar): "good" | "bad" | "neutral" {
  let score = 0
  const jc = JIANCHU_LUCK[lunar.getZhiXing()] ?? "neutral"
  if (jc === "good") score += 1
  else if (jc === "bad") score -= 1
  if (lunar.getDayTianShenLuck() === "吉") score += 1
  else if (lunar.getDayTianShenLuck() === "凶") score -= 1
  const yiCount = lunar.getDayYi().length
  const jiCount = lunar.getDayJi().length
  if (yiCount - jiCount >= 4) score += 1
  else if (jiCount - yiCount >= 4) score -= 1
  if (score >= 1) return "good"
  if (score <= -1) return "bad"
  return "neutral"
}

/* ============ 月视图网格 ============ */

export interface MonthGridResult {
  title: string
  cells: {
    solarDay: number
    lunarDay: string
    luck: "good" | "bad" | "neutral"
    festival?: string
    isToday?: boolean
    isCurrentMonth: boolean
  }[]
}

/** 构建某年某月（1-12）的完整日历网格，含前后补白至整周。 */
export function buildMonthGrid(year: number, month: number): MonthGridResult {
  const first = Solar.fromYmd(year, month, 1)
  const firstLunar = first.getLunar()
  const daysInMonth = new Date(year, month, 0).getDate()
  const leadingBlanks = first.getWeek() // 0=周日
  const now = new Date()
  const cells: MonthGridResult["cells"] = []

  // 前补白（上月末尾）
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  for (let i = leadingBlanks - 1; i >= 0; i--) {
    cells.push({ solarDay: prevMonthDays - i, lunarDay: "", luck: "neutral", isCurrentMonth: false })
  }
  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    const solar = Solar.fromYmd(year, month, d)
    const lunar = solar.getLunar()
    const jq = lunar.getJieQi()
    const festList = [...solar.getFestivals(), ...lunar.getFestivals()]
    const lunarDay = lunar.getDay() === 1 ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese()
    cells.push({
      solarDay: d,
      lunarDay,
      luck: dayLuck(lunar),
      festival: festList[0] ?? (jq || undefined),
      isToday: now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === d,
      isCurrentMonth: true,
    })
  }
  // 后补白至整周
  while (cells.length % 7 !== 0) {
    const idx = cells.length - (leadingBlanks + daysInMonth) + 1
    cells.push({ solarDay: idx, lunarDay: "", luck: "neutral", isCurrentMonth: false })
  }
  void firstLunar
  return { title: `${year}年 ${CN_MONTHS[month]} · ${firstLunar.getYearInGanZhiByLiChun()}年`, cells }
}

/* ============ 年视图概览 ============ */

export interface YearMonthInfo {
  month: number
  label: string
  lunarLabel: string
  solarTerms: string[]
  festival?: string
  goodDays: number
}

export interface YearOverviewResult {
  title: string
  months: YearMonthInfo[]
}

/** 构建全年 12 月概览：每月两节气、代表节日、吉日数（按 dayLuck 统计）。 */
export function buildYearOverview(year: number): YearOverviewResult {
  const yearGZ = Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhiByLiChun()
  const shengXiao = Solar.fromYmd(year, 6, 1).getLunar().getYearShengXiaoByLiChun()
  const months: YearMonthInfo[] = []
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate()
    const terms: string[] = []
    let festival: string | undefined
    let goodDays = 0
    let midLunarMonth = ""
    for (let d = 1; d <= daysInMonth; d++) {
      const lunar = Solar.fromYmd(year, m, d).getLunar()
      const jq = lunar.getJieQi()
      if (jq && /[\u4e00-\u9fa5]/.test(jq) && terms.length < 2 && !terms.includes(jq)) terms.push(jq)
      if (!festival) {
        const f = [...Solar.fromYmd(year, m, d).getFestivals(), ...lunar.getFestivals()][0]
        if (f) festival = f
      }
      if (d === 15) midLunarMonth = `${lunar.getMonthInChinese()}月`
      if (dayLuck(lunar) === "good") goodDays++
    }
    months.push({
      month: m,
      label: CN_MONTHS[m],
      lunarLabel: midLunarMonth,
      solarTerms: terms,
      festival,
      goodDays,
    })
  }
  return { title: `${year}年 · ${yearGZ}${shengXiao}年`, months }
}

/* ============ 纪年转换 ============ */

const GANZHI_60 = (() => {
  const gan = "甲乙丙丁戊己庚辛壬癸"
  const zhi = "子丑寅卯辰巳午未申酉戌亥"
  const arr: string[] = []
  for (let i = 0; i < 60; i++) arr.push(gan[i % 10] + zhi[i % 12])
  return arr
})()

export interface EraConversionResult {
  gregorian: string
  lunar: string
  ganzhiYear: string
  ganzhiMonth: string
  ganzhiDay: string
  zodiac: string
  reignEra: string
  julianDay: string
  weekday: string
  quickList: { label: string; value: string }[]
}

/** 公历日期 → 农历 / 干支 / 生肖 / 黄帝纪元 / 儒略日 / 星座 等多历法信息。 */
export function convertEra(date: Date): EraConversionResult {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solar.getLunar()
  const yGZ = lunar.getYearInGanZhiByLiChun()
  const mGZ = lunar.getMonthInGanZhiExact()
  const dGZ = lunar.getDayInGanZhi()
  const zodiac = lunar.getYearShengXiaoByLiChun()
  const gzIndex = GANZHI_60.indexOf(yGZ) + 1
  const jd = solar.getJulianDay()
  return {
    gregorian: `公元 ${solar.getYear()}年 ${solar.getMonth()}月 ${solar.getDay()}日`,
    lunar: `农历 ${yGZ}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganzhiYear: `${yGZ}年`,
    ganzhiMonth: `${mGZ}月`,
    ganzhiDay: `${dGZ}日`,
    zodiac: `生肖 ${zodiac}`,
    reignEra: `黄帝纪元 ${solar.getYear() + 2697} 年 · 干支第 ${gzIndex} 位`,
    julianDay: `儒略日 JD ${Math.round(jd)}`,
    weekday: `星期${WEEK_CN[solar.getWeek()]}`,
    quickList: [
      { label: "公历", value: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}` },
      { label: "农历", value: `${yGZ}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` },
      { label: "干支", value: `${yGZ}·${mGZ}·${dGZ}` },
      { label: "星期", value: `星期${WEEK_CN[solar.getWeek()]}` },
      { label: "生肖", value: zodiac },
      { label: "星座", value: solar.getXingZuo() + "座" },
    ],
  }
}

/* ============ 主入口 ============ */

export interface AlmanacBundle {
  day: DayData
  almanacRows: AlmanacRow[]
  flyingStarCharts: FlyingStarChart[]
  auspiciousGods: AuspiciousGod[]
  wuxingDress: WuxingDress[]
  vernacularYiJi: VernacularYiJi[]
  holidayCountdowns: CountdownItem[]
  solarTermCountdowns: CountdownItem[]
  currentPhenology: { term: string; phase: string; name: string; desc: string }
  huangdiEra: string
  hourOmens: HourOmen[]
}

/** 由公历日期构建整份黄历数据。date 含时刻用于时柱/当前时辰高亮。 */
export function buildAlmanac(date: Date): AlmanacBundle {
  const solar = Solar.fromYmdHms(
    date.getFullYear(), date.getMonth() + 1, date.getDate(),
    date.getHours(), date.getMinutes(), date.getSeconds(),
  )
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()

  const yi = lunar.getDayYi()
  const ji = lunar.getDayJi()
  const { jiRi, solarTerm } = termDistance(lunar)
  const festivals = [...solar.getFestivals(), ...lunar.getFestivals()]

  const chongShaFull = `冲${lunar.getDayChongShengXiao()}(${lunar.getDayChongGan()}${lunar.getDayChong()}) 煞${lunar.getDaySha()}`
  const zhiShen = `${lunar.getDayTianShen()}(${lunar.getDayTianShenType()}日)`
  const nineStar = lunar.getDayNineStar()

  const pengZu = [lunar.getPengZuGan(), lunar.getPengZuZhi()].filter(Boolean)

  const day: DayData = {
    solarDate: `${solar.getYear()}年 ${solar.getMonth()}月 ${solar.getDay()}日`,
    solarYearLabel: yearToCn(solar.getYear()),
    solarMonthLabel: `${CN_MONTHS[solar.getMonth()]} ${EN_MONTHS[solar.getMonth()]}`,
    solarDayNum: String(solar.getDay()),
    weekday: `星期${WEEK_CN[solar.getWeek()]}`,
    lunarYear: `${lunar.getYearInGanZhiByLiChun()}年 · 属${lunar.getYearShengXiaoByLiChun()}`,
    lunarDate: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganZhiLine: `岁次 ${lunar.getYearInGanZhiByLiChun()}年 ${lunar.getMonthInGanZhiExact()}月 ${lunar.getDayInGanZhi()}日`,
    jiRi,
    solarTerm,
    festival: festivals[0],
    pillars: buildPillars(lunar),
    yi: yi.map((t): YiJiItem => ({ text: t })),
    ji: ji.map((t): YiJiItem => ({ text: t })),
    chongSha: chongShaFull,
    zhiShen,
    wuxing: buildWuxingRatio(lunar),
    jiShen: lunar.getDayJiShen().slice(0, 6).join(" "),
    xiongShen: lunar.getDayXiongSha().slice(0, 6).join(" "),
    hours: buildHours(lunar),
    directions: buildDirections(lunar),
    ershiba: `${lunar.getXiu()}${lunar.getZheng()}${lunar.getAnimal()} · ${lunar.getXiuLuck()}`,
    kongWang: `${ec.getDayXunKong()}空亡`,
    taiShen: lunar.getDayPositionTai(),
    pengZu,
    jianChu: `${lunar.getZhiXing()}日`,
    jiuXing: `${nineStar.getNumber()}${nineStar.getColor()}${nineStar.getWuXing()} · ${nineStar.getNameInXuanKong()}${NINE_STAR_LUCK[nineStar.getNumber()] === "good" ? "吉" : NINE_STAR_LUCK[nineStar.getNumber()] === "bad" ? "凶"       : ""}星`,
  }

  return {
    day,
    almanacRows: buildAlmanacRows(lunar, day),
    flyingStarCharts: buildFlyingStarCharts(lunar),
    auspiciousGods: [
      { name: "喜神", direction: lunar.getDayPositionXiDesc(), key: DIR_KEY[lunar.getDayPositionXiDesc()] },
      { name: "福神", direction: lunar.getDayPositionFuDesc(), key: DIR_KEY[lunar.getDayPositionFuDesc()] },
      { name: "财神", direction: lunar.getDayPositionCaiDesc(), key: DIR_KEY[lunar.getDayPositionCaiDesc()] },
      { name: "阳贵", direction: lunar.getDayPositionYangGuiDesc(), key: DIR_KEY[lunar.getDayPositionYangGuiDesc()] },
      { name: "阴贵", direction: lunar.getDayPositionYinGuiDesc(), key: DIR_KEY[lunar.getDayPositionYinGuiDesc()] },
    ],
    wuxingDress: buildWuxingDress(lunar),
    vernacularYiJi: buildVernacular(yi, ji),
    holidayCountdowns: buildHolidayCountdowns(lunar),
    solarTermCountdowns: buildSolarTermCountdowns(lunar),
    currentPhenology: buildPhenology(lunar),
    huangdiEra: `黄帝纪元 ${yearToCn(solar.getYear() + 2697)}年`,
    hourOmens: HOUR_OMENS,
  }
}
