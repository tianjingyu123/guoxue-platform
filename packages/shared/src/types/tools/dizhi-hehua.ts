/** 地支合化大全 — 十二地支全关系网络 */

export interface DiZhiHeHuaInput {
  /** 地支关键词 */
  diZhi?: string
  /** 关系类型：六合/三合/三会/半合/暗合/六冲/六害/三刑/六破/自刑/全部 */
  type?: "六合" | "三合" | "三会" | "半合" | "暗合" | "六冲" | "六害" | "三刑" | "六破" | "自刑" | "全部"
}

export interface DiZhiRelation {
  diZhi: string[]
  type: string
  huaWuXing: string
  huaShen: string
  condition: string
  effect: string
  jiXiong: "大吉" | "吉" | "平" | "凶" | "大凶"
  detailed: string
  baziExample: string
  source: string
}

export interface DiZhiHeHuaResult {
  relations: DiZhiRelation[]
  total: number
  summary: string
}
