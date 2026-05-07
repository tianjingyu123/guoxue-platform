/**
 * constants 模块单元测试
 *
 * 覆盖：天干地支数组、纳音表、空亡计算等
 */
import {
  GAN, ZHI, ZHI_CANG, WU_HU_DUN, WU_SHU_DUN,
  NA_YIN, GAN_COLOR, ZHI_COLOR, getKongWang,
  GAN_HE_PAIRS, ZHI_HE_PAIRS, ZHI_CHONG_PAIRS,
} from '../constants'

describe('GAN - 十天干', () => {
  it('长度为10', () => {
    expect(GAN).toHaveLength(10)
  })

  it('包含正确的天干', () => {
    expect(GAN).toEqual(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'])
  })
})

describe('ZHI - 十二地支', () => {
  it('长度为12', () => {
    expect(ZHI).toHaveLength(12)
  })

  it('包含正确的地支', () => {
    expect(ZHI).toEqual(['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'])
  })
})

describe('ZHI_CANG - 地支藏干', () => {
  it('每个地支都有藏干', () => {
    expect(ZHI_CANG).toHaveLength(12)
    ZHI_CANG.forEach(cang => {
      expect(cang.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('子藏癸', () => {
    expect(ZHI_CANG[0][0].gan).toBe('癸')
  })

  it('寅藏甲丙戊', () => {
    expect(ZHI_CANG[2].map(c => c.gan)).toEqual(['甲','丙','戊'])
  })
})

describe('WU_HU_DUN - 五虎遁', () => {
  it('长度为10', () => {
    expect(WU_HU_DUN).toHaveLength(10)
  })

  it('甲己年寅月为丙寅', () => {
    expect(WU_HU_DUN[0]).toBe('丙') // 甲年→丙
    expect(WU_HU_DUN[5]).toBe('丙') // 己年→丙
  })

  it('乙庚年寅月为戊寅', () => {
    expect(WU_HU_DUN[1]).toBe('戊') // 乙年→戊
    expect(WU_HU_DUN[6]).toBe('戊') // 庚年→戊
  })
})

describe('WU_SHU_DUN - 五鼠遁', () => {
  it('长度为10', () => {
    expect(WU_SHU_DUN).toHaveLength(10)
  })

  it('甲己日子时为甲子', () => {
    expect(WU_SHU_DUN[0]).toBe('甲')
    expect(WU_SHU_DUN[5]).toBe('甲')
  })

  it('乙庚日子时为丙子', () => {
    expect(WU_SHU_DUN[1]).toBe('丙')
    expect(WU_SHU_DUN[6]).toBe('丙')
  })
})

describe('NA_YIN - 纳音', () => {
  it('60甲子全覆盖', () => {
    expect(Object.keys(NA_YIN)).toHaveLength(60)
  })

  it('甲子纳音为海中金', () => {
    expect(NA_YIN['甲子']).toBe('海中金')
  })

  it('庚午纳音为路旁土', () => {
    expect(NA_YIN['庚午']).toBe('路旁土')
  })

  it('癸亥纳音为大海水', () => {
    expect(NA_YIN['癸亥']).toBe('大海水')
  })
})

describe('getKongWang - 空亡计算', () => {
  it('甲子日空亡戌亥', () => {
    // 甲子旬(甲子-癸酉)空亡戌亥
    expect(getKongWang('甲子')).toBe('戌亥')
  })

  it('甲戌日空亡申酉', () => {
    expect(getKongWang('甲戌')).toBe('申酉')
  })

  it('庚午日空亡戌亥', () => {
    // 甲子旬: 甲子乙丑丙寅丁卯戊辰己巳庚午辛未壬申癸酉 → 空亡戌亥
    expect(getKongWang('庚午')).toBe('戌亥')
  })

  it('丁亥日空亡午未', () => {
    // 甲申旬: 甲申乙酉丙戌丁亥... → 空亡午未
    expect(getKongWang('丁亥')).toBe('午未')
  })

  it('辛卯日空亡午未', () => {
    expect(getKongWang('辛卯')).toBe('午未')
  })
})

describe('GAN_COLOR 和 ZHI_COLOR', () => {
  it('天干颜色映射完整', () => {
    GAN.forEach(g => {
      expect(GAN_COLOR[g]).toBeTruthy()
    })
  })

  it('地支颜色映射完整', () => {
    ZHI.forEach(z => {
      expect(ZHI_COLOR[z]).toBeTruthy()
    })
  })
})

describe('合冲表', () => {
  it('天干五合有5对', () => {
    expect(GAN_HE_PAIRS).toHaveLength(5)
  })

  it('地支六合有6对', () => {
    expect(ZHI_HE_PAIRS).toHaveLength(6)
  })

  it('地支六冲有6对', () => {
    expect(ZHI_CHONG_PAIRS).toHaveLength(6)
  })

  it('甲己合', () => {
    expect(GAN_HE_PAIRS[0]).toEqual(['甲','己'])
  })

  it('子丑合', () => {
    expect(ZHI_HE_PAIRS[0]).toEqual(['子','丑'])
  })

  it('子午冲', () => {
    expect(ZHI_CHONG_PAIRS[0]).toEqual(['子','午'])
  })
})
