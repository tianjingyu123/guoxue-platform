/**
 * 紫微神煞计算
 *
 * 实现的天刑、天姚、解神、天巫等紫微特有神煞
 */
import type { Gan, Zhi, Star } from './types'
import { ZIWEI_SHEN_SHA } from './constants'

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
    '天刑': '火', '天姚': '水', '解神': '土', '天巫': '水',
    '天月': '水', '阴煞': '水',
    '红鸾': '木', '天喜': '火', '天马': '火', '华盖': '土',
    '咸池': '水', '劫煞': '火', '灾煞': '火',
    '孤辰': '木', '寡宿': '木', '龙池': '水', '凤阁': '金',
    '将星': '金', '亡神': '水', '攀鞍': '木', '指背': '金', '天煞': '火',
    '文昌': '金', '文曲': '水', '学堂': '木',
    '台辅': '土', '封诰': '金',
    '天哭': '水', '天虚': '土', '三台': '土', '八座': '金',
    '恩光': '火', '天贵': '土',
  }
  return map[name] || '土'
}

function getShenShaLiangJi(name: string): '吉' | '凶' | '中性' {
  const map: Record<string, '吉' | '凶' | '中性'> = {
    '天刑': '凶', '天姚': '凶', '解神': '吉', '天巫': '中性',
    '天月': '凶', '阴煞': '凶',
    '红鸾': '吉', '天喜': '吉', '天马': '中性', '华盖': '中性',
    '咸池': '凶', '劫煞': '凶', '灾煞': '凶',
    '孤辰': '凶', '寡宿': '凶', '龙池': '吉', '凤阁': '吉',
    '将星': '吉', '亡神': '凶', '攀鞍': '吉', '指背': '凶', '天煞': '凶',
    '文昌': '吉', '文曲': '吉', '学堂': '吉',
    '台辅': '吉', '封诰': '吉',
    '天哭': '凶', '天虚': '凶', '三台': '吉', '八座': '吉',
    '恩光': '吉', '天贵': '吉',
  }
  return map[name] || '中性'
}
