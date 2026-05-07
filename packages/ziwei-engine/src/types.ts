/** 性别 */
export type Gender = '男' | '女'

/** 天干 */
export type Gan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** 地支 */
export type Zhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

/** 十二宫名称 */
export type GongName = '命宫' | '兄弟' | '夫妻' | '子女' | '财帛' | '疾厄' | '迁移' | '交友' | '官禄' | '田宅' | '福德' | '父母'

/** 星曜五行属性 */
export type WuXing = '金' | '木' | '水' | '火' | '土'

/** 星曜吉凶属性 */
export type XingLiangJi = '吉' | '凶' | '中性'

/** 星曜类型 */
export type XingType = 'main' | 'assist' | 'sisha'

/** 星曜 */
export interface Star {
  name: string
  type: XingType
  wuXing: WuXing
  liangJi: XingLiangJi
}

/** 宫位 */
export interface GongWei {
  name: GongName
  zhi: Zhi
  gan: Gan
  stars: Star[]
  shenGong: boolean
  daXianStart: number
  daXianEnd: number
  sanFang: GongName[]
  duiGong: GongName
  gongQi: string
}

/** 四化 */
export interface SiHua {
  huaLu: string
  huaQuan: string
  huaKe: string
  huaJi: string
}

/** 紫微斗数排盘输入 */
export interface ZiweiInput {
  name: string
  gender: Gender
  year: number
  month: number
  day: number
  hour: number
  lunarMonth: number
  lunarDay: number
  lunarHour: Zhi
  lunarYearGan: Gan
  lunarYearZhi: Zhi
}

/** 紫微斗数排盘结果 */
export interface ZiweiResult {
  input: ZiweiInput
  wuXingJu: string
  mingGong: GongWei
  gongWei: GongWei[]
  siHua: SiHua
  shenGong: GongName
  geShi: string[]
}

/** 星曜名称 */
export type StarName = string
