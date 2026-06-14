/** 宅相风水 — 阳宅形煞判断 */

export interface ZhaixiangFengshuiInput {
  /** 形煞名称关键词 */
  keyword?: string
  /** 煞的类型：外煞/内煞/全部 */
  type?: "外煞" | "内煞" | "全部"
}

export interface XingShaItem {
  name: string
  alias: string[]
  type: "外煞" | "内煞"
  wuXing: string
  position: string
  severity: "大凶" | "凶" | "中" | "小凶"
  shape: string
  effect: string
  resolve: string[]
  source: string
}

export interface ZhaixiangFengshuiResult {
  xingSha: XingShaItem[]
  total: number
  summary: string
}
