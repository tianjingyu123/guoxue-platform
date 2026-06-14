/** 山向奇门 — 奇门风水山向盘 */

export interface QiMenShanGongInput {
  /** 坐山 */
  zuoShan?: string
  /** 朝向 */
  chaoXiang?: string
}

export interface ShanGongItem {
  shan: string
  guaWei: string
  diPanGan: string
  tianPanGan: string
  baMen: string
  jiuXing: string
  baShen: string
  jiXiong: "大吉" | "吉" | "平" | "凶" | "大凶"
  keYing: string
  detailed: string
  suitable: string[]
  avoid: string[]
}

export interface QiMenShanGongResult {
  shanGong: ShanGongItem[]
  summary: string
}
