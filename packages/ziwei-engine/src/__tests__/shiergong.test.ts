/**
 * shiergong 模块单元测试
 *
 * 覆盖：三方四正、对宫、宫气、十二宫地支、宫干、大限
 */
import {
  getSanFang, getDuiGong, getGongQi,
  getShiErGongZhi, getGongGan, calcDaXian,
} from '../shiergong'

describe('getSanFang - 三方宫位', () => {
  it('命宫三方 = 命宫、财帛、官禄', () => {
    const result = getSanFang('命宫')
    expect(result).toEqual(['命宫', '财帛', '官禄'])
  })

  it('财帛三方 = 财帛、官禄、命宫', () => {
    const result = getSanFang('财帛')
    expect(result).toEqual(['财帛', '官禄', '命宫'])
  })

  it('夫妻三方 = 夫妻、迁移、福德', () => {
    const result = getSanFang('夫妻')
    expect(result).toEqual(['夫妻', '迁移', '福德'])
  })
})

describe('getDuiGong - 对宫', () => {
  it('命宫对宫为迁移', () => {
    expect(getDuiGong('命宫')).toBe('迁移')
  })

  it('兄弟对宫为交友', () => {
    expect(getDuiGong('兄弟')).toBe('交友')
  })

  it('官禄对宫为夫妻', () => {
    expect(getDuiGong('官禄')).toBe('夫妻')
  })

  it('对宫互为对宫', () => {
    expect(getDuiGong(getDuiGong('命宫') as any)).toBe('命宫')
  })
})

describe('getGongQi - 宫气计算', () => {
  it('甲子宫气 = 海中金', () => {
    expect(getGongQi('甲', '子')).toBe('海中金')
  })

  it('庚午宫气 = 路旁土', () => {
    expect(getGongQi('庚', '午')).toBe('路旁土')
  })

  it('戊寅宫气 = 城头土', () => {
    expect(getGongQi('戊', '寅')).toBe('城头土')
  })
})

describe('getShiErGongZhi - 十二宫地支列表', () => {
  it('命宫在寅(索引2)时', () => {
    const result = getShiErGongZhi(2) // 寅索引=2
    expect(result[0]).toBe('寅') // 命宫
    expect(result[1]).toBe('丑') // 兄弟宫（逆时针）
    expect(result[2]).toBe('子') // 夫妻宫
    expect(result[11]).toBe('卯') // 父母宫
    expect(result).toHaveLength(12)
  })

  it('命宫在丑(索引1)时', () => {
    const result = getShiErGongZhi(1)
    expect(result[0]).toBe('丑')
    expect(result[11]).toBe('寅')
  })
})

describe('getGongGan - 宫干', () => {
  it('庚年寅宫 → 戊', () => {
    // 庚年五虎遁：乙庚→戊寅。寅宫天干=戊
    expect(getGongGan('庚', '寅')).toBe('戊')
  })

  it('庚年卯宫 → 己', () => {
    // 庚年五虎遁：戊寅、己卯
    expect(getGongGan('庚', '卯')).toBe('己')
  })

  it('庚年子宫 → 丙', () => {
    // 庚年五虎遁：...丙戌、丁亥、戊子。no, 实际: 丙子
    expect(getGongGan('庚', '子')).toBe('丙')
  })

  it('甲年寅宫 → 丙', () => {
    // 甲年五虎遁：丙寅起。寅宫=丙寅. 天干=丙
    expect(getGongGan('甲', '寅')).toBe('丙')
  })

  it('甲年午宫 → 庚', () => {
    // zhiIdx=6, yinGanIdx=GAN.indexOf('丙')=2
    // ganIdx=(2+6-2+10)%10=16%10=6. GAN[6]=庚
    expect(getGongGan('甲', '午')).toBe('庚')
  })
})

describe('calcDaXian - 大限计算', () => {
  it('阳年男(顺行) 命宫在寅', () => {
    // 庚年=阳年，男→顺行 命宫在寅 zhiIdx=2
    const result = calcDaXian(2, '庚', '男', 3) // 木三局值=3
    expect(result).toHaveLength(12)
    // 命宫始终最年轻
    expect(result[0].start).toBe(3)   // 命宫=最年轻
    expect(result[0].end).toBe(12)
    // 顺行：命宫(0)→父母(11)→福德(10)→...
    expect(result[11].start).toBe(13)  // 父母=次年轻
    expect(result[11].end).toBe(22)
    expect(result[1].start).toBe(113)  // 兄弟=最年老
    expect(result[1].end).toBe(122)
  })

  it('阳年女(逆行) 命宫在寅', () => {
    // 庚年=阳年，女→逆行 命宫在寅 zhiIdx=2
    const result = calcDaXian(2, '庚', '女', 3)
    expect(result).toHaveLength(12)
    // 逆行：命宫(0)→兄弟(1)→夫妻(2)→...顺时针
    expect(result[0].start).toBe(3)   // 命宫=最年轻
    expect(result[0].end).toBe(12)
    expect(result[1].start).toBe(13)  // 兄弟
    expect(result[1].end).toBe(22)
    expect(result[11].start).toBe(113) // 父母=最年老
    expect(result[11].end).toBe(122)
  })

  it('阴年男(逆行)', () => {
    // 乙年=阴年，男→逆行
    const result = calcDaXian(2, '乙', '男', 2) // 水二局值=2
    // 逆行：命宫(0)→兄弟(1)→夫妻(2)→...顺时针
    expect(result[0].start).toBe(2)   // 命宫=最年轻
    expect(result[0].end).toBe(11)
    expect(result[1].start).toBe(12)  // 兄弟
    expect(result[1].end).toBe(21)
  })

  it('五行局值决定起运年龄', () => {
    const resultShun = calcDaXian(2, '庚', '男', 5)
    expect(resultShun[0].start).toBe(5) // 金四局? 不对, 水二局=2, 土五局=5
    // 但传入了5，应该就是5
    expect(resultShun[0].end).toBe(14)
  })
})
