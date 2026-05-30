/** 性别 */
export type Gender = '男' | '女'

/** 天干 */
export type Gan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** 地支 */
export type Zhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

/** 十神 */
export type ShiShen = '比' | '劫' | '食' | '伤' | '才' | '财' | '杀' | '官' | '枭' | '印'

/** 一柱：天干+地支 */
export interface Pillar {
  gan: Gan
  zhi: Zhi
  ganShiShen: ShiShen
  zhiShiShen: ShiShen
  cangGan: { gan: Gan; shiShen: ShiShen; type: '元' | '余' | '库' }[]
  nayin: string
  /** 十二长生/星运：日干对该柱地支的长生状态 */
  xingYun?: string
  /** 副星：藏干对应的十神（显式标注） */
  fuXing?: { gan: Gan; shiShen: ShiShen; type: '元' | '余' | '库' }[]
}

/** 四柱 */
export interface SiZhu {
  nian: Pillar
  yue: Pillar
  ri: Pillar
  shi: Pillar
}

/** 一步大运 */
export interface DaYunStep {
  ganZhi: string
  tianGan: Gan
  diZhi: Zhi
  ganShiShen: ShiShen
  zhiShiShen: ShiShen
  startYear: number
  endYear: number
  startAge: number
  endAge: number
  liuNian: LiuNian[]
}

/** 流年 */
export interface LiuNian {
  year: number
  age: number
  ganZhi: string
  ganShiShen: ShiShen
  zhiShiShen: ShiShen
  liuYue?: LiuYue[]
}

/** 流月 */
export interface LiuYue {
  month: number
  ganZhi: string
  gan: Gan
  zhi: Zhi
  ganShiShen: ShiShen
  zhiShiShen: ShiShen
}

/** 流时 */
export interface LiuShi {
  hour: number
  ganZhi: string
  gan: Gan
  zhi: Zhi
  ganShiShen: ShiShen
  zhiShiShen: ShiShen
}

/** 起运信息 */
export interface QiYun {
  startYear: number
  startAge: number
  jiaoYunGan: Gan
  jiaoYunMonth: number
  jiaoYunDay: number
  dayCount: number
  desc: string
  daYun: DaYunStep[]
}

/** 神煞项 */
export interface ShenShaItem {
  name: string
  type: 'ji' | 'xiong'
  desc: string
  pillar: string
}

/** 分析提示 */
export interface FenXiTiShi {
  ganHe: string[]
  sanHe: string[]
  sanHui: string[]
  liuChong: string[]
  liuHe: string[]
  liuHai: string[]
  sanXing: string[]
  ziXing: string[]
  /** 地支暗合 */
  anHe: string[]
  /** 地支相破 */
  xiangPo: string[]
}

/** 格局分析 */
export interface GeJu {
  name: string        // 格局名
  type: 'zheng' | 'bian'  // 正格/变格
  yongShen: string    // 用神
  xiShen: string      // 喜神
  jiShen: string      // 忌神
  desc: string        // 格局描述
}

/** 五行能量 */
export interface WuXingEnergy {
  mu: number   // 木
  huo: number  // 火
  tu: number   // 土
  jin: number  // 金
  shui: number // 水
  desc: string
}

/** 早晚子时模式 */
export type ZiShiMode = 'traditional' | 'modern'

/** 排盘输入 */
export interface BaziInput {
  name: string
  gender: Gender
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
  longitude?: number        // 手动指定经度（可选，优先级高于city）
  useTrueSolarTime?: boolean // 是否使用真太阳时（默认false）
  useDaylightSaving?: boolean // 是否使用夏令时校正（默认false，1986-1991年出生建议开启）
  ziShiMode?: ZiShiMode      // 早晚子时模式（默认 traditional：23点后日柱用次日）
}

/** 真太阳时信息 */
export interface TaiYangShi {
  adjustedHour: number
  adjustedMinute: number
  offset: number
  desc: string
}

/** 夏令时校正信息 */
export interface DaylightSaving {
  adjusted: boolean
  originalHour: number
  adjustedHour: number
  offset: number
  desc: string
}

/** 自坐 */
export interface ZiZuo {
  riGan: Gan
  riZhi: Zhi
  shiShen: ShiShen
  desc: string
}

/** 完整排盘结果 */
export interface BaziResult {
  input: BaziInput
  siZhu: SiZhu
  qiYun: QiYun
  kongWang: string
  shengXiao: string
  lunarDate: string
  taiYuan: Pillar
  mingGong: Pillar
  shenGong: Pillar
  wangXiang: string
  fenXiTiShi: FenXiTiShi
  shenSha: ShenShaItem[]
  geJu?: GeJu
  wuXingEnergy?: WuXingEnergy
  taiYangShi?: TaiYangShi  // 真太阳时校正信息
  daylightSaving?: DaylightSaving // 夏令时校正信息
  ziZuo?: ZiZuo            // 自坐：日干对日支的关系
}
