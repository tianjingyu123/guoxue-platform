import { calculateLingQiJing } from "./lingqi-jing.calculator";

// summary 为运行时附加字段，未列入结果类型，断言时收窄类型
function run(input: Record<string, unknown>) {
  return calculateLingQiJing(input) as unknown as { gua: { index: number; name: string }; fullIndex: unknown[]; summary: string };
}

describe("LingQiJing Calculator", () => {
  it("默认返回完整结果", () => {
    const result = run({ date: "2024-06-15" });
    expect(result.gua).toBeTruthy();
    expect(result.gua.index).toBeGreaterThanOrEqual(1);
    expect(result.gua.index).toBeLessThanOrEqual(125);
    expect(result.fullIndex.length).toBe(125);
  });

  it("卦号优先：指定 guaNumber 直接取卦", () => {
    const result = run({ guaNumber: 1 });
    expect(result.gua.index).toBe(1);
    expect(result.gua.name).toBe("大通卦");
    expect(result.summary).toContain("指定第 1 卦");
  });

  it("有所问文字时按文字确定性起卦（可复现）", () => {
    const r1 = run({ question: "今年事业如何" });
    const r2 = run({ question: "今年事业如何" });
    expect(r1.gua.index).toBe(r2.gua.index);
    expect(r1.summary).toContain("所问文字");
  });

  // ── 起卦确定性（禁止 Date.now 毫秒/随机）──
  it("无卦号无所问时用日干支兜底，同一 date 同一卦（可复现）", () => {
    const r1 = run({ date: "2024-06-15" });
    const r2 = run({ date: "2024-06-15" });
    expect(r1.gua.index).toBe(r2.gua.index);
    expect(r1.summary).toContain("日干支");
  });

  it("2024-06-15 日干支起卦固定为第45卦", () => {
    const result = run({ date: "2024-06-15" });
    expect(result.gua.index).toBe(45); // gzIndex 44 % 125 + 1 = 45
  });

  it("不同 date 一般得到不同卦", () => {
    const a = run({ date: "2024-06-15" });
    const b = run({ date: "2024-08-20" });
    expect(a.gua.index).not.toBe(b.gua.index);
  });
});
