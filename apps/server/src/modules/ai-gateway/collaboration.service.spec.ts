import { CollaborationService } from "./collaboration.service";

describe("CollaborationService", () => {
  function setup() {
    const prisma = {
      $transaction: jest.fn(),
      aiCollaboration: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      aiDecision: { findUnique: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    const eventBus = { publish: jest.fn().mockResolvedValue("event-1") };
    const ledger = {
      record: jest.fn().mockResolvedValue("decision-1"),
      reviewDecision: jest.fn().mockResolvedValue(undefined),
      recordOutcome: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CollaborationService(prisma as any, eventBus as any, ledger as any);
    return { service, prisma, eventBus, ledger };
  }

  it("低风险高置信度建议只自动批准，不伪造已执行状态", async () => {
    const { service, prisma } = setup();
    prisma.aiCollaboration.create.mockResolvedValue({ id: "proposal-1" });

    await service.propose({
      type: "config_change",
      title: "优化配置",
      description: "建议内容",
      proposedBy: "ai-agent",
      confidence: 0.95,
      impactScope: {},
      riskLevel: "low",
      executionPlan: {},
    });

    const updates = [
      ...prisma.aiCollaboration.update.mock.calls,
      ...prisma.aiCollaboration.updateMany.mock.calls,
    ].map(([args]: any[]) => args.data);
    expect(updates).toEqual(
      expect.arrayContaining([
        { decisionId: "decision-1" },
        expect.objectContaining({ status: "approved", reviewedBy: "ai-system" }),
      ]),
    );
    expect(updates.some((data: any) => data.status === "executed")).toBe(false);
  });

  it("没有受控动作处理器时拒绝执行，且不改变状态", async () => {
    const { service, prisma } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      id: "proposal-1",
      status: "approved",
      executionPlan: { handlerKey: "not-registered" },
    });

    await expect(service.execute("proposal-1", "admin-1")).rejects.toThrow(
      "尚未绑定受控动作处理器",
    );
    expect(prisma.aiCollaboration.updateMany).not.toHaveBeenCalled();
  });

  it("真实处理器成功后才记录已执行，并保留处理器证据", async () => {
    const { service, prisma } = setup();
    const execute = jest.fn().mockResolvedValue({ changed: 3 });
    service.registerActionHandler("safe-handler", { execute });
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      id: "proposal-1",
      status: "approved",
      executionPlan: { handlerKey: "safe-handler" },
    });

    await service.execute("proposal-1", "admin-1");

    expect(execute).toHaveBeenCalledTimes(1);
    expect(prisma.aiCollaboration.update).toHaveBeenCalledWith({
      where: { id: "proposal-1" },
      data: expect.objectContaining({
        status: "executed",
        executionResult: expect.objectContaining({
          executor: "admin-1",
          handlerKey: "safe-handler",
          result: { changed: 3 },
        }),
      }),
    });
  });

  it("高风险建议必须有审批依据且禁止自审", async () => {
    const { service, prisma } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      id: "proposal-1",
      status: "pending_review",
      riskLevel: "high",
      proposedBy: "admin-1",
    });

    await expect(
      service.review("proposal-1", "approved", "admin-2", undefined, ""),
    ).rejects.toThrow("必须填写审核依据");
    await expect(
      service.review("proposal-1", "approved", "admin-1", undefined, "依据充分"),
    ).rejects.toThrow("禁止提议人与审批人为同一人");
  });

  it("创建提案与决策使用同一事务客户端", async () => {
    const { service, prisma, ledger } = setup();
    prisma.aiCollaboration.create.mockResolvedValue({ id: "p1" });
    await service.propose({
      type: "inspection",
      title: "巡检",
      description: "诊断",
      proposedBy: "a1",
      confidence: 0.8,
      riskLevel: "low",
      impactScope: {},
      executionPlan: {},
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ output: { proposalId: "p1", riskLevel: "low" } }),
      prisma,
    );
  });

  it("人工审核原子抢占并在同一事务同步决策，失败不发布成功事件", async () => {
    const { service, prisma, ledger, eventBus } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "pending_review",
      riskLevel: "medium",
      decisionId: "d1",
    });
    ledger.reviewDecision.mockRejectedValue(new Error("账本写入失败"));
    await expect(service.review("p1", "approved", "admin-1")).rejects.toThrow("账本写入失败");
    expect(prisma.aiCollaboration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1", status: "pending_review" } }),
    );
    expect(ledger.reviewDecision).toHaveBeenCalledWith(
      "d1",
      "approved",
      "admin-1",
      undefined,
      prisma,
    );
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("并发审核败方不改账本", async () => {
    const { service, prisma, ledger } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "pending_review",
      riskLevel: "low",
      decisionId: "d1",
    });
    prisma.aiCollaboration.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.review("p1", "approved", "admin-1")).rejects.toThrow("其他管理员审核");
    expect(ledger.reviewDecision).not.toHaveBeenCalled();
  });

  it("禁止无依据驳回及批准时夹带新执行计划", async () => {
    const { service, prisma } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "pending_review",
      riskLevel: "low",
    });
    await expect(service.review("p1", "rejected", "a1")).rejects.toThrow("填写原因");
    await expect(
      service.review("p1", "approved", "a1", { executionPlan: { handlerKey: "other" } }),
    ).rejects.toThrow("不能夹带");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("执行后事件通知失败不会误记业务失败", async () => {
    const { service, prisma, eventBus } = setup();
    const execute = jest.fn().mockResolvedValue({ report: "r1" });
    service.registerActionHandler("safe", { execute });
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "approved",
      executionPlan: { handlerKey: "safe" },
    });
    eventBus.publish.mockRejectedValue(new Error("通知不可用"));
    await expect(service.execute("p1", "a1")).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(
      prisma.aiCollaboration.update.mock.calls.some(([arg]) => arg.data.status === "failed"),
    ).toBe(false);
  });

  it("并发执行只允许抢占成功的一方调用处理器", async () => {
    const { service, prisma } = setup();
    const execute = jest.fn().mockResolvedValue({});
    service.registerActionHandler("safe", { execute });
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "approved",
      executionPlan: { handlerKey: "safe" },
    });
    prisma.aiCollaboration.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      service.execute("p1", "a1"),
      service.execute("p1", "a2"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("并发回滚只运行一次，保留原因与原始执行证据", async () => {
    const { service, prisma } = setup();
    const rollback = jest.fn().mockResolvedValue({ restored: true });
    service.registerActionHandler("safe", { execute: jest.fn(), rollback });
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "executed",
      executionPlan: { handlerKey: "safe" },
      executionResult: { receipt: "r1" },
    });
    prisma.aiCollaboration.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      service.rollback("p1", "a1", "恢复原状"),
      service.rollback("p1", "a2", "恢复原状"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(prisma.aiCollaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "rolled_back",
          executionResult: expect.objectContaining({
            previous: { receipt: "r1" },
            rollback: expect.objectContaining({ reason: "恢复原状" }),
          }),
        }),
      }),
    );
  });

  it("回滚部分失败进入待核查状态，不丢失原始证据", async () => {
    const { service, prisma } = setup();
    service.registerActionHandler("safe", {
      execute: jest.fn(),
      rollback: jest.fn().mockRejectedValue(new Error("无法确认恢复")),
    });
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "executed",
      executionPlan: { handlerKey: "safe" },
      executionResult: { receipt: "r1" },
    });
    await expect(service.rollback("p1", "a1", "撤销变更")).rejects.toThrow("无法确认恢复");
    expect(prisma.aiCollaboration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "rollback_failed",
          executionResult: expect.objectContaining({ previous: { receipt: "r1" } }),
        }),
      }),
    );
  });

  it("无回滚原因不调用任何真实处理器", async () => {
    const { service, prisma } = setup();
    const rollback = jest.fn();
    service.registerActionHandler("safe", { execute: jest.fn(), rollback });
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      status: "executed",
      executionPlan: { handlerKey: "safe" },
    });
    await expect(service.rollback("p1", "a1", " ")).rejects.toThrow("填写原因");
    expect(rollback).not.toHaveBeenCalled();
  });

  it.each(["pending_review", "approved", "executing", "failed", "rolling_back", "rollback_failed"])(
    "%s 不允许伪造验收评分",
    async (status) => {
      const { service, prisma, ledger } = setup();
      prisma.aiCollaboration.findUnique.mockResolvedValue({ status });
      await expect(service.feedback("p1", 5, "a1")).rejects.toThrow("完成后才能验收");
      expect(ledger.recordOutcome).not.toHaveBeenCalled();
    },
  );

  it("验收评分在同一事务回收到账本，禁止覆盖", async () => {
    const { service, prisma, ledger } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue({ status: "executed", decisionId: "d1" });
    await service.feedback("p1", 4, "a1", " 已核对报告 ");
    expect(prisma.aiCollaboration.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", status: "executed", feedbackRating: null },
      data: { feedbackRating: 4, feedbackComment: "已核对报告" },
    });
    expect(ledger.recordOutcome).toHaveBeenCalledWith("d1", "feedback_rating", 5, 4, "a1", prisma);
    prisma.aiCollaboration.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.feedback("p1", 5, "a2")).rejects.toThrow("已反馈或状态已变化");
  });

  it("不存在的反馈与详情均返回业务 404", async () => {
    const { service, prisma } = setup();
    prisma.aiCollaboration.findUnique.mockResolvedValue(null);
    await expect(service.feedback("missing", 5, "a1")).rejects.toMatchObject({ status: 404 });
    await expect(service.getDetail("missing")).rejects.toMatchObject({ status: 404 });
  });
});
