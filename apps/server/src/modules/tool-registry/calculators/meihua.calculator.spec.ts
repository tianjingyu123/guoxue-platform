import { calculateMeiHua } from "./meihua.calculator";

// ── 局部拷贝内部映射，用亍不变量验证 ──
const NUM_YAO_MAP: Record<number, number[]> = {
  1: [1, 1, 1], 2: [0, 1, 1], 3: [1, 0, 1], 4: [0, 0, 1],
  5: [1, 1, 0], 6: [0, 1, 0], 7: [1, 0, 0], 8: [0, 0, 0],
};
const YAO_NUM_MAP: Record<string, number> = {
  "111": 1, "011": 2, "101": 3, "001": 4,
  "110": 5, "010": 6, "100": 7, "000": 8,
};
function guaNumToYao(num: number): number[] {
  return [...(NUM_YAO_MAP[num] ?? [1, 1, 1])];
}
function yaoToGuaNum(yao: number[]): number {
  return YAO_NUM_MAP[yao.join("")] ?? 1;
}

describe("梅花易数计算器", () => {
  const TEST_DATETIME = "2024-06-15T10:00:00";
  const result: any = calculateMeiHua({ datetime: TEST_DATETIME });

  // ── 结构验证 ──
  describe("结构验证", () => {
    it("本卦字段完整", () => {
      expect(result.benGua).toBeDefined();
      expect(result.benGua.name).toBeDefined();
      expect(result.benGua.symbol).toBeDefined();
      expect(result.benGua.upper).toBeDefined();
      expect(result.benGua.upper.number).toBeDefined();
      expect(result.benGua.upper.name).toBeDefined();
      expect(result.benGua.upper.wuXing).toBeDefined();
      expect(result.benGua.lower).toBeDefined();
      expect(result.benGua.lower.number).toBeDefined();
      expect(result.benGua.lower.name).toBeDefined();
      expect(result.benGua.lower.wuXing).toBeDefined();
      expect(result.benGua.binary).toBeDefined();
    });

    it("变卦字段完整", () => {
      expect(result.bianGua).toBeDefined();
      expect(result.bianGua.name).toBeDefined();
      expect(result.bianGua.symbol).toBeDefined();
      expect(result.bianGua.upper).toBeDefined();
      expect(result.bianGua.upper.number).toBeDefined();
      expect(result.bianGua.lower).toBeDefined();
      expect(result.bianGua.lower.number).toBeDefined();
    });

    it("互卦字段完整", () => {
      expect(result.huGua).toBeDefined();
      expect(result.huGua.name).toBeDefined();
      expect(result.huGua.symbol).toBeDefined();
      expect(result.huGua.upper).toBeDefined();
      expect(result.huGua.upper.number).toBeDefined();
      expect(result.huGua.lower).toBeDefined();
      expect(result.huGua.lower.number).toBeDefined();
    });

    it("体用生克存在", () => {
      expect(result.tiGua).toBeDefined();
      expect(result.tiGua.number).toBeDefined();
      expect(result.tiGua.name).toBeDefined();
      expect(result.tiGua.wuXing).toBeDefined();
      expect(result.yongGua).toBeDefined();
      expect(result.yongGua.number).toBeDefined();
      expect(result.yongGua.name).toBeDefined();
      expect(result.yongGua.wuXing).toBeDefined();
      expect(result.tiYongRelation).toBeDefined();
      expect(result.dongYao).toBeDefined();
      expect(typeof result.dongYao).toBe("number");
      expect(result.duanYu).toBeDefined();
      expect(typeof result.duanYu).toBe("string");
    });

    it("策轨卦气字段存在", () => {
      expect(result.ceGui).toBeDefined();
      expect(result.ceGui.yuanCe).toBeDefined();
      expect(result.ceGui.yuanGui).toBeDefined();
      expect(result.ceGui.yanCe).toBeDefined();
      expect(result.ceGui.yanCe.yuan).toBeDefined();
      expect(result.ceGui.yanCe.hui).toBeDefined();
      expect(result.ceGui.yanCe.yun).toBeDefined();
      expect(result.ceGui.yanCe.shi).toBeDefined();
      expect(result.guaQi).toBeDefined();
      expect(Object.keys(result.guaQi).length).toBe(8);
    });
  });

  // ── 回归基线 ──
  describe("回归基线", () => {
    it("确定性：相同输入相同输出", () => {
      const r1: any = calculateMeiHua({ datetime: TEST_DATETIME });
      const r2: any = calculateMeiHua({ datetime: TEST_DATETIME });
      expect(r1).toEqual(r2);
    });

    it("时间起卦与直接起卦等价", () => {
      // 2024-06-15T10:00 对应：
      //   upper = (2024+6+15) % 8 = 5
      //   lower = (6+15+10) % 8 = 7
      //   dongYao = (2024+6+15+10) % 6 = 3
      // 使用 method: "direct" 跳过 time/number 分支，进入直接起卦 else 分支
      const timeResult: any = calculateMeiHua({ datetime: TEST_DATETIME });
      const directResult: any = calculateMeiHua({ method: "direct", upperGua: 5, lowerGua: 7, dongYao: 3 });
      expect(timeResult.benGua).toEqual(directResult.benGua);
      expect(timeResult.bianGua).toEqual(directResult.bianGua);
      expect(timeResult.huGua).toEqual(directResult.huGua);
      expect(timeResult.tiGua).toEqual(directResult.tiGua);
      expect(timeResult.yongGua).toEqual(directResult.yongGua);
      expect(timeResult.tiYongRelation).toEqual(directResult.tiYongRelation);
      expect(timeResult.ceGui).toEqual(directResult.ceGui);
      expect(timeResult.duanYu).toEqual(directResult.duanYu);
    });
  });

  // ── 算法不变量 ──
  describe("算法不变量", () => {
    it("互卦由本卦2-5爻正确推导", () => {
      const r: any = calculateMeiHua({ datetime: TEST_DATETIME });
      const upperYao = guaNumToYao(r.benGua.upper.number as number);
      const lowerYao = guaNumToYao(r.benGua.lower.number as number);
      // fullYao = [上卦上, 上卦中, 上卦下, 下卦上, 下卦中, 下卦下]
      const fullYao = [...upperYao, ...lowerYao];

      // 互卦下卦 = 本卦第 2,3,4 爻作为 [上, 中, 下]
      //           = fullYao[4], fullYao[3], fullYao[2]
      const expectedHuLower = yaoToGuaNum([fullYao[2], fullYao[3], fullYao[4]]);
      // 互卦上卦 = 本卦第 3,4,5 爻作为 [上, 中, 下]
      //           = fullYao[3], fullYao[2], fullYao[1]
      const expectedHuUpper = yaoToGuaNum([fullYao[1], fullYao[2], fullYao[3]]);

      expect(r.huGua.upper.number).toBe(expectedHuUpper);
      expect(r.huGua.lower.number).toBe(expectedHuLower);
    });

    it("变卦只变动一个爻位", () => {
      const r: any = calculateMeiHua({ datetime: TEST_DATETIME });
      const benYao = [
        ...guaNumToYao(r.benGua.upper.number as number),
        ...guaNumToYao(r.benGua.lower.number as number),
      ];
      const bianYao = [
        ...guaNumToYao(r.bianGua.upper.number as number),
        ...guaNumToYao(r.bianGua.lower.number as number),
      ];
      const diffCount = benYao.filter((v, i) => v !== bianYao[i]).length;
      expect(diffCount).toBe(1);
    });

    it("上下卦取值范围为 1-8", () => {
      const r: any = calculateMeiHua({ datetime: TEST_DATETIME });
      const inspect = (gua: any, label: string) => {
        expect(gua.upper.number).toBeGreaterThanOrEqual(1);
        expect(gua.upper.number).toBeLessThanOrEqual(8);
        expect(gua.lower.number).toBeGreaterThanOrEqual(1);
        expect(gua.lower.number).toBeLessThanOrEqual(8);
      };
      inspect(r.benGua, "benGua");
      inspect(r.bianGua, "bianGua");
      inspect(r.huGua, "huGua");
    });

    it("动爻位置与体用归属联动", () => {
      // dongYao <= 3 → 体=上卦, 用=下卦
      // method: "direct" 确保进入 else 分支，不走到 time 默认分支
      const r1: any = calculateMeiHua({ method: "direct", upperGua: 1, lowerGua: 8, dongYao: 2 });
      expect(r1.dongYao).toBe(2);
      expect(r1.tiGua.number).toBe(r1.benGua.upper.number);
      expect(r1.yongGua.number).toBe(r1.benGua.lower.number);

      // dongYao > 3 → 体=下卦, 用=上卦
      const r2: any = calculateMeiHua({ method: "direct", upperGua: 1, lowerGua: 8, dongYao: 4 });
      expect(r2.dongYao).toBe(4);
      expect(r2.tiGua.number).toBe(r2.benGua.lower.number);
      expect(r2.yongGua.number).toBe(r2.benGua.upper.number);
    });
  });

  // ── 边界条件 ──
  describe("边界条件", () => {
    it("子时不崩溃", () => {
      expect(() =>
        calculateMeiHua({ datetime: "2024-06-15T00:00:00" }),
      ).not.toThrow();
    });

    it("数字起卦：三数起卦正确", () => {
      // numbers: [3, 7, 5]
      //   上卦 = 3%8 = 3(离), 下卦 = 7%8 = 7(艮) → 火山旅
      //   动爻 = 5%6 = 5, 翻转上卦中爻: 离[1,0,1]→[1,1,1]=1(乾)
      //   变卦 = 上乾下艮 → 天山遁
      const r: any = calculateMeiHua({ method: "number", numbers: [3, 7, 5] });
      expect(r.benGua.name).toBe("火山旅");
      expect(r.benGua.upper.number).toBe(3);
      expect(r.benGua.lower.number).toBe(7);
      expect(r.dongYao).toBe(5);
      expect(r.bianGua.name).toBe("天山遁");
    });

    it("动爻为 6 时正确翻转上卦顶部", () => {
      // numbers: [3, 7, 6]
      //   上卦=3(离), 下卦=7(艮), 动爻=6
      //   dongYao>3 → 翻上卦, yaoIdx=6-6=0(顶部)
      //   离[1,0,1] → [0,0,1]=4(震) → 上震下艮 = 雷山小过
      const r: any = calculateMeiHua({ method: "number", numbers: [3, 7, 6] });
      expect(r.dongYao).toBe(6);
      expect(r.bianGua.upper.number).toBe(4);
      expect(r.bianGua.lower.number).toBe(7);
      expect(r.bianGua.name).toBe("雷山小过");
    });

    it("动爻为 1 时正确翻转下卦底部", () => {
      // numbers: [1, 8, 1]
      //   上卦=1(乾), 下卦=8(坤), 动爻=1
      //   dongYao≤3 → 翻下卦, yaoIdx=3-1=2(底部)
      //   坤[0,0,0] → [0,0,1]=4(震) → 上乾下震 = 天雷无妄
      const r: any = calculateMeiHua({ method: "number", numbers: [1, 8, 1] });
      expect(r.dongYao).toBe(1);
      expect(r.bianGua.upper.number).toBe(1);
      expect(r.bianGua.lower.number).toBe(4);
      expect(r.bianGua.name).toBe("天雷无妄");
    });

    it("极端年份不崩溃且卦数合法", () => {
      expect(() =>
        calculateMeiHua({ datetime: "9999-12-31T23:59:59" }),
      ).not.toThrow();
      const r: any = calculateMeiHua({ datetime: "9999-12-31T23:59:59" });
      expect(r.benGua.upper.number).toBeGreaterThanOrEqual(1);
      expect(r.benGua.upper.number).toBeLessThanOrEqual(8);
      expect(r.benGua.lower.number).toBeGreaterThanOrEqual(1);
      expect(r.benGua.lower.number).toBeLessThanOrEqual(8);
      expect(r.dongYao).toBeGreaterThanOrEqual(1);
      expect(r.dongYao).toBeLessThanOrEqual(6);
    });

    it("数字起卦余数为 0 时映射为 8", () => {
      // numbers: [8, 16, 6] -> 8%8=0->8(坤), 16%8=0->8(坤), 6%6=0->6
      const r: any = calculateMeiHua({ method: "number", numbers: [8, 16, 6] });
      expect(r.benGua.upper.number).toBe(8);
      expect(r.benGua.lower.number).toBe(8);
      expect(r.benGua.name).toBe("坤为地");
      expect(r.dongYao).toBe(6);
    });
  });
});
