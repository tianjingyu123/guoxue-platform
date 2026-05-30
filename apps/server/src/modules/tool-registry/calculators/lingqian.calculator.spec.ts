import { calculateLingQian } from "./lingqian.calculator";

describe("LingQian Calculator", () => {
  it("默认观音灵签返回完整结果", () => {
    const result = calculateLingQian({ type: "guanyin" });
    expect(result.typeName).toBe("观音灵签");
    expect(result.totalSigns).toBe(100);
    expect(result.sign.number).toBeGreaterThanOrEqual(1);
    expect(result.sign.number).toBeLessThanOrEqual(100);
    expect(result.sign.poem).toBeTruthy();
    expect(result.sign.grade).toBeTruthy();
    expect(result.sign.advice).toBeTruthy();
  });

  it("传入 seed 返回确定性结果", () => {
    const r1 = calculateLingQian({ type: "guanyin", seed: 42 });
    const r2 = calculateLingQian({ type: "guanyin", seed: 42 });
    expect(r1.sign.number).toBe(r2.sign.number);
    expect(r1.sign.poem).toBe(r2.sign.poem);
  });

  it("不同 seed 返回不同签", () => {
    const r1 = calculateLingQian({ type: "guanyin", seed: 1 });
    const r2 = calculateLingQian({ type: "guanyin", seed: 50 });
    expect(r1.sign.number).not.toBe(r2.sign.number);
  });

  it("seed=0 返回第1签", () => {
    const result = calculateLingQian({ type: "guanyin", seed: 0 });
    expect(result.sign.number).toBe(1);
    expect(result.sign.title).toBe("开天辟地");
    expect(result.sign.grade).toBe("上上");
  });

  it("advice 包含5个维度", () => {
    const result = calculateLingQian({ type: "guanyin", seed: 10 });
    expect(result.sign.advice.general).toBeTruthy();
    expect(result.sign.advice.wealth).toBeTruthy();
    expect(result.sign.advice.love).toBeTruthy();
    expect(result.sign.advice.career).toBeTruthy();
    expect(result.sign.advice.health).toBeTruthy();
  });

  it("question 参数传递到结果", () => {
    const result = calculateLingQian({ type: "guanyin", question: "事业如何", seed: 5 });
    expect(result.input.question).toBe("事业如何");
  });

  it("shakeProcess 包含签号", () => {
    const result = calculateLingQian({ type: "guanyin", seed: 99 });
    expect(result.shakeProcess).toContain(String(result.sign.number));
  });
});
