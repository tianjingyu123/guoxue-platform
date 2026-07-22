import { MerchantInventoryService } from "./merchant-inventory.service";

describe("MerchantInventoryService", () => {
  const product = {
    id: "product-1", userId: "owner-1", title: "测试商品", stock: 10,
    deletedAt: null, images: [], skus: [],
  };

  function createService(overrides: Record<string, unknown> = {}) {
    const tx: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue(product),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      productSku: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      inventoryMovement: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "movement-1", ...data })),
      },
      purchaseOrder: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      purchaseOrderItem: {
        update: jest.fn(),
        findMany: jest.fn(),
      },
      afterSale: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { findFirst: jest.fn() },
      ...overrides,
    };
    const prisma: any = {
      ...tx,
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const shopRefund: any = { refundOrder: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
    return { service: new MerchantInventoryService(prisma, shopRefund), prisma, tx, shopRefund };
  }

  it("同一 requestId 重放时不重复改变库存", async () => {
    const existing = { id: "old-movement", idempotencyKey: "inventory-adjust:merchant-1:req-12345" };
    const { service, tx } = createService();
    tx.inventoryMovement.findUnique.mockResolvedValue(existing);

    const result = await service.adjust("merchant-1", "owner-1", "operator-1", {
      requestId: "req-12345", productId: "product-1", mode: "INCREASE", quantity: 3, reason: "补货",
    });

    expect(result).toEqual({ movement: existing, replayed: true });
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("扣减后将为负库存时拒绝且不写流水", async () => {
    const { service, tx } = createService();
    await expect(service.adjust("merchant-1", "owner-1", "operator-1", {
      requestId: "req-23456", productId: "product-1", mode: "DECREASE", quantity: 11, reason: "报损",
    })).rejects.toThrow("库存不足");
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("库存调整与不可变流水在同一事务内成对写入", async () => {
    const { service, tx } = createService();
    const result = await service.adjust("merchant-1", "owner-1", "operator-1", {
      requestId: "req-34567", productId: "product-1", mode: "DECREASE", quantity: 4, reason: "线下盘亏",
    });

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: "product-1", userId: "owner-1", stock: 10 }, data: { stock: 6 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      merchantId: "merchant-1", type: "ADJUST_OUT", quantity: -4, beforeStock: 10, afterStock: 6,
      idempotencyKey: "inventory-adjust:merchant-1:req-34567",
    }) });
    expect(result.replayed).toBe(false);
  });

  it("采购收货数量超过未到货数时整笔拒绝", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1", merchantId: "merchant-1", orderNo: "PO001", status: "ORDERED",
      items: [{ id: "item-1", productId: "product-1", skuId: null, productTitle: "测试商品", quantity: 5, receivedQuantity: 3 }],
    });

    await expect(service.receivePurchaseOrder("merchant-1", "owner-1", "operator-1", "po-1", {
      requestId: "receive-123", items: [{ itemId: "item-1", quantity: 3 }],
    })).rejects.toThrow("超过采购数量");
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it("部分到货增库并把采购单置为 PARTIALLY_RECEIVED", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst
      .mockResolvedValueOnce({
        id: "po-1", merchantId: "merchant-1", orderNo: "PO001", status: "ORDERED",
        items: [{ id: "item-1", productId: "product-1", skuId: null, productTitle: "测试商品", quantity: 5, receivedQuantity: 0 }],
      })
      .mockResolvedValueOnce({ id: "po-1", status: "PARTIALLY_RECEIVED", items: [] });
    tx.purchaseOrderItem.findMany.mockResolvedValue([{ quantity: 5, receivedQuantity: 2 }]);

    const result = await service.receivePurchaseOrder("merchant-1", "owner-1", "operator-1", "po-1", {
      requestId: "receive-234", items: [{ itemId: "item-1", quantity: 2 }],
    });

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: "product-1", userId: "owner-1", stock: 10 }, data: { stock: 12 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: "PURCHASE_IN", quantity: 2, beforeStock: 10, afterStock: 12,
      referenceType: "PURCHASE_ORDER", referenceId: "po-1",
    }) });
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith({ where: { id: "po-1" }, data: { status: "PARTIALLY_RECEIVED" } });
    expect(result.replayed).toBe(false);
  });

  it("已发货退货仅在验收合格后回补库存", async () => {
    const { service, tx, shopRefund } = createService();
    tx.afterSale.findUnique.mockResolvedValue({ id: "as-1", orderId: "o-1", type: "refund_with_return", status: "APPROVED", reason: "质量问题", logistics: JSON.stringify({ returnAddress: "退货地址", company: "顺丰", logisticsNo: "SF123" }) });
    tx.order.findFirst.mockResolvedValue({ id: "o-1", merchantId: "merchant-1", targetId: "product-1", skuId: null, quantity: 2, status: "SHIPPED" });
    const result = await service.inspectReturn("merchant-1", "owner-1", "operator-1", "as-1", {
      requestId: "inspect-123", accepted: true, quantity: 2, remark: "商品完好",
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: "product-1", userId: "owner-1", stock: 10 }, data: { stock: 12 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: "REFUND_RETURN", quantity: 2, referenceType: "RETURN", referenceId: "as-1",
      idempotencyKey: "return-inspection:merchant-1:inspect-123",
    }) });
    expect(result.restocked).toBe(true);
    expect(shopRefund.refundOrder).toHaveBeenCalledWith("o-1", "质量问题");
    expect(tx.afterSale.updateMany).toHaveBeenLastCalledWith({
      where: { id: "as-1", status: "PROCESSING" }, data: { status: "COMPLETED" },
    });
  });

  it("退货验收不合格时驳回售后且不增加库存、不退款", async () => {
    const { service, tx, shopRefund } = createService();
    tx.afterSale.findUnique.mockResolvedValue({ id: "as-2", orderId: "o-2", type: "return", status: "APPROVED", logistics: JSON.stringify({ returnAddress: "退货地址", company: "圆通", logisticsNo: "YT123" }) });
    tx.order.findFirst.mockResolvedValue({ id: "o-2", merchantId: "merchant-1", targetId: "product-1", skuId: null, quantity: 1, status: "SHIPPED" });
    const result = await service.inspectReturn("merchant-1", "owner-1", "operator-1", "as-2", {
      requestId: "inspect-456", accepted: false, remark: "商品破损",
    });
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(result.restocked).toBe(false);
    expect(shopRefund.refundOrder).not.toHaveBeenCalled();
    expect(tx.afterSale.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REJECTED" }),
    }));
  });

  it("验收入库后退款失败回到 APPROVED，使用同一 requestId 重试不重复加库存", async () => {
    const { service, tx, shopRefund } = createService();
    const movement = { id: "movement-old", idempotencyKey: "return-inspection:merchant-1:inspect-retry" };
    tx.afterSale.findUnique.mockResolvedValue({
      id: "as-3", orderId: "o-3", type: "refund_with_return", status: "APPROVED", reason: "质量问题",
      logistics: JSON.stringify({ returnAddress: "退货地址", company: "顺丰", logisticsNo: "SF999", inspection: "ACCEPTED" }),
    });
    tx.order.findFirst.mockResolvedValue({ id: "o-3", merchantId: "merchant-1", targetId: "product-1", skuId: null, quantity: 1, status: "SHIPPED" });
    tx.inventoryMovement.findUnique.mockResolvedValue(movement);
    shopRefund.refundOrder.mockRejectedValue(new Error("渠道故障"));

    await expect(service.inspectReturn("merchant-1", "owner-1", "operator-1", "as-3", {
      requestId: "inspect-retry", accepted: true,
    })).rejects.toThrow("渠道故障");

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(tx.afterSale.updateMany).toHaveBeenLastCalledWith({
      where: { id: "as-3", status: "PROCESSING" }, data: { status: "APPROVED" },
    });
  });
});
