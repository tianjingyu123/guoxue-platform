import { calculateChengGu } from "./chenggu.calculator";

describe("ChengGu Calculator", () => {
  it("计算 1990-08-15 12时 的骨重", () => {
    const result = calculateChengGu({ year: 1990, month: 8, day: 15, hour: 12 });
    expect(result.totalWeight).toBeGreaterThan(2);
    expect(result.totalWeight).toBeLessThan(8);
    expect(result.totalWeightStr).toMatch(/两/);
    expect(result.poem).toBeTruthy();
    expect(result.level).toBeTruthy();
    expect(result.lunarInfo.year).toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
  });

  it("四骨重之和等于总骨重", () => {
    const result = calculateChengGu({ year: 1985, month: 3, day: 20, hour: 8 });
    const sum = result.bones.year.weight + result.bones.month.weight +
                result.bones.day.weight + result.bones.hour.weight;
    expect(Math.round(sum * 10) / 10).toBe(result.totalWeight);
  });

  it("边界值：子时（23点）", () => {
    const result = calculateChengGu({ year: 2000, month: 1, day: 1, hour: 23 });
    expect(result.lunarInfo.shiChen).toBe("子时");
    expect(result.bones.hour.weight).toBe(1.6);
  });

  it("边界值：午时（12点）", () => {
    const result = calculateChengGu({ year: 2000, month: 6, day: 15, hour: 12 });
    expect(result.lunarInfo.shiChen).toBe("午时");
    expect(result.bones.hour.weight).toBe(1.0);
  });

  it("有对应诗文输出", () => {
    const result = calculateChengGu({ year: 1988, month: 10, day: 25, hour: 6 });
    expect(result.poem.length).toBeGreaterThan(10);
    expect(result.interpretation.length).toBeGreaterThan(3);
  });

  it("性别参数正确传递", () => {
    const result = calculateChengGu({ year: 1995, month: 5, day: 10, hour: 14, gender: "女" });
    expect(result.input.gender).toBe("女");
  });
});
