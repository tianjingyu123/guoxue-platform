import { AiOpsBridgeService } from "./ai-ops-bridge.service";

describe("AiOpsBridgeService", () => {
  it("将异常事件幂等转入运营任务池并保留真实证据", async () => {
    const handlers: Array<(event: any) => Promise<void>> = [];
    const eventBus = {
      subscribe: jest.fn((subscription) => {
        handlers.push(subscription.handler);
        return `subscription-${handlers.length}`;
      }),
      unsubscribe: jest.fn(),
    };
    const prisma = { opsTask: { upsert: jest.fn().mockResolvedValue({}) } };
    const service = new AiOpsBridgeService(prisma as any, eventBus as any);
    service.onModuleInit();

    await handlers[0]({
      id: "event-1",
      type: "anomaly.detected.revenue",
      severity: "critical",
      payload: { metric: "支付失败率", value: 0.42 },
      createdAt: new Date("2026-08-31T00:00:00.000Z"),
    });

    expect(prisma.opsTask.upsert).toHaveBeenCalledWith({
      where: { sourceEventId: "event-1" },
      create: expect.objectContaining({
        priority: "HIGH",
        sourceEventId: "event-1",
        approvalStatus: "not_required",
        payload: expect.objectContaining({
          eventType: "anomaly.detected.revenue",
          evidence: { metric: "支付失败率", value: 0.42 },
        }),
      }),
      update: {},
    });
  });
});
