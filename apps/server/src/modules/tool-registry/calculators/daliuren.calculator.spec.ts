import { calculateDaLiuRen } from "./daliuren.calculator";

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ZONG_MEN_NAMES = ["贼克","比用","涉害","遥克","昴星","别责","八专","返吟","伏吟"];

describe("大六壬计算器", () => {
  // ── 结构完整性 ──
  describe("结构验证", () => {
    const result: any = calculateDaLiuRen({ datetime: "2024-06-15T10:00:00" });

    it("四课结构完整", () => {
      expect(result.siKe).toHaveLength(4);
      for (const ke of result.siKe) {
        expect(ke.index).toBeGreaterThanOrEqual(1);
        expect(ke.index).toBeLessThanOrEqual(4);
        expect(DI_ZHI).toContain(ke.xiaZhi);
        expect(DI_ZHI).toContain(ke.shangZhi);
        expect(ke.description).toBeTruthy();
      }
    });

    it("三传结构完整 + 宗门名称有效", () => {
      expect(result.sanChuan).toBeDefined();
      expect(DI_ZHI).toContain(result.sanChuan.chu.zhi);
      expect(DI_ZHI).toContain(result.sanChuan.zhong.zhi);
      expect(DI_ZHI).toContain(result.sanChuan.mo.zhi);
      expect(ZONG_MEN_NAMES).toContain(result.sanChuan.zongMen);
    });

    it("十二宫地盘天盘完整", () => {
      expect(result.gongs).toHaveLength(12);
      for (const gong of result.gongs) {
        expect(DI_ZHI).toContain(gong.zhi);
        expect(DI_ZHI).toContain(gong.tianPan);
      }
    });

    it("天将排布有效", () => {
      expect(result.tianJiangLayout).toHaveLength(12);
      for (const tj of result.tianJiangLayout) {
        expect(DI_ZHI).toContain(tj.zhi);
        expect(tj.tianJiang).toBeTruthy();
      }
    });

    it("空亡/年命/遁干/六亲表存在", () => {
      expect(result.kongWang).toBeDefined();
      expect(result.nianMing).toBeDefined();
      expect(result.dunGanTable).toBeDefined();
      expect(result.liuQinTable).toBeDefined();
    });
  });

  // ── 回归基准点 ──
  describe("回归基线（已确认结果）", () => {
    it("2024-06-15T10:00 — 伏吟课，三传 申→寅→巳", () => {
      const r: any = calculateDaLiuRen({ datetime: "2024-06-15T10:00:00" });
      expect(r.sanChuan.zongMen).toBe("伏吟");
      expect(r.sanChuan.chu.zhi).toBe("申");
      expect(r.sanChuan.zhong.zhi).toBe("寅");
      expect(r.sanChuan.mo.zhi).toBe("巳");
    });

    it("2024-01-15T08:00 — 贼克课，三传 戌→午→寅", () => {
      const r: any = calculateDaLiuRen({ datetime: "2024-01-15T08:00:00" });
      expect(r.sanChuan.zongMen).toBe("贼克");
      expect(r.sanChuan.chu.zhi).toBe("戌");
      expect(r.sanChuan.zhong.zhi).toBe("午");
      expect(r.sanChuan.mo.zhi).toBe("寅");
    });

    it("2024-01-15 四课结构一致", () => {
      const r: any = calculateDaLiuRen({ datetime: "2024-01-15T08:00:00" });
      expect(r.siKe[0]).toMatchObject({ index: 1, xiaZhi: "巳", shangZhi: "丑" });
      expect(r.siKe[2]).toMatchObject({ index: 3, xiaZhi: "寅", shangZhi: "戌" });
    });
  });

  // ── 算法不变量 ──
  describe("算法不变量", () => {
    it("天盘为地支的某种排列（12个不重复）", () => {
      const r: any = calculateDaLiuRen({ datetime: "2024-09-01T12:00:00" });
      const tianPanZhis = r.gongs.map((g: any) => g.tianPan);
      expect(new Set(tianPanZhis).size).toBe(12);
      for (const z of tianPanZhis) {
        expect(DI_ZHI).toContain(z);
      }
    });

    it("四课上神必须来自天盘", () => {
      const dates = ["2024-01-01T06:00:00", "2024-06-01T18:00:00", "2024-12-01T22:00:00"];
      for (const dt of dates) {
        const r: any = calculateDaLiuRen({ datetime: dt });
        const tianPanSet = new Set(r.gongs.map((g: any) => g.tianPan));
        for (const ke of r.siKe) {
          expect(tianPanSet.has(ke.shangZhi)).toBe(true);
        }
      }
    });

    it("三传初传必须是十二地支之一", () => {
      const dates = ["2000-01-01T00:00:00", "2010-06-15T12:00:00", "2030-12-31T23:00:00"];
      for (const dt of dates) {
        const r: any = calculateDaLiuRen({ datetime: dt });
        expect(DI_ZHI).toContain(r.sanChuan.chu.zhi);
        expect(DI_ZHI).toContain(r.sanChuan.zhong.zhi);
        expect(DI_ZHI).toContain(r.sanChuan.mo.zhi);
      }
    });
  });

  // ── 边界条件 ──
  describe("边界条件", () => {
    it("子时 (23:30) 不崩溃", () => {
      expect(() => calculateDaLiuRen({ datetime: "2024-06-15T23:30:00" })).not.toThrow();
    });

    it("午时正 (12:00) 不崩溃", () => {
      const r: any = calculateDaLiuRen({ datetime: "2024-06-15T12:00:00" });
      expect(r.sanChuan).toBeDefined();
    });

    it("极端年份不崩溃", () => {
      expect(() => calculateDaLiuRen({ datetime: "1900-01-01T12:00:00" })).not.toThrow();
      expect(() => calculateDaLiuRen({ datetime: "2100-12-31T12:00:00" })).not.toThrow();
    });

    it("闰日 2024-02-29 正常计算", () => {
      const r: any = calculateDaLiuRen({ datetime: "2024-02-29T10:00:00" });
      expect(r.siKe).toHaveLength(4);
      expect(r.sanChuan.chu.zhi).toBeTruthy();
    });
  });

  // ── 九宗门覆盖 ──
  describe("九宗门多样性", () => {
    it("连续30天至少出现3种不同宗门", () => {
      const zongMenSet = new Set<string>();
      for (let day = 1; day <= 30; day++) {
        const dt = `2024-06-${String(day).padStart(2, "0")}T10:00:00`;
        const r: any = calculateDaLiuRen({ datetime: dt });
        zongMenSet.add(r.sanChuan.zongMen);
      }
      expect(zongMenSet.size).toBeGreaterThanOrEqual(3);
    });
  });
});
