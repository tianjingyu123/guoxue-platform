/**
 * dayun 模块单元测试
 *
 * 覆盖：阳年判断、起运计算、大运排布、流年计算
 */
import { isYangNian, calcQiYun, fillDaYunShiShen, calcLiuNian } from '../dayun'
import type { DaYunStep } from '../types'

describe('isYangNian - 阳年判断', () => {
  it('甲为阳年', () => { expect(isYangNian('甲')).toBe(true) })
  it('丙为阳年', () => { expect(isYangNian('丙')).toBe(true) })
  it('庚为阳年', () => { expect(isYangNian('庚')).toBe(true) })
  it('乙为阴年', () => { expect(isYangNian('乙')).toBe(false) })
  it('丁为阴年', () => { expect(isYangNian('丁')).toBe(false) })
  it('癸为阴年', () => { expect(isYangNian('癸')).toBe(false) })
})

describe('calcQiYun - 起运计算', () => {
  it('阳男顺排，起运信息完整', () => {
    // 庚午年(阳年) 男 → 顺排
    const result = calcQiYun(1990, 5, 20, 8, '男', '庚', '辛巳')
    expect(result.startAge).toBeGreaterThanOrEqual(0)
    expect(result.startYear).toBeGreaterThan(1990)
    expect(result.daYun).toHaveLength(8)
    expect(result.desc).toContain('顺排')
  })

  it('阴男逆排，描述中含逆字', () => {
    // 乙巳年(阴年) 男 → 逆排
    const result = calcQiYun(1990, 5, 20, 8, '男', '乙', '辛巳')
    expect(result.desc).toContain('逆排')
    expect(result.daYun).toHaveLength(8)
  })

  it('大运每步跨度10年', () => {
    const result = calcQiYun(1984, 2, 4, 10, '男', '甲', '丙寅')
    for (let i = 0; i < result.daYun.length; i++) {
      const step = result.daYun[i]
      expect(step.endAge - step.startAge).toBe(9)
      expect(step.endYear - step.startYear).toBe(9)
      if (i > 0) {
        expect(step.startAge - result.daYun[i - 1].startAge).toBe(10)
      }
    }
  })

  it('距节气天数为合理值', () => {
    const result = calcQiYun(1984, 2, 4, 10, '男', '甲', '丙寅')
    expect(result.dayCount).toBeGreaterThanOrEqual(0)
  })
})

describe('fillDaYunShiShen - 大运十神填充', () => {
  it('为每步大运填充十神和流年', () => {
    const emptySteps: DaYunStep[] = [
      {
        ganZhi: '丙寅', tianGan: '丙', diZhi: '寅',
        ganShiShen: '比', zhiShiShen: '比',
        startYear: 1990, endYear: 1999, startAge: 8, endAge: 17,
        liuNian: [],
      },
      {
        ganZhi: '丁卯', tianGan: '丁', diZhi: '卯',
        ganShiShen: '比', zhiShiShen: '比',
        startYear: 2000, endYear: 2009, startAge: 18, endAge: 27,
        liuNian: [],
      },
    ]
    const filled = fillDaYunShiShen(emptySteps, '庚')
    expect(filled[0].ganShiShen).toBe('杀') // 丙=庚的七杀
    expect(filled[0].liuNian.length).toBe(10) // 每步大运10个流年
    expect(filled[1].liuNian[0].year).toBe(2000)
  })
})

describe('calcLiuNian - 流年计算', () => {
  it('为一步大运生成10个流年', () => {
    const step: DaYunStep = {
      ganZhi: '丙寅', tianGan: '丙', diZhi: '寅',
      ganShiShen: '杀', zhiShiShen: '才',
      startYear: 1990, endYear: 1999, startAge: 8, endAge: 17,
      liuNian: [],
    }
    const liuNian = calcLiuNian(step, '庚')
    expect(liuNian).toHaveLength(10)
    expect(liuNian[0].year).toBe(1990)
    expect(liuNian[9].year).toBe(1999)
    liuNian.forEach(l => {
      expect(l.ganZhi).toBeTruthy()
      expect(l.ganShiShen).toBeTruthy()
      expect(l.zhiShiShen).toBeTruthy()
    })
  })
})
