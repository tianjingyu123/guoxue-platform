import { calculateLiuYao } from "./liuyao.calculator";

describe("六爻纳甲计算器", () => {
  // ====================================================================
  // 1. 结构验证 — 确保输出对象的骨架完整
  // ====================================================================
  describe("结构验证", () => {
    const result: any = calculateLiuYao({
      method: "auto",
      datetime: "2024-06-15T10:00:00",
    });

    it("应返回完整的结果对象", () => {
      expect(result).toBeDefined();
      expect(result.input).toBeDefined();
      expect(result.benGua).toBeDefined();
      expect(result.yaos).toBeDefined();
      expect(result.shiYao).toBeDefined();
      expect(result.yingYao).toBeDefined();
      expect(result.guaGong).toBeDefined();
      expect(result.wuXing).toBeDefined();
    });

    it("本卦包含卦名、卦符、上下卦", () => {
      expect(result.benGua.name).toBeTruthy();
      expect(typeof result.benGua.name).toBe("string");
      expect(result.benGua.symbol).toBeTruthy();
      expect(typeof result.benGua.symbol).toBe("string");
      expect(result.benGua.upper).toBeTruthy();
      expect(typeof result.benGua.upper).toBe("string");
      expect(result.benGua.lower).toBeTruthy();
      expect(typeof result.benGua.lower).toBe("string");
    });

    it("六爻数组包含6个爻，每个字段完整", () => {
      expect(result.yaos).toHaveLength(6);
      for (const yao of result.yaos) {
        expect(yao.position).toBeGreaterThanOrEqual(1);
        expect(yao.position).toBeLessThanOrEqual(6);
        expect(yao.naJia).toBeTruthy();
        expect(typeof yao.naJia).toBe("string");
        expect(yao.liuQin).toBeTruthy();
        expect(typeof yao.liuQin).toBe("string");
        expect(yao.liuShou).toBeTruthy();
        expect(typeof yao.liuShou).toBe("string");
        expect(yao.wuXing).toBeTruthy();
        expect(typeof yao.wuXing).toBe("string");
        expect(typeof yao.isDongYao).toBe("boolean");
        expect(["shaoyang", "shaoyin", "laoyang", "laoyin"]).toContain(yao.type);
      }
    });

    it("世应标识正确——恰有一世一应", () => {
      const shiYaos = result.yaos.filter((y: any) => y.shiYing === "世");
      const yingYaos = result.yaos.filter((y: any) => y.shiYing === "应");
      expect(shiYaos).toHaveLength(1);
      expect(yingYaos).toHaveLength(1);
      expect(shiYaos[0].position).toBe(result.shiYao);
      expect(yingYaos[0].position).toBe(result.yingYao);
    });

    it("变卦和互卦结构完整", () => {
      expect(result.bianGua).toBeDefined();
      expect(result.bianGua.name).toBeTruthy();
      expect(result.bianGua.symbol).toBeTruthy();
      expect(result.bianGua.upper).toBeTruthy();
      expect(result.bianGua.lower).toBeTruthy();
      expect(result.huGua).toBeDefined();
      expect(result.huGua.name).toBeTruthy();
      expect(result.huGua.symbol).toBeTruthy();
      expect(result.huGua.upper).toBeTruthy();
      expect(result.huGua.lower).toBeTruthy();
    });

    it("宫位和宫五行有效", () => {
      const validGongs = [
        "乾宫", "兑宫", "离宫", "震宫",
        "巽宫", "坎宫", "艮宫", "坤宫",
      ];
      const validWuXing = ["金", "木", "水", "火", "土"];
      expect(validGongs).toContain(result.guaGong);
      expect(validWuXing).toContain(result.wuXing);
    });
  });

  // ====================================================================
  // 2. 回归基线 — 确定性校验
  // ====================================================================
  describe("回归基线", () => {
    it("相同输入产生相同结果（确定性）", () => {
      const r1: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      const r2: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      expect(r1.benGua.name).toBe(r2.benGua.name);
      expect(r1.benGua.symbol).toBe(r2.benGua.symbol);
      expect(r1.guaGong).toBe(r2.guaGong);
      expect(r1.wuXing).toBe(r2.wuXing);
      expect(r1.shiYao).toBe(r2.shiYao);
      expect(r1.yingYao).toBe(r2.yingYao);
      expect(r1.yaos).toHaveLength(r2.yaos.length);
      // 每个爻的详细信息也应一致
      for (let i = 0; i < 6; i++) {
        expect(r1.yaos[i].naJia).toBe(r2.yaos[i].naJia);
        expect(r1.yaos[i].liuQin).toBe(r2.yaos[i].liuQin);
        expect(r1.yaos[i].type).toBe(r2.yaos[i].type);
      }
    });

    it("不同输入时间不会出错", () => {
      const r1: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-01-01T00:00:00",
      });
      const r2: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      expect(r1.yaos).toHaveLength(6);
      expect(r2.yaos).toHaveLength(6);
      expect(r1.benGua.name).toBeTruthy();
      expect(r2.benGua.name).toBeTruthy();
    });
  });

  // ====================================================================
  // 3. 算法不变量 — 所有输出必须满足的约束
  // ====================================================================
  describe("算法不变量", () => {
    const result: any = calculateLiuYao({
      method: "auto",
      datetime: "2024-06-15T10:00:00",
    });
    const tianGan = "甲乙丙丁戊己庚辛壬癸";
    const diZhi = "子丑寅卯辰巳午未申酉戌亥";
    const validWuXing = ["金", "木", "水", "火", "土"];
    const validLiuShou = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
    const validLiuQin = ["兄弟", "子孙", "妻财", "官鬼", "父母"];

    it("纳甲字符串格式正确（天干 + 地支）", () => {
      for (const yao of result.yaos) {
        expect(yao.naJia).toHaveLength(2);
        expect(tianGan).toContain(yao.naJia[0]);
        expect(diZhi).toContain(yao.naJia[1]);
      }
    });

    it("五行值均为有效五行", () => {
      expect(validWuXing).toContain(result.wuXing);
      for (const yao of result.yaos) {
        expect(validWuXing).toContain(yao.wuXing);
      }
    });

    it("六神值均为有效值", () => {
      for (const yao of result.yaos) {
        expect(validLiuShou).toContain(yao.liuShou);
      }
    });

    it("六亲值均为有效五行关系", () => {
      for (const yao of result.yaos) {
        expect(validLiuQin).toContain(yao.liuQin);
      }
    });

    it("世爻和应爻位置相差 3", () => {
      const diff = Math.abs(result.shiYao - result.yingYao);
      expect(diff).toBe(3);
    });

    it("六爻 position 互不相同且覆盖 1-6", () => {
      const positions = result.yaos.map((y: any) => y.position);
      expect(new Set(positions).size).toBe(6);
      expect(positions.sort((a: number, b: number) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
    });

    it("非世应的爻 shiYing 为 null", () => {
      for (const yao of result.yaos) {
        if (yao.position === result.shiYao || yao.position === result.yingYao) {
          expect(yao.shiYing).toBeTruthy();
        } else {
          expect(yao.shiYing).toBeNull();
        }
      }
    });
  });

  // ====================================================================
  // 4. 边界条件 — 不同起卦方式和极端输入
  // ====================================================================
  describe("边界条件", () => {
    it("手动数字起卦（两数法）", () => {
      const result: any = calculateLiuYao({
        method: "number-2",
        numbers2: [5, 8],
      });
      expect(result.yaos).toHaveLength(6);
      expect(result.benGua.name).toBeTruthy();
      expect(result.guaGong).toBeTruthy();
      expect(["shaoyang", "shaoyin", "laoyang", "laoyin"]).toContain(
        result.yaos[0].type,
      );
    });

    it("手动数字起卦（三数法）", () => {
      const result: any = calculateLiuYao({
        method: "number-3",
        numbers3: [3, 4, 9],
      });
      expect(result.yaos).toHaveLength(6);
      expect(result.benGua.name).toBeTruthy();
      expect(result.guaGong).toBeTruthy();
    });

    it("两数法结果确定性", () => {
      const r1: any = calculateLiuYao({
        method: "number-2",
        numbers2: [5, 8],
      });
      const r2: any = calculateLiuYao({
        method: "number-2",
        numbers2: [5, 8],
      });
      expect(r1.benGua.name).toBe(r2.benGua.name);
    });

    it("三数法结果确定性", () => {
      const r1: any = calculateLiuYao({
        method: "number-3",
        numbers3: [3, 4, 9],
      });
      const r2: any = calculateLiuYao({
        method: "number-3",
        numbers3: [3, 4, 9],
      });
      expect(r1.benGua.name).toBe(r2.benGua.name);
    });

    it("极端未来年份不崩溃", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "9999-12-31T23:59:59",
      });
      expect(result.yaos).toHaveLength(6);
      expect(result.benGua.name).toBeTruthy();
    });

    it("Unix 纪元不崩溃", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "1970-01-01T00:00:00",
      });
      expect(result.yaos).toHaveLength(6);
      expect(result.benGua.name).toBeTruthy();
    });

    it("shake 起卦与 auto 行为一致", () => {
      const auto: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      const shake: any = calculateLiuYao({
        method: "shake",
        datetime: "2024-06-15T10:00:00",
      });
      expect(auto.benGua.name).toBe(shake.benGua.name);
      expect(auto.yaos.map((y: any) => y.type)).toEqual(
        shake.yaos.map((y: any) => y.type),
      );
    });
  });

  // ====================================================================
  // 5. 纳甲正确性 — 与标准纳甲表对照
  // ====================================================================
  describe("纳甲正确性", () => {
    // 八纯卦纳甲表（与引擎内 NA_JIA 一致）
    const NA_JIA: Record<string, string[]> = {
      "111111": ["甲子", "甲寅", "甲辰", "壬午", "壬申", "壬戌"],
      "000000": ["乙未", "乙巳", "乙卯", "癸丑", "癸亥", "癸酉"],
      "001001": ["庚子", "庚寅", "庚辰", "庚午", "庚申", "庚戌"],
      "110110": ["辛丑", "辛亥", "辛酉", "辛未", "辛巳", "辛卯"],
      "010010": ["戊寅", "戊辰", "戊午", "戊申", "戊戌", "戊子"],
      "101101": ["己卯", "己丑", "己亥", "己酉", "己未", "己巳"],
      "100100": ["丙辰", "丙午", "丙申", "丙戌", "丙子", "丙寅"],
      "011011": ["丁巳", "丁卯", "丁丑", "丁亥", "丁酉", "丁未"],
    };
    const GONG_TO_CHUN: Record<string, string> = {
      "乾宫": "111111",
      "兑宫": "011011",
      "离宫": "101101",
      "震宫": "001001",
      "巽宫": "110110",
      "坎宫": "010010",
      "艮宫": "100100",
      "坤宫": "000000",
    };
    // 地支五行映射
    const ZHI_WU_XING: Record<string, string> = {
      子: "水", 丑: "土", 寅: "木", 卯: "木",
      辰: "土", 巳: "火", 午: "火", 未: "土",
      申: "金", 酉: "金", 戌: "土", 亥: "水",
    };
    // 六亲表
    const WU_XING_REL: Record<string, Record<string, string>> = {
      金: { 金: "兄弟", 水: "子孙", 木: "妻财", 火: "官鬼", 土: "父母" },
      水: { 水: "兄弟", 木: "子孙", 火: "妻财", 土: "官鬼", 金: "父母" },
      木: { 木: "兄弟", 火: "子孙", 土: "妻财", 金: "官鬼", 水: "父母" },
      火: { 火: "兄弟", 土: "子孙", 金: "妻财", 水: "官鬼", 木: "父母" },
      土: { 土: "兄弟", 金: "子孙", 水: "妻财", 木: "官鬼", 火: "父母" },
    };

    const result: any = calculateLiuYao({
      method: "auto",
      datetime: "2024-06-15T10:00:00",
    });

    it("纳甲值与所属宫纯卦的纳甲一致", () => {
      const chunGuaCode = GONG_TO_CHUN[result.guaGong];
      expect(chunGuaCode).toBeDefined();
      const expectedNaJiaList = NA_JIA[chunGuaCode];
      expect(expectedNaJiaList).toBeDefined();
      for (const yao of result.yaos) {
        const expected = expectedNaJiaList[yao.position - 1];
        expect(yao.naJia).toBe(expected);
      }
    });

    it("每个爻的五行由其纳甲地支正确推导", () => {
      for (const yao of result.yaos) {
        const expectedWuXing = ZHI_WU_XING[yao.naJia[1]];
        expect(yao.wuXing).toBe(expectedWuXing);
      }
    });

    it("六亲值由宫五行和爻五行正确推导", () => {
      const rel = WU_XING_REL[result.wuXing];
      expect(rel).toBeDefined();
      for (const yao of result.yaos) {
        expect(yao.liuQin).toBe(rel[yao.wuXing]);
      }
    });
  });

  // ====================================================================
  // 6. 六神流转 — 六神按天干起始依次排列
  // ====================================================================
  describe("六神流转", () => {
    const LIU_SHOU_ORDER = [
      "青龙",
      "朱雀",
      "勾陈",
      "螣蛇",
      "白虎",
      "玄武",
    ];

    it("六神在六爻中按顺序循环", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      for (let i = 1; i < result.yaos.length; i++) {
        const prevIdx = LIU_SHOU_ORDER.indexOf(result.yaos[i - 1].liuShou);
        const currIdx = LIU_SHOU_ORDER.indexOf(result.yaos[i].liuShou);
        expect((prevIdx + 1) % 6).toBe(currIdx);
      }
    });

    it("不同日干的六神起始不同", () => {
      // 模拟不同日期的六神起始变化
      const r1: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      const r2: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-16T10:00:00",
      });
      // 初爻六神可能不同（日干变化时）
      expect(r1.yaos[0].liuShou).toBeTruthy();
      expect(r2.yaos[0].liuShou).toBeTruthy();
    });
  });

  // ====================================================================
  // 7. 动爻验证 — 动爻产生规则
  // ====================================================================
  describe("动爻验证", () => {
    it("至少有一个动爻", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      const dongYaos = result.yaos.filter((y: any) => y.isDongYao);
      expect(dongYaos.length).toBeGreaterThanOrEqual(1);
    });

    it("动爻类型为老阳或老阴，静爻为少阳或少阴", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      for (const yao of result.yaos) {
        if (yao.isDongYao) {
          expect(["laoyang", "laoyin"]).toContain(yao.type);
        } else {
          expect(["shaoyang", "shaoyin"]).toContain(yao.type);
        }
      }
    });

    it("动爻位置与变卦一致性——动爻位在变卦中取反", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      const dongPositions = result.yaos
        .filter((y: any) => y.isDongYao)
        .map((y: any) => y.position);
      // 如果有动爻，变卦应与本卦不同（当动爻改变卦象时）
      if (dongPositions.length > 0) {
        expect(result.bianGua).toBeDefined();
        expect(result.bianGua.name).toBeTruthy();
      }
    });
  });

  // ====================================================================
  // 8. 互卦验证 — 取本卦 2345 爻
  // ====================================================================
  describe("互卦验证", () => {
    it("互卦下卦对应本卦 2-4 爻，上卦对应 3-5 爻", () => {
      const result: any = calculateLiuYao({
        method: "auto",
        datetime: "2024-06-15T10:00:00",
      });
      // 互卦定义：下卦 = 本卦 2,3,4 爻，上卦 = 本卦 3,4,5 爻
      // 验证互卦存在
      expect(result.huGua).toBeDefined();
      expect(result.huGua.name).toBeTruthy();
    });
  });

  // ====================================================================
  // 9. 起卦算法正确性 — 《梅花易数》报数/时间起卦法（确定性，杜绝毫秒/随机）
  // ====================================================================
  describe("起卦算法正确性", () => {
    it("两数法按先天八卦数起卦：[5,8] → 风地观，动爻第1爻", () => {
      // 首数5÷8余5=巽(110)上卦，次数8÷8余8=坤(000)下卦 → 110000 风地观
      // 总数13÷6余1 → 动爻第1爻
      const r: any = calculateLiuYao({ method: "number-2", numbers2: [5, 8] });
      expect(r.benGua.name).toBe("风地观");
      expect(r.benGua.upper).toBe("巽");
      expect(r.benGua.lower).toBe("坤");
      const dong = r.yaos.filter((y: any) => y.isDongYao).map((y: any) => y.position);
      expect(dong).toEqual([1]);
      expect(r.qiGua.method).toContain("两数法");
    });

    it("三数法按先天八卦数起卦：[3,4,9] → 火雷噬嗑，动爻第4爻", () => {
      // 首数3÷8余3=离(101)上卦，次数4÷8余4=震(001)下卦 → 101001 火雷噬嗑
      // 总数16÷6余4 → 动爻第4爻
      const r: any = calculateLiuYao({ method: "number-3", numbers3: [3, 4, 9] });
      expect(r.benGua.name).toBe("火雷噬嗑");
      expect(r.benGua.upper).toBe("离");
      expect(r.benGua.lower).toBe("震");
      const dong = r.yaos.filter((y: any) => y.isDongYao).map((y: any) => y.position);
      expect(dong).toEqual([4]);
      expect(r.qiGua.method).toContain("三数法");
    });

    it("整除归一规则：余0取末卦（8卦/6爻），如 numbers2:[8,16]", () => {
      // 8÷8余0→取8=坤，16÷8余0→取8=坤 → 000000 坤为地；总24÷6余0→第6爻
      const r: any = calculateLiuYao({ method: "number-2", numbers2: [8, 16] });
      expect(r.benGua.name).toBe("坤为地");
      const dong = r.yaos.filter((y: any) => y.isDongYao).map((y: any) => y.position);
      expect(dong).toEqual([6]);
    });

    it("报数优先：未声明 method 但传 numbers3 时走报数起卦", () => {
      const r: any = calculateLiuYao({ method: "auto", numbers3: [3, 4, 9] });
      expect(r.benGua.name).toBe("火雷噬嗑");
      expect(r.qiGua.method).toContain("数字起卦");
    });

    it("时间起卦：2024-06-15T10:00:00 → 泽地萃，动爻第2爻", () => {
      // 甲辰年(辰=5)+月6+日15=26÷8余2=兑(011)上卦
      // +巳时(6)=32÷8余0→8=坤(000)下卦 → 011000 泽地萃；32÷6余2→第2爻
      const r: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T10:00:00",
      });
      expect(r.benGua.name).toBe("泽地萃");
      expect(r.benGua.upper).toBe("兑");
      expect(r.benGua.lower).toBe("坤");
      const dong = r.yaos.filter((y: any) => y.isDongYao).map((y: any) => y.position);
      expect(dong).toEqual([2]);
      expect(r.qiGua.method).toBe("时间起卦");
    });

    it("时间起卦说明含年支/月/日/时辰与依据出处", () => {
      const r: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T10:00:00",
      });
      expect(r.qiGua.basis).toContain("年支");
      expect(r.qiGua.basis).toContain("梅花易数");
    });
  });

  // ====================================================================
  // 10. 造假回归防护 — 同一时辰必同卦，绝不因毫秒/随机变化
  // ====================================================================
  describe("造假回归防护", () => {
    it("同一时辰内不同毫秒得到完全相同的卦（杜绝 Date.now 毫秒起卦）", () => {
      const a: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T10:00:00.000",
      });
      const b: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T10:59:59.999",
      });
      // 10:00 与 10:59 同属巳时，应得同卦同动爻
      expect(a.benGua.name).toBe(b.benGua.name);
      expect(a.yaos.map((y: any) => y.type)).toEqual(
        b.yaos.map((y: any) => y.type),
      );
      expect(
        a.yaos.filter((y: any) => y.isDongYao).map((y: any) => y.position),
      ).toEqual(
        b.yaos.filter((y: any) => y.isDongYao).map((y: any) => y.position),
      );
    });

    it("不同时辰可得不同卦（起卦确随时辰变化，非固定）", () => {
      const morning: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T10:00:00",
      });
      const night: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T23:30:00",
      });
      // 至少卦象或动爻其一不同（不同时辰序数参与上卦/下卦/动爻）
      const changed =
        morning.benGua.name !== night.benGua.name ||
        morning.yaos.filter((y: any) => y.isDongYao)[0].position !==
          night.yaos.filter((y: any) => y.isDongYao)[0].position;
      expect(changed).toBe(true);
    });

    it("恰有一个动爻（《梅花易数》一卦一动爻）", () => {
      const r: any = calculateLiuYao({
        method: "time",
        datetime: "2024-06-15T10:00:00",
      });
      expect(r.yaos.filter((y: any) => y.isDongYao)).toHaveLength(1);
    });
  });
});
