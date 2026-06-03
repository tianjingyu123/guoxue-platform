import { calculateHuangLi } from "./huangli.calculator";

describe("huangli calculator", () => {
  it("默认日期（今天）计算返回完整结果", () => {
    const result = calculateHuangLi({});
    expect(result.date).toBeDefined();
    expect(result.lunarDate).toBeDefined();
    expect(result.ganZhi.year).toBeTruthy();
  });

  it("指定日期计算", () => {
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(result.date).toBe("2024-06-15");
    expect(result.caiShen).toBeTruthy();
    expect(result.xiShen).toBeTruthy();
    expect(result.fuShen).toBeTruthy();
  });

  it("返回宜忌列表", () => {
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(Array.isArray(result.yi)).toBe(true);
    expect(Array.isArray(result.ji)).toBe(true);
    expect(result.yi.length).toBeLessThanOrEqual(8);
  });

  it("冲煞信息", () => {
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(result.chongSha).toMatch(/冲.+煞.+/);
  });

  it("吉时列表包含时辰", () => {
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(Array.isArray(result.jiShi)).toBe(true);
    for (const s of result.jiShi) {
      expect(["子时","丑时","寅时","卯时","辰时","巳时","午时","未时","申时","酉时","戌时","亥时"]).toContain(s);
    }
  });

  it("summary包含日期和宜忌概要", () => {
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(result.summary).toContain("2024-06-15");
    expect(result.summary).toContain("宜");
    expect(result.summary).toContain("忌");
  });
});
