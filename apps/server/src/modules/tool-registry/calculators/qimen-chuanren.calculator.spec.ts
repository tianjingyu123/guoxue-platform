import { calculateQimenChuanren } from "./qimen-chuanren.calculator";

describe("奇门穿壬计算器", () => {
  const baseInput = {
    datetime: "2024-06-15T10:00:00", method: "zhuanpan",
    qiJuMethod: "chaibu", trueSolar: false, birthYear: 1996, gender: "男",
  };

  describe("结构验证", () => {
    it("返回奇门/六壬/穿壬三层结构", () => {
      const r: any = calculateQimenChuanren(baseInput);
      expect(r.qimen).toBeDefined();
      expect(r.liuren).toBeDefined();
      expect(r.chuanren).toBeDefined();
      expect(r.duanYu).toBeTruthy();
    });

    it("穿壬层含72局信息", () => {
      const r: any = calculateQimenChuanren(baseInput);
      expect(r.chuanren.ju72Index).toBeGreaterThanOrEqual(1);
      expect(r.chuanren.ju72Index).toBeLessThanOrEqual(72);
      expect(r.chuanren.ju72Name).toBeTruthy();
      expect(r.chuanren.ju72JiXiong).toBeTruthy();
    });

    it("奇门层有九宫数据", () => {
      const r: any = calculateQimenChuanren(baseInput);
      expect(r.qimen.gongs).toBeDefined();
      expect(r.qimen.gongs).toHaveLength(9);
    });

    it("六壬层有四课三传", () => {
      const r: any = calculateQimenChuanren(baseInput);
      expect(r.liuren.siKe).toBeDefined();
      expect(r.liuren.sanChuan).toBeDefined();
    });
  });

  describe("拆补法/置闰法切换", () => {
    it("两种起局法均可计算", () => {
      const r1: any = calculateQimenChuanren({ ...baseInput, qiJuMethod: "chaibu" });
      const r2: any = calculateQimenChuanren({ ...baseInput, qiJuMethod: "zhirun" });
      expect(r1.qimen.gongs).toHaveLength(9);
      expect(r2.qimen.gongs).toHaveLength(9);
    });
  });

  describe("时间变化", () => {
    it("不同时辰72局编号可能不同", () => {
      const r1: any = calculateQimenChuanren({ ...baseInput, datetime: "2024-06-15T06:00:00" });
      const r2: any = calculateQimenChuanren({ ...baseInput, datetime: "2024-06-15T14:00:00" });
      expect(r1.chuanren.ju72Index).toBeGreaterThanOrEqual(1);
      expect(r2.chuanren.ju72Index).toBeGreaterThanOrEqual(1);
    });

    it("四季均可正常计算", () => {
      const dates = ["2024-01-15T10:00:00", "2024-04-15T10:00:00", "2024-07-15T10:00:00", "2024-10-15T10:00:00"];
      for (const dt of dates) {
        const r: any = calculateQimenChuanren({ ...baseInput, datetime: dt });
        expect(r.chuanren.ju72Index).toBeGreaterThanOrEqual(1);
        expect(r.chuanren.ju72Index).toBeLessThanOrEqual(72);
      }
    });
  });

  describe("边界条件", () => {
    it("子时边缘不崩溃", () => {
      expect(() => calculateQimenChuanren({ ...baseInput, datetime: "2024-06-15T23:30:00" })).not.toThrow();
    });

    it("不同性别不崩溃", () => {
      const female: any = calculateQimenChuanren({ ...baseInput, gender: "女" });
      expect(female.chuanren).toBeDefined();
    });

    it("极端出生年份不崩溃", () => {
      expect(() => calculateQimenChuanren({ ...baseInput, birthYear: 1950 })).not.toThrow();
      expect(() => calculateQimenChuanren({ ...baseInput, birthYear: 2010 })).not.toThrow();
    });
  });
});
