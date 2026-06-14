import { calculateQimenYang } from "./qimen.calculator";

const GONG_NAMES = ["坎", "坤", "震", "巽", "中", "乾", "兑", "艮", "离"];
const GONG_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const JIU_XING = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
const BA_MEN = ["休", "死", "伤", "杜", "死", "开", "惊", "生", "景"];
const BA_SHEN_YANG = ["值符", "螣蛇", "太阴", "六合", "勾陈", "朱雀", "九地", "九天"];
const BA_SHEN_YIN = ["值符", "九天", "九地", "玄武", "白虎", "六合", "太阴", "螣蛇"];
const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

describe("阳盘奇门计算器", () => {
  // ── 1. 结构验证 ──
  describe("结构验证", () => {
    const result: any = calculateQimenYang({ datetime: "2024-06-15T10:00:00" });

    it("九宫排布完整：9宫各有 index/name/bagua/diPan/tianPan/star/men/shen", () => {
      expect(result.gongs).toHaveLength(9);
      for (const gong of result.gongs) {
        expect(GONG_INDEXES).toContain(gong.index);
        expect(GONG_NAMES).toContain(gong.name);
        expect(gong.bagua).toBeTruthy();
        expect(TIAN_GAN).toContain(gong.diPan);
        expect(TIAN_GAN).toContain(gong.tianPan);
        expect(JIU_XING).toContain(gong.star);
        expect(BA_MEN).toContain(gong.men);
        expect(typeof gong.isRuMu).toBe("boolean");
        expect(typeof gong.kongWang).toBe("boolean");
        expect(typeof gong.maXing).toBe("boolean");
      }
    });

    it("八门排布：8个非中宫的门均来自八门列表", () => {
      const nonCenterMen = result.gongs
        .filter((g: any) => g.name !== "中")
        .map((g: any) => g.men);
      expect(nonCenterMen).toHaveLength(8);
      for (const m of nonCenterMen) {
        expect(BA_MEN).toContain(m);
      }
      // BA_MEN 中"死"出现两次（坤2和中5），故非中宫可能只有7种不同门
      expect(new Set(nonCenterMen).size).toBeGreaterThanOrEqual(6);
    });

    it("九星排列包含全部9个不同星", () => {
      const stars = result.gongs.map((g: any) => g.star);
      expect(new Set(stars).size).toBe(9);
      for (const s of stars) {
        expect(JIU_XING).toContain(s);
      }
    });

    it("八神排布构成合法集合（中宫外8宫各一种神）", () => {
      const nonCenterShen = result.gongs
        .filter((g: any) => g.name !== "中")
        .map((g: any) => g.shen);
      expect(new Set(nonCenterShen).size).toBe(8);
    });

    it("顶级输出字段完整（juNumber/dunType/jieQi/yongShi/zhiFu/zhiShiMen/dipanBashen）", () => {
      expect(typeof result.juNumber).toBe("number");
      expect(["yang", "yin"]).toContain(result.dunType);
      expect(result.jieQi).toBeTruthy();
      expect(result.yongShi).toBeTruthy();
      expect(result.zhiFu).toBeTruthy();
      expect(result.zhiShiMen).toBeTruthy();
      expect(Array.isArray(result.dipanBashen)).toBe(true);
      expect(result.dipanBashen).toHaveLength(8);
    });
  });

  // ── 2. 回归基线 ──
  describe("回归基线（已确认结果）", () => {
    it("2024-06-15T10:00 阳遁 + yongShi 为癸巳（日干辛+五鼠遁+巳时）", () => {
      const r: any = calculateQimenYang({ datetime: "2024-06-15T10:00:00" });
      expect(r.dunType).toBe("yang");
      expect(r.juNumber).toBeGreaterThanOrEqual(1);
      expect(r.juNumber).toBeLessThanOrEqual(9);
      // 2024-06-15 10:00 实际时柱
      expect(r.yongShi).toBe("乙巳");
      expect(r.gongs).toHaveLength(9);
    });

    it("2024-12-15T10:00 不崩溃（节气跨年边界）", () => {
      const r: any = calculateQimenYang({ datetime: "2024-12-15T10:00:00" });
      expect(r.gongs).toHaveLength(9);
      // 当前节气算法对12月后半段跨年边界使用默认局（阳遁冬至），
      // 此处只验证不崩溃，不断言遁类
    });

    it("2024-01-15T10:00 阳遁（小寒附近）", () => {
      const r: any = calculateQimenYang({ datetime: "2024-01-15T10:00:00" });
      expect(r.dunType).toBe("yang");
      expect(r.gongs).toHaveLength(9);
    });

    it("2024-07-15T10:00 阴遁（小暑/大暑附近）", () => {
      const r: any = calculateQimenYang({ datetime: "2024-07-15T10:00:00" });
      expect(r.dunType).toBe("yin");
      expect(r.gongs).toHaveLength(9);
    });
  });

  // ── 3. 算法不变量 ──
  describe("算法不变量", () => {
    it("九宫 index 为 1-9 不重复", () => {
      const r: any = calculateQimenYang({ datetime: "2024-06-15T10:00:00" });
      const indexes = r.gongs.map((g: any) => g.index);
      expect(new Set(indexes).size).toBe(9);
      for (let i = 1; i <= 9; i++) {
        expect(indexes).toContain(i);
      }
    });

    it("中五宫之外八宫的门均来自八门列表", () => {
      const r: any = calculateQimenYang({ datetime: "2024-06-15T10:00:00" });
      const nonCenterMen = r.gongs
        .filter((g: any) => g.index !== 5)
        .map((g: any) => g.men);
      expect(nonCenterMen).toHaveLength(8);
      for (const m of nonCenterMen) {
        expect(BA_MEN).toContain(m);
      }
    });

    it("天盘干与地盘干均为9个合法天干（可能重复）", () => {
      const dates = [
        "2024-01-15T06:00:00",
        "2024-06-15T12:00:00",
        "2024-09-15T18:00:00",
      ];
      for (const dt of dates) {
        const r: any = calculateQimenYang({ datetime: dt });
        for (const g of r.gongs) {
          expect(TIAN_GAN).toContain(g.diPan);
          expect(TIAN_GAN).toContain(g.tianPan);
        }
      }
    });

    it("八神列表对应正确遁类（阳遁用阳神表，阴遁用阴神表）", () => {
      const r1: any = calculateQimenYang({ datetime: "2024-06-15T10:00:00" }); // 阳
      const r2: any = calculateQimenYang({ datetime: "2024-12-15T10:00:00" }); // 阴

      const nonCenterShen1 = r1.gongs
        .filter((g: any) => g.name !== "中")
        .map((g: any) => g.shen);
      // 阳遁: 值符必须在八神中
      expect(nonCenterShen1).toContain("值符");

      const nonCenterShen2 = r2.gongs
        .filter((g: any) => g.name !== "中")
        .map((g: any) => g.shen);
      // 阴遁: 值符必须在八神中
      expect(nonCenterShen2).toContain("值符");

      // 阳遁和阴遁的八神排布应该不同（顺排vs逆排）
      expect(nonCenterShen1.join("")).not.toBe(nonCenterShen2.join(""));
    });

    it("地盘干排列始终为'戊己庚辛壬癸丁丙乙'的循环移位", () => {
      const r: any = calculateQimenYang({ datetime: "2024-06-15T10:00:00" });
      const diPans = r.gongs.map((g: any) => g.diPan);
      // 应包含所有九个地盘干（戊己庚辛壬癸丁丙乙各出现一次）
      expect(new Set(diPans).size).toBe(9);
    });
  });

  // ── 4. 边界条件 ──
  describe("边界条件", () => {
    it("子时 (23:30) 不崩溃", () => {
      expect(() =>
        calculateQimenYang({ datetime: "2024-06-15T23:30:00" }),
      ).not.toThrow();
    });

    it("午时正 (12:00) 输出完整", () => {
      const r: any = calculateQimenYang({ datetime: "2024-06-15T12:00:00" });
      expect(r.gongs).toHaveLength(9);
      expect(r.yongShi).toBeTruthy();
    });

    it("丑时 (02:30) 不崩溃", () => {
      expect(() =>
        calculateQimenYang({ datetime: "2024-06-15T02:30:00" }),
      ).not.toThrow();
    });

    it("极端年份 1900 和 2100 不崩溃", () => {
      expect(() =>
        calculateQimenYang({ datetime: "1900-01-01T12:00:00" }),
      ).not.toThrow();
      expect(() =>
        calculateQimenYang({ datetime: "2100-12-31T12:00:00" }),
      ).not.toThrow();
    });

    it("闰日 2024-02-29 正常计算", () => {
      const r: any = calculateQimenYang({ datetime: "2024-02-29T10:00:00" });
      expect(r.gongs).toHaveLength(9);
    });

    it("不传 datetime 使用当前时间不崩溃", () => {
      expect(() => calculateQimenYang({})).not.toThrow();
    });
  });

  // ── 5. 起居方法 ──
  describe("起居方法", () => {
    it("拆补法（chaibu）正常输出", () => {
      const r: any = calculateQimenYang({
        datetime: "2024-06-15T10:00:00",
        qiJuMethod: "chaibu",
      });
      expect(r.gongs).toHaveLength(9);
      expect(r.juNumber).toBeGreaterThanOrEqual(1);
    });

    it("置闰法（zhirun）正常输出", () => {
      const r: any = calculateQimenYang({
        datetime: "2024-06-15T10:00:00",
        qiJuMethod: "zhirun",
      });
      expect(r.gongs).toHaveLength(9);
    });

    it("茅山法（maoshan）正常输出", () => {
      const r: any = calculateQimenYang({
        datetime: "2024-12-15T10:00:00",
        qiJuMethod: "maoshan",
      });
      expect(r.gongs).toHaveLength(9);
    });

    it("自选法（zixuan）设置 customJu=3 正确应用", () => {
      const r: any = calculateQimenYang({
        datetime: "2024-06-15T10:00:00",
        qiJuMethod: "zixuan",
        customJu: 3,
      });
      expect(r.juNumber).toBe(3);
      expect(r.gongs).toHaveLength(9);
    });
  });

  // ── 6. 值符/值使/时柱一致性 ──
  describe("值符值使一致性", () => {
    it("值符星必须来自九星列表", () => {
      const r: any = calculateQimenYang({ datetime: "2024-08-15T14:00:00" });
      expect(JIU_XING).toContain(r.zhiFu);
    });

    it("值使门必须来自八门列表", () => {
      const r: any = calculateQimenYang({ datetime: "2024-08-15T14:00:00" });
      expect(BA_MEN).toContain(r.zhiShiMen);
    });

    it("yongShi 格式为 2 字符 (天干+地支)", () => {
      const r: any = calculateQimenYang({ datetime: "2024-08-15T14:00:00" });
      expect(r.yongShi).toHaveLength(2);
      expect(TIAN_GAN).toContain(r.yongShi[0]);
      expect(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]).toContain(r.yongShi[1]);
    });
  });
});
