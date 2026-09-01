import { CollaborationService } from "./collaboration.service";

describe("CollaborationService", () => {
  function setup() {
    const prisma = {
      aiCollaboration: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const eventBus = { publish: jest.fn().mockResolvedValue("event-1") };
    const ledger = {
      record: jest.fn().mockResolvedValue("decision-1"),
      reviewDecision: jest.fn().mockResolvedValue(undefined),
      recordOutcome: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CollaborationService(
      prisma as any,
      eventBus as any,
      ledger as any,
    );
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

    const updates = prisma.aiCollaboration.update.mock.calls.map(
      ([args]: any[]) => args.data,
    );
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
});
