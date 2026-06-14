/** 六爻神动详论 — 动爻变化规则大全 */

export interface LiuYaoShenDongInput {
  /** 卦名关键词 */
  guaName?: string
  /** 动变类型：进神/退神/暗动/月破/伏吟/反吟/六亲/六神/全部 */
  type?: "进神" | "退神" | "暗动" | "月破" | "伏吟" | "反吟" | "六亲发动" | "六神发动" | "全部"
}

export interface ShenDongItem {
  name: string
  type: string
  yaoWei: string
  dongBian: string
  guiZe: string
  jiXiong: "大吉" | "吉" | "平" | "凶" | "大凶"
  duanYu: string
  detailed: string
  source: string
  guaExample: string
}

export interface LiuYaoShenDongResult {
  items: ShenDongItem[]
  total: number
  summary: string
}
