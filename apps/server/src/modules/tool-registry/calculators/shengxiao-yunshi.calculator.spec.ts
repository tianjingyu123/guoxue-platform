import { calculateShengXiaoYunshi } from "./shengxiao-yunshi.calculator";

describe("ShengXiaoYunshi Calculator", () => {
  it("指定生肖返回完整运势", () => {
    const result = calculateShengXiaoYunshi({ shengXiao: "龙", date: "2026-05-21" });
    expect(result.shengXiao).toBe("龙");
    expect(result.date).toBe("2026-05-21");
    expect(result.scores.total).toBeGreaterThanOrEqual(20);
    expect(result.scores.total).toBeLessThanOrEqual(98);
    expect(result.lucky.color).toBeTruthy();
    expect(result.lucky.direction).toBeTruthy();
    expect(result.yiJi.yi.length).toBeGreaterThan(0);
    expect(result.yiJi.ji.length).toBeGreaterThan(0);
    expect(result.summary).toContain("龙");
  });

  it("通过出生年推导生肖", () => {
    const result = calculateShengXiaoYunshi({ birthYear: 1990, date: "2026-05-21" });
    expect(result.shengXiao).toBe("马");
  });

  it("同日同生肖结果确定性", () => {
    const r1 = calculateShengXiaoYunshi({ shengXiao: "虎", date: "2026-06-01" });
    const r2 = calculateShengXiaoYunshi({ shengXiao: "虎", date: "2026-06-01" });
    expect(r1.scores.total).toBe(r2.scores.total);
    expect(r1.lucky.number).toBe(r2.lucky.number);
  });

  it("不同日期不同结果", () => {
    const r1 = calculateShengXiaoYunshi({ shengXiao: "鼠", date: "2026-01-01" });
    const r2 = calculateShengXiaoYunshi({ shengXiao: "鼠", date: "2026-06-15" });
    // 极小概率完全相同，可接受
    expect(r1.scores.total !== r2.scores.total || r1.lucky.number !== r2.lucky.number).toBe(true);
  });

  it("五维评分均在合理范围", () => {
    const result = calculateShengXiaoYunshi({ shengXiao: "猪", date: "2026-03-15" });
    const { scores } = result;
    expect(scores.career).toBeGreaterThanOrEqual(20);
    expect(scores.career).toBeLessThanOrEqual(98);
    expect(scores.wealth).toBeGreaterThanOrEqual(20);
    expect(scores.love).toBeGreaterThanOrEqual(20);
    expect(scores.health).toBeGreaterThanOrEqual(25);
  });

  it("太岁关系正确标注", () => {
    // 2026 年丙午年（马年），马值太岁
    const result = calculateShengXiaoYunshi({ shengXiao: "马", date: "2026-05-21" });
    expect(result.taiSuiRelation).toContain("太岁");
  });
});
