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

  // ── 吉时算法（黄道吉时，基于日支，禁止 charCodeAt 散列）──
  it("同一日期吉时确定且可复现", () => {
    const r1 = calculateHuangLi({ date: "2024-06-15" });
    const r2 = calculateHuangLi({ date: "2024-06-15" });
    expect(r1.jiShi).toEqual(r2.jiShi);
  });

  it("2024-06-15（庚戌日）黄道吉时由日支戌定", () => {
    // 日支戌 → 青龙起辰；黄道吉神（青龙/明堂/金匮/天德/玉堂/司命）当值时辰按序排布
    // 结果取前4个吉时：寅时、辰时、巳时、申时
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(result.jiShi).toEqual(["寅时", "辰时", "巳时", "申时"]);
  });

  it("吉时数量不超过4个且不重复", () => {
    const result = calculateHuangLi({ date: "2024-03-03" });
    expect(result.jiShi.length).toBeLessThanOrEqual(4);
    expect(new Set(result.jiShi).size).toBe(result.jiShi.length);
  });

  it("summary包含日期和宜忌概要", () => {
    const result = calculateHuangLi({ date: "2024-06-15" });
    expect(result.summary).toContain("2024-06-15");
    expect(result.summary).toContain("宜");
    expect(result.summary).toContain("忌");
  });
});
