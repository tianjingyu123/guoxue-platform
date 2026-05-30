import { calculateYangGong } from "./yanggong.calculator";

describe("YangGong Calculator", () => {
  it("返回完整杨公风水分析", () => {
    const result = calculateYangGong({ sitting: "子", period: 9 });
    expect(result.sitting).toBe("子");
    expect(result.facing).toBe("午");
    expect(result.period).toBe(9);
    expect(result.mountains).toHaveLength(24);
    expect(result.summary).toContain("坐子向午");
  });

  it("默认使用九运", () => {
    const result = calculateYangGong({ sitting: "午" });
    expect(result.period).toBe(9);
  });

  it("坐向正确对冲", () => {
    const pairs = [
      ["子", "午"], ["卯", "酉"], ["乾", "巽"], ["艮", "坤"],
    ];
    for (const [sit, face] of pairs) {
      const result = calculateYangGong({ sitting: sit });
      expect(result.facing).toBe(face);
    }
  });

  it("零正神非空", () => {
    const result = calculateYangGong({ sitting: "壬", period: 8 });
    expect(result.zhengShen.sector).toBeTruthy();
    expect(result.lingShen.sector).toBeTruthy();
    expect(result.zhengShen.advice).toContain("正神");
    expect(result.lingShen.advice).toContain("零神");
  });

  it("城门方位非空", () => {
    const result = calculateYangGong({ sitting: "子", period: 9 });
    expect(result.chengMen.length).toBe(2);
  });

  it("旺山列表非空", () => {
    const result = calculateYangGong({ sitting: "子", period: 9 });
    expect(result.wangShan.length).toBeGreaterThan(0);
  });

  it("不同坐山产生不同结果", () => {
    const r1 = calculateYangGong({ sitting: "子" });
    const r2 = calculateYangGong({ sitting: "午" });
    expect(r1.facing).not.toBe(r2.facing);
    expect(r1.sittingSector).not.toBe(r2.sittingSector);
  });

  it("fortune 包含核心维度", () => {
    const result = calculateYangGong({ sitting: "甲", period: 9 });
    expect(result.fortune.overall).toBeTruthy();
    expect(result.fortune.wealth).toBeTruthy();
    expect(result.fortune.health).toBeTruthy();
    expect(result.fortune.career).toBeTruthy();
    expect(result.fortune.advice).toBeTruthy();
  });

  it("同输入结果确定性", () => {
    const r1 = calculateYangGong({ sitting: "乾", period: 7 });
    const r2 = calculateYangGong({ sitting: "乾", period: 7 });
    expect(r1.summary).toBe(r2.summary);
    expect(r1.fortune.overall).toBe(r2.fortune.overall);
  });
});
