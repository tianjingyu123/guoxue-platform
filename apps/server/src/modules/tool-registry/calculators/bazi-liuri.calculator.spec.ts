import { calculateBaziLiuRi } from "./bazi-liuri.calculator";

describe("BaziLiuRi Calculator", () => {
  const baseInput = {
    year: 1990, month: 5, day: 15, hour: 10,
    gender: "男" as const,
    targetYear: 2026, targetMonth: 5, targetDay: 21,
  };

  it("返回完整流日结果", () => {
    const result = calculateBaziLiuRi(baseInput);
    expect(result.natalChart.ri).toBeTruthy();
    expect(result.natalChart.riGan).toBeTruthy();
    expect(result.liuRi.ganZhi).toHaveLength(2);
    expect(result.liuRi.ganShiShen).toBeTruthy();
    expect(result.liuRi.nayin).toBeTruthy();
    expect(result.summary).toContain("流日");
  });

  it("无 targetHour 时 liuShi 为 null", () => {
    const result = calculateBaziLiuRi(baseInput);
    expect(result.liuShi).toBeNull();
  });

  it("有 targetHour 时返回流时", () => {
    const result = calculateBaziLiuRi({ ...baseInput, targetHour: 14 });
    expect(result.liuShi).not.toBeNull();
    expect(result.liuShi!.ganZhi).toHaveLength(2);
    expect(result.liuShi!.ganShiShen).toBeTruthy();
  });

  it("同输入结果确定性", () => {
    const r1 = calculateBaziLiuRi(baseInput);
    const r2 = calculateBaziLiuRi(baseInput);
    expect(r1.liuRi.ganZhi).toBe(r2.liuRi.ganZhi);
    expect(r1.summary).toBe(r2.summary);
  });

  it("不同日期产生不同流日", () => {
    const r1 = calculateBaziLiuRi({ ...baseInput, targetDay: 20 });
    const r2 = calculateBaziLiuRi({ ...baseInput, targetDay: 21 });
    expect(r1.liuRi.ganZhi).not.toBe(r2.liuRi.ganZhi);
  });

  it("fortune 包含五个维度", () => {
    const result = calculateBaziLiuRi(baseInput);
    expect(result.fortune.overall).toBeTruthy();
    expect(result.fortune.career).toBeTruthy();
    expect(result.fortune.wealth).toBeTruthy();
    expect(result.fortune.love).toBeTruthy();
    expect(result.fortune.health).toBeTruthy();
  });

  it("当前大运正确定位", () => {
    const result = calculateBaziLiuRi(baseInput);
    if (result.currentDaYun) {
      const age = baseInput.targetYear - baseInput.year + 1;
      expect(age).toBeGreaterThanOrEqual(result.currentDaYun.startAge);
      expect(age).toBeLessThanOrEqual(result.currentDaYun.endAge);
    }
  });

  it("流年十神正确计算", () => {
    const result = calculateBaziLiuRi(baseInput);
    expect(result.currentLiuNian.year).toBe(2026);
    expect(result.currentLiuNian.ganZhi).toHaveLength(2);
    expect(result.currentLiuNian.ganShiShen).toBeTruthy();
  });

  it("interactions 为有效数组", () => {
    const result = calculateBaziLiuRi(baseInput);
    expect(Array.isArray(result.interactions)).toBe(true);
    for (const inter of result.interactions) {
      expect(inter.type).toBeTruthy();
      expect(inter.from).toBeTruthy();
      expect(inter.to).toBeTruthy();
      expect(inter.desc).toBeTruthy();
    }
  });

  it("advice 非空", () => {
    const result = calculateBaziLiuRi(baseInput);
    expect(result.advice).toBeTruthy();
  });
});
