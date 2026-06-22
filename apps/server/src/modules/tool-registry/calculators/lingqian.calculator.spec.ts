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

  // ── 起卦确定性（禁止 Date.now 毫秒/随机）──
  it("未传 seed 时用日干支兜底，同一 date 同一签（可复现）", () => {
    const r1 = calculateLingQian({ type: "guanyin", date: "2024-06-15" });
    const r2 = calculateLingQian({ type: "guanyin", date: "2024-06-15" });
    expect(r1.sign.number).toBe(r2.sign.number);
    expect(r1.shakeProcess).toContain("日干支");
  });

  it("不同 date 一般得到不同签号", () => {
    const a = calculateLingQian({ type: "guanyin", date: "2024-06-15" });
    const b = calculateLingQian({ type: "guanyin", date: "2024-08-20" });
    expect(a.sign.number).not.toBe(b.sign.number);
  });

  it("2024-06-15 日干支起卦结果固定", () => {
    // 1984-02-02 为甲子日；2024-06-15 距其 14744 天，14744 % 60 = 44 → idx=44 → 第45签
    const result = calculateLingQian({ type: "guanyin", date: "2024-06-15" });
    expect(result.sign.number).toBe(45);
  });

  it("报数优先于时辰兜底", () => {
    const withSeed = calculateLingQian({ type: "guanyin", seed: 7, date: "2024-06-15" });
    expect(withSeed.sign.number).toBe(8); // 7 % 100 = 7 → 第8签
    expect(withSeed.shakeProcess).toContain("报数");
  });
});
