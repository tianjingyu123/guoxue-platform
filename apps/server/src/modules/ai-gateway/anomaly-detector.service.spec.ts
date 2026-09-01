import { AnomalyDetectorService } from "./anomaly-detector.service";

describe("AnomalyDetectorService", () => {
  it("按时间对象汇总已支付和已完成订单，避免时间参数被当作 text", async () => {
    const aggregate = jest.fn().mockResolvedValue({
      _sum: { amount: "123.45" },
    });
    const service = new AnomalyDetectorService(
      { order: { aggregate } } as any,
      {} as any,
      { publish: jest.fn() } as any,
      {} as any,
    );
    const rule = service
      .getRules()
      .find((item) => item.id === "revenue-daily-drop");

    const value = await (service as any).getCurrentValue(rule);

    expect(value).toBe(123.45);
    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
        status: { in: ["PAID", "COMPLETED"] },
      },
      _sum: { amount: true },
    });
  });

  it("持续异常在冷却窗口内不重复发布事件和创建运营任务", async () => {
    const eventBus = { publish: jest.fn().mockResolvedValue("event-1") };
    const redis = {
      setNX: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    };
    const service = new AnomalyDetectorService(
      {} as any,
      redis as any,
      eventBus as any,
      {} as any,
    );
    jest.spyOn(service as any, "getCurrentValue").mockResolvedValue(0);
    jest.spyOn(service as any, "buildBaseline").mockResolvedValue({
      values: [100, 100, 100, 100],
    });

    await service.runRule("revenue-daily-drop");
    await service.runRule("revenue-daily-drop");

    expect(redis.setNX).toHaveBeenCalledTimes(2);
    expect(redis.setNX).toHaveBeenCalledWith(
      "ai:anomaly:cooldown:revenue-daily-drop:critical",
      expect.any(String),
      6 * 3600,
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});
