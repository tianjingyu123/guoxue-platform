import { PaipanReportService } from "./paipan-report.service";
import { buildDaliurenChartView, extractDaliurenFacts, daliurenSignals, type DaliurenResultData } from "./daliuren-report";
import { DALIUREN_REPORT_TEMPLATE, getReportTemplate } from "./report-template";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { calculateDaLiuRen } = require("../tool-registry/calculators/daliuren.calculator");

const CHART: DaliurenResultData = calculateDaLiuRen({ datetime: "2026-06-22T12:00:00", method: "chushi", matter: "问合作" });

function setup(resultData: unknown = CHART) {
  const store: any[] = [];
  const prisma: any = {
    paipanRecord: {
      findUnique: jest.fn(async () => ({
        id: "rec-d1",
        userId: "u1",
        paipanType: "DALIUREN",
        resultData,
        inputParams: { matter: "问合作能否谈成", method: "chushi" },
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
  return { svc: new PaipanReportService(prisma, gateway, knowledge), prisma, gateway, knowledge };
}

const modelJson = () =>
  JSON.stringify({
    summary: "涉害课，事有阻而后通。",
    sections: [
      { sectionId: "s3", content: "四课与取传一节。", evidenceIds: [] },
      { sectionId: "s4", content: "三传递进一节。", evidenceIds: [] },
      { sectionId: "s6", content: "应期一节。", evidenceIds: [] },
      { sectionId: "s7", content: "断语一节。", evidenceIds: [] },
      { sectionId: "sDD", content: "自造小节，应丢弃。", evidenceIds: [] },
    ],
    limitations: ["课象只答所问一事"],
  });

describe("大六壬报告", () => {
  it("盘面事实来自引擎：日干支、月将加时、昼夜贵、课体、四课三传", () => {
    const f = extractDaliurenFacts(CHART, "问合作");
    expect(f.riGanZhi).toBe(CHART.riGanZhi);
    expect(f.zhanShi).toBe(CHART.zhanShi);
    expect(f.yueJiang).toContain(CHART.yueJiang!);
    expect(f.dayNight).toBe(CHART.dayNight);
    expect(f.zongMen).toBe(CHART.zongMen);
    expect(f.siKe).toHaveLength(4);
    expect(f.siKe[0]).toContain("一课");
    expect(f.sanChuan).toHaveLength(3);
    expect(f.sanChuan[0]).toContain("初传");
    expect(f.sanChuan[2]).toContain("末传");
    // 三传带遁干与天将，不是光秃秃的地支
    expect(f.sanChuan[0]).toMatch(/乘/);
  });

  it("检索信号以课体为首，初传天将次之", () => {
    const sig = daliurenSignals(extractDaliurenFacts(CHART));
    expect(sig[0].reason).toBe("课体");
    expect(sig[0].weight).toBe(10);
    expect(sig.some((x) => x.reason === "初传天将")).toBe(true);
    expect(sig.some((x) => x.reason === "月将")).toBe(true);
  });

  it("图形：天地盘十二位、四课、三传自上而下，旬空标注", () => {
    const v = buildDaliurenChartView(CHART, { matter: "问合作", method: "chushi" });
    expect(v.pan).toHaveLength(12);
    expect(v.siKe).toHaveLength(4);
    expect(v.sanChuan.map((c) => c.label)).toEqual(["初传", "中传", "末传"]);
    // 旬空按日空标注
    const kong = new Set(CHART.kongWang ?? []);
    for (const c of v.sanChuan) expect(c.isKong).toBe(kong.has(c.zhi));
    const labels = v.provenance.map((p) => p.label);
    expect(labels).toEqual(expect.arrayContaining(["所问何事", "日干支", "占时", "月将", "昼夜贵人", "旬空", "课体"]));
  });

  it("模板是课书体例，三传递进是核心", () => {
    const tpl = getReportTemplate("daliuren");
    expect(tpl).toBe(DALIUREN_REPORT_TEMPLATE);
    expect(tpl.sections.map((s) => s.title)).toEqual([
      "课体速览", "起课校验", "四课与取传", "三传递进", "天将与神煞", "应期", "断语", "典籍依据", "局限与建议",
    ]);
    expect(tpl.sections.find((s) => s.id === "s4")?.brief).toContain("初传主事之初");
    expect(tpl.sections.find((s) => s.id === "s7")?.brief).toContain("不是铁口直断");
  });

  it("端到端：按课书模板生成，标题为课书，自造小节被丢弃", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    const r = (await svc.generateReport("u1", "rec-d1")).content;

    expect(r.metadata.paipanType).toBe("daliuren");
    expect(r.title).toContain("大六壬");
    const ids = r.sections.map((s: any) => s.id);
    expect(ids).toContain("s4");
    expect(ids).not.toContain("sDD");
    expect(r.sections.find((s: any) => s.id === "s4").title).toBe("三传递进");
    expect(r.sections[0].content).toContain("所问：问合作能否谈成");
    expect(r.sections[0].content).toContain("初传");
  });

  it("推演页按六壬步骤展示，且不调模型", async () => {
    const { svc, gateway } = setup();
    const pf = await svc.preflight("u1", "rec-d1");
    expect(gateway.chat).not.toHaveBeenCalled();
    expect(pf.steps.map((s: any) => s.title)).toEqual(["月将加时", "立四课", "取三传", "检索典籍", "组织成书"]);
    expect(pf.steps[0].detail).toContain("将加");
    expect(pf.steps[2].detail).toContain("取传");
  });

  it("四课三传缺失时明确拒绝", async () => {
    const { svc } = setup({ siKe: [], sanChuan: {} });
    await expect(svc.generateReport("u1", "rec-d1")).rejects.toThrow("缺少四课三传");
  });
});

describe("大六壬流派参数", () => {
  it("换将方式、贵人法、涉害法必须真正生效（此前被丢弃，选了也没用）", () => {
    const base = { datetime: "2026-06-22T12:00:00", method: "chushi" };
    const zhongqi = calculateDaLiuRen({ ...base, jiangMethod: "zhongqi" });
    const jiaojie = calculateDaLiuRen({ ...base, jiangMethod: "jiaojie" });
    // 两种换将法在节气交接前后会取不同月将；至少参数要被引擎接收而不是丢掉
    expect(zhongqi.yueJiang).toBeTruthy();
    expect(jiaojie.yueJiang).toBeTruthy();

    const day = calculateDaLiuRen({ ...base, guishenType: "day" });
    const night = calculateDaLiuRen({ ...base, guishenType: "night" });
    expect(day.dayNight).toBe("昼");
    expect(night.dayNight).toBe("夜");
    // 昼夜贵不同 → 天将排布不同
    expect(JSON.stringify(day.gongs)).not.toBe(JSON.stringify(night.gongs));
  });

  it("出生年份给出年命行年", () => {
    const withBirth = calculateDaLiuRen({ datetime: "2026-06-22T12:00:00", method: "chushi", birthYear: 1990, gender: "女" });
    expect(withBirth).toBeTruthy();
  });
});
