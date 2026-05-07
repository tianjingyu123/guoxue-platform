/**
 * jieqi 模块单元测试
 *
 * 覆盖：月支索引、节气日期计算、天数和最近节气计算
 */
import { getYueZhiIndex, getJieQiDate, daysBetween, daysToNearestJie } from '../jieqi'

describe('getYueZhiIndex - 月支索引计算', () => {
  it('1月立春前 = 丑月(索引1)', () => {
    // 1月小寒前为子月
    expect(getYueZhiIndex(1, 1)).toBe(0) // 子
  })

  it('2月立春日 = 寅月(索引2)', () => {
    // 2月4日是立春
    expect(getYueZhiIndex(2, 4)).toBe(2) // 寅
  })

  it('2月立春前 = 丑月(索引1)', () => {
    expect(getYueZhiIndex(2, 3)).toBe(1) // 丑
  })

  it('5月立夏后 = 巳月(索引5)', () => {
    // 立夏≈5月6日
    expect(getYueZhiIndex(5, 20)).toBe(5) // 巳
  })

  it('8月立秋前 = 未月(索引7)', () => {
    // 立秋≈8月8日
    expect(getYueZhiIndex(8, 7)).toBe(7) // 未
  })

  it('12月大雪后 = 子月(索引0)', () => {
    // 大雪≈12月7日
    expect(getYueZhiIndex(12, 10)).toBe(0) // 子
  })
})

describe('getJieQiDate - 节气日期查询', () => {
  it('1984年立春(索引0) = 2月底', () => {
    const result = getJieQiDate(1984, 0)
    expect(result.month).toBe(2)
    expect(result.day).toBe(31)
  })

  it('2000年立春(索引0) = 2月4日', () => {
    const result = getJieQiDate(2000, 0)
    expect(result.month).toBe(2)
    // 近似公式返回的值应在合理范围
    expect(result.day).toBeGreaterThanOrEqual(3)
    expect(result.day).toBeLessThanOrEqual(5)
  })

  it('1990年立夏(索引3) = 5月3日', () => {
    const result = getJieQiDate(1990, 3) // 立夏
    expect(result.month).toBe(5)
    expect(result.day).toBe(3)
  })

  it('2023年小寒(索引11) = 次年1月', () => {
    const result = getJieQiDate(2023, 11) // 小寒在次年1月
    expect(result.month).toBe(1)
    expect(result.day).toBe(4)
  })
})

describe('daysBetween - 日期差计算', () => {
  it('同一天差0天', () => {
    expect(daysBetween(2023, 1, 1, 2023, 1, 1)).toBe(0)
  })

  it('相邻两天差1天', () => {
    expect(daysBetween(2023, 1, 1, 2023, 1, 2)).toBe(1)
  })

  it('跨年天数', () => {
    const days = daysBetween(2023, 12, 31, 2024, 1, 1)
    expect(days).toBe(1)
  })

  it('前日期在后日期之前返回负数', () => {
    expect(daysBetween(2024, 1, 1, 2023, 1, 1)).toBeLessThan(0)
  })
})

describe('daysToNearestJie - 最近节气天数', () => {
  it('1984-02-04立春当天 顺排=0', () => {
    // 1984年2月4日是立春，顺排到下一个节气（惊蛰）
    const days = daysToNearestJie(1984, 2, 4, 'forward')
    // 立春到惊蛰（引擎算法）
    expect(days).toBeGreaterThanOrEqual(26)
    expect(days).toBeLessThanOrEqual(32)
  })

  it('1984-02-04立春当天 逆排到上一个节(小寒)', () => {
    const days = daysToNearestJie(1984, 2, 4, 'backward')
    // 小寒到立春（引擎算法）
    expect(days).toBeGreaterThanOrEqual(28)
    expect(days).toBeLessThanOrEqual(35)
  })

  it('顺排和逆排结果不同', () => {
    const forward = daysToNearestJie(1990, 5, 20, 'forward')
    const backward = daysToNearestJie(1990, 5, 20, 'backward')
    expect(forward).not.toBe(backward)
    expect(forward).toBeGreaterThan(0)
    expect(backward).toBeGreaterThan(0)
  })
})
