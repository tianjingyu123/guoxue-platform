import { ClientReportService } from "./client-report.service";

/**
 * 交付稿改写：平台报告（给学习者看）→ 交付报告（老师交给客户）。
 * 决策人 2026-09-18 定位：要通俗易懂、老师视角，让客户觉得是这位老师写的。
 */
function setup(chapters: any[] = []) {
  const prisma: any = {
    practitionerReport: {
      findFirst: jest.fn(async () => ({
        id: "pr-1",
        ownerId: "teacher-1",
        clientName: "王女士",
        chapters,
      })),
      update: jest.fn(async ({ data }: any) => ({ id: "pr-1", ownerId: "teacher-1", clientName: "王女士", ...data })),
    },
  };
  const gateway: any = { chat: jest.fn(async () => ({ content: "（改写后）你这个盘，简单说就是……", model: "m1" })) };
  return { svc: new ClientReportService(prisma, gateway), prisma, gateway };
}

describe("交付稿改写", () => {
  it("提示词把口径讲清楚：老师视角、通俗、不提平台与 AI、结论不许改", async () => {
    const { svc, gateway } = setup();
    await svc.rewriteChapter({ chapterTitle: "日主与格局", text: "癸水生于巳月，财旺身弱。", clientName: "王女士" });

    const sys = gateway.chat.mock.calls[0][0].messages[0].content;
    expect(sys).toContain("以这位老师的名义");
    expect(sys).toContain("第二人称");
    expect(sys).toContain("通俗易懂");
    expect(sys).toContain("不得出现任何平台、产品或 AI 的名字");
    expect(sys).toContain("一个字都不能改");
    // 红线保留
    expect(sys).toContain("不断生死");
    expect(sys).toContain("不推销");
    // 每位客户称呼不同，不能走语义缓存
    expect(gateway.chat.mock.calls[0][0].skipCache).toBe(true);
    expect(gateway.chat.mock.calls[0][0].scene).toBe("practitioner_report_rewrite");
  });

  it("整份改写：解读章改写，盘面事实与校验章原样保留", async () => {
    const { svc, gateway } = setup([
      { key: "c1", title: "盘面事实（排盘引擎计算）", body: "四柱：庚午 辛巳 癸未 丁巳" },
      { key: "c2", title: "起盘校验", body: "真太阳时未校正" },
      { key: "c3", title: "日主与格局", body: "癸水生于巳月，财旺身弱。" },
      { key: "c4", title: "财富结构", body: "财星旺而身弱。" },
    ]);
    const r = await svc.rewriteReport("teacher-1", "pr-1");

    expect(r.rewritten).toBe(2); // 只改了两章解读
    expect(gateway.chat).toHaveBeenCalledTimes(2);
    const chapters = r.report.chapters as any[];
    expect(chapters[0].body).toBe("四柱：庚午 辛巳 癸未 丁巳"); // 盘面数据原样
    expect(chapters[1].body).toBe("真太阳时未校正"); // 校验章原样
    expect(chapters[2].body).toContain("改写后");
    expect(chapters[2].rewritten).toBe(true);
  });

  it("盘面事实按标记跳过：老师改了标题也不会被当文案重写", async () => {
    const { svc, gateway } = setup([
      // 老师把标题改成了自己的叫法，标题正则已经认不出来了
      { key: "c1", title: "你的八字", body: "四柱：庚午 辛巳 癸未 丁巳", deterministic: true },
      { key: "c2", title: "日主与格局", body: "癸水生于巳月。" },
    ]);
    const r = await svc.rewriteReport("teacher-1", "pr-1");

    expect(gateway.chat).toHaveBeenCalledTimes(1); // 只改了解读章
    const chapters = r.report.chapters as any[];
    expect(chapters[0].body).toBe("四柱：庚午 辛巳 癸未 丁巳"); // 盘面数据原样
    expect(chapters[0].rewritten).toBeUndefined();
    expect(chapters[1].body).toContain("改写后");
  });

  it("个别章改写失败时保留原文，不让整份报告崩掉", async () => {
    const { svc, gateway } = setup([
      { key: "c1", title: "日主与格局", body: "原文甲" },
      { key: "c2", title: "财富结构", body: "原文乙" },
    ]);
    gateway.chat.mockRejectedValueOnce(new Error("timeout"));
    const r = await svc.rewriteReport("teacher-1", "pr-1");

    expect(r.failed).toBe(1);
    expect(r.rewritten).toBe(1);
    const chapters = r.report.chapters as any[];
    expect(chapters[0].body).toBe("原文甲"); // 失败的那章保留原文
  });

  it("空章节与他人报告的拒绝", async () => {
    const empty = setup([]);
    await expect(empty.svc.rewriteReport("teacher-1", "pr-1")).rejects.toThrow("还没有章节内容");

    const { svc, prisma } = setup([{ key: "c1", title: "x", body: "y" }]);
    prisma.practitionerReport.findFirst.mockResolvedValueOnce(null);
    await expect(svc.rewriteReport("teacher-1", "pr-1")).rejects.toThrow("报告不存在");
  });

  it("空正文不调模型", async () => {
    const { svc, gateway } = setup();
    await expect(svc.rewriteChapter({ chapterTitle: "x", text: "   " })).rejects.toThrow("还没有内容");
    expect(gateway.chat).not.toHaveBeenCalled();
  });
});
