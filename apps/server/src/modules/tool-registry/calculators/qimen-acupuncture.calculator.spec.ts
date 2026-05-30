import { calculateQiMenAcupuncture } from "./qimen-acupuncture.calculator";

describe("奇门针灸计算器", () => {
  const baseInput = { datetime: "2024-06-15T10:00:00", chiefComplaint: "头痛", targetBodyPart: "头部" };

  describe("结构验证", () => {
    it("返回盘面信息+治疗方案+断语", () => {
      const r: any = calculateQiMenAcupuncture(baseInput);
      expect(r.panInfo).toBeDefined();
      expect(r.treatmentPlan).toBeDefined();
      expect(r.duanYu).toBeTruthy();
    });

    it("盘面信息含局数/遁类型/用时/值符/值使门", () => {
      const r: any = calculateQiMenAcupuncture(baseInput);
      expect(r.panInfo.juNumber).toBeGreaterThanOrEqual(1);
      expect(r.panInfo.juNumber).toBeLessThanOrEqual(9);
      expect(r.panInfo.dunType).toBeTruthy();
      expect(r.panInfo.yongShi).toBeTruthy();
      expect(r.panInfo.ziFu).toBeTruthy();
      expect(r.panInfo.zhiShiMen).toBeTruthy();
    });

    it("治疗方案含主穴+辅穴+疗程建议", () => {
      const r: any = calculateQiMenAcupuncture(baseInput);
      expect(r.treatmentPlan.mainPoints).toBeDefined();
      expect(r.treatmentPlan.auxiliaryPoints).toBeDefined();
      expect(r.treatmentPlan.courseSuggestion).toBeTruthy();
    });
  });

  describe("不同症状覆盖", () => {
    const symptoms = [
      { chiefComplaint: "头痛", targetBodyPart: "头部" },
      { chiefComplaint: "腰痛", targetBodyPart: "腰部" },
      { chiefComplaint: "失眠", targetBodyPart: "头部" },
      { chiefComplaint: "胃痛", targetBodyPart: "腹部" },
    ];

    for (const s of symptoms) {
      it(`${s.chiefComplaint}/${s.targetBodyPart} 可正常出方`, () => {
        const r: any = calculateQiMenAcupuncture({ datetime: "2024-06-15T10:00:00", ...s });
        expect(r.treatmentPlan.mainPoints).toBeDefined();
        expect(r.duanYu).toBeTruthy();
      });
    }
  });

  describe("时间变化验证", () => {
    it("不同时辰均返回有效局数", () => {
      const r1: any = calculateQiMenAcupuncture({ ...baseInput, datetime: "2024-06-15T06:00:00" });
      const r2: any = calculateQiMenAcupuncture({ ...baseInput, datetime: "2024-06-15T14:00:00" });
      expect(r1.panInfo.juNumber).toBeGreaterThanOrEqual(1);
      expect(r1.panInfo.juNumber).toBeLessThanOrEqual(9);
      expect(r2.panInfo.juNumber).toBeGreaterThanOrEqual(1);
      expect(r2.panInfo.juNumber).toBeLessThanOrEqual(9);
    });

    it("dunType字段非空", () => {
      const winter: any = calculateQiMenAcupuncture({ ...baseInput, datetime: "2024-01-15T10:00:00" });
      const summer: any = calculateQiMenAcupuncture({ ...baseInput, datetime: "2024-07-15T10:00:00" });
      expect(winter.panInfo.dunType).toBeTruthy();
      expect(summer.panInfo.dunType).toBeTruthy();
    });
  });

  describe("边界条件", () => {
    it("子时边缘不崩溃", () => {
      expect(() => calculateQiMenAcupuncture({ ...baseInput, datetime: "2024-06-15T23:30:00" })).not.toThrow();
    });

    it("极端年份不崩溃", () => {
      expect(() => calculateQiMenAcupuncture({ ...baseInput, datetime: "1990-01-01T12:00:00" })).not.toThrow();
      expect(() => calculateQiMenAcupuncture({ ...baseInput, datetime: "2050-12-31T12:00:00" })).not.toThrow();
    });
  });
});
