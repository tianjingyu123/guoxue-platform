/** 紫微四化飞星 — 钦天门飞星派四化 */

export interface ZiweiSihuaFeiInput {
  /** 宫位 */
  gongWei?: string
  /** 星曜 */
  xingYao?: string
  /** 四化类型：禄/权/科/忌 */
  huaType?: "禄" | "权" | "科" | "忌"
}

export interface SiHuaFeiXingItem {
  gongWei: string
  xingYao: string
  huaType: "禄" | "权" | "科" | "忌"
  direction: "自化" | "飞入" | "射出"
  targetGong: string
  meaning: string
  detailed: string
  jiXiong: "大吉" | "吉" | "凶" | "平"
}

export interface ZiweiSihuaFeiResult {
  feiXing: SiHuaFeiXingItem[]
  summary: string
}
