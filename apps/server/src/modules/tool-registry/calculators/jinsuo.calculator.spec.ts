import { calculateJinSuo } from "./jinsuo.calculator";

describe("JinSuo Calculator", () => {
  it("全部得位为上上格局", () => {
    const result = calculateJinSuo({
      kan: "砂", kun: "砂", zhen: "砂", xun: "砂",
      qian: "水", dui: "水", gen: "水", li: "水",
    });
    expect(result.score).toBe(8);
    expect(result.level).toBe("上上格局");
    expect(result.inauspicious).toHaveLength(0);
  });

  it("全部失位为需调整格局", () => {
    const result = calculateJinSuo({
      kan: "水", kun: "水", zhen: "水", xun: "水",
      qian: "砂", dui: "砂", gen: "砂", li: "砂",
    });
    expect(result.score).toBe(0);
    expect(result.level).toBe("需调整格局");
    expect(result.auspicious).toHaveLength(0);
  });

  it("部分输入正确分析", () => {
    const result = calculateJinSuo({
      kan: "砂", qian: "水", li: "水",
    });
    expect(result.score).toBe(3);
    expect(result.auspicious.length).toBe(3);
  });

  it("未知方位不计分", () => {
    const result = calculateJinSuo({
      kan: "砂", kun: "未知",
    });
    expect(result.analysis.find(a => a.position === "坤")!.actual).toBe("未知");
    expect(result.score).toBe(1);
  });

  it("fortune 包含五个维度", () => {
    const result = calculateJinSuo({
      kan: "砂", zhen: "砂", qian: "水", xun: "砂",
    });
    expect(result.fortune.overall).toBeTruthy();
    expect(result.fortune.career).toBeTruthy();
    expect(result.fortune.wealth).toBeTruthy();
    expect(result.fortune.health).toBeTruthy();
    expect(result.fortune.family).toBeTruthy();
  });

  it("失位方位给出建议", () => {
    const result = calculateJinSuo({
      kan: "水", qian: "砂",
    });
    expect(result.advice.length).toBeGreaterThan(0);
    expect(result.advice[0]).toContain("建议");
  });

  it("analysis 包含8个方位", () => {
    const result = calculateJinSuo({});
    expect(result.analysis).toHaveLength(8);
    const positions = result.analysis.map(a => a.position);
    expect(positions).toContain("坎");
    expect(positions).toContain("离");
    expect(positions).toContain("乾");
  });

  it("同输入结果确定性", () => {
    const input = { kan: "砂" as const, li: "水" as const };
    const r1 = calculateJinSuo(input);
    const r2 = calculateJinSuo(input);
    expect(r1.score).toBe(r2.score);
    expect(r1.summary).toBe(r2.summary);
  });
});
