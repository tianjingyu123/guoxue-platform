/**
 * 四柱推算模块
 * 包含：年柱、月柱、日柱、时柱 的干支计算
 */
import type { BaziInput, Gan, Zhi, ShiShen, Pillar, SiZhu } from './types'
import {
  GAN, ZHI, ZHI_CANG, ZHI_GAN, WU_HU_DUN, WU_SHU_DUN,
  NA_YIN, SHENG_XIAO, SHI_SHENG_YANG, SHI_SHENG_YIN
} from './constants'
import { getYueZhiIndex } from './jieqi'

// ---------- 年柱 ----------
export function calcNianZhu(year: number): { ganZhi: string; gan: Gan; zhi: Zhi } {
  const abs = Math.abs(year - 1984)
  let ganIdx: number, zhiIdx: number
  if (year >= 1984) {
    ganIdx = abs % 10
    zhiIdx = abs % 12
  } else {
    ganIdx = (10 - abs % 10) % 10
    zhiIdx = (12 - abs % 12) % 12
  }
  return {
    ganZhi: GAN[ganIdx] + ZHI[zhiIdx],
    gan: GAN[ganIdx],
    zhi: ZHI[zhiIdx],
  }
}

// ---------- 生肖 ----------
export function calcShengXiao(year: number): string {
  const { zhi } = calcNianZhu(year)
  return SHENG_XIAO[ZHI.indexOf(zhi)]
}

// ---------- 日柱（公历→干支，简化公式）----------
const JIAZI_EPOCH = new Date('1900-01-01').getTime()
// 1900-01-01 = 甲戌日 (ganIdx=0, zhiIdx=10), 但实际查表是甲戌日

/**
 * 公历日期 → 日干支
 * 公式：日干支序号 = (date - 1900-01-01)天数 + 10
 */
export function calcRiZhu(date: Date): { ganZhi: string; gan: Gan; zhi: Zhi } {
  const diffDays = Math.floor((date.getTime() - JIAZI_EPOCH) / 86400000)
  // 1900-01-01 是甲戌日，索引11
  const offset = diffDays + 11
  const ganIdx = ((offset % 10) + 10) % 10
  const zhiIdx = ((offset % 12) + 12) % 12
  return {
    ganZhi: GAN[ganIdx] + ZHI[zhiIdx],
    gan: GAN[ganIdx],
    zhi: ZHI[zhiIdx],
  }
}

// ---------- 时柱（五鼠遁）----------
export function calcShiZhu(riGan: Gan, hour: number): { ganZhi: string; gan: Gan; zhi: Zhi } {
  // 时辰: 0点=子时, 23点也是子时
  const zhiIdx = Math.floor(((hour + 1) % 24) / 2)
  const riIdx = GAN.indexOf(riGan)
  const dunIdx = Math.floor(riIdx % 5) // 甲己→0,乙庚→1,...
  const ganIdx = (GAN.indexOf(WU_SHU_DUN[dunIdx]) + zhiIdx) % 10
  return {
    ganZhi: GAN[ganIdx] + ZHI[zhiIdx],
    gan: GAN[ganIdx],
    zhi: ZHI[zhiIdx],
  }
}

// ---------- 月柱（五虎遁）----------
export function calcYueZhu(nianGan: Gan, yueZhiIdx: number): { ganZhi: string; gan: Gan; zhi: Zhi } {
  const nianIdx = GAN.indexOf(nianGan)
  const dunIdx = Math.floor(nianIdx % 5)
  // 五虎遁从寅月(ZHI索引2)开始，计算偏移
  const yueOffset = ((yueZhiIdx - 2) % 12 + 12) % 12
  const ganIdx = (GAN.indexOf(WU_HU_DUN[dunIdx]) + yueOffset) % 10
  return {
    ganZhi: GAN[ganIdx] + ZHI[yueZhiIdx],
    gan: GAN[ganIdx],
    zhi: ZHI[yueZhiIdx],
  }
}

// ---------- 十神 ----------
function calcShiShen(riGan: Gan, targetGan: Gan | Zhi): ShiShen {
  const riIdx = GAN.indexOf(riGan)
  // 如果传地支，取地支藏干主气
  let targetIdx: number
  if (ZHI.includes(targetGan as Zhi)) {
    targetIdx = GAN.indexOf(ZHI_GAN[ZHI.indexOf(targetGan as Zhi)])
  } else {
    targetIdx = GAN.indexOf(targetGan as Gan)
  }
  const offset = targetIdx >= riIdx ? targetIdx - riIdx : targetIdx + 10 - riIdx
  const isYang = riIdx % 2 === 0
  return isYang ? SHI_SHENG_YANG[offset] : SHI_SHENG_YIN[offset]
}

// ---------- 完整四柱 ----------
export function calcSiZhu(input: BaziInput): SiZhu {
  const nian = calcNianZhu(input.year)
  const birthDate = new Date(input.year, input.month - 1, input.day, input.hour, input.minute)
  const ri = calcRiZhu(birthDate)
  const yueIdx = getYueZhiIndex(input.month, input.day)
  const yue = calcYueZhu(nian.gan, yueIdx)
  const shi = calcShiZhu(ri.gan, input.hour)

  function makePillar(gz: { ganZhi: string; gan: Gan; zhi: Zhi }, riGan: Gan): Pillar {
    const cangGan = ZHI_CANG[ZHI.indexOf(gz.zhi)].map(cg => ({
      gan: cg.gan,
      shiShen: calcShiShen(riGan, cg.gan),
    }))
    return {
      gan: gz.gan,
      zhi: gz.zhi,
      ganShiShen: calcShiShen(riGan, gz.gan),
      zhiShiShen: calcShiShen(riGan, ZHI_GAN[ZHI.indexOf(gz.zhi)]),
      cangGan,
      nayin: NA_YIN[gz.ganZhi] || '',
    }
  }

  return {
    nian: makePillar(nian, ri.gan),
    yue: makePillar(yue, ri.gan),
    ri: makePillar(ri, ri.gan),
    shi: makePillar(shi, ri.gan),
  }
}

export { calcShiShen }
