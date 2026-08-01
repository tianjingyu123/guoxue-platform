// ─────────────────────────────────────────────────────────────
// 八字合盘真实引擎：复用 computeBazi 排双人四柱，
// 干支合冲刑害规则化比对 + 五行互补 + 场景化十神 + 神煞互参。
// 判分为确定性规则模型；断语由规则命中项模板化组装，
// 古籍引文取自内置语料（三命通会/渊海子平/子平真诠/滴天髓/协纪辨方书）。
// ─────────────────────────────────────────────────────────────

import { computeBazi, type BaziData } from "./bazi-engine"
import type {
  HepanResult,
  HepanPerson,
  HepanAspect,
  PillarLink,
  SourcedItem,
  GudianRef,
} from "./hepan-data"

const ZHIS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const GAN_WX: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
}
const ZHI_WX: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
}
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }

/* ============ 干支关系表 ============ */

/** 天干五合：甲己土 乙庚金 丙辛水 丁壬木 戊癸火 */
const GAN_HE: Record<string, [string, string]> = {
  甲己: ["土", "中正之合"], 乙庚: ["金", "仁义之合"], 丙辛: ["水", "威制之合"],
  丁壬: ["木", "淫慝之合"], 戊癸: ["火", "无情之合"],
}
function ganHe(a: string, b: string): [string, string] | null {
  return GAN_HE[a + b] ?? GAN_HE[b + a] ?? null
}
/** 天干四冲（金木水火交战） */
const GAN_CHONG = new Set(["甲庚", "庚甲", "乙辛", "辛乙", "丙壬", "壬丙", "丁癸", "癸丁"])

/** 地支六合 */
const ZHI_LIUHE: Record<string, string> = {
  子丑: "土", 寅亥: "木", 卯戌: "火", 辰酉: "金", 巳申: "水", 午未: "土",
}
function zhiLiuHe(a: string, b: string): string | null {
  return ZHI_LIUHE[a + b] ?? ZHI_LIUHE[b + a] ?? null
}
/** 地支六冲 */
function zhiChong(a: string, b: string): boolean {
  return (ZHIS.indexOf(a) + 6) % 12 === ZHIS.indexOf(b)
}
/** 地支六害 */
const ZHI_HAI = new Set(["子未", "未子", "丑午", "午丑", "寅巳", "巳寅", "卯辰", "辰卯", "申亥", "亥申", "酉戌", "戌酉"])
/** 地支三刑（含自刑） */
const ZHI_XING = new Set(["寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑", "子卯", "卯子"])
const ZI_XING = new Set(["辰", "午", "酉", "亥"])
/** 三合半合（取二支同局即算半合） */
const SANHE: [string, string, string, string][] = [
  ["申", "子", "辰", "水"], ["寅", "午", "戌", "火"], ["巳", "酉", "丑", "金"], ["亥", "卯", "未", "木"],
]
function zhiBanHe(a: string, b: string): string | null {
  if (a === b) return null
  for (const [x, y, z, wx] of SANHE) {
    const set = [x, y, z]
    if (set.includes(a) && set.includes(b)) return wx
  }
  return null
}

/** 天乙贵人：日干 → 贵人支 */
const TIANYI: Record<string, string[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"],
  辛: ["午", "寅"],
}
/** 红鸾（年支起）：子见卯逆行；天喜为其对冲 */
function hongLuan(yearZhi: string): string {
  return ZHIS[(3 - ZHIS.indexOf(yearZhi) + 12) % 12]
}
function tianXi(yearZhi: string): string {
  return ZHIS[(ZHIS.indexOf(hongLuan(yearZhi)) + 6) % 12]
}

/** 日干十神（简）：以 me 日干看 other 干 */
function shiShenOf(me: string, other: string): string {
  const meWX = GAN_WX[me], oWX = GAN_WX[other]
  const meYang = "甲丙戊庚壬".includes(me), oYang = "甲丙戊庚壬".includes(other)
  const samePolar = meYang === oYang
  if (oWX === meWX) return samePolar ? "比肩" : "劫财"
  if (SHENG[oWX] === meWX) return samePolar ? "偏印" : "正印"
  if (SHENG[meWX] === oWX) return samePolar ? "食神" : "伤官"
  if (KE[meWX] === oWX) return samePolar ? "偏财" : "正财"
  return samePolar ? "七杀" : "正官"
}

/* ============ 古籍语料 ============ */

const CORPUS: Record<string, { source: string; quote: string }> = {
  ganHeJi: { source: "三命通会", quote: "甲己之合为中正之合，主人尊崇重大，宽厚平直，合中带贵，夫妇相敬。" },
  ganHeGeneric: { source: "三命通会", quote: "十干合者，阴阳相配，夫妇之道也。合则有情，其情专一。" },
  liuHe: { source: "协纪辨方书", quote: "六合者，日月合宿之辰也，主和合成就之事。" },
  sanHe: { source: "渊海子平", quote: "三合者，如人一身之运用，会局则气聚而有成。" },
  liuChong: { source: "渊海子平", quote: "六冲者，十二支战击之神也。冲则动，动则多变。" },
  liuHai: { source: "渊海子平", quote: "六害者，不和之神也。然有通关之神居中引化，则害不成害，反成生生之机。" },
  sanXing: { source: "阴符经注引", quote: "三刑者，恃势之刑、无恩之刑、无礼之刑，相处须存敬让。" },
  caiGuan: { source: "子平真诠", quote: "男以财为妻，女以官为夫。妻星夫星互见于两造日主，谓之夫妻星互得，主缘定三生。" },
  wuxingTong: { source: "滴天髓", quote: "五行贵在流通，两造相配，以彼之有余补我之不足，是为上配。" },
  tianYi: { source: "协纪辨方书", quote: "天乙者，尊贵之神也。互见者贵人相扶，百事和合。" },
  hongLuan: { source: "协纪辨方书", quote: "红鸾天喜，主婚姻喜庆之事。" },
  biJian: { source: "滴天髓", quote: "比肩同气，如兄如弟，同心之言，其利断金。" },
  yinXing: { source: "子平真诠", quote: "印者生我之谓，慈爱之星。印星有力，长幼有序，教养得宜。" },
  shangGuan: { source: "子平真诠", quote: "伤官气盛，语易伤人，柔以济之则吉。" },
}

/* ============ 单人盘构建 ============ */

export interface HepanPersonInput {
  name: string
  gender: "男" | "女"
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
}

function buildPerson(input: HepanPersonInput): { person: HepanPerson; bazi: BaziData } {
  const bazi = computeBazi({
    name: input.name,
    gender: input.gender,
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    city: input.city,
    useTrueSolar: false,
  })
  const wxOrder = ["金", "木", "水", "火", "土"]
  const pillars = [bazi.siZhu.year, bazi.siZhu.month, bazi.siZhu.day, bazi.siZhu.hour].map((p) => ({
    gan: p.gan,
    zhi: p.zhi,
  }))
  const dg = bazi.siZhu.day.gan
  const strong = bazi.yongJi.note.includes("偏强")
  return {
    bazi,
    person: {
      name: input.name || "未知",
      gender: input.gender,
      birthSolar: `${input.year}年${input.month}月${input.day}日 ${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
      birthLunar: bazi.lunarDate,
      pillars,
      zodiac: bazi.zodiac,
      dayMaster: `${dg}${GAN_WX[dg]}`,
      wuxing: wxOrder.map((w) => bazi.wuxingPower[w] ?? 0),
      summary: `${dg}${GAN_WX[dg]}日主${strong ? "偏强，有主见能担当" : "偏弱，性柔而重情义"}，${bazi.yongJi.tiaoHou}`,
    },
  }
}

/* ============ 通关检测 ============ */

/** a 支与 b 支相战（冲/害），查两盘全部地支有无通关五行。
 * 通关链允许「生入」或「比和」衔接（如申亥害：申金生子水、子水比亥水）。 */
function tongGuanZhi(zhiA: string, zhiB: string, allZhi: string[]): string | null {
  const wa = ZHI_WX[zhiA], wb = ZHI_WX[zhiB]
  const bridges = (from: string, to: string) => (z: string) => {
    const w = ZHI_WX[z]
    if (z === zhiA || z === zhiB) return false
    const inOk = SHENG[from] === w || w === from
    const outOk = SHENG[w] === to || w === to
    // 至少一端为相生（纯比和不算通关）
    return inOk && outOk && (SHENG[from] === w || SHENG[w] === to)
  }
  return allZhi.find(bridges(wa, wb)) ?? allZhi.find(bridges(wb, wa)) ?? null
}

/* ============ 主函数 ============ */

const clamp = (n: number, lo = 30, hi = 98) => Math.max(lo, Math.min(hi, Math.round(n)))

export function computeHepan(scene: string, inputA: HepanPersonInput, inputB: HepanPersonInput): HepanResult {
  const { person: pa, bazi: ba } = buildPerson(inputA)
  const { person: pb, bazi: bb } = buildPerson(inputB)
  const dgA = ba.siZhu.day.gan, dgB = bb.siZhu.day.gan
  const allZhi = [...pa.pillars, ...pb.pillars].map((p) => p.zhi)

  const pillarLinks: PillarLink[] = []
  const highlights: SourcedItem[] = []
  const risks: SourcedItem[] = []
  const gudianRefs: GudianRef[] = []

  /* ── 日柱相合 ── */
  let rizhuScore = 62
  const rizhuNotes: string[] = []
  const dayHe = ganHe(dgA, dgB)
  if (dayHe) {
    rizhuScore += 24
    pillarLinks.push({ pillarIndex: 2, label: `日干 ${dgA}${dgB}合${dayHe[0]} · ${dayHe[1]}`, luck: "good" })
    rizhuNotes.push(`两造日干${dgA}${dgB}相合（${dayHe[1]}），性情互济、越处越合`)
    highlights.push({ text: `日干${dgA}${dgB}五合，${dayHe[1]}，为合盘第一吉配`, source: CORPUS.ganHeGeneric.source, quote: CORPUS.ganHeGeneric.quote })
    gudianRefs.push({
      source: `${CORPUS.ganHeJi.source} · 论十干合`,
      quote: dgA + dgB === "甲己" || dgB + dgA === "甲己" ? CORPUS.ganHeJi.quote : CORPUS.ganHeGeneric.quote,
      note: `两造日干恰为${dgA}${dgB}相合，取「合则有情，其情专一」之应，是本盘判合的首要依据。`,
    })
  } else if (GAN_CHONG.has(dgA + dgB)) {
    rizhuScore -= 12
    pillarLinks.push({ pillarIndex: 2, label: `日干 ${dgA}${dgB}相冲 · 性直易争`, luck: "bad" })
    rizhuNotes.push(`日干${dgA}${dgB}交战，主见皆强，遇事宜先听后说`)
    risks.push({ text: `日干${dgA}${dgB}相冲，观点相左时勿针锋相对`, source: CORPUS.liuChong.source, quote: CORPUS.liuChong.quote })
  } else {
    const wA = GAN_WX[dgA], wB = GAN_WX[dgB]
    if (wA === wB) { rizhuScore += 8; rizhuNotes.push(`日干同气（皆${wA}），同声相应，易生默契`) }
    else if (SHENG[wA] === wB || SHENG[wB] === wA) { rizhuScore += 12; rizhuNotes.push(`日干${wA}${wB}相生，一施一受，气机流通`) }
    else { rizhuNotes.push(`日干${wA}${wB}相制，互有约束，敬而不失`) }
  }
  const dzA = ba.siZhu.day.zhi, dzB = bb.siZhu.day.zhi
  const dayZhiHe = zhiLiuHe(dzA, dzB)
  if (dayZhiHe) {
    rizhuScore += 12
    pillarLinks.push({ pillarIndex: 2, label: `日支 ${dzA}${dzB}六合化${dayZhiHe}`, luck: "good" })
    rizhuNotes.push(`日支${dzA}${dzB}六合，同居和顺`)
  } else if (zhiChong(dzA, dzB)) {
    rizhuScore -= 16
    pillarLinks.push({ pillarIndex: 2, label: `日支 ${dzA}${dzB}相冲 · 聚少离多之嫌`, luck: "bad" })
    risks.push({ text: `日支${dzA}${dzB}相冲，同处一室宜各留空间`, source: CORPUS.liuChong.source, quote: CORPUS.liuChong.quote })
  } else if (ZHI_HAI.has(dzA + dzB)) {
    const tg = tongGuanZhi(dzA, dzB, allZhi)
    rizhuScore -= tg ? 4 : 10
    pillarLinks.push({ pillarIndex: 2, label: `日支 ${dzA}${dzB}相害${tg ? ` · ${tg}${ZHI_WX[tg]}通关可解` : ""}`, luck: tg ? "neutral" : "bad" })
  } else if (zhiBanHe(dzA, dzB)) {
    rizhuScore += 8
    pillarLinks.push({ pillarIndex: 2, label: `日支 ${dzA}${dzB}半合${zhiBanHe(dzA, dzB)}局`, luck: "good" })
  }

  /* ── 生肖相配（年支） ── */
  let sxScore = 62
  const yzA = ba.siZhu.year.zhi, yzB = bb.siZhu.year.zhi
  let sxBrief = `${pa.zodiac}${pb.zodiac}相配，年支${yzA}${yzB}无明显刑冲，平顺之配`
  let sxJudgment = `${inputA.gender === "男" ? "男" : "甲方"}属${pa.zodiac}（${yzA}）、${inputB.gender === "女" ? "女" : "乙方"}属${pb.zodiac}（${yzB}），年支无冲合刑害，属平配，吉凶取决于日柱与用神互补。`
  let sxGudian = CORPUS.sanHe
  const yearHe = zhiLiuHe(yzA, yzB)
  const yearBanHe = zhiBanHe(yzA, yzB)
  if (yearHe) {
    sxScore += 22
    sxBrief = `${yzA}${yzB}六合，生肖上等之配`
    sxJudgment = `年支${yzA}${yzB}六合化${yearHe}，生肖${pa.zodiac}${pb.zodiac}为传统合婚中的上等之配，主长辈缘和、家宅安宁。`
    sxGudian = CORPUS.liuHe
    pillarLinks.push({ pillarIndex: 0, label: `年支 ${yzA}${yzB}六合 · 生肖上配`, luck: "good" })
    highlights.push({ text: `生肖${pa.zodiac}${pb.zodiac}六合，家宅和顺、长辈缘佳`, source: CORPUS.liuHe.source, quote: CORPUS.liuHe.quote })
  } else if (yearBanHe) {
    sxScore += 14
    sxBrief = `${yzA}${yzB}同会${yearBanHe}局，生肖相扶`
    sxJudgment = `年支${yzA}${yzB}同属${yearBanHe}局三合，气类相从，主目标一致、聚而有成。`
    pillarLinks.push({ pillarIndex: 0, label: `年支 ${yzA}${yzB}会${yearBanHe}局 · 气类相从`, luck: "good" })
  } else if (zhiChong(yzA, yzB)) {
    const tg = tongGuanZhi(yzA, yzB, allZhi)
    sxScore -= tg ? 10 : 18
    sxBrief = `${yzA}${yzB}相冲${tg ? "，柱中有通关" : "，宜聚少离多式相处"}`
    sxJudgment = `年支${yzA}${yzB}六冲，传统谓之生肖对冲。${tg ? `幸两盘中${tg}${ZHI_WX[tg]}居中通关引化，冲力大减，` : ""}相处宜求同存异、勿争一时之气。`
    sxGudian = CORPUS.liuChong
    pillarLinks.push({ pillarIndex: 0, label: `年支 ${yzA}${yzB}相冲${tg ? ` · ${tg}${ZHI_WX[tg]}通关` : ""}`, luck: tg ? "neutral" : "bad" })
    risks.push({ text: `生肖${pa.zodiac}${pb.zodiac}相冲，大事多商量、小事不较真`, source: CORPUS.liuChong.source, quote: CORPUS.liuChong.quote })
  } else if (ZHI_HAI.has(yzA + yzB)) {
    const tg = tongGuanZhi(yzA, yzB, allZhi)
    sxScore -= tg ? 6 : 12
    sxBrief = `${yzA}${yzB}相害${tg ? "，柱中有解" : "，琐事勿翻旧账"}`
    sxJudgment = `年支${yzA}${yzB}相害，主日常琐事易生嫌隙。${tg ? `但两盘中${tg}${ZHI_WX[tg]}恰居其间通关（${yzA}→${tg}→${yzB}相生成链），害中有救，仅余口角之嫌。` : "相处中避免翻旧账，嫌隙自消。"}`
    sxGudian = CORPUS.liuHai
    pillarLinks.push({ pillarIndex: 0, label: `年支 ${yzA}${yzB}相害${tg ? ` · ${tg}${ZHI_WX[tg]}通关可解` : ""}`, luck: tg ? "neutral" : "bad" })
    risks.push({ text: `生肖${yzA}${yzB}相害，日常琐事勿翻旧账`, source: CORPUS.liuHai.source, quote: CORPUS.liuHai.quote })
    gudianRefs.push({
      source: `${CORPUS.liuHai.source} · 论六害`,
      quote: CORPUS.liuHai.quote,
      note: tg
        ? `年支${yzA}${yzB}相害本为减分项，但盘中${tg}${ZHI_WX[tg]}恰居其间通关引化，故此害减力大半。`
        : `年支${yzA}${yzB}相害且盘中乏通关之神，故列为相处首要提醒。`,
    })
  } else if (ZHI_XING.has(yzA + yzB) || (yzA === yzB && ZI_XING.has(yzA))) {
    sxScore -= 10
    sxBrief = `${yzA}${yzB}相刑，相处须存敬让`
    sxJudgment = `年支${yzA}${yzB}构成相刑，主性气相犯。彼此多存敬让、明确边界，则刑不为害。`
    sxGudian = CORPUS.sanXing
    pillarLinks.push({ pillarIndex: 0, label: `年支 ${yzA}${yzB}相刑 · 敬让可解`, luck: "bad" })
    risks.push({ text: `年支${yzA}${yzB}相刑，相处须存敬让、明确边界`, source: CORPUS.sanXing.source, quote: CORPUS.sanXing.quote })
  }

  /* ── 五行互补 ── */
  const wxOrder = ["金", "木", "水", "火", "土"]
  let complement = 0
  const compNotes: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = pa.wuxing[i], b = pb.wuxing[i]
    if (a < 12 && b >= 22) { complement++; compNotes.push(`甲方${wxOrder[i]}弱得乙方${wxOrder[i]}旺相济`) }
    if (b < 12 && a >= 22) { complement++; compNotes.push(`乙方${wxOrder[i]}弱得甲方${wxOrder[i]}旺相济`) }
  }
  const wxScore = clamp(58 + complement * 9, 40, 96)
  const wxBrief = complement >= 2 ? "彼此以有余补不足，互补成势" : complement === 1 ? "一处互补，气场略有相济" : "五行分布相近，共振有余互补不足"
  if (complement >= 2) {
    highlights.push({ text: "五行互补成势，同处气场相旺", source: CORPUS.wuxingTong.source, quote: CORPUS.wuxingTong.quote })
    gudianRefs.push({
      source: `${CORPUS.wuxingTong.source} · 论五行`,
      quote: CORPUS.wuxingTong.quote,
      note: `${compNotes.join("；")}，正合「以彼之有余补我之不足」之义。`,
    })
  }

  /* ── 十神关系（场景化） ── */
  const ssAB = shiShenOf(dgA, dgB) // 以甲方日干看乙方日干
  const ssBA = shiShenOf(dgB, dgA)
  let ssScore = 58
  let ssBrief = ""
  let ssJudgment = ""
  let ssGudian = CORPUS.caiGuan
  if (scene === "marriage") {
    const male = inputA.gender === "男" ? { dg: dgA, ss: ssAB } : { dg: dgB, ss: ssBA }
    const female = inputA.gender === "女" ? { dg: dgA, ss: ssAB } : { dg: dgB, ss: ssBA }
    const maleCai = male.ss.includes("财")
    const femaleGuan = female.ss.includes("官") || female.ss === "七杀"
    if (maleCai && femaleGuan) {
      ssScore += 24
      ssBrief = "男得财星为妻、女得官星为夫，夫妻星互得"
      ssJudgment = `男命${male.dg}以${GAN_WX[female.dg]}为财，女方日主正是其${male.ss}——妻星即妻；女命${female.dg}以${GAN_WX[male.dg]}为官，男方日主正是其${female.ss}——夫星即夫。两星互得，缘分名正言顺。`
      highlights.push({ text: "夫妻星互见于两造日主，缘定三生之象", source: CORPUS.caiGuan.source, quote: CORPUS.caiGuan.quote })
      gudianRefs.push({ source: `${CORPUS.caiGuan.source} · 论夫妻`, quote: CORPUS.caiGuan.quote, note: "两造日主恰构成妻星夫星互得，为本盘最难得之处。" })
    } else if (maleCai || femaleGuan) {
      ssScore += 12
      ssBrief = maleCai ? "男命得财星之配，怜妻惜内" : "女命得官星之配，敬夫重诺"
      ssJudgment = `${maleCai ? `男命以财论妻，女方日主为其${male.ss}，主疼惜爱护、财缘因妻而聚` : `女命以官论夫，男方日主为其${female.ss}，主敬重信赖`}；另一端十神虽非正配，以日常经营弥补即可。`
    } else {
      ssBrief = `互见${ssAB}/${ssBA}，非典型夫妻星配置`
      ssJudgment = `甲方视乙方为${ssAB}，乙方视甲方为${ssBA}，虽非「男财女官」正配，然十神无绝对好坏，重在用神互补与日柱情合。`
    }
  } else if (scene === "business") {
    const cai = ssAB.includes("财") || ssBA.includes("财")
    const bi = ssAB.startsWith("比") || ssBA.startsWith("比")
    ssGudian = cai ? CORPUS.caiGuan : CORPUS.biJian
    if (cai) { ssScore += 18; ssBrief = "互见财星，合作生财之象"; ssJudgment = `两造十神互见${ssAB}/${ssBA}，财星入局，主合作有利可图；财从正道，忌投机取巧。` }
    else if (bi) { ssScore += 12; ssBrief = "比肩同气，如兄如弟"; ssJudgment = `互见${ssAB}/${ssBA}，同气连枝，决策易同频；惟比肩争财，账目务必分明。`; risks.push({ text: "比肩同气亦主争财，合伙账目务必分明", source: CORPUS.biJian.source, quote: CORPUS.biJian.quote }) }
    else { ssBrief = `互见${ssAB}/${ssBA}，分工互补为宜`; ssJudgment = `十神互见${ssAB}与${ssBA}，非财比正配，宜以一主外一主内的分工化解气机差异。` }
  } else if (scene === "parent") {
    const yin = ssAB.includes("印") || ssBA.includes("印")
    const shi = ssAB.includes("食") || ssBA.includes("食") || ssAB.includes("伤") || ssBA.includes("伤")
    ssGudian = CORPUS.yinXing
    if (yin) { ssScore += 20; ssBrief = "印星入局，慈爱护持之象"; ssJudgment = `两造十神互见${ssAB}/${ssBA}，印星主慈爱教养，长幼有序，宜鼓励式引导。` }
    else if (shi) { ssScore += 12; ssBrief = "食伤流通，天真烂漫之配"; ssJudgment = `互见${ssAB}/${ssBA}，食伤主表达与才艺，亲子间宜多倾听、少压制。` }
    else { ssBrief = `互见${ssAB}/${ssBA}`; ssJudgment = `十神互见${ssAB}与${ssBA}，教养上宜刚柔并济，以身作则胜于言传。` }
  } else {
    const bi = ssAB.startsWith("比") || ssBA.startsWith("比") || ssAB === "劫财" || ssBA === "劫财"
    ssGudian = CORPUS.biJian
    if (bi) { ssScore += 16; ssBrief = "比劫同气，知交之象"; ssJudgment = `互见${ssAB}/${ssBA}，同气相求，是能同甘共苦的知交格局；惟劫财见财起意，金钱往来宜清爽。` }
    else { ssBrief = `互见${ssAB}/${ssBA}，君子之交`; ssJudgment = `十神互见${ssAB}与${ssBA}，相处平顺，贵在细水长流。` }
  }

  /* ── 神煞合参 ── */
  let shenshaScore = 55
  const ssNotes: string[] = []
  const zhisB = [bb.siZhu.year.zhi, bb.siZhu.month.zhi, bb.siZhu.day.zhi, bb.siZhu.hour.zhi]
  const zhisA = [ba.siZhu.year.zhi, ba.siZhu.month.zhi, ba.siZhu.day.zhi, ba.siZhu.hour.zhi]
  const aGuiInB = (TIANYI[dgA] ?? []).some((z) => zhisB.includes(z))
  const bGuiInA = (TIANYI[dgB] ?? []).some((z) => zhisA.includes(z))
  if (aGuiInB && bGuiInA) {
    shenshaScore += 22
    ssNotes.push("两造互为天乙贵人，一生互相扶持、逢难有救")
    pillarLinks.push({ pillarIndex: -1, label: "互见天乙贵人 · 贵人相扶", luck: "good" })
    highlights.push({ text: "互为天乙贵人，逢难有救、百事和合", source: CORPUS.tianYi.source, quote: CORPUS.tianYi.quote })
  } else if (aGuiInB || bGuiInA) {
    shenshaScore += 12
    ssNotes.push(`${aGuiInB ? "乙方柱中见甲方天乙贵人" : "甲方柱中见乙方天乙贵人"}，一方得扶`)
  }
  if (scene === "marriage") {
    const aHL = hongLuan(yzA), aTX = tianXi(yzA)
    const bHL = hongLuan(yzB), bTX = tianXi(yzB)
    const hlHit = zhisB.includes(aHL) || zhisA.includes(bHL)
    const txHit = zhisB.includes(aTX) || zhisA.includes(bTX)
    if (hlHit || txHit) {
      shenshaScore += 10
      ssNotes.push(`${hlHit ? "红鸾" : ""}${hlHit && txHit ? "、" : ""}${txHit ? "天喜" : ""}互见，情缘早定`)
      pillarLinks.push({ pillarIndex: -1, label: "红鸾天喜入盘 · 情缘之喜", luck: "good" })
    }
  }
  const shangGuanB = shiShenOf(dgB, bb.siZhu.hour.gan) === "伤官" || shiShenOf(dgB, bb.siZhu.month.gan) === "伤官"
  const shangGuanA = shiShenOf(dgA, ba.siZhu.hour.gan) === "伤官" || shiShenOf(dgA, ba.siZhu.month.gan) === "伤官"
  if (scene === "marriage" && (shangGuanA || shangGuanB)) {
    ssNotes.push(`${shangGuanA && shangGuanB ? "两造" : shangGuanA ? "甲方" : "乙方"}柱中伤官微露，口角时宜柔言相济`)
    risks.push({ text: "柱中伤官微露，口角时宜各退一步", source: CORPUS.shangGuan.source, quote: CORPUS.shangGuan.quote })
  }
  if (ssNotes.length === 0) ssNotes.push("两造神煞无突出互动，吉凶以正五行论为主")

  /* ── 组装 aspects ── */
  const aspects: HepanAspect[] = [
    {
      key: "rizhu", label: "日柱相合", score: clamp(rizhuScore),
      brief: rizhuNotes[0] ?? "日柱无明显合冲，平顺之配",
      judgment: `${rizhuNotes.join("；")}。日柱为夫妻宫/交往宫，其合冲直接主两人贴身相处之象。`,
      gudian: dayHe ? { source: CORPUS.ganHeJi.source, text: `「${CORPUS.ganHeJi.quote}」` } : { source: CORPUS.liuChong.source, text: `「${CORPUS.liuChong.quote}」` },
    },
    {
      key: "shengxiao", label: "生肖相配", score: clamp(sxScore),
      brief: sxBrief, judgment: sxJudgment,
      gudian: { source: sxGudian.source, text: `「${sxGudian.quote}」` },
    },
    {
      key: "wuxing", label: "五行互补", score: wxScore,
      brief: wxBrief,
      judgment: `甲方五行以${wxOrder[pa.wuxing.indexOf(Math.max(...pa.wuxing))]}最旺，乙方以${wxOrder[pb.wuxing.indexOf(Math.max(...pb.wuxing))]}最旺。${compNotes.length ? compNotes.join("；") + "。" : "两盘旺衰相近，宜以行事分工调剂气机。"}五行流通则气场互济，同处日久越见其效。`,
      gudian: { source: CORPUS.wuxingTong.source, text: `「${CORPUS.wuxingTong.quote}」` },
    },
    {
      key: "shishen", label: "十神关系", score: clamp(ssScore),
      brief: ssBrief, judgment: ssJudgment,
      gudian: { source: ssGudian.source, text: `「${ssGudian.quote}」` },
    },
    {
      key: "shensha", label: "神煞合参", score: clamp(shenshaScore),
      brief: ssNotes[0], judgment: `${ssNotes.join("；")}。神煞为辅证，须与正五行合参。`,
      gudian: { source: CORPUS.tianYi.source, text: `「${CORPUS.tianYi.quote}」` },
    },
  ]

  /* ── 总分与总评 ── */
  const weights: Record<string, number> = { rizhu: 0.3, shengxiao: 0.2, wuxing: 0.2, shishen: 0.2, shensha: 0.1 }
  const totalScore = clamp(aspects.reduce((s, a) => s + a.score * weights[a.key], 0), 35, 96)
  const grade = totalScore >= 85 ? "上上之配" : totalScore >= 75 ? "上乘之配" : totalScore >= 62 ? "中上之配" : totalScore >= 50 ? "中平之配" : "须多经营之配"
  const goodLinks = pillarLinks.filter((l) => l.luck === "good")
  const badLinks = pillarLinks.filter((l) => l.luck === "bad")
  const totalBrief = `${goodLinks.length ? goodLinks[0].label.replace(/ · .*$/, "") + "，" : ""}${badLinks.length ? badLinks[0].label.replace(/ · .*$/, "") + "有嫌，" : ""}综合五维判为${grade}。`

  const roleA = inputA.gender === "男" ? "男命" : "女命"
  const roleB = inputB.gender === "男" ? "男命" : "女命"
  const totalJudgment = [
    `两造日主，${dgA}${GAN_WX[dgA]}会${dgB}${GAN_WX[dgB]}${dayHe ? `，是为${dayHe[1]}` : ""}。`,
    `${roleA}${pa.summary.split("，")[0]}，${roleB === roleA ? "对方" : roleB}${pb.summary.split("，")[0]}。`,
    goodLinks.length ? `盘中${goodLinks.map((l) => l.label.replace(/ · .*$/, "")).join("、")}，此其相得处。` : "",
    badLinks.length ? `惟${badLinks.map((l) => l.label.replace(/ · .*$/, "")).join("、")}，宜各让三分以化之。` : "",
    `合参五维，判为${grade}。`,
  ].filter(Boolean).join("")

  /* ── 建议 ── */
  const advice: string[] = []
  const deficitA = wxOrder[pa.wuxing.indexOf(Math.min(...pa.wuxing))]
  const deficitB = wxOrder[pb.wuxing.indexOf(Math.min(...pb.wuxing))]
  if (scene === "marriage") {
    advice.push(`两造喜用互参：甲方${ba.yongJi.yongShen}为用、乙方${bb.yongJi.yongShen}为用，重大决策宜选相应五行当令之期`)
    advice.push(`居所布置可补两造所缺（甲方缺${deficitA}、乙方缺${deficitB}），以物象色彩调之`)
    advice.push(badLinks.length ? "盘中有冲害之处，口角时各退一步、勿翻旧账，则嫌隙自消" : "盘面和合，贵在珍惜；柴米琐事亦须留三分耐心")
  } else if (scene === "business") {
    advice.push("合伙宜立字为据，账目分明则比劫不争财")
    advice.push(`决策分工可依日主强弱：${ba.yongJi.note.includes("偏强") ? "甲方" : "乙方"}性刚宜主外拓展，另一方持重宜主内守成`)
    advice.push("重大签约择日宜避两造日柱之冲日")
  } else if (scene === "parent") {
    advice.push("教养以顺其五行天性为先，长于木火者宜引导表达，长于金水者宜鼓励沉潜")
    advice.push(`子女所缺之${inputA.gender === "男" || inputA.gender === "女" ? deficitB : deficitA}可借学习环境色彩物象补之`)
    advice.push("亲子之间，身教重于言传，印星之慈胜于官杀之威")
  } else {
    advice.push("知交之道贵在久，金钱往来宜清爽分明")
    advice.push("彼此喜用不同，相约行事可各取所长、优势互补")
    advice.push("遇纷争时忆结交初心，比劫同气、其利断金")
  }

  /* ── 古籍论合兜底（至少两条） ── */
  if (gudianRefs.length < 2) {
    gudianRefs.push({
      source: `${CORPUS.wuxingTong.source} · 论配合`,
      quote: CORPUS.wuxingTong.quote,
      note: complement >= 1 ? compNotes.join("；") + "，此为两盘互济之据。" : "两盘五行相近，互补虽有限，同气共振亦是缘分之征。",
    })
  }
  if (gudianRefs.length < 3) {
    gudianRefs.push({
      source: `${CORPUS.caiGuan.source} · 论合婚`,
      quote: CORPUS.caiGuan.quote,
      note: `本盘十神互见${ssAB}与${ssBA}，${ssBrief}。`,
    })
  }
  if (highlights.length === 0) {
    highlights.push({ text: "两造无重大刑冲，平顺即是福", source: CORPUS.wuxingTong.source, quote: CORPUS.wuxingTong.quote })
  }
  if (risks.length === 0) {
    risks.push({ text: "盘面平和，惟相处日久易生倦怠，宜常存新意", source: CORPUS.biJian.source, quote: CORPUS.biJian.quote })
  }

  return {
    scene,
    personA: pa,
    personB: pb,
    totalScore,
    totalBrief,
    totalJudgment,
    pillarLinks: pillarLinks.slice(0, 5),
    aspects,
    highlights: highlights.slice(0, 3),
    risks: risks.slice(0, 3),
    advice,
    gudianRefs: gudianRefs.slice(0, 3),
  }
}
