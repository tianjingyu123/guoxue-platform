/**
 * ⚠️ 本文件是**全平台唯一**的排盘算法真源（2026-07-14 由 apps/mobile 迁入）。
 *
 * 迁入原因：此前 C 端用前端引擎、admin 用 apps/server 的 tool-registry/calculators，
 * 两套算法实测结果大面积不同（奇门局数/值符/值使、大六壬月将全错），
 * 出现「管理员与用户看到不同的盘」。现统一到这里，前后端共用一套。
 *
 * 🔴 改动本文件必须跑：pnpm --filter @guoxue/mobile verify（14 套黄金测试 + 前后端一致性）
 */
// ─────────────────────────────────────────────────────────────
// 六爻纳甲装卦真实引擎
// 京房八宫纳甲体系：八宫卦序程序化推导（一世~五世/游魂/归魂）、
// 纳甲配干支、卦宫五行定六亲、日干起六神、世应、伏神（本宫首卦）、
// 卦身、神煞（驿马/桃花/日禄/天乙贵人）、四柱旬空（复用 lib/ganzhi）。
// 黄金锚点：水泽节之震为雷（丁丑日）——纳甲丁丁丁戊戊戊、世初应四、
// 六神雀勾蛇虎玄龙、驿马亥/桃花午/日禄午/贵人亥酉，逐值可验。
// ─────────────────────────────────────────────────────────────

import { fourPillars, kongWangOf, ZHI_WUXING, ZHIS } from "./ganzhi"
import type { LiuyaoResultLine } from "./liuyao-data"

// ─── 八卦基础 ───
// bits：自下而上三爻，1=阳
const TRIGRAMS = [
  { name: "乾", bits: [1, 1, 1], num: 1, elem: "金", sym: "☰" },
  { name: "兑", bits: [1, 1, 0], num: 2, elem: "金", sym: "☱" },
  { name: "离", bits: [1, 0, 1], num: 3, elem: "火", sym: "☲" },
  { name: "震", bits: [1, 0, 0], num: 4, elem: "木", sym: "☳" },
  { name: "巽", bits: [0, 1, 1], num: 5, elem: "木", sym: "☴" },
  { name: "坎", bits: [0, 1, 0], num: 6, elem: "水", sym: "☵" },
  { name: "艮", bits: [0, 0, 1], num: 7, elem: "土", sym: "☶" },
  { name: "坤", bits: [0, 0, 0], num: 8, elem: "土", sym: "☷" },
] as const

const trigramByBits = (b: number[]) => TRIGRAMS.find((t) => t.bits[0] === b[0] && t.bits[1] === b[1] && t.bits[2] === b[2])!
export const trigramByNum = (n: number) => TRIGRAMS.find((t) => t.num === (((n - 1) % 8 + 8) % 8) + 1)!
export const trigramByName = (name: string) => TRIGRAMS.find((t) => t.name === name)!

// ─── 纳甲表：每卦内/外卦的天干 + 自下而上三支 ───
const NAJIA: Record<string, { ganIn: string; ganOut: string; zhiIn: string[]; zhiOut: string[] }> = {
  乾: { ganIn: "甲", ganOut: "壬", zhiIn: ["子", "寅", "辰"], zhiOut: ["午", "申", "戌"] },
  坤: { ganIn: "乙", ganOut: "癸", zhiIn: ["未", "巳", "卯"], zhiOut: ["丑", "亥", "酉"] },
  震: { ganIn: "庚", ganOut: "庚", zhiIn: ["子", "寅", "辰"], zhiOut: ["午", "申", "戌"] },
  巽: { ganIn: "辛", ganOut: "辛", zhiIn: ["丑", "亥", "酉"], zhiOut: ["未", "巳", "卯"] },
  坎: { ganIn: "戊", ganOut: "戊", zhiIn: ["寅", "辰", "午"], zhiOut: ["申", "戌", "子"] },
  离: { ganIn: "己", ganOut: "己", zhiIn: ["卯", "丑", "亥"], zhiOut: ["酉", "未", "巳"] },
  艮: { ganIn: "丙", ganOut: "丙", zhiIn: ["辰", "午", "申"], zhiOut: ["戌", "子", "寅"] },
  兑: { ganIn: "丁", ganOut: "丁", zhiIn: ["巳", "卯", "丑"], zhiOut: ["亥", "酉", "未"] },
}

// ─── 64卦名表：[上卦][下卦]，顺序均为 乾兑离震巽坎艮坤 ───
const GUA_NAMES: string[][] = [
  ["乾为天", "天泽履", "天火同人", "天雷无妄", "天风姤", "天水讼", "天山遁", "天地否"],
  ["泽天夬", "兑为泽", "泽火革", "泽雷随", "泽风大过", "泽水困", "泽山咸", "泽地萃"],
  ["火天大有", "火泽睽", "离为火", "火雷噬嗑", "火风鼎", "火水未济", "火山旅", "火地晋"],
  ["雷天大壮", "雷泽归妹", "雷火丰", "震为雷", "雷风恒", "雷水解", "雷山小过", "雷地豫"],
  ["风天小畜", "风泽中孚", "风火家人", "风雷益", "巽为风", "风水涣", "风山渐", "风地观"],
  ["水天需", "水泽节", "水火既济", "水雷屯", "水风井", "坎为水", "水山蹇", "水地比"],
  ["山天大畜", "山泽损", "山火贲", "山雷颐", "山风蛊", "山水蒙", "艮为山", "山地剥"],
  ["地天泰", "地泽临", "地火明夷", "地雷复", "地风升", "地水师", "地山谦", "坤为地"],
]

export function hexName(bits: number[]): string {
  const lower = trigramByBits(bits.slice(0, 3))
  const upper = trigramByBits(bits.slice(3, 6))
  const upIdx = TRIGRAMS.findIndex((t) => t.name === upper.name)
  const loIdx = TRIGRAMS.findIndex((t) => t.name === lower.name)
  return GUA_NAMES[upIdx][loIdx]
}

// ─── 八宫卦序推导（京房）：本宫→一~五世→游魂→归魂 ───
// 世爻位：本宫6 一世1 二世2 三世3 四世4 五世5 游魂4 归魂3
const SHI_POS = [6, 1, 2, 3, 4, 5, 4, 3]
const SEQ_LABEL = ["本宫卦", "一世卦", "二世卦", "三世卦", "四世卦", "五世卦", "游魂卦", "归魂卦"]

interface PalaceInfo {
  palace: string // 宫名（乾/兑/...）
  elem: string // 宫五行
  seq: number // 0-7 宫内序
  shiPos: number
  yingPos: number
  pureBits: number[] // 本宫首卦（伏神来源）
}

const palaceCache = new Map<string, PalaceInfo>()
function buildPalaces() {
  if (palaceCache.size) return
  for (const t of TRIGRAMS) {
    const pure: number[] = [...t.bits, ...t.bits]
    let cur: number[] = [...pure]
    for (let seq = 0; seq < 8; seq++) {
      if (seq >= 1 && seq <= 5) {
        cur = [...cur]
        cur[seq - 1] = 1 - cur[seq - 1] // 依次变初~五爻
      } else if (seq === 6) {
        cur = [...cur]
        cur[3] = 1 - cur[3] // 游魂：五世卦再变四爻
      } else if (seq === 7) {
        cur = [...cur]
        for (let i = 0; i < 3; i++) cur[i] = pure[i] // 归魂：下卦复原
      }
      palaceCache.set(cur.join(""), {
        palace: t.name,
        elem: t.elem,
        seq,
        shiPos: SHI_POS[seq],
        yingPos: ((SHI_POS[seq] + 2) % 6) + 1,
        pureBits: pure,
      })
    }
  }
}

export function palaceOf(bits: number[]): PalaceInfo {
  buildPalaces()
  return palaceCache.get(bits.join(""))!
}

// ─── 六亲（以卦宫五行为"我"）───
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }
export function liuqin(palaceElem: string, zhiElem: string): string {
  if (palaceElem === zhiElem) return "兄"
  if (SHENG[palaceElem] === zhiElem) return "孙"
  if (SHENG[zhiElem] === palaceElem) return "父"
  if (KE[palaceElem] === zhiElem) return "财"
  return "官"
}

// ─── 六神（日干起初爻，向上循环）───
const LIUSHEN = ["龙", "雀", "勾", "蛇", "虎", "玄"]
export function liushenStart(dayGan: string): number {
  if ("甲乙".includes(dayGan)) return 0
  if ("丙丁".includes(dayGan)) return 1
  if (dayGan === "戊") return 2
  if (dayGan === "己") return 3
  if ("庚辛".includes(dayGan)) return 4
  return 5
}

// ─── 纳甲：某卦第 pos 爻（1-6）的干支 ───
export function najiaAt(bits: number[], pos: number): { gan: string; zhi: string } {
  const isInner = pos <= 3
  const tri = trigramByBits(isInner ? bits.slice(0, 3) : bits.slice(3, 6))
  const na = NAJIA[tri.name]
  const i = (pos - 1) % 3
  return { gan: isInner ? na.ganIn : na.ganOut, zhi: isInner ? na.zhiIn[i] : na.zhiOut[i] }
}

// ─── 神煞 ───
const YIMA: Record<string, string> = { 申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" }
const TAOHUA: Record<string, string> = { 申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" }
const RILU: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 戊: "巳", 丁: "午", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" }
const GUIREN: Record<string, string> = { 甲: "丑未", 戊: "丑未", 庚: "丑未", 乙: "子申", 己: "子申", 丙: "亥酉", 丁: "亥酉", 壬: "卯巳", 癸: "卯巳", 辛: "寅午" }

// ─── 六合/六冲卦 ───
const LIUHE_GUA = new Set(["地天泰", "天地否", "水泽节", "泽水困", "火山旅", "山火贲", "雷地豫", "地雷复"])
const LIUCHONG_GUA = new Set(["乾为天", "坤为地", "震为雷", "巽为风", "坎为水", "离为火", "艮为山", "兑为泽", "天雷无妄", "雷天大壮"])
export function guaTag(name: string, seq: number): string {
  if (LIUCHONG_GUA.has(name)) return "六冲卦"
  if (LIUHE_GUA.has(name)) return "六合卦"
  return SEQ_LABEL[seq]
}

// ─── 起卦 ───
/** 铜钱一掷：0-3 个背。3背=老阳9(动) 2背=少阴8 1背=少阳7 0背(3字)=老阴6(动) */
export function coinsToLines(values: number[]): { bits: number[]; moving: number[] } {
  const bits: number[] = []
  const moving: number[] = []
  values.slice(0, 6).forEach((v, i) => {
    // v: 6老阴 7少阳 8少阴 9老阳
    bits.push(v === 7 || v === 9 ? 1 : 0)
    if (v === 6 || v === 9) moving.push(i + 1)
  })
  return { bits, moving }
}

export function randomCoinThrow(): number {
  let heads = 0
  for (let i = 0; i < 3; i++) if (Math.random() < 0.5) heads++
  return heads === 3 ? 9 : heads === 2 ? 8 : heads === 1 ? 7 : 6
}

const mod = (n: number, m: number) => ((n % m) + m) % m || m // 余0取m

/** 时间起卦（农历月日 + 年支数 + 时支数） */
export function timeGua(yearZhi: string, lunarMonth: number, lunarDay: number, hourZhi: string): { bits: number[]; moving: number[] } {
  const yz = ZHIS.indexOf(yearZhi as (typeof ZHIS)[number]) + 1
  const hz = ZHIS.indexOf(hourZhi as (typeof ZHIS)[number]) + 1
  const upper = trigramByNum(mod(yz + lunarMonth + lunarDay, 8))
  const lower = trigramByNum(mod(yz + lunarMonth + lunarDay + hz, 8))
  const dong = mod(yz + lunarMonth + lunarDay + hz, 6)
  return { bits: [...lower.bits, ...upper.bits], moving: [dong] }
}

/** 数字起卦1：一组数字平分两半求和取余（奇数个前少后多），动爻=(上+下+时辰数)%6 */
export function numberGua1(digitsStr: string, hourZhi: string): { bits: number[]; moving: number[] } | null {
  const digits = digitsStr.replace(/\D/g, "").split("").map(Number)
  if (digits.length < 2) return null
  const half = Math.floor(digits.length / 2)
  const front = digits.slice(0, half)
  const back = digits.slice(half)
  const upNum = mod(front.reduce((a, b) => a + b, 0), 8)
  const downNum = mod(back.reduce((a, b) => a + b, 0), 8)
  const hz = ZHIS.indexOf(hourZhi as (typeof ZHIS)[number]) + 1
  const dong = mod(upNum + downNum + hz, 6)
  return { bits: [...trigramByNum(downNum).bits, ...trigramByNum(upNum).bits], moving: [dong] }
}

/** 数字起卦2：三个数分别取余定上卦/下卦/动爻 */
export function numberGua2(input: string): { bits: number[]; moving: number[] } | null {
  const nums = input.split(/[\s,，、]+/).filter(Boolean).map((s) => Number.parseInt(s, 10))
  const flat = nums.length >= 3 ? nums : input.replace(/\D/g, "").split("").map(Number)
  if (flat.length < 3 || flat.some(Number.isNaN)) return null
  const upper = trigramByNum(mod(flat[0], 8))
  const lower = trigramByNum(mod(flat[1], 8))
  const dong = mod(flat[2], 6)
  return { bits: [...lower.bits, ...upper.bits], moving: [dong] }
}

/** 卦名起卦：本卦/变卦上下卦已知，动爻=两卦差异之爻 */
export function guanameGua(benUp: string, benDown: string, bianUp: string, bianDown: string): { bits: number[]; moving: number[] } {
  const ben = [...trigramByName(benDown).bits, ...trigramByName(benUp).bits]
  const bian = [...trigramByName(bianDown).bits, ...trigramByName(bianUp).bits]
  const moving: number[] = []
  for (let i = 0; i < 6; i++) if (ben[i] !== bian[i]) moving.push(i + 1)
  return { bits: ben, moving }
}

// ─── 装卦主函数 ───
export interface LiuyaoChart {
  benName: string // "水泽节(坎)"
  bianName: string
  benShort: string // "水泽节"（查卦辞用）
  bianShort: string
  benTag: string
  bianTag: string
  palace: string
  seqLabel: string
  lines: LiuyaoResultLine[]
  guashen: string // 卦身地支
  shensha: string[]
  shiPos: number
  yingPos: number
}

export function assembleChart(benBits: number[], moving: number[], dayGan: string, dayZhi: string): LiuyaoChart {
  const bianBits = benBits.map((b, i) => (moving.includes(i + 1) ? 1 - b : b))
  const pal = palaceOf(benBits)
  const bianPal = palaceOf(bianBits)
  const benShort = hexName(benBits)
  const bianShort = hexName(bianBits)
  const lsStart = liushenStart(dayGan)
  const dayKong = kongWangOf(dayGan, dayZhi)

  // 本卦已有六亲种类 → 缺者取伏神（本宫首卦）
  const benKinds = new Set<string>()
  for (let p = 1; p <= 6; p++) benKinds.add(liuqin(pal.elem, ZHI_WUXING[najiaAt(benBits, p).zhi]))
  const fushenAt: Record<number, string> = {}
  for (const kind of ["父", "兄", "官", "财", "孙"]) {
    if (benKinds.has(kind)) continue
    for (let p = 1; p <= 6; p++) {
      const na = najiaAt(pal.pureBits, p)
      if (liuqin(pal.elem, ZHI_WUXING[na.zhi]) === kind) {
        fushenAt[p] = `伏神: ${kind} ${na.zhi}${ZHI_WUXING[na.zhi]}`
      }
    }
  }

  // 卦身：世爻阳从子起、阴从午起，自初爻数至世爻
  const shiYao = benBits[pal.shiPos - 1]
  const guashen = ZHIS[(ZHIS.indexOf(shiYao === 1 ? "子" : "午") + pal.shiPos - 1) % 12]

  const lines: LiuyaoResultLine[] = []
  for (let pos = 6; pos >= 1; pos--) {
    const benNa = najiaAt(benBits, pos)
    const bianNa = najiaAt(bianBits, pos)
    const benQin = liuqin(pal.elem, ZHI_WUXING[benNa.zhi])
    const bianQin = liuqin(pal.elem, ZHI_WUXING[bianNa.zhi]) // 变卦六亲以本卦宫五行论
    const isMoving = moving.includes(pos)
    lines.push({
      position: pos,
      liushen: LIUSHEN[(lsStart + pos - 1) % 6],
      benLiuqin: `${benQin} ${benNa.zhi}${ZHI_WUXING[benNa.zhi]}`,
      benGan: benNa.gan,
      benYao: benBits[pos - 1] === 1 ? "yang" : "yin",
      shiying: pos === pal.shiPos ? "世" : pos === pal.yingPos ? "应" : undefined,
      movingMark: isMoving ? (benBits[pos - 1] === 1 ? "O" : "X") : undefined,
      bianLiuqin: `${bianQin} ${bianNa.zhi}${ZHI_WUXING[bianNa.zhi]}`,
      bianGan: bianNa.gan,
      bianYao: bianBits[pos - 1] === 1 ? "yang" : "yin",
      fushen: fushenAt[pos],
      guashenNote: benNa.zhi === guashen ? `卦身为${guashen}` : undefined,
      judgment: buildJudgment(pos, benQin, benNa.zhi, isMoving, bianQin, pos === pal.shiPos, pos === pal.yingPos, dayKong),
    })
  }

  const shensha = [
    `卦身--${guashen}`,
    `驿马--${YIMA[dayZhi]}`,
    `桃花--${TAOHUA[dayZhi]}`,
    `日禄--${RILU[dayGan]}`,
    `贵人--${GUIREN[dayGan]}`,
  ]

  return {
    benName: `${benShort}(${pal.palace})`,
    bianName: `${bianShort}(${bianPal.palace})`,
    benShort,
    bianShort,
    benTag: guaTag(benShort, pal.seq),
    bianTag: guaTag(bianShort, bianPal.seq),
    palace: pal.palace,
    seqLabel: SEQ_LABEL[pal.seq],
    lines,
    guashen,
    shensha,
    shiPos: pal.shiPos,
    yingPos: pal.yingPos,
  }
}

// ─── 断语生成（规则化，供点爻弹层）───
const QIN_FULL: Record<string, string> = { 兄: "兄弟", 官: "官鬼", 父: "父母", 财: "妻财", 孙: "子孙" }
const LIUSHEN_FULL: Record<string, string> = { 龙: "青龙", 雀: "朱雀", 勾: "勾陈", 蛇: "螣蛇", 虎: "白虎", 玄: "玄武" }
function buildJudgment(pos: number, qin: string, zhi: string, isMoving: boolean, bianQin: string, isShi: boolean, isYing: boolean, dayKong: [string, string]): string {
  const parts: string[] = []
  const posName = ["初", "二", "三", "四", "五", "上"][pos - 1]
  const isKong = dayKong.includes(zhi as (typeof dayKong)[number])
  if (isShi) parts.push(`世持${QIN_FULL[qin]}${zhi}，代表求测者自身状态与立场。`)
  if (isYing) parts.push(`应爻${QIN_FULL[qin]}${zhi}，代表所测之人事、对方。`)
  if (isKong) parts.push(`${zhi}逢日空，待出空（值日或冲空之日）而应。`)
  if (isMoving) {
    const dongText: Record<string, string> = {
      孙: "子孙发动，主消灾解忧、福神临事，问官职功名则不利。",
      财: "妻财发动，利求财谋利，但主克父母文书。",
      官: "官鬼发动，事体有变、忧疑暗动，问官职功名反主机遇。",
      父: "父母发动，文书合同有着落，但主克子孙、辛劳操心。",
      兄: "兄弟发动，主阻隔分财、竞争口舌，谋财者防破耗。",
    }
    parts.push(dongText[qin] || "")
    if (qin !== bianQin) parts.push(`化出${QIN_FULL[bianQin]}，后势转向${QIN_FULL[bianQin]}所主之事。`)
  }
  if (!parts.length) parts.push(`${posName}爻${QIN_FULL[qin]}${zhi}安静，得日月生扶则有力，休囚则待时。`)
  return parts.join("")
}

// ─── 卦面要点（规则化，对齐原型 keyNotes 结构）───
export function buildKeyNotes(chart: LiuyaoChart, dayGan: string, dayZhi: string): { label: string; text: string }[] {
  const notes: { label: string; text: string }[] = []
  const dayKong = kongWangOf(dayGan, dayZhi)
  const shiLine = chart.lines.find((l) => l.shiying === "世")!
  const yingLine = chart.lines.find((l) => l.shiying === "应")!
  const shiQin = shiLine.benLiuqin[0]

  const chishiText: Record<string, string> = {
    财: "妻财持世：预测买卖、财运、失物等为吉；预测父母、长辈、文书则不吉。以之为吉，则是财运亨通之象。",
    官: "官鬼持世：预测官职、功名、事业为吉；问病、问讼则主忧疑缠身，宜安分守常。",
    父: "父母持世：预测文书、合同、学业、房产为吉；问子女、问财则费力操心。",
    兄: "兄弟持世：主同侪竞争、朋友之事；求财者防阻隔分财，合作宜明算账。",
    孙: "子孙持世：主安乐无忧、消灾解难；预测功名官职则为忌，问病问灾大吉。",
  }
  notes.push({ label: "持世", text: chishiText[shiQin] || "" })

  const tagText: Record<string, string> = {
    六合卦: "六合卦：主合，利于合作、情感，也主羁绊缠绵，事有黏滞。",
    六冲卦: "六冲卦：主散、主快，谋事恐有始无终，宜速战速决。",
    游魂卦: "游魂卦：主心神不定、走动奔波，问行人主在外未归。",
    归魂卦: "归魂卦：主回归安定，问行人主归，问迁移则宜守不宜动。",
  }
  const benT = tagText[chart.benTag]
  const bianT = tagText[chart.bianTag]
  if (benT || bianT) {
    let t = benT || `本卦为${chart.palace}宫${chart.seqLabel}。`
    if (bianT) t += ` 变卦${chart.bianTag}：${bianT.split("：")[1]}`
    notes.push({ label: "卦象", text: t })
  }

  // 世应生克
  const shiElem = ZHI_WUXING[shiLine.benLiuqin.slice(-2, -1)]
  const yingElem = ZHI_WUXING[yingLine.benLiuqin.slice(-2, -1)]
  let syText = "世应比和：主同心同气，谋事平顺可期。"
  if (SHENG[yingElem] === shiElem) syText = "应生世：主对方有意相助、事来就我，谋事可成。"
  else if (SHENG[shiElem] === yingElem) syText = "世生应：主我方付出主动，热脸相迎，防一厢情愿。"
  else if (KE[yingElem] === shiElem) syText = "应克世：主对方强势压我，谋事受制于人，宜借力周旋。"
  else if (KE[shiElem] === yingElem) syText = "世克应：主排斥、控制，不利与对方感情和合作，谈判宜多让半分。"
  notes.push({ label: "世应", text: syText })

  // 空亡要点
  const yingZhi = yingLine.benLiuqin.slice(-2, -1)
  const shiZhi = shiLine.benLiuqin.slice(-2, -1)
  if (dayKong.includes(yingZhi as (typeof dayKong)[number])) {
    notes.push({ label: "应期", text: `应爻逢空：多为对方心中不实、缺乏信心或诚意。应期看${yingZhi}出空之日可见分晓。` })
  } else if (dayKong.includes(shiZhi as (typeof dayKong)[number])) {
    notes.push({ label: "应期", text: `世爻逢空：自身心意未定或力有未逮，待出空之日再行动为宜。` })
  }

  // 动爻要点
  const movingLines = chart.lines.filter((l) => l.movingMark)
  if (movingLines.length === 0) {
    notes.push({ label: "动爻", text: "六爻安静：以世应、日月生克断之，事态平稳少变数。" })
  } else {
    const dm = movingLines[movingLines.length - 1]
    const q = dm.benLiuqin[0]
    const dongText: Record<string, string> = {
      孙: "子孙发动：主消灾、无忧之象，但问官职则不利。",
      财: "妻财发动：利求财，但主克文书父母之事。",
      官: "官鬼发动：事体有变、防小人暗动，问功名反主机遇。",
      父: "父母发动：文书合同将有着落，但辛劳难免。",
      兄: "兄弟发动：主竞争分财、口舌阻隔，谋财防破耗。",
    }
    notes.push({ label: "动爻", text: dongText[q] || "" })
  }
  return notes
}

// ─── 64卦卦辞（古籍原文一句）───
export const GUA_CI: Record<string, string> = {
  乾为天: "乾：元，亨，利，贞。",
  坤为地: "坤：元亨，利牝马之贞。君子有攸往，先迷后得主。利西南得朋，东北丧朋。安贞吉。",
  水雷屯: "屯：元亨，利贞。勿用有攸往，利建侯。",
  山水蒙: "蒙：亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。",
  水天需: "需：有孚，光亨，贞吉。利涉大川。",
  天水讼: "讼：有孚，窒惕，中吉，终凶。利见大人，不利涉大川。",
  地水师: "师：贞，丈人吉，无咎。",
  水地比: "比：吉。原筮，元永贞，无咎。不宁方来，后夫凶。",
  风天小畜: "小畜：亨。密云不雨，自我西郊。",
  天泽履: "履：履虎尾，不咥人，亨。",
  地天泰: "泰：小往大来，吉，亨。",
  天地否: "否：否之匪人，不利君子贞，大往小来。",
  天火同人: "同人：同人于野，亨。利涉大川，利君子贞。",
  火天大有: "大有：元亨。",
  地山谦: "谦：亨，君子有终。",
  雷地豫: "豫：利建侯行师。",
  泽雷随: "随：元亨，利贞，无咎。",
  山风蛊: "蛊：元亨，利涉大川。先甲三日，后甲三日。",
  地泽临: "临：元亨，利贞。至于八月有凶。",
  风地观: "观：盥而不荐，有孚颙若。",
  火雷噬嗑: "噬嗑：亨。利用狱。",
  山火贲: "贲：亨。小利有攸往。",
  山地剥: "剥：不利有攸往。",
  地雷复: "复：亨。出入无疾，朋来无咎。反复其道，七日来复。利有攸往。",
  天雷无妄: "无妄：元亨，利贞。其匪正有眚，不利有攸往。",
  山天大畜: "大畜：利贞。不家食吉，利涉大川。",
  山雷颐: "颐：贞吉。观颐，自求口实。",
  泽风大过: "大过：栋桡。利有攸往，亨。",
  坎为水: "习坎：有孚，维心亨，行有尚。",
  离为火: "离：利贞，亨。畜牝牛，吉。",
  泽山咸: "咸：亨，利贞，取女吉。",
  雷风恒: "恒：亨，无咎，利贞，利有攸往。",
  天山遁: "遁：亨，小利贞。",
  雷天大壮: "大壮：利贞。",
  火地晋: "晋：康侯用锡马蕃庶，昼日三接。",
  地火明夷: "明夷：利艰贞。",
  风火家人: "家人：利女贞。",
  火泽睽: "睽：小事吉。",
  水山蹇: "蹇：利西南，不利东北。利见大人，贞吉。",
  雷水解: "解：利西南。无所往，其来复吉。有攸往，夙吉。",
  山泽损: "损：有孚，元吉，无咎，可贞，利有攸往。曷之用？二簋可用享。",
  风雷益: "益：利有攸往，利涉大川。",
  泽天夬: "夬：扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。",
  天风姤: "姤：女壮，勿用取女。",
  泽地萃: "萃：亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。",
  地风升: "升：元亨，用见大人，勿恤，南征吉。",
  泽水困: "困：亨，贞，大人吉，无咎。有言不信。",
  水风井: "井：改邑不改井，无丧无得，往来井井。汔至亦未繘井，羸其瓶，凶。",
  泽火革: "革：巳日乃孚，元亨利贞，悔亡。",
  火风鼎: "鼎：元吉，亨。",
  震为雷: "震：亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。",
  艮为山: "艮：艮其背，不获其身；行其庭，不见其人。无咎。",
  风山渐: "渐：女归吉，利贞。",
  雷泽归妹: "归妹：征凶，无攸利。",
  雷火丰: "丰：亨，王假之，勿忧，宜日中。",
  火山旅: "旅：小亨，旅贞吉。",
  巽为风: "巽：小亨，利有攸往，利见大人。",
  兑为泽: "兑：亨，利贞。",
  风水涣: "涣：亨。王假有庙，利涉大川，利贞。",
  水泽节: "节：亨。苦节不可贞。",
  风泽中孚: "中孚：豚鱼吉，利涉大川，利贞。",
  雷山小过: "小过：亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。",
  水火既济: "既济：亨，小，利贞。初吉终乱。",
  火水未济: "未济：亨。小狐汔济，濡其尾，无攸利。",
}

// ─── 传统解卦（结构化：卦体/世应/提示，规则生成保证64卦全覆盖）───
export function buildJieGua(chart: LiuyaoChart): { title: string; sections: { label: string; text: string }[] } {
  const shiLine = chart.lines.find((l) => l.shiying === "世")!
  const posName = ["初", "二", "三", "四", "五", "上"][chart.shiPos - 1]
  return {
    title: `${chart.benShort}（${chart.palace}宫${chart.seqLabel}）`,
    sections: [
      {
        label: "卦体",
        text: `本卦${chart.benShort}属${chart.palace}宫${chart.seqLabel}，${chart.benTag === chart.seqLabel ? "" : `为${chart.benTag}，`}世居${posName}爻，应在${["初", "二", "三", "四", "五", "上"][chart.yingPos - 1]}爻。${chart.lines.some((l) => l.movingMark) ? `动而变${chart.bianShort}。` : "六爻安静。"}`,
      },
      {
        label: "世爻",
        text: `世持${QIN_FULL[shiLine.benLiuqin[0]]}${shiLine.benLiuqin.slice(2)}，临${LIUSHEN_FULL[shiLine.liushen]}。世爻为求测者自身，旺相有气则事可为，休囚受制则宜守待时。`,
      },
      {
        label: "提示",
        text: "断卦以用神为纲：观其旺衰（月建日辰生克）、动静（动则事起）、空破（旬空月破待应期）。断语仅供参考，吉凶请结合具体所测人事而定。",
      },
    ],
  }
}

// ─── 一站式：从起卦参数到完整结果 ───
export interface LiuyaoComputeInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  methodKey: string // manual/coin/guaname/number1/number2/time/auto
  coins?: string // "7,8,9,6,7,8" 自下而上
  numberInput?: string
  guaPick?: { benUp: string; benDown: string; bianUp: string; bianDown: string }
}

export function computeLiuyao(input: LiuyaoComputeInput) {
  const fp = fourPillars(input.year, input.month, input.day, input.hour, input.minute)

  let cast: { bits: number[]; moving: number[] } | null = null
  switch (input.methodKey) {
    case "coin":
    case "auto":
    case "manual": {
      if (input.coins) {
        const values = input.coins.split(",").map(Number).filter((v) => v >= 6 && v <= 9)
        if (values.length === 6) cast = coinsToLines(values)
      }
      break
    }
    case "time": {
      const lunar = lunarMD(input.year, input.month, input.day)
      cast = timeGua(fp.year.zhi, lunar.m, lunar.d, fp.hour.zhi)
      break
    }
    case "number1":
      cast = input.numberInput ? numberGua1(input.numberInput, fp.hour.zhi) : null
      break
    case "number2":
      cast = input.numberInput ? numberGua2(input.numberInput) : null
      break
    case "guaname":
      if (input.guaPick) {
        const clean = (s: string) => s.replace(/卦.*$/, "")
        cast = guanameGua(clean(input.guaPick.benUp), clean(input.guaPick.benDown), clean(input.guaPick.bianUp), clean(input.guaPick.bianDown))
      }
      break
  }
  // 兜底：时间起卦（保证任何参数缺失都能出盘）
  if (!cast) {
    const lunar = lunarMD(input.year, input.month, input.day)
    cast = timeGua(fp.year.zhi, lunar.m, lunar.d, fp.hour.zhi)
  }

  const chart = assembleChart(cast.bits, cast.moving, fp.day.gan, fp.day.zhi)
  const keyNotes = buildKeyNotes(chart, fp.day.gan, fp.day.zhi)
  const jieGua = buildJieGua(chart)

  const ganzhi = {
    year: `${fp.year.gan}${fp.year.zhi}年`,
    month: `${fp.month.gan}${fp.month.zhi}月`,
    day: `${fp.day.gan}${fp.day.zhi}日`,
    hour: `${fp.hour.gan}${fp.hour.zhi}时`,
  }
  const kw = (gan: string, zhi: string) => kongWangOf(gan, zhi).join("")
  const kongwang = {
    year: kw(fp.year.gan, fp.year.zhi),
    month: kw(fp.month.gan, fp.month.zhi),
    day: kw(fp.day.gan, fp.day.zhi),
    hour: kw(fp.hour.gan, fp.hour.zhi),
  }

  const guaci = [
    { name: `本卦：${chart.benShort}`, text: [GUA_CI[chart.benShort] || ""] },
    { name: `变卦：${chart.bianShort}`, text: [GUA_CI[chart.bianShort] || ""] },
  ]

  return { chart, keyNotes, jieGua, ganzhi, kongwang, guaci, fp, lunar: lunarMD(input.year, input.month, input.day) }
}

// ─── 农历月日（Intl，与小六壬同方案）───
const CN_MONTH = ["", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"]
const CN_DAY = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]
export function lunarMD(year: number, month: number, day: number): { m: number; d: number; text: string } {
  try {
    const date = new Date(year, month - 1, day)
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "numeric", day: "numeric" }).formatToParts(date)
    const mPart = parts.find((p) => p.type === "month")?.value || "1"
    const dPart = parts.find((p) => p.type === "day")?.value || "1"
    const isLeap = mPart.includes("闰")
    const m = Number.parseInt(mPart.replace(/\D/g, ""), 10) || 1
    const d = Number.parseInt(dPart.replace(/\D/g, ""), 10) || 1
    return { m, d, text: `${isLeap ? "闰" : ""}${CN_MONTH[m]}${CN_DAY[d] || d}` }
  } catch {
    return { m: month, d: day, text: "" }
  }
}
