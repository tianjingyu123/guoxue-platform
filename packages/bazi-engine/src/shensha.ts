/**
 * 合冲刑害检测 + 神煞辅助 + 胎元/命宫/身宫
 */
import type { Gan, Zhi, SiZhu, FenXiTiShi, Pillar } from './types'
import {
  GAN, ZHI,
  GAN_HE_PAIRS, ZHI_HE_PAIRS, ZHI_CHONG_PAIRS, ZHI_HAI_PAIRS,
  ZHI_SAN_HE, ZHI_SAN_HUI, ZHI_SAN_XING, ZHI_ZI_XING,
  ZHI_AN_HE, ZHI_XIANG_PO, ZHI_AN_JUE,
  CHANG_SHENG, DI_SHI, WU_HU_DUN,
} from './constants'
import { calcShiShen } from './sizhu'

/** 天干五合检测 */
export function detectGanHe(gans: Gan[]): string[] {
  const results: string[] = []
  for (let i = 0; i < gans.length; i++) {
    for (let j = i + 1; j < gans.length; j++) {
      const pair: [Gan, Gan] = [gans[i], gans[j]]
      if (GAN_HE_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}合`)
      }
    }
  }
  return results
}

/** 地支六合检测 */
export function detectLiuHe(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      const pair: [Zhi, Zhi] = [zhis[i], zhis[j]]
      if (ZHI_HE_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}合`)
      }
    }
  }
  return results
}

/** 地支三合局检测 */
export function detectSanHe(zhis: Zhi[]): string[] {
  const results: string[] = []
  const zhiSet = new Set(zhis)
  for (const [a, b, c] of ZHI_SAN_HE) {
    if (zhiSet.has(a) && zhiSet.has(b) && zhiSet.has(c)) {
      results.push(`${a}${b}${c}三合`)
    }
    // 半合（任意两个）
    if (zhiSet.has(a) && zhiSet.has(b)) results.push(`${a}${b}半合`)
    if (zhiSet.has(b) && zhiSet.has(c)) results.push(`${b}${c}半合`)
    if (zhiSet.has(a) && zhiSet.has(c)) results.push(`${a}${c}半合`)
  }
  return results
}

/** 地支三会局检测 */
export function detectSanHui(zhis: Zhi[]): string[] {
  const results: string[] = []
  const zhiSet = new Set(zhis)
  for (const [a, b, c] of ZHI_SAN_HUI) {
    if (zhiSet.has(a) && zhiSet.has(b) && zhiSet.has(c)) {
      results.push(`${a}${b}${c}三会`)
    }
  }
  return results
}

/** 六冲检测 */
export function detectLiuChong(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      const pair: [Zhi, Zhi] = [zhis[i], zhis[j]]
      if (ZHI_CHONG_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}冲`)
      }
    }
  }
  return results
}

/** 六害检测 */
export function detectLiuHai(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      const pair: [Zhi, Zhi] = [zhis[i], zhis[j]]
      if (ZHI_HAI_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}害`)
      }
    }
  }
  return results
}

/** 三刑检测 */
export function detectSanXing(zhis: Zhi[]): string[] {
  const results: string[] = []
  const zhiSet = new Set(zhis)
  for (const [a, b, c] of ZHI_SAN_XING) {
    if (zhiSet.has(a) && zhiSet.has(b) && zhiSet.has(c)) {
      results.push(`${a}${b}${c}三刑`)
    }
  }
  return results
}

/** 自刑检测 */
export function detectZiXing(zhis: Zhi[]): string[] {
  const results: string[] = []
  const count: Record<string, number> = {}
  for (const z of zhis) {
    count[z] = (count[z] || 0) + 1
  }
  for (const z of ZHI_ZI_XING) {
    if (count[z] >= 2) {
      results.push(`${z}自刑`)
    }
  }
  return results
}

/** 地支暗合检测 */
export function detectAnHe(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const [a, b, desc] of ZHI_AN_HE) {
        if ((zhis[i] === a && zhis[j] === b) || (zhis[i] === b && zhis[j] === a)) {
          results.push(desc)
        }
      }
    }
  }
  return results
}

/** 地支相破检测 */
export function detectXiangPo(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const [a, b, desc] of ZHI_XIANG_PO) {
        if ((zhis[i] === a && zhis[j] === b) || (zhis[i] === b && zhis[j] === a)) {
          results.push(desc)
        }
      }
    }
  }
  return results
}

/** 地支暗绝检测 */
export function detectAnJue(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const [a, b, desc] of ZHI_AN_JUE) {
        if ((zhis[i] === a && zhis[j] === b) || (zhis[i] === b && zhis[j] === a)) {
          results.push(desc)
        }
      }
    }
  }
  return results
}

/** 完整合冲刑害检测 */
export function calcFenXiTiShi(siZhu: SiZhu): FenXiTiShi {
  const gans: Gan[] = [siZhu.nian.gan, siZhu.yue.gan, siZhu.ri.gan, siZhu.shi.gan]
  const zhis: Zhi[] = [siZhu.nian.zhi, siZhu.yue.zhi, siZhu.ri.zhi, siZhu.shi.zhi]

  return {
    ganHe: detectGanHe(gans),
    sanHe: detectSanHe(zhis),
    sanHui: detectSanHui(zhis),
    liuChong: detectLiuChong(zhis),
    liuHe: detectLiuHe(zhis),
    liuHai: detectLiuHai(zhis),
    sanXing: detectSanXing(zhis),
    ziXing: detectZiXing(zhis),
    anHe: detectAnHe(zhis),
    xiangPo: detectXiangPo(zhis),
    anJue: detectAnJue(zhis),
  }
}

// ---------- 胎元 ----------
/** 胎元 = 月干前一位 + 月支前三位 */
export function calcTaiYuan(yueGan: Gan, yueZhi: Zhi, riGan: Gan): Pillar {
  const ganIdx = (GAN.indexOf(yueGan) + 1) % 10
  const zhiIdx = (ZHI.indexOf(yueZhi) + 3) % 12
  const gan = GAN[ganIdx]
  const zhi = ZHI[zhiIdx]
  return {
    gan,
    zhi,
    ganShiShen: calcShiShen(riGan, gan),
    zhiShiShen: calcShiShen(riGan, zhi),
    cangGan: [],
    nayin: '',
  }
}

// ---------- 命宫 ----------
/** 命宫：以月支为子时，顺数到出生时辰，天干用五虎遁（年上起月法） */
export function calcMingGong(yueZhi: Zhi, shiZhi: Zhi, nianGan: Gan, riGan: Gan): Pillar {
  const yueIdx = ZHI.indexOf(yueZhi)
  const shiIdx = ZHI.indexOf(shiZhi)
  const mingZhiIdx = (yueIdx + shiIdx) % 12
  const zhi = ZHI[mingZhiIdx]

  // 命宫天干用五虎遁：年干定寅月天干，命宫地支定偏移
  const dunIdx = Math.floor(GAN.indexOf(nianGan) % 5)
  const yinGanIdx = GAN.indexOf(WU_HU_DUN[dunIdx])
  const ganIdx = (yinGanIdx + ((mingZhiIdx - 2) % 12 + 12) % 12) % 10
  const gan = GAN[ganIdx]

  return {
    gan,
    zhi,
    ganShiShen: calcShiShen(riGan, gan),
    zhiShiShen: calcShiShen(riGan, zhi),
    cangGan: [],
    nayin: '',
  }
}

// ---------- 身宫 ----------
/** 身宫：以月支为子时，逆数到出生时辰，天干用五虎遁（年上起月法） */
export function calcShenGong(yueZhi: Zhi, shiZhi: Zhi, nianGan: Gan, riGan: Gan): Pillar {
  const yueIdx = ZHI.indexOf(yueZhi)
  const shiIdx = ZHI.indexOf(shiZhi)
  const shenZhiIdx = ((yueIdx - shiIdx) % 12 + 12) % 12
  const zhi = ZHI[shenZhiIdx]

  // 身宫天干用五虎遁
  const dunIdx = Math.floor(GAN.indexOf(nianGan) % 5)
  const yinGanIdx = GAN.indexOf(WU_HU_DUN[dunIdx])
  const ganIdx = (yinGanIdx + ((shenZhiIdx - 2) % 12 + 12) % 12) % 10
  const gan = GAN[ganIdx]

  return {
    gan,
    zhi,
    ganShiShen: calcShiShen(riGan, gan),
    zhiShiShen: calcShiShen(riGan, zhi),
    cangGan: [],
    nayin: '',
  }
}

// ---------- 十二长生地势 ----------
/** 计算某个天干在地支的十二长生地势 */
export function calcDiShi(gan: Gan, zhi: Zhi): string {
  const changShengZhi = CHANG_SHENG[gan]
  if (!changShengZhi) return ''
  const csIdx = ZHI.indexOf(changShengZhi)
  const zhiIdx = ZHI.indexOf(zhi)
  const ganIdx = GAN.indexOf(gan)
  const isYang = ganIdx % 2 === 0
  // 阳干顺行，阴干逆行
  const offset = isYang
    ? ((zhiIdx - csIdx) % 12 + 12) % 12
    : ((csIdx - zhiIdx) % 12 + 12) % 12
  return DI_SHI[offset]
}

// ---------- 旺相休囚死 ----------
/** 旺相休囚死（按月令判断天干状态） */
export function calcWangXiang(riGan: Gan, yueZhi: Zhi): string {
  // 月令五行：寅卯木、巳午火、申酉金、亥子水、辰戌丑未土
  const wuXing: Record<string, string> = {
    '甲': '木','乙': '木',
    '丙': '火','丁': '火',
    '戊': '土','己': '土',
    '庚': '金','辛': '金',
    '壬': '水','癸': '水',
  }
  const zhiWuXing: Record<string, string> = {
    '寅': '木','卯': '木',
    '巳': '火','午': '火',
    '申': '金','酉': '金',
    '亥': '水','子': '水',
    '辰': '土','戌': '土','丑': '土','未': '土',
  }

  const riWx = wuXing[riGan]
  const yueWx = zhiWuXing[yueZhi]

  // 月令生我 → 相，月令同我 → 旺，我生月令 → 休，我克月令 → 囚，月令克我 → 死
  const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const keMap: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

  if (riWx === yueWx) return '旺'
  if (shengMap[yueWx] === riWx) return '相'
  if (shengMap[riWx] === yueWx) return '休'
  if (keMap[riWx] === yueWx) return '囚'
  if (keMap[yueWx] === riWx) return '死'
  return ''
}
