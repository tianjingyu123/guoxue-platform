import { PaipanReportKnowledgeService } from "./paipan-report-knowledge.service";

/** 模拟验证：内存版 paipanReportKnowledge 表；真实查询语义见 audio-asset.service.integration.spec 中的知识库用例 */
function fakePrisma() {
  const rows = new Map<string, any>();
  let seq = 0;
  const t = {
    create: jest.fn(async ({ data }: any) => {
      const row = { id: `k${++seq}`, reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: new Date(), updatedAt: new Date(), ...data };
      rows.set(row.id, row);
      return row;
    }),
    findUnique: jest.fn(async ({ where }: any) => rows.get(where.id) ?? null),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const row = rows.get(where.id);
      if (!row || row.status !== where.status || row.version !== where.version) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    }),
    update: jest.fn(async ({ where, data }: any) => Object.assign(rows.get(where.id), data)),
    findMany: jest.fn(async ({ where }: any) =>
      [...rows.values()].filter(
        (r) =>
          r.paipanType === where.paipanType &&
          r.status === where.status &&
          // 2026-09-18 起不再按门派过滤：报告要汇总各派观点，过滤掉别派就无从对照
          r.tags.some((tag: string) => where.tags.hasSome.includes(tag)),
      ),
    ),
    count: jest.fn(async () => rows.size),
  };
  return { prisma: { paipanReportKnowledge: t } as any, rows };
}

const draft = {
  kind: "school_theory" as const,
  school: "ziping",
  topic: "格局",
  tags: ["偏财格", " 偏财格 ", ""],
  title: "偏财格取用",
  content: "月令偏财透干，取偏财格。",
};

describe("PaipanReportKnowledgeService 管理", () => {
  it("新建为草稿，标签去重去空；古籍原文必须有书名；无标签拒绝", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const row = await svc.create(draft, "admin1");
    expect(row.status).toBe("DRAFT");
    expect(row.version).toBe(1);
    expect(row.tags).toEqual(["偏财格"]);
    await expect(svc.create({ ...draft, kind: "classic_excerpt" }, "admin1")).rejects.toThrow("必须填写书名");
    await expect(svc.create({ ...draft, tags: [] }, "admin1")).rejects.toThrow("匹配标签");
  });

  it("只有审核通过的条目会被报告检索到；停用后不再命中", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const row = await svc.create(draft, "admin1");
    const signals = svc.baziSignals({ geJu: "偏财格" });
    expect(await svc.findEvidence({ paipanType: "bazi", school: "ziping", signals })).toHaveLength(0);
    await svc.approve(row.id, "reviewer1", "核对无误");
    const hits = await svc.findEvidence({ paipanType: "bazi", school: "ziping", signals });
    expect(hits).toHaveLength(1);
    expect(hits[0].matchedOn).toEqual(["格局「偏财格」"]);
    // 2026-09-18 改：未指定门派时，各派条目照样取得到——报告的定位是「各门各派对这个盘怎么看」的
    // 汇总，早先把别派挡在外面，报告就只剩一家之言，也无从做观点对照。
    // 指定门派只影响排序权重（同派条目靠前），不再作为过滤条件。
    const noSchool = await svc.findEvidence({ paipanType: "bazi", signals });
    expect(noSchool).toHaveLength(1);
    expect(noSchool[0].school).toBe("ziping");
    // 指定本派时该条目得分更高
    expect(hits[0].score).toBeGreaterThan(noSchool[0].score);
    await svc.retire(row.id, "admin1");
    expect(await svc.findEvidence({ paipanType: "bazi", school: "ziping", signals })).toHaveLength(0);
  });

  it("修改已审核条目：版本 +1 并退回草稿，需重新审核", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const row = await svc.create(draft, "admin1");
    await svc.approve(row.id, "reviewer1");
    const updated = await svc.update(row.id, { content: "修订后的要点" }, "admin2");
    expect(updated.status).toBe("DRAFT");
    expect(updated.version).toBe(2);
    expect(updated.reviewedBy).toBeNull();
    await expect(svc.approve(row.id, "reviewer1")).resolves.toMatchObject({ status: "APPROVED", version: 2 });
  });

  // ── 来源与可引用性（著作权红线）──
  // 著作权保护表达不保护思想：理论方法用自己的话重述可入库；逐字复制他人表达即使注明来源也不免责。
  it("非公版来源不能作为「古籍原文」条目", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    await expect(
      svc.create(
        { ...draft, kind: "classic_excerpt", bookTitle: "某现代著作", sourceKind: "modern_work", restated: true, sourceRefs: [{ label: "某书" }] },
        "admin1",
      ),
    ).rejects.toThrow("只有公版古籍白文可作为原文条目");
  });

  it("知识要点：必须重述，网络/现代著作来源必须留来源线索", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const base = { ...draft, kind: "knowledge_point" as const, title: "阴盘奇门用神取法", content: "（平台整理）阴盘奇门以……" };

    await expect(svc.create({ ...base, sourceKind: "web", restated: false, sourceRefs: [{ label: "某站" }] }, "a")).rejects.toThrow("自己的话重述");
    await expect(svc.create({ ...base, sourceKind: "web", restated: true, sourceRefs: [] }, "a")).rejects.toThrow("来源线索");

    const ok = await svc.create(
      { ...base, sourceKind: "web", restated: true, sourceRefs: [{ label: "某公开教程", url: "https://example.com/a", note: "已与另两处说法交叉核对" }] },
      "a",
    );
    expect(ok.sourceKind).toBe("web");
    expect(ok.sourceRefs).toHaveLength(1);
    // 关键：非公版来源永远不可按“原文”展示
    expect(ok.quotable).toBe(false);
  });

  it("平台自行撰写的知识要点无需外部来源线索", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const row = await svc.create({ ...draft, kind: "knowledge_point", sourceKind: "platform_expert" }, "a");
    expect(row.quotable).toBe(false);
    expect(row.restated).toBe(true);
  });

  it("公版古籍原文条目 quotable=true，可展示原文并跳读原书", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const row = await svc.create({ ...draft, kind: "classic_excerpt", bookTitle: "《渊海子平》", title: "论偏财", content: "偏财者……" }, "a");
    expect(row.quotable).toBe(true);
    expect(row.bookTitle).toBe("渊海子平");
  });

  it("检索结果标注 quotable：知识要点不得被当作原文引用", async () => {
    const { prisma } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const kp = await svc.create({ ...draft, kind: "knowledge_point", sourceKind: "oral", restated: true, sourceRefs: [{ label: "某派口传整理" }] }, "a");
    await svc.approve(kp.id, "admin", "");
    const hits = await svc.findEvidence({ paipanType: "bazi", school: "ziping", signals: svc.baziSignals({ geJu: "偏财格" }) });
    expect(hits).toHaveLength(1);
    expect(hits[0].kind).toBe("knowledge_point");
    expect(hits[0].quotable).toBe(false);
    expect(hits[0].sourceKind).toBe("oral");
  });

  it("并发修改冲突时拒绝写入；停用条目不能修改；非草稿不能审核", async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new PaipanReportKnowledgeService(prisma);
    const row = await svc.create(draft, "admin1");
    // 模拟读取后被他人抢先升版本
    const originalFind = prisma.paipanReportKnowledge.findUnique;
    prisma.paipanReportKnowledge.findUnique = jest.fn(async (args: any) => {
      const r = await originalFind(args);
      return r ? { ...r } : r;
    });
    const snapshot = { ...rows.get(row.id) };
    rows.get(row.id).version = 5;
    prisma.paipanReportKnowledge.findUnique.mockResolvedValueOnce(snapshot);
    await expect(svc.update(row.id, { title: "新标题" }, "admin2")).rejects.toThrow("已被他人修改");

    await svc.retire(row.id, "admin1");
    await expect(svc.update(row.id, { title: "x" }, "admin1")).rejects.toThrow("已停用");
    await expect(svc.approve(row.id, "r")).rejects.toThrow("只有草稿");
  });
});

/**
 * 「用户不必自己去查哪本古籍怎么说」是报告的定位，原文就是这句话的兑现。
 * 但立场加权只加给议题条目，原文既不是议题、分数又低，按分排下来必然垫底——
 * 实测一份真实八字报告的 20 条依据里原文 0 条，全被门派理论和议题挤掉了。
 */
describe("古籍原文保底", () => {
  const mkPrisma = (rows: any[]) => ({
    paipanReportKnowledge: {
      findMany: jest.fn(async ({ where }: any) =>
        rows.filter((r) => r.paipanType === where.paipanType && r.status === where.status && r.tags.some((t: string) => where.tags.hasSome.includes(t))),
      ),
    },
  }) as any;

  /** 五条一组的议题（分数高），外加一堆高分门派理论，把名额占满 */
  const crowd = () => {
    const rows: any[] = [];
    for (const key of ["d1", "d2", "d3"]) {
      for (const stance of ["consensus", "mainstream", "alternative", "minority", "platform_line"]) {
        rows.push({ id: `${key}-${stance}`, paipanType: "bazi", status: "APPROVED", kind: "school_theory", tags: ["偏财格"], title: `${key}${stance}`, content: "议题内容", debateKey: key, stance, sourceKind: "platform_expert", school: "ziping" });
      }
    }
    for (let i = 0; i < 20; i++) {
      rows.push({ id: `t${i}`, paipanType: "bazi", status: "APPROVED", kind: "school_theory", tags: ["偏财格"], title: `理论${i}`, content: "门派理论", debateKey: null, stance: "mainstream", sourceKind: "platform_expert", school: "ziping" });
    }
    rows.push({ id: "q1", paipanType: "bazi", status: "APPROVED", kind: "classic_excerpt", tags: ["偏财格"], title: "渊海子平·论偏财", content: "何谓之偏财……", debateKey: null, stance: "mainstream", sourceKind: "classic_public", school: null });
    rows.push({ id: "q2", paipanType: "bazi", status: "APPROVED", kind: "classic_excerpt", tags: ["偏财格"], title: "滴天髓·天干·论甲木", content: "甲木参天……", debateKey: null, stance: "mainstream", sourceKind: "classic_public", school: null });
    return rows;
  };

  it("议题和门派理论再多，原文也要占到位置", async () => {
    const svc = new PaipanReportKnowledgeService(mkPrisma(crowd()));
    const hits = await svc.findEvidence({ paipanType: "bazi", school: "ziping", signals: svc.baziSignals({ geJu: "偏财格" }), limit: 20 });
    expect(hits).toHaveLength(20);
    expect(hits.filter((h) => h.quotable).map((h) => h.title)).toEqual(["渊海子平·论偏财", "滴天髓·天干·论甲木"]);
  });

  it("留位是从总数里扣的，不会把报告撑大", async () => {
    const svc = new PaipanReportKnowledgeService(mkPrisma(crowd()));
    const hits = await svc.findEvidence({ paipanType: "bazi", signals: svc.baziSignals({ geJu: "偏财格" }), limit: 12 });
    expect(hits.length).toBeLessThanOrEqual(12);
    expect(hits.some((h) => h.quotable)).toBe(true);
  });

  it("没有原文可引时，名额还给别的条目，不留空位", async () => {
    const rows = crowd().filter((r) => r.kind !== "classic_excerpt");
    const svc = new PaipanReportKnowledgeService(mkPrisma(rows));
    const hits = await svc.findEvidence({ paipanType: "bazi", signals: svc.baziSignals({ geJu: "偏财格" }), limit: 20 });
    expect(hits).toHaveLength(20);
    expect(hits.some((h) => h.quotable)).toBe(false);
  });

  it("议题仍然整组进来：保底原文不能把对照切残", async () => {
    const svc = new PaipanReportKnowledgeService(mkPrisma(crowd()));
    const hits = await svc.findEvidence({ paipanType: "bazi", signals: svc.baziSignals({ geJu: "偏财格" }), limit: 20 });
    const byKey: Record<string, number> = {};
    for (const h of hits) if (h.debateKey) byKey[h.debateKey] = (byKey[h.debateKey] ?? 0) + 1;
    for (const n of Object.values(byKey)) expect(n).toBe(5);
  });
});
