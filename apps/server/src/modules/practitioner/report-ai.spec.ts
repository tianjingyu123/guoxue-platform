import { ReportAiService } from "./report-ai.service";

function setup() {
  const report: any = {
    id: "report-1",
    ownerId: "teacher-1",
    shareToken: null,
    updatedAt: new Date("2026-09-23T00:00:00.000Z"),
    typeLabel: "八字报告",
    clientName: "王女士",
    paipan: { summary: "已存档的四柱盘面" },
    chapters: [
      { key: "facts", title: "盘面事实", body: "四柱原文", deterministic: true },
      { key: "analysis", title: "日主与格局", body: "" },
    ],
  };
  const prisma: any = {
    practitionerReport: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === report.id && where.ownerId === report.ownerId ? { ...report } : null),
    },
  };
  const redis: any = {
    incrWithTtl: jest.fn(async () => ({ count: 1, ttl: 60 })),
    decrFloorZero: jest.fn(async () => 0),
  };
  const gateway: any = { chat: jest.fn(async () => ({ content: "按已存档盘面起草的解读" })) };
  return { service: new ReportAiService(prisma, redis, gateway), report, prisma, redis, gateway };
}

describe("工作台报告 AI 章节起草", () => {
  it("只使用本人报告的存档盘面和章节，并把用量归到老师账号", async () => {
    const { service, prisma, gateway } = setup();
    const result = await service.draftChapter("teacher-1", {
      reportId: "report-1",
      chapterKey: "analysis",
      paipan: { summary: "客户端伪造盘面" },
      clientName: "伪造称呼",
    } as any);

    expect(result.text).toContain("已存档盘面");
    expect(prisma.practitionerReport.findFirst).toHaveBeenCalledWith({
      where: { id: "report-1", ownerId: "teacher-1" },
    });
    const request = gateway.chat.mock.calls[0][0];
    expect(request.scene).toBe("practitioner_report_draft");
    expect(request.userId).toBe("teacher-1");
    expect(request.skipCache).toBe(true);
    expect(request.messages[1].content).toContain("已存档的四柱盘面");
    expect(request.messages[1].content).not.toContain("客户端伪造盘面");
    expect(request.messages[1].content).toContain("王女士");
  });

  it("他人报告、已交付报告与盘面事实章均不能调用模型", async () => {
    const { service, report, gateway } = setup();
    await expect(service.draftChapter("other-user", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("报告不存在");
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "facts" }))
      .rejects.toThrow("不能用 AI 起草覆盖");
    report.shareToken = "live-token";
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("请先撤回交付链接");
    expect(gateway.chat).not.toHaveBeenCalled();
  });

  it("没有盘面的手建报告不能从空白生成判断，只能依据老师原稿润色", async () => {
    const { service, report, gateway, redis } = setup();
    report.paipan = null;
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("请先写下本章要点");
    expect(redis.incrWithTtl).not.toHaveBeenCalled();

    report.chapters[1].body = "老师原稿：做事宜循序渐进。";
    await service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" });
    const prompt = gateway.chat.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain("老师原稿：做事宜循序渐进");
    expect(prompt).toContain("不新增命理结论");
    expect(prompt).not.toContain("已存档的四柱盘面");
  });

  it("频繁起草或计数不可用时不调用模型", async () => {
    const { service, redis, gateway } = setup();
    redis.incrWithTtl.mockResolvedValueOnce({ count: 21, ttl: 30 });
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("起草太频繁");
    expect(redis.decrFloorZero).toHaveBeenCalledTimes(1);
    redis.incrWithTtl.mockRejectedValueOnce(new Error("redis unavailable"));
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("暂时繁忙");
    expect(gateway.chat).not.toHaveBeenCalled();
  });

  it("模型失败或空回答会释放预占次数", async () => {
    const { service, redis, gateway } = setup();
    gateway.chat.mockRejectedValueOnce(new Error("timeout"));
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("稍后再试");
    gateway.chat.mockResolvedValueOnce({ content: "" });
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("没有返回内容");
    expect(redis.decrFloorZero).toHaveBeenCalledTimes(2);
  });

  it("模型起草期间报告被修改或交付时，不把旧结果交给编辑页", async () => {
    const { service, report, gateway, redis } = setup();
    gateway.chat.mockImplementationOnce(async () => {
      report.updatedAt = new Date(report.updatedAt.getTime() + 1000);
      return { content: "旧稿起草结果" };
    });
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("其他设备修改");
    gateway.chat.mockImplementationOnce(async () => {
      report.shareToken = "live-token";
      return { content: "交付前起草结果" };
    });
    await expect(service.draftChapter("teacher-1", { reportId: "report-1", chapterKey: "analysis" }))
      .rejects.toThrow("报告已交付");
    expect(redis.decrFloorZero).not.toHaveBeenCalled();
  });
});
