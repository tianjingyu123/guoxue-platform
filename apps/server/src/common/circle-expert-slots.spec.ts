import { buildExpertSlots } from "./circle-expert-slots";

describe("咨询时段单一计算口径", () => {
  const day = "2026-09-05"; // 星期六，按给定日历日计算，不依赖服务器所在时区。
  const slot = { start: "09:30", end: "11:00", interval: 30 };

  it("正确生成分钟级时段，尾部不足一段时不越界", () => {
    expect(buildExpertSlots([{ ...slot, end: "10:50" }], day).map(s => [s.start, s.end]))
      .toEqual([["09:30", "10:00"], ["10:00", "10:30"]]);
  });
  it("部分重叠即占用，相邻边界不占用", () => {
    expect(buildExpertSlots([slot], day, [{ start: "09:45", end: "10:15" }]).map(s => s.available))
      .toEqual([false, false, true]);
  });
  it.each([6, "6", "周六", "星期六", "Saturday", day])("兼容明确的单日配置 %s", selected => {
    expect(buildExpertSlots([{ ...slot, day: selected }], day)).toHaveLength(3);
  });
  it("未知星期与其他日不回退成每天开放", () => {
    for (const selected of ["bad", "周一", "2026-09-06"]) expect(buildExpertSlots([{ ...slot, day: selected }], day)).toEqual([]);
    expect(buildExpertSlots([{ ...slot, days: [1, 6] }], day)).toHaveLength(3);
    expect(buildExpertSlots([{ ...slot, days: [] }], day)).toEqual([]);
  });
  it("重复配置去重，缺配置不虚构可预约时段", () => {
    expect(buildExpertSlots([slot, slot], day)).toHaveLength(3);
    for (const raw of [null, {}, [], [{ interval: 60 }], Array(65).fill(slot)]) expect(buildExpertSlots(raw, day)).toEqual([]);
  });
  it.each([0, -1, 0.5, 1441, "30"])("坏间隔 %s 不造成无限展开", interval => {
    expect(buildExpertSlots([{ ...slot, interval }], day)).toEqual([]);
  });
  it("无效日期时间不归一成另一日或另一时间", () => {
    expect(buildExpertSlots([slot], "2026-02-30")).toEqual([]);
    expect(buildExpertSlots([{ ...slot, start: "25:00" }], day)).toEqual([]);
    expect(buildExpertSlots([{ ...slot, start: "11:00" }], day)).toEqual([]);
  });
});
