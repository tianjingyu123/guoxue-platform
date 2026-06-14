/** 星宿命理 — 二十八宿性格/职业/婚配/运势 */

export interface XingXiuMingLiInput {
  /** 星宿名关键词 */
  keyword?: string
  /** 分类：东方青龙/北方玄武/西方白虎/南方朱雀/全部 */
  group?: "东方青龙" | "北方玄武" | "西方白虎" | "南方朱雀" | "全部"
}

export interface XingXiuMingLiItem {
  name: string
  alias: string[]
  group: string
  animal: string
  wuXing: string
  xingGe: {
    traits: string[]
    strengths: string[]
    weaknesses: string[]
    summary: string
  }
  career: {
    suitable: string[]
    avoid: string[]
    advice: string
  }
  love: {
    bestMatch: string[]
    worstMatch: string[]
    advice: string
  }
  health: {
    attention: string[]
    advice: string
  }
  fortune: {
    overall: string
    wealth: string
    career: string
    love: string
  }
  poem: string
  source: string
}

export interface XingXiuMingLiResult {
  items: XingXiuMingLiItem[]
  total: number
  summary: string
}
