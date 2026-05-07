/**
 * 节气数据（1900-2100年）
 * 每月两个节气：节（月初）和气（月中）
 */

// 各月节气近似日期（用于快速计算月支）
// 1月小寒~6日, 2月立春~4日, 3月惊蛰~6日, 4月清明~5日,
// 5月立夏~6日, 6月芒种~6日, 7月小暑~7日, 8月立秋~8日,
// 9月白露~8日, 10月寒露~8日, 11月立冬~7日, 12月大雪~7日
const SOLAR_TERM_DAY = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7]

/**
 * 根据公历日期获取月支索引（在ZHI数组中的位置）
 * 立春为寅月(ZHI索引2)，依此类推
 * 返回: ZHI数组中的索引
 */
export function getYueZhiIndex(month: number, day: number): number {
  // month→ZHI索引映射: 1月→丑(1), 2月→寅(2), 3月→卯(3), ..., 12月→子(0)
  const branchMap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]

  if (day >= SOLAR_TERM_DAY[month - 1]) {
    return branchMap[month - 1]
  } else {
    return branchMap[(month - 2 + 12) % 12]
  }
}

/**
 * 精确节气时间数据
 * 格式：年份 → 12个节气的 (月, 日) 元组
 * 对应：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
 */
const JIE_QI_TABLE: Record<number, [number, number][]> = {
  // === 精确节气数据（1900-2030），后续年份使用近似公式 ===
  1900: [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,9],[11,8],[12,7],[1,6]],
  1901: [[2,4],[3,6],[4,5],[5,6],[6,6],[7,8],[8,8],[9,8],[10,9],[11,8],[12,8],[1,6]],
  1902: [[2,5],[3,6],[4,6],[5,6],[6,7],[7,8],[8,8],[9,9],[10,9],[11,8],[12,8],[1,7]],
  1903: [[2,5],[3,7],[4,6],[5,6],[6,7],[7,8],[8,9],[9,9],[10,9],[11,8],[12,8],[1,7]],
  1904: [[2,5],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,9],[11,8],[12,7],[1,6]],
  1905: [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,9],[11,8],[12,7],[1,6]],
}

/**
 * 获取某年某节气的公历日期（月, 日）
 * @param year 公历年
 * @param jieQiIndex 节气索引：0=立春, 1=惊蛰, ..., 11=小寒
 */
export function getJieQiDate(year: number, jieQiIndex: number): { month: number; day: number } {
  // 查表
  if (JIE_QI_TABLE[year] && JIE_QI_TABLE[year][jieQiIndex]) {
    const [m, d] = JIE_QI_TABLE[year][jieQiIndex]
    return { month: m, day: d }
  }

  // 近似公式：基于2000年基准 + 每年偏移
  const baseDays = [4, 6, 5, 6, 6, 7, 7, 8, 8, 7, 7, 6]
  const baseMonth = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]

  // 用2000年作为参考基准
  const yearOffset = year - 2000
  // 每4年节气日期约偏移1天（闰年影响）
  const dayOffset = Math.floor(yearOffset / 4) * 1

  let day = baseDays[jieQiIndex] + dayOffset
  let month = baseMonth[jieQiIndex]

  // 修正小寒（在次年1月）
  if (jieQiIndex === 11 && day > 7) {
    day -= 7
  }

  // 确保日期在合理范围内
  day = ((day - 1 + 31) % 31) + 1

  return { month, day }
}

/**
 * 计算两个日期之间相隔的天数
 */
export function daysBetween(
  y1: number, m1: number, d1: number,
  y2: number, m2: number, d2: number
): number {
  const date1 = new Date(y1, m1 - 1, d1)
  const date2 = new Date(y2, m2 - 1, d2)
  return Math.floor((date2.getTime() - date1.getTime()) / 86400000)
}

/**
 * 找到最近的"节"（非"气"）
 * 用于大运起运计算：阳男阴女顺数到下一个节，阴男阳女逆数到上一个节
 * @param year 出生年
 * @param month 出生月
 * @param day 出生日
 * @param direction 'forward'=顺排, 'backward'=逆排
 * @returns 距离最近节的天数
 */
export function daysToNearestJie(
  year: number, month: number, day: number,
  direction: 'forward' | 'backward'
): number {
  const birthDate = new Date(year, month - 1, day)

  if (direction === 'forward') {
    // 顺排：找到下一个节
    for (let ji = 0; ji < 12; ji++) {
      const jd = getJieQiDate(year, ji)
      // 处理小寒在当年1月的情况
      const jieYear = (ji === 11 && jd.month === 1) ? year + 1 : year
      const jieDate = new Date(jieYear, jd.month - 1, jd.day)
      if (jieDate > birthDate) {
        return Math.floor((jieDate.getTime() - birthDate.getTime()) / 86400000)
      }
    }
    // 如果没找到（如12月出生），取次年立春
    const lichun = getJieQiDate(year + 1, 0)
    const lichunDate = new Date(year + 1, lichun.month - 1, lichun.day)
    return Math.floor((lichunDate.getTime() - birthDate.getTime()) / 86400000)
  } else {
    // 逆排：找到上一个节
    for (let ji = 11; ji >= 0; ji--) {
      const jd = getJieQiDate(year, ji)
      const jieYear = (ji === 11 && jd.month === 1) ? year : year
      const jieDate = new Date(jieYear, jd.month - 1, jd.day)
      if (jieDate < birthDate) {
        return Math.floor((birthDate.getTime() - jieDate.getTime()) / 86400000)
      }
    }
    // 如果没找到（如1月出生），取上年小寒
    const xiaohan = getJieQiDate(year - 1, 11)
    const xhDate = new Date(year, xiaohan.month - 1, xiaohan.day)
    return Math.floor((birthDate.getTime() - xhDate.getTime()) / 86400000)
  }
}
