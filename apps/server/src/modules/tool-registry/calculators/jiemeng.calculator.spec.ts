import { calculateJieMeng } from "./jiemeng.calculator";

describe("JieMeng Calculator", () => {
  it("空输入返回提示", () => {
    const result = calculateJieMeng({ dream: "" });
    expect(result.matches).toHaveLength(0);
    expect(result.overall.omen).toBe("平");
    expect(result.overall.summary).toContain("请输入");
  });

  it("无关键词匹配返回提示", () => {
    const result = calculateJieMeng({ dream: "一个很奇怪的梦没有对应条目" });
    expect(result.matches).toHaveLength(0);
    expect(result.overall.summary).toContain("暂未在传统梦典中找到");
  });

  it("单关键词精确匹配——梦到蛇", () => {
    const result = calculateJieMeng({ dream: "我梦到了一条大蛇" });
    expect(result.matches.length).toBeGreaterThan(0);
    const snake = result.matches.find((m) => m.keyword === "蛇");
    expect(snake).toBeDefined();
    expect(snake!.omen).toBe("吉");
    expect(snake!.category).toBe("动物");
    expect(snake!.confidence).toBe(0.7); // 单字关键词置信度 0.7
  });

  it("多关键词匹配——梦到蛇和水", () => {
    const result = calculateJieMeng({ dream: "梦到蛇在水里游泳" });
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    const keywords = result.matches.map((m) => m.keyword);
    expect(keywords).toContain("蛇");
    // "水"或"游泳"可能被匹配到
    const waterRelated = result.matches.some(
      (m) => m.keyword === "水" || m.keyword === "游泳"
    );
    expect(waterRelated).toBe(true);
  });

  it("长词优先匹配——梦到棺材（不匹配'材'字）", () => {
    const result = calculateJieMeng({ dream: "梦到了棺材" });
    const coffin = result.matches.find((m) => m.keyword === "棺材");
    expect(coffin).toBeDefined();
    expect(coffin!.omen).toBe("吉");
    expect(coffin!.meaning).toContain("升官发财");
  });

  it("吉兆汇总——梦到鱼和钱", () => {
    const result = calculateJieMeng({ dream: "梦到鱼和很多钱" });
    expect(result.overall.omen).toBe("吉");
    expect(result.overall.jiCount).toBeGreaterThanOrEqual(2);
    expect(result.overall.summary).toContain("吉");
  });

  it("凶兆汇总——梦到掉牙和鬼", () => {
    const result = calculateJieMeng({ dream: "梦到掉牙还见鬼了" });
    const teeth = result.matches.find((m) => m.keyword === "牙齿");
    const ghost = result.matches.find((m) => m.keyword === "鬼");
    expect(teeth).toBeDefined();
    expect(ghost).toBeDefined();
    expect(teeth!.omen).toBe("凶");
    expect(ghost!.omen).toBe("凶");
  });

  it("吉凶参半——梦到蛇和掉牙", () => {
    const result = calculateJieMeng({ dream: "梦到蛇缠身然后掉牙了" });
    const snake = result.matches.find((m) => m.keyword === "蛇");
    const teeth = result.matches.find((m) => m.keyword === "牙齿");
    expect(snake).toBeDefined();
    expect(teeth).toBeDefined();
    // 一吉一凶 => 吉凶参半或偏某一方
    expect(["吉", "凶", "平"]).toContain(result.overall.omen);
  });

  it("最多返回6条匹配", () => {
    const result = calculateJieMeng({
      dream: "梦到龙蛇虎狗猫鱼鸟马牛羊猴鸡猪",
    });
    expect(result.matches.length).toBeLessThanOrEqual(6);
  });

  it("做梦梦到飞行为吉兆", () => {
    const result = calculateJieMeng({ dream: "我在天上飞" });
    const fly = result.matches.find((m) => m.keyword === "飞");
    expect(fly).toBeDefined();
    expect(fly!.omen).toBe("吉");
  });

  it("梦到考试匹配行为类", () => {
    const result = calculateJieMeng({ dream: "梦到考试没复习" });
    const exam = result.matches.find((m) => m.keyword === "考试");
    expect(exam).toBeDefined();
    expect(exam!.category).toBe("行为");
  });

  it("谐音吉兆——梦到棺材（升官发财）", () => {
    const result = calculateJieMeng({ dream: "梦见一口红棺材" });
    const coffin = result.matches.find((m) => m.keyword === "棺材");
    expect(coffin).toBeDefined();
    expect(coffin!.omen).toBe("吉");
  });

  it("部分匹配——'大水'匹配到'水'", () => {
    const result = calculateJieMeng({ dream: "梦见发大水" });
    // "大水" 本身不是关键词，但"水"可以部分匹配
    const hasWaterRelated = result.matches.some(
      (m) => m.keyword === "水" || m.keyword === "洪水"
    );
    expect(hasWaterRelated).toBe(true);
  });

  it("确定性强——同一梦境多次查询结果一致", () => {
    const r1 = calculateJieMeng({ dream: "梦到一条金龙在云中飞" });
    const r2 = calculateJieMeng({ dream: "梦到一条金龙在云中飞" });
    expect(r1.matches.length).toBe(r2.matches.length);
    expect(r1.overall.omen).toBe(r2.overall.omen);
    expect(r1.overall.jiCount).toBe(r2.overall.jiCount);
  });
});
