import { calcBazi, calcSiZhu } from "@guoxue/bazi-engine";
import { reverseBaziPillars } from "./bazi-reverse";

const sample = { name: "", gender: "男" as const, year: 2000, month: 6, day: 15, hour: 12, minute: 30, ziShiMode: "traditional" as const };
const chart = calcSiZhu(sample);
const pillars = {
  year: chart.nian.gan + chart.nian.zhi,
  month: chart.yue.gan + chart.yue.zhi,
  day: chart.ri.gan + chart.ri.zhi,
  hour: chart.shi.gan + chart.shi.zhi,
  ziShiMode: "traditional" as const,
};

describe("四柱反查", () => {
  it("返回由正式八字引擎复核的日期和可选时分", () => {
    const result = reverseBaziPillars(pillars);
    const date = result.candidates.find((x) => x.year === 2000 && x.month === 6 && x.day === 15);
    expect(date?.hours.find((x) => x.hour === 12)?.minutes).toContain(30);
    expect(result.toYear).toBe(new Date().getFullYear());
    expect(result.candidates.every((x) => x.year >= 1900 && x.year <= result.toYear)).toBe(true);
  });

  it("不接受阴阳不配的干支，也不凭空补日期", () => {
    expect(reverseBaziPillars({ ...pillars, day: "甲丑" }).candidates).toEqual([]);
  });

  it("调用方收窄年份时不返回更晚的出生日期", () => {
    expect(reverseBaziPillars(pillars, 1999).candidates.every((x) => x.year <= 1999)).toBe(true);
  });

  it.each(["traditional", "modern"] as const)("子时按 %s 口径反查", (ziShiMode) => {
    const input = { ...sample, hour: 23, minute: 45, ziShiMode };
    const result = calcSiZhu(input);
    const found = reverseBaziPillars({
      year: result.nian.gan + result.nian.zhi,
      month: result.yue.gan + result.yue.zhi,
      day: result.ri.gan + result.ri.zhi,
      hour: result.shi.gan + result.shi.zhi,
      ziShiMode,
    });
    expect(found.candidates.find((x) => x.year === input.year && x.month === input.month && x.day === input.day)
      ?.hours.find((x) => x.hour === 23)?.minutes).toContain(45);
  });

  it("夏令时校正仍由正式出盘引擎执行，反查不暗中改变出生时钟", () => {
    const input = { ...sample, year: 1986, month: 7, day: 15, hour: 0, minute: 30, ziShiMode: "modern" as const };
    const unadjusted = calcBazi({ ...input, useDaylightSaving: false });
    const adjusted = calcBazi({ ...input, useDaylightSaving: true });
    expect(unadjusted.siZhu.ri.gan + unadjusted.siZhu.ri.zhi)
      .not.toBe(adjusted.siZhu.ri.gan + adjusted.siZhu.ri.zhi);
  });
});
