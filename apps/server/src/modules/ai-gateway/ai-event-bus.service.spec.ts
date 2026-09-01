import { AiEventBusService, AiEventRecord } from "./ai-event-bus.service";

function event(overrides: Partial<AiEventRecord> = {}): AiEventRecord {
  return {
    id: "event-1",
    type: "anomaly.detected.revenue",
    source: "ops",
    severity: "warning",
    payload: {},
    context: null,
    status: "published",
    attemptCount: 0,
    processingStartedAt: null,
    processedBy: [],
    processResult: null,
    createdAt: new Date("2026-08-31T00:00:00.000Z"),
    processedAt: null,
    ...overrides,
  };
}

describe("AiEventBusService", () => {
  function setup() {
    const prisma = {
      aiEvent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new AiEventBusService(prisma as any, {} as any);
    return { service, prisma };
  }

  it("精确订阅不会错误匹配同前缀的其他事件", async () => {
    const { service, prisma } = setup();
    const handler = jest.fn();
    service.subscribe({ eventType: "anomaly.detected", handler });

    await (service as any).notifyHandlers(event());

    expect(handler).not.toHaveBeenCalled();
    expect(prisma.aiEvent.updateMany).not.toHaveBeenCalled();
  });

  it("部分失败时保存成功消费者，并在补偿投递中只重试失败消费者", async () => {
    const { service, prisma } = setup();
    const successful = jest.fn().mockResolvedValue(undefined);
    const retryable = jest
      .fn()
      .mockRejectedValueOnce(new Error("暂时失败"))
      .mockResolvedValueOnce(undefined);
    service.subscribe({
      eventType: "anomaly.detected.*",
      options: { consumerId: "consumer:successful" },
      handler: successful,
    });
    service.subscribe({
      eventType: "anomaly.detected.*",
      options: { consumerId: "consumer:retryable" },
      handler: retryable,
    });

    await (service as any).notifyHandlers(event());

    const firstData = prisma.aiEvent.update.mock.calls[0][0].data;
    expect(firstData.status).toBe("published");
    expect(firstData.processedBy).toEqual(["consumer:successful"]);

    await (service as any).notifyHandlers(
      event({
        attemptCount: 1,
        processedBy: firstData.processedBy,
        processResult: firstData.processResult,
      }),
    );

    const secondData = prisma.aiEvent.update.mock.calls[1][0].data;
    expect(successful).toHaveBeenCalledTimes(1);
    expect(retryable).toHaveBeenCalledTimes(2);
    expect(secondData.status).toBe("processed");
    expect(secondData.processedBy).toEqual([
      "consumer:successful",
      "consumer:retryable",
    ]);
  });

  it("拒绝重复的稳定消费者标识，避免审计身份冲突", () => {
    const { service } = setup();
    service.subscribe({
      eventType: "*",
      options: { consumerId: "consumer:unique" },
      handler: jest.fn(),
    });

    expect(() =>
      service.subscribe({
        eventType: "anomaly.*",
        options: { consumerId: "consumer:unique" },
        handler: jest.fn(),
      }),
    ).toThrow("AI事件消费者标识重复");
  });
});
