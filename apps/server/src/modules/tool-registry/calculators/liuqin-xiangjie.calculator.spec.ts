import { calculateLiuQinXiangJie } from "./liuqin-xiangjie.calculator";

describe("LiuQinXiangJie Calculator", () => {
  it("男命六亲分析", () => {
    const r = calculateLiuQinXiangJie({
      gender: "男", dayPillar: "甲寅", monthPillar: "丙午",
      yearPillar: "戊辰", hourPillar: "壬申",
    });
    expect(r.dayMaster).toBe("甲");
    expect(r.gender).toBe("男");
    expect(r.relations.length).toBeGreaterThanOrEqual(5);
    expect(r.shiShenMap).toBeTruthy();
    expect(r.gongWeiMap).toBeTruthy();

    const self = r.relations.find(x => x.name === "自己");
    expect(self).toBeTruthy();
    expect(self!.wangShuai).toBeTruthy();
  });

  it("缺少日柱时报错", () => {
    expect(() => calculateLiuQinXiangJie({ gender: "男" } as any)).toThrow();
  });
});
