import {
  getLiuYueGanZhi,
  getLiuShiGanZhi,
  getLiuShiList,
  getLiuNianShiShen,
  getLiuYueShiShen,
  getLiuRiGanZhi,
  fillLiuNianLiuYue,
} from '../liunian'

describe('liunian 流年/流月/流时', () => {
  describe('getLiuYueGanZhi', () => {
    it('甲年流月从丙寅正月起', () => {
      const result = getLiuYueGanZhi('甲')
      expect(result).toHaveLength(12)
      expect(result[0]).toEqual({ month: 1, ganZhi: '丙寅', gan: '丙', zhi: '寅' })
      expect(result[1]).toEqual({ month: 2, ganZhi: '丁卯', gan: '丁', zhi: '卯' })
      expect(result[11]).toEqual({ month: 12, ganZhi: '丁丑', gan: '丁', zhi: '丑' })
    })

    it('乙庚年流月从戊寅起', () => {
      const result = getLiuYueGanZhi('乙')
      expect(result[0].ganZhi).toBe('戊寅')
      const result2 = getLiuYueGanZhi('庚')
      expect(result2[0].ganZhi).toBe('戊寅')
    })
  })

  describe('getLiuShiGanZhi', () => {
    it('甲日0点为甲子时', () => {
      const result = getLiuShiGanZhi('甲', 0)
      expect(result.ganZhi).toBe('甲子')
    })

    it('甲日12点为庚午时', () => {
      const result = getLiuShiGanZhi('甲', 12)
      expect(result.ganZhi).toBe('庚午')
    })

    it('甲日23点为甲子时（23点归属子时）', () => {
      const result = getLiuShiGanZhi('甲', 23)
      expect(result.ganZhi).toBe('甲子')
    })
  })

  describe('getLiuShiList', () => {
    it('返回甲日的12时辰完整列表', () => {
      const result = getLiuShiList('甲')
      expect(result).toHaveLength(12)
      expect(result[0]).toMatchObject({ hour: 0, ganZhi: '甲子', gan: '甲', zhi: '子' })
      expect(result[6]).toMatchObject({ hour: 12, ganZhi: '庚午', gan: '庚', zhi: '午' })
      // 每个时辰都应有十神
      result.forEach(r => {
        expect(r.ganShiShen).toBeDefined()
        expect(r.zhiShiShen).toBeDefined()
      })
    })
  })

  describe('getLiuNianShiShen', () => {
    it('甲日干见甲年干为比肩', () => {
      // 1984 是甲子年
      const result = getLiuNianShiShen(1984, '甲')
      expect(result.ganZhi).toBe('甲子')
      expect(result.ganShiShen).toBe('比')
    })

    it('甲日干见庚年干为七杀', () => {
      // 1990 是庚午年
      const result = getLiuNianShiShen(1990, '甲')
      expect(result.ganZhi).toBe('庚午')
      expect(result.ganShiShen).toBe('杀')
    })
  })

  describe('getLiuYueShiShen', () => {
    it('返回12个月的十神关系', () => {
      const result = getLiuYueShiShen('甲', '丙')
      expect(result).toHaveLength(12)
      expect(result[0]).toMatchObject({ month: 1, ganZhi: '丙寅' })
      expect(result[0].ganShiShen).toBeDefined()
      expect(result[0].zhiShiShen).toBeDefined()
    })
  })

  describe('fillLiuNianLiuYue', () => {
    it('为流年填充12个流月', () => {
      const liuNian = {
        year: 2024,
        age: 30,
        ganZhi: '甲辰',
        ganShiShen: '比' as const,
        zhiShiShen: '才' as const,
      }
      const result = fillLiuNianLiuYue(liuNian, '甲')
      expect(result.liuYue).toHaveLength(12)
      expect(result.liuYue![0]).toMatchObject({ month: 1, ganZhi: '丙寅', gan: '丙', zhi: '寅' })
      expect(result.liuYue![0].ganShiShen).toBeDefined()
      expect(result.liuYue![0].zhiShiShen).toBeDefined()
    })
  })
})
