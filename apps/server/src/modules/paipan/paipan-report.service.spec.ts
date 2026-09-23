import { PaipanReportService } from "./paipan-report.service";
import { BusinessException } from "../../common/business.exception";

/**
 * 模拟验证：模型网关与依据检索均为 mock，验证报告组装规则；不代表真实模型输出质量已验收。
 */
const pillar = (gan: string, zhi: string, ganShiShen = "比", zhiShiShen = "劫") => ({
  gan, zhi, ganShiShen, zhiShiShen, nayin: "海中金", cangGan: [{ gan: "癸", shiShen: "印", type: "元" }],
});

const chartA: any = {
  input: { gender: "男" },
  siZhu: { nian: pillar("癸", "亥"), yue: pillar("甲", "寅"), ri: pillar("庚", "午"), shi: pillar("丙", "子") },
  geJu: { name: "偏财格", type: "zheng", yongShen: "土", xiShen: "金", jiShen: "火", desc: "" },
  wuXingEnergy: { mu: 3, huo: 2, tu: 1, jin: 1, shui: 3, desc: "" },
  shenSha: [
    { name: "天乙贵人", type: "ji", desc: "", pillar: "nian" },
    { name: "华盖", type: "zhong", desc: "", pillar: "shi" },
  ],
  qiYun: { desc: "3岁起运" },
  kongWang: "戌亥",
  wangXiang: "木旺",
};

function setup() {
  const store: any[] = [];
  const prisma: any = {
    paipanRecord: { findUnique: jest.fn() },
    aiAnalysisRecord: {
      findFirst: jest.fn(async ({ where }: any) =>
        store.filter((r) => r.userId === where.userId && r.paipanRecordId === where.paipanRecordId && r.analyzeType === where.analyzeType && r.school === where.school).pop() ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `r${store.length + 1}`, createdAt: new Date(), ...data };
        store.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(store.find((r) => r.id === where.id), data)),
      findUnique: jest.fn(async ({ where }: any) => store.find((r) => r.id === where.id) ?? null),
    },
  };
  const gateway: any = { chat: jest.fn() };
  const knowledge: any = {
    baziSignals: jest.fn(() => [{ value: "偏财格", weight: 10, reason: "格局" }]),
    groupDebates: jest.fn(() => []),
    findEvidence: jest.fn(async () => [
      { id: "ch-1", kind: "classic_excerpt", quotable: true, sourceKind: "classic_public", school: null, topic: "日主", title: "论庚金", content: "庚金带杀，刚健为最。", bookTitle: "穷通宝鉴", chapterTitle: "论庚金", classicBookId: "book-1", classicChapterId: "chap-1", version: 1, score: 6, matchedOn: ["日主「庚」"] },
      { id: "k-1", kind: "school_theory", quotable: false, sourceKind: "platform_expert", school: "ziping", topic: "格局", title: "偏财格概说", content: "偏财格以财为用。", bookTitle: null, chapterTitle: null, classicBookId: null, classicChapterId: null, version: 2, score: 12, matchedOn: ["格局「偏财格」"] },
    ]),
  };
  // 默认放行的门禁；个别用例改成拒绝
  const commerce: any = {
    assertReportAccess: jest.fn(async () => ({ granted: true, via: "purchased" })),
    reportAccess: jest.fn(async () => ({ granted: false, via: null, priceYuan: 29, includedVoiceMinutes: 30 })),
  };
  const svc = new PaipanReportService(prisma, gateway, knowledge, commerce);
  prisma.paipanRecord.findUnique.mockResolvedValue({ id: "rec-1", userId: "u1", paipanType: "BAZI", resultData: chartA });
  return { svc, prisma, gateway, knowledge, store, commerce };
}

const modelJson = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    summary: "日主庚金生于寅月，财星透出。",
    sections: [
      { sectionId: "s3", content: "庚金生于寅月，木旺金弱。", evidenceIds: ["E1", "E9"] },
      { sectionId: "s6", content: "偏财为用，《滴天髓》亦有论及。", evidenceIds: ["E2"] },
      { sectionId: "sX-模型自造", content: "平台模板里没有这一节，应被丢弃。", evidenceIds: [] },
    ],
    limitations: ["仅依据子平法"],
    ...extra,
  });

describe("PaipanReportService", () => {
  it("盘面事实来自引擎字段，引用只来自真实检索依据，记录网关返回的实际模型", async () => {
    const { svc, gateway, prisma } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "deepseek-v4-flash", usage: { totalTokens: 900 } });

    const res = await svc.generateReport("u1", "rec-1");
    const report = res.content;

    expect(gateway.chat).toHaveBeenCalledWith(expect.objectContaining({ scene: "paipan_report", skipCache: true }));
    const factSection = report.sections[0];
    expect(factSection.type).toBe("fact");
    expect(factSection.content).toContain("癸亥年 甲寅月 庚午日 丙子时");
    expect(factSection.content).toContain("格局：偏财格（正格）");
    // 柱位要出中文：引擎内部的 nian/yue/ri/shi 不许露到用户面前
    expect(factSection.content).toContain("天乙贵人(年柱)");
    // 五行能量是加权分不是个数，口径要写在正文里，否则「木3」会被当成「木只有 3 个」
    expect(factSection.content).toContain("含藏干加权分，非个数");
    expect(factSection.content).toContain("华盖(时柱)");
    expect(factSection.content).not.toMatch(/\((nian|yue|ri|shi)\)/);
    // 癸亥 甲寅 庚午 丙子：水3 木2 火2 金1 土0
    expect(report.facts.wuXingCount).toEqual({ 木: 2, 火: 2, 土: 0, 金: 1, 水: 3 });
    expect((report.facts.pillarItems as any[])[2]).toMatchObject({ label: "日", gan: "庚", zhi: "午", ganWuXing: "金", zhiWuXing: "火" });

    // E9 不存在 → 剔除并记录；E1/E2 来自检索
    // 平台定结构：小节编号与标题来自模板，不由模型决定
    const s3 = report.sections.find((x) => x.id === "s3")!;
    expect(s3.title).toBe("日主与格局"); // 模板标题，不是模型写的“日主与月令”
    expect(s3.evidenceIds).toEqual(["E1"]);
    expect(s3.references?.[0]).toMatchObject({ refId: "ch-1", bookId: "book-1", chapterId: "chap-1", source: "《穷通宝鉴》", chapter: "论庚金" });
    const s6 = report.sections.find((x) => x.id === "s6")!;
    expect(s6.title).toBe("财富结构");
    expect(s6.schools).toEqual(["ziping"]);
    // 模型自造的小节被丢弃
    expect(report.sections.some((x) => x.id.startsWith("sX"))).toBe(false);
    // 模板顺序固定：s3 在 s6 之前；未填写的必填小节留占位而不是消失
    const ids = report.sections.map((x) => x.id);
    expect(ids.indexOf("s3")).toBeLessThan(ids.indexOf("s6"));
    expect(ids).toContain("s4");
    expect(report.sections.find((x) => x.id === "s4")?.content).toContain("依据不足");
    // s8 身心与健康标了 hideWhenEmpty，没内容就不出现
    expect(ids).not.toContain("s8");
    expect(report.dialogueOutline.map((o) => o.sectionId)).toEqual(ids.filter((i) => i !== "s1"));
    expect(report.metadata.droppedEvidenceIds).toEqual(["E9"]);
    // 正文提到但不在依据中的书名被标为未核实
    expect(report.metadata.unverifiedBookMentions).toEqual(["《滴天髓》"]);
    expect(report.sections.at(-1)?.content).toContain("未经核实");
    // 而且正文里那个书名要被摘掉——用户读的是正文，末尾小字救不回一句「《滴天髓》亦有论及」
    expect(s6.content).not.toContain("《滴天髓》");
    expect(s6.content).toContain("传统说法");
    // 隐去的是书名，不是内容；原书名仍留在 metadata 里供运营追查模型幻觉
    expect(report.sections.at(-1)?.content).toContain("已隐去书名");
    expect(report.metadata.model).toBe("deepseek-v4-flash");
    expect(report.references.map((r) => r.refId)).toEqual(["ch-1", "k-1"]);

    const saved = prisma.aiAnalysisRecord.create.mock.calls[0][0].data;
    expect(saved.modelName).toBe("deepseek-v4-flash");
    expect(saved.analyzeType).toBe("REPORT_GENERAL");
    expect(saved.scene).toBe("paipan_report");
  });

  it("相同盘面与依据命中复用，不再调用模型；regenerate 时更新同一记录", async () => {
    const { svc, gateway, prisma } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1" });
    const first = await svc.generateReport("u1", "rec-1");
    const second = await svc.generateReport("u1", "rec-1");
    expect(gateway.chat).toHaveBeenCalledTimes(1);
    expect(second.reused).toBe(true);
    expect(second.id).toBe(first.id);

    await svc.generateReport("u1", "rec-1", "general", { regenerate: true });
    expect(gateway.chat).toHaveBeenCalledTimes(2);
    expect(prisma.aiAnalysisRecord.create).toHaveBeenCalledTimes(1);
    expect(prisma.aiAnalysisRecord.update).toHaveBeenCalledTimes(1);
  });

  it("不同盘面版本不同，不会复用上一盘的报告", async () => {
    const { svc } = setup();
    const f1 = svc.extractBaziFacts(chartA);
    const f2 = svc.extractBaziFacts({ ...chartA, siZhu: { ...chartA.siZhu, ri: pillar("辛", "未") } });
    expect(svc.calculateReportVersion(f1, [], "general")).not.toBe(svc.calculateReportVersion(f2, [], "general"));
  });

  it("模型失败或输出不合格时抛错且不落库", async () => {
    const { svc, gateway, prisma } = setup();
    gateway.chat.mockRejectedValueOnce(new Error("timeout"));
    await expect(svc.generateReport("u1", "rec-1")).rejects.toThrow("报告生成失败");
    gateway.chat.mockResolvedValueOnce({ content: "这不是JSON", model: "m" });
    await expect(svc.generateReport("u1", "rec-1")).rejects.toThrow("未保存");
    gateway.chat.mockResolvedValueOnce({ content: JSON.stringify({ summary: "x", sections: [] }), model: "m" });
    await expect(svc.generateReport("u1", "rec-1")).rejects.toBeInstanceOf(BusinessException);
    expect(prisma.aiAnalysisRecord.create).not.toHaveBeenCalled();
  });

  it("无检索依据时明确说明且提示词禁止引用书籍", async () => {
    const { svc, gateway, knowledge } = setup();
    knowledge.findEvidence.mockResolvedValueOnce([]);
    gateway.chat.mockResolvedValue({
      content: JSON.stringify({ summary: "概述", sections: [{ sectionId: "s3", content: "正文", evidenceIds: ["E1"] }] }),
      model: "m",
    });
    const res = await svc.generateReport("u1", "rec-1");
    const userPrompt = gateway.chat.mock.calls[0][0].messages[1].content;
    expect(userPrompt).toContain("不得引用任何书籍");
    expect(knowledge.findEvidence).toHaveBeenCalledWith(expect.objectContaining({ paipanType: "bazi" }));
    expect(res.content.references).toHaveLength(0);
    expect(res.content.metadata.droppedEvidenceIds).toEqual(["E1"]);
    expect(res.content.sections.at(-1)?.content).toContain("暂无与本盘匹配的已审核");
  });

  it("他人盘面拒绝访问；未支持的盘类型明确拒绝，不生成占位报告", async () => {
    const { svc, prisma, gateway } = setup();
    await expect(svc.generateReport("u2", "rec-1")).rejects.toThrow("无权访问");
    // 紫微已于 2026-09-18 接入，这里用仍未接入的类型（阳宅）验拒绝
    prisma.paipanRecord.findUnique.mockResolvedValueOnce({ id: "z", userId: "u1", paipanType: "__NOT_A_TOOL__", resultData: {} });
    await expect(svc.generateReport("u1", "z")).rejects.toThrow("暂不支持");
    expect(gateway.chat).not.toHaveBeenCalled();
  });

  it("付费门禁：未购买且非会员时在任何模型调用与复用之前拒绝", async () => {
    const { svc, gateway, commerce } = setup();
    commerce.assertReportAccess.mockRejectedValueOnce(new Error("这份报告需购买（29 元，含 30 分钟 AI 语音对话）或开通小卜AI会员后生成"));
    await expect(svc.generateReport("u1", "rec-1", "career")).rejects.toThrow("需购买");
    expect(commerce.assertReportAccess).toHaveBeenCalledWith("u1", "rec-1", "career");
    expect(gateway.chat).not.toHaveBeenCalled();
  });

  it("门禁按归一后的报告类型判断；别人的盘先报无权，不泄露价格信息", async () => {
    const { svc, gateway, commerce, prisma } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1", usage: {} });
    await svc.generateReport("u1", "rec-1", "不存在的类型");
    expect(commerce.assertReportAccess).toHaveBeenCalledWith("u1", "rec-1", "general");
    prisma.paipanRecord.findUnique.mockResolvedValueOnce({ id: "rec-2", userId: "u2", paipanType: "BAZI", resultData: chartA });
    await expect(svc.reportAccess("u1", "rec-2", "general")).rejects.toThrow("无权");
    const access = await svc.reportAccess("u1", "rec-1", "love");
    expect(access).toMatchObject({ recordId: "rec-1", reportType: "love", granted: false, priceYuan: 29 });
  });

  it("推演页数据：如实反映校时、取格与依据命中，且不调模型", async () => {
    const { svc, gateway } = setup();
    const pf = await svc.preflight("u1", "rec-1");

    expect(gateway.chat).not.toHaveBeenCalled(); // 确定性计算，不花模型钱
    expect(pf.steps.map((s) => s.key)).toEqual(["time", "chart", "structure", "evidence", "compose"]);
    expect(pf.steps[1].detail).toContain("癸亥年 甲寅月 庚午日 丙子时");
    expect(pf.steps[2].detail).toContain("偏财格");
    expect(pf.steps[3].detail).toContain("命中 2 条");
    // 三印：有古籍依据盖「典」，有门派依据盖「派」
    expect(pf.seals).toMatchObject({ pan: true, pai: true, dian: true, evidenceCount: 2 });
    expect(pf.seals.schools).toEqual(["ziping"]);
  });

  it("推演页：知识库无命中时如实说明，不假装有依据", async () => {
    const { svc, knowledge } = setup();
    knowledge.findEvidence.mockResolvedValueOnce([]);
    const pf = await svc.preflight("u1", "rec-1");
    expect(pf.steps[3].detail).toContain("暂无与本盘匹配的已审核依据");
    expect(pf.seals).toMatchObject({ pai: false, dian: false, evidenceCount: 0 });
  });

  it("getReport 校验归属与场景", async () => {
    const { svc, gateway, commerce } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m" });
    const { id } = await svc.generateReport("u1", "rec-1");
    await expect(svc.getReport("u2", id)).rejects.toThrow("无权访问");
    expect((await svc.getReport("u1", id)).content.metadata.model).toBe("m");
    commerce.assertReportAccess.mockRejectedValueOnce(new Error("购买权益已撤销"));
    await expect(svc.getReport("u1", id)).rejects.toThrow("购买权益已撤销");
  });

  it("旧报告正文缺类型时从存档分析类型补推权益门禁", async () => {
    const { svc, prisma, commerce } = setup();
    prisma.aiAnalysisRecord.findUnique.mockResolvedValueOnce({
      id: "old", userId: "u1", scene: "paipan_report", paipanRecordId: "rec-1",
      analyzeType: "REPORT_CAREER", analysisContent: JSON.stringify({ metadata: {}, sections: [] }),
    });
    commerce.assertReportAccess.mockRejectedValueOnce(new Error("购买权益已撤销"));
    await expect(svc.getReport("u1", "old")).rejects.toThrow("购买权益已撤销");
    expect(commerce.assertReportAccess).toHaveBeenCalledWith("u1", "rec-1", "career");
  });

  it("报告关联他人原盘时拒绝交付正文，不查询购买权益", async () => {
    const { svc, prisma, commerce } = setup();
    prisma.aiAnalysisRecord.findUnique.mockResolvedValue({
      id: "mislinked", userId: "u1", scene: "paipan_report", paipanRecordId: "rec-other",
      analyzeType: "REPORT_GENERAL", analysisContent: JSON.stringify({ metadata: { reportType: "general" }, sections: [] }),
    });
    prisma.paipanRecord.findUnique.mockResolvedValue({ userId: "u2" });
    await expect(svc.getReport("u1", "mislinked")).rejects.toThrow("原排盘记录不存在");
    expect(commerce.assertReportAccess).not.toHaveBeenCalled();
  });

  it("报告目录只查询本人结构化报告，分页且不返回正文", async () => {
    const { svc, prisma } = setup();
    prisma.aiAnalysisRecord.findMany = jest.fn().mockResolvedValue([{
      id: "report-1", paipanRecordId: "rec-1", analyzeType: "REPORT_CAREER", createdAt: new Date(),
      paipanRecord: { clientName: "张某", paipanType: "BAZI" },
    }]);
    prisma.aiAnalysisRecord.count = jest.fn().mockResolvedValue(21);

    const result = await svc.listReports("u1", "2");
    expect(prisma.aiAnalysisRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "u1", scene: "paipan_report", analyzeType: { startsWith: "REPORT_" } },
      skip: 20,
      take: 20,
      select: expect.not.objectContaining({ analysisContent: true }),
    }));
    expect(result).toMatchObject({ total: 21, page: 2, pageSize: 20, items: [{ clientName: "张某", paipanType: "BAZI", reportType: "career" }] });
    expect(result.items[0]).not.toHaveProperty("paipanRecord");
    expect(prisma.aiAnalysisRecord.findMany.mock.calls[0][0].select).not.toHaveProperty("outputSummary");
  });
});
