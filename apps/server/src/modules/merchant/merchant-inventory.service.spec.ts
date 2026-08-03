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
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      purchaseOrderItem: {
        update: jest.fn(),
        findMany: jest.fn(),
      },
      purchaseReceipt: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: "receipt-1",
          receiptNo: "PR202607290001",
          ...data,
        })),
      },
      purchaseReceiptItem: {
        create: jest.fn(),
      },
      afterSale: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), count: jest.fn().mockResolvedValue(0) },
      order: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      inventoryAlertSetting: { findMany: jest.fn().mockResolvedValue([]) },
      merchantSupplier: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ...overrides,
    };
    const prisma: any = {
      ...tx,
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const shopRefund: any = { refundOrder: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
    return { service: new MerchantInventoryService(prisma, shopRefund), prisma, tx, shopRefund };
  }

  it("经营总览汇总补货、到货、发货与售后待办", async () => {
    const { service, prisma } = createService();
    prisma.product.findMany = jest.fn().mockResolvedValue([
      { id: "product-1", stock: 2, skus: [] },
      { id: "product-2", stock: 0, skus: [{ id: "sku-2", stock: 0 }] },
    ]);
    prisma.inventoryAlertSetting.findMany.mockResolvedValue([
      { stockKey: "product-1:PRODUCT", lowStockThreshold: 3 },
    ]);
    prisma.inventoryMovement.count = jest.fn().mockResolvedValue(12);
    prisma.purchaseOrder.findMany.mockResolvedValue([
      {
        status: "ORDERED",
        expectedAt: new Date(Date.now() - 86_400_000),
        items: [{ quantity: 10, receivedQuantity: 4 }],
      },
      {
        status: "DRAFT",
        expectedAt: null,
        items: [{ quantity: 3, receivedQuantity: 0 }],
      },
    ]);
    prisma.order.count.mockResolvedValue(5);
    prisma.order.findMany.mockResolvedValue([{ id: "order-1" }]);
    prisma.order.groupBy.mockResolvedValue([
      { status: "PENDING", _sum: { quantity: 4 } },
      { status: "PAID", _sum: { quantity: 6 } },
    ]);
    prisma.afterSale.count.mockResolvedValue(2);

    await expect(service.overview("merchant-1", "owner-1")).resolves.toEqual({
      skuCount: 2,
      totalStock: 2,
      availableStock: 2,
      physicalOnHandStock: 12,
      unpaidReservedUnitCount: 4,
      unshippedUnitCount: 6,
      lowStockCount: 2,
      outOfStockCount: 1,
      stockHealthRate: 0,
      missingAlertCount: 1,
      movementCount: 12,
      pendingPurchaseCount: 2,
      pendingReceiptUnitCount: 9,
      overduePurchaseCount: 1,
      unshippedOrderCount: 5,
      pendingAfterSaleCount: 2,
    });
  });

  it("库存列表区分可售、待付款占用、待发货与账面现货", async () => {
    const { service, prisma } = createService();
    prisma.product.findMany = jest.fn().mockResolvedValue([
      {
        id: "product-1", title: "测试商品", images: [], stock: 7,
        skus: [{ id: "sku-1", stock: 5, specs: { 颜色: "玄青" }, createdAt: new Date() }],
      },
    ]);
    prisma.order.groupBy.mockResolvedValue([
      { targetId: "product-1", skuId: "sku-1", status: "PENDING", _sum: { quantity: 2 } },
      { targetId: "product-1", skuId: "sku-1", status: "PAID", _sum: { quantity: 3 } },
    ]);

    const result = await service.stocks("merchant-1", "owner-1", { page: 1, pageSize: 20 } as any);

    expect(result.items[0]).toEqual(expect.objectContaining({
      stock: 5,
      availableStock: 5,
      physicalOnHandStock: 10,
      unpaidReservedUnitCount: 2,
      unshippedUnitCount: 3,
    }));
  });

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
    })).rejects.toThrow("超过未到货数量");
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
      referenceType: "PURCHASE_RECEIPT", referenceId: "receipt-1",
    }) });
    expect(tx.purchaseReceiptItem.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      receiptId: "receipt-1", purchaseOrderItemId: "item-1",
      acceptedQuantity: 2, rejectedQuantity: 0,
    }) });
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith({ where: { id: "po-1" }, data: { status: "PARTIALLY_RECEIVED" } });
    expect(result.replayed).toBe(false);
  });

  it("库存盘点按实物总数扣除订单占用后写回可售库存", async () => {
    const { service, tx } = createService();
    tx.order.groupBy.mockResolvedValue([
      { status: "PENDING", _sum: { quantity: 2 } },
      { status: "PAID", _sum: { quantity: 3 } },
    ]);

    const result = await service.adjust("merchant-1", "owner-1", "operator-1", {
      requestId: "stocktake-physical-1",
      productId: "product-1",
      mode: "SET",
      quantity: 17,
      reason: "月末仓库实物盘点",
    });

    expect(tx.order.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: {
        merchantId: "merchant-1",
        type: "PRODUCT",
        targetId: "product-1",
        skuId: null,
        status: { in: ["PENDING", "PAID"] },
      },
      _sum: { quantity: true },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: "product-1", userId: "owner-1", stock: 10 },
      data: { stock: 12 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "STOCKTAKE_GAIN",
        quantity: 2,
        beforeStock: 10,
        afterStock: 12,
        metadata: expect.objectContaining({
          countedPhysicalStock: 17,
          unpaidReservedUnitCount: 2,
          unshippedUnitCount: 3,
          reservedUnitCount: 5,
          calculatedAvailableStock: 12,
        }),
      }),
    });
    expect(result.replayed).toBe(false);
  });

  it("库存盘点实物数低于订单占用时拒绝，避免生成负可售库存", async () => {
    const { service, tx } = createService();
    tx.order.groupBy.mockResolvedValue([
      { status: "PENDING", _sum: { quantity: 2 } },
      { status: "PAID", _sum: { quantity: 3 } },
    ]);

    await expect(service.adjust("merchant-1", "owner-1", "operator-1", {
      requestId: "stocktake-physical-2",
      productId: "product-1",
      mode: "SET",
      quantity: 4,
      reason: "仓库复盘",
    })).rejects.toThrow("盘点实物数不能低于订单占用数");

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("到货质检只把合格数量入库并完整记录拒收原因", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst
      .mockResolvedValueOnce({
        id: "po-1", merchantId: "merchant-1", orderNo: "PO001", status: "ORDERED",
        items: [{
          id: "item-1", productId: "product-1", skuId: null, productTitle: "测试商品",
          quantity: 5, receivedQuantity: 0, rejectedQuantity: 0,
        }],
      })
      .mockResolvedValueOnce({ id: "po-1", status: "PARTIALLY_RECEIVED", items: [] });
    tx.purchaseOrderItem.findMany.mockResolvedValue([
      { quantity: 5, receivedQuantity: 2, rejectedQuantity: 1 },
    ]);

    const result = await service.receivePurchaseOrder("merchant-1", "owner-1", "operator-1", "po-1", {
      requestId: "receive-qc-1",
      warehouseName: "杭州一号仓",
      remark: "外箱轻微受潮，已留存照片",
      items: [{
        itemId: "item-1",
        quantity: 2,
        rejectedQuantity: 1,
        rejectionReason: "外包装破损",
      }],
    });

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: "product-1", userId: "owner-1", stock: 10 }, data: { stock: 12 },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.purchaseOrderItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: {
        receivedQuantity: { increment: 2 },
        rejectedQuantity: { increment: 1 },
      },
    });
    expect(tx.purchaseReceiptItem.create).toHaveBeenCalledWith({
      data: {
        receiptId: "receipt-1",
        purchaseOrderItemId: "item-1",
        productId: "product-1",
        skuId: null,
        productTitle: "测试商品",
        skuLabel: null,
        acceptedQuantity: 2,
        rejectedQuantity: 1,
        rejectionReason: "外包装破损",
      },
    });
    expect(tx.purchaseReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        warehouseName: "杭州一号仓",
        remark: "外箱轻微受潮，已留存照片",
        requestId: "receive-qc-1",
      }),
    });
    expect(result.replayed).toBe(false);
  });

  it("整批拒收不增加库存且相同 requestId 重放不重复写入", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst
      .mockResolvedValueOnce({
        id: "po-1", merchantId: "merchant-1", orderNo: "PO001", status: "ORDERED",
        items: [{
          id: "item-1", productId: "product-1", skuId: null, productTitle: "测试商品",
          quantity: 2, receivedQuantity: 0, rejectedQuantity: 0,
        }],
      })
      .mockResolvedValueOnce({ id: "po-1", status: "RECEIVED", items: [] });
    tx.purchaseOrderItem.findMany.mockResolvedValue([
      { quantity: 2, receivedQuantity: 0, rejectedQuantity: 2 },
    ]);

    await service.receivePurchaseOrder("merchant-1", "owner-1", "operator-1", "po-1", {
      requestId: "receive-reject-all",
      items: [{
        itemId: "item-1",
        quantity: 0,
        rejectedQuantity: 2,
        rejectionReason: "错发规格",
      }],
    });

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(tx.purchaseReceiptItem.create).toHaveBeenCalledTimes(1);

    const existingReceipt = { id: "receipt-1", purchaseOrderId: "po-1", items: [] };
    tx.purchaseReceipt.findUnique.mockResolvedValue(existingReceipt);
    const replayOrder = { id: "po-1", status: "RECEIVED", items: [] };
    tx.purchaseOrder.findFirst.mockResolvedValue(replayOrder);
    const replay = await service.receivePurchaseOrder("merchant-1", "owner-1", "operator-1", "po-1", {
      requestId: "receive-reject-all",
      items: [{
        itemId: "item-1",
        quantity: 0,
        rejectedQuantity: 2,
        rejectionReason: "错发规格",
      }],
    });

    expect(replay).toEqual({ order: replayOrder, receipt: existingReceipt, replayed: true });
    expect(tx.purchaseReceipt.create).toHaveBeenCalledTimes(1);
    expect(tx.purchaseReceiptItem.create).toHaveBeenCalledTimes(1);
  });

  it("验收批次按采购单和商家隔离并按时间倒序返回", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1" });
    tx.purchaseReceipt.findMany.mockResolvedValue([
      { id: "receipt-2", receivedAt: new Date("2026-07-29T10:00:00Z"), items: [] },
      { id: "receipt-1", receivedAt: new Date("2026-07-28T10:00:00Z"), items: [] },
    ]);

    await expect(service.listPurchaseReceipts("merchant-1", "po-1")).resolves.toHaveLength(2);
    expect(tx.purchaseOrder.findFirst).toHaveBeenCalledWith({
      where: { id: "po-1", merchantId: "merchant-1" },
      select: { id: true },
    });
    expect(tx.purchaseReceipt.findMany).toHaveBeenCalledWith({
      where: { merchantId: "merchant-1", purchaseOrderId: "po-1" },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    });
  });

  it("从供应商档案建立采购单时快照联系人并保留关联", async () => {
    const { service, tx } = createService();
    tx.merchantSupplier.findFirst.mockResolvedValue({
      id: "supplier-1", merchantId: "merchant-1", name: "临安文房供应社",
      contactName: "陈掌柜", contactPhone: "13800000000", status: "ACTIVE",
    });
    tx.purchaseOrder.create.mockImplementation(({ data }) => Promise.resolve({ id: "po-1", ...data }));

    const result = await service.createPurchaseOrder("merchant-1", "owner-1", "operator-1", {
      supplierId: "supplier-1",
      supplierName: "临安文房供应社",
      items: [{ productId: "product-1", quantity: 6, unitCost: 68.5 }],
    });

    expect(tx.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        merchantId: "merchant-1",
        supplierId: "supplier-1",
        supplierName: "临安文房供应社",
        contactName: "陈掌柜",
        contactPhone: "13800000000",
        totalAmount: 411,
      }),
    }));
    expect(result.supplierId).toBe("supplier-1");
  });

  it("采购单仅在首次确认时累计供应商采购统计", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst
      .mockResolvedValueOnce({
        id: "po-1", merchantId: "merchant-1", supplierId: "supplier-1",
        status: "DRAFT", totalAmount: 1280, items: [],
      })
      .mockResolvedValueOnce({ id: "po-1", status: "ORDERED", items: [] });

    await service.submitPurchaseOrder("merchant-1", "po-1");

    expect(tx.purchaseOrder.updateMany).toHaveBeenCalledWith({
      where: { id: "po-1", merchantId: "merchant-1", status: "DRAFT" },
      data: { status: "ORDERED" },
    });
    expect(tx.merchantSupplier.updateMany).toHaveBeenCalledWith({
      where: { id: "supplier-1", merchantId: "merchant-1" },
      data: {
        purchaseCount: { increment: 1 },
        totalPurchaseAmount: { increment: 1280 },
        lastPurchasedAt: expect.any(Date),
      },
    });
  });

  it("草稿或已下单的采购单可以取消并返回最新状态", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      merchantId: "merchant-1",
      status: "CANCELLED",
      items: [],
    });

    const result = await service.cancelPurchaseOrder("merchant-1", "po-1");

    expect(tx.purchaseOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: "po-1",
        merchantId: "merchant-1",
        status: { in: ["DRAFT", "ORDERED"] },
      },
      data: { status: "CANCELLED" },
    });
    expect(result).toEqual(expect.objectContaining({ status: "CANCELLED" }));
  });

  it("已入库或状态已变化的采购单拒绝取消", async () => {
    const { service, tx } = createService();
    tx.purchaseOrder.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.cancelPurchaseOrder("merchant-1", "po-received"),
    ).rejects.toThrow("采购单已入库或当前状态不可取消");
    expect(tx.purchaseOrder.findFirst).not.toHaveBeenCalled();
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
