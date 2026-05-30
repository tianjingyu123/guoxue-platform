/**
 * 流年/流月/流日/流时 计算模块
 */
import type { Gan, Zhi, ShiShen, LiuNian, LiuShi } from './types'
import { GAN, ZHI, WU_HU_DUN, WU_SHU_DUN } from './constants'
import { calcNianZhu, calcRiZhu, calcShiShen } from './sizhu'

/** 流年干支 */
export function getLiuNianGanZhi(year: number) {
  return calcNianZhu(year)
}

/** 流月干支（12个月，寅月=正月起） */
export function getLiuYueGanZhi(nianGan: Gan): { month: number; ganZhi: string; gan: Gan; zhi: Zhi }[] {
  const nianIdx = GAN.indexOf(nianGan)
  const dunIdx = Math.floor(nianIdx % 5)
  const result = []

  for (let i = 0; i < 12; i++) {
    const ganIdx = (GAN.indexOf(WU_HU_DUN[dunIdx]) + i) % 10
    const zhiIdx = (i + 2) % 12
    result.push({
      month: i + 1,
      ganZhi: GAN[ganIdx] + ZHI[zhiIdx],
      gan: GAN[ganIdx],
      zhi: ZHI[zhiIdx],
    })
  }
  return result
}

/** 流日干支 */
export function getLiuRiGanZhi(year: number, month: number, day: number) {
  return calcRiZhu(year, month, day)
}

/** 流时干支 */
export function getLiuShiGanZhi(riGan: Gan, hour: number) {
  const zhiIdx = Math.floor(((hour + 1) % 24) / 2)
  const riIdx = GAN.indexOf(riGan)
  const dunIdx = Math.floor(riIdx % 5)
  const ganIdx = (GAN.indexOf(WU_SHU_DUN[dunIdx]) + zhiIdx) % 10
  return {
    ganZhi: GAN[ganIdx] + ZHI[zhiIdx],
    gan: GAN[ganIdx],
    zhi: ZHI[zhiIdx],
  }
}

/** 获取流年对日元的十神关系 */
export function getLiuNianShiShen(year: number, riGan: Gan): { ganZhi: string; ganShiShen: ShiShen; zhiShiShen: ShiShen } {
  const nian = calcNianZhu(year)
  return {
    ganZhi: nian.ganZhi,
    ganShiShen: calcShiShen(riGan, nian.gan),
    zhiShiShen: calcShiShen(riGan, nian.zhi),
  }
}

/** 获取某年的所有流月十神关系 */
export function getLiuYueShiShen(nianGan: Gan, riGan: Gan) {
  const liuYue = getLiuYueGanZhi(nianGan)
  return liuYue.map(m => ({
    ...m,
    ganShiShen: calcShiShen(riGan, m.gan),
    zhiShiShen: calcShiShen(riGan, m.zhi),
  }))
}

/** 获取某日干的十二时辰流时列表 */
export function getLiuShiList(riGan: Gan): LiuShi[] {
  const result: LiuShi[] = []
  for (let h = 0; h < 24; h += 2) {
    const shi = getLiuShiGanZhi(riGan, h)
    result.push({
      hour: h,
      ganZhi: shi.ganZhi,
      gan: shi.gan,
      zhi: shi.zhi,
      ganShiShen: calcShiShen(riGan, shi.gan),
      zhiShiShen: calcShiShen(riGan, shi.zhi),
    })
  }
  return result
}

/** 为流年填充流月 */
export function fillLiuNianLiuYue(liuNian: LiuNian, riGan: Gan): LiuNian {
  const liuYue = getLiuYueShiShen(liuNian.ganZhi[0] as Gan, riGan)
  return {
    ...liuNian,
    liuYue: liuYue.map(m => ({
      month: m.month,
      ganZhi: m.ganZhi,
      gan: m.gan,
      zhi: m.zhi,
      ganShiShen: m.ganShiShen,
      zhiShiShen: m.zhiShiShen,
    })),
  }
}
