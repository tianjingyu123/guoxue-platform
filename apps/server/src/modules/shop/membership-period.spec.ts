import { addCalendarMonthsClamped } from "./membership-period";

describe("从业者会员自然月顺延", () => {
  it.each([
    ["2025-01-31T12:34:56.000Z", "2025-02-28T12:34:56.000Z"],
    ["2024-01-31T12:34:56.000Z", "2024-02-29T12:34:56.000Z"],
    ["2025-03-31T12:34:56.000Z", "2025-04-30T12:34:56.000Z"],
    ["2025-12-31T12:34:56.000Z", "2026-01-31T12:34:56.000Z"],
  ])("%s 顺延一月至 %s", (from, expected) => {
    const original = new Date(from);
    expect(addCalendarMonthsClamped(original, 1).toISOString()).toBe(expected);
    expect(original.toISOString()).toBe(from);
  });
});
