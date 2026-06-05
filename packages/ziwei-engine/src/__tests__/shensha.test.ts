/**
 * shensha 模块单元测试
 *
 * 覆盖：紫微神煞计算
 */
import { calcShenSha } from '../shensha'

describe('calcShenSha - 神煞计算', () => {
  it('正月子时庚年午年', () => {
    const results = calcShenSha(1, 0, '庚', '午')
    expect(results.length).toBeGreaterThanOrEqual(30)

    const mingMap: Record<string, string> = {}
    results.forEach(r => { mingMap[r.star.name] = ZHI(r.zhiIdx) })
    function ZHI(idx: number): string {
      return ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][idx]
    }
    // 天刑：酉=9, 天姚：丑=1, 解神：申=8, 天巫：巳=5
    expect(mingMap['天刑']).toBe('酉')
    expect(mingMap['天姚']).toBe('丑')
    expect(mingMap['解神']).toBe('申')
    expect(mingMap['天巫']).toBe('巳')
  })

  it('六月午时甲年子年', () => {
    const results = calcShenSha(6, 6, '甲', '子')

    const mingMap: Record<string, number> = {}
    results.forEach(r => { mingMap[r.star.name] = r.zhiIdx })

    // 天刑: (9+6-1)%12=14%12=2(寅), 天姚: (1+6-1)%12=6(午)
    // 解神: (8+6-1)%12=13%12=1(丑), 天巫: (5+6-1)%12=10(戌)
    expect(mingMap['天刑']).toBe(2) // 寅
    expect(mingMap['天姚']).toBe(6) // 午
    expect(mingMap['解神']).toBe(1) // 丑
    expect(mingMap['天巫']).toBe(10) // 戌
  })

  it('返回对象包含星曜属性', () => {
    const results = calcShenSha(1, 0, '庚', '午')
    results.forEach(r => {
      expect(r.star).toHaveProperty('name')
      expect(r.star).toHaveProperty('type')
      expect(r.star.type).toBe('sisha')
      expect(r.star).toHaveProperty('wuXing')
      expect(r.star).toHaveProperty('liangJi')
      expect(typeof r.zhiIdx).toBe('number')
    })
  })

  it('天刑为凶星属火', () => {
    const results = calcShenSha(1, 0, '庚', '午')
    const tianXing = results.find(r => r.star.name === '天刑')
    expect(tianXing).toBeDefined()
    expect(tianXing!.star.liangJi).toBe('凶')
    expect(tianXing!.star.wuXing).toBe('火')
  })

  it('解神为吉星属土', () => {
    const results = calcShenSha(1, 0, '庚', '午')
    const jieShen = results.find(r => r.star.name === '解神')
    expect(jieShen).toBeDefined()
    expect(jieShen!.star.liangJi).toBe('吉')
    expect(jieShen!.star.wuXing).toBe('土')
  })
})
