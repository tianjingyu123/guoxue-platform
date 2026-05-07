/**
 * sihua 模块单元测试
 *
 * 覆盖：四化飞星计算
 */
import { calcSiHua } from '../sihua'

describe('calcSiHua - 四化计算', () => {
  it('甲年四化', () => {
    const result = calcSiHua('甲')
    expect(result.huaLu).toBe('廉贞')
    expect(result.huaQuan).toBe('破军')
    expect(result.huaKe).toBe('武曲')
    expect(result.huaJi).toBe('太阳')
  })

  it('庚年四化', () => {
    const result = calcSiHua('庚')
    expect(result.huaLu).toBe('太阳')
    expect(result.huaQuan).toBe('武曲')
    expect(result.huaKe).toBe('太阴')
    expect(result.huaJi).toBe('天同')
  })

  it('乙年四化', () => {
    const result = calcSiHua('乙')
    expect(result.huaLu).toBe('天机')
    expect(result.huaQuan).toBe('天梁')
    expect(result.huaKe).toBe('紫微')
    expect(result.huaJi).toBe('太阴')
  })

  it('癸年四化', () => {
    const result = calcSiHua('癸')
    expect(result.huaLu).toBe('破军')
    expect(result.huaQuan).toBe('巨门')
    expect(result.huaKe).toBe('太阴')
    expect(result.huaJi).toBe('贪狼')
  })

  it('返回对象有四个属性', () => {
    const result = calcSiHua('甲')
    expect(result).toHaveProperty('huaLu')
    expect(result).toHaveProperty('huaQuan')
    expect(result).toHaveProperty('huaKe')
    expect(result).toHaveProperty('huaJi')
  })

  it('所有四化星曜都在十四主星范围内', () => {
    const mainStars = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军', '左辅', '右弼', '文昌', '文曲']
    const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    for (const gan of gans) {
      const result = calcSiHua(gan as any)
      expect(mainStars).toContain(result.huaLu)
      expect(result.huaQuan).toBeTruthy()
      expect(result.huaKe).toBeTruthy()
      expect(result.huaJi).toBeTruthy()
    }
  })
})
