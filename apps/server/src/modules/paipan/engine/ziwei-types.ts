// 紫微斗数 · 盘面类型（自 V0 lib/yijing/mock/workspace.ts 提取，去除 mock 数据）

/** 紫微星曜 */
export interface ZiweiStar {
  name: string
  /** 亮度：庙/旺/得/利/平/陷（可省略） */
  bright?: string
  /** 四化：禄/权/科/忌 */
  hua?: "禄" | "权" | "科" | "忌"
}

/** 紫微十二宫 */
export interface ZiweiPalace {
  /** 宫名，如 "命宫" */
  name: string
  /** 宫位干支，如 "癸巳" */
  ganzhi: string
  /** 主星（0-2 颗） */
  majors: ZiweiStar[]
  /** 辅星/煞星（精简 2-4 颗） */
  minors: string[]
  /** 大限年龄段，如 "6-15" */
  daxian: string
  /** 该宫对应流年（年份+岁数），如 "2026 42岁" */
  liunian?: string
  /** 是否现行大限所在宫 */
  currentDaxian?: boolean
  /** 是否身宫所在 */
  isShen?: boolean
  /** 老师断语（点宫详情用） */
  judgment?: string
  /** 古籍参考（点宫详情用） */
  gudian?: { star: string; source: string; text: string }[]
  /** 流年岁数列，如 "流年:3,15,27,39,51,63" */
  liunianAges?: string
  /** 小限岁数列，如 "小限:5,17,29,41,53,65" */
  xiaoxian?: string
  /** 长生十二神 */
  changsheng?: string
  /** 博士十二神 */
  boshi?: string
  /** 神煞（岁前诸星等） */
  shensha?: string[]
  /** 宫干飞四化：本宫宫干引发的四化星落宫（target=十二宫索引，与本宫索引相同即自化） */
  feihua?: { hua: "禄" | "权" | "科" | "忌"; star: string; target: number }[]
}

/** 紫微盘（含中宫信息）。十二宫按地支排列：索引 0=寅 顺行至 11=丑 */
export interface ZiweiChart {
  clientName: string
  gender: "男" | "女"
  lunarBirth: string
  /** 五行局，如 "水二局" */
  wuxingJu: string
  /** 命主星 / 身主星 */
  mingzhu: string
  shenzhu: string
  /** 生年四化一句话 */
  sihuaNote: string
  /** 十二宫（地支序：寅卯辰巳午未申酉戌亥子丑） */
  palaces: ZiweiPalace[]
  /** 盘面要点（老师断语参考） */
  keyNotes: { label: string; text: string }[]
}
