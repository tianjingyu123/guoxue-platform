import { calculateYiZhangJing } from "./yizhangjing.calculator";

describe("YiZhangJing Calculator — 古本对照验证", () => {
  // ── 古本经典案例验证 ──

  it("古本验证：巳年男命年道为仙道", () => {
    // 来源：知乎《自学一掌经测算详细方法》
    // 巳年→仙，2013年3月1日在春节后，属巳年
    const result = calculateYiZhangJing({ year: 2013, month: 3, day: 1, hour: 4, gender: "男" });
    expect(result.yearDao.name).toBe("仙道");
    expect(result.finalDao).toBeDefined();
  });

  it("辰戌为修罗道，巳亥为仙道（古本映射）", () => {
    // 辰年：2012春节=1月23日，需在春节后
    const r1 = calculateYiZhangJing({ year: 2012, month: 3, day: 1, hour: 0, gender: "男" });
    expect(r1.yearDao.name).toBe("阿修罗道"); // 辰=修罗

    // 巳年：2013春节=2月10日，需在春节后
    const r2 = calculateYiZhangJing({ year: 2013, month: 3, day: 1, hour: 0, gender: "男" });
    expect(r2.yearDao.name).toBe("仙道"); // 巳=仙
  });

  // ── 男顺女逆验证 ──

  it("同生辰男女因顺逆不同得不同结果", () => {
    const male = calculateYiZhangJing({ year: 1990, month: 5, day: 15, hour: 10, gender: "男" });
    const female = calculateYiZhangJing({ year: 1990, month: 5, day: 15, hour: 10, gender: "女" });
    // 同一时间出生，男女因顺逆不同至少有一个维度结果不同
    expect(male.combination !== female.combination || male.finalDao.name !== female.finalDao.name).toBe(true);
  });

  it("女命逆数验证：同日生男女月道不同", () => {
    const male = calculateYiZhangJing({ year: 1990, month: 6, day: 10, hour: 8, gender: "男" });
    const female = calculateYiZhangJing({ year: 1990, month: 6, day: 10, hour: 8, gender: "女" });
    expect(male.monthDao.name !== female.monthDao.name).toBe(true);
  });

  // ── 基本功能验证 ──

  it("返回完整六道分析（含十二宫名）", () => {
    const result = calculateYiZhangJing({ year: 1990, month: 5, day: 15, hour: 10, gender: "男" });
    expect(result.yearDao.name).toBeTruthy();
    expect(result.yearDao.gongName).toBeTruthy(); // 新增十二宫名
    expect(result.monthDao.name).toBeTruthy();
    expect(result.dayDao.name).toBeTruthy();
    expect(result.hourDao.name).toBeTruthy();
    expect(result.finalDao.name).toBeTruthy();
    expect(result.combination).toContain("·");
    expect(result.fortune.career).toBeTruthy();
    expect(result.summary).toContain("命属");
    expect(result.summary).toContain("宫"); // 含宫名
    expect(result.pastLife.year).toBeTruthy(); // 新增前世信息
  });

  it("六道名称在有效范围内", () => {
    const validDao = ["佛道", "仙道", "人道", "阿修罗道", "鬼道", "畜生道"];
    const result = calculateYiZhangJing({ year: 1985, month: 8, day: 20, hour: 14, gender: "女" });
    expect(validDao).toContain(result.finalDao.name);
    expect(validDao).toContain(result.yearDao.name);
  });

  it("同输入结果确定性", () => {
    const r1 = calculateYiZhangJing({ year: 2000, month: 1, day: 1, hour: 0, gender: "男" });
    const r2 = calculateYiZhangJing({ year: 2000, month: 1, day: 1, hour: 0, gender: "男" });
    expect(r1.finalDao.name).toBe(r2.finalDao.name);
    expect(r1.combination).toBe(r2.combination);
  });

  it("finalDao 包含完整详情", () => {
    const result = calculateYiZhangJing({ year: 1995, month: 10, day: 25, hour: 8, gender: "男" });
    expect(result.finalDao.element).toBeTruthy();
    expect(result.finalDao.nature).toBeTruthy();
    expect(result.finalDao.desc).toBeTruthy();
  });

  it("fortune 包含五个维度", () => {
    const result = calculateYiZhangJing({ year: 1988, month: 3, day: 10, hour: 16, gender: "女" });
    expect(result.fortune.career).toBeTruthy();
    expect(result.fortune.wealth).toBeTruthy();
    expect(result.fortune.love).toBeTruthy();
    expect(result.fortune.health).toBeTruthy();
    expect(result.fortune.personality).toBeTruthy();
  });
});
