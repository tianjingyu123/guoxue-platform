import { calculateZhuGe } from "./zhuge.calculator";

describe("诸葛神数计算器", () => {
  describe("结构验证", () => {
    it("三字起数返回完整结构", () => {
      const r: any = calculateZhuGe({ method: "sanzi", chars: "天地人", numbers: null, question: "问前程" });
      expect(r.qiShuProcess).toBeDefined();
      expect(r.qianWen).toBeDefined();
      expect(r.jieQian).toBeDefined();
      expect(r.duanYu).toBeTruthy();
    });

    it("数字起数返回完整结构", () => {
      const r: any = calculateZhuGe({ method: "number", chars: null, numbers: [100, 200, 300], question: "问财运" });
      expect(r.qiShuProcess).toBeDefined();
      expect(r.qianWen).toBeDefined();
      expect(r.duanYu).toBeTruthy();
    });

    it("签文结构含签号/文本/类型/卦", () => {
      const r: any = calculateZhuGe({ method: "sanzi", chars: "天地人", numbers: null, question: "问前程" });
      expect(r.qianWen.number).toBeGreaterThanOrEqual(1);
      expect(r.qianWen.number).toBeLessThanOrEqual(384);
      expect(r.qianWen.text).toBeTruthy();
      expect(r.qianWen.type).toBeTruthy();
      expect(r.qianWen.gua).toBeTruthy();
    });
  });

  describe("笔画计算验证", () => {
    it("天地人 = 4+6+2 = 12，签号12", () => {
      const r: any = calculateZhuGe({ method: "sanzi", chars: "天地人", numbers: null, question: "测试" });
      expect(r.qiShuProcess.strokes).toEqual([4, 6, 2]);
      expect(r.qiShuProcess.totalSum).toBe(12);
      expect(r.qiShuProcess.finalNumber).toBe(12);
      expect(r.qianWen.number).toBe(12);
    });

    it("笔画总和超过384取余", () => {
      const r: any = calculateZhuGe({ method: "sanzi", chars: "鑫鑫鑫", numbers: null, question: "测试" });
      expect(r.qiShuProcess.finalNumber).toBeGreaterThanOrEqual(1);
      expect(r.qiShuProcess.finalNumber).toBeLessThanOrEqual(384);
    });

    it("数字模式正确求和", () => {
      const r: any = calculateZhuGe({ method: "number", chars: null, numbers: [100, 200, 300], question: "测试" });
      expect(r.qiShuProcess.totalSum).toBeGreaterThan(0);
      expect(r.qiShuProcess.finalNumber).toBeGreaterThanOrEqual(1);
      expect(r.qiShuProcess.finalNumber).toBeLessThanOrEqual(384);
      expect(r.qiShuProcess.strokes).toHaveLength(3);
    });
  });

  describe("384签覆盖", () => {
    it("签号范围始终在1-384", () => {
      const testCases = ["一二三", "天地人", "日月星", "大中小", "上下左"];
      for (const chars of testCases) {
        const r: any = calculateZhuGe({ method: "sanzi", chars, numbers: null, question: "测试" });
        expect(r.qianWen.number).toBeGreaterThanOrEqual(1);
        expect(r.qianWen.number).toBeLessThanOrEqual(384);
      }
    });
  });

  describe("边界条件", () => {
    it("单字输入不崩溃", () => {
      expect(() => calculateZhuGe({ method: "sanzi", chars: "一", numbers: null, question: "测试" })).not.toThrow();
    });

    it("超长字符串不崩溃", () => {
      expect(() => calculateZhuGe({ method: "sanzi", chars: "测试测试测试测试测试", numbers: null, question: "测试" })).not.toThrow();
    });

    it("数字为0不崩溃", () => {
      expect(() => calculateZhuGe({ method: "number", chars: null, numbers: [0, 0, 1], question: "测试" })).not.toThrow();
    });
  });
});
