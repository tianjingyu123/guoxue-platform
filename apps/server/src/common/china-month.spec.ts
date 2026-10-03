import { chinaMonthStartUtc } from "./china-month";

describe("chinaMonthStartUtc", () => {
  it("北京时间月末仍属本月", () => {
    expect(chinaMonthStartUtc(new Date("2026-09-30T15:59:59.000Z")).toISOString())
      .toBe("2026-08-31T16:00:00.000Z");
  });

  it("北京时间跨月即切换月初", () => {
    expect(chinaMonthStartUtc(new Date("2026-09-30T16:00:00.000Z")).toISOString())
      .toBe("2026-09-30T16:00:00.000Z");
  });

  it("跨年同样按北京时间计算", () => {
    expect(chinaMonthStartUtc(new Date("2026-12-31T16:00:00.000Z")).toISOString())
      .toBe("2026-12-31T16:00:00.000Z");
  });
});
