/**
 * shensha 模块单元测试
 *
 * 覆盖：合冲刑害检测、胎元、命宫、身宫、旺相休囚死、十二长生地势
 */
import type { SiZhu } from '../types'
import {
  detectGanHe, detectLiuHe, detectSanHe, detectSanHui,
  detectLiuChong, detectLiuHai, detectSanXing, detectZiXing,
  calcFenXiTiShi, calcTaiYuan, calcMingGong, calcShenGong,
  calcDiShi, calcWangXiang,
} from '../shensha'

describe('detectGanHe - 天干五合检测', () => {
  it('甲己合', () => {
    const result = detectGanHe(['甲', '乙', '己'])
    expect(result).toContain('甲己合')
  })

  it('丙辛合', () => {
    const result = detectGanHe(['丙', '丁', '辛'])
    expect(result).toContain('丙辛合')
  })

  it('无合返回空数组', () => {
    const result = detectGanHe(['甲', '乙', '丙'])
    expect(result).toEqual([])
  })
})

describe('detectLiuHe - 地支六合检测', () => {
  it('子丑合', () => {
    expect(detectLiuHe(['子', '丑', '寅'])).toContain('子丑合')
  })

  it('寅亥合', () => {
    expect(detectLiuHe(['寅', '卯', '亥'])).toContain('寅亥合')
  })
})

describe('detectSanHe - 地支三合检测', () => {
  it('申子辰三合', () => {
    const result = detectSanHe(['申', '子', '辰'])
    expect(result).toContain('申子辰三合')
  })

  it('寅午戌三合', () => {
    const result = detectSanHe(['寅', '午', '戌'])
    expect(result).toContain('寅午戌三合')
  })

  it('半合检测', () => {
    const result = detectSanHe(['申', '子'])
    expect(result).toContain('申子半合')
  })
})

describe('detectSanHui - 地支三会检测', () => {
  it('亥子丑三会', () => {
    expect(detectSanHui(['亥', '子', '丑'])).toContain('亥子丑三会')
  })

  it('寅卯辰三会', () => {
    expect(detectSanHui(['寅', '卯', '辰'])).toContain('寅卯辰三会')
  })
})

describe('detectLiuChong - 地支六冲检测', () => {
  it('子午冲', () => {
    expect(detectLiuChong(['子', '午'])).toContain('子午冲')
  })

  it('丑未冲', () => {
    expect(detectLiuChong(['丑', '未'])).toContain('丑未冲')
  })
})

describe('detectLiuHai - 六害检测', () => {
  it('寅巳害', () => {
    expect(detectLiuHai(['寅', '巳'])).toContain('寅巳害')
  })
})

describe('detectSanXing - 三刑检测', () => {
  it('寅巳申三刑', () => {
    const result = detectSanXing(['寅', '巳', '申'])
    expect(result).toContain('寅巳申三刑')
  })
})

describe('detectZiXing - 自刑检测', () => {
  it('辰自刑（两个辰）', () => {
    expect(detectZiXing(['辰', '寅', '辰'])).toContain('辰自刑')
  })

  it('单个辰不自刑', () => {
    expect(detectZiXing(['辰', '寅'])).toEqual([])
  })
})

describe('calcTaiYuan - 胎元计算', () => {
  it('丙寅月庚日 → 丁巳', () => {
    const result = calcTaiYuan('丙', '寅', '庚')
    expect(result.gan).toBe('丁')
    expect(result.zhi).toBe('巳')
  })

  it('辛巳月丁日 → 壬申', () => {
    const result = calcTaiYuan('辛', '巳', '丁')
    expect(result.gan).toBe('壬')
    expect(result.zhi).toBe('申')
  })
})

describe('calcMingGong - 命宫计算', () => {
  it('寅月巳时 → 未宫（癸未）', () => {
    const result = calcMingGong('寅', '巳', '庚')
    expect(result.gan).toBe('癸')
    expect(result.zhi).toBe('未')
  })

  it('子月子时 → 子宫', () => {
    const result = calcMingGong('子', '子', '甲')
    expect(result.zhi).toBe('子')
  })
})

describe('calcShenGong - 身宫计算', () => {
  it('寅月巳时g → 酉宫（癸酉）', () => {
    const result = calcShenGong('寅', '巳', '庚')
    expect(result.gan).toBe('癸')
    expect(result.zhi).toBe('酉')
  })
})

describe('calcDiShi - 十二长生地势', () => {
  it('甲长生在亥', () => {
    expect(calcDiShi('甲', '亥')).toBe('长生')
  })

  it('甲在午为死', () => {
    expect(calcDiShi('甲', '午')).toBe('死')
  })

  it('庚长生在巳', () => {
    expect(calcDiShi('庚', '巳')).toBe('长生')
  })

  it('庚在子为死', () => {
    // 庚长生在巳，offset = (0-4+12)%12 = 8. DI_SHI[8] = '死'
    expect(calcDiShi('庚', '子')).toBe('死')
  })
})

describe('calcWangXiang - 旺相休囚死', () => {
  it('庚金生寅月（金克木）→ 囚', () => {
    expect(calcWangXiang('庚', '寅')).toBe('囚')
  })

  it('甲木生寅月 → 旺', () => {
    expect(calcWangXiang('甲', '寅')).toBe('旺')
  })

  it('丙火生寅月（木生火）→ 相', () => {
    expect(calcWangXiang('丙', '寅')).toBe('相')
  })
})
