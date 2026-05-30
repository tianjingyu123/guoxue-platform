import { calculateHuangLi } from "./huangli.calculator";

describe("HuangLi Calculator", () => {
  it("返回今日黄历完整数据", () => {
    const result = calculateHuangLi({ date: "2026-05-21" });
    expect(result.date).toBe("2026-05-21");
    expect(result.lunarDate).toContain("月");
    expect(result.ganZhi.year).toHaveLength(2);
    expect(result.ganZhi.month).toHaveLength(2);
    expect(result.ganZhi.day).toHaveLength(2);
    expect(result.yi.length).toBeGreaterThan(0);
    expect(result.ji.length).toBeGreaterThan(0);
    expect(result.jiShi.length).toBeGreaterThan(0);
    expect(result.summary).toContain("2026-05-21");
  });

  it("财神/喜神/福神方位非空", () => {
    const result = calculateHuangLi({ date: "2026-01-01" });
    expect(result.caiShen).toBeTruthy();
    expect(result.xiShen).toBeTruthy();
    expect(result.fuShen).toBeTruthy();
  });

  it("冲煞信息包含方向", () => {
    const result = calculateHuangLi({ date: "2026-06-15" });
    expect(result.chongSha).toContain("冲");
  });

  it("不传日期默认今天", () => {
    const result = calculateHuangLi({});
    const today = new Date().toISOString().split("T")[0];
    expect(result.date).toBe(today);
  });

  it("同日结果确定性", () => {
    const r1 = calculateHuangLi({ date: "2026-03-15" });
    const r2 = calculateHuangLi({ date: "2026-03-15" });
    expect(r1.ganZhi).toEqual(r2.ganZhi);
    expect(r1.yi).toEqual(r2.yi);
  });

  it("摘要包含宜忌", () => {
    const result = calculateHuangLi({ date: "2026-08-08" });
    expect(result.summary).toContain("宜");
    expect(result.summary).toContain("忌");
  });
});
