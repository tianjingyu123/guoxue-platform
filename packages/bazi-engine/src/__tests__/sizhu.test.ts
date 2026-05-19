/**
 * sizhu 模块单元测试
 *
 * 覆盖：年柱、月柱、日柱、时柱、十神计算
 */
import { calcNianZhu, calcYueZhu, calcRiZhu, calcShiZhu, calcShengXiao, calcShiShen, calcSiZhu } from '../sizhu'
import type { Gan } from '../types'

describe('calcNianZhu - 年柱计算', () => {
  it('1984年 = 甲子', () => {
    const result = calcNianZhu(1984)
    expect(result.ganZhi).toBe('甲子')
    expect(result.gan).toBe('甲')
    expect(result.zhi).toBe('子')
  })

  it('1990年 = 庚午', () => {
    const result = calcNianZhu(1990)
    expect(result.ganZhi).toBe('庚午')
  })

  it('2000年 = 庚辰', () => {
    const result = calcNianZhu(2000)
    expect(result.ganZhi).toBe('庚辰')
  })

  it('2024年 = 甲辰', () => {
    const result = calcNianZhu(2024)
    expect(result.ganZhi).toBe('甲辰')
  })

  it('1983年（1984之前） = 癸亥', () => {
    const result = calcNianZhu(1983)
    expect(result.ganZhi).toBe('癸亥')
  })

  it('1900年（跨世纪） = 庚子', () => {
    const result = calcNianZhu(1900)
    expect(result.ganZhi).toBe('庚子')
  })
})

describe('calcShengXiao - 生肖计算', () => {
  it('1984甲子年 = 鼠', () => {
    expect(calcShengXiao(1984)).toBe('鼠')
  })

  it('1990庚午年 = 马', () => {
    expect(calcShengXiao(1990)).toBe('马')
  })

  it('2000庚辰年 = 龙', () => {
    expect(calcShengXiao(2000)).toBe('龙')
  })

  it('2023癸卯年 = 兔', () => {
    expect(calcShengXiao(2023)).toBe('兔')
  })
})

describe('calcYueZhu - 月柱计算', () => {
  it('甲年寅月 = 丙寅', () => {
    const result = calcYueZhu('甲', 2) // 寅月索引=2
    expect(result.ganZhi).toBe('丙寅')
  })

  it('甲年卯月 = 丁卯', () => {
    const result = calcYueZhu('甲', 3)
    expect(result.ganZhi).toBe('丁卯')
  })

  it('乙年寅月 = 戊寅', () => {
    const result = calcYueZhu('乙', 2)
    expect(result.ganZhi).toBe('戊寅')
  })

  it('庚年巳月 = 辛巳', () => {
    const result = calcYueZhu('庚', 5)
    expect(result.ganZhi).toBe('辛巳')
  })

  it('丙年子月 = 庚子', () => {
    const result = calcYueZhu('丙', 0)
    expect(result.ganZhi).toBe('庚子')
  })
})

describe('calcRiZhu - 日柱计算', () => {
  it('1984-02-04 = 戊辰', () => {
    // 使用纯数学计算，避免时区问题
    const result = calcRiZhu(1984, 2, 4)
    expect(result.ganZhi).toBe('戊辰')
  })

  it('1990-05-20 = 乙酉', () => {
    const result = calcRiZhu(1990, 5, 20)
    expect(result.ganZhi).toBe('乙酉')
  })

  it('2023-10-01 国庆节', () => {
    const result = calcRiZhu(2023, 10, 1)
    expect(result.gan).toBeTruthy()
    expect(result.zhi).toBeTruthy()
    expect(result.ganZhi.length).toBe(2)
  })
})

describe('calcShiZhu - 时柱计算', () => {
  it('庚日巳时(10点) = 辛巳', () => {
    const result = calcShiZhu('庚', 10)
    expect(result.ganZhi).toBe('辛巳')
  })

  it('庚日午时(12点) = 壬午', () => {
    const result = calcShiZhu('庚', 12)
    expect(result.ganZhi).toBe('壬午')
  })

  it('甲日子时(0点) = 甲子', () => {
    const result = calcShiZhu('甲', 0)
    expect(result.gan).toBe('甲')
    expect(result.zhi).toBe('子')
  })

  it('丁日辰时(8点) = 甲辰', () => {
    const result = calcShiZhu('丁', 8)
    expect(result.ganZhi).toBe('甲辰')
  })

  it('癸日子时(23点) = 壬子', () => {
    const result = calcShiZhu('癸', 23)
    expect(result.gan).toBe('壬')
    expect(result.zhi).toBe('子')
  })
})

describe('calcShiShen - 十神计算', () => {
  it('甲(日)见甲(年) = 比肩', () => {
    expect(calcShiShen('甲', '甲' as Gan)).toBe('比')
  })

  it('甲见乙 = 劫财', () => {
    expect(calcShiShen('甲', '乙' as Gan)).toBe('劫')
  })

  it('庚见甲 = 偏财', () => {
    expect(calcShiShen('庚', '甲' as Gan)).toBe('才')
  })

  it('庚见丙 = 七杀', () => {
    expect(calcShiShen('庚', '丙' as Gan)).toBe('杀')
  })

  it('庚见丁 = 正官', () => {
    expect(calcShiShen('庚', '丁' as Gan)).toBe('官')
  })

  it('庚见辛 = 劫财', () => {
    expect(calcShiShen('庚', '辛' as Gan)).toBe('劫')
  })

  it('乙见庚 = 正官（阴阳不同）', () => {
    expect(calcShiShen('乙', '庚' as Gan)).toBe('官')
  })
})

describe('calcSiZhu - 完整四柱', () => {
  it('1984-02-04 10:00 男 四柱正确（立春前）', () => {
    // 1984年立春在2月4日15:25，10:00出生在立春前
    // 年柱应为癸亥(1983年)，月柱丑月
    const result = calcSiZhu({
      name: '测试',
      gender: '男',
      year: 1984,
      month: 2,
      day: 4,
      hour: 10,
      minute: 0,
    })
    expect(result.nian.gan).toBe('癸')
    expect(result.nian.zhi).toBe('亥')
    expect(result.yue.gan).toBe('乙')
    expect(result.yue.zhi).toBe('丑')
    expect(result.ri.gan).toBe('戊')
    expect(result.ri.zhi).toBe('辰')
    expect(result.shi.gan).toBe('丁')
    expect(result.shi.zhi).toBe('巳')
  })

  it('每个柱都有纳音', () => {
    const result = calcSiZhu({
      name: '测试',
      gender: '男',
      year: 1990,
      month: 5,
      day: 20,
      hour: 8,
      minute: 0,
    })
    expect(result.nian.nayin).toBeTruthy()
    expect(result.yue.nayin).toBeTruthy()
    expect(result.ri.nayin).toBeTruthy()
    expect(result.shi.nayin).toBeTruthy()
  })

  it('藏干数组不为空', () => {
    const result = calcSiZhu({
      name: '测试',
      gender: '女',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
    })
    expect(result.nian.cangGan.length).toBeGreaterThan(0)
    expect(result.yue.cangGan.length).toBeGreaterThan(0)
    expect(result.ri.cangGan.length).toBeGreaterThan(0)
    expect(result.shi.cangGan.length).toBeGreaterThan(0)
  })
})
