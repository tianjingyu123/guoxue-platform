/**
 * 太乙神数 · 前端类型与展示对照表
 *
 * 排盘算法已迁至服务端（apps/server/src/modules/paipan/engine/taiyi-engine.ts），
 * 前端只经 POST /paipan/engine/taiyi 拿结果，不再包含任何推算逻辑。
 * 这里只留结果类型，和十六神盘渲染要用的公开对照表（传统十六神名/洛书宫数，非算法）。
 */
/** 十六神槽位（顺时针）：支位 + 四维 */
export const SLOT16 = [
  "子", "丑", "艮", "寅", "卯", "辰", "巽", "巳",
  "午", "未", "坤", "申", "酉", "戌", "乾", "亥",
] as const

/** 槽位 → 十六神名 */
export const GOD16: Record<string, string> = {
  子: "地主", 丑: "阳德", 艮: "和德", 寅: "吕申",
  卯: "高丛", 辰: "太阳", 巽: "大炅", 巳: "大神",
  午: "大威", 未: "天道", 坤: "大武", 申: "武德",
  酉: "太簇", 戌: "阴主", 乾: "阴德", 亥: "大义",
}

/** 槽位 → 太乙九宫数（一乾 二离 三艮 四震 五中 六兑 七坤 八坎 九巽；★26 起不再用洛书，与服务端引擎一致） */
export const SLOT_PALACE: Record<string, number> = {
  子: 8, 丑: 3, 艮: 3, 寅: 3, 卯: 4, 辰: 9, 巽: 9, 巳: 9,
  午: 2, 未: 7, 坤: 7, 申: 7, 酉: 6, 戌: 1, 乾: 1, 亥: 1,
}


export type PanShi = "year" | "month" | "day" | "hour"
export type SuanFa = "tongzong" | "zhijin" | "jinjing"

export interface TaiyiResult {
  panShiLabel: string
  suanFaLabel: string
  dateLabel: string
  lunarLabel: string
  jieQiLabel: string
  pillars: { year: string; month: string; day: string; time: string }
  kongWang: { year: string; month: string; day: string; time: string }
  jiShi: number
  dunType: "阳遁" | "阴遁"
  juNumber: number
  taiyiPalace: number
  wenchang: { god: string; slot: string; palace: number }
  shiji: { god: string; slot: string; palace: number }
  /** 定目（定算的起点） */
  dingmu?: { god: string; slot: string; palace: number }
  jiShen: string
  zhuSuan: number
  keSuan: number
  dingSuan: number
  zhuDaJiang: number
  zhuCanJiang: number
  keDaJiang: number
  keCanJiang: number
  zhiShi: string
  wuFu: number
  juHourGanZhi: string[]
  geJu: { title: string; text: string; type: "ji" | "xiong" | "ping" }[]
  shuZhan: { title: string; text: string }[]
  juYao: string
  baiHua: string
}
