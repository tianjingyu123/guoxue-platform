import { calculateGuanYinLingQian } from "./guanyin-lingqian.calculator";

// summary 为运行时附加字段，未列入结果类型，断言时收窄类型
function run(input: Record<string, unknown>) {
  return calculateGuanYinLingQian(input) as unknown as { qian: { number: number; name: string }; allQian: unknown[]; summary: string };
}

describe("GuanYinLingQian Calculator", () => {
  it("默认返回完整结果", () => {
    const result = run({ date: "2024-06-15" });
    expect(result.qian).toBeTruthy();
    expect(result.qian.number).toBeGreaterThanOrEqual(1);
    expect(result.qian.number).toBeLessThanOrEqual(100);
    expect(result.allQian.length).toBe(100);
  });

  it("签号优先：指定 qianNumber 直接取签", () => {
    const result = run({ qianNumber: 1 });
    expect(result.qian.number).toBe(1);
    expect(result.qian.name).toBe("开天辟地");
    expect(result.summary).toContain("指定第 1 签");
  });

  it("非法 qianNumber 落入时辰兜底", () => {
    const result = run({ qianNumber: 999, date: "2024-06-15" });
    expect(result.qian.number).toBe(45); // gzIndex 44 % 100 + 1 = 45
  });

  // ── 起卦确定性（禁止 Date.now 毫秒/随机）──
  it("未传签号时用日干支兜底，同一 date 同一签（可复现）", () => {
    const r1 = run({ date: "2024-06-15" });
    const r2 = run({ date: "2024-06-15" });
    expect(r1.qian.number).toBe(r2.qian.number);
    expect(r1.summary).toContain("日干支");
  });

  it("2024-06-15 日干支起卦固定为第45签", () => {
    const result = run({ date: "2024-06-15" });
    expect(result.qian.number).toBe(45);
  });

  it("不同 date 一般得到不同签", () => {
    const a = run({ date: "2024-06-15" });
    const b = run({ date: "2024-08-20" });
    expect(a.qian.number).not.toBe(b.qian.number);
  });
});
