/**
 * calcBazi 集成测试
 *
 * 覆盖完整八字排盘流程，验证四柱、大运、神煞、格局等输出正确性
 *
 * 关键规则验证：
 * - 立春分界：年柱以立春日时为界
 * - 早晚子时：23:00-23:59晚子时日柱用次日
 * - 节气算法：Meeus天文算法精确到小时级别
 */
import { calcBazi } from '../index'
import type { BaziInput, BaziResult } from '../types'

describe('calcBazi - 完整八字排盘集成测试', () => {
  // ============ 测试用例1: 1984年2月4日 10:00 男 ============
  // 1984年立春在2月4日15:25，10:00出生在立春前
  // 实际八字：癸亥年 乙丑月 戊辰日 丁巳时（非甲子年丙寅月）
  describe('1984年2月4日 10:00 男（立春前出生）', () => {
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

    it('年柱为癸亥（立春前属上一年）', () => {
      expect(result.siZhu.nian.gan).toBe('癸')
      expect(result.siZhu.nian.zhi).toBe('亥')
      expect(result.siZhu.nian.nayin).toBe('大海水')
    })

    it('月柱为乙丑（立春前丑月）', () => {
      expect(result.siZhu.yue.gan).toBe('乙')
      expect(result.siZhu.yue.zhi).toBe('丑')
      expect(result.siZhu.yue.nayin).toBe('海中金')
    })

    it('日柱为戊辰', () => {
      expect(result.siZhu.ri.gan).toBe('戊')
      expect(result.siZhu.ri.zhi).toBe('辰')
      expect(result.siZhu.ri.nayin).toBe('大林木')
    })

    it('时柱为丁巳（巳时）', () => {
      expect(result.siZhu.shi.gan).toBe('丁')
      expect(result.siZhu.shi.zhi).toBe('巳')
      expect(result.siZhu.shi.nayin).toBe('沙中土')
    })

    it('生肖为猪（亥年）', () => {
      expect(result.shengXiao).toBe('猪')
    })

    it('空亡为戌亥（戊辰旬空）', () => {
      expect(result.kongWang).toBe('戌亥')
    })

    it('十神关系正确', () => {
      // 日干为戊
      // 年干癸：癸水克戊土，阴克阳 → 正财(财)
      expect(result.siZhu.nian.ganShiShen).toBe('财')
      // 月干乙：乙木克戊土，阴克阳 → 正官(官)
      expect(result.siZhu.yue.ganShiShen).toBe('官')
      // 日干戊：与日干同 → 比肩(比)
      expect(result.siZhu.ri.ganShiShen).toBe('比')
      // 时干丁：丁火生戊土，阴生阳 → 正印(印)
      expect(result.siZhu.shi.ganShiShen).toBe('印')
    })

    it('胎元为丙辰', () => {
      expect(result.taiYuan.gan).toBe('丙')
      expect(result.taiYuan.zhi).toBe('辰')
    })

    it('命宫为戊午', () => {
      expect(result.mingGong.gan).toBe('戊')
      expect(result.mingGong.zhi).toBe('午')
    })

    it('身宫为庚申', () => {
      expect(result.shenGong.gan).toBe('庚')
      expect(result.shenGong.zhi).toBe('申')
    })

    it('旺相休囚死为旺（戊土生丑月，同气为旺）', () => {
      expect(result.wangXiang).toBe('旺')
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
  // 庚午年 辛巳月 乙酉日 庚辰时
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

    it('日柱为乙酉', () => {
      expect(result.siZhu.ri.gan).toBe('乙')
      expect(result.siZhu.ri.zhi).toBe('酉')
    })

    it('时柱为庚辰（辰时）', () => {
      expect(result.siZhu.shi.gan).toBe('庚')
      expect(result.siZhu.shi.zhi).toBe('辰')
    })

    it('空亡为午未（乙酉旬空亡）', () => {
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
  // 立春前出生，年柱用1999年（己卯年）
  // 小寒前出生，月柱用1999年12月（子月）
  // 实际八字：己卯年 丙子月 戊午日 壬子时
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

    it('年柱为己卯（立春前为1999年）', () => {
      expect(result.siZhu.nian.gan).toBe('己')
      expect(result.siZhu.nian.zhi).toBe('卯')
    })

    it('月柱为丙子（小寒前即上月子月）', () => {
      // 1月1日在小寒(1月5日)前，属上一年12月即子月
      // 己年五虎遁：甲己→丙寅开始，子月为丙子
      expect(result.siZhu.yue.zhi).toBe('子')
      expect(result.siZhu.yue.gan).toBe('丙')
    })

    it('日柱为戊午（2000-01-01公历）', () => {
      expect(result.siZhu.ri.gan).toBe('戊')
      expect(result.siZhu.ri.zhi).toBe('午')
    })

    it('时柱子时', () => {
      expect(result.siZhu.shi.zhi).toBe('子')
    })

    it('日柱输出存在纳音', () => {
      expect(result.siZhu.ri.nayin).toBe('天上火')
    })
  })
})
