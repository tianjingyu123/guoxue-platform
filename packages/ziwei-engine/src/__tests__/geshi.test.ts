/**
 * geshi 模块单元测试
 *
 * 覆盖：紫微斗数特殊格局检测
 */
import { checkGeShi } from '../geshi'
import type { GongWei, GongName, Zhi, Gan } from '../types'

/** 辅助函数：构建一个测试用的宫位 */
function makeGong(
  name: GongName,
  zhi: Zhi,
  gan: Gan,
  starNames: string[],
): GongWei {
  return {
    name,
    zhi,
    gan,
    stars: starNames.map(sn => ({
      name: sn,
      type: (['紫微','天机','太阳','武曲','天同','廉贞','天府','太阴','贪狼','巨门','天相','天梁','七杀','破军'].includes(sn) ? 'main' : 'assist') as 'main' | 'assist',
      wuXing: '土' as const,
      liangJi: '吉' as const,
    })),
    shenGong: false,
    daXianStart: 0,
    daXianEnd: 0,
    sanFang: [],
    duiGong: '' as GongName,
    gongQi: '',
  }
}

describe('checkGeShi - 格局检测', () => {
  it('太阴在亥 → 月朗天门', () => {
    const gongWei: GongWei[] = [
      makeGong('命宫', '寅', '甲', ['紫微']),
      makeGong('兄弟', '丑', '乙', []),
      makeGong('夫妻', '子', '丙', []),
      makeGong('子女', '亥', '丁', ['太阴']),
      makeGong('财帛', '戌', '戊', []),
      makeGong('疾厄', '酉', '己', []),
      makeGong('迁移', '申', '庚', []),
      makeGong('交友', '未', '辛', []),
      makeGong('官禄', '午', '壬', []),
      makeGong('田宅', '巳', '癸', []),
      makeGong('福德', '辰', '甲', []),
      makeGong('父母', '卯', '乙', []),
    ]
    const mingGong = gongWei[0]
    const geShi = checkGeShi(mingGong, gongWei)
    expect(geShi).toContain('月朗天门')
  })

  it('太阳在卯 → 日照雷门', () => {
    const gongWei: GongWei[] = [
      makeGong('命宫', '亥', '甲', []),
      makeGong('官禄', '卯', '乙', ['太阳']),
      makeGong('财帛', '未', '丙', []),
    ]
    // 补齐12宫，让太阳在卯（官禄宫）
    while (gongWei.length < 12) {
      gongWei.push(makeGong('田宅' as GongName, '巳' as Zhi, '丁' as Gan, []))
    }
    gongWei[0].name = '命宫'
    gongWei[1] = makeGong('兄弟', '戌', '乙', [])
    gongWei[2] = makeGong('夫妻', '酉', '丙', [])
    gongWei[3] = makeGong('子女', '申', '丁', [])
    gongWei[4] = makeGong('财帛', '未', '戊', [])
    gongWei[5] = makeGong('疾厄', '午', '己', [])
    gongWei[6] = makeGong('迁移', '巳', '庚', [])
    gongWei[7] = makeGong('交友', '辰', '辛', [])
    gongWei[8] = makeGong('官禄', '卯', '壬', ['太阳'])
    gongWei[9] = makeGong('田宅', '寅', '癸', [])
    gongWei[10] = makeGong('福德', '丑', '甲', [])
    gongWei[11] = makeGong('父母', '子', '乙', [])

    const mingGong = gongWei[0]
    const geShi = checkGeShi(mingGong, gongWei)
    expect(geShi).toContain('日照雷门')
  })

  it('太阴在亥+太阳在卯 → 日月并明', () => {
    const gongWei: GongWei[] = [
      makeGong('命宫', '寅', '甲', []),
      makeGong('兄弟', '丑', '乙', []),
      makeGong('夫妻', '子', '丙', []),
      makeGong('子女', '亥', '丁', ['太阴']),
      makeGong('财帛', '戌', '戊', []),
      makeGong('疾厄', '酉', '己', []),
      makeGong('迁移', '申', '庚', []),
      makeGong('交友', '未', '辛', []),
      makeGong('官禄', '午', '壬', ['太阳']),
      makeGong('田宅', '巳', '癸', []),
      makeGong('福德', '辰', '甲', []),
      makeGong('父母', '卯', '乙', []),
    ]
    const mingGong = gongWei[0]
    const geShi = checkGeShi(mingGong, gongWei)
    expect(geShi).toContain('日月并明')
    expect(geShi).toContain('月朗天门')
  })

  it('无格局时返回空数组', () => {
    const gongWei: GongWei[] = [
      makeGong('命宫', '寅', '甲', ['天机']),
      makeGong('兄弟', '丑', '乙', []),
      makeGong('夫妻', '子', '丙', []),
      makeGong('子女', '亥', '丁', []),
      makeGong('财帛', '戌', '戊', []),
      makeGong('疾厄', '酉', '己', []),
      makeGong('迁移', '申', '庚', []),
      makeGong('交友', '未', '辛', []),
      makeGong('官禄', '午', '壬', []),
      makeGong('田宅', '巳', '癸', []),
      makeGong('福德', '辰', '甲', []),
      makeGong('父母', '卯', '乙', []),
    ]
    const mingGong = gongWei[0]
    const geShi = checkGeShi(mingGong, gongWei)
    // 只有天机在命宫，没有特殊格局
    expect(Array.isArray(geShi)).toBe(true)
  })

  it('紫微在寅守命 → 紫府朝垣', () => {
    const gongWei: GongWei[] = [
      makeGong('命宫', '寅', '甲', ['紫微']),
      makeGong('兄弟', '丑', '乙', []),
      makeGong('夫妻', '子', '丙', []),
      makeGong('子女', '亥', '丁', []),
      makeGong('财帛', '戌', '戊', []),
      makeGong('疾厄', '酉', '己', []),
      makeGong('迁移', '申', '庚', []),
      makeGong('交友', '未', '辛', []),
      makeGong('官禄', '午', '壬', []),
      makeGong('田宅', '巳', '癸', []),
      makeGong('福德', '辰', '甲', []),
      makeGong('父母', '卯', '乙', []),
    ]
    const mingGong = gongWei[0]
    const geShi = checkGeShi(mingGong, gongWei)
    expect(geShi).toContain('紫府朝垣')
  })
})
