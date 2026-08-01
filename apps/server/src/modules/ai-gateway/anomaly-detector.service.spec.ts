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
});
