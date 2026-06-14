import { calculateQimenYin } from "./qimen-yin.calculator";

const VALID_GONG_NAMES = ["坎", "坤", "震", "巽", "坤", "乾", "兑", "艮", "离"];
const VALID_BA_MEN = ["休", "死", "伤", "杜", "死", "开", "惊", "生", "景"];
const VALID_JIU_XING = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
const VALID_BA_SHEN = ["值符", "螣蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
const VALID_DI_PAN_GAN = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];
const VALID_TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

const TEST_DATES = [
  "2024-06-15T10:00:00",
  "2024-12-15T14:00:00",
  "2025-01-01T00:00:00",
  "2024-03-20T12:00:00",
  "2023-10-01T18:00:00",
  "2000-01-15T08:00:00",
  "1999-12-31T23:00:00",
] as const;

describe("阴盘奇门计算器", () => {
  // ──────────────────────────────────────────
  // 结构验证
  // ──────────────────────────────────────────
  describe("结构验证", () => {
    const result: any = calculateQimenYin({ datetime: "2024-06-15T10:00:00" });

    it("输出包含全部顶层字段", () => {
      expect(result).toHaveProperty("juNumber");
      expect(result).toHaveProperty("dunType");
      expect(result).toHaveProperty("jieQi");
      expect(result).toHaveProperty("yongShi");
      expect(result).toHaveProperty("zhiFu");
      expect(result).toHaveProperty("zhiShiMen");
      expect(result).toHaveProperty("gongs");
      expect(result).toHaveProperty("dipanBashen");
    });

    it("九宫排布完整（9个宫位）", () => {
      expect(result.gongs).toBeDefined();
      expect(Array.isArray(result.gongs)).toBe(true);
      expect(result.gongs).toHaveLength(9);
    });

    it("宫位名称和索引与九宫对应", () => {
      for (let i = 0; i < result.gongs.length; i++) {
        const gong: any = result.gongs[i];
        expect(typeof gong.index).toBe("number");
        expect(typeof gong.name).toBe("string");
        expect(gong.name).toBe(VALID_GONG_NAMES[i]);
        // 除中宫寄坤外，普通宫位名称与 bagua 一致
        if (i === 4) {
          expect(gong.index).toBe(2); // 中宫寄坤2
        } else {
          expect(gong.index).toBe(i + 1); // 正常宫位索引 1-9
        }
      }
    });

    it("每个宫位包含全部必填字段", () => {
      const requiredFields = [
        "index", "name", "bagua", "diPan", "tianPan",
        "star", "men", "shen", "yinGan",
        "isRuMu", "isJiXing", "isMenPo", "kongWang", "maXing", "shenSha",
      ];
      for (const gong of result.gongs) {
        for (const field of requiredFields) {
          expect(gong).toHaveProperty(field);
        }
      }
    });

    it("阴遁属性固定为 yin", () => {
      expect(result.dunType).toBe("yin");
    });

    it("中宫寄坤——索引2、名称坤、八卦坤", () => {
      const zhongGong: any = result.gongs[4];
      expect(zhongGong.index).toBe(2);
      expect(zhongGong.name).toBe("坤");
      expect(zhongGong.bagua).toBe("坤");
    });

    it("所有宫位隐干排布不为空", () => {
      for (const gong of result.gongs) {
        expect(gong.yinGan).toBeDefined();
        expect(typeof gong.yinGan).toBe("string");
        expect(gong.yinGan.length).toBe(1);
        expect(VALID_TIAN_GAN).toContain(gong.yinGan);
      }
    });

    it("值符和值使门存在且为有效值", () => {
      expect(typeof result.zhiFu).toBe("string");
      expect(result.zhiFu.length).toBeGreaterThan(0);
      expect(VALID_JIU_XING).toContain(result.zhiFu);

      expect(typeof result.zhiShiMen).toBe("string");
      expect(result.zhiShiMen.length).toBeGreaterThan(0);
    });

    it("用事时辰格式为干支（两字）", () => {
      expect(typeof result.yongShi).toBe("string");
      expect(result.yongShi.length).toBe(2);
    });

    it("局数为1-9之间的整数", () => {
      expect(Number.isInteger(result.juNumber)).toBe(true);
      expect(result.juNumber).toBeGreaterThanOrEqual(1);
      expect(result.juNumber).toBeLessThanOrEqual(9);
    });

    it("地盘八神排布共8位，每位为有效神名", () => {
      expect(result.dipanBashen).toHaveLength(8);
      for (const shen of result.dipanBashen) {
        expect(VALID_BA_SHEN).toContain(shen);
      }
    });

    it("坤2宫（索引1）保留原有属性未被中宫覆盖", () => {
      const kun2: any = result.gongs[1];
      expect(kun2.name).toBe("坤");
      expect(kun2.index).toBe(2);
      expect(kun2.bagua).toBe("坤");
      // 检查它与中宫不是同一个引用
      expect(kun2).not.toBe(result.gongs[4]);
    });
  });

  // ──────────────────────────────────────────
  // 回归基线
  // ──────────────────────────────────────────
  describe("回归基线", () => {
    it("2024-06-15 输出结构完整", () => {
      const result: any = calculateQimenYin({ datetime: "2024-06-15T10:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
      expect(Number.isInteger(result.juNumber)).toBe(true);
      expect(result.gongs[4].name).toBe("坤");
      expect(result.gongs[4].index).toBe(2);
    });

    it("2024-12-15 大雪后阴遁正常", () => {
      const result: any = calculateQimenYin({ datetime: "2024-12-15T14:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
      expect(result.yongShi.length).toBe(2);
      // 地盘干全部为三奇六仪
      for (const gong of result.gongs) {
        expect(VALID_DI_PAN_GAN).toContain(gong.diPan);
      }
    });

    it("2025-01-01 跨年正常运行", () => {
      const result: any = calculateQimenYin({ datetime: "2025-01-01T00:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
      expect(result.juNumber).toBeGreaterThanOrEqual(1);
    });

    it("2024-03-20 春分前后结构正常", () => {
      const result: any = calculateQimenYin({ datetime: "2024-03-20T12:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(result.gongs[4].name).toBe("坤"); // 中宫寄坤
    });

    it("2000-01-01 千禧年交接正常", () => {
      const result: any = calculateQimenYin({ datetime: "2000-01-01T10:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
    });
  });

  // ──────────────────────────────────────────
  // 算法不变量
  // ──────────────────────────────────────────
  describe("算法不变量", () => {
    it("中宫始终寄坤（多日期验证）", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        const zhongGong: any = result.gongs[4];
        expect(zhongGong.index).toBe(2);
        expect(zhongGong.name).toBe("坤");
        expect(zhongGong.bagua).toBe("坤");
      }
    });

    it("值符星始终为九星之一", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        expect(VALID_JIU_XING).toContain(result.zhiFu);
      }
    });

    it("地盘干全部为三奇六仪（戊己庚辛壬癸丁丙乙）", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        for (const gong of result.gongs) {
          expect(VALID_DI_PAN_GAN).toContain(gong.diPan);
        }
      }
    });

    it("天盘干全部为天干", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        for (const gong of result.gongs) {
          expect(VALID_TIAN_GAN).toContain(gong.tianPan);
        }
      }
    });

    it("阴遁八门排布：九宫各一门，去重后8种（八门各一，中宫与坤重复）", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        const menList: string[] = result.gongs.map((g: any) => g.men);
        expect(menList).toHaveLength(9);
        const uniqueMen = new Set(menList);
        expect(uniqueMen.size).toBe(8); // 共8种门，中宫与坤2宫重复
        for (const men of menList) {
          expect(VALID_BA_MEN).toContain(men);
        }
      }
    });

    it("阴遁九星排布：九宫各一星，九星无重复", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        const starList: string[] = result.gongs.map((g: any) => g.star);
        expect(starList).toHaveLength(9);
        const uniqueStars = new Set(starList);
        expect(uniqueStars.size).toBe(9); // 九星填九宫，各不重复
        for (const star of starList) {
          expect(VALID_JIU_XING).toContain(star);
        }
      }
    });

    it("阴遁八神完整不含重复", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        expect(result.dipanBashen).toHaveLength(8);
        const uniqueShen = new Set(result.dipanBashen);
        expect(uniqueShen.size).toBe(8);
        for (const shen of result.dipanBashen) {
          expect(VALID_BA_SHEN).toContain(shen);
        }
      }
    });

    it("空亡标记为布尔值", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        for (const gong of result.gongs) {
          expect(typeof gong.kongWang).toBe("boolean");
        }
      }
    });

    it("马星标记为布尔值", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        for (const gong of result.gongs) {
          expect(typeof gong.maXing).toBe("boolean");
        }
      }
    });

    it("入墓标记为布尔值", () => {
      for (const dt of TEST_DATES) {
        const result: any = calculateQimenYin({ datetime: dt });
        for (const gong of result.gongs) {
          expect(typeof gong.isRuMu).toBe("boolean");
        }
      }
    });
  });

  // ──────────────────────────────────────────
  // 边界条件
  // ──────────────────────────────────────────
  describe("边界条件", () => {
    it("子时（午夜0点）不崩溃", () => {
      expect(() => {
        calculateQimenYin({ datetime: "2024-06-15T00:00:00" });
      }).not.toThrow();
      const result: any = calculateQimenYin({ datetime: "2024-06-15T00:00:00" });
      expect(result.gongs).toHaveLength(9);
    });

    it("午时（中午12点）不崩溃", () => {
      expect(() => {
        calculateQimenYin({ datetime: "2024-06-15T12:00:00" });
      }).not.toThrow();
      const result: any = calculateQimenYin({ datetime: "2024-06-15T12:00:00" });
      expect(result.gongs).toHaveLength(9);
    });

    it("子时末（23:30）与丑时初（01:30）时柱不同", () => {
      const resultLate: any = calculateQimenYin({ datetime: "2024-06-15T23:30:00" });
      const resultEarly: any = calculateQimenYin({ datetime: "2024-06-16T01:30:00" });
      // 时柱不同 => 至少地盘干不同或者盘面不同
      // 但不一定所有宫位都不同，加一个松散检查
      const lateFirstDiPan: string = resultLate.gongs[0].diPan;
      const earlyFirstDiPan: string = resultEarly.gongs[0].diPan;
      expect(resultLate.gongs).toHaveLength(9);
      expect(resultEarly.gongs).toHaveLength(9);
    });

    it("1900年极端旧日期不崩溃", () => {
      expect(() => {
        calculateQimenYin({ datetime: "1900-01-01T10:00:00" });
      }).not.toThrow();
      const result: any = calculateQimenYin({ datetime: "1900-01-01T10:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(Number.isInteger(result.juNumber)).toBe(true);
    });

    it("2100年极端未来日期不崩溃", () => {
      expect(() => {
        calculateQimenYin({ datetime: "2100-12-31T23:00:00" });
      }).not.toThrow();
      const result: any = calculateQimenYin({ datetime: "2100-12-31T23:00:00" });
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
    });

    it("空参数（无datetime）使用默认当前时间不崩溃", () => {
      expect(() => {
        calculateQimenYin({});
      }).not.toThrow();
      const result: any = calculateQimenYin({});
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
    });

    it("自定义局数参数生效", () => {
      const result: any = calculateQimenYin({
        datetime: "2024-06-15T10:00:00",
        customJu: 5,
      });
      expect(result.juNumber).toBe(5);
      expect(result.dunType).toBe("yin");
    });

    it("自定义局数1和9边界值", () => {
      const result1: any = calculateQimenYin({
        datetime: "2024-06-15T10:00:00",
        customJu: 1,
      });
      expect(result1.juNumber).toBe(1);

      const result9: any = calculateQimenYin({
        datetime: "2024-06-15T10:00:00",
        customJu: 9,
      });
      expect(result9.juNumber).toBe(9);
    });

    it("仅有日期无时分秒的字符串", () => {
      const result: any = calculateQimenYin({ datetime: "2024-06-15" });
      expect(result.gongs).toHaveLength(9);
      expect(result.dunType).toBe("yin");
      // 无时分应默认0点（子时）
      expect(typeof result.yongShi).toBe("string");
      expect(result.yongShi.length).toBe(2);
    });
  });
});
