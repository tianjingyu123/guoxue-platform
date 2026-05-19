/**
 * 格局分析 + 用神 + 五行能量
 * 基于月令透出判断格局，结合日干旺衰定用神
 */
import type { Gan, Zhi, SiZhu, GeJu, WuXingEnergy } from './types'
import { calcShiShen } from './sizhu'

// ==================== 五行映射 ====================
const GAN_WU_XING: Record<string, string> = {
  '甲': '木','乙': '木','丙': '火','丁': '火',
  '戊': '土','己': '土','庚': '金','辛': '金',
  '壬': '水','癸': '水',
}
const ZHI_WU_XING: Record<string, string> = {
  '寅': '木','卯': '木',
  '巳': '火','午': '火',
  '申': '金','酉': '金',
  '亥': '水','子': '水',
  '辰': '土','戌': '土','丑': '土','未': '土',
}
const WU_XING_LIST = ['木','火','土','金','水'] as const

// ==================== 日干旺衰初判 ====================
/** 判断日干得令与否（月支是否生扶日干） */
function deLing(riGan: Gan, yueZhi: Zhi): 'wang' | 'xiang' | 'xiu' | 'qiu' | 'si' {
  const riWx = GAN_WU_XING[riGan]
  const yueWx = ZHI_WU_XING[yueZhi]

  // 同五行 → 旺
  if (riWx === yueWx) return 'wang'
  // 月令生我 → 相
  const sheng: Record<string, string> = { '木': '火','火': '土','土': '金','金': '水','水': '木' }
  if (sheng[yueWx] === riWx) return 'xiang'
  // 我生月令 → 休
  if (sheng[riWx] === yueWx) return 'xiu'
  // 我克月令 → 囚
  const ke: Record<string, string> = { '木': '土','土': '水','水': '火','火': '金','金': '木' }
  if (ke[riWx] === yueWx) return 'qiu'
  // 月令克我 → 死
  if (ke[yueWx] === riWx) return 'si'
  return 'si'
}

/** 计算日干强弱分值 */
function calcDayStrength(siZhu: SiZhu): { score: number; level: '极旺' | '偏旺' | '中和' | '偏弱' | '极弱' } {
  const riGan = siZhu.ri.gan
  const riWx = GAN_WU_XING[riGan]

  // 同五行+生我五行加分，克泄耗减分
  const shengMap: Record<string, string> = { '木': '水','火': '木','土': '火','金': '土','水': '金' }
  const keMap: Record<string, string> = { '木': '金','火': '水','土': '木','金': '火','水': '土' }
  const shengWo = shengMap[riWx] // 生我
  const keWo = keMap[riWx]       // 克我

  let score = 0

  // 月支权重最高
  const yueWx = ZHI_WU_XING[siZhu.yue.zhi]
  if (yueWx === riWx) score += 40
  else if (yueWx === shengWo) score += 30
  else if (yueWx === keWo) score -= 30

  // 日支
  const riWx2 = ZHI_WU_XING[siZhu.ri.zhi]
  if (riWx2 === riWx) score += 30
  else if (riWx2 === shengWo) score += 20
  else if (riWx2 === keWo) score -= 25

  // 天干
  for (const p of [siZhu.nian, siZhu.yue, siZhu.shi]) {
    const wx = GAN_WU_XING[p.gan]
    if (wx === riWx) score += 15
    else if (wx === shengWo) score += 10
    else if (wx === keWo) score -= 10
  }

  // 地支
  for (const p of [siZhu.nian, siZhu.shi]) {
    const wx = ZHI_WU_XING[p.zhi]
    if (wx === riWx) score += 10
    else if (wx === shengWo) score += 8
    else if (wx === keWo) score -= 8
  }

  if (score >= 60) return { score, level: '极旺' }
  if (score >= 20) return { score, level: '偏旺' }
  if (score >= -20) return { score, level: '中和' }
  if (score >= -50) return { score, level: '偏弱' }
  return { score, level: '极弱' }
}

// ==================== 格局判断 ====================

/** 月令对应的五行天干 */
const MONTH_WX_GANS: Record<string, Gan[]> = {
  '木': ['甲','乙'], '火': ['丙','丁'], '土': ['戊','己'],
  '金': ['庚','辛'], '水': ['壬','癸'],
}

/** 格局名称映射 */
const SHI_SHEN_GE_NAMES: Record<string, string> = {
  '官': '正官格', '杀': '七杀格', '印': '正印格', '枭': '偏印格',
  '财': '正财格', '才': '偏财格', '食': '食神格', '伤': '伤官格',
}

/** 判断格局 */
export function calcGeJu(siZhu: SiZhu): GeJu {
  const riGan = siZhu.ri.gan
  const yueZhi = siZhu.yue.zhi
  const yueGan = siZhu.yue.gan
  const yueWx = ZHI_WU_XING[yueZhi]

  // 月支对应的天干
  const monthGans = MONTH_WX_GANS[yueWx] || []

  // 1. 月令本气透出 → 以透出十神定格

  // 检查月令天干是否透出
  let patternGan: Gan | null = null
  let patternType: 'zheng' | 'bian' = 'zheng'

  // 月干优先
  if (monthGans.includes(yueGan)) {
    patternGan = yueGan
  }
  // 再看年月时干
  const otherGans = [siZhu.nian.gan, siZhu.ri.gan, siZhu.shi.gan]
  if (!patternGan) {
    for (const g of otherGans) {
      if (monthGans.includes(g)) {
        patternGan = g
        break
      }
    }
  }

  // 月令不透，或日干本身为月令 → 建禄/阳刃
  const riWx = GAN_WU_XING[riGan]
  if (!patternGan || riWx === yueWx) {
    // 建禄：月令为日干禄位
    const luMap: Record<Gan, Zhi> = {
      '甲': '寅','乙': '卯','丙': '巳','丁': '午','戊': '巳',
      '己': '午','庚': '申','辛': '酉','壬': '亥','癸': '子',
    }
    const renMap: Record<Gan, Zhi> = {
      '甲': '卯','乙': '寅','丙': '午','丁': '巳','戊': '午',
      '己': '巳','庚': '酉','辛': '申','壬': '子','癸': '亥',
    }

    if (luMap[riGan] === yueZhi) {
      patternType = 'bian'
      const strength = calcDayStrength(siZhu)
      const geName = `建禄格（${strength.level}）`
      return buildGeJuResult(geName, 'bian', siZhu, strength)
    }
    if (renMap[riGan] === yueZhi) {
      patternType = 'bian'
      const strength = calcDayStrength(siZhu)
      const geName = `阳刃格（${strength.level}）`
      return buildGeJuResult(geName, 'bian', siZhu, strength)
    }

    // 看其他天干透出的月令之气
    patternGan = monthGans[0] || '甲'
    patternType = 'zheng'
  }

  const shiShen = calcShiShen(riGan, patternGan)
  const geName = SHI_SHEN_GE_NAMES[shiShen] || '杂格'

  const strength = calcDayStrength(siZhu)

  // 特殊变格检测
  const specialPattern = detectSpecialPattern(siZhu, strength)
  if (specialPattern) {
    return specialPattern
  }

  return buildGeJuResult(geName, patternType, siZhu, strength)
}

/** 检测特殊格局 */
function detectSpecialPattern(siZhu: SiZhu, strength: { score: number; level: string }): GeJu | null {
  const riGan = siZhu.ri.gan
  const riWx = GAN_WU_XING[riGan]

  // 从强格：日干极旺，全盘生扶，无克泄
  if (strength.level === '极旺' && strength.score >= 70) {
    let allSupport = true
    for (const g of [siZhu.nian.gan, siZhu.yue.gan, siZhu.shi.gan]) {
      const ss = calcShiShen(riGan, g)
      if (['杀','官','财','才','食','伤'].includes(ss)) {
        allSupport = false
        break
      }
    }
    if (allSupport) {
      return {
        name: `从强格（${strength.level}）`,
        type: 'bian',
        yongShen: riWx,
        xiShen: '生扶日干之五行',
        jiShen: '克制日干之五行',
        desc: '日主极旺，全局生扶，顺其旺势为用',
      }
    }
  }

  // 从弱格：日干极弱，全盘克泄耗
  if (strength.level === '极弱' && strength.score <= -60) {
    let allWeaken = true
    for (const g of [siZhu.nian.gan, siZhu.yue.gan, siZhu.shi.gan]) {
      const ss = calcShiShen(riGan, g)
      if (!['杀','官','财','才','食','伤'].includes(ss)) {
        allWeaken = false
        break
      }
    }
    if (allWeaken) {
      return {
        name: `从弱格（${strength.level}）`,
        type: 'bian',
        yongShen: '克制日干之五行',
        xiShen: '克泄耗日干之五行',
        jiShen: '生扶日干之五行',
        desc: '日主极弱，全局克泄，顺势从弱为用',
      }
    }
  }

  return null
}

/** 构建格局结果 */
function buildGeJuResult(geName: string, type: 'zheng' | 'bian', siZhu: SiZhu, strength: { score: number; level: string }): GeJu {
  const riGan = siZhu.ri.gan
  const riWx = GAN_WU_XING[riGan]
  const yueZhi = siZhu.yue.zhi
  const yueWx = ZHI_WU_XING[yueZhi]

  const keMap: Record<string, string> = { '木': '金','火': '水','土': '木','金': '火','水': '土' }
  const shengMap: Record<string, string> = { '木': '水','火': '木','土': '火','金': '土','水': '金' }

  let yongShen: string
  let xiShen: string
  let jiShen: string

  if (strength.level === '极旺' || strength.level === '偏旺') {
    yongShen = keMap[riWx] + '(克)'
    jiShen = riWx + '、' + shengMap[riWx]
    xiShen = '耗泄日主之五行'
  } else if (strength.level === '极弱' || strength.level === '偏弱') {
    yongShen = shengMap[riWx] + '(生)'
    jiShen = keMap[riWx]
    xiShen = '生扶日主之五行'
  } else {
    yongShen = '调候取用'
    jiShen = ''
    xiShen = ''
  }

  return {
    name: geName,
    type,
    yongShen,
    xiShen,
    jiShen,
    desc: `日主${riWx}生于${yueWx}月，得令情况：${deLing(riGan, yueZhi)}，综合强弱：${strength.level}(${strength.score}分)`,
  }
}

// ==================== 五行能量 ====================
export function calcWuXingEnergy(siZhu: SiZhu): WuXingEnergy {
  const scores: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }

  // 天干权重
  for (const p of [siZhu.nian, siZhu.yue, siZhu.ri, siZhu.shi]) {
    scores[GAN_WU_XING[p.gan]] += 10
    scores[ZHI_WU_XING[p.zhi]] += 8
    // 藏干加分
    for (const cg of p.cangGan) {
      scores[GAN_WU_XING[cg.gan]] += 3
    }
  }

  // 找出最强和最弱
  let maxWx = '木', minWx = '木'
  for (const wx of WU_XING_LIST) {
    if (scores[wx] > scores[maxWx]) maxWx = wx
    if (scores[wx] < scores[minWx]) minWx = wx
  }

  const desc = `五行${maxWx}最旺(${scores[maxWx]}分)，${minWx}最弱(${scores[minWx]}分)`

  return {
    mu: scores['木'], huo: scores['火'], tu: scores['土'],
    jin: scores['金'], shui: scores['水'], desc,
  }
}
