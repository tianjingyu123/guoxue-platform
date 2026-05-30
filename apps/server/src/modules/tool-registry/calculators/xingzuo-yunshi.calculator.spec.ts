import { calculateXingZuoYunshi } from "./xingzuo-yunshi.calculator";

describe("XingZuoYunshi Calculator", () => {
  it("指定星座返回完整运势", () => {
    const result = calculateXingZuoYunshi({ xingZuo: "狮子座", date: "2026-05-21" });
    expect(result.xingZuo).toBe("狮子座");
    expect(result.element).toBe("火");
    expect(result.scores.total).toBeGreaterThanOrEqual(25);
    expect(result.scores.total).toBeLessThanOrEqual(95);
    expect(result.lucky.color).toBeTruthy();
    expect(result.summary).toBeTruthy();
  });

  it("通过出生月日推导星座", () => {
    const result = calculateXingZuoYunshi({ birthMonth: 3, birthDay: 25, date: "2026-05-21" });
    expect(result.xingZuo).toBe("白羊座");
  });

  it("同日同星座结果确定性", () => {
    const r1 = calculateXingZuoYunshi({ xingZuo: "双子座", date: "2026-06-01" });
    const r2 = calculateXingZuoYunshi({ xingZuo: "双子座", date: "2026-06-01" });
    expect(r1.scores.total).toBe(r2.scores.total);
  });

  it("12星座边界正确：摩羯跨年", () => {
    const r1 = calculateXingZuoYunshi({ birthMonth: 12, birthDay: 25, date: "2026-01-01" });
    expect(r1.xingZuo).toBe("摩羯座");
    const r2 = calculateXingZuoYunshi({ birthMonth: 1, birthDay: 15, date: "2026-01-01" });
    expect(r2.xingZuo).toBe("摩羯座");
  });

  it("配对星座存在于列表中", () => {
    const result = calculateXingZuoYunshi({ xingZuo: "天蝎座", date: "2026-05-21" });
    expect(["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"]).toContain(result.lucky.xingZuoPartner);
  });
});
