import { calculateCongGeZhuanLun } from "./congge-zhuanlun.calculator";

describe("CongGeZhuanLun Calculator", () => {
  it("甲寅日主得月令应入专旺格", () => {
    const r = calculateCongGeZhuanLun({
      gender: "男", dayPillar: "甲寅", monthPillar: "丙午",
      yearPillar: "戊辰", hourPillar: "壬申",
    });
    expect(r.dayMaster).toBe("甲");
    expect(r.geType).toBeTruthy();
    expect(r.geName).toBeTruthy();
    expect(r.conditions.length).toBeGreaterThan(0);
    expect(r.xiShen.length).toBeGreaterThan(0);
    expect(r.jiShen.length).toBeGreaterThan(0);
  });

  it("缺少日柱时报错", () => {
    expect(() => calculateCongGeZhuanLun({ gender: "男" } as any)).toThrow();
  });
});
