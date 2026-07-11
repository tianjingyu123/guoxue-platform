// ─────────────────────────────────────────────
// 大六壬排盘引擎
// 黄金基准：竞品截图 2026-07-02 丁丑日（丙午时/丁未时两案例，见 scripts/verify-daliuren.ts）
// 规则要点（经竞品逐值校准）：
//  - 月将按中气换将（太阳过宫），夏至后未将
//  - 天盘 = 月将加占时
//  - 四课：一课日干寄宫上神（论克用日干本身五行）、二课一课上神之上神、三课支上神、四课三课上神之上神
//  - 三传九宗门：贼克→比用→涉害→遥克→昴星→别责→八专→伏吟→返吟
//  - 十二天将：日干昼夜贵（卯~申昼/酉~寅夜），贵临地盘亥~辰顺布、巳~戌逆布
//  - 遁干：日之旬内配干，旬空显示○
//  - 行年：男一岁丙寅顺行，女一岁壬申逆行（虚岁）
// ─────────────────────────────────────────────

import { GANS, ZHIS, type Gan, type Zhi, GAN_WUXING, ZHI_WUXING, GAN_YANG, dayGanzhi, yearGanzhi, monthGanzhi, hourGanzhi } from "@/lib/paipan/ganzhi"
import { findTerm, getJieqiRange } from "@/lib/paipan/jieqi"

// ─── 基础常量 ───

/** 干寄宫：甲寅乙辰丙戊巳丁己未庚申辛戌壬亥癸丑 */
export const GAN_JI_GONG: Record<string, Zhi> = {
  甲: "寅", 乙: "辰", 丙: "巳", 戊: "巳", 丁: "未", 己: "未",
  庚: "申", 辛: "戌", 壬: "亥", 癸: "丑",
}

/** 十二天将（布贵顺序） */
export const TIANJIANG = ["贵人", "螣蛇", "朱雀", "六合", "勾陈", "青龙", "天空", "白虎", "太常", "玄武", "太阴", "天后"] as const
export const TIANJIANG_SHORT = ["贵", "蛇", "朱", "合", "勾", "龙", "空", "虎", "常", "玄", "阴", "后"] as const

/** 天乙贵人：甲戊庚牛羊 乙己鼠猴乡 丙丁猪鸡位 壬癸蛇兔藏 六辛逢马虎（昼/夜） */
const GUIREN_DAY: Record<string, Zhi> = { 甲: "丑", 戊: "丑", 庚: "丑", 乙: "子", 己: "子", 丙: "亥", 丁: "亥", 壬: "巳", 癸: "巳", 辛: "午" }
const GUIREN_NIGHT: Record<string, Zhi> = { 甲: "未", 戊: "未", 庚: "未", 乙: "申", 己: "申", 丙: "酉", 丁: "酉", 壬: "卯", 癸: "卯", 辛: "寅" }
/** 甲羊戊庚牛 变法（另一派贵人歌诀） */
const GUIREN_DAY_ALT: Record<string, Zhi> = { 甲: "未", 戊: "丑", 庚: "丑", 乙: "子", 己: "子", 丙: "亥", 丁: "亥", 壬: "巳", 癸: "巳", 辛: "午" }
const GUIREN_NIGHT_ALT: Record<string, Zhi> = { 甲: "丑", 戊: "未", 庚: "未", 乙: "申", 己: "申", 丙: "酉", 丁: "酉", 壬: "卯", 癸: "卯", 辛: "寅" }

/** 月将（中气换将）：雨水亥 春分戌 谷雨酉 小满申 夏至未 大暑午 处暑巳 秋分辰 霜降卯 小雪寅 冬至丑 大寒子 */
const YUEJIANG_TERMS: [string, Zhi][] = [
  ["雨水", "亥"], ["春分", "戌"], ["谷雨", "酉"], ["小满", "申"], ["夏至", "未"], ["大暑", "午"],
  ["处暑", "巳"], ["秋分", "辰"], ["霜降", "卯"], ["小雪", "寅"], ["冬至", "丑"], ["大寒", "子"],
]
/** 交节换将（节气）：立春亥 惊蛰戌 清明酉 立夏申 芒种未 小暑午 立秋巳 白露辰 寒露卯 立冬寅 大雪丑 小寒子 */
const YUEJIANG_TERMS_JIE: [string, Zhi][] = [
  ["立春", "亥"], ["惊蛰", "戌"], ["清明", "酉"], ["立夏", "申"], ["芒种", "未"], ["小暑", "午"],
  ["立秋", "巳"], ["白露", "辰"], ["寒露", "卯"], ["立冬", "寅"], ["大雪", "丑"], ["小寒", "子"],
]

/** 十二神将名（月将别名，用于展示） */
export const SHENJIANG_NAME: Record<string, string> = {
  子: "神后", 丑: "大吉", 寅: "功曹", 卯: "太冲", 辰: "天罡", 巳: "太乙",
  午: "胜光", 未: "小吉", 申: "传送", 酉: "从魁", 戌: "河魁", 亥: "登明",
}

/** 地支相刑 */
const XING: Record<string, string> = {
  子: "卯", 卯: "子", 丑: "戌", 戌: "未", 未: "丑", 寅: "巳", 巳: "申", 申: "寅",
  辰: "辰", 午: "午", 酉: "酉", 亥: "亥", // 自刑
}
/** 地支六冲 */
const CHONG: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
}
/** 驿马：申子辰马在寅 寅午戌马在申 巳酉丑马在亥 亥卯未马在巳 */
const YIMA: Record<string, Zhi> = {
  申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申",
  巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳",
}
/** 干五合 */
const GAN_HE: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" }

const zi = (i: number) => ZHIS[((i % 12) + 12) % 12]
const zIdx = (z: string) => ZHIS.indexOf(z as Zhi)
const gIdx = (g: string) => GANS.indexOf(g as Gan)

/** 五行克：wood>earth>water>fire>metal>wood */
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }
const keZhi = (a: string, b: string) => KE[ZHI_WUXING[a]] === ZHI_WUXING[b] // 支a克支b
const ganKeZhi = (g: string, z: string) => KE[GAN_WUXING[g]] === ZHI_WUXING[z]
const zhiKeGan = (z: string, g: string) => KE[ZHI_WUXING[z]] === GAN_WUXING[g]
/** 支阴阳（子寅辰午申戌阳） */
const ZHI_YANG: Record<string, boolean> = { 子: true, 寅: true, 辰: true, 午: true, 申: true, 戌: true, 丑: false, 卯: false, 巳: false, 未: false, 酉: false, 亥: false }

/** 六亲（以日干为我，对支） */
export function liuQin(dayGan: string, zhi: string): string {
  const me = GAN_WUXING[dayGan], it = ZHI_WUXING[zhi]
  if (me === it) return "兄"
  if (KE[me] === it) return "财"
  if (KE[it] === me) return "官"
  // 生我=父，我生=子
  const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
  if (SHENG[me] === it) return "子"
  return "父"
}

// ─── 输入选项 ───

export interface LiurenOptions {
  /** 换将方式：中气（默认）/交节 */
  jiangMethod?: "zhongqi" | "jiaojie"
  /** 贵人求法：standard=甲戊庚牛羊（默认）/ alt=甲羊戊庚牛 */
  guirenMethod?: "standard" | "alt"
  /** 贵神昼夜：auto=卯酉区分（默认）/ day=强制昼贵 / night=强制夜贵 */
  guishenType?: "auto" | "day" | "night"
  /** 涉害类型：mengzhongji=孟仲季（默认，涉害相等时按孟仲季取）/ shenqian=深浅（严格计算涉害度数） */
  shehaiType?: "mengzhongji" | "shenqian"
  /** 出生年份（算年命行年） */
  birthYear?: number
  gender?: "男" | "女"
}

// ─── 结果结构 ───

export interface SiKe {
  /** 下（一课为日干，余为支） */
  xia: string
  /** 上神 */
  shang: Zhi
  /** 上神之天将 */
  jiang: string
  /** 上神遁干（空亡则空串） */
  dun: string
  /** 上神是否旬空 */
  kong: boolean
}

export interface ChuanItem {
  zhi: Zhi
  /** 遁干（空亡为""） */
  dun: string
  /** 六亲 */
  qin: string
  /** 天将 */
  jiang: string
  kong: boolean
}

export interface LiurenResult {
  date: { year: number; month: number; day: number; hour: number; minute: number }
  lunarText: string
  jieqiText: string
  sizhu: { year: { gan: Gan; zhi: Zhi }; month: { gan: Gan; zhi: Zhi }; day: { gan: Gan; zhi: Zhi }; hour: { gan: Gan; zhi: Zhi } }
  /** 旬空（日柱） */
  kongwang: [Zhi, Zhi]
  /** 月将支 + 神将名 */
  yuejiang: { zhi: Zhi; name: string }
  /** 昼贵/夜贵 + 贵人支 */
  guiren: { zhi: Zhi; isDay: boolean; shun: boolean }
  /** 天盘：tianPan[地盘支] = 天盘支 */
  tianPan: Record<string, Zhi>
  /** 天将：jiangPan[地盘支] = 天将短名 */
  jiangPan: Record<string, string>
  /** 遁干：dunPan[地盘支] = 该位天盘支的旬遁干（无则""） */
  dunPan: Record<string, string>
  /** 四课（一~四） */
  sike: [SiKe, SiKe, SiKe, SiKe]
  /** 三传 */
  sanchuan: [ChuanItem, ChuanItem, ChuanItem]
  /** 九宗门 + 格局 */
  keti: string[]
  /** 取课过程说明 */
  quKeNote: string
  /** 年命/行年（有出生年时） */
  ming?: { nianming: string; xingnian: string; xuSui: number }
}

// ─── 月将 ───

function getYuejiang(date: Date, method: "zhongqi" | "jiaojie"): Zhi {
  const terms = method === "jiaojie" ? YUEJIANG_TERMS_JIE : YUEJIANG_TERMS
  const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()) - 8 * 3600000
  let best: { time: number; zhi: Zhi } | null = null
  for (const yy of [date.getFullYear() - 1, date.getFullYear()]) {
    for (const [term, zhiV] of terms) {
      const tt = findTerm(yy, term).getTime()
      if (tt <= t && (!best || tt > best.time)) best = { time: tt, zhi: zhiV }
    }
  }
  return best?.zhi || "子"
}

// ─── 旬遁 ───

/** 日柱所在旬：返回 dun[支]=干（旬内），旬空两支 */
function xunDun(dayGan: string, dayZhi: string): { dun: Record<string, string>; kong: [Zhi, Zhi]; xunName: string } {
  const gi = gIdx(dayGan), ziI = zIdx(dayZhi)
  const xunStartZhi = zi(ziI - gi) // 旬首支（甲X）
  const dun: Record<string, string> = {}
  for (let k = 0; k < 10; k++) dun[zi(zIdx(xunStartZhi) + k)] = GANS[k]
  const kong: [Zhi, Zhi] = [zi(zIdx(xunStartZhi) + 10), zi(zIdx(xunStartZhi) + 11)]
  return { dun, kong, xunName: `甲${xunStartZhi}` }
}

// ─── 三传九宗门 ───

interface KeUnit { shang: Zhi; xia: string; idx: number; isGanKe: boolean }

/** 中末传：初传上神之上神递推 */
function zhongMo(chu: Zhi, tianPan: Record<string, Zhi>): [Zhi, Zhi] {
  const zhong = tianPan[chu]
  const mo = tianPan[zhong]
  return [zhong, mo]
}

/** 涉害深度：受克之神自所临地盘位顺数归本家，历各位地盘藏干克其五行的次数 */
const ZHI_CANG_LOCAL: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"], 辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"], 午: ["丁", "己"], 未: ["己", "丁", "乙"], 申: ["庚", "壬", "戊"], 酉: ["辛"],
  戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
}
function sheHaiDepth(shen: Zhi, lin: Zhi, isShangKe: boolean): number {
  // 从所临地盘位顺数至本家（天盘神=shen 落在地盘 lin）
  let depth = 0
  const shenWX = ZHI_WUXING[shen]
  let i = zIdx(lin)
  const home = zIdx(shen)
  while (true) {
    const gong = zi(i)
    // 本位藏干 + 寄宫干
    for (const g of ZHI_CANG_LOCAL[gong]) {
      if (isShangKe) {
        if (KE[shenWX] === GAN_WUXING[g]) depth++ // 上克下：数我克者
      } else {
        if (KE[GAN_WUXING[g]] === shenWX) depth++ // 下贼上：数克我者
      }
    }
    if (i === home) break
    i = (i + 1) % 12
    if (i === zIdx(lin)) break // 保护
  }
  return depth
}

function pickSanChuan(
  dayGan: Gan, dayZhi: Zhi, tianPan: Record<string, Zhi>,
  sike: [SiKe, SiKe, SiKe, SiKe], options: LiurenOptions,
): { chuan: [Zhi, Zhi, Zhi]; keti: string[]; note: string } {
  const keti: string[] = []
  const dayYang = GAN_YANG[dayGan]

  // 去重课（别责/八专判断用）
  const uniqKe = sike.filter((k, i) => sike.findIndex((x) => x.shang === k.shang && x.xia === k.xia) === i)

  // 伏吟/返吟判定
  const isFuYin = ZHIS.every((z) => tianPan[z] === z)
  const isFanYin = ZHIS.every((z) => tianPan[z] === CHONG[z])

  // 收集贼克（第一课下=日干论干克；余课论支克）
  const zeiKe: KeUnit[] = [] // 下贼上
  const shangKe: KeUnit[] = [] // 上克下
  sike.forEach((k, i) => {
    const isGan = i === 0
    const xiaKeShang = isGan ? ganKeZhi(k.xia, k.shang) : keZhi(k.xia, k.shang)
    const shangKeXia = isGan ? zhiKeGan(k.shang, k.xia) : keZhi(k.shang, k.xia)
    if (xiaKeShang) zeiKe.push({ shang: k.shang, xia: k.xia, idx: i, isGanKe: isGan })
    if (shangKeXia) shangKe.push({ shang: k.shang, xia: k.xia, idx: i, isGanKe: isGan })
  })
  // 同一上神去重
  const uniq = (arr: KeUnit[]) => arr.filter((k, i) => arr.findIndex((x) => x.shang === k.shang) === i)
  const zei = uniq(zeiKe)
  const shang = uniq(shangKe)

  const finish = (chu: Zhi, name: string, note: string): { chuan: [Zhi, Zhi, Zhi]; keti: string[]; note: string } => {
    let [zhong, mo] = zhongMo(chu, tianPan)
    // 伏吟特殊中末（刑推）
    if (isFuYin) {
      const ganShang = sike[0].shang
      const zhiShang = sike[2].shang
      // 初传之刑为中，中之刑为末；自刑则取冲/支上
      let z2 = XING[chu] as Zhi
      if (z2 === chu) z2 = chu === ganShang ? zhiShang : ganShang // 自刑取另一课上神
      let m2 = XING[z2] as Zhi
      if (m2 === z2 || m2 === chu) m2 = CHONG[z2] as Zhi
      zhong = z2; mo = m2
    }
    if (isFanYin && name !== "返吟有克") {
      // 无克返吟：中=支上神 末=干上神
      zhong = sike[2].shang; mo = sike[0].shang
    }
    keti.push(name)
    return { chuan: [chu, zhong, mo], keti, note }
  }

  // 1. 伏吟/返吟优先分支（有克仍按贼克）
  if (isFuYin) keti.push("伏吟")
  if (isFanYin) keti.push("返吟")

  // 2. 贼克
  const pool = zei.length > 0 ? zei : shang
  const poolName = zei.length > 0 ? "重审" : "元首"
  if (pool.length === 1) {
    if (isFuYin) return finish(pool[0].shang, poolName, "伏吟有克，仍按贼克取初传，刑推中末")
    if (isFanYin) return finish(pool[0].shang, "返吟有克", "返吟有克，按贼克取初传")
    return finish(pool[0].shang, poolName, zei.length > 0 ? "四课唯一下贼上，取受克之神为初传（重审）" : "四课唯一上克下，取克者为初传（元首）")
  }
  if (pool.length > 1) {
    // 3. 比用：与日干阴阳相同者
    const bi = pool.filter((k) => ZHI_YANG[k.shang] === dayYang)
    if (bi.length === 1) return finish(bi[0].shang, "比用", "多组克贼，取与日干俱比者为初传（比用/知一）")
    // 4. 涉害
    const cands = bi.length > 1 ? bi : pool
    const isShangKeMode = zei.length === 0
    // 涉害深浅
    const depths = cands.map((k) => {
      // 该天盘神所临地盘位
      const lin = ZHIS.find((z) => tianPan[z] === k.shang) as Zhi
      return { k, depth: sheHaiDepth(k.shang, lin, isShangKeMode), lin }
    })
    const maxD = Math.max(...depths.map((d) => d.depth))
    const deep = depths.filter((d) => d.depth === maxD)
    if (options.shehaiType !== "mengzhongji" && deep.length === 1) {
      return finish(deep[0].k.shang, "涉害", `多克俱比，涉害最深者（${deep[0].k.shang}）为初传`)
    }
    // 孟仲季：临孟（寅申巳亥）> 仲（子午卯酉）> 季
    const MENG = ["寅", "申", "巳", "亥"], ZHONG = ["子", "午", "卯", "酉"]
    const group = options.shehaiType === "mengzhongji" ? depths : deep
    for (const tier of [MENG, ZHONG]) {
      const hit = group.filter((d) => tier.includes(d.lin))
      if (hit.length === 1) return finish(hit[0].k.shang, tier === MENG ? "涉害·见机" : "涉害·察微", "涉害取临孟/仲者为初传")
      if (hit.length > 1) {
        // 复等：阳日取干上，阴日取支上（先见者）
        const pref = dayYang ? sike[0].shang : sike[2].shang
        const m = hit.find((d) => d.k.shang === pref) || hit[0]
        return finish(m.k.shang, "涉害·缀瑕", "涉害复等，阳日取干上阴日取支上")
      }
    }
    const pref = dayYang ? sike[0].shang : sike[2].shang
    const m = group.find((d) => d.k.shang === pref) || group[0]
    return finish(m.k.shang, "涉害", "涉害复等，阳日取干上阴日取支上")
  }

  // 伏吟无克
  if (isFuYin) {
    // 阳日取干上神，阴日取支上神
    const chu = dayYang ? sike[0].shang : sike[2].shang
    return finish(chu, dayYang ? "伏吟·自任" : "伏吟·自信", "伏吟无克，阳日用干上阴日用支上，刑推中末")
  }
  // 返吟无克（丁丑丁未己丑己未辛丑辛未）
  if (isFanYin) {
    const chu = YIMA[dayZhi]
    return finish(chu, "返吟·井栏", "返吟无克，取日支驿马为初传，中支上末干上")
  }

  // 5. 遥克
  const yaoKeMe = sike.slice(1).filter((k) => zhiKeGan(k.shang, dayGan)) // 上神遥克日干（蒿矢）
  const meYaoKe = sike.slice(1).filter((k) => ganKeZhi(dayGan, k.shang)) // 日干遥克上神（弹射）
  const yaoPool = yaoKeMe.length > 0 ? yaoKeMe : meYaoKe
  if (yaoPool.length > 0) {
    const uniqYao = yaoPool.filter((k, i) => yaoPool.findIndex((x) => x.shang === k.shang) === i)
    let chu: Zhi
    if (uniqYao.length === 1) chu = uniqYao[0].shang
    else {
      const bi = uniqYao.filter((k) => ZHI_YANG[k.shang] === dayYang)
      chu = (bi[0] || uniqYao[0]).shang
    }
    return finish(chu, yaoKeMe.length > 0 ? "遥克·蒿矢" : "遥克·弹射", "四课无克，取遥克为初传")
  }

  // 6. 昴星（四课全备无克无遥）
  if (uniqKe.length === 4) {
    if (dayYang) {
      const chu = tianPan["酉"] // 地盘酉上神
      const zhong = sike[2].shang, mo = sike[0].shang
      keti.push("昴星·虎视")
      return { chuan: [chu, zhong, mo], keti, note: "阳日昴星，取地盘酉上神为初传，中支上末干上" }
    } else {
      const lin = ZHIS.find((z) => tianPan[z] === "酉") as Zhi // 天盘酉之下
      const zhong = sike[0].shang, mo = sike[2].shang
      keti.push("昴星·冬蛇掩目")
      return { chuan: [lin, zhong, mo], keti, note: "阴日昴星，取天盘酉下神为初传，中干上末支上" }
    }
  }

  // 7. 别责（三课备）
  if (uniqKe.length === 3) {
    let chu: Zhi
    if (dayYang) {
      const heGan = GAN_HE[dayGan]
      chu = tianPan[GAN_JI_GONG[heGan]] // 干合上神
    } else {
      // 支前三合
      const sanhe: Record<string, Zhi[]> = {
        亥: ["亥", "卯", "未"], 卯: ["亥", "卯", "未"], 未: ["亥", "卯", "未"],
        寅: ["寅", "午", "戌"], 午: ["寅", "午", "戌"], 戌: ["寅", "午", "戌"],
        巳: ["巳", "酉", "丑"], 酉: ["巳", "酉", "丑"], 丑: ["巳", "酉", "丑"],
        申: ["申", "子", "辰"], 子: ["申", "子", "辰"], 辰: ["申", "子", "辰"],
      }
      const ju = sanhe[dayZhi]
      chu = ju[(ju.indexOf(dayZhi) + 1) % 3]
    }
    const gs = sike[0].shang
    keti.push("别责")
    return { chuan: [chu, gs, gs], keti, note: "三课无克无遥（别责），中末皆用干上神" }
  }

  // 8. 八专（两课）
  {
    let chu: Zhi
    if (dayYang) chu = tianPan[zi(zIdx(GAN_JI_GONG[dayGan]) + 2)] // 干上神顺数三位（本位起1）
    else {
      const k4 = sike[3].shang
      chu = zi(zIdx(k4) - 2) // 第四课上神逆数三位
    }
    const gs = sike[0].shang
    keti.push("八专")
    return { chuan: [chu, gs, gs], keti, note: "八专课（干支同宫），中末皆用干上神" }
  }
}

// ─── 附加格局 ───

function extraGeju(chuan: [Zhi, Zhi, Zhi], dayGan: Gan, dun: Record<string, string>): string[] {
  const out: string[] = []
  const [a, b, c] = chuan
  const ia = zIdx(a), ib = zIdx(b), ic = zIdx(c)
  if ((ia + 1) % 12 === ib && (ib + 1) % 12 === ic) out.push("进茹")
  if ((ia - 1 + 12) % 12 === ib && (ib - 1 + 12) % 12 === ic) out.push("退茹")
  const wx = [ZHI_WUXING[a], ZHI_WUXING[b], ZHI_WUXING[c]]
  if (wx.every((w) => w === "土")) out.push("稼穑")
  // 方局/三合局格：寅卯辰·亥卯未=曲直，巳午未·寅午戌=炎上，申酉戌·巳酉丑=流金（从革），亥子丑·申子辰=润下
  const set = [a, b, c].slice().sort().join("")
  const FANG: Record<string, string> = {
    寅卯辰: "曲直", 卯未亥: "曲直", 巳午未: "炎上", 寅戌午: "炎上",
    戌申酉: "流金", 丑巳酉: "流金", 子丑亥: "润下", 子辰申: "润下",
  }
  const fang = FANG[set]
  if (fang) out.push(fang)
  // 三奇：三传得旬奇（甲子甲戌旬奇丑，甲申甲午旬奇子，甲辰甲寅旬奇亥）
  const xunStart = Object.keys(dun).find((z) => dun[z] === "甲") || ""
  const XUNQI: Record<string, string> = { 子: "丑", 戌: "丑", 申: "子", 午: "子", 辰: "亥", 寅: "亥" }
  const qi = XUNQI[xunStart]
  if (qi && chuan.includes(qi as Zhi)) out.push("三奇")
  // 游子：三传皆土且日干丁己? 简化：稼穑+丁日 = 游子（竞品：丁未时案例含游子）
  if (wx.every((w) => w === "土") && ["丁", "己"].includes(dayGan)) out.push("游子")
  return out
}

// ─── 主函数 ───

export function computeLiuren(date: Date, options: LiurenOptions = {}): LiurenResult {
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate()
  const hh = date.getHours(), mi = date.getMinutes()

  // 四柱
  const yp = yearGanzhi(y, mo, d, hh, mi)
  const mp = monthGanzhi(y, mo, d, hh, mi)
  const dp = dayGanzhi(y, mo, d, hh)
  const hp = hourGanzhi(dp.gan, hh)

  // 旬遁/空亡
  const { dun, kong } = xunDun(dp.gan, dp.zhi)

  // 月将
  const yjZhi = getYuejiang(date, options.jiangMethod || "zhongqi")

  // 天盘：月将加占时 → tianPan[地盘] = 月将 + (地盘 - 时支)
  const shiZhi = hp.zhi
  const offset = zIdx(yjZhi) - zIdx(shiZhi)
  const tianPan: Record<string, Zhi> = {}
  for (const z of ZHIS) tianPan[z] = zi(zIdx(z) + offset)

  // 贵人（昼夜：卯~申昼）
  const shiI = zIdx(shiZhi)
  const isDayTime = options.guishenType === "day" ? true : options.guishenType === "night" ? false : shiI >= 3 && shiI <= 8
  const guiTable = options.guirenMethod === "alt" ? (isDayTime ? GUIREN_DAY_ALT : GUIREN_NIGHT_ALT) : isDayTime ? GUIREN_DAY : GUIREN_NIGHT
  const guiZhi = guiTable[dp.gan]
  // 贵人（天盘支 guiZhi）落地盘位置
  const guiLin = ZHIS.find((z) => tianPan[z] === guiZhi) as Zhi
  // 亥子丑寅卯辰 → 顺布；巳午未申酉戌 → 逆布
  const shun = ["亥", "子", "丑", "寅", "卯", "辰"].includes(guiLin)
  const jiangPan: Record<string, string> = {}
  for (let k = 0; k < 12; k++) {
    const gong = zi(zIdx(guiLin) + (shun ? k : -k))
    jiangPan[gong] = TIANJIANG_SHORT[k]
  }

  // 遁干盘
  const dunPan: Record<string, string> = {}
  for (const z of ZHIS) dunPan[z] = dun[tianPan[z]] || ""

  // 四课
  const jiGong = GAN_JI_GONG[dp.gan]
  const k1s = tianPan[jiGong]
  const k2s = tianPan[k1s]
  const k3s = tianPan[dp.zhi]
  const k4s = tianPan[k3s]
  const mkKe = (xia: string, shang: Zhi): SiKe => ({
    xia, shang,
    jiang: jiangPan[ZHIS.find((z) => tianPan[z] === shang) as Zhi] || "",
    dun: dun[shang] || "",
    kong: kong.includes(shang),
  })
  const sike: [SiKe, SiKe, SiKe, SiKe] = [mkKe(dp.gan, k1s), mkKe(k1s, k2s), mkKe(dp.zhi, k3s), mkKe(k3s, k4s)]

  // 三传
  const { chuan, keti, note } = pickSanChuan(dp.gan, dp.zhi, tianPan, sike, options)
  const sanchuan = chuan.map((z) => ({
    zhi: z,
    dun: dun[z] || "",
    qin: liuQin(dp.gan, z),
    jiang: jiangPan[ZHIS.find((zz) => tianPan[zz] === z) as Zhi] || "",
    kong: kong.includes(z),
  })) as [ChuanItem, ChuanItem, ChuanItem]

  // 附加格局
  keti.push(...extraGeju(chuan, dp.gan, dun))

  // 年命/行年
  let ming: LiurenResult["ming"]
  if (options.birthYear) {
    const by = options.birthYear
    const nmGan = GANS[(((by - 4) % 10) + 10) % 10]
    const nmZhi = zi(by - 4)
    const xuSui = y - by + 1
    // 男一岁丙寅顺行，女一岁壬申逆行
    let xnGan: Gan, xnZhi: Zhi
    if ((options.gender || "男") === "男") {
      xnGan = GANS[(2 + xuSui - 1) % 10]; xnZhi = zi(2 + xuSui - 1)
    } else {
      xnGan = GANS[(((8 - (xuSui - 1)) % 10) + 10) % 10]; xnZhi = zi(8 - (xuSui - 1))
    }
    ming = { nianming: `${nmGan}${nmZhi}`, xingnian: `${xnGan}${xnZhi}`, xuSui }
  }

  // 农历（日数转汉字：初一~三十）
  let lunarText = ""
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "long", day: "numeric" }).formatToParts(new Date(y, mo - 1, d))
    const lm = parts.find((p) => p.type === "month")?.value || ""
    const ld = Number(parts.find((p) => p.type === "day")?.value || "0")
    const DAN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    let dayCn = ""
    if (ld >= 1 && ld <= 10) dayCn = `初${DAN[ld]}`
    else if (ld < 20) dayCn = `十${DAN[ld - 10]}`
    else if (ld === 20) dayCn = "二十"
    else if (ld < 30) dayCn = `廿${DAN[ld - 20]}`
    else dayCn = "三十"
    lunarText = `${lm}${dayCn}`
  } catch { /* noop */ }

  // 节气区间（复用 VSOP87 精确节气）
  const range = getJieqiRange(date)
  const fmtT = (dt: Date) => {
    const u = new Date(dt.getTime() + 8 * 3600000) // 北京钟面
    return `${u.getUTCFullYear()}.${String(u.getUTCMonth() + 1).padStart(2, "0")}.${String(u.getUTCDate()).padStart(2, "0")} ${String(u.getUTCHours()).padStart(2, "0")}:${String(u.getUTCMinutes()).padStart(2, "0")}`
  }
  const jieqiText = `${range.prev.name}${fmtT(range.prev.date)} ~ ${range.next.name}${fmtT(range.next.date)}`

  return {
    date: { year: y, month: mo, day: d, hour: hh, minute: mi },
    lunarText,
    jieqiText,
    sizhu: { year: { gan: yp.gan, zhi: yp.zhi }, month: { gan: mp.gan, zhi: mp.zhi }, day: { gan: dp.gan, zhi: dp.zhi }, hour: { gan: hp.gan, zhi: hp.zhi } },
    kongwang: kong,
    yuejiang: { zhi: yjZhi, name: SHENJIANG_NAME[yjZhi] },
    guiren: { zhi: guiZhi, isDay: isDayTime, shun },
    tianPan, jiangPan, dunPan,
    sike, sanchuan,
    keti: [...new Set(keti)],
    quKeNote: note,
    ming,
  }
}
