import { GradingEngineService } from "./grading-engine.service";

describe("GradingEngineService", () => {
  let engine: GradingEngineService;

  beforeEach(() => {
    engine = new GradingEngineService();
  });

  describe("单选题评分", () => {
    it("完全匹配得满分", () => {
      const result = engine.grade(
        "SINGLE_CHOICE",
        { correctKey: "B" },
        { selectedKey: "B" },
        10,
      );
      expect(result.score).toBe(10);
      expect(result.isCorrect).toBe(true);
    });

    it("不匹配得0分", () => {
      const result = engine.grade(
        "SINGLE_CHOICE",
        { correctKey: "A" },
        { selectedKey: "C" },
        10,
      );
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it("忽略大小写", () => {
      const result = engine.grade(
        "SINGLE_CHOICE",
        { correctKey: "a" },
        { selectedKey: "A" },
        10,
      );
      expect(result.score).toBe(10);
      expect(result.isCorrect).toBe(true);
    });
  });

  describe("多选题评分", () => {
    it("完全正确得满分", () => {
      const result = engine.grade(
        "MULTI_CHOICE",
        { correctKeys: ["A", "C", "D"] },
        { selectedKeys: ["A", "C", "D"] },
        10,
      );
      expect(result.score).toBe(10);
      expect(result.isCorrect).toBe(true);
    });

    it("部分正确按比例给分", () => {
      const result = engine.grade(
        "MULTI_CHOICE",
        { correctKeys: ["A", "B", "C"] },
        { selectedKeys: ["A", "B"] },
        10,
      );
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(10);
      expect(result.isCorrect).toBe(false);
    });

    it("多选扣分", () => {
      const perfect = engine.grade(
        "MULTI_CHOICE",
        { correctKeys: ["A", "B"] },
        { selectedKeys: ["A", "B"] },
        10,
      );
      const withExtra = engine.grade(
        "MULTI_CHOICE",
        { correctKeys: ["A", "B"] },
        { selectedKeys: ["A", "B", "C"] },
        10,
      );
      expect(withExtra.score).toBeLessThan(perfect.score);
    });
  });

  describe("填空题评分", () => {
    it("匹配任一可接受答案得满分", () => {
      const result = engine.grade(
        "FILL_IN",
        { acceptableAnswers: ["甲子", "甲子年"] },
        { text: "甲子" },
        10,
      );
      expect(result.score).toBe(10);
      expect(result.isCorrect).toBe(true);
    });

    it("不匹配得0分", () => {
      const result = engine.grade(
        "FILL_IN",
        { acceptableAnswers: ["正官", "正官格"] },
        { text: "七杀" },
        10,
      );
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it("忽略首尾空格和大小写", () => {
      const result = engine.grade(
        "FILL_IN",
        { acceptableAnswers: ["伤官"] },
        { text: " 伤官 " },
        10,
      );
      expect(result.score).toBe(10);
    });
  });

  describe("量表题评分", () => {
    it("在容差范围内得满分", () => {
      const result = engine.grade(
        "SCALE",
        { value: 5, tolerance: 1 },
        { value: 4 },
        10,
      );
      expect(result.score).toBe(10);
      expect(result.isCorrect).toBe(true);
    });

    it("超出容差按偏离度扣分", () => {
      const result = engine.grade(
        "SCALE",
        { value: 5, tolerance: 1 },
        { value: 8 },
        10,
      );
      expect(result.score).toBeLessThan(10);
    });

    it("使用默认容差", () => {
      const result = engine.grade(
        "SCALE",
        { value: 3 },
        { value: 3 },
        10,
      );
      expect(result.score).toBe(10);
    });
  });

  describe("主观题不自动评分", () => {
    it("案例分析题返回0分", () => {
      const result = engine.grade(
        "CASE_ANALYSIS",
        { rubric: "辨证准确+用药得当" },
        { text: "..." },
        20,
      );
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it("论述题返回0分", () => {
      const result = engine.grade(
        "ESSAY",
        { rubric: "..." },
        { text: "..." },
        30,
      );
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });
  });
});
