/**
 * 五运六气 · 前端类型与合规文案
 *
 * 运气推算与全部运/气数据表已迁至服务端（apps/server/src/modules/paipan/engine/wuyunliuqi-engine.ts），
 * 前端只经 POST /paipan/engine/wuyunliuqi 拿结果。这里只留结果类型、合规文案与一个取当令气步的查找。
 */

export type QiKey = "jueyin" | "shaoyin" | "shaoyang" | "taiyin" | "yangming" | "taiyang"

export interface QiInfo {
  key: QiKey
  /** 全称，如「厥阴风木」 */
  name: string
  /** 三阴三阳，如「厥阴」 */
  yinyang: string
  /** 气性简称，如「风」「君火」 */
  qi: string
  /** 对应五行 */
  element: string
  /** 主题色（图表标识） */
  color: string
  /** 浅色底 */
  soft: string
  /** 气候特点 */
  climate: string
  /** 易发疾病（民俗健康科普向） */
  ailments: string
  /** 养生原则 */
  principle: string
  /** 宜食 */
  favorFoods: string
  /** 应季药膳（2-3 道） */
  diets: { name: string; desc: string }[]
}

/**
 * 六气基础信息。
 * 说明：君火(少阴)与相火(少阳)同属火但分君相；风木主生发、湿土主长养、燥金主收敛、寒水主闭藏。
 */

export type YunElement = "wood" | "fire" | "earth" | "metal" | "water"

export interface YunInfo {
  key: YunElement
  element: string
  color: string
  soft: string
  /** 太过之名 */
  excessName: string
  /** 不及之名 */
  deficientName: string
  /** 太过特点 */
  excessTrait: string
  /** 不及特点 */
  deficientTrait: string
  /** 该运总体养生方向 */
  guidance: string
}

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

/** 当前所处气步序号（1-6），无匹配返回 null */
export function currentStepIndex(result: WuyunResult): number | null {
  const s = result.steps.find((x) => x.isCurrent)
  return s ? s.step : null
}

export const COMPLIANCE_TEXT =
  "本工具基于《黄帝内经》五运六气学说推演，仅供中国传统文化研习与健康科普参考，不构成任何医疗诊断或治疗建议。如有身体不适，请及时就医，切勿自行用药。"
