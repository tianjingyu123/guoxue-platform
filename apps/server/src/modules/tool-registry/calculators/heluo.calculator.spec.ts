import { calculateHeLuo } from "./heluo.calculator";

describe("HeLuo Calculator", () => {
  const baseInput = {
    year: 1990, month: 5, day: 15, hour: 10, gender: "男" as const,
  };

  it("返回完整河洛理数结果", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.siZhu.nian).toHaveLength(2);
    expect(result.siZhu.yue).toHaveLength(2);
    expect(result.siZhu.ri).toHaveLength(2);
    expect(result.siZhu.shi).toHaveLength(2);
    expect(result.hexagram.name).toBeTruthy();
    expect(result.summary).toContain("河洛理数");
  });

  it("先天数和后天数正确计算", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.xianTianShu).toBe(result.ganNumbers.total);
    expect(result.houTianShu).toBe(result.zhiNumbers.total);
    expect(result.ganNumbers.total).toBe(
      result.ganNumbers.nian + result.ganNumbers.yue + result.ganNumbers.ri + result.ganNumbers.shi
    );
  });

  it("上下卦在1-8范围内", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.upperTrigram.number).toBeGreaterThanOrEqual(1);
    expect(result.upperTrigram.number).toBeLessThanOrEqual(8);
    expect(result.lowerTrigram.number).toBeGreaterThanOrEqual(1);
    expect(result.lowerTrigram.number).toBeLessThanOrEqual(8);
  });

  it("动爻在1-6范围内", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.dongYao).toBeGreaterThanOrEqual(1);
    expect(result.dongYao).toBeLessThanOrEqual(6);
  });

  it("同输入结果确定性", () => {
    const r1 = calculateHeLuo(baseInput);
    const r2 = calculateHeLuo(baseInput);
    expect(r1.hexagram.name).toBe(r2.hexagram.name);
    expect(r1.dongYao).toBe(r2.dongYao);
    expect(r1.bianGua.name).toBe(r2.bianGua.name);
  });

  it("不同出生时间产生不同结果", () => {
    const r1 = calculateHeLuo({ ...baseInput, hour: 0 });
    const r2 = calculateHeLuo({ ...baseInput, hour: 14 });
    expect(r1.hexagram.name !== r2.hexagram.name || r1.dongYao !== r2.dongYao).toBe(true);
  });

  it("fortune 包含五个维度", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.fortune.career).toBeTruthy();
    expect(result.fortune.wealth).toBeTruthy();
    expect(result.fortune.love).toBeTruthy();
    expect(result.fortune.health).toBeTruthy();
    expect(result.fortune.personality).toBeTruthy();
  });

  it("interpretation 包含本卦变卦解读", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.interpretation.benGua).toBeTruthy();
    expect(result.interpretation.dongYaoText).toBeTruthy();
    expect(result.interpretation.bianGuaText).toBeTruthy();
  });

  it("卦象符号正确格式", () => {
    const result = calculateHeLuo(baseInput);
    expect(result.hexagram.symbol).toHaveLength(2);
    expect(result.bianGua.symbol).toHaveLength(2);
  });
});
