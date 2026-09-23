import { ReportAskService } from "./report-ask.service";

/**
 * 交付报告问答：客户扫码/打开链接后就报告提问。
 * 客户全程只感知到这位老师——回答的是「老师的助理」，不是平台的机器人。
 */
function setup(opts?: { report?: any; used?: number; brandName?: string }) {
  const prisma: any = {
    practitionerReport: {
      findUnique: jest.fn(async () =>
        opts?.report === null
          ? null
          : (opts?.report ?? {
              id: "pr-1",
              ownerId: "teacher-1",
              title: "王女士 · 命理详批",
              clientName: "王女士",
              chapters: [
                { title: "日主与格局", body: "你这个盘，身弱财旺，先把根基做实。" },
                { title: "财富结构", body: "财来财去，重在守。" },
              ],
            }),
      ),
    },
    practitionerProfile: { findUnique: jest.fn(async () => ({ brandName: opts?.brandName ?? "明德堂" })) },
    user: { findUnique: jest.fn(async () => ({ nickname: "张老师" })) },
  };
  const redis: any = {
    incrWithTtl: jest.fn(async () => ({ count: opts?.used ?? 1, ttl: 86400 })),
    decrFloorZero: jest.fn(async () => Math.max(0, (opts?.used ?? 1) - 1)),
  };
  const gateway: any = { chat: jest.fn(async () => ({ content: "简单说，就是担子比力气重一些。（见「日主与格局」）", model: "m1" })) };
  return { svc: new ReportAskService(prisma, redis, gateway), prisma, redis, gateway };
}

describe("交付报告问答", () => {
  it("以老师助理的身份作答，提示词禁止提及平台与 AI", async () => {
    const { svc, gateway } = setup();
    const r = await svc.ask("tok-1", "身弱是什么意思？");

    expect(r.answer).toContain("担子比力气重");
    expect(r.brandName).toBe("明德堂");

    const sys = gateway.chat.mock.calls[0][0].messages[0].content;
    expect(sys).toContain("明德堂的助理");
    expect(sys).toContain("不得提及任何平台、产品或 AI 的名字");
    expect(sys).toContain("我是 AI");
    // 只依据报告，不自行发挥
    expect(sys).toContain("只能依据【报告内容】回答");
    expect(sys).toContain("不要自己推断或补充断语");
    // 新需求引导找老师，而不是自己接单
    expect(sys).toContain("请他联系老师");
    // 红线
    expect(sys).toContain("不替老师承诺任何服务或价格");
  });

  it("报告正文作为依据下发；用量记在老师名下", async () => {
    const { svc, gateway } = setup();
    await svc.ask("tok-1", "财运怎么样？");
    const call = gateway.chat.mock.calls[0][0];
    expect(call.messages[1].content).toContain("日主与格局");
    expect(call.messages[1].content).toContain("财来财去");
    expect(call.userId).toBe("teacher-1"); // 老师在给客户提供这项服务
    expect(call.scene).toBe("practitioner_report_ask");
    expect(call.skipCache).toBe(true); // 每位客户的报告不同，不能串稿
  });

  it("老师没设品牌时用昵称，不打平台名", async () => {
    const { svc } = setup({ brandName: "" });
    const r = await svc.ask("tok-1", "问题");
    expect(r.brandName).toBe("张老师");
  });

  it("按报告限频：链接外泄也刷不动，且给客户明确说法", async () => {
    const { svc, redis } = setup({ used: ReportAskService.DAILY_LIMIT + 1 });
    await expect(svc.ask("tok-1", "问题")).rejects.toThrow("请直接联系老师");
    expect(redis.decrFloorZero).toHaveBeenCalledTimes(1);
  });

  it("模型失败或空回答释放预占次数，客户重试不白白消耗额度", async () => {
    const { svc, redis, gateway } = setup();
    gateway.chat.mockRejectedValueOnce(new Error("timeout"));
    await expect(svc.ask("tok-1", "第一次提问")).rejects.toThrow("稍后再试");
    gateway.chat.mockResolvedValueOnce({ content: "" });
    await expect(svc.ask("tok-1", "第二次提问")).rejects.toThrow("稍后再试");
    expect(redis.decrFloorZero).toHaveBeenCalledTimes(2);
  });

  it("剩余次数随问随减，供页面提示", async () => {
    const { svc } = setup({ used: ReportAskService.DAILY_LIMIT - 2 });
    const r = await svc.ask("tok-1", "问题");
    expect(r.remaining).toBe(2);
  });

  it("链接撤回后不再作答；空问题与超长问题拒绝", async () => {
    const gone = setup({ report: null });
    await expect(gone.svc.ask("tok-x", "问题")).rejects.toThrow("已被撤回");

    const { svc, gateway } = setup();
    await expect(svc.ask("tok-1", "   ")).rejects.toThrow("请先输入问题");
    await expect(svc.ask("tok-1", "问".repeat(201))).rejects.toThrow("问题太长");
    expect(gateway.chat).not.toHaveBeenCalled();
  });

  it("模型生成期间撤回分享链接时不交付答案，并恢复提问次数", async () => {
    const { svc, prisma, redis, gateway } = setup();
    gateway.chat.mockImplementationOnce(async () => {
      prisma.practitionerReport.findUnique.mockResolvedValueOnce(null);
      return { content: "这段解读的答案" };
    });

    await expect(svc.ask("tok-1", "这段是什么意思？")).rejects.toThrow("已被撤回");
    expect(prisma.practitionerReport.findUnique).toHaveBeenCalledTimes(2);
    expect(redis.decrFloorZero).toHaveBeenCalledTimes(1);
  });

  it("交付前无法确认分享状态时不返回答案，并恢复提问次数", async () => {
    const { svc, prisma, redis, gateway } = setup();
    gateway.chat.mockImplementationOnce(async () => {
      prisma.practitionerReport.findUnique.mockRejectedValueOnce(new Error("database unavailable"));
      return { content: "这段解读的答案" };
    });

    await expect(svc.ask("tok-1", "这段是什么意思？")).rejects.toThrow("database unavailable");
    expect(redis.decrFloorZero).toHaveBeenCalledTimes(1);
  });

  it("带最近几轮上下文，但不无限增长", async () => {
    const { svc, gateway } = setup();
    const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `第${i}条` }));
    await svc.ask("tok-1", "接着问", history);
    const msgs = gateway.chat.mock.calls[0][0].messages;
    // 2 条 system + 最多 4 条历史 + 1 条当前问题
    expect(msgs.length).toBeLessThanOrEqual(7);
    expect(msgs[msgs.length - 1].content).toBe("接着问");
  });
});
