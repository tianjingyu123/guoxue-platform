/**
 * 金口诀排课引擎（大六壬金口诀 / 孙膑预测法）
 *
 * 排课流程（已对照竞品黄金基准逐步验证）：
 * 1. 四柱：lunar-typescript 精确取（年柱立春换年、月柱交节换月）
 * 2. 月将：交节法=月建六合；中气法=太阳过宫（雨水登明亥起）
 * 3. 地分：来人方位/报数/随机 → 十二支
 * 4. 将神：月将加时 —— 将神 = 月将 + (地分 - 时支)
 * 5. 贵神：日干起天乙贵人（两派口诀），昼夜之分，
 *    贵人临亥子丑寅卯辰顺布、临巳午未申酉戌逆布十二天将至地分，
 *    所乘天将之本家支即贵神
 * 6. 人元：五子元遁日干得地分之遁干；神干/贵干同法
 * 7. 取用：三阳一阴取阴爻、三阴一阳取阳爻、二阴二阳取将神、
 *    纯阴课反取阳（将神）、纯阳课反取阴（贵神）
 *
 * 黄金基准（竞品实测 2025-09-29 10:49 地分子）：
 * 四柱 乙巳/乙酉/辛丑/癸巳，月将辰，人元戊，贵神戊戌(天空)，
 * 将神己亥(登明)，用爻=将神，日空辰巳，四大空亡亥子壬癸，妻动+贼动
 */

import { Solar } from "./lunar/index.js"

// ─── 基础常量 ───

export const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const

const GAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
}
const ZHI_WUXING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
}
/** 地支阴阳（体阴阳：子寅辰午申戌为阳） */
const ZHI_YANG = new Set(["子", "寅", "辰", "午", "申", "戌"])
const GAN_YANG = new Set(["甲", "丙", "戊", "庚", "壬"])

/** 五行生克 */
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }

/** 十二月将名（配地支） */
export const YUEJIANG_NAME: Record<string, string> = {
  亥: "登明", 戌: "河魁", 酉: "从魁", 申: "传送", 未: "小吉", 午: "胜光",
  巳: "太乙", 辰: "天罡", 卯: "太冲", 寅: "功曹", 丑: "大吉", 子: "神后",
}

/** 十二天将（贵神）序 + 本家支 */
export const TIANJIANG = [
  { name: "贵人", zhi: "丑" }, { name: "螣蛇", zhi: "巳" }, { name: "朱雀", zhi: "午" },
  { name: "六合", zhi: "卯" }, { name: "勾陈", zhi: "辰" }, { name: "青龙", zhi: "寅" },
  { name: "天空", zhi: "戌" }, { name: "白虎", zhi: "申" }, { name: "太常", zhi: "未" },
  { name: "玄武", zhi: "子" }, { name: "太阴", zhi: "酉" }, { name: "天后", zhi: "亥" },
] as const

// ─── 贵人口诀（两派） ───

/** 甲戊庚牛羊派：[昼贵, 夜贵] */
const GUIREN_A: Record<string, [string, string]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"],
  辛: ["午", "寅"],
}
/** 甲羊戊庚牛派 */
const GUIREN_B: Record<string, [string, string]> = {
  甲: ["未", "丑"],
  戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["申", "子"], 己: ["申", "子"],
  丙: ["酉", "亥"], 丁: ["酉", "亥"],
  壬: ["巳", "卯"], 癸: ["巳", "卯"],
  辛: ["寅", "午"],
}

// ─── 类型 ───

export type DifenMethod = "manual" | "number" | "random"

export interface JkjOptions {
  /** 起课时间 */
  date: Date
  /** 地分（manual 直接给支；number 给报数；random 忽略） */
  difenMethod: DifenMethod
  difenZhi?: string
  difenNumber?: number
  /** 换将方式：jie=交节（月建六合） zhong=中气（太阳过宫） */
  jiangMethod: "jie" | "zhong"
  /** 贵人口诀：A=甲戊庚牛羊 B=甲羊戊庚牛 */
  guirenSchool: "A" | "B"
  /** 贵神昼夜：auto=卯酉区分 day=白天 night=夜晚 */
  guiType: "auto" | "day" | "night"
  /** 事项（选填） */
  topic?: string
}

export interface JkjPosition {
  /** 位名：人元/贵神/将神/地分 */
  role: string
  /** 干或支 */
  char: string
  /** 遁干（贵神/将神带） */
  gan?: string
  /** 天将名/月将名 */
  starName?: string
  wuxing: string
  yinyang: "+" | "-"
  /** 月令旺衰 */
  wangShuai: string
  /** 是否用爻 */
  isYong: boolean
  /** 是否空亡（旬空） */
  isXunKong: boolean
  /** 是否四大空亡 */
  isSiDaKong: boolean
}

export interface JkjResult {
  topic: string
  dateLabel: string
  lunarLabel: string
  jieqiRange: string
  pillars: { year: string; month: string; day: string; time: string }
  yuejiang: { zhi: string; name: string; method: string }
  difen: { zhi: string; method: string }
  xunKong: [string, string]
  siDaKong: string
  positions: [JkjPosition, JkjPosition, JkjPosition, JkjPosition]
  /** 动爻列表 */
  dongYao: { name: string; desc: string; positions: string }[]
  /** 课体列表 */
  keTi: { name: string; desc: string; luck: "auspicious" | "inauspicious" | "neutral" }[]
  /** 四位神煞 */
  shenSha: Record<string, string[]>
  /** 白话总断 */
  summary: string[]
  /** 用爻位名 */
  yongRole: string
}

// ─── 工具 ───

const zi = (z: string) => ZHI.indexOf(z as (typeof ZHI)[number])
const gi = (g: string) => GAN.indexOf(g as (typeof GAN)[number])
const zAt = (i: number) => ZHI[((i % 12) + 12) % 12]

/** 五子元遁：由日干得某支上的遁干 */
export function wuziDun(dayGan: string, targetZhi: string): string {
  // 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
  const startGan: Record<string, number> = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 }
  const s = startGan[dayGan]
  const steps = zi(targetZhi) // 从子数到目标支
  return GAN[(s + steps) % 10]
}

/** 月令旺衰：旺相休囚死 */
export function wangShuaiOf(wx: string, monthZhi: string): string {
  const m = ZHI_WUXING[monthZhi]
  if (wx === m) return "旺"
  if (SHENG[m] === wx) return "相"
  if (SHENG[wx] === m) return "休"
  if (KE[wx] === m) return "囚"
  return "死"
}

/** 旬空：由日柱定旬中空亡二支 */
export function xunKongOf(dayGZ: string): [string, string] {
  const g = gi(dayGZ[0])
  const z = zi(dayGZ[1])
  // 旬首支 = 支 - 干偏移
  const xunStart = ((z - g) % 12 + 12) % 12
  return [zAt(xunStart + 10), zAt(xunStart + 11)]
}

/** 四大空亡：甲子甲午旬水绝（亥子壬癸）；甲寅甲申旬金绝（申酉庚辛） */
export function siDaKongOf(dayGZ: string): string {
  const g = gi(dayGZ[0])
  const z = zi(dayGZ[1])
  const xunStart = ((z - g) % 12 + 12) % 12
  if (xunStart === 0 || xunStart === 6) return "亥子壬癸"
  if (xunStart === 2 || xunStart === 8) return "申酉庚辛"
  return ""
}

/** 交节法月将：月建六合 */
const LIUHE: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
}

/** 中气法月将：雨水登明亥起，每中气退一位 */
const ZHONGQI_JIANG: [string, string][] = [
  ["雨水", "亥"], ["春分", "戌"], ["谷雨", "酉"], ["小满", "申"], ["夏至", "未"], ["大暑", "午"],
  ["处暑", "巳"], ["秋分", "辰"], ["霜降", "卯"], ["小雪", "寅"], ["冬至", "丑"], ["大寒", "子"],
]

// ─── 神煞 ───

/** 驿马：申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳（以日支起） */
function yiMa(dayZhi: string): string {
  const m: Record<string, string> = {
    申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申",
    巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳",
  }
  return m[dayZhi]
}
/** 桃花：申子辰在酉，寅午戌在卯，巳酉丑在午，亥卯未在子 */
function taoHua(dayZhi: string): string {
  const m: Record<string, string> = {
    申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯",
    巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子",
  }
  return m[dayZhi]
}
/** 日禄：甲禄寅乙禄卯…… */
function riLu(dayGan: string): string {
  const m: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" }
  return m[dayGan]
}
/** 羊刃：甲刃卯…… */
function yangRen(dayGan: string): string {
  const m: Record<string, string> = { 甲: "卯", 乙: "寅", 丙: "午", 丁: "巳", 戊: "午", 己: "巳", 庚: "酉", 辛: "申", 壬: "子", 癸: "亥" }
  return m[dayGan]
}
/** 月德贵人（按月支三合取干）：寅午戌月在丙，申子辰月在壬，亥卯未月在甲，巳酉丑月在庚 */
function yueDe(monthZhi: string): string {
  const m: Record<string, string> = {
    寅: "丙", 午: "丙", 戌: "丙", 申: "壬", 子: "壬", 辰: "壬",
    亥: "甲", 卯: "甲", 未: "甲", 巳: "庚", 酉: "庚", 丑: "庚",
  }
  return m[monthZhi]
}
/** 天医（以月支起，前一位） */
function tianYi(monthZhi: string): string {
  return zAt(zi(monthZhi) - 1)
}

// ─── 主引擎 ───

export function paiJinKouJue(opts: JkjOptions): JkjResult {
  const d = opts.date
  const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0)
  const lunar = solar.getLunar()

  const yearGZ = lunar.getYearInGanZhiByLiChun()
  const monthGZ = lunar.getMonthInGanZhiExact()
  const dayGZ = lunar.getDayInGanZhiExact()
  const timeGZ = lunar.getTimeInGanZhi()

  const dayGan = dayGZ[0]
  const dayZhi = dayGZ[1]
  const monthZhi = monthGZ[1]
  const timeZhi = timeGZ[1]

  // ── 月将 ──
  let yuejiangZhi: string
  if (opts.jiangMethod === "jie") {
    yuejiangZhi = LIUHE[monthZhi]
  } else {
    // 中气法：找最近一个已过的中气
    const table = lunar.getJieQiTable()
    let best: { name: string; time: number } | null = null
    for (const [name, jiang] of ZHONGQI_JIANG) {
      void jiang
      const s = table[name]
      if (!s) continue
      const t = new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute()).getTime()
      if (t <= d.getTime() && (!best || t > best.time)) best = { name, time: t }
    }
    // 若年内无已过中气（年初大寒前），取上一年大寒 → 子
    let jiangZhi = "子"
    if (best) {
      const found = ZHONGQI_JIANG.find(([n]) => n === best!.name)
      if (found) jiangZhi = found[1]
    }
    yuejiangZhi = jiangZhi
  }

  // ── 地分 ──
  let difenZhi: string
  if (opts.difenMethod === "manual" && opts.difenZhi) {
    difenZhi = opts.difenZhi
  } else if (opts.difenMethod === "number" && opts.difenNumber != null) {
    difenZhi = zAt((opts.difenNumber - 1) % 12)
  } else {
    difenZhi = zAt(Math.floor(Math.random() * 12))
  }

  // ── 将神：月将加时 ──
  const jiangShenZhi = zAt(zi(yuejiangZhi) + zi(difenZhi) - zi(timeZhi))

  // ── 贵神 ──
  const school = opts.guirenSchool === "A" ? GUIREN_A : GUIREN_B
  const [dayGui, nightGui] = school[dayGan]
  let isDay: boolean
  if (opts.guiType === "day") isDay = true
  else if (opts.guiType === "night") isDay = false
  else {
    // 卯酉区分：卯时至申时为昼
    const t = zi(timeZhi)
    isDay = t >= 3 && t <= 8
  }
  const guiRenZhi = isDay ? dayGui : nightGui
  // 布贵方向：贵人临亥子丑寅卯辰顺布，巳午未申酉戌逆布
  const guiIdx = zi(guiRenZhi)
  const forward = guiIdx >= 11 || guiIdx <= 4 // 亥(11) 子(0) 丑(1) 寅(2) 卯(3) 辰(4)
  const steps = forward
    ? (zi(difenZhi) - guiIdx + 12) % 12
    : (guiIdx - zi(difenZhi) + 12) % 12
  const tianJiang = TIANJIANG[steps % 12]
  const guiShenZhi = tianJiang.zhi

  // ── 人元 / 神干 / 贵干（五子元遁） ──
  const renYuan = wuziDun(dayGan, difenZhi)
  const shenGan = wuziDun(dayGan, jiangShenZhi)
  const guiGan = wuziDun(dayGan, guiShenZhi)

  // ── 空亡 ──
  const xunKong = xunKongOf(dayGZ)
  const siDaKong = siDaKongOf(dayGZ)
  const isKong = (z: string) => xunKong.includes(z)
  const isSDK = (z: string) => siDaKong.includes(z)

  // ── 四位 ──
  const mkPos = (
    role: string, char: string, gan: string | undefined, starName: string | undefined, isZhi: boolean,
  ): JkjPosition => {
    const wx = isZhi ? ZHI_WUXING[char] : GAN_WUXING[char]
    const yy = isZhi ? (ZHI_YANG.has(char) ? "+" : "-") : GAN_YANG.has(char) ? "+" : "-"
    return {
      role, char, gan, starName, wuxing: wx,
      yinyang: yy as "+" | "-",
      wangShuai: wangShuaiOf(wx, monthZhi),
      isYong: false,
      isXunKong: isZhi ? isKong(char) : false,
      isSiDaKong: isZhi ? isSDK(char) : siDaKong.includes(char),
    }
  }

  const pRen = mkPos("人元", renYuan, undefined, undefined, false)
  const pGui = mkPos("贵神", guiShenZhi, guiGan, tianJiang.name, true)
  const pJiang = mkPos("将神", jiangShenZhi, shenGan, YUEJIANG_NAME[jiangShenZhi], true)
  const pDi = mkPos("地分", difenZhi, undefined, undefined, true)

  // ── 取用爻 ──
  // 数三支一干的阴阳（干用干阴阳，支用体阴阳）
  const flags = [
    { p: pRen, yang: pRen.yinyang === "+" },
    { p: pGui, yang: pGui.yinyang === "+" },
    { p: pJiang, yang: pJiang.yinyang === "+" },
    { p: pDi, yang: pDi.yinyang === "+" },
  ]
  const yangCount = flags.filter((f) => f.yang).length
  let yong: JkjPosition
  if (yangCount === 3) {
    yong = flags.find((f) => !f.yang)!.p // 三阳一阴取阴
  } else if (yangCount === 1) {
    yong = flags.find((f) => f.yang)!.p // 三阴一阳取阳
  } else if (yangCount === 4) {
    yong = pGui // 纯阳反取阴（贵神为内）
  } else if (yangCount === 0) {
    yong = pJiang // 纯阴反取阳（将神为动）
  } else {
    yong = pJiang // 二阴二阳取将神
  }
  yong.isYong = true

  // ── 动爻（五动） ──
  const dongYao: JkjResult["dongYao"] = []
  const kes = (a: JkjPosition, b: JkjPosition) => KE[a.wuxing] === b.wuxing
  if (kes(pRen, pDi)) dongYao.push({ name: "妻动", desc: "干克方：主妻妾、子女、财物之事有变；防官财损折、访人不遇。", positions: "人元克地分" })
  if (kes(pGui, pJiang)) dongYao.push({ name: "贼动", desc: "神克将：主阴私不明、盗贼遗失、婚姻第三者；谋望难成。", positions: "贵神克将神" })
  if (kes(pDi, pRen)) dongYao.push({ name: "鬼动", desc: "方克干（下克上）：主小人犯上、内部生变；官非口舌自下而起。", positions: "地分克人元" })
  if (kes(pJiang, pGui)) dongYao.push({ name: "财动", desc: "将克神：主财物流动、以下谋上；求财有机但费周折。", positions: "将神克贵神" })
  if (kes(pRen, pJiang)) dongYao.push({ name: "妻动（干克将）", desc: "干克将：问子孙后代、妻女之事；常人损财忧病。", positions: "人元克将神" })
  if (kes(pGui, pDi)) dongYao.push({ name: "贼动（神克方）", desc: "神克方：主事成缓、隔手求财晚成；办事有阻隔。", positions: "贵神克地分" })

  // ── 课体识别 ──
  const keTi: JkjResult["keTi"] = []
  const zhis = [pGui.char, pJiang.char, pDi.char]
  // 空亡课
  if (zhis.some(isKong) || (siDaKong && zhis.some(isSDK))) {
    keTi.push({ name: "空亡课", desc: "课内见空亡，主虚假不实、吉凶不成：吉事不喜、凶事不凶，求谋落空。", luck: "inauspicious" })
  }
  // 纯阴纯阳
  if (yangCount === 4) keTi.push({ name: "纯阳课", desc: "四位皆阳，事阳事速、宜动中求；反取阴爻为用。", luck: "neutral" })
  if (yangCount === 0) keTi.push({ name: "纯阴课", desc: "四位皆阴，事阴事缓、多暗昧私密；反取阳爻为用。", luck: "neutral" })
  // 四位相生（循环相生或逐位相生）
  const shengs = (a: JkjPosition, b: JkjPosition) => SHENG[a.wuxing] === b.wuxing
  if (
    (shengs(pRen, pGui) || pRen.wuxing === pGui.wuxing) &&
    (shengs(pGui, pJiang) || pGui.wuxing === pJiang.wuxing) &&
    (shengs(pJiang, pDi) || pJiang.wuxing === pDi.wuxing)
  ) {
    keTi.push({ name: "四位相生课", desc: "上下递生，百事皆吉，谋望遂意，贵人相助。", luck: "auspicious" })
  }
  // 伏吟：将神与地分同支
  if (pJiang.char === pDi.char) keTi.push({ name: "伏吟课", desc: "将神伏于地分，事多迁延反复、宜静不宜动。", luck: "neutral" })
  // 反吟：将神与地分对冲
  if ((zi(pJiang.char) + 6) % 12 === zi(pDi.char)) {
    keTi.push({ name: "反吟课", desc: "将神与地分对冲，主动荡不安、事有反复变化。", luck: "inauspicious" })
  }
  // 关隔锁
  if (kes(pRen, pGui)) keTi.push({ name: "关（干克神）", desc: "人元克贵神，上下阻隔，贵人之力受制，求人办事多一层关卡。", luck: "inauspicious" })
  if (kes(pJiang, pDi)) keTi.push({ name: "隔（将克方）", desc: "将神克地分，中途受阻，事体隔手、进展迟滞。", luck: "inauspicious" })
  // 锁：四位连环相克（人元→贵神→将神→地分 或反向逐位克）
  if (kes(pRen, pGui) && kes(pGui, pJiang) && kes(pJiang, pDi)) {
    keTi.push({ name: "锁（连环克）", desc: "四位自上而下连环相克，处处受制，谋望必阻，宜守不宜进。", luck: "inauspicious" })
  }
  // 四比同类
  if (pRen.wuxing === pGui.wuxing) keTi.push({ name: "干神相比", desc: "人元与贵神五行相同为比：求事在外、关联自己；防外来骗取钱财。", luck: "neutral" })
  if (pDi.wuxing === pJiang.wuxing) keTi.push({ name: "方将相比（远比）", desc: "地分与将神五行相同为远比：应在下辈下级之间，有受排挤之象。", luck: "neutral" })

  // ── 神煞 ──
  const shenSha: Record<string, string[]> = { 人元: [], 贵神: [], 将神: [], 地分: [] }
  const zhiPos: [string, JkjPosition][] = [["贵神", pGui], ["将神", pJiang], ["地分", pDi]]
  const ym = yiMa(dayZhi)
  const th = taoHua(dayZhi)
  const lu = riLu(dayGan)
  const ren = yangRen(dayGan)
  const ty = tianYi(monthZhi)
  for (const [role, p] of zhiPos) {
    if (p.char === ym) shenSha[role].push("驿马")
    if (p.char === th) shenSha[role].push("桃花")
    if (p.char === lu) shenSha[role].push("日禄")
    if (p.char === ren) shenSha[role].push("羊刃")
    if (p.char === ty) shenSha[role].push("天医")
    if ([dayGui, nightGui].includes(p.char)) shenSha[role].push("天乙贵人")
    if (p.isXunKong) shenSha[role].push("旬空")
    if (p.isSiDaKong) shenSha[role].push("四大空亡")
  }
  if (yueDe(monthZhi) === renYuan) shenSha["人元"].push("月德")

  // ── 白话总断 ──
  const summary: string[] = []
  summary.push(
    `本课以${yong.role}${yong.char}为用爻（${yangCount === 3 ? "三阳一阴取阴" : yangCount === 1 ? "三阴一阳取阳" : yangCount === 2 ? "二阴二阳取将神" : yangCount === 4 ? "纯阳课反取阴" : "纯阴课反取阳"}），五行属${yong.wuxing}，月令${yong.wangShuai}。`,
  )
  if (yong.isXunKong || yong.isSiDaKong) {
    summary.push("用爻落空亡，所问之事根基不实：吉不成吉、凶不成凶，短期内多为空谈，宜过旬（或出空）后再谋。")
  } else if (yong.wangShuai === "旺" || yong.wangShuai === "相") {
    summary.push("用爻得令有气，所谋之事有推进之力，把握时机可成。")
  } else {
    summary.push("用爻失令无气，事体力量不足，宜借势而行、不宜强求速成。")
  }
  if (dongYao.length === 0) {
    summary.push("四位安静无克战，事态平稳，按部就班即可。")
  } else {
    summary.push(`课内${dongYao.map((v) => v.name).join("、")}：${dongYao[0].desc.split("：")[1] ?? ""}`)
  }
  const auspicious = keTi.filter((k) => k.luck === "auspicious").length
  const inausp = keTi.filter((k) => k.luck === "inauspicious").length
  if (auspicious > 0 && inausp === 0) summary.push("课体呈吉，整体顺遂，可积极进取。")
  else if (inausp > 0) summary.push("课体见阻滞之象，凡事多留余地、稳中求进。")

  // ── 节气区间 ──
  const table = lunar.getJieQiTable()
  const prevJq = lunar.getPrevJieQi(true)
  const nextJq = lunar.getNextJieQi(true)
  const fmtJq = (jq: { getName: () => string; getSolar: () => { toYmdHms: () => string } } | null) => {
    if (!jq) return ""
    const s = jq.getSolar().toYmdHms()
    return `${jq.getName()}${s.slice(0, 16).replace(/-/g, ".")}`
  }
  void table
  const jieqiRange = `${fmtJq(prevJq)} ~ ${fmtJq(nextJq)}`

  return {
    topic: opts.topic || "",
    dateLabel: `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日 ${d.getHours()}时${d.getMinutes()}分`,
    lunarLabel: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    jieqiRange,
    pillars: { year: yearGZ, month: monthGZ, day: dayGZ, time: timeGZ },
    yuejiang: { zhi: yuejiangZhi, name: YUEJIANG_NAME[yuejiangZhi], method: opts.jiangMethod === "jie" ? "交节" : "中气" },
    difen: { zhi: difenZhi, method: opts.difenMethod === "manual" ? "自选" : opts.difenMethod === "number" ? "报数" : "随机" },
    xunKong,
    siDaKong,
    positions: [pRen, pGui, pJiang, pDi],
    dongYao,
    keTi,
    shenSha,
    summary,
    yongRole: yong.role,
  }
}
