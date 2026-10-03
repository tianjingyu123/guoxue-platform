/**
 * 小成图 · 前端结果类型
 *
 * 排盘算法已迁至服务端（apps/server/src/modules/paipan/engine/xiaochengtu-engine.ts），
 * 前端只经 POST /paipan/engine/xiaochengtu 拿结果，不再包含任何推算逻辑。
 */
export type XctCastMethod = "manual" | "yao" | "guaming" | "number1" | "number2" | "time" | "auto"
export type ZhongGongMethod = "sizheng" | "zhengyu"

export interface XctPalace {
  /** 洛书宫数 */
  luoshu: number
  /** 地盘宫卦 */
  diGua: string
  /** 天盘（布入）卦；中宫为归藏卦 */
  tianGua: string
  /** 布入来源说明 */
  source: string
  /** 天盘升降 */
  tianRising: boolean
  /** 地盘升降 */
  diRising: boolean
  /** 四式 */
  pattern: string
  /** 天盘叠地盘成卦 */
  hexName: string
  /** 象意 */
  guaci: string
  /** 先天宫 */
  xiantianGong: string
  /** 取数：洛书/先天/河图 */
  numbers: string
  /** 宫位地支 */
  dizhi: string
}

export interface XctResult {
  topic: string
  dateLabel: string
  lunarLabel: string
  jieqiRange: string
  methodLabel: string
  zhonggongLabel: string
  pillars: { year: string; month: string; day: string; time: string }
  /** 各柱空亡 */
  kongWang: { year: string; month: string; day: string; time: string }
  shenSha: { name: string; zhi: string }[]
  /** 本卦/变卦：六爻自下而上 */
  benGua: { name: string; lines: boolean[]; upper: string; lower: string }
  bianGua: { name: string; lines: boolean[]; upper: string; lower: string }
  dongYao: number
  /** 九宫（按 4,9,2 / 3,5,7 / 8,1,6 顺序展示，中宫在 index 4） */
  palaces: XctPalace[]
  /** 中宫归藏卦 */
  zhongGua: string
  /** 起卦算式说明 */
  castDetail: string[]
  /** 白话总断 */
  summary: string[]
}
