/** 大六壬课经 — 64课体+九宗门 */

export interface DaLiuRenKeJingInput {
  /** 课体名称关键词 */
  keyword?: string
  /** 课体类型 */
  type?: "元首" | "重审" | "知一" | "涉害" | "遥克" | "昴星" | "别责" | "八专" | "伏吟" | "反吟" | "全部"
}

export interface KeTiItem {
  name: string
  zongMen: string
  xiangShen: string
  keTi: string
  panMian: string
  duanYu: string
  jiXiong: "吉" | "凶" | "半吉" | "先凶后吉" | "平" | "大凶"
  shiJian: string[]
  yiJi: string[]
  source: string
}

export interface DaLiuRenKeJingResult {
  keTi: KeTiItem[]
  total: number
  summary: string
}
