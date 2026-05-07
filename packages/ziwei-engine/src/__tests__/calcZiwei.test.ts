/**
 * calcZiwei 集成测试
 *
 * 覆盖完整紫微斗数排盘流程，验证命宫、五行局、紫微位置、十四主星等
 */
import { calcZiwei, calcMingPan } from '../index'
import type { ZiweiInput, ZiweiResult } from '../types'

describe('calcZiwei - 完整紫微斗数排盘集成测试', () => {
  // ============ 测试用例1: 庚午年 正月十五 子时 男 ============
  // 命宫在寅, 五行局=木三局, 紫微在午宫
  describe('庚午年 正月十五 子时 男', () => {
    const input: ZiweiInput = {
      name: '测试',
      gender: '男',
      year: 1990,
      month: 1,
      day: 15,
      hour: 0,
      lunarMonth: 1,
      lunarDay: 15,
      lunarHour: '子',
      lunarYearGan: '庚',
      lunarYearZhi: '午',
    }
    let result: ZiweiResult

    beforeAll(() => {
      result = calcZiwei(input)
    })

    it('命宫在寅', () => {
      expect(result.mingGong.name).toBe('命宫')
      expect(result.mingGong.zhi).toBe('寅')
    })

    it('五行局为木三局', () => {
      expect(result.wuXingJu).toBe('木三局')
    })

    it('紫微在午宫', () => {
      const ziweiGong = result.gongWei.find(g =>
        g.stars.some(s => s.name === '紫微')
      )
      expect(ziweiGong).toBeDefined()
      expect(ziweiGong!.zhi).toBe('午')
    })

    it('十二宫完整', () => {
      expect(result.gongWei).toHaveLength(12)
      const names = result.gongWei.map(g => g.name)
      expect(names).toContain('命宫')
      expect(names).toContain('兄弟')
      expect(names).toContain('夫妻')
      expect(names).toContain('子女')
      expect(names).toContain('财帛')
      expect(names).toContain('疾厄')
      expect(names).toContain('迁移')
      expect(names).toContain('交友')
      expect(names).toContain('官禄')
      expect(names).toContain('田宅')
      expect(names).toContain('福德')
      expect(names).toContain('父母')
    })

    it('四化存在且完整', () => {
      expect(result.siHua.huaLu).toBeTruthy()
      expect(result.siHua.huaQuan).toBeTruthy()
      expect(result.siHua.huaKe).toBeTruthy()
      expect(result.siHua.huaJi).toBeTruthy()
    })

    it('身宫为指定十二宫之一', () => {
      expect(result.shenGong).toBeTruthy()
      expect(result.gongWei.find(g => g.name === result.shenGong)).toBeDefined()
    })

    it('格局列表为数组', () => {
      expect(Array.isArray(result.geShi)).toBe(true)
    })

    it('命宫星曜不为空', () => {
      expect(result.mingGong.stars.length).toBeGreaterThan(0)
    })
  })

  // ============ 测试用例2: 甲子年 六月二十 午时 女 ============
  describe('甲子年 六月二十 午时 女', () => {
    const input: ZiweiInput = {
      name: '测试女',
      gender: '女',
      year: 1984,
      month: 7,
      day: 18,
      hour: 12,
      lunarMonth: 6,
      lunarDay: 20,
      lunarHour: '午',
      lunarYearGan: '甲',
      lunarYearZhi: '子',
    }
    let result: ZiweiResult

    beforeAll(() => {
      result = calcZiwei(input)
    })

    it('命宫存在', () => {
      expect(result.mingGong).toBeDefined()
      expect(result.mingGong.zhi).toBeTruthy()
    })

    it('五行局不为空', () => {
      expect(result.wuXingJu).toBeTruthy()
      expect(result.wuXingJu).toMatch(/^[水火木金土][二三四五六]局$/)
    })

    it('紫微在十二宫之一', () => {
      const found = result.gongWei.some(g =>
        g.stars.some(s => s.name === '紫微')
      )
      expect(found).toBe(true)
    })

    it('天府在十二宫之一', () => {
      const found = result.gongWei.some(g =>
        g.stars.some(s => s.name === '天府')
      )
      expect(found).toBe(true)
    })

    it('每个宫位有宫干', () => {
      result.gongWei.forEach(g => {
        expect(g.gan).toBeTruthy()
      })
    })

    it('每个宫位有宫气', () => {
      result.gongWei.forEach(g => {
        expect(g.gongQi).toBeTruthy()
      })
    })

    it('有对宫信息', () => {
      expect(result.mingGong.duiGong).toBeTruthy()
    })

    it('命宫三方包含财帛和官禄', () => {
      expect(result.mingGong.sanFang).toContain('命宫')
      expect(result.mingGong.sanFang).toContain('财帛')
      expect(result.mingGong.sanFang).toContain('官禄')
    })

    it('输出结构验证', () => {
      expect(result).toHaveProperty('input')
      expect(result).toHaveProperty('wuXingJu')
      expect(result).toHaveProperty('mingGong')
      expect(result).toHaveProperty('gongWei')
      expect(result).toHaveProperty('siHua')
      expect(result).toHaveProperty('shenGong')
      expect(result).toHaveProperty('geShi')
    })
  })
})
