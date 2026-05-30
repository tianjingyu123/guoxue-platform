import { calculateZiweiHePan } from "./ziwei-hepan.calculator";

describe("ZiweiHePan Calculator", () => {
  const baseInput = {
    self: { year: 1990, month: 5, day: 15, hour: 10, gender: "男" as const },
    partner: { year: 1992, month: 8, day: 20, hour: 14, gender: "女" as const },
  };

  it("返回完整合盘结果", () => {
    const result = calculateZiweiHePan(baseInput);
    expect(result.selfChart.mingStars.length).toBeGreaterThan(0);
    expect(result.partnerChart.mingStars.length).toBeGreaterThan(0);
    expect(result.scores.total).toBeGreaterThan(0);
    expect(result.level).toBeTruthy();
    expect(result.summary).toContain("命宫");
  });

  it("评分包含四个维度", () => {
    const result = calculateZiweiHePan(baseInput);
    expect(result.scores.mingGongMatch.score).toBeGreaterThan(0);
    expect(result.scores.fuQiMatch.score).toBeGreaterThan(0);
    expect(result.scores.siHuaMatch.score).toBeGreaterThan(0);
    expect(result.scores.zhiRelation.score).toBeGreaterThan(0);
  });

  it("总分在合理范围内", () => {
    const result = calculateZiweiHePan(baseInput);
    expect(result.scores.total).toBeGreaterThanOrEqual(0);
    expect(result.scores.total).toBeLessThanOrEqual(result.scores.max);
  });

  it("同输入结果确定性", () => {
    const r1 = calculateZiweiHePan(baseInput);
    const r2 = calculateZiweiHePan(baseInput);
    expect(r1.scores.total).toBe(r2.scores.total);
    expect(r1.level).toBe(r2.level);
    expect(r1.summary).toBe(r2.summary);
  });

  it("不同配对产生不同结果", () => {
    const r1 = calculateZiweiHePan(baseInput);
    const r2 = calculateZiweiHePan({
      self: { year: 1985, month: 3, day: 10, hour: 8, gender: "男" },
      partner: { year: 1988, month: 11, day: 5, hour: 16, gender: "女" },
    });
    expect(r1.scores.total !== r2.scores.total || r1.level !== r2.level).toBe(true);
  });

  it("compatibility 包含完整维度", () => {
    const result = calculateZiweiHePan(baseInput);
    expect(result.compatibility.overall).toBeTruthy();
    expect(result.compatibility.marriage).toBeTruthy();
    expect(result.compatibility.career).toBeTruthy();
    expect(result.compatibility.daily).toBeTruthy();
  });

  it("highlights 非空", () => {
    const result = calculateZiweiHePan(baseInput);
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it("夫妻宫星曜正确提取", () => {
    const result = calculateZiweiHePan(baseInput);
    expect(result.selfChart.fuQiStars).toBeDefined();
    expect(result.partnerChart.fuQiStars).toBeDefined();
  });
});
