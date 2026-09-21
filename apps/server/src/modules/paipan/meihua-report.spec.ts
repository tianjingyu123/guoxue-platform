import { PaipanReportService } from "./paipan-report.service";
import { buildMeihuaChartView, extractMeihuaFacts, meihuaSignals, type MeihuaComputed } from "./meihua-report";
import { MEIHUA_REPORT_TEMPLATE, getReportTemplate } from "./report-template";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computeMeihua } = require("@guoxue/shared/paipan");

const INPUT = { year: 2026, month: 6, day: 22, hour: 12, minute: 0, mode: "time", lunarMonth: 5, lunarDay: 8 };

function setup() {
  const store: any[] = [];
  const prisma: any = {
    paipanRecord: {
      findUnique: jest.fn(async () => ({
        id: "rec-m1",
        userId: "u1",
        paipanType: "MEIHUA",
        resultData: {},
        inputParams: { ...INPUT, matter: "问合作能否谈成", ganzhi: "丙午年 甲午月 丁卯日 丙午时", lunarText: "五月初八" },
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
  const knowledge: any = {
    baziSignals: jest.fn(() => []),
    findEvidence: jest.fn(async () => []),
    groupDebates: jest.fn(() => []),
  };
  return { svc: new PaipanReportService(prisma, gateway, knowledge), prisma, gateway, knowledge };
}

const modelJson = () =>
  JSON.stringify({
    summary: "体用相生，合作可成。",
    sections: [
      { sectionId: "s3", content: "体用与生克一节。", evidenceIds: [] },
      { sectionId: "s4", content: "类象一节。", evidenceIds: [] },
      { sectionId: "s6", content: "变卦一节。", evidenceIds: [] },
      { sectionId: "s7", content: "断语一节。", evidenceIds: [] },
      { sectionId: "sZZ", content: "自造小节，应丢弃。", evidenceIds: [] },
    ],
    limitations: ["只答所问一事"],
  });

describe("梅花易数报告", () => {
  it("事实来自共用引擎：五卦、体用、动爻、起卦算式", () => {
    const data = computeMeihua(INPUT) as MeihuaComputed;
    const f = extractMeihuaFacts(data, { matter: "问合作" });

    expect(f.benGua).toBe(data.ben.name);
    expect(f.huGua).toBe(data.hu.name);
    expect(f.bianGua).toBe(data.bian.name);
    expect(f.cuoGua).toBe(data.cuo.name);
    expect(f.zongGua).toBe(data.zong.name);
    expect(f.tiName).toBe(data.tiyong.tiName);
    expect(f.yongName).toBe(data.tiyong.yongName);
    expect(f.relation).toBe(data.tiyong.relation);
    expect(f.formula).toContain("时间起卦");
    // 体用位置说明与动爻位置一致
    expect(f.tiPosition).toContain(data.tiyong.movingInLower ? "上卦为体" : "下卦为体");
  });

  it("检索信号以体用关系为首，且带命中理由", () => {
    const f = extractMeihuaFacts(computeMeihua(INPUT) as MeihuaComputed);
    const sig = meihuaSignals(f);
    expect(sig[0].weight).toBe(10);
    expect(sig[0].reason).toBe("体用关系");
    expect(sig.some((x) => x.reason === "体卦")).toBe(true);
    expect(sig.some((x) => x.reason === "变卦")).toBe(true);
  });

  it("卦象图：五卦并列，本卦标动爻，含起卦校验", () => {
    const data = computeMeihua(INPUT) as MeihuaComputed;
    const v = buildMeihuaChartView(data, { matter: "问合作", mode: "time", ganzhi: "丙午年…", lunar: "五月初八" });

    expect(v.hexes.map((h) => h.label)).toEqual(["本卦", "互卦", "变卦", "错卦", "综卦"]);
    expect(v.hexes[0].movingYao).toBe(data.moving);
    expect(v.hexes[0].lines).toHaveLength(6);
    expect(v.tiyong.relationHint.length).toBeGreaterThan(4);
    const labels = v.provenance.map((p) => p.label);
    expect(labels).toEqual(expect.arrayContaining(["所问何事", "起卦方式", "起卦算式", "动爻", "本卦卦宫", "测数"]));
  });

  it("模板是体用体例，断语强调非铁口直断", () => {
    const tpl = getReportTemplate("meihua");
    expect(tpl).toBe(MEIHUA_REPORT_TEMPLATE);
    expect(tpl.sections.map((s) => s.title)).toEqual([
      "卦象速览", "起卦校验", "体用与生克", "卦象类象", "互卦与过程", "变卦与结果", "断语", "典籍依据", "局限与建议",
    ]);
    expect(tpl.sections.find((s) => s.id === "s7")?.brief).toContain("不是铁口直断");
  });

  it("端到端：按梅花模板生成，标题为卦书，自造小节被丢弃", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    const r = (await svc.generateReport("u1", "rec-m1")).content;

    expect(r.metadata.paipanType).toBe("meihua");
    expect(r.title).toContain("梅花易数");
    const ids = r.sections.map((s: any) => s.id);
    expect(ids).toContain("s3");
    expect(ids).not.toContain("sZZ");
    expect(r.sections.find((s: any) => s.id === "s3").title).toBe("体用与生克");
    // 盘面事实含五卦与体用
    expect(r.sections[0].content).toContain("互卦：");
    expect(r.sections[0].content).toContain("体卦：");
    expect(r.sections[0].content).toContain("所问：问合作能否谈成");
  });

  it("推演页按梅花步骤展示，且不调模型", async () => {
    const { svc, gateway } = setup();
    const pf = await svc.preflight("u1", "rec-m1");
    expect(gateway.chat).not.toHaveBeenCalled();
    expect(pf.steps.map((s: any) => s.key)).toEqual(["cast", "chart", "structure", "evidence", "compose"]);
    expect(pf.steps[0].detail).toContain("时间起卦");
    expect(pf.steps[1].detail).toContain("本卦");
    expect(pf.steps[2].detail).toContain("体");
  });
});
