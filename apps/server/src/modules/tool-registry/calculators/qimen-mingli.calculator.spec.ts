import { calculateQimenMingli } from "./qimen-mingli.calculator";

const mockCalcBazi = jest.fn();
const mockCalcNianZhu = jest.fn();
const mockCalculateQimenYang = jest.fn();

jest.mock("@guoxue/bazi-engine", () => ({
  calcBazi: (...args: any[]) => mockCalcBazi(...args),
  calcNianZhu: (...args: any[]) => mockCalcNianZhu(...args),
}));

jest.mock("./qimen.calculator", () => ({
  calculateQimenYang: (...args: any[]) => mockCalculateQimenYang(...args),
}));

function makeMockBaziResult() {
  return {
    siZhu: {
      nian: { gan: "丙", zhi: "午", nayin: "天河水", ganShiShen: "比肩", zhiShiShen: "" },
      yue: { gan: "甲", zhi: "午", nayin: "沙中金", ganShiShen: "食神", zhiShiShen: "" },
      ri: { gan: "丙", zhi: "午", nayin: "天河水", ganShiShen: "日主", zhiShiShen: "" },
      shi: { gan: "甲", zhi: "午", nayin: "沙中金", ganShiShen: "食神", zhiShiShen: "" },
    },
    shengXiao: "马",
    kongWang: [{ name: "戌亥", ganZhi: ["戌","亥"] }],
    wuXingEnergy: { mu: 2, huo: 5, tu: 0, jin: 0, shui: 0, desc: "火旺" },
    mingGong: { gan: "戊", zhi: "申", ganShiShen: "偏印", zhiShiShen: "食神" },
    shenGong: { gan: "戊", zhi: "寅", ganShiShen: "偏印", zhiShiShen: "比肩" },
    shenSha: [
      { name: "天乙贵人", pillar: "nian" },
      { name: "文昌", pillar: "ri" },
    ],
    geJu: { name: "建禄格", desc: "日主得禄", yongShen: "水", xiShen: "金", jiShen: "火" },
    qiYun: {
      startAge: 3,
      startYear: 2029,
      desc: "3岁起运",
      daYun: [
        {
          ganZhi: "乙未", startAge: 3, endAge: 13,
          startYear: 2029, endYear: 2039,
          ganShiShen: "正印", zhiShiShen: "伤官",
          liuNian: [{ year: 2029, ganZhi: "己酉", age: 3 }],
        },
        {
          ganZhi: "丙申", startAge: 13, endAge: 23,
          startYear: 2039, endYear: 2049,
          ganShiShen: "比肩", zhiShiShen: "正财",
          liuNian: [{ year: 2040, ganZhi: "庚戌", age: 14 }],
        },
      ],
    },
  };
}

function makeMockQimenYangPlate() {
  return {
    dunType: "yang",
    juNumber: 3,
    zhiFu: "天辅",
    zhiShiMen: "杜门",
    jieQi: "冬至",
    yongShi: "庚子",
    dipanBashen: [] as string[],
    gongs: [
      { index:0, name:"坎", diPan:"戊", tianPan:"辛", star:"天蓬", men:"休门", shen:"值符", yinGan:"癸", isRuMu:false, kongWang:false, maXing:false },
      { index:1, name:"坤", diPan:"己", tianPan:"乙", star:"天芮", men:"死门", shen:"螣蛇", yinGan:"戊", isRuMu:false, kongWang:false, maXing:false },
      { index:2, name:"震", diPan:"庚", tianPan:"丙", star:"天冲", men:"伤门", shen:"太阴", yinGan:"丁", isRuMu:false, kongWang:false, maXing:false },
      { index:3, name:"巽", diPan:"辛", tianPan:"丁", star:"天辅", men:"杜门", shen:"六合", yinGan:"己", isRuMu:false, kongWang:false, maXing:false },
      { index:4, name:"中", diPan:"壬", tianPan:"己", star:"天禽", men:"中门", shen:"勾陈", yinGan:"乙", isRuMu:false, kongWang:false, maXing:false },
      { index:5, name:"乾", diPan:"癸", tianPan:"戊", star:"天心", men:"开门", shen:"值符", yinGan:"壬", isRuMu:false, kongWang:false, maXing:false },
      { index:6, name:"兑", diPan:"丁", tianPan:"壬", star:"天柱", men:"惊门", shen:"朱雀", yinGan:"庚", isRuMu:false, kongWang:false, maXing:false },
      { index:7, name:"艮", diPan:"丙", tianPan:"癸", star:"天任", men:"生门", shen:"九地", yinGan:"丙", isRuMu:false, kongWang:false, maXing:false },
      { index:8, name:"离", diPan:"乙", tianPan:"戊", star:"天英", men:"景门", shen:"九天", yinGan:"辛", isRuMu:false, kongWang:false, maXing:false },
    ],
  };
}

describe("calculateQimenMingli", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalcBazi.mockReturnValue(makeMockBaziResult());
    mockCalculateQimenYang.mockReturnValue(makeMockQimenYangPlate());
    mockCalcNianZhu.mockReturnValue({ gan: "丙", zhi: "午" });
  });

  it("返回完整的阳盘命理奇门结果", () => {
    const result = calculateQimenMingli({
      birthTime: "2026-06-04T10:00:00",
      gender: "男",
    });

    expect(result.basicInfo).toBeDefined();
    expect(result.mingLi).toBeDefined();
    expect(result.gongs).toBeDefined();
    expect(result.geJu).toBeDefined();
  });

  it("使用阳遁标识", () => {
    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    const bi = result.basicInfo as any;
    expect(bi.juShu).toBe(3);
    expect(bi.dunType).toBe("阳遁");
  });

  it("调用 calculateQimenYang 排盘", () => {
    calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    expect(mockCalculateQimenYang).toHaveBeenCalledWith(
      expect.objectContaining({ datetime: "2026-06-04T10:00:00" }),
    );
  });

  it("增强九宫包含 interpretGong 解读", () => {
    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    for (const g of result.gongs as any[]) {
      expect(g.interpretation).toBeDefined();
      expect(typeof g.interpretation).toBe("string");
      expect(g.changSheng).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(g, "isRuMu")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(g, "isJiXing")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(g, "isMenPo")).toBe(true);
    }
  });

  it("命宫映射到正确宫位", () => {
    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    const ml = result.mingLi as any;
    expect(ml.mingGong.ganZhi).toBe("戊申");
    expect(ml.mingGong.gongName).toBe("坤");
    expect(ml.shenGong.ganZhi).toBe("戊寅");
  });

  it("大运包含起运信息", () => {
    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    const ml = result.mingLi as any;
    expect(ml.qiYunInfo.startAge).toBe(3);
    expect(ml.qiYunInfo.startYear).toBe(2029);
  });

  it("当前流年分析", () => {
    const result = calculateQimenMingli({ birthTime: "2020-01-01T00:00:00" });

    const ln = (result.mingLi as any).liuNian;
    expect(ln).toBeDefined();
    expect(ln.year).toBeGreaterThanOrEqual(2026);
    expect(ln.ganZhi).toBeDefined();
    expect(ln.daYunGanZhi).toBe("乙未");
  });

  it("格局包含阳盘特有命名", () => {
    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    const geJu = result.geJu as any[];
    expect(geJu.length).toBeGreaterThan(0);
  });

  it("断语包含阳遁信息", () => {
    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00", gender: "男" });

    expect(result.duanYu).toContain("命主男");
    expect(result.duanYu).toContain("阳遁3局");
    expect(result.duanYu).toContain("八字：");
  });

  it("calcBazi 接收参数传递", () => {
    calculateQimenMingli({
      birthTime: "2020-03-15T08:30:00",
      gender: "女",
      birthplace: "上海",
      trueSolar: true,
    });

    expect(mockCalcBazi).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2020, month: 3, day: 15, hour: 8, minute: 30,
        gender: "女", city: "上海", useTrueSolarTime: true,
      }),
    );
  });

  it("无八字格局时不添加", () => {
    const bz = makeMockBaziResult();
    (bz as any).geJu = undefined;
    mockCalcBazi.mockReturnValue(bz);

    const result = calculateQimenMingli({ birthTime: "2026-06-04T10:00:00" });

    const geJu = result.geJu as any[];
    expect(geJu.find((g: any) => g.name === "建禄格")).toBeUndefined();
  });
});
