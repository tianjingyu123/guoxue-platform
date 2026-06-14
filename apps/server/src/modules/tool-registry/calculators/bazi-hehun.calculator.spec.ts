import { calculateBaziHehun } from "./bazi-hehun.calculator";

describe("BaziHehun Calculator", () => {
  const baseInput = {
    male: { year: 1990, month: 5, day: 15, hour: 10 },
    female: { year: 1992, month: 8, day: 20, hour: 14 },
  };

  it("返回完整合婚结果", () => {
    const result = calculateBaziHehun(baseInput);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.level).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(result.maleShengXiao).toBeTruthy();
    expect(result.femaleShengXiao).toBeTruthy();
    expect(result.maleDayPillar).toHaveLength(2);
    expect(result.femaleDayPillar).toHaveLength(2);
  });

  it("五维评分均有结果", () => {
    const result = calculateBaziHehun(baseInput);
    const { dimensions } = result;
    expect(dimensions.shengXiao.score).toBeGreaterThanOrEqual(0);
    expect(dimensions.riZhu.score).toBeGreaterThanOrEqual(0);
    expect(dimensions.wuXing.score).toBeGreaterThanOrEqual(0);
    expect(dimensions.shiShen.score).toBeGreaterThanOrEqual(0);
    expect(dimensions.yongShen.score).toBeGreaterThanOrEqual(0);
    for (const d of Object.values(dimensions)) {
      expect(d.score).toBeLessThanOrEqual(d.maxScore);
      expect(d.details.length).toBeGreaterThan(0);
    }
  });

  it("六合生肖得高分", () => {
    // 鼠(1984)+牛(1985) 六合
    const result = calculateBaziHehun({
      male: { year: 1984, month: 6, day: 10, hour: 8 },
      female: { year: 1985, month: 3, day: 15, hour: 14 },
    });
    expect(result.dimensions.shengXiao.score).toBe(20);
    expect(result.dimensions.shengXiao.desc).toContain("六合");
  });

  it("相冲生肖得低分", () => {
    // 鼠(1984)+马(1990) 相冲
    const result = calculateBaziHehun({
      male: { year: 1984, month: 6, day: 10, hour: 8 },
      female: { year: 1990, month: 3, day: 15, hour: 14 },
    });
    expect(result.dimensions.shengXiao.score).toBe(5);
    expect(result.dimensions.shengXiao.desc).toContain("相冲");
  });

  it("评级字符串存在", () => {
    const result = calculateBaziHehun(baseInput);
    expect(["上上婚（天作之合）", "上等婚（良缘佳配）", "中上婚（门当户对）", "中等婚（寻常好合）", "中下婚（需要磨合）", "下等婚（多有波折）", "下下婚（慎重考虑）"]).toContain(result.level);
  });

  it("给出建议", () => {
    const result = calculateBaziHehun(baseInput);
    expect(result.advice.length).toBeGreaterThan(0);
  });
});
