import { calculateCompanyNaming } from "./company-naming.calculator";

describe("公司起名计算器", () => {
  const baseInput = {
    industry: "科技", city: "北京", companyForm: "有限公司",
    style: "现代", ziHaoLength: 3, keywords: ["智", "创"],
  };

  describe("结构验证", () => {
    it("返回候选名称列表+行业分析+通用建议", () => {
      const r: any = calculateCompanyNaming(baseInput);
      expect(r.proposals).toBeDefined();
      expect(r.proposals.length).toBeGreaterThan(0);
      expect(r.industryAnalysis).toBeDefined();
      expect(r.generalAdvice).toBeDefined();
    });

    it("每个候选名包含评分和验证信息", () => {
      const r: any = calculateCompanyNaming(baseInput);
      for (const p of r.proposals) {
        expect(p.name).toBeTruthy();
        expect(p.totalScore).toBeGreaterThanOrEqual(0);
        expect(p.totalScore).toBeLessThanOrEqual(100);
        expect(p.wuXing).toBeTruthy();
        expect(p.reason).toBeTruthy();
      }
    });

    it("行业分析包含五行/字号模式/命名建议", () => {
      const r: any = calculateCompanyNaming(baseInput);
      expect(r.industryAnalysis.industry).toBe("科技");
      expect(r.industryAnalysis.wuXing).toBeTruthy();
      expect(r.industryAnalysis.namingTips).toBeTruthy();
    });
  });

  describe("多行业覆盖", () => {
    const industries = ["科技", "文化", "贸易", "教育", "金融"];
    for (const industry of industries) {
      it(`${industry}行业可正常产出名称`, () => {
        const r: any = calculateCompanyNaming({ ...baseInput, industry });
        expect(r.proposals.length).toBeGreaterThan(0);
        expect(r.industryAnalysis.industry).toBe(industry);
      });
    }
  });

  describe("字号长度控制", () => {
    it("指定2字产出字号长度正确", () => {
      const r: any = calculateCompanyNaming({ ...baseInput, ziHaoLength: 2 });
      for (const p of r.proposals) {
        expect(p.name.ziHao.length).toBe(2);
      }
    });

    it("指定4字产出字号长度正确", () => {
      const r: any = calculateCompanyNaming({ ...baseInput, ziHaoLength: 4 });
      for (const p of r.proposals) {
        expect(p.name.ziHao.length).toBe(4);
      }
    });
  });

  describe("评分排序", () => {
    it("候选名按总分降序排列", () => {
      const r: any = calculateCompanyNaming(baseInput);
      for (let i = 1; i < r.proposals.length; i++) {
        expect(r.proposals[i - 1].totalScore).toBeGreaterThanOrEqual(r.proposals[i].totalScore);
      }
    });
  });

  describe("边界条件", () => {
    it("无关键词不崩溃", () => {
      expect(() => calculateCompanyNaming({ ...baseInput, keywords: [] })).not.toThrow();
    });

    it("风格为古典不崩溃", () => {
      const r: any = calculateCompanyNaming({ ...baseInput, style: "古典" });
      expect(r.proposals.length).toBeGreaterThan(0);
    });
  });
});
