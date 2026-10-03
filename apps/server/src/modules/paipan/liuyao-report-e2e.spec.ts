import { PaipanReportService } from "./paipan-report.service";

/**
 * 六爻报告端到端（mock 模型 + 内存库）：
 * 从「起卦参数」到「按卦书模板组装好的报告」整条链路。
 */
function setup() {
  const store: any[] = [];
  const prisma: any = {
    paipanRecord: {
      findUnique: jest.fn(async () => ({
        id: "rec-l1",
        userId: "u1",
        paipanType: "LIUYAO",
        // 存库结果是给列表用的精简版；报告按 inputParams 重算，故这里放什么都不影响
        resultData: { summary: "精简结果" },
        inputParams: { year: 2026, month: 6, day: 22, hour: 12, method: "coin", coins: "6,7,8,9,7,8", matter: "问今年能否换工作" },
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
    groupDebates: jest.fn(() => []),
    findEvidence: jest.fn(async () => [
      {
        id: "k-1",
        kind: "knowledge_point",
        quotable: false,
        sourceKind: "platform_expert",
        school: null,
        topic: "用神",
        title: "问事取用神",
        content: "问工作变动，以官鬼为用。",
        bookTitle: null,
        chapterTitle: null,
        classicBookId: null,
        classicChapterId: null,
        version: 1,
        score: 10,
        matchedOn: ["持世「妻财持世」"],
      },
    ]),
  };
  return { svc: new PaipanReportService(prisma, gateway, knowledge, { assertReportAccess: jest.fn() } as any), prisma, gateway, knowledge, store };
}

const modelJson = () =>
  JSON.stringify({
    summary: "妻财持世，工作变动以官鬼为用，需看官鬼旺衰。",
    sections: [
      { sectionId: "s3", content: "问工作变动取官鬼为用神；世为自身，应为对方单位。", evidenceIds: ["E1"] },
      { sectionId: "s4", content: "日辰生扶用神，月建不助。", evidenceIds: [] },
      { sectionId: "s6", content: "应期看出空之月。", evidenceIds: [] },
      { sectionId: "s7", content: "倾向可成，但需主动争取。", evidenceIds: [] },
      { sectionId: "s99", content: "模型自造的小节，应被丢弃。", evidenceIds: [] },
    ],
    limitations: ["卦象只答所问一事"],
  });

describe("六爻报告端到端", () => {
  it("按卦书模板生成：标题、章节编号与顺序来自模板，自造小节被丢弃", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1", usage: { totalTokens: 500 } });

    const res = await svc.generateReport("u1", "rec-l1");
    const r = res.content;

    expect(r.title).toContain("六爻");
    expect(r.metadata.paipanType).toBe("liuyao");

    const ids = r.sections.map((s: any) => s.id);
    expect(ids[0]).toBe("s1"); // 盘面事实
    expect(ids).toContain("s3");
    expect(ids).toContain("s7");
    expect(ids).not.toContain("s99"); // 模型自造被丢弃
    expect(r.sections.find((s: any) => s.id === "s3").title).toBe("用神与世应");
    expect(r.sections.find((s: any) => s.id === "s7").title).toBe("断语");
    // s5 动变标了 hideWhenEmpty，模型没填则不出现
    expect(ids).not.toContain("s5");
  });

  it("盘面事实来自引擎重算：卦名、世应、四柱旬空、所问之事", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    const r = (await svc.generateReport("u1", "rec-l1")).content;

    const s1 = r.sections[0];
    expect(s1.type).toBe("fact");
    expect(s1.content).toContain("所问：问今年能否换工作");
    expect(s1.content).toContain("本卦：");
    expect(s1.content).toContain("世应：");
    expect(s1.content).toContain("日空：");
    // 六爻不应出现八字的字段
    expect(s1.content).not.toContain("大运");
  });

  it("卦面图形随报告下发：六爻自上而下、含六神六亲纳甲与起卦校验", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    const r = (await svc.generateReport("u1", "rec-l1")).content as any;

    expect(r.chartView.lines).toHaveLength(6);
    expect(r.chartView.lines[0].position).toBe(6);
    expect(r.chartView.provenance.find((p: any) => p.label === "起卦方式").value).toBe("三枚铜钱摇卦");
    expect(r.chartView.benName).toBeTruthy();
  });

  it("推演页按六爻的步骤展示，且不调模型", async () => {
    const { svc, gateway } = setup();
    const pf = await svc.preflight("u1", "rec-l1");

    expect(gateway.chat).not.toHaveBeenCalled();
    expect(pf.steps.map((s: any) => s.key)).toEqual(["cast", "chart", "structure", "evidence", "compose"]);
    expect(pf.steps[0].detail).toContain("三枚铜钱摇卦");
    expect(pf.steps[2].detail).toContain("世在第");
    expect(pf.seals.evidenceCount).toBe(1);
  });

  it("检索用六爻信号（持世/卦宫），不是八字信号", async () => {
    const { svc, gateway, knowledge } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    await svc.generateReport("u1", "rec-l1");

    expect(knowledge.baziSignals).not.toHaveBeenCalled();
    const call = knowledge.findEvidence.mock.calls[0][0];
    expect(call.paipanType).toBe("liuyao");
    expect(call.signals[0].reason).toBe("持世");
  });

  it("不支持的盘类型明确拒绝，不生成占位报告", async () => {
    const { svc, prisma } = setup();
    // 阳盘命理 2026-09-18 也接入了，改用一个不会被实现的假类型，免得每接一个工具就改一次
    prisma.paipanRecord.findUnique.mockResolvedValue({ id: "x", userId: "u1", paipanType: "__NOT_A_TOOL__", resultData: {}, inputParams: {} });
    await expect(svc.generateReport("u1", "x")).rejects.toThrow("暂不支持");
  });
});
