import { MerchantShippingService } from "./merchant-shipping.service";

describe("MerchantShippingService", () => {
  const prisma: any = {
    $transaction: jest.fn((fn: any) => fn(prisma)),
    order: { findFirst: jest.fn(), updateMany: jest.fn() },
    orderLogistics: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  const orderCache = { invalidateOrderCache: jest.fn().mockResolvedValue(undefined) } as any;
  const logistics = { queryTrack: jest.fn() } as any;
  const system = { logAudit: jest.fn().mockResolvedValue(undefined) } as any;
  let service: MerchantShippingService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    orderCache.invalidateOrderCache.mockResolvedValue(undefined);
    system.logAudit.mockResolvedValue(undefined);
    service = new MerchantShippingService(prisma, orderCache, logistics, system);
  });

  it("订单CAS与运单upsert在同一事务内完成，并清理缓存和记审计", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o1", userId: "u1", status: "PAID", shippedAt: null });
    prisma.orderLogistics.findUnique.mockResolvedValue(null);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.orderLogistics.upsert.mockResolvedValue({
      id: "lg1", orderId: "o1", company: "顺丰速运", logisticsNo: "SF123", status: "SHIPPED", updatedAt: new Date(),
    });

    const result = await service.shipOrder("m1", "op1", "o1", { company: " 顺丰速运 ", trackingNo: " SF123 " });

    expect(result).toMatchObject({ success: true, replayed: false, logistics: { trackingNo: "SF123" } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "o1", merchantId: "m1", status: "PAID" } }));
    expect(prisma.orderLogistics.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ orderId: "o1", status: "SHIPPED" }),
    }));
    expect(orderCache.invalidateOrderCache).toHaveBeenCalledWith("o1", "u1");
    expect(system.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "MERCHANT_ORDER_SHIPPED", targetId: "o1" }));
  });

  it("重复提交相同运单幂等返回，不重复改订单和审计", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o1", userId: "u1", status: "SHIPPED", shippedAt: new Date() });
    prisma.orderLogistics.findUnique.mockResolvedValue({
      id: "lg1", orderId: "o1", company: "顺丰速运", logisticsNo: "SF123", status: "SHIPPED", updatedAt: new Date(),
    });

    const result = await service.shipOrder("m1", "op1", "o1", { company: "顺丰速运", trackingNo: "SF123" });

    expect(result.replayed).toBe(true);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.orderLogistics.upsert).not.toHaveBeenCalled();
    expect(system.logAudit).not.toHaveBeenCalled();
  });

  it("修改运单仅允许待收货订单并保留旧值审计快照", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o1", userId: "u1", status: "SHIPPED", shippedAt: new Date() });
    prisma.orderLogistics.findUnique.mockResolvedValue({
      id: "lg1", orderId: "o1", company: "顺丰速运", logisticsNo: "OLD", status: "SHIPPED", updatedAt: new Date(),
    });
    prisma.orderLogistics.upsert.mockResolvedValue({
      id: "lg1", orderId: "o1", company: "中通快递", logisticsNo: "NEW", status: "SHIPPED", updatedAt: new Date(),
    });

    const result = await service.updateShipment("m1", "op1", "o1", { company: "中通快递", trackingNo: "NEW" });

    expect(result.logistics.trackingNo).toBe("NEW");
    expect(system.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "MERCHANT_LOGISTICS_UPDATED",
      rollbackData: { company: "顺丰速运", trackingNo: "OLD" },
    }));
  });

  it("查询商家订单的快递100真实轨迹并归一 tracks 字段", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o1", status: "SHIPPED" });
    prisma.orderLogistics.findUnique.mockResolvedValue({
      id: "lg1", orderId: "o1", company: "顺丰速运", logisticsNo: "SF123", status: "SHIPPED", updatedAt: new Date(),
    });
    logistics.queryTrack.mockResolvedValue({ state: "3", tracks: [{ time: "2026-07-19", status: "已签收", location: "郑州" }] });

    const result = await service.getShipment("m1", "o1");

    expect(logistics.queryTrack).toHaveBeenCalledWith("SF123", "顺丰速运");
    expect((result.track as any).tracks).toHaveLength(1);
  });

  it("批量发货逐单隔离失败并汇总结果", async () => {
    jest.spyOn(service, "shipOrder")
      .mockResolvedValueOnce({ success: true, replayed: false, logistics: {} as any })
      .mockRejectedValueOnce(new Error("订单状态不可发货"));

    const result = await service.batchShipOrders("m1", "op1", {
      items: [
        { orderId: "o1", company: "顺丰", trackingNo: "SF1" },
        { orderId: "o2", company: "中通", trackingNo: "ZT2" },
      ],
    });

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.items[1]).toMatchObject({ orderId: "o2", success: false, message: "订单状态不可发货" });
  });
});
