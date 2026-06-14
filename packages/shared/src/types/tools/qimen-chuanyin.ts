/** 奇门穿壬 — 奇门遁甲+大六壬跨界实例 */

export interface QiMenChuanYinInput {
  /** 关键词搜索 */
  keyword?: string
  /** 分类：军事/人事/疾病/出行/失物/求财/全部 */
  category?: "军事" | "人事" | "疾病" | "出行" | "失物" | "求财" | "婚姻" | "官讼" | "全部"
}

export interface ChuanYinCase {
  title: string
  category: string
  dynasty: string
  qiMenPan: {
    shiChen: string
    yangDun: string
    juShu: string
    men: string
    xing: string
    shen: string
    keYing: string
  }
  liuRenKe: {
    yueJiang: string
    keTi: string
    sanChuan: string
    duanYu: string
  }
  jointAnalysis: string
  conclusion: string
  source: string
  tags: string[]
}

export interface QiMenChuanYinResult {
  cases: ChuanYinCase[]
  total: number
  summary: string
}
