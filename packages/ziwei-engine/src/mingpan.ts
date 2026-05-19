/**
 * 命盘核心计算
 *
 * 包含：定命宫、定十二宫、定五行局、安紫微星、安十四主星、安六辅星、
 *      安神煞、定身宫、定宫干、定大限 = 完整命盘
 */
import type { ZiweiInput, ZiweiResult, GongWei, GongName, Zhi, Gan, Star } from './types'
import {
  ZHI, WU_XING_JU_TABLE, WU_XING_JU_VALUES,
  ZIWEI_XI_STARS, TIANFU_XI_STARS,
  SHI_ER_GONG_NAMES, LIU_FU_XING,
  LU_CUN_TABLE, HUO_XING_OFFSET, LING_XING_OFFSET,
  getZhiGroupIndex, getGanGroupIndex,
  getZhiIndex,
} from './constants'
import { calcSiHua } from './sihua'
import { calcShenSha } from './shensha'
import { checkGeShi } from './geshi'
import {
  getSanFang, getDuiGong, getGongQi,
  getShiErGongZhi, getGongGan, calcDaXian,
} from './shiergong'

/**
 * 定命宫地支
 *
 * 算法：从寅宫（索引2）起正月，顺数到农历生月，再逆数到生时
 */
export function calcMingGongZhi(lunarMonth: number, lunarHourZhi: Zhi): Zhi {
  const hourIdx = getZhiIndex(lunarHourZhi)
  // 命宫地支索引 = (2 + month - 1 - hourIdx + 12) % 12
  const mingZhiIdx = (1 + lunarMonth - hourIdx + 12) % 12
  return ZHI[mingZhiIdx]
}

/**
 * 定身宫地支
 *
 * 算法：从寅宫起正月，顺数到生月，再顺数到生时（与命宫的区别在于顺逆）
 */
export function calcShenGongZhi(lunarMonth: number, lunarHourZhi: Zhi): Zhi {
  const hourIdx = getZhiIndex(lunarHourZhi)
  const shenZhiIdx = (1 + lunarMonth + hourIdx) % 12
  return ZHI[shenZhiIdx]
}

/**
 * 定十二宫地支列表
 * 从命宫开始逆时针排列
 */
export function calcShiErGong(mingGongZhi: Zhi): { name: GongName; zhi: Zhi }[] {
  const mingZhiIdx = getZhiIndex(mingGongZhi)
  const zhiList = getShiErGongZhi(mingZhiIdx)
  return SHI_ER_GONG_NAMES.map((name, i) => ({
    name,
    zhi: zhiList[i],
  }))
}

/**
 * 定五行局
 *
 * 根据命宫天干地支查五行局表
 */
export function calcWuXingJu(mingGongGan: Gan, mingGongZhi: Zhi): string {
  const zhiGroup = getZhiGroupIndex(mingGongZhi)
  const ganGroup = getGanGroupIndex(mingGongGan)
  return WU_XING_JU_TABLE[zhiGroup][ganGroup]
}

/**
 * 安紫微星
 *
 * 算法：五行局数值除农历日，商数（有余数则+1）即为紫微从寅宫起的宫位数
 * 若结果>12，则循环取模
 */
export function calcZiweiPosition(wuXingJu: string, lunarDay: number): number {
  const juValue = WU_XING_JU_VALUES[wuXingJu]
  if (!juValue) return 0

  // 紫微位置（1-based，从寅=1开始）
  const pos = Math.ceil(lunarDay / juValue)
  // 取模确保在1-12范围内
  return ((pos - 1) % 12) + 1
}

/**
 * 安十四主星
 *
 * 紫微系（随紫微位置逆时针移动）
 * 天府系（随天府位置顺时针移动）
 *
 * @returns 星曜名→地支索引的映射
 */
export function anShiSiZhuXing(ziweiPos: number): Record<string, number> {
  // 紫微索引：将紫微位置（寅=1起）转为 ZHI 数组索引（子=0,丑=1,寅=2,...）
  const ziweiIdx = (ziweiPos + 1) % 12  // pos=1(寅)→2, pos=2(卯)→3, ..., pos=12(丑)→1

  // 天府索引：天府在紫微的+2位置（均为ZHI索引）
  const tianfuIdx = (ziweiIdx + 2) % 12

  const result: Record<string, number> = {}

  // 1. 紫微系
  for (const star of ZIWEI_XI_STARS) {
    const idx = (ziweiIdx + star.offset + 12) % 12
    result[star.name] = idx
  }

  // 2. 天府系
  for (const star of TIANFU_XI_STARS) {
    const idx = (tianfuIdx + star.offset) % 12
    result[star.name] = idx
  }

  return result
}

/**
 * 安六辅星：左辅、右弼、文昌、文曲、天魁、天钺
 */
export function anLiuFuXing(
  lunarMonth: number,
  lunarHourZhi: Zhi,
  lunarYearGan: Gan,
): Record<string, number> {
  const hourIdx = getZhiIndex(lunarHourZhi)
  const result: Record<string, number> = {}

  for (const [name, calcFn] of Object.entries(LIU_FU_XING)) {
    const idx = calcFn(lunarMonth, hourIdx, lunarYearGan)
    result[name] = idx
  }

  return result
}

/**
 * 安七煞辅星：火星、铃星、禄存、擎羊、陀罗、地空、地劫
 */
export function anQiShaXing(
  lunarYearGan: Gan,
  lunarYearZhi: Zhi,
  lunarHourZhi: Zhi,
): Record<string, number> {
  const hourIdx = getZhiIndex(lunarHourZhi)
  const result: Record<string, number> = {}

  // 火星：年支定起宫，顺数到生时
  result['火星'] = (HUO_XING_OFFSET[lunarYearZhi] + hourIdx) % 12

  // 铃星：年支定起宫，顺数到生时
  result['铃星'] = (LING_XING_OFFSET[lunarYearZhi] + hourIdx) % 12

  // 禄存：年干定
  const luCunIdx = LU_CUN_TABLE[lunarYearGan]
  result['禄存'] = luCunIdx

  // 擎羊：禄存前一位（顺时针+1）
  result['擎羊'] = (luCunIdx + 1) % 12

  // 陀罗：禄存后一位（逆时针-1）
  result['陀罗'] = (luCunIdx - 1 + 12) % 12

  // 地空：亥宫起子时，逆数到生时
  result['地空'] = (11 - hourIdx + 12) % 12

  // 地劫：亥宫起子时，顺数到生时
  result['地劫'] = (11 + hourIdx) % 12

  return result
}
function makeStar(name: string, type: 'main' | 'assist' | 'sisha'): Star {
  // 从常量表中获取星曜属性
  const mainStars: Record<string, { wuXing: '金' | '木' | '水' | '火' | '土'; liangJi: '吉' | '凶' | '中性' }> = {
    '紫微': { wuXing: '土', liangJi: '吉' },
    '天机': { wuXing: '木', liangJi: '吉' },
    '太阳': { wuXing: '火', liangJi: '吉' },
    '武曲': { wuXing: '金', liangJi: '吉' },
    '天同': { wuXing: '水', liangJi: '吉' },
    '廉贞': { wuXing: '火', liangJi: '凶' },
    '天府': { wuXing: '土', liangJi: '吉' },
    '太阴': { wuXing: '水', liangJi: '吉' },
    '贪狼': { wuXing: '木', liangJi: '凶' },
    '巨门': { wuXing: '水', liangJi: '凶' },
    '天相': { wuXing: '水', liangJi: '吉' },
    '天梁': { wuXing: '土', liangJi: '吉' },
    '七杀': { wuXing: '金', liangJi: '凶' },
    '破军': { wuXing: '水', liangJi: '凶' },
  }

  const assistStars: Record<string, { wuXing: '金' | '木' | '水' | '火' | '土'; liangJi: '吉' | '凶' | '中性' }> = {
    '左辅': { wuXing: '土', liangJi: '吉' },
    '右弼': { wuXing: '水', liangJi: '吉' },
    '文昌': { wuXing: '金', liangJi: '吉' },
    '文曲': { wuXing: '水', liangJi: '吉' },
    '天魁': { wuXing: '火', liangJi: '吉' },
    '天钺': { wuXing: '火', liangJi: '吉' },
  }

  const sishaStars: Record<string, { wuXing: '金' | '木' | '水' | '火' | '土'; liangJi: '吉' | '凶' | '中性' }> = {
    '天刑': { wuXing: '火', liangJi: '凶' },
    '天姚': { wuXing: '水', liangJi: '凶' },
    '解神': { wuXing: '土', liangJi: '吉' },
    '天巫': { wuXing: '水', liangJi: '中性' },
    '火星': { wuXing: '火', liangJi: '凶' },
    '铃星': { wuXing: '火', liangJi: '凶' },
    '禄存': { wuXing: '土', liangJi: '吉' },
    '擎羊': { wuXing: '金', liangJi: '凶' },
    '陀罗': { wuXing: '金', liangJi: '凶' },
    '地空': { wuXing: '水', liangJi: '凶' },
    '地劫': { wuXing: '水', liangJi: '凶' },
  }

  if (type === 'main') {
    const info = mainStars[name]
    if (info) {
      return { name, type, wuXing: info.wuXing, liangJi: info.liangJi }
    }
  }

  if (type === 'assist') {
    const info = assistStars[name]
    if (info) {
      return { name, type, wuXing: info.wuXing, liangJi: info.liangJi }
    }
  }

  if (type === 'sisha') {
    const info = sishaStars[name]
    if (info) {
      return { name, type, wuXing: info.wuXing, liangJi: info.liangJi }
    }
  }

  return { name, type, wuXing: '土', liangJi: '中性' }
}

/**
 * 完整命盘计算
 */
export function calcMingPan(input: ZiweiInput): ZiweiResult {
  const {
    gender, lunarMonth, lunarDay, lunarHour, lunarYearGan, lunarYearZhi,
  } = input

  // 1. 定命宫地支
  const mingGongZhi = calcMingGongZhi(lunarMonth, lunarHour)

  // 2. 定命宫天干（五虎遁）
  const mingGongGan = getGongGan(lunarYearGan, mingGongZhi)

  // 3. 定五行局
  const wuXingJu = calcWuXingJu(mingGongGan, mingGongZhi)
  const wuXingJuValue = WU_XING_JU_VALUES[wuXingJu] || 2

  // 4. 安紫微星
  const ziweiPos = calcZiweiPosition(wuXingJu, lunarDay)

  // 5. 安十四主星
  const zhuXingPositions = anShiSiZhuXing(ziweiPos)

  // 6. 安六辅星
  const liuFuPositions = anLiuFuXing(lunarMonth, lunarHour, lunarYearGan)

  // 7. 安神煞
  const shenShaList = calcShenSha(lunarMonth, getZhiIndex(lunarHour), lunarYearGan, lunarYearZhi)

  // 7b. 安七煞辅星（火星/铃星/禄存/擎羊/陀罗/地空/地劫）
  const qiShaPositions = anQiShaXing(lunarYearGan, lunarYearZhi, lunarHour)

  // 8. 定十二宫
  const shiErGong = calcShiErGong(mingGongZhi)

  // 9. 定身宫
  const shenGongZhi = calcShenGongZhi(lunarMonth, lunarHour)
  const shenGongNameIndex = shiErGong.findIndex(g => g.zhi === shenGongZhi)
  const shenGongName = shenGongNameIndex >= 0
    ? SHI_ER_GONG_NAMES[shenGongNameIndex]
    : SHI_ER_GONG_NAMES[0]

  // 10. 定宫干（各宫天干）
  const gongGanList = shiErGong.map(g => getGongGan(lunarYearGan, g.zhi))

  // 11. 四化
  const siHua = calcSiHua(lunarYearGan)

  // 12. 大限
  const daXianList = calcDaXian(
    getZhiIndex(mingGongZhi),
    lunarYearGan,
    gender,
    wuXingJuValue,
  )

  // 13. 构建宫位对象
  const gongWei: GongWei[] = shiErGong.map((g, i) => {
    const gan = gongGanList[i]
    const zhiIdx = getZhiIndex(g.zhi)

    // 收集该宫位的主星
    const stars: Star[] = []

    // 加十四主星
    for (const [starName, starIdx] of Object.entries(zhuXingPositions)) {
      if (starIdx === zhiIdx) {
        stars.push(makeStar(starName, 'main'))
      }
    }

    // 加六辅星
    for (const [starName, starIdx] of Object.entries(liuFuPositions)) {
      if (starIdx === zhiIdx) {
        stars.push(makeStar(starName, 'assist'))
      }
    }

    // 加神煞
    for (const ss of shenShaList) {
      if (ss.zhiIdx === zhiIdx) {
        stars.push(ss.star)
      }
    }

    // 加七煞辅星
    for (const [starName, starIdx] of Object.entries(qiShaPositions)) {
      if (starIdx === zhiIdx) {
        stars.push(makeStar(starName, 'sisha'))
      }
    }

    return {
      name: g.name,
      zhi: g.zhi,
      gan,
      stars,
      shenGong: g.name === shenGongName,
      daXianStart: daXianList[i].start,
      daXianEnd: daXianList[i].end,
      sanFang: getSanFang(g.name),
      duiGong: getDuiGong(g.name),
      gongQi: getGongQi(gan, g.zhi),
    }
  })

  // 14. 获取命宫
  const mingGong = gongWei[0]

  // 15. 检测格局
  const geShi = checkGeShi(mingGong, gongWei)

  return {
    input,
    wuXingJu,
    mingGong,
    gongWei,
    siHua,
    shenGong: shenGongName,
    geShi,
  }
}
