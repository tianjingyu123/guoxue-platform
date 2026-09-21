import { ClassicCompanionService, COMPANION_CRISIS_REPLY, extractQuoted, selectChapterBody } from "./classic-companion.service";

/** 模拟验证：伴读上下文选取、危机转介与品牌；模型网关为 mock */
describe("ClassicCompanionService", () => {
  const longChapter = "甲".repeat(5000) + "学而时习之，不亦说乎？" + "乙".repeat(3000);

  it("提取问题中的引文", () => {
    expect(extractQuoted("请解读这一句的含义：「学而时习之，不亦说乎？」")).toBe("学而时习之，不亦说乎？");
    expect(extractQuoted("这句“有朋自远方来”什么意思")).toBe("有朋自远方来");
    expect(extractQuoted("随便问问")).toBeNull();
  });

  it("短章节注入全文；长章节按所问句子注入前后文，定位不到时注入开头", () => {
    expect(selectChapterBody("短文", "短文").focused).toBe(false);
    const hit = selectChapterBody(longChapter, "学而时习之，不亦说乎？");
    expect(hit.focused).toBe(true);
    expect(hit.body).toContain("学而时习之，不亦说乎？");
    expect(hit.body.length).toBeLessThan(4000);
    expect(hit.body.startsWith("……（前略）")).toBe(true);
    // 截断引文（超过 30 字取前 30 字定位）
    const truncated = selectChapterBody("丙".repeat(4500) + "天命之谓性，率性之谓道，修道之谓教。道也者，不可须臾离也，可离非道也。", "天命之谓性，率性之谓道，修道之谓教。道也者，不可须臾离也，可离非…");
    expect(truncated.focused).toBe(true);
    const miss = selectChapterBody(longChapter, "原文里没有的句子");
    expect(miss.focused).toBe(false);
    expect(miss.body).toHaveLength(4000);
  });

  function setup(content = longChapter) {
    const prisma: any = {
      classicChapter: {
        findUnique: jest.fn(async () => ({ id: "ch1", bookId: "b1", title: "学而", content, book: { title: "论语", author: "孔子", dynasty: "春秋" } })),
      },
      classicCompanionSession: { upsert: jest.fn(async () => ({ id: "s1", summary: null, messageCount: 0 })) },
      classicCompanionMessage: { findMany: jest.fn(async () => []), createMany: jest.fn() },
      $transaction: jest.fn(async () => []),
    };
    const gateway: any = { chat: jest.fn(async () => ({ content: "解读", model: "m" })) };
    return { svc: new ClassicCompanionService(prisma, gateway), prisma, gateway };
  }

  it("危机信号直接转介，不读章节、不调模型", async () => {
    const { svc, gateway, prisma } = setup();
    const r = await svc.chat({ chapterId: "ch1", question: "读不下去了，不想活了" }, "u1");
    expect(r.answer).toBe(COMPANION_CRISIS_REPLY);
    expect(gateway.chat).not.toHaveBeenCalled();
    expect(prisma.classicChapter.findUnique).not.toHaveBeenCalled();
  });

  // 决策人 2026-09-17：伴读场景遇到排盘需求不能直接答，要引导到平台专业服务
  it("用户在伴读里要求看八字：转介到排盘服务，提示词禁止就地解读", async () => {
    const { svc, gateway } = setup();
    const r = await svc.chat({ chapterId: "ch1", question: "读累了，帮我看个八字吧，我是1990年5月出生的" }, "u1");

    expect(r.referral).toMatchObject({ intent: "bazi_reading", label: "八字排盘", path: "/pkg-paipan/bazi/index", paid: true });
    const sys = gateway.chat.mock.calls[0][0].messages
      .filter((m: any) => m.role === "system")
      .map((m: any) => m.content)
      .join("\n");
    expect(sys).toContain("超出范围");
    expect(sys).toContain("八字排盘");
    expect(sys).toContain("不要在这里直接给出完整的排盘结果");
    expect(sys).toContain("别让用户空手而归"); // 不能敷衍打发
  });

  it("正常的古籍问题不转介", async () => {
    const { svc } = setup();
    const r = await svc.chat({ chapterId: "ch1", question: "「学而时习之」的「习」怎么解？" }, "u1");
    expect(r.referral).toBeNull();
  });

  it("注入围绕所问句子的原文节选，伴读角色名为小简", async () => {
    const { svc, gateway } = setup();
    await svc.chat({ chapterId: "ch1", question: "请解读这一句：「学而时习之，不亦说乎？」" }, "u1");
    expect(gateway.chat.mock.calls[0][0].skipCache).toBe(true); // 回答依赖章节与个人记忆，不走语义缓存
    const messages = gateway.chat.mock.calls[0][0].messages;
    const sysAll = messages.filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n");
    expect(sysAll).toContain("你叫「小简」"); // 伴读是小简，不是小卜（各场景角色区分）
    expect(sysAll).toContain("竹简");
    const ctx = messages.find((m: any) => String(m.content).includes("【当前正在阅读】"));
    expect(ctx.content).toContain("节选，围绕用户所问句子前后");
    expect(ctx.content).toContain("学而时习之，不亦说乎？");
  });
});
