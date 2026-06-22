import { calculateChunZiShu } from "./chunzi-shu.calculator";

// selected 在结果类型上可能为 null，签号始终命中数据，断言时收窄类型
function run(input: Record<string, unknown>) {
  const r = calculateChunZiShu(input) as { items: unknown[]; selected: { id: number; text: string }; summary: string };
  return r;
}

describe("ChunZiShu Calculator", () => {
  it("默认返回完整结果", () => {
    const result = run({});
    expect(result.items.length).toBe(96);
    expect(result.selected).toBeTruthy();
    expect(result.selected.id).toBeGreaterThanOrEqual(1);
    expect(result.selected.id).toBeLessThanOrEqual(96);
    expect(result.selected.text).toBeTruthy();
  });

  it("报数优先：指定 number 直接取签", () => {
    const result = run({ number: 28 });
    expect(result.selected.id).toBe(28);
    expect(result.summary).toContain("报数 28");
  });

  it("非法 number 落入时辰兜底", () => {
    const result = run({ number: 999, date: "2024-06-15" });
    expect(result.selected.id).toBe(45); // gzIndex 44 % 96 + 1 = 45
  });

  // ── 起卦确定性（禁止 Date.now 毫秒/随机）──
  it("未传 number 时用日干支兜底，同一 date 同一签（可复现）", () => {
    const r1 = run({ date: "2024-06-15" });
    const r2 = run({ date: "2024-06-15" });
    expect(r1.selected.id).toBe(r2.selected.id);
    expect(r1.summary).toContain("日干支");
  });

  it("2024-06-15 日干支起卦固定为第45签", () => {
    const result = run({ date: "2024-06-15" });
    expect(result.selected.id).toBe(45);
  });

  it("不同 date 一般得到不同签", () => {
    const a = run({ date: "2024-06-15" });
    const b = run({ date: "2024-08-20" });
    expect(a.selected.id).not.toBe(b.selected.id);
  });
});
