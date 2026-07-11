/**
 * 小成图排盘引擎（霍斐然先生体系）
 *
 * 排盘规则（已对照竞品黄金基准逐宫验证）：
 * 1. 起卦（七种）：时间起卦以农历——
 *    上卦 =（年支数+月数+日数）÷8 取余；下卦 = 再加时支数 ÷8 取余；动爻 = ÷6 取余
 *    先天卦序：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8（余0作8）
 * 2. 洛书九宫地盘固定：坎1 坤2 震3 巽4 中5 乾6 兑7 艮8 离9
 * 3. 布卦：本卦上卦→离9、下卦→坎1；变卦上卦→震3、下卦→兑7；
 *    本卦上互→巽4、下互→坤2；变卦上互→艮8、下互→乾6
 * 4. 中宫归藏：逐爻相对，同性得阴、异性得阳。
 *    四正归藏 = 归藏(归藏(9,1), 归藏(3,7))；
 *    正隅归藏 = 归藏(四正结果, 归藏(归藏(4,2), 归藏(8,6)))
 * 5. 卦气升降：乾震艮离主升↑，坤巽兑坎主降↓。
 *    天盘（布入卦）与地盘（宫卦）配合成四式：
 *    天降地升=向心、天升地降=离心、皆升=外引、皆降=内引
 * 6. 宫位象意：天盘卦（上）叠地盘宫卦（下）成六爻卦，取其卦名象意
 *
 * 黄金基准（竞品实测 2026-07-02 16:45 时间起卦）：
 * 农历五月十八申时，四柱 丙午/甲午/丁丑/戊申，
 * (午7+5+18)=30%8=6坎上，+申9=39%8=7艮下 → 本卦水山蹇；
 * 39%6=3 三爻动 → 变卦水地比；震3宫天盘坎+地盘震=水雷屯；
 * 神煞 驿马亥/桃花午/日禄午/贵人亥酉
 */

import { Solar } from "./lunar/index.js"
import { BAGUA_LINES, BAGUA_WX, GUACI, HEX_NAMES } from "./meihua-data"

// ─── 基础常量 ───

export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const

/** 先天卦序：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8 */
export const XIANTIAN_ORDER = ["", "乾", "兑", "离", "震", "巽", "坎", "艮", "坤"] as const

/** 卦气升降：乾震艮离主升，坤巽兑坎主降 */
const RISING = new Set(["乾", "震", "艮", "离"])

/** 洛书九宫地盘（宫数→卦） */
const LUOSHU_GONG: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 6: "乾", 7: "兑", 8: "艮", 9: "离",
}

/** 后天九宫位上的先天卦（先天八卦方位图对应） */
const XIANTIAN_AT: Record<number, string> = {
  1: "坤", 2: "巽", 3: "离", 4: "兑", 6: "艮", 7: "坎", 8: "震", 9: "乾",
}

/** 宫位地支 */
const GONG_DIZHI: Record<number, string> = {
  1: "子", 2: "未申", 3: "卯", 4: "辰巳", 6: "戌亥", 7: "酉", 8: "丑寅", 9: "午",
}

/** 河图数（按宫位方位五行） */
const HETU_NUM: Record<number, string> = {
  1: "1、6", 2: "5、10", 3: "3、8", 4: "3、8", 6: "4、9", 7: "4、9", 8: "5、10", 9: "2、7",
}

// ─── 类型 ───

export type XctCastMethod = "manual" | "yao" | "guaming" | "number1" | "number2" | "time" | "auto"
export type ZhongGongMethod = "sizheng" | "zhengyu"

export interface XctOptions {
  date: Date
  method: XctCastMethod
  zhonggong: ZhongGongMethod
  topic?: string
  /** manual/guaming：先天卦数 1-8 与动爻 1-6 */
  upper?: number
  lower?: number
  dong?: number
  /** yao：六爻（自下而上，true=阳） */
  lines?: boolean[]
  /** number1/number2：数字 */
  num1?: number
  num2?: number
  num3?: number
}

export interface XctPalace {
  /** 洛书宫数 */
  luoshu: number
  /** 地盘宫卦 */
  diGua: string
  /** 天盘（布入）卦；中宫为归藏卦 */
  tianGua: string
  /** 布入来源说明 */
  source: string
  /** 天盘升降 */
  tianRising: boolean
  /** 地盘升降 */
  diRising: boolean
  /** 四式 */
  pattern: string
  /** 天盘叠地盘成卦 */
  hexName: string
  /** 象意 */
  guaci: string
  /** 先天宫 */
  xiantianGong: string
  /** 取数：洛书/先天/河图 */
  numbers: string
  /** 宫位地支 */
  dizhi: string
}

export interface XctResult {
  topic: string
  dateLabel: string
  lunarLabel: string
  jieqiRange: string
  methodLabel: string
  zhonggongLabel: string
  pillars: { year: string; month: string; day: string; time: string }
  /** 各柱空亡 */
  kongWang: { year: string; month: string; day: string; time: string }
  shenSha: { name: string; zhi: string }[]
  /** 本卦/变卦：六爻自下而上 */
  benGua: { name: string; lines: boolean[]; upper: string; lower: string }
  bianGua: { name: string; lines: boolean[]; upper: string; lower: string }
  dongYao: number
  /** 九宫（按 4,9,2 / 3,5,7 / 8,1,6 顺序展示，中宫在 index 4） */
  palaces: XctPalace[]
  /** 中宫归藏卦 */
  zhongGua: string
  /** 起卦算式说明 */
  castDetail: string[]
  /** 白话总断 */
  summary: string[]
}

// ─── 工具 ───

const zi = (z: string) => ZHI.indexOf(z as (typeof ZHI)[number])

/** 先天数取卦（余0作8） */
const guaByNum = (n: number) => XIANTIAN_ORDER[((n - 1) % 8 + 8) % 8 + 1]

/** 卦→先天数 */
const numOfGua = (g: string) => XIANTIAN_ORDER.indexOf(g as (typeof XIANTIAN_ORDER)[number])

/** 三爻（自下而上）→ 卦名 */
function guaOfLines(l: boolean[]): string {
  for (const [name, ls] of Object.entries(BAGUA_LINES)) {
    if (ls[0] === l[0] && ls[1] === l[1] && ls[2] === l[2]) return name
  }
  return "坤"
}

/** 六爻名（上卦先天数×下卦先天数 → HEX_NAMES[upper][lower]） */
function hexNameOf(upper: string, lower: string): string {
  return HEX_NAMES[numOfGua(upper)][numOfGua(lower)]
}

/** 归藏：同性得阴、异性得阳（逐爻） */
export function guiCang(a: string, b: string): string {
  const la = BAGUA_LINES[a]
  const lb = BAGUA_LINES[b]
  return guaOfLines([la[0] !== lb[0], la[1] !== lb[1], la[2] !== lb[2]])
}

/** 旬空 */
function xunKongOf(gz: string): string {
  const g = GAN.indexOf(gz[0] as (typeof GAN)[number])
  const z = zi(gz[1])
  const xunStart = ((z - g) % 12 + 12) % 12
  return `${ZHI[(xunStart + 10) % 12]}${ZHI[(xunStart + 11) % 12]}`
}

// ─── 神煞（以日柱起） ───

function shenShaOf(dayGan: string, dayZhi: string): { name: string; zhi: string }[] {
  const yiMa: Record<string, string> = {
    申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申",
    巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳",
  }
  const taoHua: Record<string, string> = {
    申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯",
    巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子",
  }
  const riLu: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" }
  const guiRen: Record<string, string> = { 甲: "丑未", 戊: "丑未", 庚: "丑未", 乙: "子申", 己: "子申", 丙: "亥酉", 丁: "亥酉", 壬: "卯巳", 癸: "卯巳", 辛: "午寅" }
  return [
    { name: "驿马", zhi: yiMa[dayZhi] },
    { name: "桃花", zhi: taoHua[dayZhi] },
    { name: "日禄", zhi: riLu[dayGan] },
    { name: "贵人", zhi: guiRen[dayGan] },
  ]
}

// ─── 主引擎 ───

export function paiXiaoChengTu(opts: XctOptions): XctResult {
  const d = opts.date
  const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0)
  const lunar = solar.getLunar()

  const yearGZ = lunar.getYearInGanZhiByLiChun()
  const monthGZ = lunar.getMonthInGanZhiExact()
  const dayGZ = lunar.getDayInGanZhiExact()
  const timeGZ = lunar.getTimeInGanZhi()

  // ── 起卦 ──
  let upperN: number
  let lowerN: number
  let dong: number
  const castDetail: string[] = []
  const rnd = (n: number) => Math.floor(Math.random() * n)

  const lunarMonth = Math.abs(lunar.getMonth())
  const lunarDay = lunar.getDay()
  const yearZhiNum = zi(yearGZ[1]) + 1
  const timeZhiNum = zi(timeGZ[1]) + 1

  switch (opts.method) {
    case "time": {
      const s1 = yearZhiNum + lunarMonth + lunarDay
      const s2 = s1 + timeZhiNum
      upperN = ((s1 - 1) % 8) + 1
      lowerN = ((s2 - 1) % 8) + 1
      dong = ((s2 - 1) % 6) + 1
      castDetail.push(`上卦：年支${yearGZ[1]}${yearZhiNum} + 月${lunarMonth} + 日${lunarDay} = ${s1}，除8余${s1 % 8 || 8} → ${guaByNum(upperN)}`)
      castDetail.push(`下卦：${s1} + 时支${timeGZ[1]}${timeZhiNum} = ${s2}，除8余${s2 % 8 || 8} → ${guaByNum(lowerN)}`)
      castDetail.push(`动爻：${s2} 除6余${s2 % 6 || 6} → ${((s2 - 1) % 6) + 1}爻动`)
      break
    }
    case "number1": {
      const n1 = opts.num1 ?? 1
      const n2 = opts.num2 ?? 1
      upperN = ((n1 - 1) % 8) + 1
      lowerN = ((n2 - 1) % 8) + 1
      const s = n1 + n2
      dong = ((s - 1) % 6) + 1
      castDetail.push(`上卦：${n1} 除8余${n1 % 8 || 8} → ${guaByNum(upperN)}；下卦：${n2} 除8余${n2 % 8 || 8} → ${guaByNum(lowerN)}`)
      castDetail.push(`动爻：${n1}+${n2}=${s} 除6余${s % 6 || 6} → ${dong}爻动`)
      break
    }
    case "number2": {
      const n1 = opts.num1 ?? 1
      const n2 = opts.num2 ?? 1
      const n3 = opts.num3 ?? 1
      upperN = ((n1 - 1) % 8) + 1
      lowerN = ((n2 - 1) % 8) + 1
      dong = ((n3 - 1) % 6) + 1
      castDetail.push(`上卦：${n1} → ${guaByNum(upperN)}；下卦：${n2} → ${guaByNum(lowerN)}；动爻：${n3} 除6余${n3 % 6 || 6} → ${dong}爻动`)
      break
    }
    case "manual":
    case "guaming": {
      upperN = opts.upper ?? 1
      lowerN = opts.lower ?? 1
      dong = opts.dong ?? 1
      castDetail.push(`指定：上卦${guaByNum(upperN)}、下卦${guaByNum(lowerN)}、${dong}爻动`)
      break
    }
    case "yao": {
      const ls = opts.lines ?? Array.from({ length: 6 }, () => Math.random() < 0.5)
      upperN = numOfGua(guaOfLines(ls.slice(3, 6)))
      lowerN = numOfGua(guaOfLines(ls.slice(0, 3)))
      dong = opts.dong ?? rnd(6) + 1
      castDetail.push(`摇卦成象：上卦${guaByNum(upperN)}、下卦${guaByNum(lowerN)}、${dong}爻动`)
      break
    }
    default: {
      upperN = rnd(8) + 1
      lowerN = rnd(8) + 1
      dong = rnd(6) + 1
      castDetail.push(`自动起卦：上卦${guaByNum(upperN)}、下卦${guaByNum(lowerN)}、${dong}爻动`)
    }
  }

  const upperGua = guaByNum(upperN)
  const lowerGua = guaByNum(lowerN)
  const benLines = [...BAGUA_LINES[lowerGua], ...BAGUA_LINES[upperGua]]
  const bianLines = benLines.map((v, i) => (i === dong - 1 ? !v : v))
  const bianLower = guaOfLines(bianLines.slice(0, 3))
  const bianUpper = guaOfLines(bianLines.slice(3, 6))

  const benName = hexNameOf(upperGua, lowerGua)
  const bianName = hexNameOf(bianUpper, bianLower)

  // ── 互卦 ──
  const benShangHu = guaOfLines(benLines.slice(2, 5))
  const benXiaHu = guaOfLines(benLines.slice(1, 4))
  const bianShangHu = guaOfLines(bianLines.slice(2, 5))
  const bianXiaHu = guaOfLines(bianLines.slice(1, 4))

  // ── 九宫布卦 ──
  const placement: Record<number, { gua: string; source: string }> = {
    9: { gua: upperGua, source: "本卦上卦" },
    1: { gua: lowerGua, source: "本卦下卦" },
    3: { gua: bianUpper, source: "变卦上卦" },
    7: { gua: bianLower, source: "变卦下卦" },
    4: { gua: benShangHu, source: "本卦上互" },
    2: { gua: benXiaHu, source: "本卦下互" },
    8: { gua: bianShangHu, source: "变卦上互" },
    6: { gua: bianXiaHu, source: "变卦下互" },
  }

  // ── 中宫归藏 ──
  const gzBen = guiCang(placement[9].gua, placement[1].gua)
  const gzBian = guiCang(placement[3].gua, placement[7].gua)
  const siZheng = guiCang(gzBen, gzBian)
  const gzHuBen = guiCang(placement[4].gua, placement[2].gua)
  const gzHuBian = guiCang(placement[8].gua, placement[6].gua)
  const zhengYu = guiCang(siZheng, guiCang(gzHuBen, gzHuBian))
  const zhongGua = opts.zhonggong === "sizheng" ? siZheng : zhengYu

  // ── 九宫展示（4,9,2 / 3,5,7 / 8,1,6） ──
  const gongOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6]
  const patternOf = (tianUp: boolean, diUp: boolean) =>
    !tianUp && diUp ? "向心式" : tianUp && !diUp ? "离心式" : tianUp && diUp ? "外引式" : "内引式"

  const palaces: XctPalace[] = gongOrder.map((n) => {
    if (n === 5) {
      const rising = RISING.has(zhongGua)
      return {
        luoshu: 5, diGua: "中", tianGua: zhongGua,
        source: opts.zhonggong === "sizheng" ? "四正归藏" : "正隅归藏",
        tianRising: rising, diRising: false,
        pattern: "统摄全盘",
        hexName: "", guaci: "中宫为全局枢纽，统摄八方，观其卦气知事之总纲。",
        xiantianGong: "", numbers: "5、10", dizhi: "",
      }
    }
    const { gua, source } = placement[n]
    const diGua = LUOSHU_GONG[n]
    const tUp = RISING.has(gua)
    const dUp = RISING.has(diGua)
    const hex = hexNameOf(gua, diGua)
    return {
      luoshu: n, diGua, tianGua: gua, source,
      tianRising: tUp, diRising: dUp,
      pattern: patternOf(tUp, dUp),
      hexName: hex,
      guaci: GUACI[hex] ?? "",
      xiantianGong: XIANTIAN_AT[n],
      numbers: `${n}、${numOfGua(diGua)}、${HETU_NUM[n].split("、")[1]}`,
      dizhi: GONG_DIZHI[n],
    }
  })

  // ── 白话总断 ──
  const summary: string[] = []
  summary.push(`本卦${benName}，${dong}爻动，变卦${bianName}。${GUACI[benName] ?? ""}`)
  summary.push(`事之趋向看变卦：${GUACI[bianName] ?? ""}`)
  const zhongRising = RISING.has(zhongGua)
  summary.push(
    `中宫归藏得${zhongGua}卦（${BAGUA_WX[zhongGua]}），卦气主${zhongRising ? "升" : "降"}：${
      zhongRising ? "全局有向上生发之机，事在推进之中，宜顺势而为。" : "全局呈收敛沉降之势，事宜稳守蓄力、不宜冒进。"
    }`,
  )
  const xiangXin = palaces.filter((p) => p.pattern === "向心式").length
  const liXin = palaces.filter((p) => p.pattern === "离心式").length
  if (xiangXin >= 3) summary.push(`盘中${xiangXin}宫呈向心式（天降地升），气聚于内，主事有归拢、可成之象。`)
  else if (liXin >= 3) summary.push(`盘中${liXin}宫呈离心式（天升地降），气散于外，主事有分离、变动之象。`)

  // ── 节气区间 ──
  const prevJq = lunar.getPrevJieQi(true)
  const nextJq = lunar.getNextJieQi(true)
  const fmtJq = (jq: { getName: () => string; getSolar: () => { toYmdHms: () => string } } | null) => {
    if (!jq) return ""
    const s = jq.getSolar().toYmdHms()
    return `${jq.getName()}${s.slice(0, 16).replace(/-/g, ".")}`
  }

  const methodLabels: Record<XctCastMethod, string> = {
    manual: "手动指定", yao: "在线摇卦", guaming: "卦名起卦",
    number1: "数字起卦1", number2: "数字起卦2", time: "时间起卦", auto: "自动起卦",
  }

  return {
    topic: opts.topic || "",
    dateLabel: `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    lunarLabel: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    jieqiRange: `${fmtJq(prevJq)} ~ ${fmtJq(nextJq)}`,
    methodLabel: methodLabels[opts.method],
    zhonggongLabel: opts.zhonggong === "sizheng" ? "四正归藏" : "正隅归藏",
    pillars: { year: yearGZ, month: monthGZ, day: dayGZ, time: timeGZ },
    kongWang: {
      year: xunKongOf(yearGZ), month: xunKongOf(monthGZ), day: xunKongOf(dayGZ), time: xunKongOf(timeGZ),
    },
    shenSha: shenShaOf(dayGZ[0], dayGZ[1]),
    benGua: { name: benName, lines: benLines, upper: upperGua, lower: lowerGua },
    bianGua: { name: bianName, lines: bianLines, upper: bianUpper, lower: bianLower },
    dongYao: dong,
    palaces,
    zhongGua,
    castDetail,
    summary,
  }
}
