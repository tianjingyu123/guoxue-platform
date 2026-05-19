/**
 * 真太阳时计算模块
 * 真太阳时 = 北京时间 + (当地经度 - 120°) × 4分钟 + 均时差
 * 用于修正出生时辰，提高八字排盘精度
 */

// ── 中国主要城市经度表（度） ──
const CITY_LON: Record<string, number> = {
  '北京': 116.4, '上海': 121.5, '天津': 117.2, '重庆': 106.5,
  '广州': 113.3, '深圳': 114.1, '杭州': 120.2, '南京': 118.8,
  '武汉': 114.3, '成都': 104.1, '西安': 108.9, '长沙': 113.0,
  '郑州': 113.7, '济南': 117.0, '青岛': 120.4, '大连': 121.6,
  '沈阳': 123.4, '长春': 125.3, '哈尔滨': 126.6, '昆明': 102.7,
  '贵阳': 106.7, '南宁': 108.3, '福州': 119.3, '厦门': 118.1,
  '合肥': 117.3, '南昌': 115.9, '石家庄': 114.5, '太原': 112.5,
  '呼和浩特': 111.7, '兰州': 103.8, '西宁': 101.8, '银川': 106.3,
  '乌鲁木齐': 87.6, '拉萨': 91.1, '海口': 110.3, '香港': 114.2,
  '澳门': 113.5, '台北': 121.5,
}

/**
 * 根据城市名获取经度
 * @param city 城市名
 * @returns 经度（度），未找到返回 120（北京时间基准）
 */
export function getLongitudeByCity(city?: string): number {
  if (!city) return 120
  // 模糊匹配
  for (const [key, lon] of Object.entries(CITY_LON)) {
    if (city.includes(key) || key.includes(city)) return lon
  }
  return 120
}

/**
 * 计算均时差（Equation of Time）
 * 真太阳时与平太阳时之差，随日期变化，范围约 ±16 分钟
 * 使用简化天文公式（Meeus 低精度 ±0.5 分钟）
 * @param month 公历月
 * @param day 公历日
 * @returns 均时差（分钟）
 */
export function calcEquationOfTime(month: number, day: number): number {
  // 一年中的第几天
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let dayOfYear = day
  for (let i = 1; i < month; i++) dayOfYear += daysInMonth[i]

  // 近似公式 (Spencer, 1971)
  const B = (dayOfYear - 1) * 2 * Math.PI / 365
  const eot = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(B)
    - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B)
    - 0.040849 * Math.sin(2 * B)
  )
  return eot // 单位：分钟
}

export interface TrueSolarTimeResult {
  /** 真太阳时调整后的小时（含小数） */
  adjustedHour: number
  /** 真太阳时调整后的分钟 */
  adjustedMinute: number
  /** 校正总偏移（分钟） */
  totalOffset: number
  /** 经度偏移（分钟） */
  lonOffset: number
  /** 均时差（分钟） */
  eot: number
  /** 说明 */
  desc: string
}

/**
 * 计算真太阳时
 * 北京时间 → 真太阳时
 * @param hour 北京时间小时
 * @param minute 北京时间分钟
 * @param month 公历月
 * @param day 公历日
 * @param city 城市名（可选）
 * @param manualLongitude 手动指定经度（可选，优先级高于city）
 * @returns 真太阳时结果
 */
export function calcTrueSolarTime(
  hour: number, minute: number,
  month: number, day: number,
  city?: string,
  manualLongitude?: number,
): TrueSolarTimeResult {
  const longitude = manualLongitude ?? getLongitudeByCity(city)
  const eot = calcEquationOfTime(month, day)
  const lonOffset = (longitude - 120) * 4 // 经度每度差4分钟
  const totalOffset = lonOffset + eot

  const totalMinutes = hour * 60 + minute + totalOffset
  let adjustedMinutes = totalMinutes
  // 约束在 0-1439 分钟（0:00-23:59）范围
  while (adjustedMinutes < 0) adjustedMinutes += 1440
  while (adjustedMinutes >= 1440) adjustedMinutes -= 1440

  const adjustedHour = adjustedMinutes / 60
  const adjustedMinute = Math.round(adjustedMinutes % 60)

  const sign = totalOffset >= 0 ? '+' : ''
  const desc = `经度${longitude}°(${sign}${lonOffset.toFixed(1)}分) + 均时差(${sign}${eot.toFixed(1)}分) = 总偏移${sign}${totalOffset.toFixed(1)}分`

  return {
    adjustedHour: Math.round(adjustedHour * 100) / 100,
    adjustedMinute,
    totalOffset: Math.round(totalOffset * 10) / 10,
    lonOffset: Math.round(lonOffset * 10) / 10,
    eot: Math.round(eot * 10) / 10,
    desc,
  }
}
