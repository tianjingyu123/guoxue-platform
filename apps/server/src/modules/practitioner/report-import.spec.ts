import { PractitionerService } from "./practitioner.service";

/**
 * 小卜报告 → 工作台草稿。
 *
 * 定位（决策人 2026-09-18）：工作台是给从业者老师的付费工具，
 * 目的是让老师**以自己的名义和形式**交付给他的客户，减少写报告的时间，并且支持自行编辑。
 * 所以导入后必须是「老师自己的稿子」：可改可删，交付页不留平台品牌。
 */
function setup(opts?: { pro?: boolean; reportCount?: number; analysisContent?: string; ownerId?: string }) {
  const created: any[] = [];
  const content =
    opts?.analysisContent ??
    JSON.stringify({
      title: "八字综合解读",
      summary: "癸水生于巳月，财旺身弱。",
      metadata: { paipanType: "bazi" },
      facts: { siZhu: "庚午年 辛巳月 癸未日 丁巳时" },
      chartView: { pillars: [{ gan: "庚", zhi: "午" }] },
      sections: [
        { id: "s1", title: "盘面事实（排盘引擎计算）", content: "四柱：庚午 辛巳 癸未 丁巳", type: "fact", deterministic: true },
        {
          id: "s3",
          title: "日主与格局",
          content: "癸水生巳月，财旺身弱。",
          type: "analysis",
          references: [{ source: "《渊海子平》", chapter: "论癸", content: "癸水至弱，达于天津……" }],
        },
        { id: "s7", title: "婚姻与六亲", content: "配偶宫……", type: "interpretation", references: [] },
        // 平台口吻的观点对照节：给学习者看的，不该出现在交给客户的成果物里
        { id: "sDebate", title: "这一盘我们怎么看", content: "▸ 结论：本报告按子平扶抑立论。", type: "fact", deterministic: true },
      ],
    });

  const prisma: any = {
    aiAnalysisRecord: {
      findUnique: jest.fn(async () => ({
        id: "xb-1",
        userId: opts?.ownerId ?? "teacher-1",
        scene: "paipan_report",
        analysisContent: content,
        inputSummary: "庚午年 辛巳月 癸未日 丁巳时 偏财格",
      })),
    },
    practitionerProfile: {
      findUnique: jest.fn(async () => ({
        proExpireAt: opts?.pro ? new Date(Date.now() + 86400000) : null,
      })),
    },
    practitionerReport: {
      count: jest.fn(async () => opts?.reportCount ?? 0),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `pr${created.length + 1}`, ...data };
        created.push(row);
        return row;
      }),
    },
  };
  return { svc: new PractitionerService(prisma), prisma, created };
}

describe("小卜报告导入工作台", () => {
  it("章节原样带入，成为老师可编辑的草稿", async () => {
    const { svc } = setup({ pro: true });
    const r: any = await svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1", clientName: "王女士" });

    expect(r.ownerId).toBe("teacher-1");
    expect(r.status).toBe("draft"); // 导入即草稿，等老师改
    expect(r.clientName).toBe("王女士");
    expect(r.typeLabel).toBe("八字命书");
    expect(r.type).toBe("bazi");

    const chapters = r.chapters as any[];
    // 「这一盘我们怎么看」不进交付稿：平台口吻 + 门派分歧，对 C 端客户既暴露平台又是噪音
    expect(chapters).toHaveLength(3);
    expect(chapters.some((c) => c.title === "这一盘我们怎么看")).toBe(false);
    expect(chapters[0].title).toBe("盘面事实（排盘引擎计算）");
    // 字段名必须与工作台既有结构一致，否则编辑页与交付页都读不出正文
    expect(chapters[0].key).toBe("c1");
    expect(typeof chapters[0].body).toBe("string");
    expect(chapters[0].text).toBeUndefined();
    expect(chapters[1].title).toBe("日主与格局");
    expect(chapters[1].body).toContain("财旺身弱");
    // 标记来源，前端可提示「这段来自小卜初稿」
    expect(chapters.every((c) => c.fromXiaobu)).toBe(true);
    // 引擎算定的章节带标记：老师改了标题，交付稿改写也不会把盘面数据当文案重写
    expect(chapters[0].deterministic).toBe(true);
    expect(chapters[1].deterministic).toBe(false);
  });

  it("依据出处一并带入，老师自行决定是否保留", async () => {
    const { svc } = setup({ pro: true });
    const r: any = await svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1" });
    const ch = (r.chapters as any[]).find((c) => c.title === "日主与格局");
    expect(ch.evidence).toHaveLength(1);
    expect(ch.evidence[0]).toContain("《渊海子平》");
    expect(ch.evidence[0]).toContain("论癸");
    // 没有依据的章节给空数组，不是 undefined
    const noRef = (r.chapters as any[]).find((c) => c.title === "婚姻与六亲");
    expect(noRef.evidence).toEqual([]);
  });

  it("盘面快照带入，交付页可复用同一套图，并记录来源报告", async () => {
    const { svc } = setup({ pro: true });
    const r: any = await svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1" });
    // 字段名与工作台既有结构一致（toolKey/toolLabel/data），页面才认得
    expect(r.paipan.toolKey).toBe("bazi");
    expect(r.paipan.toolLabel).toBe("八字命书");
    expect(r.paipan.data.chartView).toBeTruthy();
    expect(r.paipan.data.facts.siZhu).toContain("癸未日");
    expect(r.paipan.sourceReportId).toBe("xb-1");
    // 交付页「盘面」卡取的是引擎算定的盘面，不是模型写的那句概述：
    // 模型那句没经过客户口径改写，措辞也不是这位老师的。
    expect(r.paipan.summary).toBe("庚午年 辛巳月 癸未日 丁巳时 偏财格");
    expect(r.paipan.summary).not.toContain("癸水生于巳月");
  });

  it("各盘类型的报告都能导入，标签对应各自体例", async () => {
    for (const [type, label] of [
      ["ziwei", "紫微命书"],
      ["liuyao", "六爻卦书"],
      ["meihua", "梅花卦书"],
      ["qimen", "奇门局书"],
      ["daliuren", "六壬课书"],
    ] as const) {
      const { svc } = setup({
        pro: true,
        analysisContent: JSON.stringify({
          title: "x",
          summary: "s",
          metadata: { paipanType: type },
          sections: [{ id: "s3", title: "结构", content: "正文" }],
        }),
      });
      const r: any = await svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1" });
      expect(r.type).toBe(type);
      expect(r.typeLabel).toBe(label);
    }
  });

  it("只能导入自己的报告", async () => {
    const { svc } = setup({ pro: true, ownerId: "other-user" });
    await expect(svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1" })).rejects.toThrow("只能导入自己的报告");
  });

  it("免费版受报告份数限制，会员不限", async () => {
    const free = setup({ pro: false, reportCount: 3 });
    await expect(free.svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1" })).rejects.toThrow("开通从业者会员");

    const pro = setup({ pro: true, reportCount: 99 });
    await expect(pro.svc.importFromXiaobuReport("teacher-1", { reportId: "xb-1" })).resolves.toBeTruthy();
  });
});
