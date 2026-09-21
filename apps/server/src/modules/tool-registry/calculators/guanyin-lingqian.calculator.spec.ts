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

  /**
   * 🔴 2026-09-20：本文件这两条断言此前是**红的**。
   *
   * 它们写死第 45 签，注释是「gzIndex 44 % 100 + 1」——那是旧算法。
   * 旧算法有两个已推翻的前提：纪元误标 1984-02-02 为甲子日（实为丙寅），
   * 以及拿只有 60 个取值的日干支序去对 100 取模（第 61–100 签永不可达）。
   * 起签早已改成绝对日序 `dayOrdinal`，这两条没跟着改，红灯留到现在。
   *
   * 期望值改为**独立算一遍**，不从实现输出抄回来——抄输出就是把行为当规格。
   */
  const expectedFor = (y: number, m: number, d: number) => (Math.floor(Date.UTC(y, m - 1, d) / 86400000) % 100) + 1;

  it("非法 qianNumber 落入日期兜底（期望值独立推算）", () => {
    const result = run({ qianNumber: 999, date: "2024-06-15" });
    expect(result.qian.number).toBe(expectedFor(2024, 6, 15));
  });

  // ── 起卦确定性（禁止 Date.now 毫秒/随机）──
  it("未传签号时用日干支兜底，同一 date 同一签（可复现）", () => {
    const r1 = run({ date: "2024-06-15" });
    const r2 = run({ date: "2024-06-15" });
    expect(r1.qian.number).toBe(r2.qian.number);
    expect(r1.summary).toContain("日干支");
  });

  it("2024-06-15 起签结果固定（期望值独立推算）", () => {
    const result = run({ date: "2024-06-15" });
    expect(result.qian.number).toBe(expectedFor(2024, 6, 15));
  });

  it("不同 date 一般得到不同签", () => {
    const a = run({ date: "2024-06-15" });
    const b = run({ date: "2024-08-20" });
    expect(a.qian.number).not.toBe(b.qian.number);
  });
});
