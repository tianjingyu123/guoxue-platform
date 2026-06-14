import { calculateErShiBaXiu } from "./ershibaxiu.calculator";

describe("ErShiBaXiu Calculator", () => {
  it("按日期查询值宿", () => {
    const r = calculateErShiBaXiu({ date: "2026-06-10" });
    expect(r.date).toBe("2026-06-10");
    expect(r.currentXiu).toBeTruthy();
    expect(r.currentXiu.name).toBeTruthy();
    expect(r.currentXiu.jiXiong).toBeTruthy();
    expect(r.ganZhi).toBeTruthy();
    expect(r.fullTable.length).toBe(28);
  });

  it("按序号查询指定宿", () => {
    const r = calculateErShiBaXiu({ xiuNumber: 1 });
    expect(r.currentXiu.index).toBe(1);
    expect(r.currentXiu.name).toContain("角");
  });

  it("28宿速查表完整", () => {
    const r = calculateErShiBaXiu({ date: "2026-01-15" });
    expect(r.fullTable.length).toBe(28);
    const directions = new Set(r.fullTable.map(x => x.direction));
    expect(directions.size).toBe(4); // 东南西北
  });
});
