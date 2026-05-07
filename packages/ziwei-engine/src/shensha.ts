/**
 * 紫微神煞计算
 *
 * 实现的天刑、天姚、解神、天巫等紫微特有神煞
 */
import type { Gan, Zhi, Star } from './types'
import { ZIWEI_SHEN_SHA, ZHI } from './constants'

/**
 * 计算紫微神煞
 *
 * @param lunarMonth 农历月
 * @param lunarHourIdx 时支索引（子=0）
 * @param yearGan 生年天干
 * @param yearZhi 生年地支
 * @returns 神煞星曜列表（带位置索引）
 */
export function calcShenSha(
  lunarMonth: number,
  lunarHourIdx: number,
  yearGan: Gan,
  yearZhi: Zhi,
): { star: Star; zhiIdx: number }[] {
  const result: { star: Star; zhiIdx: number }[] = []

  for (const [name, calcFn] of Object.entries(ZIWEI_SHEN_SHA)) {
    const zhiIdx = calcFn(lunarMonth, lunarHourIdx, yearGan, yearZhi)
    const wuXing = getShenShaWuXing(name)
    result.push({
      star: {
        name,
        type: 'sisha',
        wuXing,
        liangJi: getShenShaLiangJi(name),
      },
      zhiIdx,
    })
  }

  return result
}

function getShenShaWuXing(name: string): '金' | '木' | '水' | '火' | '土' {
  const map: Record<string, '金' | '木' | '水' | '火' | '土'> = {
    '天刑': '火',
    '天姚': '水',
    '解神': '土',
    '天巫': '水',
  }
  return map[name] || '土'
}

function getShenShaLiangJi(name: string): '吉' | '凶' | '中性' {
  const map: Record<string, '吉' | '凶' | '中性'> = {
    '天刑': '凶',
    '天姚': '凶',
    '解神': '吉',
    '天巫': '中性',
  }
  return map[name] || '中性'
}
