import { calcBazi, toLunarDate } from '../index'

/**
 * 农历换算。
 *
 * 修复前：lunarDate 把公历年月日原样拼成字符串标为「农历」（1990-05-18 显示成「1990年5月18日」），
 * 报告与结果页都会展示，专业用户一眼看穿。现改用运行时内置的中国农历历法。
 */
describe('农历换算', () => {
  it('公历转农历（含闰月）', () => {
    expect(toLunarDate(1990, 5, 18)).toBe('四月廿四')
    expect(toLunarDate(2000, 1, 1)).toBe('十一月廿五')
    expect(toLunarDate(2026, 9, 17)).toBe('八月初七')
    // 2020 年闰四月
    expect(toLunarDate(2020, 5, 23)).toBe('闰四月初一')
    expect(toLunarDate(2020, 4, 23)).toBe('四月初一')
  })

  it('初一到三十的汉字写法', () => {
    expect(toLunarDate(2024, 2, 10)).toBe('正月初一')
    expect(toLunarDate(2024, 2, 19)).toBe('正月初十')
    expect(toLunarDate(2024, 2, 20)).toBe('正月十一')
    expect(toLunarDate(2024, 2, 29)).toBe('正月二十')
    expect(toLunarDate(2024, 3, 1)).toBe('正月廿一')
  })

  it('排盘结果里的 lunarDate 不再是公历原样', () => {
    const r = calcBazi({ name: 'x', gender: '女', year: 1990, month: 5, day: 18, hour: 9, minute: 30 })
    expect(r.lunarDate).toBe('四月廿四')
    expect(r.lunarDate).not.toContain('1990')
  })
})
