import { calculateZiweiLiuRi } from "./ziwei-liuri.calculator";

describe("ZiweiLiuRi Calculator", () => {
  const baseInput = {
    year: 1990, month: 5, day: 15, hour: 10,
    gender: "男" as const,
    targetYear: 2026, targetMonth: 5, targetDay: 21,
  };

  it("返回完整流日分析结果", () => {
    const result = calculateZiweiLiuRi(baseInput);
    expect(result.natalInfo.wuXingJu).toBeTruthy();
    expect(result.flowDay.ganZhi).toHaveLength(2);
    expect(result.flowDayMingGong).toBeTruthy();
    expect(result.palaces).toHaveLength(12);
    expect(result.summary).toContain("流日");
  });

  it("无 targetHour 时 flowHour 为 null", () => {
    const result = calculateZiweiLiuRi(baseInput);
    expect(result.flowHour).toBeNull();
  });

  it("有 targetHour 时返回流时", () => {
    const result = calculateZiweiLiuRi({ ...baseInput, targetHour: 14 });
    expect(result.flowHour).not.toBeNull();
    expect(result.flowHour!.ganZhi).toHaveLength(2);
  });

  it("同输入结果确定性", () => {
    const r1 = calculateZiweiLiuRi(baseInput);
    const r2 = calculateZiweiLiuRi(baseInput);
    expect(r1.flowDay.ganZhi).toBe(r2.flowDay.ganZhi);
    expect(r1.summary).toBe(r2.summary);
  });

  it("不同日期产生不同流日", () => {
    const r1 = calculateZiweiLiuRi({ ...baseInput, targetDay: 20 });
    const r2 = calculateZiweiLiuRi({ ...baseInput, targetDay: 21 });
    expect(r1.flowDay.ganZhi).not.toBe(r2.flowDay.ganZhi);
  });

  it("12 宫位包含正确的宫名", () => {
    const result = calculateZiweiLiuRi(baseInput);
    const gongNames = result.palaces.map(p => p.flowGongName);
    expect(gongNames).toContain("命宫");
    expect(gongNames).toContain("财帛");
    expect(gongNames).toContain("官禄");
    expect(gongNames).toContain("夫妻");
  });

  it("四化包含四个星曜", () => {
    const result = calculateZiweiLiuRi(baseInput);
    expect(result.flowSiHua.huaLu).toBeTruthy();
    expect(result.flowSiHua.huaQuan).toBeTruthy();
    expect(result.flowSiHua.huaKe).toBeTruthy();
    expect(result.flowSiHua.huaJi).toBeTruthy();
  });

  it("fortune 包含五个维度", () => {
    const result = calculateZiweiLiuRi(baseInput);
    expect(result.fortune.overall).toBeTruthy();
    expect(result.fortune.career).toBeTruthy();
    expect(result.fortune.wealth).toBeTruthy();
    expect(result.fortune.love).toBeTruthy();
    expect(result.fortune.health).toBeTruthy();
  });

  it("highlights 非空数组", () => {
    const result = calculateZiweiLiuRi(baseInput);
    expect(result.highlights.length).toBeGreaterThan(0);
  });
});
