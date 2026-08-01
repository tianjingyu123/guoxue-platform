// ─── 五运六气 · 推算引擎 ───
// 输入年份 → 岁运(太过/不及)、司天在泉、运气相合、六气六步(主气/客气/起止节气)、客运五步
// 干支以立春分界（沿用共享 ganzhi 引擎）；六步以节气交接为界

import { yearGanzhi, GANS } from "@/lib/paipan/ganzhi"
import { jieqiTableOfYear, type JieqiMoment } from "./jieqi-engine"
import {
  QI_MAP, YUN_MAP, GAN_YUN, ZHI_SITIAN, SITIAN_ZAIQUAN,
  HOST_QI_ORDER, GUEST_QI_SEQUENCE, YUN_SHENG, STEP_BOUNDARIES,
  type QiKey, type YunElement, type QiInfo, type YunInfo,
} from "./wuyunliuqi-data"

/** 阳干为太过，阴干为不及 */
const YANG_GANS = new Set(["甲", "丙", "戊", "庚", "壬"])

export interface SuiYun {
  info: YunInfo
  /** true=太过 false=不及 */
  excess: boolean
  /** 太过/不及之专名，如「敦阜」 */
  stateName: string
  /** 太过或不及的特点描述 */
  trait: string
  /** 太过/不及标签 */
  stateLabel: string
}

export interface QiStep {
  step: number
  label: string
  /** 主气 */
  host: QiInfo
  /** 客气 */
  guest: QiInfo
  /** 客主关系：相得（相生/同气）或不相得（相克） */
  relation: "harmony" | "conflict" | "same"
  relationText: string
  startTerm: string
  endTerm: string
  /** 起止日期文本（依当年节气表） */
  dateRange: string
  /** 是否当前所处气步 */
  isCurrent: boolean
}

export interface YunStep {
  step: number
  label: string
  info: YunInfo
  excess: boolean
  stateLabel: string
}

export interface CombinationTag {
  name: string
  meaning: string
  /** 吉凶倾向：special=特殊需注意 */
  tone: "good" | "caution" | "special"
}

export interface WuyunResult {
  year: number
  ganzhi: string
  gan: string
  zhi: string
  suiyun: SuiYun
  sitian: QiInfo
  zaiquan: QiInfo
  steps: QiStep[]
  yunSteps: YunStep[]
  combinations: CombinationTag[]
  /** 全年气化总述 */
  summary: string
}

/** 五行相生：a 生 b ? */
const ELEM_SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
const ELEM_KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }

function qiRelation(host: QiInfo, guest: QiInfo): { relation: QiStep["relation"]; text: string } {
  const h = host.element
  const g = guest.element
  if (h === g) return { relation: "same", text: "客主同气，气化平和。" }
  // 客生主 或 主生客 或 同 → 相得；客克主/主克客 → 不相得
  if (ELEM_SHENG[g] === h) return { relation: "harmony", text: "客生主，相得而和，气候平顺。" }
  if (ELEM_SHENG[h] === g) return { relation: "harmony", text: "主生客，相得，气化尚顺。" }
  if (ELEM_KE[g] === h) return { relation: "conflict", text: "客克主，不相得，气候易偏胜为病。" }
  if (ELEM_KE[h] === g) return { relation: "conflict", text: "主克客，客气受制，气化不畅。" }
  return { relation: "harmony", text: "气化平和。" }
}

/** 客气六步：司天居三之气，在泉居终之气，按三阴三阳序推排 */
function guestSteps(sitian: QiKey): QiKey[] {
  const idx = GUEST_QI_SEQUENCE.indexOf(sitian)
  // 三之气 = 司天，故 step1 对应 idx-2
  const arr: QiKey[] = []
  for (let i = 0; i < 6; i++) {
    arr.push(GUEST_QI_SEQUENCE[(idx - 2 + i + 6) % 6])
  }
  return arr
}

/** 运气相合判定 */
function detectCombinations(gan: string, zhi: string, yun: YunElement, excess: boolean, sitian: QiKey, zaiquan: QiKey): CombinationTag[] {
  const tags: CombinationTag[] = []
  const yunElem = YUN_MAP[yun].element
  const sitianElem = QI_MAP[sitian].element
  const zaiquanElem = QI_MAP[zaiquan].element

  // 天符：中运之气 == 司天之气（五行相同）
  const isTianfu = yunElem === sitianElem

  // 岁会：中运之气 == 年支所属方位五行
  const ZHI_ELEM: Record<string, string> = {
    子: "水", 午: "火", 卯: "木", 酉: "金",
    辰: "土", 戌: "土", 丑: "土", 未: "土",
    寅: "木", 申: "金", 巳: "火", 亥: "水",
  }
  const isSuihui = yunElem === ZHI_ELEM[zhi] && ["子", "午", "卯", "酉", "辰", "戌", "丑", "未"].includes(zhi)

  // 太乙天符：既天符又岁会
  if (isTianfu && isSuihui) {
    tags.push({ name: "太乙天符", meaning: "天符兼岁会，三气会同，气化极盛。古称「贵人」之年，气候偏极端，需格外顺时调养。", tone: "special" })
  } else {
    if (isTianfu) tags.push({ name: "天符", meaning: "中运与司天同气，气化专一而强，主气偏盛，病来急速，宜提前顺时调摄。", tone: "special" })
    if (isSuihui) tags.push({ name: "岁会", meaning: "中运与年支方位同气，气化平和，为相对安和之年。", tone: "good" })
  }

  // 同天符：太过之运 + 中运与在泉同气（阳年）
  if (excess && yunElem === zaiquanElem) {
    tags.push({ name: "同天符", meaning: "太过之运与在泉同气，下半年气化偏盛，注意在泉之气所主脏腑。", tone: "special" })
  }
  // 同岁会：不及之运 + 中运与在泉同气（阴年）
  if (!excess && yunElem === zaiquanElem) {
    tags.push({ name: "同岁会", meaning: "不及之运与在泉同气，气化相对平和之年。", tone: "good" })
  }

  return tags
}

export function computeWuyun(year: number, now: Date = new Date()): WuyunResult {
  // 取该年立春后的年干支（以年中 6/1 保证落在本命年干支内）
  const { gan, zhi } = yearGanzhi(year, 6, 1)
  const ganzhi = `${gan}${zhi}`

  // 岁运
  const yunElem = GAN_YUN[gan]
  const excess = YANG_GANS.has(gan)
  const yunInfo = YUN_MAP[yunElem]
  const suiyun: SuiYun = {
    info: yunInfo,
    excess,
    stateName: excess ? yunInfo.excessName : yunInfo.deficientName,
    trait: excess ? yunInfo.excessTrait : yunInfo.deficientTrait,
    stateLabel: excess ? "太过" : "不及",
  }

  // 司天 / 在泉
  const sitianKey = ZHI_SITIAN[zhi]
  const zaiquanKey = SITIAN_ZAIQUAN[sitianKey]
  const sitian = QI_MAP[sitianKey]
  const zaiquan = QI_MAP[zaiquanKey]

  // 六气六步：主气固定，客气随司天
  const guestArr = guestSteps(sitianKey)

  // 节气日期：初之气始于「本年大寒」，跨至次年大寒。用本年+次年节气表拼接
  const table = jieqiTableOfYear(year)
  const nextTable = jieqiTableOfYear(year + 1)
  const findMoment = (name: string, useNext = false): JieqiMoment | undefined =>
    (useNext ? nextTable : table).find((t) => t.name === name)

  const steps: QiStep[] = STEP_BOUNDARIES.map((b, i) => {
    const host = QI_MAP[HOST_QI_ORDER[i]]
    const guest = QI_MAP[guestArr[i]]
    const rel = qiRelation(host, guest)
    // 终之气 end「大寒」属次年
    const startM = findMoment(b.start)
    const endM = b.end === "大寒" ? findMoment("大寒", true) : findMoment(b.end)
    const dateRange = startM && endM ? `${startM.dateText} — ${endM.dateText}` : `${b.start} — ${b.end}`
    // 当前气步判定
    let isCurrent = false
    if (startM && endM) {
      isCurrent = now >= startM.date && now < endM.date
    }
    return {
      step: b.step,
      label: b.label,
      host,
      guest,
      relation: rel.relation,
      relationText: rel.text,
      startTerm: b.start,
      endTerm: b.end,
      dateRange,
      isCurrent,
    }
  })

  // 客运五步：以中运为初运，五行相生轮转，太过不及交替（初运同岁运太过/不及）
  const yunSteps: YunStep[] = []
  let cur: YunElement = yunElem
  const YUN_LABELS = ["初运", "二运", "三运", "四运", "终运"]
  for (let i = 0; i < 5; i++) {
    yunSteps.push({
      step: i + 1,
      label: YUN_LABELS[i],
      info: YUN_MAP[cur],
      excess: i % 2 === 0 ? excess : !excess,
      stateLabel: (i % 2 === 0 ? excess : !excess) ? "太过" : "不及",
    })
    cur = YUN_SHENG[cur]
  }

  const combinations = detectCombinations(gan, zhi, yunElem, excess, sitianKey, zaiquanKey)

  const summary = `${ganzhi}年，${yunInfo.element}运${suiyun.stateLabel}（${suiyun.stateName}），${sitian.name}司天主上半年、${zaiquan.name}在泉主下半年。全年${sitian.climate.slice(0, 0)}上半年气化偏${sitian.qi}，下半年偏${zaiquan.qi}。${combinations.length ? `本年为${combinations.map((c) => c.name).join("、")}之年。` : ""}`

  return {
    year, ganzhi, gan, zhi, suiyun, sitian, zaiquan, steps, yunSteps, combinations, summary,
  }
}

/** 当前所处气步序号（1-6），无匹配返回 null */
export function currentStepIndex(result: WuyunResult): number | null {
  const s = result.steps.find((x) => x.isCurrent)
  return s ? s.step : null
}

/** 供 AI 摘要用的纯文本快照 */
export function wuyunTextSnapshot(r: WuyunResult): string {
  const stepLines = r.steps
    .map((s) => `${s.label}(${s.dateRange})：主气${s.host.name}、客气${s.guest.name}，${s.relationText}`)
    .join("；")
  return [
    `${r.ganzhi}年五运六气：`,
    `岁运：${r.suiyun.info.element}运${r.suiyun.stateLabel}（${r.suiyun.stateName}）——${r.suiyun.trait}`,
    `司天：${r.sitian.name}（主上半年，${r.sitian.climate}）`,
    `在泉：${r.zaiquan.name}（主下半年，${r.zaiquan.climate}）`,
    r.combinations.length ? `运气相合：${r.combinations.map((c) => `${c.name}（${c.meaning}）`).join("；")}` : "",
    `六气分步：${stepLines}`,
  ].filter(Boolean).join("\n")
}

/** 生成可选年份范围 */
export function yearRange(center: number, span = 6): number[] {
  const arr: number[] = []
  for (let y = center - span; y <= center + span; y++) arr.push(y)
  return arr
}

/** 年干支序号（用于展示天干序） */
export function ganIndex(gan: string): number {
  return GANS.indexOf(gan as (typeof GANS)[number])
}
