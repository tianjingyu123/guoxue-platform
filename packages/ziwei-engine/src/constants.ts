import type { Gan, Zhi, GongName, WuXing, XingLiangJi } from './types'

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
  ['火六局', '土五局', '木三局', '金四局', '水二局'],
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
  // ─── 月支系神煞（正月起X，顺数至生月）───
  '天刑': (month: number) => (9 + month - 1) % 12,   // 正月起酉
  '天姚': (month: number) => (1 + month - 1) % 12,   // 正月起丑
  '解神': (month: number) => (8 + month - 1) % 12,   // 正月起申
  '天巫': (month: number) => (5 + month - 1) % 12,   // 正月起巳
  '天月': (month: number) => [1,5,8,10,1,5,8,10,1,5,8,10][month-1], // 与天刑同宫(简化按五行局起)
  '阴煞': (month: number) => (2 + month - 1) % 12,   // 正月起寅(2)

  // ─── 年支系神煞 ───
  // 红鸾：卯上起子年，逆数至生年
  '红鸾': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const zhiIdx = ZHI.indexOf(yearZhi)
    return (3 - zhiIdx + 12) % 12  // 卯=3, 逆数
  },
  // 天喜：红鸾的对宫
  '天喜': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const zhiIdx = ZHI.indexOf(yearZhi)
    return (3 - zhiIdx + 6 + 12) % 12  // 红鸾+6
  },
  // 天马：申子辰在寅，巳酉丑在亥，寅午戌在申，亥卯未在巳
  '天马': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 2    // 申子辰→寅(2)
    if ([1,5,9].includes(idx)) return 11   // 巳酉丑→亥(11)
    if ([2,6,10].includes(idx)) return 8   // 寅午戌→申(8)
    return 5                                // 亥卯未→巳(5)
  },
  // 华盖：申子辰在辰，巳酉丑在丑，寅午戌在戌，亥卯未在未
  '华盖': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 4    // 申子辰→辰
    if ([1,5,9].includes(idx)) return 1    // 巳酉丑→丑
    if ([2,6,10].includes(idx)) return 10  // 寅午戌→戌
    return 7                                // 亥卯未→未
  },
  // 咸池（桃花）：申子辰在酉，巳酉丑在午，寅午戌在卯，亥卯未在子
  '咸池': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 9    // 申子辰→酉
    if ([1,5,9].includes(idx)) return 6    // 巳酉丑→午
    if ([2,6,10].includes(idx)) return 3   // 寅午戌→卯
    return 0                                // 亥卯未→子
  },
  // 劫煞：申子辰在巳，巳酉丑在寅，寅午戌在亥，亥卯未在申
  '劫煞': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 5    // 申子辰→巳
    if ([1,5,9].includes(idx)) return 2    // 巳酉丑→寅
    if ([2,6,10].includes(idx)) return 11  // 寅午戌→亥
    return 8                                // 亥卯未→申
  },
  // 灾煞：劫煞的对宫（冲位）
  '灾煞': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 6    // 申子辰→午(劫煞巳的对宫)
    if ([1,5,9].includes(idx)) return 3    // 巳酉丑→卯(劫煞寅的对宫)
    if ([2,6,10].includes(idx)) return 0   // 寅午戌→子(劫煞亥的对宫)
    return 9                                // 亥卯未→酉(劫煞申的对宫)
  },
  // 孤辰：亥子丑年在寅，寅卯辰年在巳，巳午未年在申，申酉戌年在亥
  '孤辰': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,1,11].includes(idx)) return 2  // 亥子丑→寅
    if ([2,3,4].includes(idx)) return 5   // 寅卯辰→巳
    if ([5,6,7].includes(idx)) return 8   // 巳午未→申
    return 11                              // 申酉戌→亥
  },
  // 寡宿：戌亥子年在丑，丑寅卯年在辰，辰巳午年在未，未申酉年在戌
  '寡宿': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([10,11,0].includes(idx)) return 1   // 戌亥子→丑
    if ([1,2,3].includes(idx)) return 4     // 丑寅卯→辰
    if ([4,5,6].includes(idx)) return 7     // 辰巳午→未
    return 10                                // 未申酉→戌
  },
  // 龙池：辰上起子年，顺数至生年
  '龙池': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const zhiIdx = ZHI.indexOf(yearZhi)
    return (4 + zhiIdx) % 12  // 辰=4, 顺数
  },
  // 凤阁：戌上起子年，逆数至生年
  '凤阁': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const zhiIdx = ZHI.indexOf(yearZhi)
    return (10 - zhiIdx + 12) % 12  // 戌=10, 逆数
  },
  // 将星：申子辰在子，巳酉丑在酉，寅午戌在午，亥卯未在卯
  '将星': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 0    // 申子辰→子
    if ([1,5,9].includes(idx)) return 9    // 巳酉丑→酉
    if ([2,6,10].includes(idx)) return 6   // 寅午戌→午
    return 3                                // 亥卯未→卯
  },
  // 亡神：申子辰在亥，巳酉丑在申，寅午戌在巳，亥卯未在寅
  '亡神': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    if ([0,4,8].includes(idx)) return 11   // 申子辰→亥
    if ([1,5,9].includes(idx)) return 8    // 巳酉丑→申
    if ([2,6,10].includes(idx)) return 5   // 寅午戌→巳
    return 2                                // 亥卯未→寅
  },
  // 攀鞍：驿马后一位
  '攀鞍': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    let tianMa: number
    if ([0,4,8].includes(idx)) tianMa = 2    // 申子辰→天马寅(2)
    else if ([1,5,9].includes(idx)) tianMa = 11  // 巳酉丑→天马亥(11)
    else if ([2,6,10].includes(idx)) tianMa = 8  // 寅午戌→天马申(8)
    else tianMa = 5                               // 亥卯未→天马巳(5)
    return (tianMa - 1 + 12) % 12
  },
  // 指背：劫煞前一位
  '指背': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    let jieSha: number
    if ([0,4,8].includes(idx)) jieSha = 5    // 申子辰→劫煞巳(5)
    else if ([1,5,9].includes(idx)) jieSha = 2   // 巳酉丑→劫煞寅(2)
    else if ([2,6,10].includes(idx)) jieSha = 11  // 寅午戌→劫煞亥(11)
    else jieSha = 8                               // 亥卯未→劫煞申(8)
    return (jieSha + 1) % 12
  },
  // 天煞：劫煞前两位
  '天煞': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const idx = ZHI.indexOf(yearZhi)
    let jieSha: number
    if ([0,4,8].includes(idx)) jieSha = 5
    else if ([1,5,9].includes(idx)) jieSha = 2
    else if ([2,6,10].includes(idx)) jieSha = 11
    else jieSha = 8
    return (jieSha + 2) % 12
  },

  // ─── 年干系神煞 ───
  // 文昌：甲在巳，乙在午，丙在申，丁在酉，戊在申，己在酉，庚在亥，辛在子，壬在寅，癸在卯
  '文昌': (_m: number, _h: number, yearGan: Gan, _z: Zhi) => {
    const map: Record<string, number> = { '甲':5,'乙':6,'丙':8,'丁':9,'戊':8,'己':9,'庚':11,'辛':0,'壬':2,'癸':3 }
    return map[yearGan] || 0
  },
  // 文曲：甲在亥，乙在子，丙在寅，丁在卯，戊在寅，己在卯，庚在巳，辛在午，壬在申，癸在酉
  '文曲': (_m: number, _h: number, yearGan: Gan, _z: Zhi) => {
    const map: Record<string, number> = { '甲':11,'乙':0,'丙':2,'丁':3,'戊':2,'己':3,'庚':5,'辛':6,'壬':8,'癸':9 }
    return map[yearGan] || 0
  },
  // 学堂：甲在亥，乙在午，丙在寅，丁在酉，戊在寅，己在酉，庚在巳，辛在子，壬在申，癸在卯
  '学堂': (_m: number, _h: number, yearGan: Gan, _z: Zhi) => {
    const map: Record<string, number> = { '甲':11,'乙':6,'丙':2,'丁':9,'戊':2,'己':9,'庚':5,'辛':0,'壬':8,'癸':3 }
    return map[yearGan] || 0
  },

  // ─── 时支系神煞 ───
  // 台辅：与生时相合的地支
  '台辅': (_m: number, hourIdx: number) => hourIdx, // 台辅与时支同位(简化)
  // 封诰：台辅的对宫
  '封诰': (_m: number, hourIdx: number) => (hourIdx + 6) % 12,

  // ─── 其他神煞 ───
  // 天哭：卯上起子年，逆数至生年（与红鸾同）
  '天哭': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const zhiIdx = ZHI.indexOf(yearZhi)
    return (3 - zhiIdx + 12) % 12
  },
  // 天虚：午上起子年，顺数至生年
  '天虚': (_m: number, _h: number, _g: Gan, yearZhi: Zhi) => {
    const zhiIdx = ZHI.indexOf(yearZhi)
    return (6 + zhiIdx) % 12
  },
  // 三台：辰上起正月，顺数至生月；或依生时
  '三台': (month: number) => (4 + month - 1) % 12,
  // 八座：戌上起正月，逆数至生月
  '八座': (month: number) => (10 - (month - 1) + 12) % 12,
  // 恩光：同文昌取法（简化）
  '恩光': (_m: number, _h: number, yearGan: Gan, _z: Zhi) => {
    const map: Record<string, number> = { '甲':5,'乙':6,'丙':8,'丁':9,'戊':8,'己':9,'庚':11,'辛':0,'壬':2,'癸':3 }
    return (map[yearGan] + 3) % 12
  },
  // 天贵：同文曲取法（简化）
  '天贵': (_m: number, _h: number, yearGan: Gan, _z: Zhi) => {
    const map: Record<string, number> = { '甲':11,'乙':0,'丙':2,'丁':3,'戊':2,'己':3,'庚':5,'辛':6,'壬':8,'癸':9 }
    return (map[yearGan] + 3) % 12
  },
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

/**
 * 禄存星位置（年干定）
 * 甲→寅, 乙→卯, 丙→巳, 丁→午, 戊→巳, 己→午, 庚→申, 辛→酉, 壬→亥, 癸→子
 */
export const LU_CUN_TABLE: Record<Gan, number> = {
  '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5,
  '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0,
}

/**
 * 火星起子时宫位（年支定）
 * 寅午戌→丑, 申子辰→寅, 巳酉丑→卯, 亥卯未→酉
 */
export const HUO_XING_OFFSET: Record<string, number> = {
  '寅': 1, '午': 1, '戌': 1,  // 寅午戌→丑(1)
  '申': 2, '子': 2, '辰': 2,  // 申子辰→寅(2)
  '巳': 3, '酉': 3, '丑': 3,  // 巳酉丑→卯(3)
  '亥': 9, '卯': 9, '未': 9,  // 亥卯未→酉(9)
}

/**
 * 铃星起子时宫位（年支定）
 * 寅午戌→卯, 申子辰/巳酉丑/亥卯未→戌
 */
export const LING_XING_OFFSET: Record<string, number> = {
  '寅': 3, '午': 3, '戌': 3,  // 寅午戌→卯(3)
  '申': 10, '子': 10, '辰': 10, '巳': 10, '酉': 10, '丑': 10,  // 其余→戌(10)
  '亥': 10, '卯': 10, '未': 10,
}

/** 年干是否为阳 */
export function isYangGan(gan: Gan): boolean {
  return getGanIndex(gan) % 2 === 0
}

/** 获取地支的五行局分组（地支组索引0-5） */
export function getZhiWuXingJuGroup(zhi: Zhi): number {
  return getZhiGroupIndex(zhi)
}
