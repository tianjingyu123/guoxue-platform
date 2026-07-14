/**
 * 七政四余排盘引擎（果老星宗）—— 对标专业级排盘
 *
 * 天文数据：astronomy-engine（VSOP87 精度级），真黄道 of-date 坐标。
 * 已用竞品（一讯七政四余 V1.32，2026-07-03 21:09 北京男命）逐星校准：
 * 七政黄经 Δ≤0.02°，宿钤边界 Δ≤0.01°，立命/安身/童限/大限年份一致。
 *
 * 流派约定（详见 docs/qizheng-golden-test.md）：
 * - 罗睺＝白道升交点（平交点），计都＝降交点——《历象考成》官方口径
 * - 月孛＝月亮平远地点（Meeus 平近地点 + 180°）
 * - 紫气＝甲子起寅：1984-02-04 位于黄经 240°，28 回归年一周天，顺行
 * - 十二宫＝回归黄道均分（戌宫起白羊 0°）
 * - 二十八宿＝距星宿钤（Hipparcos J2000 黄经 + 岁差修正至生时，即「回归今宿」）
 * - 立命＝果老日躔起时法（太阳宫起生时支顺移至寅安命，命度照搬日躔度），
 *   安身＝昼生随日度、夜生随月度；真上升点仅作参考注记
 * - 童限＝命度顺行至太阳度，七度折一年；大限＝出限后顺行十二宫，
 *   年数表：财10 兄11 田15 男8 奴7 妻11 疾4 迁5 官4 福5（果老量天尺）
 * - 化曜＝十干横取（甲年禄起火），并配十神
 * - 恩用仇难＝度主五行生克（生我恩/我生用/克我难/我克仇）
 */

import { AstroTime, Body, GeoVector, Ecliptic, Observer, SearchRiseSet, SiderealTime } from "./astronomy/index.js"
import { Solar } from "./lunar/index.js"
import { jieqiRangeAt, type JieqiMoment } from "./jieqi-engine"

/* ============ 类型 ============ */

export type WX = "金" | "木" | "水" | "火" | "土"

export interface QizhengBody {
  key: string
  name: string
  shortName: string
  category: "七政" | "四余"
  wuxing: WX | "日" | "月"
  lon: number
  lonText: string // 宫内度分
  palaceIdx: number // 0=子 … 11=亥
  palaceZhi: string
  palaceDeg: number // 宫内度（十进制）
  mansion: string
  mansionDeg: number
  motion: "顺" | "逆" | "留" | "伏" | "速"
  speed: number
  huayao: string | null
  shishen: string | null // 化曜对应十神
  dignity: "庙" | "陷" | "平"
  role: "恩" | "用" | "仇" | "难" | null
}

export interface QizhengPalace {
  zhi: string
  ci: string
  westName: string
  house: string
  lord: string
  gua: string // 后天卦
  bodies: string[]
  lonStart: number
  suiQian: string // 岁前十二神
  changSheng: string // 长生十二神
  shensha: string[] // 落宫神煞（岁前 + 天乙/文昌/禄神/羊刃/咸池/驿马/华盖/将星/劫煞/亡神）
}

export interface DaxianStep {
  house: string
  palaceZhi: string
  startYear: number // 公历年
  endYear: number
  startAge: number // 虚岁
  years: number
}

export interface StarPattern {
  name: string
  kind: "喜" | "忌"
  desc: string
}

export interface QizhengResult {
  meta: {
    solarText: string
    lunarText: string
    ganzhi: string[]
    yearGan: string
    zodiac: string
    gender: "男" | "女"
    trueSolarNote: string | null
    jieqiPrev: string
    jieqiNext: string
    dayNight: "昼生" | "夜生"
    sunrise: string
    sunset: string
    moonrise: string
    moonset: string
    longitude: number
    latitude: number
  }
  bodies: QizhengBody[]
  palaces: QizhengPalace[]
  /** 立命（真上升点） */
  ming: { zhi: string; ci: string; lord: string; lon: number; palaceDeg: number; mansion: string; mansionDeg: number }
  /** 安身（昼随日/夜随月） */
  shen: { zhi: string; ci: string; lon: number; palaceDeg: number; mansion: string; mansionDeg: number }
  duZhu: { mansion: string; wuxing: WX; note: string }
  enYongChouNan: {
    en: WX; yong: WX; chou: WX; nan: WX; seasonYong: WX; note: string
    /** 宫主恩用仇难（以命宫宫主五行为我） */
    gongEn: WX; gongYong: WX; gongChou: WX; gongNan: WX
  }
  huayaoTable: { yao: string; star: string; shishen: string }[]
  tongxian: { years: number; months: number; days: number; endDate: string; note: string }
  daxian: DaxianStep[]
  patterns: StarPattern[]
  notes: string[]
  /** 二十八宿生时边界（回归今宿，供盘面宿度环） */
  mansionBoundaries: { name: string; start: number; wuxing: WX | "日" | "月"; animal: string }[]
  /** 星曜相位（会合/对照/三合/刑，按黄经角距） */
  aspects: { a: string; b: string; kind: string; angle: number; orb: number }[]
}

export interface QizhengInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: "男" | "女"
  longitude?: number
  latitude?: number
}

/* ============ 常量 ============ */

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]

/** 黄经 0°（春分）起每 30° 一宫：戌酉申未午巳辰卯寅丑子亥 */
const PALACE_BY_LON = ["戌", "酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑", "子", "亥"]

const CI_OF: Record<string, [string, string]> = {
  戌: ["降娄", "白羊"], 酉: ["大梁", "金牛"], 申: ["实沈", "双子"], 未: ["鹑首", "巨蟹"],
  午: ["鹑火", "狮子"], 巳: ["鹑尾", "室女"], 辰: ["寿星", "天秤"], 卯: ["大火", "天蝎"],
  寅: ["析木", "人马"], 丑: ["星纪", "摩羯"], 子: ["玄枵", "宝瓶"], 亥: ["娵訾", "双鱼"],
}

/** 宫支 → 后天八卦（用于盘面内环） */
const GUA_OF: Record<string, string> = {
  子: "坎", 丑: "艮", 寅: "艮", 卯: "震", 辰: "巽", 巳: "巽",
  午: "离", 未: "坤", 申: "坤", 酉: "兑", 戌: "乾", 亥: "乾",
}

const PALACE_LORD: Record<string, string> = {
  午: "太阳", 未: "太阴", 巳: "水星", 申: "水星", 辰: "金星", 酉: "金星",
  卯: "火星", 戌: "火星", 寅: "木星", 亥: "木星", 丑: "土星", 子: "土星",
}

const HOUSES = ["命宫", "财帛", "兄弟", "田宅", "男女", "奴仆", "妻妾", "疾厄", "迁移", "官禄", "福德", "相貌"]

/** 大限年数（果老量天尺，自财帛起）：财10 兄11 田15 男8 奴7 妻11 疾4 迁5 官4 福5 相- */
const DAXIAN_YEARS = [10, 11, 15, 8, 7, 11, 4, 5, 4, 5]

/**
 * 二十八宿距星 J2000 黄经（由 Hipparcos 星表实测生成，scripts/gen-xiu-boundaries.ts）
 * 使用时加岁差修正至生时（回归今宿）。已对竞品锚点校验：井 95.67 / 柳 130.67（2026 年）Δ≤0.01°
 */
const MANSIONS: { name: string; j2000: number; wuxing: WX | "日" | "月"; animal: string }[] = [
  { name: "角", j2000: 203.841, wuxing: "木", animal: "蛟" }, { name: "亢", j2000: 214.494, wuxing: "金", animal: "龙" },
  { name: "氐", j2000: 225.083, wuxing: "土", animal: "貉" }, { name: "房", j2000: 242.94, wuxing: "日", animal: "兔" },
  { name: "心", j2000: 247.8, wuxing: "月", animal: "狐" }, { name: "尾", j2000: 256.156, wuxing: "火", animal: "虎" },
  { name: "箕", j2000: 271.261, wuxing: "水", animal: "豹" }, { name: "斗", j2000: 280.181, wuxing: "木", animal: "獬" },
  { name: "牛", j2000: 304.048, wuxing: "金", animal: "牛" }, { name: "女", j2000: 311.723, wuxing: "土", animal: "蝠" },
  { name: "虚", j2000: 323.395, wuxing: "日", animal: "鼠" }, { name: "危", j2000: 333.352, wuxing: "月", animal: "燕" },
  { name: "室", j2000: 353.486, wuxing: "火", animal: "猪" }, { name: "壁", j2000: 9.156, wuxing: "水", animal: "貐" },
  { name: "奎", j2000: 20.58, wuxing: "木", animal: "狼" }, { name: "娄", j2000: 33.97, wuxing: "金", animal: "狗" },
  { name: "胃", j2000: 46.935, wuxing: "土", animal: "雉" }, { name: "昴", j2000: 59.412, wuxing: "日", animal: "鸡" },
  { name: "毕", j2000: 68.465, wuxing: "月", animal: "乌" }, { name: "觜", j2000: 83.707, wuxing: "火", animal: "猴" },
  { name: "参", j2000: 84.681, wuxing: "水", animal: "猿" }, { name: "井", j2000: 95.302, wuxing: "木", animal: "犴" },
  { name: "鬼", j2000: 125.728, wuxing: "金", animal: "羊" }, { name: "柳", j2000: 130.305, wuxing: "土", animal: "獐" },
  { name: "星", j2000: 147.279, wuxing: "日", animal: "马" }, { name: "张", j2000: 155.691, wuxing: "月", animal: "鹿" },
  { name: "翼", j2000: 173.69, wuxing: "火", animal: "蛇" }, { name: "轸", j2000: 190.726, wuxing: "水", animal: "蚓" },
]

const PRECESSION_PER_YEAR = 0.0139697

/** 化曜十曜序（张果星宗横取，甲年禄起火）+ 对应十神 */
const HUAYAO_NAMES = ["天禄", "天暗", "天福", "天耗", "天荫", "天贵", "天刑", "天印", "天囚", "天权"]
const HUAYAO_STARS = ["火星", "月孛", "木星", "金星", "土星", "太阴", "水星", "紫气", "计都", "罗睺"]
const HUAYAO_SHISHEN: Record<string, string> = {
  天禄: "比肩", 天暗: "劫财", 天福: "食神", 天耗: "伤官", 天荫: "偏才",
  天贵: "正财", 天刑: "七杀", 天印: "正官", 天囚: "枭神", 天权: "印绶",
}

const SHENG: Record<WX, WX> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<WX, WX> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }

const BODY_WX: Record<string, WX | "日" | "月"> = {
  sun: "日", moon: "月", mercury: "水", venus: "金", mars: "火", jupiter: "木", saturn: "土",
  ziqi: "木", yuebei: "水", rahu: "火", jidu: "土",
}

const BODY_DEFS: { key: string; name: string; shortName: string; category: "七政" | "四余" }[] = [
  { key: "sun", name: "太阳", shortName: "日", category: "七政" },
  { key: "moon", name: "太阴", shortName: "月", category: "七政" },
  { key: "mercury", name: "水星", shortName: "水", category: "七政" },
  { key: "venus", name: "金星", shortName: "金", category: "七政" },
  { key: "mars", name: "火星", shortName: "火", category: "七政" },
  { key: "jupiter", name: "木星", shortName: "木", category: "七政" },
  { key: "saturn", name: "土星", shortName: "土", category: "七政" },
  { key: "ziqi", name: "紫气", shortName: "炁", category: "四余" },
  { key: "yuebei", name: "月孛", shortName: "孛", category: "四余" },
  { key: "rahu", name: "罗睺", shortName: "罗", category: "四余" },
  { key: "jidu", name: "计都", shortName: "计", category: "四余" },
]

/** 岁前十二神（自太岁宫顺行） */
const SUI_QIAN = ["太岁", "晦气", "丧门", "贯索", "官符", "小耗", "岁破", "龙德", "白虎", "福德", "吊客", "病符"]

/* 经典神煞（年干/年支起，落宫） */
const TIANYI_GUI: Record<string, string[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"],
  辛: ["午", "寅"],
}
const WENCHANG: Record<string, string> = { 甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" }
const LU_SHEN: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" }
const YANG_REN: Record<string, string> = { 甲: "卯", 乙: "辰", 丙: "午", 丁: "未", 戊: "午", 己: "未", 庚: "酉", 辛: "戌", 壬: "子", 癸: "丑" }
const TAOHUA_OF: Record<string, string> = { 申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" }
const YIMA_OF: Record<string, string> = { 申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" }
const HUAGAI_OF: Record<string, string> = { 申: "辰", 子: "辰", 辰: "辰", 寅: "戌", 午: "戌", 戌: "戌", 巳: "丑", 酉: "丑", 丑: "丑", 亥: "未", 卯: "未", 未: "未" }
const JIANGXING_OF: Record<string, string> = { 申: "子", 子: "子", 辰: "子", 寅: "午", 午: "午", 戌: "午", 巳: "酉", 酉: "酉", 丑: "酉", 亥: "卯", 卯: "卯", 未: "卯" }
const JIESHA_OF: Record<string, string> = { 申: "巳", 子: "巳", 辰: "巳", 寅: "亥", 午: "亥", 戌: "亥", 巳: "寅", 酉: "寅", 丑: "寅", 亥: "申", 卯: "申", 未: "申" }
const WANGSHEN_OF: Record<string, string> = { 申: "亥", 子: "亥", 辰: "亥", 寅: "巳", 午: "巳", 戌: "巳", 巳: "申", 酉: "申", 丑: "申", 亥: "寅", 卯: "寅", 未: "寅" }

/** 按年干支汇总各支神煞 */
function shenshaOf(yearGan: string, yearZhi: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const add = (zhi: string | undefined, name: string) => {
    if (!zhi) return
    const arr = map.get(zhi) ?? []
    arr.push(name)
    map.set(zhi, arr)
  }
  for (const z of TIANYI_GUI[yearGan] ?? []) add(z, "天乙")
  add(WENCHANG[yearGan], "文昌")
  add(LU_SHEN[yearGan], "禄神")
  add(YANG_REN[yearGan], "羊刃")
  add(TAOHUA_OF[yearZhi], "咸池")
  add(YIMA_OF[yearZhi], "驿马")
  add(HUAGAI_OF[yearZhi], "华盖")
  add(JIANGXING_OF[yearZhi], "将星")
  add(JIESHA_OF[yearZhi], "劫煞")
  add(WANGSHEN_OF[yearZhi], "亡神")
  return map
}

/** 长生十二神 */
const CHANG_SHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]

/** 年干 → 长生起宫（五行寄生十二宫：火土起寅顺，木起亥顺，金起巳顺，水起申顺；阳顺阴逆简化取阳干顺行） */
const CHANGSHENG_START: Record<string, number> = {
  甲: 11, 乙: 6, 丙: 2, 丁: 9, 戊: 2, 己: 9, 庚: 5, 辛: 0, 壬: 8, 癸: 3,
}

/* ============ 数学工具 ============ */

const norm = (d: number) => ((d % 360) + 360) % 360

function julianCenturies(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5
  return (jd - 2451545.0) / 36525.0
}

/* ============ 天文计算 ============ */

function planetLon(body: Body, t: AstroTime): number {
  const vec = GeoVector(body, t, true)
  return norm(Ecliptic(vec).elon)
}

function rahuLon(date: Date): number {
  const T = julianCenturies(date)
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000)
}

function yuebeiLon(date: Date): number {
  const T = julianCenturies(date)
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T ** 3 / 80053 + T ** 4 / 18999000
  return norm(perigee + 180)
}

const ZIQI_EPOCH_JD = 2445734.5
const ZIQI_EPOCH_LON = 240.0
const ZIQI_DAILY = 360 / 10227.08

function ziqiLon(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5
  return norm(ZIQI_EPOCH_LON + (jd - ZIQI_EPOCH_JD) * ZIQI_DAILY)
}

function allLons(date: Date): Record<string, number> {
  const t = new AstroTime(date)
  return {
    sun: planetLon(Body.Sun, t),
    moon: planetLon(Body.Moon, t),
    mercury: planetLon(Body.Mercury, t),
    venus: planetLon(Body.Venus, t),
    mars: planetLon(Body.Mars, t),
    jupiter: planetLon(Body.Jupiter, t),
    saturn: planetLon(Body.Saturn, t),
    rahu: rahuLon(date),
    jidu: norm(rahuLon(date) + 180),
    yuebei: yuebeiLon(date),
    ziqi: ziqiLon(date),
  }
}

/** 真上升点（东地平黄道升度，of-date）——供参考注记 */
function ascendantLon(date: Date, longitude: number, latitude: number): number {
  const t = new AstroTime(date)
  const gastHours = SiderealTime(t)
  const ramc = norm(gastHours * 15 + longitude) // 中天赤经（度）
  const T = julianCenturies(date)
  const eps = ((23.4392911 - 0.0130042 * T) * Math.PI) / 180
  const ramcR = (ramc * Math.PI) / 180
  const phiR = (latitude * Math.PI) / 180
  const y = Math.cos(ramcR)
  const x = -(Math.sin(ramcR) * Math.cos(eps) + Math.tan(phiR) * Math.sin(eps))
  const asc = (Math.atan2(y, x) * 180) / Math.PI
  return norm(asc)
}

/**
 * 立命（果老日躔起时法，与竞品一致）：
 * 以太阳所躔宫起生时支，按支序顺移至寅位安命，命度照搬日躔宫内度。
 * 等价公式：命宫黄经 = 太阳黄经 − 30° × ((寅 − 生时支) mod 12)。
 * 已校验：2026-07-03 21:09（亥时）日躔未11.64 → 立命戌11.64（竞品同）。
 */
function mingLonOf(sunLon: number, hourZhiIdx: number): number {
  const shift = (2 - hourZhiIdx + 12) % 12 // 寅=2
  return norm(sunLon - 30 * shift)
}

/** 均时差（分钟，近似式，误差 <0.5 分钟） */
function equationOfTime(month: number, day: number): number {
  const n = Math.floor((month - 1) * 30.6 + day)
  const b = ((360 * (n - 81)) / 365) * (Math.PI / 180)
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}

/* ============ 宿钤与宫位 ============ */

function precessionAt(date: Date): number {
  const years = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 365.25
  return PRECESSION_PER_YEAR * years
}

/** 黄经（of-date）→ 宿 + 宿内度（回归今宿：距星 J2000 + 岁差） */
function mansionOf(lon: number, date: Date): { name: string; degIn: number; wuxing: WX | "日" | "月" } {
  const dp = precessionAt(date)
  // 边界按当日黄经排序查找
  let best = MANSIONS[0]
  let bestDeg = Number.POSITIVE_INFINITY
  for (const m of MANSIONS) {
    const start = norm(m.j2000 + dp)
    const degIn = norm(lon - start)
    if (degIn < bestDeg) {
      bestDeg = degIn
      best = m
    }
  }
  return { name: best.name, degIn: bestDeg, wuxing: best.wuxing }
}

function palaceZhiOf(lon: number): string {
  return PALACE_BY_LON[Math.floor(norm(lon) / 30)]
}

function palaceDegOf(lon: number): number {
  return norm(lon) % 30
}

function lonTextOf(lon: number): string {
  const inPalace = norm(lon) % 30
  const deg = Math.floor(inPalace)
  const min = Math.round((inPalace - deg) * 60)
  return `${deg}°${String(min).padStart(2, "0")}′`
}

/* ============ 迟留伏逆 ============ */

/** 平均日行度（用于「速」判断） */
const MEAN_SPEED: Record<string, number> = {
  sun: 0.9856, moon: 13.176, mercury: 0.9856, venus: 0.9856, mars: 0.524, jupiter: 0.083, saturn: 0.0334,
}

function motionOf(
  key: string,
  sunLon: number,
  lon: number,
  lons1: Record<string, number>,
  lons2: Record<string, number>,
): { motion: "顺" | "逆" | "留" | "伏" | "速"; speed: number } {
  if (key === "rahu" || key === "jidu") return { motion: "逆", speed: -0.053 }
  if (key === "ziqi") return { motion: "顺", speed: ZIQI_DAILY }
  if (key === "yuebei") return { motion: "顺", speed: 0.1114 }
  let d = lons2[key] - lons1[key]
  if (d > 180) d -= 360
  if (d < -180) d += 360
  const speed = d
  if (key !== "sun" && key !== "moon") {
    let gap = Math.abs(norm(lon - sunLon))
    if (gap > 180) gap = 360 - gap
    if (gap < 10 && key !== "mercury" && key !== "venus") return { motion: "伏", speed }
  }
  if (Math.abs(speed) < 0.01) return { motion: "留", speed }
  if (speed < 0) return { motion: "逆", speed }
  const mean = MEAN_SPEED[key]
  if (mean && speed > mean * 1.25) return { motion: "速", speed }
  return { motion: "顺", speed }
}

/* ============ 时间格式 ============ */

function fmtTst(date: Date | null, tstOffsetMin: number): string {
  if (!date) return "--:--"
  const t = new Date(date.getTime() + tstOffsetMin * 60000)
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`
}

/* ============ 星格检测 ============ */

function detectPatterns(bodies: QizhengBody[], mingZhi: string, dayNight: "昼生" | "夜生"): StarPattern[] {
  const byKey = new Map(bodies.map((b) => [b.key, b]))
  const sun = byKey.get("sun")!
  const moon = byKey.get("moon")!
  const mercury = byKey.get("mercury")!
  const venus = byKey.get("venus")!
  const mars = byKey.get("mars")!
  const jupiter = byKey.get("jupiter")!
  const rahu = byKey.get("rahu")!
  const jidu = byKey.get("jidu")!
  const out: StarPattern[] = []

  // 喜格
  const moonAlone = bodies.filter((b) => b.palaceZhi === moon.palaceZhi && b.key !== "moon").length === 0
  if (moonAlone && dayNight === "夜生") out.push({ name: "孤月独明", kind: "喜", desc: "夜生太阴独坐一宫，清光独照，主聪明贵显" })
  if (mercury.palaceZhi === sun.palaceZhi) out.push({ name: "水日会合", kind: "喜", desc: "水星与太阳同宫，文思敏捷，利科名文书" })
  if (mercury.palaceZhi === venus.palaceZhi) out.push({ name: "金水相涵", kind: "喜", desc: "金水同宫相生，主才艺秀发" })
  const mingIdx = ZHI.indexOf(mingZhi)
  const sunAdj = Math.abs(ZHI.indexOf(sun.palaceZhi) - mingIdx) % 12
  const moonAdj = Math.abs(ZHI.indexOf(moon.palaceZhi) - mingIdx) % 12
  if ((sunAdj === 1 || sunAdj === 11) && (moonAdj === 1 || moonAdj === 11) && sun.palaceZhi !== moon.palaceZhi)
    out.push({ name: "日月夹命", kind: "喜", desc: "日月拱夹命宫，主一生多贵人扶持" })
  const enYongTogether = bodies.some((a) => a.role === "恩" && bodies.some((b) => b.role === "用" && b.palaceZhi === a.palaceZhi && b.key !== a.key))
  if (enYongTogether) out.push({ name: "恩用同宫", kind: "喜", desc: "恩星用星同宫相济，主得力处处逢源" })

  // 忌格
  if (sun.palaceZhi === "未") out.push({ name: "日居月位", kind: "忌", desc: "太阳落太阴之垣（未宫），光华受掩" })
  if (moon.palaceZhi === "午") out.push({ name: "月居日位", kind: "忌", desc: "太阴落太阳之垣（午宫），阴阳失序" })
  if (venus.palaceZhi === jupiter.palaceZhi) out.push({ name: "金木同宫", kind: "忌", desc: "金木同宫交战，主决断反复、财木相伐" })
  if (venus.palaceZhi === "午") out.push({ name: "金居日分", kind: "忌", desc: "金星落太阳之垣，金被日熔，主耗损" })
  if (["亥", "子", "申", "巳"].includes(mars.palaceZhi)) out.push({ name: "火居水地", kind: "忌", desc: "火星落水垣，水火相激，主性情起伏" })
  const rahuAdj = (ZHI.indexOf(rahu.palaceZhi) - mingIdx + 12) % 12
  const jiduAdj = (ZHI.indexOf(jidu.palaceZhi) - mingIdx + 12) % 12
  if ((rahuAdj === 1 && jiduAdj === 11) || (rahuAdj === 11 && jiduAdj === 1))
    out.push({ name: "罗计截命", kind: "忌", desc: "罗计两邻夹命，天地二蚀夹拱，行事多阻" })
  const chouNanOnMing = bodies.some((b) => (b.role === "仇" || b.role === "难") && b.palaceZhi === mingZhi)
  if (chouNanOnMing) out.push({ name: "仇难犯命", kind: "忌", desc: "仇难之星坐命宫，主多滞碍，须恩用解救" })

  return out
}

/* ============ 主函数 ============ */

export function computeQizheng(input: QizhengInput): QizhengResult {
  const longitude = input.longitude ?? 116.4
  const latitude = input.latitude ?? 39.9

  // 真太阳时（钟表时 → 地方平太阳时；均时差并入注记，宫度计算用 UT 不受影响）
  const tstOffsetMin = Math.round((longitude - 120) * 4 + equationOfTime(input.month, input.day))
  const trueSolarNote = `真太阳时修正 ${tstOffsetMin >= 0 ? "+" : ""}${tstOffsetMin} 分钟（东经 ${longitude.toFixed(1)}° + 均时差）`

  // UT 时刻（钟表时按东八区折算）
  const local = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour - 8, input.minute))

  // 历法
  const solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0)
  const lunar = solar.getLunar()
  const ganzhi = [lunar.getYearInGanZhiByLiChun(), lunar.getMonthInGanZhiExact(), lunar.getDayInGanZhiExact(), lunar.getTimeInGanZhi()]
  const yearGan = ganzhi[0][0]
  const yearZhi = ganzhi[0][1]
  // 🔴 节气区间按**瞬时**判：lunar.getPrevJieQi() 是按天判的——2026 立春交节在 04:02，
  // 当天 03:00 问它就已答「立春」，而同一时刻月柱(Exact)还是丑月，盘面会自相矛盾。
  const jqRange = jieqiRangeAt(input.year, input.month, input.day, input.hour, input.minute)
  const fmtJq = (jq: JieqiMoment) =>
    `${jq.name} ${String(jq.month).padStart(2, "0")}-${String(jq.day).padStart(2, "0")} ${jq.timeText.slice(0, 5)}`

  // 星曜黄经
  const lons = allLons(local)
  const lons1 = allLons(new Date(local.getTime() - 43200000))
  const lons2 = allLons(new Date(local.getTime() + 43200000))
  const sunLon = lons.sun

  // 日月出没（当地当日，真太阳时显示）
  const observer = new Observer(latitude, longitude, 0)
  const dayStartUt = new Date(Date.UTC(input.year, input.month - 1, input.day, -8, 0))
  const startTime = new AstroTime(dayStartUt)
  const riseSun = SearchRiseSet(Body.Sun, observer, +1, startTime, 1)
  const setSun = SearchRiseSet(Body.Sun, observer, -1, startTime, 1)
  const riseMoon = SearchRiseSet(Body.Moon, observer, +1, startTime, 1)
  const setMoon = SearchRiseSet(Body.Moon, observer, -1, startTime, 1)
  // 转钟表时（东八区）再加 TST 偏移
  const toClock = (t: AstroTime | null) => (t ? new Date(t.date.getTime() + 8 * 3600000) : null)
  const sunrise = fmtTst(toClock(riseSun), tstOffsetMin)
  const sunset = fmtTst(toClock(setSun), tstOffsetMin)
  const moonrise = fmtTst(toClock(riseMoon), tstOffsetMin)
  const moonset = fmtTst(toClock(setMoon), tstOffsetMin)

  // 昼夜生
  const birthMs = local.getTime()
  const dayNight: "昼生" | "夜生" =
    riseSun && setSun && birthMs >= riseSun.date.getTime() && birthMs < setSun.date.getTime() ? "昼生" : "夜生"

  // 化曜表
  const stemIdx = GAN.indexOf(yearGan)
  const huayaoTable = HUAYAO_NAMES.map((yao, i) => ({
    yao,
    star: HUAYAO_STARS[(stemIdx + i) % 10],
    shishen: HUAYAO_SHISHEN[yao],
  }))
  const huayaoByStar = new Map(huayaoTable.map((h) => [h.star, h.yao]))

  // 立命：果老日躔起时法（太阳宫起生时支顺数至卯，命度照搬日躔度）
  const hourZhiIdx = ZHI.indexOf(lunar.getTimeZhi())
  const mingLon = mingLonOf(sunLon, hourZhiIdx)
  const mingZhi = palaceZhiOf(mingLon)
  const mingIdx = ZHI.indexOf(mingZhi)
  const mingMansion = mansionOf(mingLon, local)
  // 真上升点仅作参考注记
  const ascLon = ascendantLon(local, longitude, latitude)

  // 安身：昼生随日、夜生随月
  const shenLon = dayNight === "昼生" ? sunLon : lons.moon
  const shenZhi = palaceZhiOf(shenLon)
  const shenMansion = mansionOf(shenLon, local)

  // 度主（命度所落宿五行）
  let duWx: WX
  if (mingMansion.wuxing === "日") duWx = "火"
  else if (mingMansion.wuxing === "月") duWx = "水"
  else duWx = mingMansion.wuxing

  // 恩用仇难（度主）
  const en = (Object.keys(SHENG) as WX[]).find((w) => SHENG[w] === duWx)!
  const yong = SHENG[duWx]
  const nan = (Object.keys(KE) as WX[]).find((w) => KE[w] === duWx)!
  const chou = KE[duWx]
  // 恩用仇难（宫主）
  const mingLordName = PALACE_LORD[mingZhi]
  const mingLordWxRaw = BODY_WX[BODY_DEFS.find((d) => d.name === mingLordName)!.key]
  const gongWx: WX = mingLordWxRaw === "日" ? "火" : mingLordWxRaw === "月" ? "水" : mingLordWxRaw
  const gongEn = (Object.keys(SHENG) as WX[]).find((w) => SHENG[w] === gongWx)!
  const gongYong = SHENG[gongWx]
  const gongNan = (Object.keys(KE) as WX[]).find((w) => KE[w] === gongWx)!
  const gongChou = KE[gongWx]

  const mon = lunar.getMonth()
  const seasonYong: WX = [1, 2].includes(Math.abs(mon)) ? "木" : [4, 5].includes(Math.abs(mon)) ? "火" : [7, 8].includes(Math.abs(mon)) ? "金" : [10, 11].includes(Math.abs(mon)) ? "水" : "土"

  const roleOf = (wx: WX | "日" | "月"): "恩" | "用" | "仇" | "难" | null => {
    const w: WX = wx === "日" ? "火" : wx === "月" ? "水" : wx
    if (w === en) return "恩"
    if (w === yong) return "用"
    if (w === chou) return "仇"
    if (w === nan) return "难"
    return null
  }

  // 星曜明细
  const bodies: QizhengBody[] = BODY_DEFS.map((def) => {
    const lon = lons[def.key]
    const palaceZhi = palaceZhiOf(lon)
    const m = mansionOf(lon, local)
    const { motion, speed } = motionOf(def.key, sunLon, lon, lons1, lons2)
    const lordPalace = PALACE_LORD[palaceZhi]
    const dignity: "庙" | "陷" | "平" =
      lordPalace === def.name ? "庙"
      : PALACE_LORD[ZHI[(ZHI.indexOf(palaceZhi) + 6) % 12]] === def.name ? "陷"
      : "平"
    const huayao = huayaoByStar.get(def.name) ?? null
    return {
      key: def.key,
      name: def.name,
      shortName: def.shortName,
      category: def.category,
      wuxing: BODY_WX[def.key],
      lon,
      lonText: lonTextOf(lon),
      palaceIdx: ZHI.indexOf(palaceZhi),
      palaceZhi,
      palaceDeg: palaceDegOf(lon),
      mansion: m.name,
      mansionDeg: m.degIn,
      motion,
      speed,
      huayao,
      shishen: def.key === "sun" ? "催官" : huayao ? HUAYAO_SHISHEN[huayao] : null,
      dignity,
      role: roleOf(BODY_WX[def.key]),
    }
  })

  // 神煞：岁前十二神（自太岁宫顺行）、长生十二神（年干起长生顺行）、经典神煞落宫
  const suiIdx = ZHI.indexOf(yearZhi)
  const csStart = CHANGSHENG_START[yearGan] ?? 11
  const suiQianOf = (zhi: string) => SUI_QIAN[(ZHI.indexOf(zhi) - suiIdx + 12) % 12]
  const changShengOf = (zhi: string) => CHANG_SHENG[(ZHI.indexOf(zhi) - csStart + 12) % 12]
  const shenshaMap = shenshaOf(yearGan, yearZhi)

  // 十二宫
  const palaces: QizhengPalace[] = ZHI.map((zhi, idx) => {
    const houseOffset = (mingIdx - idx + 12) % 12
    return {
      zhi,
      ci: CI_OF[zhi][0],
      westName: CI_OF[zhi][1],
      house: HOUSES[houseOffset],
      lord: PALACE_LORD[zhi],
      gua: GUA_OF[zhi],
      bodies: bodies.filter((b) => b.palaceZhi === zhi).map((b) => b.key),
      lonStart: PALACE_BY_LON.indexOf(zhi) * 30,
      suiQian: suiQianOf(zhi),
      changSheng: changShengOf(zhi),
      shensha: [suiQianOf(zhi), ...(shenshaMap.get(zhi) ?? [])],
    }
  })

  // 童限：命度顺行至太阳度，七度折一年
  const tongxianDeg = norm(sunLon - mingLon)
  const tongxianYearsF = tongxianDeg / 7
  const txYears = Math.floor(tongxianYearsF)
  const txMonthsF = (tongxianYearsF - txYears) * 12
  const txMonths = Math.floor(txMonthsF)
  const txDays = Math.round((txMonthsF - txMonths) * 30)
  const endDateMs = Date.UTC(input.year, input.month - 1, input.day) + tongxianYearsF * 365.2425 * 86400000
  const endD = new Date(endDateMs)
  const tongxianEnd = `${endD.getUTCFullYear()}-${String(endD.getUTCMonth() + 1).padStart(2, "0")}-${String(endD.getUTCDate()).padStart(2, "0")}`

  // 大限：出限后自财帛宫起（顺 HOUSES 序），量天尺年数
  const daxian: DaxianStep[] = []
  {
    // 命宫限（含童限）
    const mingLimitYears = Math.ceil(tongxianYearsF)
    daxian.push({
      house: "命宫（童限）",
      palaceZhi: mingZhi,
      startYear: input.year,
      endYear: input.year + mingLimitYears,
      startAge: 1,
      years: mingLimitYears,
    })
    let cursorYear = input.year + mingLimitYears
    let cursorAge = mingLimitYears + 1
    for (let i = 0; i < DAXIAN_YEARS.length; i++) {
      const house = HOUSES[i + 1] // 财帛起
      const palaceZhi = ZHI[(mingIdx - (i + 1) + 24) % 12]
      const years = DAXIAN_YEARS[i]
      daxian.push({ house, palaceZhi, startYear: cursorYear, endYear: cursorYear + years, startAge: cursorAge, years })
      cursorYear += years
      cursorAge += years
    }
  }

  // 星格
  const patterns = detectPatterns(bodies, mingZhi, dayNight)

  // 备注
  const notes: string[] = []
  const mingLordBody = bodies.find((b) => b.name === mingLordName)
  if (mingLordBody) {
    notes.push(`命主${mingLordName}落${mingLordBody.palaceZhi}宫（${CI_OF[mingLordBody.palaceZhi][0]}）${mingLordBody.mansion}宿，${mingLordBody.motion}行${mingLordBody.dignity !== "平" ? `、${mingLordBody.dignity}` : ""}${mingLordBody.huayao ? `，化${mingLordBody.huayao.slice(1)}` : ""}。`)
  }
  const enStars = bodies.filter((b) => b.role === "恩").map((b) => b.name)
  const yongStars = bodies.filter((b) => b.role === "用").map((b) => b.name)
  if (enStars.length) notes.push(`恩星：${enStars.join("、")}；用星：${yongStars.join("、")}。恩用得地则贵，落陷遇仇难则滞。`)
  const nixing = bodies.filter((b) => b.motion === "逆" && b.category === "七政").map((b) => b.name)
  if (nixing.length) notes.push(`${nixing.join("、")}逆行，所主之事多迂回反复。`)

  return {
    meta: {
      solarText: `${input.year}年${input.month}月${input.day}日 ${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
      lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
      ganzhi,
      yearGan,
      zodiac: lunar.getYearShengXiaoByLiChun(),
      gender: input.gender,
      trueSolarNote,
      jieqiPrev: fmtJq(jqRange.prev),
      jieqiNext: fmtJq(jqRange.next),
      dayNight,
      sunrise,
      sunset,
      moonrise,
      moonset,
      longitude,
      latitude,
    },
    bodies,
    palaces,
    ming: {
      zhi: mingZhi, ci: CI_OF[mingZhi][0], lord: mingLordName,
      lon: mingLon, palaceDeg: palaceDegOf(mingLon), mansion: mingMansion.name, mansionDeg: mingMansion.degIn,
    },
    shen: {
      zhi: shenZhi, ci: CI_OF[shenZhi][0],
      lon: shenLon, palaceDeg: palaceDegOf(shenLon), mansion: shenMansion.name, mansionDeg: shenMansion.degIn,
    },
    duZhu: { mansion: mingMansion.name, wuxing: duWx, note: `命度${mingMansion.name}宿${mingMansion.degIn.toFixed(2)}度（${mingMansion.wuxing}），度主五行属${duWx}` },
    enYongChouNan: {
      en, yong, chou, nan, seasonYong,
      gongEn, gongYong, gongChou, gongNan,
      note: `度主${duWx}：生我${en}恩、我生${yong}用、克我${nan}难、我克${chou}仇；宫主${gongWx}：恩${gongEn} 用${gongYong} 仇${gongChou} 难${gongNan}；四季用神：${seasonYong}。`,
    },
    huayaoTable,
    tongxian: {
      years: txYears, months: txMonths, days: txDays, endDate: tongxianEnd,
      note: `童限${txYears}年${txMonths}个月${txDays}天，${tongxianEnd} 出限（命度顺行至太阳度，七度折一年）`,
    },
    daxian,
    patterns,
    notes,
    mansionBoundaries: mansionBoundaries(local),
    aspects: computeAspects(bodies),
  }
}

/** 星曜相位：会合(0°±6) 对照(180°±6) 三合(120°±5) 刑(90°±4) */
function computeAspects(bodies: QizhengBody[]): { a: string; b: string; kind: string; angle: number; orb: number }[] {
  const defs: [string, number, number][] = [["会合", 0, 6], ["刑", 90, 4], ["三合", 120, 5], ["对照", 180, 6]]
  const out: { a: string; b: string; kind: string; angle: number; orb: number }[] = []
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      let d = Math.abs(bodies[i].lon - bodies[j].lon)
      if (d > 180) d = 360 - d
      for (const [kind, target, orb] of defs) {
        const diff = Math.abs(d - target)
        if (diff <= orb) {
          out.push({ a: bodies[i].name, b: bodies[j].name, kind, angle: Math.round(d * 100) / 100, orb: Math.round(diff * 100) / 100 })
          break
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb)
}

/** 二十八宿当日边界（供盘面绘制宿度环） */
export function mansionBoundaries(date: Date): { name: string; start: number; wuxing: WX | "日" | "月"; animal: string }[] {
  const dp = precessionAt(date)
  return MANSIONS.map((m) => ({ name: m.name, start: norm(m.j2000 + dp), wuxing: m.wuxing, animal: m.animal }))
}
