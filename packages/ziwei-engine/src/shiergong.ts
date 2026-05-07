/**
 * 十二宫详解：三方四正、宫气、大限
 */
import type { GongName, Gan, Zhi } from './types'
import { SHI_ER_GONG_NAMES, GAN, ZHI, NA_YIN, WU_HU_DUN } from './constants'

/** 十二宫索引（从命宫=0开始） */
const GONG_INDEX: Record<GongName, number> = {
  '命宫': 0, '兄弟': 1, '夫妻': 2, '子女': 3,
  '财帛': 4, '疾厄': 5, '迁移': 6, '交友': 7,
  '官禄': 8, '田宅': 9, '福德': 10, '父母': 11,
}

/**
 * 获取宫位的三方宫位
 * 命宫的三方 = 命宫 + 财帛 + 官禄（即索引i, i+4, i+8）
 */
export function getSanFang(gongName: GongName): GongName[] {
  const idx = GONG_INDEX[gongName]
  const sanFang: GongName[] = [
    SHI_ER_GONG_NAMES[idx],
    SHI_ER_GONG_NAMES[(idx + 4) % 12],
    SHI_ER_GONG_NAMES[(idx + 8) % 12],
  ]
  return sanFang
}

/**
 * 获取宫位的对宫（相隔6宫）
 */
export function getDuiGong(gongName: GongName): GongName {
  const idx = GONG_INDEX[gongName]
  return SHI_ER_GONG_NAMES[(idx + 6) % 12]
}

/**
 * 获取宫气（干支纳音）
 */
export function getGongQi(gan: Gan, zhi: Zhi): string {
  const key = gan + zhi
  return NA_YIN[key] || ''
}

/**
 * 根据命宫地支索引（0-based，寅=2等效于从寅开始），构建十二宫地支列表
 * 命宫地支索引 = mingZhiIdx，第i宫的地支索引 = (mingZhiIdx - i + 12) % 12
 */
export function getShiErGongZhi(mingZhiIdx: number): Zhi[] {
  return SHI_ER_GONG_NAMES.map((_, i) => {
    return ZHI[(mingZhiIdx - i + 12) % 12]
  })
}

/**
 * 生年天干为各宫定天干（五虎遁法）
 * 寅宫天干 = WU_HU_DUN[年干索引]
 * 各宫天干递推（顺时针增加）
 */
export function getGongGan(yearGan: Gan, gongZhi: Zhi): Gan {
  const yearGanIdx = GAN.indexOf(yearGan)
  const zhiIdx = ZHI.indexOf(gongZhi)
  // 寅（索引2）的天干 = WU_HU_DUN[yearGanIdx]
  const yinGanIdx = GAN.indexOf(WU_HU_DUN[yearGanIdx])
  // 其他地支的天干从寅开始顺时针推
  const ganIdx = (yinGanIdx + zhiIdx - 2 + 10) % 10
  return GAN[ganIdx]
}

/**
 * 计算大限（从命宫开始，每宫10年）
 *
 * @param mingZhiIdx 命宫地支索引
 * @param yearGan 生年天干（定阴阳）
 * @param gender 性别
 * @param wuXingJuValue 五行局数值
 * @returns 每宫的大限起始和结束年龄
 */
export function calcDaXian(
  mingZhiIdx: number,
  yearGan: Gan,
  gender: string,
  wuXingJuValue: number,
): { start: number; end: number }[] {
  const yearGanIdx = GAN.indexOf(yearGan)
  const isYang = yearGanIdx % 2 === 0
  // 阳男阴女顺行（索引递增），阴男阳女逆行（索引递减）
  const isShun = (isYang && gender === '男') || (!isYang && gender === '女')

  const daXian: { start: number; end: number }[] = []
  const startAge = wuXingJuValue

  for (let i = 0; i < 12; i++) {
    const ageStart = startAge + i * 10
    daXian.push({
      start: ageStart,
      end: ageStart + 9,
    })
  }

  // 如果是逆行，反转大限数组
  if (!isShun) {
    daXian.reverse()
  }

  return daXian
}
