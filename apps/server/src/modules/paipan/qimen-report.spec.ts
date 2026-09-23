import { PaipanReportService } from "./paipan-report.service";
import { buildQimenChartView, extractQimenFacts, qimenSignals, type QimenResultData } from "./qimen-report";
import { QIMEN_REPORT_TEMPLATE, getReportTemplate } from "./report-template";
/** 与服务端排盘存库结构同形（gongs / dunType / juNumber / zhiFu / zhiShiMen / meta） */
const GONG_DEF: [number, string, string, string, string, string, string][] = [
  [1, "坎", "休门", "玄武", "天蓬", "乙", "乙"],
  [2, "坤", "死门", "值符", "天禽", "戊", "己"],
  [3, "震", "伤门", "六合", "天冲", "庚", "庚"],
  [4, "巽", "杜门", "太阴", "天辅", "辛", "辛"],
  [5, "中", "", "", "", "", ""],
  [6, "乾", "开门", "九地", "天心", "壬", "壬"],
  [7, "兑", "惊门", "九天", "天柱", "癸", "癸"],
  [8, "艮", "生门", "白虎", "天任", "丙", "丙"],
  [9, "离", "景门", "腾蛇", "天英", "丁", "丁"],
];
const CHART: QimenResultData = {
  dunType: "yin",
  juNumber: 9,
  jieQi: "上元",
  zhiFu: "天禽",
  zhiShiMen: "死门",
  yongShi: "丙午",
  gongs: GONG_DEF.map(([index, bagua, men, shen, star, tianPan, diPan]) => ({
    index, bagua, men, shen, star, tianPan, diPan, anGan: "丙", changsheng: { tian: "旺", di: "旺" },
  })),
  meta: {
    siZhu: { nian: { gan: "丙", zhi: "午" }, yue: { gan: "甲", zhi: "午" }, ri: { gan: "丁", zhi: "卯" }, shi: { gan: "丙", zhi: "午" } },
    kongWang: { nian: "寅卯", yue: "辰巳", ri: "戌亥", shi: "寅卯" },
    maXingZhi: "巳",
    jieQi: { name: "夏至", start: "2026.06.21 16:25", end: "2026.07.07 09:58" },
  },
};

function setup(resultData: unknown = CHART) {
  const store: any[] = [];
  const prisma: any = {
    paipanRecord: {
      findUnique: jest.fn(async () => ({
        id: "rec-q1",
        userId: "u1",
        paipanType: "QIMEN",
        resultData,
        inputParams: { matter: "问这单生意能否成", panMethod: "zhuan" },
      })),
    },
    aiAnalysisRecord: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `r${store.length + 1}`, createdAt: new Date(), ...data };
        store.push(row);
        return row;
      }),
      update: jest.fn(),
      findUnique: jest.fn(async ({ where }: any) => store.find((r) => r.id === where.id) ?? null),
    },
  };
  const gateway: any = { chat: jest.fn() };
  const knowledge: any = { baziSignals: jest.fn(() => []), findEvidence: jest.fn(async () => []), groupDebates: jest.fn(() => []) };
  return { svc: new PaipanReportService(prisma, gateway, knowledge, { assertReportAccess: jest.fn() } as any), prisma, gateway, knowledge };
}

const modelJson = () =>
  JSON.stringify({
    summary: "值符落宫得力，此事可为。",
    sections: [
      { sectionId: "s3", content: "用神与落宫一节。", evidenceIds: [] },
      { sectionId: "s4", content: "格局吉凶一节。", evidenceIds: [] },
      { sectionId: "s5", content: "方位取用一节。", evidenceIds: [] },
      { sectionId: "s7", content: "断语一节。", evidenceIds: [] },
      { sectionId: "sQQ", content: "自造小节，应丢弃。", evidenceIds: [] },
    ],
    limitations: ["局象只答所问一事"],
  });

describe("奇门遁甲报告", () => {
  it("盘面事实来自引擎：局数、旬首、值符值使、九宫与格局标记", () => {
    const f = extractQimenFacts(CHART, { matter: "问这单生意" });
    expect(f.ju).toBe("阴遁9局");
    expect(f.yuan).toBe("上元");
    expect(f.zhifu).toContain("天禽");
    expect(f.zhishi).toContain("死门");
    expect(f.sizhu).toContain("年");
    expect(f.palaces).toHaveLength(9);
    // 九宫按洛书排布：首行 巽4 离9 坤2
    expect(f.palaces[0]).toContain("巽4宫（东南）");
    expect(f.palaces[1]).toContain("离9宫（南）");
    expect(f.palaces[2]).toContain("坤2宫（西南）");
    // 每宫都带神星门与天地盘干
    expect(f.palaces[0]).toMatch(/天盘.+地盘/);
  });

  it("值符值使定位到宫；四柱旬空马星节气如实带出", () => {
    const f = extractQimenFacts(CHART);
    expect(f.zhifu).toContain("坤2宫（西南）"); // 天禽在 2 宫
    expect(f.zhishi).toContain("坤2宫（西南）"); // 死门同在 2 宫
    expect(f.sizhu).toBe("丙午年 甲午月 丁卯日 丙午时");
    expect(f.kongwang).toContain("日空 戌亥");
    expect(f.maXing).toBe("巳");
    expect(f.jieqi).toContain("夏至");
  });

  it("飞盘记录如实说明：服务端按转盘法存储，与页面展示不同", () => {
    const zhuan = extractQimenFacts(CHART, { panMethod: "zhuan" });
    expect(zhuan.panMethodNote).toBe("转盘法");
    const fei = extractQimenFacts(CHART, { panMethod: "fei" });
    expect(fei.panMethodNote).toContain("页面选择的是飞盘");
    expect(fei.panMethodNote).toContain("按转盘法存储");
  });

  it("检索信号以值符值使为首", () => {
    const sig = qimenSignals(extractQimenFacts(CHART));
    expect(sig[0].reason).toBe("值符");
    expect(sig[0].weight).toBe(10);
    expect(sig.some((x) => x.reason === "值使")).toBe(true);
    expect(sig.some((x) => x.reason === "阴阳遁")).toBe(true);
  });

  it("九宫图：洛书三行三列，值符值使标出，含起局校验", () => {
    const v = buildQimenChartView(CHART, { matter: "问事", panMethod: "zhuan" });
    expect(v.grid.map((g) => g.palace)).toEqual([4, 9, 2, 3, 5, 7, 8, 1, 6]);
    expect(v.grid.filter((g) => g.isZhifu)).toHaveLength(1);
    expect(v.grid.filter((g) => g.isZhishi)).toHaveLength(1);
    for (const g of v.grid) {
      expect(g.dir).toBeTruthy();
      expect(g.gua).toBeTruthy();
    }
    const labels = v.provenance.map((p) => p.label);
    expect(labels).toEqual(expect.arrayContaining(["所问何事", "四柱", "局数", "排盘法", "值符", "值使", "空亡"]));
    expect(v.provenance.find((p) => p.label === "排盘法")?.value).toBe("转盘法");
  });

  it("模板是局书体例，含方位取用，断语强调非铁口直断", () => {
    const tpl = getReportTemplate("qimen");
    expect(tpl).toBe(QIMEN_REPORT_TEMPLATE);
    expect(tpl.sections.map((s) => s.title)).toEqual([
      "局面速览", "起局校验", "用神与落宫", "格局吉凶", "方位取用", "时机与应期", "断语", "典籍依据", "局限与建议",
    ]);
    // 方位是奇门特有维度
    expect(tpl.sections.find((s) => s.id === "s5")?.brief).toContain("方位");
    expect(tpl.sections.find((s) => s.id === "s7")?.brief).toContain("不是铁口直断");
    // 转盘飞盘分歧要说明
    expect(tpl.sections.find((s) => s.id === "s9")?.brief).toContain("转盘飞盘");
  });

  it("端到端：按局书模板生成，标题为局书，自造小节被丢弃", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    const r = (await svc.generateReport("u1", "rec-q1")).content;

    expect(r.metadata.paipanType).toBe("qimen");
    expect(r.title).toContain("奇门");
    const ids = r.sections.map((s: any) => s.id);
    expect(ids).toContain("s3");
    expect(ids).toContain("s5");
    expect(ids).not.toContain("sQQ");
    expect(r.sections.find((s: any) => s.id === "s5").title).toBe("方位取用");
    expect(r.sections[0].content).toContain("所问：问这单生意能否成");
    expect(r.sections[0].content).toContain("宫（");
  });

  it("推演页按奇门步骤展示，且不调模型", async () => {
    const { svc, gateway } = setup();
    const pf = await svc.preflight("u1", "rec-q1");
    expect(gateway.chat).not.toHaveBeenCalled();
    expect(pf.steps.map((s: any) => s.key)).toEqual(["cast", "chart", "structure", "evidence", "compose"]);
    expect(pf.steps[0].title).toBe("定局");
    expect(pf.steps[2].detail).toContain("值符");
  });

  it("盘面数据缺失时明确拒绝，不生成空局书", async () => {
    const { svc } = setup({ gongs: [], juNumber: null });
    await expect(svc.generateReport("u1", "rec-q1")).rejects.toThrow("缺少盘面数据");
  });
});
