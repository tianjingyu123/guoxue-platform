/**
 * calcBazi 集成测试
 *
 * 覆盖完整八字排盘流程，验证四柱、大运、神煞、格局等输出正确性
 */
import { calcBazi } from '../index'
import type { BaziInput, BaziResult } from '../types'

describe('calcBazi - 完整八字排盘集成测试', () => {
  // ============ 测试用例1: 1984年2月4日 10:00 男 ============
  // 甲子年 丙寅月 庚午日 辛巳时
  describe('1984年2月4日 10:00 男', () => {
    const input: BaziInput = {
      name: '测试',
      gender: '男',
      year: 1984,
      month: 2,
      day: 4,
      hour: 10,
      minute: 0,
    }
    let result: BaziResult

    beforeAll(() => {
      result = calcBazi(input)
    })

    it('输入信息正确返回', () => {
      expect(result.input).toEqual(input)
    })

    it('年柱为甲子', () => {
      expect(result.siZhu.nian.gan).toBe('甲')
      expect(result.siZhu.nian.zhi).toBe('子')
      expect(result.siZhu.nian.nayin).toBe('海中金')
    })

    it('月柱为丙寅（立春后寅月）', () => {
      expect(result.siZhu.yue.gan).toBe('丙')
      expect(result.siZhu.yue.zhi).toBe('寅')
      expect(result.siZhu.yue.nayin).toBe('炉中火')
    })

    it('日柱为庚午', () => {
      expect(result.siZhu.ri.gan).toBe('庚')
      expect(result.siZhu.ri.zhi).toBe('午')
      expect(result.siZhu.ri.nayin).toBe('路旁土')
    })

    it('时柱为辛巳（巳时）', () => {
      expect(result.siZhu.shi.gan).toBe('辛')
      expect(result.siZhu.shi.zhi).toBe('巳')
      expect(result.siZhu.shi.nayin).toBe('白蜡金')
    })

    it('生肖为鼠（子年）', () => {
      expect(result.shengXiao).toBe('鼠')
    })

    it('空亡为戌亥（庚午旬空亡）', () => {
      expect(result.kongWang).toBe('戌亥')
    })

    it('十神关系正确', () => {
      // 日干庚
      // 年干甲：庚金克甲木，阳克阳 → 偏财(才)
      expect(result.siZhu.nian.ganShiShen).toBe('才')
      // 月干丙：丙火克庚金，阳克阳 → 七杀(杀)
      expect(result.siZhu.yue.ganShiShen).toBe('杀')
      // 日干庚：与日干同 → 比肩(比)
      expect(result.siZhu.ri.ganShiShen).toBe('比')
      // 时干辛：庚金生辛金，同五行异阴阳 → 劫财(劫)
      expect(result.siZhu.shi.ganShiShen).toBe('劫')
    })

    it('胎元为丁巳', () => {
      expect(result.taiYuan.gan).toBe('丁')
      expect(result.taiYuan.zhi).toBe('巳')
    })

    it('命宫为癸未', () => {
      expect(result.mingGong.gan).toBe('癸')
      expect(result.mingGong.zhi).toBe('未')
    })

    it('身宫为癸酉', () => {
      expect(result.shenGong.gan).toBe('癸')
      expect(result.shenGong.zhi).toBe('酉')
    })

    it('旺相休囚死为囚（庚金生寅月，金克木为囚）', () => {
      expect(result.wangXiang).toBe('囚')
    })

    it('大运至少8步', () => {
      expect(result.qiYun.daYun.length).toBe(8)
    })

    it('起运年龄为正整数', () => {
      expect(result.qiYun.startAge).toBeGreaterThanOrEqual(0)
      expect(result.qiYun.startYear).toBeGreaterThan(1984)
    })

    it('神煞列表不为空', () => {
      expect(result.shenSha.length).toBeGreaterThan(0)
    })

    it('格局分析存在', () => {
      expect(result.geJu).toBeDefined()
      expect(result.geJu!.name).toBeTruthy()
    })

    it('五行能量存在且各项为数字', () => {
      expect(result.wuXingEnergy).toBeDefined()
      expect(typeof result.wuXingEnergy!.mu).toBe('number')
      expect(typeof result.wuXingEnergy!.huo).toBe('number')
      expect(typeof result.wuXingEnergy!.tu).toBe('number')
      expect(typeof result.wuXingEnergy!.jin).toBe('number')
      expect(typeof result.wuXingEnergy!.shui).toBe('number')
    })
  })

  // ============ 测试用例2: 1990年5月20日 8:00 女 ============
  // 庚午年 辛巳月 丁亥日 甲辰时
  describe('1990年5月20日 8:00 女', () => {
    const input: BaziInput = {
      name: '测试女',
      gender: '女',
      year: 1990,
      month: 5,
      day: 20,
      hour: 8,
      minute: 0,
    }
    let result: BaziResult

    beforeAll(() => {
      result = calcBazi(input)
    })

    it('年柱为庚午', () => {
      expect(result.siZhu.nian.gan).toBe('庚')
      expect(result.siZhu.nian.zhi).toBe('午')
    })

    it('月柱为辛巳（立夏后巳月）', () => {
      expect(result.siZhu.yue.gan).toBe('辛')
      expect(result.siZhu.yue.zhi).toBe('巳')
    })

    it('日柱为丁亥', () => {
      expect(result.siZhu.ri.gan).toBe('丁')
      expect(result.siZhu.ri.zhi).toBe('亥')
    })

    it('时柱为甲辰（辰时）', () => {
      expect(result.siZhu.shi.gan).toBe('甲')
      expect(result.siZhu.shi.zhi).toBe('辰')
    })

    it('空亡为午未（丁亥旬空亡）', () => {
      expect(result.kongWang).toBe('午未')
    })

    it('输出结构完整', () => {
      expect(result.siZhu).toHaveProperty('nian')
      expect(result.siZhu).toHaveProperty('yue')
      expect(result.siZhu).toHaveProperty('ri')
      expect(result.siZhu).toHaveProperty('shi')
      expect(result.qiYun).toHaveProperty('daYun')
      expect(result).toHaveProperty('shenSha')
      expect(result).toHaveProperty('geJu')
    })
  })

  // ============ 测试用例3: 2000年1月1日 0:00 男（边界情况） ============
  // 己卯年 丙子月 辛卯日 戊子时（或庚子日）
  describe('2000年1月1日 0:00 男（边界情况）', () => {
    const input: BaziInput = {
      name: '边界测试',
      gender: '男',
      year: 2000,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
    }
    let result: BaziResult

    beforeAll(() => {
      result = calcBazi(input)
    })

    it('年柱为己卯（2000年）', () => {
      expect(result.siZhu.nian.gan).toBe('己')
      expect(result.siZhu.nian.zhi).toBe('卯')
    })

    it('月柱为丙子（小寒前即上月亥月？或子月）', () => {
      // 1月1日在小寒(1月6日)前，所以应是上个月即12月(子月)
      // 己年五虎遁：甲己→丙寅开始，12月(子月)为丙子
      expect(result.siZhu.yue.zhi).toBe('子')
      expect(result.siZhu.yue.gan).toBe('丙')
    })

    it('日柱为辛卯（2000-01-01公历）', () => {
      expect(result.siZhu.ri.gan).toBe('辛')
      expect(result.siZhu.ri.zhi).toBe('卯')
    })

    it('时柱子时', () => {
      expect(result.siZhu.shi.zhi).toBe('子')
    })

    it('日产输出存在纳音', () => {
      expect(result.siZhu.ri.nayin).toBe('松柏木')
    })
  })
})
