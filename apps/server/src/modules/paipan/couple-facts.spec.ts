import { extractCoupleFacts, formatCoupleFacts, relateWuXing, stripBirthDetails } from "./couple-facts";

/**
 * 双人合盘的隐私红线。
 *
 * `CoupleService` 承诺「任何端点都不返回对方 recordId / 生辰 / 四柱 / 原始盘，
 * 双方唯一共享内容＝合婚报告文本」。字段那一层早就堵住了，
 * 漏的是正文：合婚 prompt 曾把双方出生日期与四柱原样喂给模型，
 * 还要它分析「年柱纳音配对、年柱天干地支合冲」，模型必然写出具体干支，
 * 而四柱能反推出生时刻，报告又是双方都看得到的。
 *
 * 现在改成引擎先算「关系」、模型只拿关系。这组测试盯住的就是：
 * **喂给模型的那段文字里，不能出现任何可反推出生时刻的原始值**。
 */
const male: any = {
  siZhu: {
    nian: { gan: "庚", zhi: "午", nayin: "路旁土" },
    yue: { gan: "己", zhi: "卯", nayin: "城头土" },
    ri: { gan: "甲", zhi: "寅", nayin: "大溪水" },
    shi: { gan: "己", zhi: "巳", nayin: "大林木" },
  },
  geJu: { name: "正官格", yongShen: "水(生)" },
  wuXingEnergy: { mu: 35, huo: 20, tu: 25, jin: 15, shui: 5 },
  input: { year: 1990, month: 3, day: 15, hour: 10 },
};

const female: any = {
  siZhu: {
    nian: { gan: "壬", zhi: "申", nayin: "剑锋金" },
    yue: { gan: "戊", zhi: "申", nayin: "大驿土" },
    ri: { gan: "丁", zhi: "亥", nayin: "屋上土" },
    shi: { gan: "辛", zhi: "丑", nayin: "壁上土" },
  },
  geJu: { name: "偏印格", yongShen: "木(生)" },
  wuXingEnergy: { mu: 10, huo: 20, tu: 30, jin: 30, shui: 10 },
  input: { year: 1992, month: 8, day: 7, hour: 22 },
};

describe("合盘关系事实", () => {
  it("五行生克要说清方向，而不是只说「有关系」", () => {
    expect(relateWuXing("木", "火")).toEqual({ type: "相生", from: "男" });
    expect(relateWuXing("火", "木")).toEqual({ type: "相生", from: "女" });
    expect(relateWuXing("木", "土")).toEqual({ type: "相克", from: "男" });
    expect(relateWuXing("土", "木")).toEqual({ type: "相克", from: "女" });
    expect(relateWuXing("木", "木")).toEqual({ type: "比和" });
  });

  it("算出日主、夫妻宫与各柱合冲刑害", () => {
    const f = extractCoupleFacts(male, female);
    expect(f.dayMaster.male).toEqual({ gan: "甲", wuXing: "木" });
    expect(f.dayMaster.female).toEqual({ gan: "丁", wuXing: "火" });
    // 甲木生丁火
    expect(f.dayMaster.relation).toEqual({ type: "相生", from: "男" });
    // 男日支寅、女日支亥 → 寅亥六合
    expect(f.spousePalace).toBe("六合");
    // 男年支午 与 女月支申：不构成六合六冲六害三刑；男日支寅 与 女年支申 相冲
    expect(f.zhiRelations).toContainEqual({ male: "日柱", female: "年柱", type: "六冲" });
  });

  it("纳音只给五行关系，不给纳音名——「路旁土」等于交出出生年份", () => {
    const f = extractCoupleFacts(male, female);
    // 路旁土(土) 与 剑锋金(金)：土生金
    expect(f.nayin.relation).toEqual({ type: "相生", from: "男" });
    expect(JSON.stringify(f)).not.toContain("路旁土");
    expect(JSON.stringify(f)).not.toContain("剑锋金");
  });

  it("用神互补看的是「对方盘里这个五行旺不旺」", () => {
    const f = extractCoupleFacts(male, female);
    // 男喜水，女方水 10% → 补力有限
    expect(f.yongShen.male).toEqual({ needs: "水(生)", partnerHasStrong: false });
    // 女喜木，男方木 35% → 有力
    expect(f.yongShen.female).toEqual({ needs: "木(生)", partnerHasStrong: true });
  });

  it("盘面不全也不炸：缺字段时给出「未详」而不是抛异常", () => {
    const f = extractCoupleFacts({} as any, {} as any);
    expect(f.spousePalace).toBe("无特殊关系");
    expect(f.zhiRelations).toEqual([]);
    expect(() => formatCoupleFacts(f)).not.toThrow();
  });
});

describe("给模型的事实清单不得夹带生辰", () => {
  const text = formatCoupleFacts(extractCoupleFacts(male, female));

  it("不含出生年月日", () => {
    expect(text).not.toMatch(/\d{4}\s*年/);
    expect(text).not.toContain("1990");
    expect(text).not.toContain("1992");
  });

  it("不含四柱干支组合：四柱能反推出生时刻", () => {
    for (const p of ["庚午", "己卯", "甲寅", "己巳", "壬申", "戊申", "丁亥", "辛丑"]) {
      expect([p, text.includes(p)]).toEqual([p, false]);
    }
  });

  it("不含地支本身，只说哪两柱之间是什么关系", () => {
    expect(text).toContain("日柱");
    expect(text).toMatch(/六合|六冲|六害|相刑|无特殊关系/);
    // 地支单字不该出现在关系描述里
    expect(text).not.toMatch(/男年柱[子丑寅卯辰巳午未申酉戌亥]/);
  });

  it("该给的还是要给：日主天干、五行占比、格局——不然分析无从谈起", () => {
    expect(text).toContain("甲");
    expect(text).toContain("丁");
    expect(text).toContain("正官格");
    expect(text).toContain("木35%");
  });
});

describe("兜底过滤", () => {
  it("模型若自己编了出生日期，发给用户前删掉", () => {
    expect(stripBirthDetails("男方1990年3月15日生")).toBe("男方（出生信息不展示）生");
    expect(stripBirthDetails("女方 1992年8月7日22时 出生")).toBe("女方 （出生信息不展示） 出生");
    expect(stripBirthDetails("生于1990-03-15")).toBe("生于（出生信息不展示）");
  });

  it("正常文字不受影响", () => {
    const t = "双方日主一生一克，相处中宜多沟通。";
    expect(stripBirthDetails(t)).toBe(t);
  });
});
