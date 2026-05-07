import type { Gan, Zhi, GongName, WuXing, XingLiangJi, StarName } from './types'

/** 十天干 */
export const GAN: Gan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

/** 十二地支 */
export const ZHI: Zhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 地支对应时辰范围 */
export const ZHI_SHICHEN: Record<Zhi, string> = {
  '子': '23-1', '丑': '1-3', '寅': '3-5', '卯': '5-7',
  '辰': '7-9', '巳': '9-11', '午': '11-13', '未': '13-15',
  '申': '15-17', '酉': '17-19', '戌': '19-21', '亥': '21-23',
}

/** 十二宫顺序（从命宫开始逆时针） */
export const SHI_ER_GONG_NAMES: GongName[] = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '官禄', '田宅', '福德', '父母',
]

/** 五虎遁（年干→寅月天干）：甲己→丙, 乙庚→戊, 丙辛→庚, 丁壬→壬, 戊癸→甲 */
export const WU_HU_DUN: Gan[] = ['丙', '戊', '庚', '壬', '甲', '丙', '戊', '庚', '壬', '甲']

/**
 * 五行局表：按命宫地支（分两组）和命宫天干对应的五行局
 * 地支分组：子丑、寅卯、辰巳、午未、申酉、戌亥
 * 天干分组：甲乙、丙丁、戊己、庚辛、壬癸
 * 值：金四局、水二局、火六局、土五局、木三局
 */
export const WU_XING_JU_TABLE: string[][] = [
  // 子丑组 甲乙  丙丁   戊己   庚辛   壬癸
  ['金四局', '水二局', '火六局', '土五局', '木三局'],
  // 寅卯组
  ['水二局', '火六局', '土五局', '木三局', '金四局'],
  // 辰巳组
  ['火六局', '土五局', '木三局', '金四局', '水二局'],
  // 午未组
  ['土五局', '木三局', '水二局', '水二局', '火六局'],
  // 申酉组
  ['木三局', '金四局', '水二局', '火六局', '土五局'],
  // 戌亥组
  ['金四局', '水二局', '火六局', '土五局', '木三局'],
]

/** 五行局数值 */
export const WU_XING_JU_VALUES: Record<string, number> = {
  '水二局': 2,
  '木三局': 3,
  '金四局': 4,
  '土五局': 5,
  '火六局': 6,
}

/**
 * 十四主星列表
 * name, wuXing, liangJi, type
 */
export const ZHU_XING_LIST: { name: string; wuXing: WuXing; liangJi: XingLiangJi }[] = [
  { name: '紫微', wuXing: '土', liangJi: '吉' },
  { name: '天机', wuXing: '木', liangJi: '吉' },
  { name: '太阳', wuXing: '火', liangJi: '吉' },
  { name: '武曲', wuXing: '金', liangJi: '吉' },
  { name: '天同', wuXing: '水', liangJi: '吉' },
  { name: '廉贞', wuXing: '火', liangJi: '凶' },
  { name: '天府', wuXing: '土', liangJi: '吉' },
  { name: '太阴', wuXing: '水', liangJi: '吉' },
  { name: '贪狼', wuXing: '木', liangJi: '凶' },
  { name: '巨门', wuXing: '水', liangJi: '凶' },
  { name: '天相', wuXing: '水', liangJi: '吉' },
  { name: '天梁', wuXing: '土', liangJi: '吉' },
  { name: '七杀', wuXing: '金', liangJi: '凶' },
  { name: '破军', wuXing: '水', liangJi: '凶' },
]

/** 紫微系主星（按逆时针相对位置） */
export const ZIWEI_XI_STARS: { name: string; offset: number }[] = [
  { name: '紫微', offset: 0 },
  { name: '天机', offset: -1 },
  { name: '太阳', offset: -3 },
  { name: '武曲', offset: -4 },
  { name: '天同', offset: -5 },
  { name: '廉贞', offset: -7 },
]

/** 天府系主星（按顺时针相对位置） */
export const TIANFU_XI_STARS: { name: string; offset: number }[] = [
  { name: '天府', offset: 0 },
  { name: '太阴', offset: 1 },
  { name: '贪狼', offset: 2 },
  { name: '巨门', offset: 3 },
  { name: '天相', offset: 4 },
  { name: '天梁', offset: 5 },
  { name: '七杀', offset: 6 },
  { name: '破军', offset: 8 },
]

/**
 * 十天干四化表
 * 索引0-9 对应 甲-癸
 * 每项 [化禄, 化权, 化科, 化忌]
 */
export const SI_HUA_TABLE: [string, string, string, string][] = [
  ['廉贞', '破军', '武曲', '太阳'], // 甲
  ['天机', '天梁', '紫微', '太阴'], // 乙
  ['天同', '天机', '文昌', '廉贞'], // 丙
  ['太阴', '天同', '天机', '巨门'], // 丁
  ['贪狼', '太阴', '右弼', '天机'], // 戊
  ['武曲', '贪狼', '天梁', '文曲'], // 己
  ['太阳', '武曲', '太阴', '天同'], // 庚
  ['巨门', '太阳', '文曲', '文昌'], // 辛
  ['天梁', '紫微', '左辅', '武曲'], // 壬
  ['破军', '巨门', '太阴', '贪狼'], // 癸
]

/** 六辅星列表及其位置计算方法 */
export const LIU_FU_XING: Record<string, (month: number, hourIdx: number, yearGan: Gan) => number> = {
  // 左辅：辰上顺数到生月
  '左辅': (month: number) => { return (4 + month - 1) % 12 },   // 辰=4
  // 右弼：戌上逆数到生月
  '右弼': (month: number) => { return (10 - month + 1 + 12) % 12 }, // 戌=10
  // 文昌：辰上顺数到生时(亥时=1)
  '文昌': (_m: number, hourIdx: number) => { return (4 + hourIdx) % 12 },  // 辰=4
  // 文曲：辰上逆数到生时(亥时=1)
  '文曲': (_m: number, hourIdx: number) => { return (4 - hourIdx + 12) % 12 }, // 辰=4
  // 天魁：年干定
  '天魁': (_m: number, _h: number, yearGan: Gan) => {
    const map: Record<Gan, number> = {
      '甲': 1, '乙': 10, '丙': 8, '丁': 7, '戊': 1,
      '己': 10, '庚': 8, '辛': 7, '壬': 1, '癸': 10,
    }
    return map[yearGan]
  },
  // 天钺：年干定
  '天钺': (_m: number, _h: number, yearGan: Gan) => {
    const map: Record<Gan, number> = {
      '甲': 11, '乙': 9, '丙': 4, '丁': 3, '戊': 11,
      '己': 9, '庚': 4, '辛': 3, '壬': 11, '癸': 9,
    }
    return map[yearGan]
  },
}

/**
 * 紫微神煞列表
 */
export const ZIWEI_SHEN_SHA: Record<string, (month: number, hourIdx: number, yearGan: Gan, yearZhi: Zhi) => number> = {
  // 天刑：正月起酉，顺数到生月
  '天刑': (month: number) => { return (9 + month - 1) % 12 },  // 酉=9
  // 天姚：正月起丑，顺数到生月
  '天姚': (month: number) => { return (1 + month - 1) % 12 },  // 丑=1
  // 解神：正月起申，顺数到生月
  '解神': (month: number) => { return (8 + month - 1) % 12 },  // 申=8
  // 天巫：正月起巳，顺数到生月
  '天巫': (month: number) => { return (5 + month - 1) % 12 },  // 巳=5
}

/** 地支对应的五行：寅卯=木, 巳午=火, 申酉=金, 亥子=水, 辰戌丑未=土 */
export const ZHI_WU_XING: Record<Zhi, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

/** 天干五行 */
export const GAN_WU_XING: Record<Gan, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
}

/** 60甲子纳音 */
export const NA_YIN: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '井泉水', '乙酉': '井泉水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水', '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
}

/** 地支对应地支组索引（五行局表用） */
export function getZhiGroupIndex(zhi: Zhi): number {
  const idx = ZHI.indexOf(zhi)
  return Math.floor(idx / 2) // 子丑=0, 寅卯=1, 辰巳=2, 午未=3, 申酉=4, 戌亥=5
}

/** 天干在天干组中的索引（五行局表用） */
export function getGanGroupIndex(gan: Gan): number {
  const idx = GAN.indexOf(gan)
  return Math.floor(idx / 2) // 甲乙=0, 丙丁=1, 戊己=2, 庚辛=3, 壬癸=4
}

/** 取得某个地支在十二地支中的索引（子=0,丑=1,...） */
export function getZhiIndex(zhi: Zhi): number {
  return ZHI.indexOf(zhi)
}

/** 取得某个天干在天干中的索引（甲=0,乙=1,...） */
export function getGanIndex(gan: Gan): number {
  return GAN.indexOf(gan)
}

/** 年干是否为阳 */
export function isYangGan(gan: Gan): boolean {
  return getGanIndex(gan) % 2 === 0
}

/** 获取地支的五行局分组（地支组索引0-5） */
export function getZhiWuXingJuGroup(zhi: Zhi): number {
  return getZhiGroupIndex(zhi)
}
