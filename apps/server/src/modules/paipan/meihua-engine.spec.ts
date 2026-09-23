import { computeMeihua } from "@guoxue/shared/paipan"
import { BAGUA_LINES, BAGUA_NAMES, HEX_NAMES, getPalace, getCeShu, getTiyongRelation } from "@guoxue/shared/paipan"
import { fourPillars, ZHIS } from "@guoxue/shared/paipan"

/**
 * 抽取自移动端页面的起卦逻辑，必须与页面此前的算法逐条一致。
 * 下面用「页面原实现」在测试里重算一遍做对照，防止抽取过程走样。
 */
const mod = (n: number, m: number) => {
  const r = n % m
  return r === 0 ? m : r
}
function trigramFromLines(lines: boolean[]): number {
  for (let n = 1; n <= 8; n++) {
    const bl = BAGUA_LINES[BAGUA_NAMES[n]]
    if (bl[0] === lines[0] && bl[1] === lines[1] && bl[2] === lines[2]) return n
  }
  return 1
}
function hexFromTrigrams(upper: number, lower: number) {
  const lines = [...BAGUA_LINES[BAGUA_NAMES[lower]], ...BAGUA_LINES[BAGUA_NAMES[upper]]]
  const name = HEX_NAMES[upper][lower]
  return { upper, lower, lines, name, palace: getPalace(name) }
}
function hexFromLines(lines: boolean[]) {
  const lower = trigramFromLines(lines.slice(0, 3))
  const upper = trigramFromLines(lines.slice(3, 6))
  const name = HEX_NAMES[upper][lower]
  return { upper, lower, lines, name, palace: getPalace(name) }
}

/** 页面原实现（时间起卦） */
function legacyTimeGua(year: number, month: number, day: number, hour: number, minute: number, lm: number, ld: number) {
  const fp = fourPillars(year, month, day, hour, minute)
  const yearZhiNum = ZHIS.indexOf(fp.year.zhi) + 1
  const hourZhiNum = ZHIS.indexOf(fp.hour.zhi) + 1
  const upperSum = yearZhiNum + lm + ld
  const lowerSum = upperSum + hourZhiNum
  return { ben: hexFromTrigrams(mod(upperSum, 8), mod(lowerSum, 8)), moving: mod(lowerSum, 6) }
}

describe("梅花易数起卦引擎", () => {
  const base = { year: 2026, month: 6, day: 22, hour: 12, minute: 0, lunarMonth: 5, lunarDay: 8 }

  it("时间起卦与页面原算法一致", () => {
    const r = computeMeihua({ ...base, mode: "time" })
    const legacy = legacyTimeGua(base.year, base.month, base.day, base.hour, base.minute, base.lunarMonth, base.lunarDay)
    expect(r.ben.name).toBe(legacy.ben.name)
    expect(r.ben.upper).toBe(legacy.ben.upper)
    expect(r.ben.lower).toBe(legacy.ben.lower)
    expect(r.moving).toBe(legacy.moving)
    expect(r.formula).toContain("时间起卦")
  })

  it("五卦推导与页面原算法一致：互 234/345、变翻动爻、错全反、综颠倒", () => {
    const r = computeMeihua({ ...base, mode: "time" })
    const b = r.ben.lines
    expect(r.hu.name).toBe(hexFromLines([b[1], b[2], b[3], b[2], b[3], b[4]]).name)
    expect(r.bian.name).toBe(hexFromLines(b.map((l, i) => (r.moving === i + 1 ? !l : l))).name)
    expect(r.cuo.name).toBe(hexFromLines(b.map((l) => !l)).name)
    expect(r.zong.name).toBe(hexFromLines([...b].reverse()).name)
  })

  it("体用：动爻在下卦则上卦为体，否则下卦为体", () => {
    const r = computeMeihua({ ...base, mode: "time" })
    const inLower = r.moving >= 1 && r.moving <= 3
    expect(r.tiyong.movingInLower).toBe(inLower)
    const tiTri = inLower ? r.ben.upper : r.ben.lower
    expect(r.tiyong.tiName).toBe(BAGUA_NAMES[tiTri])
    expect(r.tiyong.relation).toBe(getTiyongRelation(r.tiyong.tiWx, r.tiyong.yongWx))
  })

  it("手动起卦：参数自上而下，动爻索引转为自下而上爻位", () => {
    const r = computeMeihua({ ...base, mode: "manual", yaos: "101010", moving: "0" })
    // yaos 自上而下 101010 → lines 自下而上 010101
    expect(r.ben.lines).toEqual([false, true, false, true, false, true])
    expect(r.moving).toBe(6) // 自上而下索引 0 = 上爻 = 第 6 爻
    expect(r.formula).toBe("手动指定")
  })

  it("数字起卦：前后相加取上下卦，含加时辰选项", () => {
    const a = computeMeihua({ ...base, mode: "number1", numbers: "1234" })
    const b = computeMeihua({ ...base, mode: "number1", numbers: "1234", plusHour: true })
    expect(a.ben.name).toBe(b.ben.name) // 上下卦不受时辰影响
    expect(a.formula).toContain("数字起卦1")
    expect(b.formula).toContain("+时辰")

    const n2 = computeMeihua({ ...base, mode: "number2", numbers: "357" })
    expect(n2.ben.upper).toBe(3)
    expect(n2.ben.lower).toBe(5)
    expect(n2.moving).toBe(1) // 7 mod 6
  })

  it("自动起卦：同参数必出同卦（种子伪随机）", () => {
    const a = computeMeihua({ ...base, mode: "auto" })
    const b = computeMeihua({ ...base, mode: "auto" })
    expect(a.ben.name).toBe(b.ben.name)
    expect(a.moving).toBe(b.moving)
    const c = computeMeihua({ ...base, hour: 13, mode: "auto" })
    expect([c.ben.name, c.moving]).not.toEqual([a.ben.name, a.moving])
  })

  it("测数与卦宫来自同一套数据", () => {
    const r = computeMeihua({ ...base, mode: "time" })
    expect(r.ceShu).toBe(getCeShu(r.ben.lines))
    expect(r.ben.palace).toBe(getPalace(r.ben.name))
  })

  it("不传农历时内部换算，传入则以传入为准（服务端重算据此与页面对齐）", () => {
    const withLunar = computeMeihua({ ...base, mode: "time" })
    const autoLunar = computeMeihua({ year: 2026, month: 6, day: 22, hour: 12, minute: 0, mode: "time" })
    expect(autoLunar.ben.name).toBeTruthy()
    // 传入农历 5/8 与自动换算的结果由同一算式得出，只是月日来源不同
    expect(withLunar.formula).toContain("+5+8+")
  })
})
