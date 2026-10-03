/**
 * jieqi 模块单元测试
 *
 * 覆盖：月支索引、节气日期计算、天数和最近节气计算
 */
import { getYueZhiIndex, getJieQiDate, daysBetween, daysToNearestJie } from '../jieqi'

describe('getYueZhiIndex - 月支索引计算', () => {
  it('1月小寒前 = 子月(索引0)', () => {
    expect(getYueZhiIndex(1, 1)).toBe(0) // 子
  })

  it('2月立春日 = 寅月(索引2)', () => {
    expect(getYueZhiIndex(2, 4)).toBe(2) // 寅
  })

  it('2月立春前 = 丑月(索引1)', () => {
    expect(getYueZhiIndex(2, 3)).toBe(1) // 丑
  })

  it('5月立夏后 = 巳月(索引5)', () => {
    expect(getYueZhiIndex(5, 20)).toBe(5) // 巳
  })

  it('8月立秋前 = 未月(索引7)', () => {
    expect(getYueZhiIndex(8, 7)).toBe(7) // 未
  })

  it('12月大雪后 = 子月(索引0)', () => {
    expect(getYueZhiIndex(12, 10)).toBe(0) // 子
  })
})

describe('getJieQiDate - 节气日期查询', () => {
  it('1984年立春(索引0) = 2月4日', () => {
    const result = getJieQiDate(1984, 0)
    expect(result.month).toBe(2)
    expect(result.day).toBe(4)
  })

  it('2000年立春(索引0) = 2月4日', () => {
    const result = getJieQiDate(2000, 0)
    expect(result.month).toBe(2)
    expect(result.day).toBeGreaterThanOrEqual(3)
    expect(result.day).toBeLessThanOrEqual(5)
  })

  it('1990年立夏(索引3) = 5月5-6日', () => {
    const result = getJieQiDate(1990, 3)
    expect(result.month).toBe(5)
    expect(result.day).toBeGreaterThanOrEqual(5)
    expect(result.day).toBeLessThanOrEqual(6)
  })

  it('2023年小寒(索引11) = 次年1月5日', () => {
    const result = getJieQiDate(2023, 11)
    expect(result.month).toBe(1)
    expect(result.day).toBe(5)
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
  it('1984-02-04 0:00 顺排到当天立春 ≈0.971 天', () => {
    // 1984 立春 = 2月4日 23:19（北京时间·已对拍寿星历法），0:00 出生则下一个节就是当天的立春。
    // 2026-09-19：原断言写 `toBe(1)`，断的是被 `Math.ceil` 上去的整数。
    // 该 ceil 已移除——起运要「三天折一岁」，小数丢了就表达不出「9年9个月22日」这种精度。
    // 现在断真值：00:00 到 23:18 是 23 小时 18 分 = 0.9708 天。（原注释写「23:19」，实测引擎给的是 23:18。）
    const days = daysToNearestJie(1984, 2, 4, 'forward', 0)
    expect(days).toBeCloseTo(0.9708, 3)
  })

  it('1984-02-05 12:00 顺排到惊蛰≈30天', () => {
    // 立春（2/4 23:19）已过，下一个节是惊蛰（3/5）
    // 2026-07-11 基准更正：原用例写"立春15:25"是修复前 UT 漏转北京时间的错误口径
    const days = daysToNearestJie(1984, 2, 5, 'forward', 12)
    expect(days).toBeGreaterThanOrEqual(28)
    expect(days).toBeLessThanOrEqual(32)
  })

  it('顺排和逆排结果不同', () => {
    const forward = daysToNearestJie(1990, 5, 20, 'forward', 12)
    const backward = daysToNearestJie(1990, 5, 20, 'backward', 12)
    expect(forward).not.toBe(backward)
    expect(forward).toBeGreaterThan(0)
    expect(backward).toBeGreaterThan(0)
  })
})
