/**
 * ⚠️ 本文件是**全平台唯一**的排盘算法真源（2026-07-14 由 apps/mobile 迁入）。
 *
 * 迁入原因：此前 C 端用前端引擎、admin 用 apps/server 的 tool-registry/calculators，
 * 两套算法实测结果大面积不同（奇门局数/值符/值使、大六壬月将全错），
 * 出现「管理员与用户看到不同的盘」。现统一到这里，前后端共用一套。
 *
 * 🔴 改动本文件必须跑：pnpm --filter @guoxue/mobile verify（14 套黄金测试 + 前后端一致性）
 */
// ─── 时家奇门遁甲真实排盘引擎 ───
// 定局（拆补/茅山/置闰/自选）→ 地盘三奇六仪 → 旬首值符值使 → 天盘（转盘/飞盘）
// → 八门 → 八神/九神 → 暗干 → 马星/空亡/入墓/击刑/门迫
// 复用 lib/ganzhi.ts（节气校准四柱）与 lib/jieqi.ts（太阳黄经节气）

import { fourPillars, GANS, ZHIS, dayGanzhi, type FourPillars } from "./ganzhi"
import { getJieqiRange, findTerm } from "./jieqi"

// ─── 基础常量 ───
/** 洛书环形宫序（转盘用）：坎1→艮8→震3→巽4→离9→坤2→兑7→乾6 */
export const RING_PALACES = [1, 8, 3, 4, 9, 2, 7, 6]
/** 3×3 显示顺序：巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6 */
export const GRID_PALACES = [4, 9, 2, 3, 5, 7, 8, 1, 6]
export const PALACE_NAMES = ["", "坎1宫", "坤2宫", "震3宫", "巽4宫", "中5宫", "乾6宫", "兑7宫", "艮8宫", "离9宫"]

/** 九星原始宫位（1蓬 2芮 3冲 4辅 5禽 6心 7柱 8任 9英） */
const PALACE_STAR = ["", "天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"]
/** 八门原始宫位（1休 2死 3伤 4杜 6开 7惊 8生 9景；5 无门） */
const PALACE_MEN = ["", "休门", "死门", "伤门", "杜门", "", "开门", "惊门", "生门", "景门"]
/** 转盘九星环形序（不含禽，禽随芮） */
const STAR_RING = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心"]
/** 转盘八门环形序 */
const MEN_RING = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"]
/** 转盘八神（阳顺阴逆） */
const SHEN_8 = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"]
/** 飞盘九神（依洛书飞布；序经竞品黄金测试逐值验证） */
const SHEN_9 = ["值符", "螣蛇", "太阴", "六合", "勾陈", "太常", "朱雀", "九地", "九天"]
/** 飞盘九门（含中门，序=原宫序：1休2死3伤4杜5中6开7惊8生9景） */
const MEN_FLY = ["休门", "死门", "伤门", "杜门", "中门", "开门", "惊门", "生门", "景门"]
/** 飞盘九星飞布序（含禽） */
const STAR_FLY = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"]

/** 三奇六仪布局序：戊己庚辛壬癸丁丙乙 */
const YIQI = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"]

/** 六十甲子旬首 → 遁干/空亡 */
const XUN_INFO = [
  { name: "甲子", yi: "戊", kong: "戌亥" },
  { name: "甲戌", yi: "己", kong: "申酉" },
  { name: "甲申", yi: "庚", kong: "午未" },
  { name: "甲午", yi: "辛", kong: "辰巳" },
  { name: "甲辰", yi: "壬", kong: "寅卯" },
  { name: "甲寅", yi: "癸", kong: "子丑" },
]

/** 宫位对应地支（外盘） */
export const PALACE_DIZHI: Record<number, string[]> = {
  1: ["子"], 2: ["未", "申"], 3: ["卯"], 4: ["辰", "巳"], 5: [],
  6: ["戌", "亥"], 7: ["酉"], 8: ["丑", "寅"], 9: ["午"],
}

/** 二十四节气定局表 [上元, 中元, 下元]；冬至→芒种为阳遁，夏至→大雪为阴遁 */
const JU_TABLE: Record<string, { yang: boolean; ju: [number, number, number] }> = {
  冬至: { yang: true, ju: [1, 7, 4] }, 小寒: { yang: true, ju: [2, 8, 5] }, 大寒: { yang: true, ju: [3, 9, 6] },
  立春: { yang: true, ju: [8, 5, 2] }, 雨水: { yang: true, ju: [9, 6, 3] }, 惊蛰: { yang: true, ju: [1, 7, 4] },
  春分: { yang: true, ju: [3, 9, 6] }, 清明: { yang: true, ju: [4, 1, 7] }, 谷雨: { yang: true, ju: [5, 2, 8] },
  立夏: { yang: true, ju: [4, 1, 7] }, 小满: { yang: true, ju: [5, 2, 8] }, 芒种: { yang: true, ju: [6, 3, 9] },
  夏至: { yang: false, ju: [9, 3, 6] }, 小暑: { yang: false, ju: [8, 2, 5] }, 大暑: { yang: false, ju: [7, 1, 4] },
  立秋: { yang: false, ju: [2, 5, 8] }, 处暑: { yang: false, ju: [1, 4, 7] }, 白露: { yang: false, ju: [9, 3, 6] },
  秋分: { yang: false, ju: [7, 1, 4] }, 寒露: { yang: false, ju: [6, 9, 3] }, 霜降: { yang: false, ju: [5, 8, 2] },
  立冬: { yang: false, ju: [6, 9, 3] }, 小雪: { yang: false, ju: [5, 8, 2] }, 大雪: { yang: false, ju: [4, 7, 1] },
}
const YUAN_NAMES = ["上元", "中元", "下元"]

// ─── 类型 ───
export interface QimenOptions {
  /** 排盘方式：zhuan=转盘 fei=飞盘 */
  panMethod?: "zhuan" | "fei"
  /** 飞盘飞法：yinyang=阴阳皆顺 shunni=阳顺阴逆 */
  flyMethod?: "yinyang" | "shunni"
  /** 定局方式 */
  startMethod?: "zhirun" | "chaibu" | "maoshan" | "custom"
  /** 自选局，如 "阳遁3局" */
  customJu?: string
  /** 暗干起法：dipan=门地盘起 zhishi=值使门起 */
  anganMethod?: "dipan" | "zhishi"
}

export interface QimenPalace {
  palace: number
  /** 八神/九神 */
  shen: string
  /** 天盘星（禽随芮时为 "天芮"，禽在 star2） */
  star: string
  star2?: string
  /** 八门 */
  men: string
  /** 天盘干（星携带干，显示于右上；值符宫可能双干） */
  tianGan: string
  tianGan2?: string
  /** 飞干（飞盘左侧大字：地盘干整体飞时辰步数；转盘为空） */
  feiGan: string
  /** 地盘干（右下） */
  diGan: string
  /** 暗干 */
  anGan: string
  /** 地盘九神（飞盘「地盘九神」切换显示；转盘为空） */
  diShen: string
  /** 长生状态：右上干/右下干对本宫地支 */
  csTian: string
  csDi: string
  isZhifu: boolean
  isZhishi: boolean
  /** 入墓的干 */
  ruMu: string[]
  /** 击刑的干 */
  jiXing: string[]
  /** 刑+墓 */
  xingMu: string[]
  /** 门迫 */
  menPo: boolean
  /** 时空（时柱空亡落此宫） */
  kongWang: boolean
  /** 马星落此宫 */
  maXing: boolean
}

export interface QimenResult {
  sizhu: FourPillars
  ju: { isYang: boolean; num: number; yuan: string; label: string }
  xunshou: { name: string; yi: string; kong: string }
  zhifu: { star: string; palace: number }
  zhishi: { men: string; palace: number }
  /** 马星地支 */
  maXing: string
  /** 四柱空亡 [年,月,日,时] */
  kongwang: { zhi: string; label: string }[]
  palaces: Record<number, QimenPalace>
}

// ─── 定局 ───
/** 拆补法：以日柱符头（甲/己日）的日支定元 */
function chaibuYuan(y: number, m: number, d: number): number {
  const dp = dayGanzhi(y, m, d)
  const ganIdx = GANS.indexOf(dp.gan)
  const daysSinceFutou = ganIdx % 5 // 甲(0)/己(5)为符头
  // 符头日支
  const futouZhiIdx = (ZHIS.indexOf(dp.zhi) - daysSinceFutou + 12) % 12
  const fz = ZHIS[futouZhiIdx]
  if (["子", "午", "卯", "酉"].includes(fz)) return 0 // 上元
  if (["寅", "申", "巳", "亥"].includes(fz)) return 1 // 中元
  return 2 // 下元（辰戌丑未）
}

/** 钟面读数按北京时间解释为绝对时刻（沙箱UTC坑防御，任何设备时区一致） */
const bjMs = (d: Date) =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - 8 * 3600000

/** 茅山法：按入节气后天数直接分元（1-5上/6-10中/11-15下，循环） */
function maoshanYuan(date: Date): { termName: string; yuan: number } {
  const { prev } = getJieqiRange(date)
  const days = Math.floor((bjMs(date) - prev.date.getTime()) / 86400000)
  return { termName: prev.name, yuan: Math.floor((days % 15) / 5) }
}

/** 置闰法：以上元符头（甲己+子午卯酉日）定节气与元，超神接气，芒种/大雪置闰 */
function zhirunJu(date: Date): { termName: string; yuan: number } {
  // 找最近一个上元符头日（含当日）
  const y = date.getFullYear()
  let futou: Date | null = null
  for (let i = 0; i < 16; i++) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - i)
    const dp = dayGanzhi(d.getFullYear(), d.getMonth() + 1, d.getDate())
    if (["甲", "己"].includes(dp.gan) && ["子", "午", "卯", "酉"].includes(dp.zhi)) {
      futou = d
      break
    }
  }
  if (!futou) return maoshanYuan(date) // 兜底（理论上 15 日内必有）
  const daysSince = Math.floor((date.getTime() - futou.getTime()) / 86400000)
  const yuan = Math.min(Math.floor(daysSince / 5), 2)
  // 符头对应节气：取距符头 ±9 日内最近的节气
  let best: { name: string; diff: number } | null = null
  const names = Object.keys(JU_TABLE)
  for (const yy of [y - 1, y, y + 1]) {
    for (const name of names) {
      const t = findTerm(yy, name)
      const diff = Math.abs(t.getTime() - bjMs(futou)) / 86400000
      if (diff <= 9.5 && (!best || diff < best.diff)) best = { name, diff }
    }
  }
  if (best) return { termName: best.name, yuan }
  // 无节气命中 = 闰局（芒种/大雪前重复上一节气）
  const { prev } = getJieqiRange(futou)
  return { termName: prev.name, yuan }
}

/** 定局主函数 */
export function determineJu(
  date: Date,
  startMethod: "zhirun" | "chaibu" | "maoshan" | "custom" = "chaibu",
  customJu?: string,
): { isYang: boolean; num: number; yuan: string; label: string } {
  if (startMethod === "custom" && customJu) {
    const m = customJu.match(/(阳遁|阴遁)(\d)局/)
    if (m) {
      const isYang = m[1] === "阳遁"
      return { isYang, num: Number(m[2]), yuan: "自选", label: `${m[1]}${m[2]}局` }
    }
  }
  let termName: string
  let yuan: number
  if (startMethod === "maoshan") {
    const resolved = maoshanYuan(date)
    termName = resolved.termName
    yuan = resolved.yuan
  } else if (startMethod === "zhirun") {
    const resolved = zhirunJu(date)
    termName = resolved.termName
    yuan = resolved.yuan
  } else {
    // 拆补：节气用当前节气，元用日柱符头
    termName = getJieqiRange(date).prev.name
    yuan = chaibuYuan(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }
  const entry = JU_TABLE[termName] || JU_TABLE["冬至"]
  const num = entry.ju[yuan]
  return {
    isYang: entry.yang,
    num,
    yuan: YUAN_NAMES[yuan],
    label: `${entry.yang ? "阳遁" : "阴遁"}${num}局`,
  }
}

// ─── 排盘辅助 ───
/** 地盘三奇六仪：阳遁顺布/阴遁逆布 */
function buildDipan(juNum: number, isYang: boolean): Record<number, string> {
  const dipan: Record<number, string> = {}
  for (let i = 0; i < 9; i++) {
    const palace = isYang ? ((juNum - 1 + i) % 9) + 1 : ((juNum - 1 - i + 18) % 9) + 1
    dipan[palace] = YIQI[i]
  }
  return dipan
}

/** 旬首：由时柱干支索引求 */
function getXunshou(hourGan: string, hourZhi: string) {
  const gi = GANS.indexOf(hourGan as (typeof GANS)[number])
  const zi = ZHIS.indexOf(hourZhi as (typeof ZHIS)[number])
  // 六十甲子序
  let idx = -1
  for (let i = 0; i < 60; i++) {
    if (i % 10 === gi && i % 12 === zi) {
      idx = i
      break
    }
  }
  const xun = Math.floor(idx / 10)
  return { ...XUN_INFO[xun], hourIdxInXun: idx % 10 }
}

/** 找某干在地盘的宫位（中5寄坤2） */
function findGanPalace(dipan: Record<number, string>, gan: string): number {
  for (let p = 1; p <= 9; p++) if (dipan[p] === gan) return p === 5 ? 2 : p
  return 2
}

/** 洛书飞宫：从 start 起顺/逆飞 n 步（含中5） */
function flyPalace(start: number, steps: number, forward: boolean): number {
  if (forward) return ((start - 1 + steps) % 9) + 1
  return ((start - 1 - steps) % 9 + 9) % 9 + 1
}

/** 马星：时支三合 */
function getMaXing(hourZhi: string): string {
  const MAP: Record<string, string> = {
    申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申",
    巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳",
  }
  return MAP[hourZhi] || ""
}

/** 十干入墓宫：坤2(甲癸墓未) 乾6(乙丙戊墓戌) 艮8(丁己庚墓丑) 巽4(辛壬墓辰) */
const MU_PALACE: Record<number, string[]> = {
  2: ["甲", "癸"], 6: ["乙", "丙", "戊"], 8: ["丁", "己", "庚"], 4: ["辛", "壬"],
}
/** 六仪击刑：戊刑震3 己刑坤2 庚刑艮8 辛刑离9 壬刑巽4 癸刑巽4 */
const JIXING_PALACE: Record<string, number> = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 }

// ─── 十二长生（阳干顺行/阴干逆行，火土同宫；经竞品黄金测试9宫逐值验证） ───
const CS_STATES = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
const CS_SHORT: Record<string, string> = {
  长生: "生", 沐浴: "沐", 冠带: "冠", 临官: "临", 帝旺: "旺",
  衰: "衰", 病: "病", 死: "死", 墓: "墓", 绝: "绝", 胎: "胎", 养: "养",
}
/** 十干长生起支（甲亥 乙午 丙戊寅 丁己酉 庚巳 辛子 壬申 癸卯） */
const CS_START: Record<string, string> = {
  甲: "亥", 乙: "午", 丙: "寅", 丁: "酉", 戊: "寅", 己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯",
}
const YANG_GANS = ["甲", "丙", "戊", "庚", "壬"]

/** 干对支的长生状态（全称） */
export function changShengState(gan: string, zhi: string): string {
  const start = CS_START[gan]
  if (!start) return ""
  const si = ZHIS.indexOf(start as (typeof ZHIS)[number])
  const zi = ZHIS.indexOf(zhi as (typeof ZHIS)[number])
  const forward = YANG_GANS.includes(gan)
  const idx = forward ? (zi - si + 12) % 12 : (si - zi + 12) % 12
  return CS_STATES[idx]
}

/** 干对宫位的长生短标（多支连写，按十二长生环形升序；经竞品验证） */
export function changShengLabel(gan: string, palace: number): string {
  const zhis = PALACE_DIZHI[palace] || []
  if (!zhis.length || !gan) return ""
  const states = zhis.map((z) => changShengState(gan, z)).filter(Boolean)
  if (states.length <= 1) return states.map((s) => CS_SHORT[s]).join("")
  // 相邻两状态按环形升序（如 养(11)→生(0)）
  const [a, b] = states
  const ia = CS_STATES.indexOf(a)
  const ib = CS_STATES.indexOf(b)
  const ordered = (ia + 1) % 12 === ib ? [a, b] : [b, a]
  return ordered.map((s) => CS_SHORT[s]).join("")
}

/** 门迫：门克宫 */
function isMenPo(men: string, palace: number): boolean {
  if (!men) return false
  if (men === "休门") return palace === 9 // 水克火
  if (men === "生门" || men === "死门") return palace === 1 // 土克水
  if (men === "伤门" || men === "杜门") return palace === 2 || palace === 8 || palace === 5 // 木克土(含中5土宫)
  if (men === "景门") return palace === 6 || palace === 7 // 火克金
  if (men === "惊门" || men === "开门") return palace === 3 || palace === 4 // 金克木
  return false
}

// ─── 主排盘函数 ───
export function computeQimen(date: Date, options: QimenOptions = {}): QimenResult {
  const { panMethod = "zhuan", flyMethod = "yinyang", startMethod = "chaibu", customJu, anganMethod = "zhishi" } = options
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  // 四柱（时家奇门用时柱起局）
  const sizhu = fourPillars(y, m, d, hour, minute)

  // 定局
  const ju = determineJu(date, startMethod, customJu)
  const { isYang, num: juNum } = ju

  // 地盘
  const dipan = buildDipan(juNum, isYang)

  // 旬首/值符/值使
  const xun = getXunshou(sizhu.hour.gan, sizhu.hour.zhi)
  const xunPalaceRaw = (() => {
    for (let p = 1; p <= 9; p++) if (dipan[p] === xun.yi) return p
    return 5
  })()
  const zhifuStar = PALACE_STAR[xunPalaceRaw === 5 ? 5 : xunPalaceRaw] // 旬首原宫之星
  const zhishiMen = xunPalaceRaw === 5 ? "死门" : PALACE_MEN[xunPalaceRaw] // 中宫值使寄死门

  // 时干落宫（甲用旬首仪）
  const shiGan = sizhu.hour.gan === "甲" ? xun.yi : sizhu.hour.gan
  const shiGanPalace = findGanPalace(dipan, shiGan)

  // 值使门落宫：从旬首宫起飞宫数至当前时辰
  // 转盘：阳顺阴逆，且门不入中宫（寄坤2）；飞盘：按飞宫方式，可入中宫
  const zhishiPalace = (() => {
    const forward = panMethod === "fei" && flyMethod === "yinyang" ? true : isYang
    let p = flyPalace(xunPalaceRaw, xun.hourIdxInXun, forward)
    if (panMethod === "zhuan" && p === 5) p = 2
    return p
  })()

  // ─── 天盘星/干排布 ───
  // palaceStar[p] = 天盘星；palaceTianGan[p] = 天盘干
  const palaceStar: Record<number, string> = {}
  const palaceStar2: Record<number, string> = {}
  const palaceTianGan: Record<number, string> = {}
  const palaceTianGan2: Record<number, string> = {}
  const zhongGan = dipan[5]

  if (panMethod === "zhuan") {
    // 转盘：值符星转到时干落宫，其余星按环形序跟随
    const zhifuRingIdx = STAR_RING.indexOf(zhifuStar === "天禽" ? "天芮" : zhifuStar)
    const targetRingIdx = RING_PALACES.indexOf(shiGanPalace)
    for (let i = 0; i < 8; i++) {
      const star = STAR_RING[(zhifuRingIdx + i) % 8]
      const palace = RING_PALACES[(targetRingIdx + i) % 8]
      palaceStar[palace] = star
      // 星带原宫地盘干
      const origPalace = PALACE_STAR.indexOf(star)
      palaceTianGan[palace] = dipan[origPalace]
      if (star === "天芮") {
        palaceStar2[palace] = "天禽"
        palaceTianGan2[palace] = zhongGan
      }
    }
    palaceStar[5] = ""
    palaceTianGan[5] = ""
  } else {
    // 飞盘：九星从值符落宫起按洛书飞布
    const forward = flyMethod === "yinyang" ? true : isYang
    const zhifuFlyIdx = STAR_FLY.indexOf(zhifuStar)
    for (let i = 0; i < 9; i++) {
      const star = STAR_FLY[(zhifuFlyIdx + i) % 9]
      const palace = flyPalace(shiGanPalace, i, forward)
      palaceStar[palace] = star
      const origPalace = PALACE_STAR.indexOf(star)
      palaceTianGan[palace] = dipan[origPalace]
    }
  }

  // ─── 八门排布 ───
  const palaceMen: Record<number, string> = {}
  if (panMethod === "zhuan") {
    const zhishiRingIdx = MEN_RING.indexOf(zhishiMen)
    const targetRingIdx = RING_PALACES.indexOf(zhishiPalace)
    for (let i = 0; i < 8; i++) {
      const men = MEN_RING[(zhishiRingIdx + i) % 8]
      const palace = RING_PALACES[(targetRingIdx + i) % 8]
      palaceMen[palace] = men
    }
    palaceMen[5] = ""
  } else {
    // 飞盘九门（含中门）：值使门从落宫起按原宫序飞布九宫，不跳中宫
    const forward = flyMethod === "yinyang" ? true : isYang
    const zhishiFlyIdx = MEN_FLY.indexOf(zhishiMen)
    for (let i = 0; i < 9; i++) {
      const palace = flyPalace(zhishiPalace, i, forward)
      palaceMen[palace] = MEN_FLY[(zhishiFlyIdx + i) % 9]
    }
  }

  // ─── 八神/九神排布 ───
  const palaceShen: Record<number, string> = {}
  // 值符神落天盘值符星所在宫
  const zhifuLuoGong = (() => {
    for (let p = 1; p <= 9; p++) {
      if (palaceStar[p] === zhifuStar || palaceStar2[p] === zhifuStar) return p
    }
    return shiGanPalace
  })()

  if (panMethod === "zhuan") {
    const startRingIdx = RING_PALACES.indexOf(zhifuLuoGong === 5 ? 2 : zhifuLuoGong)
    for (let i = 0; i < 8; i++) {
      const idx = isYang ? (startRingIdx + i) % 8 : (startRingIdx - i + 8) % 8
      palaceShen[RING_PALACES[idx]] = SHEN_8[i]
    }
    palaceShen[5] = ""
  } else {
    const forward = flyMethod === "yinyang" ? true : isYang
    for (let i = 0; i < 9; i++) {
      const palace = flyPalace(zhifuLuoGong, i, forward)
      palaceShen[palace] = SHEN_9[i]
    }
  }

  // ─── 飞干（飞盘左侧大字）：地盘干整体飞时辰步数 ───
  const palaceFeiGan: Record<number, string> = {}
  if (panMethod === "fei") {
    const forward = flyMethod === "yinyang" ? true : isYang
    for (let p = 1; p <= 9; p++) {
      palaceFeiGan[flyPalace(p, xun.hourIdxInXun, forward)] = dipan[p]
    }
  }

  // ─── 地盘九神（飞盘）：九神从旬首仪地盘宫起顺飞 ───
  const palaceDiShen: Record<number, string> = {}
  if (panMethod === "fei") {
    const forward = flyMethod === "yinyang" ? true : isYang
    for (let i = 0; i < 9; i++) {
      palaceDiShen[flyPalace(xunPalaceRaw, i, forward)] = SHEN_9[i]
    }
  }

  // ─── 暗干 ───
  const palaceAnGan: Record<number, string> = {}
  {
    const forward = panMethod === "fei" && flyMethod === "yinyang" ? true : isYang
    if (anganMethod === "dipan") {
      // 门地盘起：地盘干整体随时辰飞布（旬首仪落值使宫，经竞品黄金测试逐值验证）
      for (let p = 1; p <= 9; p++) {
        palaceAnGan[flyPalace(p, xun.hourIdxInXun, forward)] = dipan[p]
      }
    } else {
      // 值使门起：从值使落宫起旬首仪按三奇六仪序飞布
      const yiStart = YIQI.indexOf(xun.yi)
      for (let i = 0; i < 9; i++) {
        const palace = flyPalace(zhishiPalace, i, forward)
        palaceAnGan[palace] = YIQI[(yiStart + i) % 9]
      }
    }
  }

  // ─── 马星/空亡 ───
  const maXing = getMaXing(sizhu.hour.zhi)
  const kongwang = [
    { zhi: sizhu.year.kong.join(""), label: "年" },
    { zhi: sizhu.month.kong.join(""), label: "月" },
    { zhi: sizhu.day.kong.join(""), label: "日" },
    { zhi: sizhu.hour.kong.join(""), label: "时" },
  ]
  const shiKong = sizhu.hour.kong

  // ─── 组装九宫 ───
  const palaces: Record<number, QimenPalace> = {}
  for (let p = 1; p <= 9; p++) {
    const tianGan = palaceTianGan[p] || ""
    const tianGan2 = palaceTianGan2[p]
    const diGan = dipan[p] || ""
    const men = palaceMen[p] || ""

    // 入墓：天/地盘干在墓宫
    const ruMu: string[] = []
    const muGans = MU_PALACE[p] || []
    for (const g of [tianGan, tianGan2, diGan]) {
      if (g && muGans.includes(g) && !ruMu.includes(g)) ruMu.push(g)
    }
    // 击刑：六仪落刑宫
    const jiXing: string[] = []
    for (const g of [tianGan, tianGan2, diGan]) {
      if (g && JIXING_PALACE[g] === p && !jiXing.includes(g)) jiXing.push(g)
    }
    // 刑+墓
    const xingMu = ruMu.filter((g) => jiXing.includes(g))
    for (const g of xingMu) {
      ruMu.splice(ruMu.indexOf(g), 1)
      jiXing.splice(jiXing.indexOf(g), 1)
    }

    const dizhiList = PALACE_DIZHI[p] || []
    palaces[p] = {
      palace: p,
      shen: palaceShen[p] || "",
      star: palaceStar[p] || "",
      star2: palaceStar2[p],
      men,
      tianGan,
      tianGan2,
      feiGan: palaceFeiGan[p] || "",
      diGan,
      anGan: palaceAnGan[p] || "",
      diShen: palaceDiShen[p] || "",
      csTian: changShengLabel(tianGan, p),
      csDi: changShengLabel(diGan, p),
      isZhifu: p === zhifuLuoGong,
      isZhishi: p === zhishiPalace,
      ruMu,
      jiXing,
      xingMu,
      menPo: isMenPo(men, p),
      kongWang: dizhiList.some((z) => shiKong.includes(z as (typeof ZHIS)[number])),
      maXing: dizhiList.includes(maXing),
    }
  }

  return {
    sizhu,
    ju,
    xunshou: { name: `${xun.name}${xun.yi}`, yi: xun.yi, kong: xun.kong },
    zhifu: { star: zhifuStar, palace: zhifuLuoGong },
    zhishi: { men: zhishiMen, palace: zhishiPalace },
    maXing,
    kongwang,
    palaces,
  }
}

/** 指定局数重排（上一局/下一局手动调整时用，时辰不变） */
export function computeQimenWithJu(date: Date, isYang: boolean, num: number, options: QimenOptions = {}): QimenResult {
  return computeQimen(date, { ...options, startMethod: "custom", customJu: `${isYang ? "阳遁" : "阴遁"}${num}局` })
}

// ─── 指定干支+局数直接排盘（山向奇门等年家用法：干支不由日期推导） ───
export interface QimenHourChart {
  ju: { isYang: boolean; num: number; label: string }
  xunshou: { name: string; yi: string; kong: string }
  zhifu: { star: string; palace: number }
  zhishi: { men: string; palace: number }
  maXing: string
  palaces: Record<number, QimenPalace>
}

/** 以给定"时干支"与局数排转盘（复用时家全部内部规则；山向奇门黄金基准逐项验证） */
export function computeQimenForHour(hourGan: string, hourZhi: string, isYang: boolean, juNum: number): QimenHourChart {
  const dipan = buildDipan(juNum, isYang)
  const xun = getXunshou(hourGan, hourZhi)
  const xunPalaceRaw = (() => {
    for (let p = 1; p <= 9; p++) if (dipan[p] === xun.yi) return p
    return 5
  })()
  const zhifuStar = PALACE_STAR[xunPalaceRaw === 5 ? 5 : xunPalaceRaw]
  const zhishiMen = xunPalaceRaw === 5 ? "死门" : PALACE_MEN[xunPalaceRaw]

  const shiGan = hourGan === "甲" ? xun.yi : hourGan
  const shiGanPalace = findGanPalace(dipan, shiGan)

  const zhishiPalace = (() => {
    let p = flyPalace(xunPalaceRaw, xun.hourIdxInXun, isYang)
    if (p === 5) p = 2
    return p
  })()

  // 天盘（转盘）
  const palaceStar: Record<number, string> = {}
  const palaceStar2: Record<number, string> = {}
  const palaceTianGan: Record<number, string> = {}
  const palaceTianGan2: Record<number, string> = {}
  const zhongGan = dipan[5]
  const zhifuRingIdx = STAR_RING.indexOf(zhifuStar === "天禽" ? "天芮" : zhifuStar)
  const targetRingIdx = RING_PALACES.indexOf(shiGanPalace)
  for (let i = 0; i < 8; i++) {
    const star = STAR_RING[(zhifuRingIdx + i) % 8]
    const palace = RING_PALACES[(targetRingIdx + i) % 8]
    palaceStar[palace] = star
    const origPalace = PALACE_STAR.indexOf(star)
    palaceTianGan[palace] = dipan[origPalace]
    if (star === "天芮") {
      palaceStar2[palace] = "天禽"
      palaceTianGan2[palace] = zhongGan
    }
  }
  palaceStar[5] = ""
  palaceTianGan[5] = ""

  // 八门（转盘）
  const palaceMen: Record<number, string> = {}
  {
    const zhishiRingIdx = MEN_RING.indexOf(zhishiMen)
    const tIdx = RING_PALACES.indexOf(zhishiPalace)
    for (let i = 0; i < 8; i++) {
      palaceMen[RING_PALACES[(tIdx + i) % 8]] = MEN_RING[(zhishiRingIdx + i) % 8]
    }
    palaceMen[5] = ""
  }

  // 八神（转盘，阳顺阴逆）
  const palaceShen: Record<number, string> = {}
  const zhifuLuoGong = (() => {
    for (let p = 1; p <= 9; p++) if (palaceStar[p] === zhifuStar || palaceStar2[p] === zhifuStar) return p
    return shiGanPalace
  })()
  {
    const startRingIdx = RING_PALACES.indexOf(zhifuLuoGong === 5 ? 2 : zhifuLuoGong)
    for (let i = 0; i < 8; i++) {
      const idx = isYang ? (startRingIdx + i) % 8 : (startRingIdx - i + 8) % 8
      palaceShen[RING_PALACES[idx]] = SHEN_8[i]
    }
    palaceShen[5] = ""
  }

  const maXing = getMaXing(hourZhi)
  const kong = xun.kong

  const palaces: Record<number, QimenPalace> = {}
  for (let p = 1; p <= 9; p++) {
    const tianGan = palaceTianGan[p] || ""
    const tianGan2 = palaceTianGan2[p]
    const diGan = dipan[p] || ""
    const men = palaceMen[p] || ""
    const ruMu: string[] = []
    const muGans = MU_PALACE[p] || []
    for (const g of [tianGan, tianGan2, diGan]) {
      if (g && muGans.includes(g) && !ruMu.includes(g)) ruMu.push(g)
    }
    const jiXing: string[] = []
    for (const g of [tianGan, tianGan2, diGan]) {
      if (g && JIXING_PALACE[g] === p && !jiXing.includes(g)) jiXing.push(g)
    }
    const xingMu = ruMu.filter((g) => jiXing.includes(g))
    for (const g of xingMu) {
      ruMu.splice(ruMu.indexOf(g), 1)
      jiXing.splice(jiXing.indexOf(g), 1)
    }
    const dizhiList = PALACE_DIZHI[p] || []
    palaces[p] = {
      palace: p,
      shen: palaceShen[p] || "",
      star: palaceStar[p] || "",
      star2: palaceStar2[p],
      men,
      tianGan,
      tianGan2,
      feiGan: "",
      diGan,
      anGan: "",
      diShen: "",
      csTian: changShengLabel(tianGan, p),
      csDi: changShengLabel(diGan, p),
      isZhifu: p === zhifuLuoGong,
      isZhishi: p === zhishiPalace,
      ruMu,
      jiXing,
      xingMu,
      menPo: isMenPo(men, p),
      kongWang: dizhiList.some((z) => kong.includes(z)),
      maXing: dizhiList.includes(maXing),
    }
  }

  return {
    ju: { isYang, num: juNum, label: `${isYang ? "阳遁" : "阴遁"}${juNum}局` },
    xunshou: { name: `${xun.name}${xun.yi}`, yi: xun.yi, kong: xun.kong },
    zhifu: { star: zhifuStar, palace: zhifuLuoGong },
    zhishi: { men: zhishiMen, palace: zhishiPalace },
    maXing,
    palaces,
  }
}

// ─── 阴盘命理奇门·数理起局法 ───
// 局数 = (农历年支序 + 农历月 + 农历日 + 时支序) mod 9（余0取9）
// 阴阳遁：冬至→夏至为阳遁，夏至→冬至为阴遁
// 竞品黄金案例验证：1980-06-15 12:30 农历五月初三庚申年 → 申9+月5+日3+午7=24 → 阳遁6局
const CN_MONTH_NUM: Record<string, number> = {
  正月: 1, 一月: 1, 二月: 2, 三月: 3, 四月: 4, 五月: 5, 六月: 6,
  七月: 7, 八月: 8, 九月: 9, 十月: 10, 十一月: 11, 冬月: 11, 十二月: 12, 腊月: 12,
}

export interface MingliJu {
  isYang: boolean
  num: number
  lunarMonth: number
  lunarDay: number
  yearZhiIdx: number
  hourZhiIdx: number
}

export function mingliJu(date: Date): MingliJu {
  const y = date.getFullYear()
  // 农历月/日（Intl 中国历；闰月去"闰"前缀按本月数计）
  const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
    year: "numeric", month: "long", day: "numeric",
  }).formatToParts(new Date(y, date.getMonth(), date.getDate()))
  const rawMonth = (parts.find((p) => p.type === "month")?.value || "一月").replace(/^闰/, "")
  const lunarMonth = CN_MONTH_NUM[rawMonth] || Number.parseInt(rawMonth) || 1
  const lunarDay = Number(parts.find((p) => p.type === "day")?.value || "1")
  // 农历年支（春节分界）：Intl relatedYear 给出对应公历年号
  const relatedYear = Number(parts.find((p) => (p.type as string) === "relatedYear")?.value || y)
  const yearZhiIdx = ((((relatedYear - 4) % 12) + 12) % 12) + 1 // 子1..亥12
  // 时支序（子1丑2...亥12；23点起算子时）
  const hourZhiIdx = (Math.floor(((date.getHours() + 1) % 24) / 2) % 12) + 1
  const num = (yearZhiIdx + lunarMonth + lunarDay + hourZhiIdx) % 9 || 9
  // 阴阳遁：冬至→夏至阳，夏至→冬至阴（钟面按北京时间解释）
  const t = bjMs(date)
  const xiazhi = findTerm(y, "夏至").getTime()
  const dongzhi = findTerm(y, "冬至").getTime()
  const isYang = t < xiazhi || t >= dongzhi
  return { isYang, num, lunarMonth, lunarDay, yearZhiIdx, hourZhiIdx }
}
