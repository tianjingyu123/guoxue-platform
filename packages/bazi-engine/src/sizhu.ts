/**
 * 四柱推算模块
 * 包含：年柱、月柱、日柱、时柱 的干支计算
 */
import type { BaziInput, Gan, Zhi, ShiShen, Pillar, SiZhu, ZiZuo } from './types'
import {
  GAN, ZHI, ZHI_CANG, ZHI_GAN, WU_HU_DUN, WU_SHU_DUN,
  NA_YIN, SHENG_XIAO, SHI_SHENG_YANG, SHI_SHENG_YIN,
  CHANG_SHENG, DI_SHI,
} from './constants'
import { getYueZhiIndex, getNianZhuYear } from './jieqi'

// ---------- 年柱 ----------
/**
 * 计算年柱干支（按立春分界）
 * 1984年为甲子年（基准年）
 * @param year 公历年份
 * @param month 公历月（1-12），用于判定立春前后
 * @param day 公历日，用于判定立春前后
 * @param hour 小时（可选），用于精确判定
 */
export function calcNianZhu(year: number, month?: number, day?: number, hour?: number): { ganZhi: string; gan: Gan; zhi: Zhi } {
  // 按立春分界确定年柱所用的农历年
  const nianYear = (month !== undefined && day !== undefined)
    ? getNianZhuYear(year, month, day, hour)
    : year

  const abs = Math.abs(nianYear - 1984)
  let ganIdx: number, zhiIdx: number
  if (nianYear >= 1984) {
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
export function calcShengXiao(year: number, month?: number, day?: number, hour?: number): string {
  const { zhi } = calcNianZhu(year, month, day, hour)
  return SHENG_XIAO[ZHI.indexOf(zhi)]
}

// ---------- 日柱（公历→干支）----------
// 1900-01-01 = 甲戌日: 甲(ganIdx=0), 戌(zhiIdx=10)
// 60甲子序号: 甲子=0, 乙丑=1, ..., 癸酉=9, 甲戌=10

/** 判断闰年 */
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/** 某年某月天数 */
const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** 从 1900-01-01 起算的天数（纯数学计算，无时区依赖） */
function daysSince1900(year: number, month: number, day: number): number {
  if (year >= 1900) {
    let total = 0
    for (let y = 1900; y < year; y++) {
      total += isLeapYear(y) ? 366 : 365
    }
    for (let m = 1; m < month; m++) {
      total += MONTH_DAYS[m] + (m === 2 && isLeapYear(year) ? 1 : 0)
    }
    return total + day - 1
  }
  // 1900年之前：反向计算到 1900-01-01，取负数
  let total = 0
  const md = MONTH_DAYS[month] + (month === 2 && isLeapYear(year) ? 1 : 0)
  total += md - day + 1
  for (let m = month + 1; m <= 12; m++) {
    total += MONTH_DAYS[m] + (m === 2 && isLeapYear(year) ? 1 : 0)
  }
  for (let y = year + 1; y < 1900; y++) {
    total += isLeapYear(y) ? 366 : 365
  }
  return -total
}

/**
 * 公历日期 → 日干支
 * @param year 公历年
 * @param month 公历月 (1-12)
 * @param day 公历日
 * @param dayOffset 日偏移修正（早晚子时用：晚子时+1用次日日柱）
 */
export function calcRiZhu(
  yearOrDate: number | Date,
  month?: number,
  day?: number,
  dayOffset = 0,
): { ganZhi: string; gan: Gan; zhi: Zhi } {
  let diffDays: number
  if (typeof yearOrDate === 'number') {
    diffDays = daysSince1900(yearOrDate, month!, day!)
  } else {
    // 兼容旧的 Date 调用方式
    const d = yearOrDate
    diffDays = daysSince1900(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
  // 1900-01-01 是甲戌日，60甲子序号=10
  const offset = diffDays + 10 + dayOffset
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

// ---------- 十二长生 / 星运 ----------
/**
 * 计算日干在地支上的十二长生状态（星运）
 * @param riGan 日干
 * @param zhi 目标地支
 * @returns 地势名称（长生/沐浴/冠带/.../养）
 */
function calcXingYun(riGan: Gan, zhi: Zhi): string {
  const changShengZhi = CHANG_SHENG[riGan]
  const csIdx = ZHI.indexOf(changShengZhi)
  const targetIdx = ZHI.indexOf(zhi)
  const riIdx = GAN.indexOf(riGan)
  const isYang = riIdx % 2 === 0
  // 阳干顺行（顺时针数十二长生），阴干逆行（逆时针数十二长生）
  const offset = isYang
    ? ((targetIdx - csIdx) % 12 + 12) % 12
    : ((csIdx - targetIdx) % 12 + 12) % 12
  return DI_SHI[offset]
}

// ---------- 自坐 ----------
export function calcZiZuo(riGan: Gan, riZhi: Zhi): ZiZuo {
  const shiShen = calcShiShen(riGan, riZhi)
  const descMap: Record<string, string> = {
    '比': '日坐比肩，个性独立自尊心强',
    '劫': '日坐劫财，慷慨大方但有破耗',
    '食': '日坐食神，温厚善良、福气深厚',
    '伤': '日坐伤官，聪明过人但锋芒毕露',
    '才': '日坐偏财，慷慨大方善于理财',
    '财': '日坐正财，勤俭持家重视物质',
    '杀': '日坐七杀，刚强果断事业心强',
    '官': '日坐正官，正直守法重视名誉',
    '枭': '日坐偏印，思维独特悟性高',
    '印': '日坐正印，仁慈善良依赖心强',
  }
  return {
    riGan,
    riZhi,
    shiShen,
    desc: descMap[shiShen] || `日干${riGan}坐${riZhi}(${shiShen})`,
  }
}

// ---------- 完整四柱（含立春分界 + 早晚子时 + 真太阳时预处理）----------
/**
 * 计算完整四柱
 * @param input 出生信息（已预处理真太阳时）
 */
export function calcSiZhu(input: BaziInput): SiZhu {
  const year = input.year
  const month = input.month
  const day = input.day
  const hour = input.hour

  // 早晚子时模式处理
  const ziShiMode = input.ziShiMode || 'traditional'
  const isLateZi = hour >= 23
  let dayOffset = 0
  let effectiveHour: number

  if (isLateZi) {
    if (ziShiMode === 'traditional') {
      // 传统派：23点后即次日子时，日柱用次日
      dayOffset = 1
      effectiveHour = hour - 24
    } else {
      // 现代派：23-0为晚子时，日柱不变但时柱用次日日干
      // 晚子时 (23:00-23:59) → 日柱当天，时柱次日干
      dayOffset = 0
      effectiveHour = hour - 24
    }
  } else {
    effectiveHour = hour
  }

  // 年柱按立春分界
  const nian = calcNianZhu(year, month, day, hour)

  // 日柱（纯数学计算，无时区问题）
  const ri = calcRiZhu(year, month, day, dayOffset)

  // 月柱（使用精准节气）
  const yueIdx = getYueZhiIndex(month, day, year)
  const yue = calcYueZhu(nian.gan, yueIdx)

  // 时柱（五鼠遁用日干）
  const adjustedHour = effectiveHour < 0 ? effectiveHour + 24 : effectiveHour
  const shi = calcShiZhu(ri.gan, adjustedHour)

  function makePillar(gz: { ganZhi: string; gan: Gan; zhi: Zhi }, riGan: Gan): Pillar {
    const cangGan = ZHI_CANG[ZHI.indexOf(gz.zhi)].map(cg => ({
      gan: cg.gan,
      shiShen: calcShiShen(riGan, cg.gan),
      type: cg.shiShen as '元' | '余' | '库',
    }))
    const fuXing = cangGan.filter(cg => cg.type !== '元').map(cg => ({
      gan: cg.gan,
      shiShen: cg.shiShen,
      type: cg.type,
    }))
    return {
      gan: gz.gan,
      zhi: gz.zhi,
      ganShiShen: calcShiShen(riGan, gz.gan),
      zhiShiShen: calcShiShen(riGan, ZHI_GAN[ZHI.indexOf(gz.zhi)]),
      cangGan,
      nayin: NA_YIN[gz.ganZhi] || '',
      xingYun: calcXingYun(riGan, gz.zhi),
      fuXing: fuXing.length > 0 ? fuXing : undefined,
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
