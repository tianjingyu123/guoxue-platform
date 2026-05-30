import { calculateZeRi } from "./zeri.calculator";

describe("ZeRi Calculator", () => {
  it("返回择日结果", () => {
    const result = calculateZeRi({
      eventType: "嫁娶",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    expect(result.eventType).toBe("嫁娶");
    expect(result.totalDays).toBe(30);
    expect(result.recommendedDates.length).toBeGreaterThan(0);
    expect(result.summary).toContain("嫁娶");
  });

  it("推荐日期按分数降序排列", () => {
    const result = calculateZeRi({
      eventType: "开业",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    for (let i = 1; i < result.recommendedDates.length; i++) {
      expect(result.recommendedDates[i - 1].score).toBeGreaterThanOrEqual(result.recommendedDates[i].score);
    }
  });

  it("推荐日期不在忌列表中", () => {
    const result = calculateZeRi({
      eventType: "搬家",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    for (const date of result.recommendedDates) {
      const hasJi = date.ji.some(j => j.includes("搬家") || j.includes("入宅") || j.includes("移徙"));
      expect(hasJi).toBe(false);
    }
  });

  it("maxResults 限制返回条数", () => {
    const result = calculateZeRi({
      eventType: "祈福",
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      maxResults: 3,
    });
    expect(result.recommendedDates.length).toBeLessThanOrEqual(3);
  });

  it("每个推荐日期包含完整信息", () => {
    const result = calculateZeRi({
      eventType: "出行",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    if (result.recommendedDates.length > 0) {
      const first = result.recommendedDates[0];
      expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(first.lunarDate).toBeTruthy();
      expect(first.ganZhi).toHaveLength(2);
      expect(first.level).toBeTruthy();
      expect(first.reasons.length).toBeGreaterThan(0);
    }
  });

  it("日期范围上限90天", () => {
    const result = calculateZeRi({
      eventType: "动土",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(result.totalDays).toBeLessThanOrEqual(90);
  });

  it("同输入结果确定性", () => {
    const input = { eventType: "入宅", startDate: "2026-06-01", endDate: "2026-06-15" };
    const r1 = calculateZeRi(input);
    const r2 = calculateZeRi(input);
    expect(r1.recommendedDates.length).toBe(r2.recommendedDates.length);
    if (r1.recommendedDates.length > 0) {
      expect(r1.recommendedDates[0].date).toBe(r2.recommendedDates[0].date);
    }
  });
});
