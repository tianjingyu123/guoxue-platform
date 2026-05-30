/**
 * 夏令时校正模块
 * 中国夏令时历史：1986-1991 年，每年 4 月中旬至 9 月中旬执行夏令时
 * 夏令时期间，时钟拨快 1 小时（即北京时间 = 实际时间 + 1）
 * 八字排盘需将夏令时回拨 1 小时得到真实出生时间
 */

export interface DaylightSavingInfo {
  /** 是否在夏令时期间 */
  inPeriod: boolean
  /** 校正后的小时 */
  adjustedHour: number
  /** 原始小时 */
  originalHour: number
  /** 偏移量（小时） */
  offset: number
  /** 说明 */
  desc: string
}

/**
 * 中国夏令时时间表 (1986-1991)
 * 每年4月第2个周日凌晨2点 → 9月第2个周日凌晨2点
 */
const DAYLIGHT_SAVING_SCHEDULE: { year: number; startMMDD: string; endMMDD: string }[] = [
  { year: 1986, startMMDD: '0504', endMMDD: '0914' },
  { year: 1987, startMMDD: '0412', endMMDD: '0913' },
  { year: 1988, startMMDD: '0410', endMMDD: '0911' },
  { year: 1989, startMMDD: '0416', endMMDD: '0917' },
  { year: 1990, startMMDD: '0415', endMMDD: '0916' },
  { year: 1991, startMMDD: '0414', endMMDD: '0915' },
]

/**
 * 检查指定日期是否在中国夏令时期间
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @returns 夏令时校正信息
 */
export function getDaylightSavingOffset(year: number, month: number, day: number): DaylightSavingInfo {
  const notInPeriod: DaylightSavingInfo = {
    inPeriod: false,
    adjustedHour: -1,
    originalHour: -1,
    offset: 0,
    desc: '不在中国夏令时期间',
  }

  const entry = DAYLIGHT_SAVING_SCHEDULE.find(e => e.year === year)
  if (!entry) return notInPeriod

  const mmdd = `${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
  if (mmdd < entry.startMMDD || mmdd > entry.endMMDD) return notInPeriod

  return {
    inPeriod: true,
    adjustedHour: -1, // 调用方设置
    originalHour: -1, // 调用方设置
    offset: -1,
    desc: `${year}年中国夏令时期间（${entry.startMMDD}-${entry.endMMDD}），时钟拨快1小时，需回拨校正`,
  }
}

/**
 * 应用夏令时校正
 * @param hour 出生小时（记录的小时）
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @returns 校正后的夏令时信息
 */
export function applyDaylightSaving(hour: number, year: number, month: number, day: number): DaylightSavingInfo {
  const info = getDaylightSavingOffset(year, month, day)
  if (!info.inPeriod) return info

  // 夏令时时钟拨快了1小时，校正回拨
  const adjusted = hour - 1
  return {
    inPeriod: true,
    adjustedHour: adjusted < 0 ? adjusted + 24 : adjusted,
    originalHour: hour,
    offset: -1,
    desc: info.desc,
  }
}
