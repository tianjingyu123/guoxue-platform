import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreatePurchaseOrderDto, InventoryAdjustmentDto, InventoryAlertSettingDto,
  InventoryListQueryDto, InventoryMovementQueryDto, PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
  ReturnInspectionDto,
} from "./merchant.dto";

type DbClient = PrismaService | Prisma.TransactionClient;
type StockTarget = { productId: string; skuId: string | null; title: string; skuLabel: string | null; stock: number };

@Injectable()
export class MerchantInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private bad(message: string): never {
    throw new BusinessException(ErrorCode.BAD_REQUEST, message);
  }

  private stockKey(productId: string, skuId?: string | null) {
    return `${productId}:${skuId || "PRODUCT"}`;
  }

  private skuLabel(specs: unknown): string | null {
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) return null;
    const values = Object.values(specs as Record<string, unknown>).map(String).filter(Boolean);
    return values.length ? values.join(" / ") : null;
  }

  private async resolveTarget(db: DbClient, shopUserId: string, productId: string, skuId?: string | null): Promise<StockTarget> {
    const product = await db.product.findFirst({
      where: { id: productId, userId: shopUserId, deletedAt: null },
      include: { skus: true },
    });
    if (!product) return this.bad("商品不存在或不属于当前店铺");
    if (product.skus.length) {
      if (!skuId) return this.bad("多规格商品必须选择SKU");
      const sku = product.skus.find((item) => item.id === skuId);
      if (!sku) return this.bad("SKU不存在或与商品不匹配");
      return { productId, skuId, title: product.title, skuLabel: this.skuLabel(sku.specs), stock: sku.stock };
    }
    if (skuId) return this.bad("单规格商品不能指定SKU");
    return { productId, skuId: null, title: product.title, skuLabel: null, stock: product.stock };
  }

  async overview(merchantId: string, shopUserId: string) {
    const products = await this.prisma.product.findMany({
      where: { userId: shopUserId, deletedAt: null },
      select: { id: true, stock: true, skus: { select: { id: true, stock: true } } },
    });
    const settings = await this.prisma.inventoryAlertSetting.findMany({ where: { merchantId, enabled: true } });
    const thresholds = new Map(settings.map((item) => [item.stockKey, item.lowStockThreshold]));
    const stocks = products.flatMap((product) => product.skus.length
      ? product.skus.map((sku) => ({ key: this.stockKey(product.id, sku.id), stock: sku.stock }))
      : [{ key: this.stockKey(product.id), stock: product.stock }]);
    const [movementCount, pendingPurchaseCount] = await Promise.all([
      this.prisma.inventoryMovement.count({ where: { merchantId } }),
      this.prisma.purchaseOrder.count({ where: { merchantId, status: { in: ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"] } } }),
    ]);
    return {
      skuCount: stocks.length,
      totalStock: stocks.reduce((sum, item) => sum + item.stock, 0),
      lowStockCount: stocks.filter((item) => item.stock <= (thresholds.get(item.key) ?? 5)).length,
      outOfStockCount: stocks.filter((item) => item.stock === 0).length,
      movementCount,
      pendingPurchaseCount,
    };
  }

  async stocks(merchantId: string, shopUserId: string, q: InventoryListQueryDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const products = await this.prisma.product.findMany({
      where: { userId: shopUserId, deletedAt: null, ...(q.keyword ? { title: { contains: q.keyword, mode: "insensitive" as const } } : {}) },
      include: { skus: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" },
    });
    const settings = await this.prisma.inventoryAlertSetting.findMany({ where: { merchantId } });
    const settingMap = new Map(settings.map((item) => [item.stockKey, item]));
    let rows = products.flatMap((product) => {
      const variants = product.skus.length ? product.skus : [{ id: null, stock: product.stock, specs: null }];
      return variants.map((sku) => {
        const setting = settingMap.get(this.stockKey(product.id, sku.id));
        const threshold = setting?.enabled === false ? null : (setting?.lowStockThreshold ?? 5);
        return {
          productId: product.id, skuId: sku.id, title: product.title, image: product.images[0] || null,
          skuLabel: this.skuLabel(sku.specs), stock: sku.stock, threshold,
          lowStock: threshold !== null && sku.stock <= threshold,
        };
      });
    });
    if (q.lowStock) rows = rows.filter((item) => item.lowStock);
    return { items: rows.slice(skip, skip + pageSize), total: rows.length, page, pageSize };
  }

  async movements(merchantId: string, q: InventoryMovementQueryDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const where: Prisma.InventoryMovementWhereInput = {
      merchantId, ...(q.productId ? { productId: q.productId } : {}), ...(q.type ? { type: q.type as any } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async adjust(merchantId: string, shopUserId: string, operatorId: string, dto: InventoryAdjustmentDto) {
    const idempotencyKey = `inventory-adjust:${merchantId}:${dto.requestId}`;
    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.inventoryMovement.findUnique({ where: { idempotencyKey } });
      if (replay) return { movement: replay, replayed: true };
      const target = await this.resolveTarget(tx, shopUserId, dto.productId, dto.skuId);
      const delta = dto.mode === "SET" ? dto.quantity - target.stock : dto.mode === "INCREASE" ? dto.quantity : -dto.quantity;
      if (!delta) return this.bad("库存没有变化");
      const afterStock = target.stock + delta;
      if (afterStock < 0) return this.bad("库存不足，不能调整为负数");
      const changed = target.skuId
        ? await tx.productSku.updateMany({ where: { id: target.skuId, stock: target.stock }, data: { stock: afterStock } })
        : await tx.product.updateMany({ where: { id: target.productId, userId: shopUserId, stock: target.stock }, data: { stock: afterStock } });
      if (changed.count !== 1) return this.bad("库存已被其他操作修改，请刷新后重试");
      const movement = await tx.inventoryMovement.create({ data: {
        merchantId, productId: target.productId, skuId: target.skuId,
        type: dto.mode === "SET" ? (delta > 0 ? "STOCKTAKE_GAIN" : "STOCKTAKE_LOSS") : (delta > 0 ? "ADJUST_IN" : "ADJUST_OUT"),
        quantity: delta, beforeStock: target.stock, afterStock,
        referenceType: dto.mode === "SET" ? "STOCKTAKE" : "ADJUSTMENT", referenceId: dto.requestId,
        idempotencyKey, operatorId, reason: dto.reason, metadata: { title: target.title, skuLabel: target.skuLabel },
      } });
      return { movement, replayed: false };
    });
  }

  async setAlert(merchantId: string, shopUserId: string, dto: InventoryAlertSettingDto) {
    const target = await this.resolveTarget(this.prisma, shopUserId, dto.productId, dto.skuId);
    const stockKey = this.stockKey(target.productId, target.skuId);
    return this.prisma.inventoryAlertSetting.upsert({
      where: { merchantId_stockKey: { merchantId, stockKey } },
      create: { merchantId, productId: target.productId, skuId: target.skuId, stockKey, lowStockThreshold: dto.lowStockThreshold, enabled: dto.enabled ?? true },
      update: { lowStockThreshold: dto.lowStockThreshold, enabled: dto.enabled ?? true },
    });
  }

  alerts(merchantId: string, shopUserId: string) {
    return this.stocks(merchantId, shopUserId, Object.assign(new InventoryListQueryDto(), { page: 1, pageSize: 100, lowStock: true }));
  }

  async createPurchaseOrder(merchantId: string, shopUserId: string, operatorId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.items?.length) return this.bad("采购单至少需要一条明细");
    return this.prisma.$transaction(async (tx) => {
      const items = [] as Array<{ productId: string; skuId: string | null; productTitle: string; skuLabel: string | null; quantity: number; unitCost: number }>;
      for (const row of dto.items) {
        const target = await this.resolveTarget(tx, shopUserId, row.productId, row.skuId);
        items.push({ productId: target.productId, skuId: target.skuId, productTitle: target.title, skuLabel: target.skuLabel, quantity: row.quantity, unitCost: row.unitCost });
      }
      return tx.purchaseOrder.create({ data: {
        merchantId, orderNo: `PO${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`,
        supplierName: dto.supplierName, contactName: dto.contactName, contactPhone: dto.contactPhone,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
        totalAmount: items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0), createdBy: operatorId,
        remark: dto.remark, items: { create: items },
      }, include: { items: true } });
    });
  }

  async listPurchaseOrders(merchantId: string, q: PurchaseOrderQueryDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const where: Prisma.PurchaseOrderWhereInput = { merchantId, ...(q.status ? { status: q.status as any } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getPurchaseOrder(merchantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, merchantId }, include: { items: true } });
    if (!order) return this.bad("采购单不存在");
    return order;
  }

  async submitPurchaseOrder(merchantId: string, id: string) {
    const result = await this.prisma.purchaseOrder.updateMany({ where: { id, merchantId, status: "DRAFT" }, data: { status: "ORDERED" } });
    if (result.count !== 1) return this.bad("采购单不存在或当前状态不可确认");
    return this.getPurchaseOrder(merchantId, id);
  }

  async cancelPurchaseOrder(merchantId: string, id: string) {
    const result = await this.prisma.purchaseOrder.updateMany({ where: { id, merchantId, status: { in: ["DRAFT", "ORDERED"] } }, data: { status: "CANCELLED" } });
    if (result.count !== 1) return this.bad("采购单已入库或当前状态不可取消");
    return this.getPurchaseOrder(merchantId, id);
  }

  async receivePurchaseOrder(merchantId: string, shopUserId: string, operatorId: string, id: string, dto: ReceivePurchaseOrderDto) {
    if (!dto.items?.length) return this.bad("本次收货至少需要一条明细");
    const prefix = `purchase-receive:${merchantId}:${dto.requestId}`;
    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.inventoryMovement.findFirst({ where: { idempotencyKey: { startsWith: prefix } } });
      if (replay) return { order: await tx.purchaseOrder.findFirst({ where: { id, merchantId }, include: { items: true } }), replayed: true };
      const order = await tx.purchaseOrder.findFirst({ where: { id, merchantId }, include: { items: true } });
      if (!order || !["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)) return this.bad("采购单不存在或当前状态不可入库");
      const seen = new Set<string>();
      for (let index = 0; index < dto.items.length; index += 1) {
        const incoming = dto.items[index];
        if (seen.has(incoming.itemId)) return this.bad("同一采购明细不能重复提交");
        seen.add(incoming.itemId);
        const item = order.items.find((row) => row.id === incoming.itemId);
        if (!item) return this.bad("采购明细不存在");
        if (item.receivedQuantity + incoming.quantity > item.quantity) return this.bad(`商品“${item.productTitle}”收货数量超过采购数量`);
        const target = await this.resolveTarget(tx, shopUserId, item.productId, item.skuId);
        const afterStock = target.stock + incoming.quantity;
        const changed = target.skuId
          ? await tx.productSku.updateMany({ where: { id: target.skuId, stock: target.stock }, data: { stock: afterStock } })
          : await tx.product.updateMany({ where: { id: target.productId, userId: shopUserId, stock: target.stock }, data: { stock: afterStock } });
        if (changed.count !== 1) return this.bad("库存已被其他操作修改，请刷新后重试");
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: { increment: incoming.quantity } } });
        await tx.inventoryMovement.create({ data: {
          merchantId, productId: target.productId, skuId: target.skuId, type: "PURCHASE_IN", quantity: incoming.quantity,
          beforeStock: target.stock, afterStock, referenceType: "PURCHASE_ORDER", referenceId: order.id,
          idempotencyKey: `${prefix}:${index}:${item.id}`, operatorId, reason: `采购单${order.orderNo}到货入库`,
          metadata: { purchaseOrderItemId: item.id, title: target.title, skuLabel: target.skuLabel },
        } });
      }
      const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const complete = refreshed.every((item) => item.receivedQuantity >= item.quantity);
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED" } });
      return { order: await tx.purchaseOrder.findFirst({ where: { id: order.id }, include: { items: true } }), replayed: false };
    });
  }

  async inspectReturn(
    merchantId: string, shopUserId: string, operatorId: string,
    afterSaleId: string, dto: ReturnInspectionDto,
  ) {
    const afterSale = await this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    if (!afterSale || afterSale.status !== "APPROVED" || !/return/i.test(afterSale.type)) {
      return this.bad("退货售后不存在或当前状态不可验收");
    }
    const order = await this.prisma.order.findFirst({ where: { id: afterSale.orderId, merchantId } });
    if (!order || !order.targetId) return this.bad("售后订单不存在或不属于当前店铺");
    const quantity = dto.quantity ?? order.quantity;
    if (quantity > order.quantity) return this.bad("验收入库数量不能超过订单购买数量");
    const key = `return-inspection:${merchantId}:${dto.requestId}`;

    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.inventoryMovement.findUnique({ where: { idempotencyKey: key } });
      if (replay) return { movement: replay, replayed: true };
      if (!dto.accepted) {
        const changed = await tx.afterSale.updateMany({
          where: { id: afterSaleId, status: "APPROVED" },
          data: { status: "COMPLETED", logistics: JSON.stringify({ inspection: "REJECTED", remark: dto.remark || "退货验收不合格" }) },
        });
        if (changed.count !== 1) return this.bad("售后状态已变化，请刷新后重试");
        return { movement: null, replayed: false, restocked: false };
      }
      const target = await this.resolveTarget(tx, shopUserId, order.targetId, order.skuId);
      const afterStock = target.stock + quantity;
      const stockChanged = target.skuId
        ? await tx.productSku.updateMany({ where: { id: target.skuId, stock: target.stock }, data: { stock: afterStock } })
        : await tx.product.updateMany({ where: { id: target.productId, userId: shopUserId, stock: target.stock }, data: { stock: afterStock } });
      if (stockChanged.count !== 1) return this.bad("库存已被其他操作修改，请刷新后重试");
      const completed = await tx.afterSale.updateMany({
        where: { id: afterSaleId, status: "APPROVED" },
        data: { status: "COMPLETED", logistics: JSON.stringify({ inspection: "ACCEPTED", quantity, remark: dto.remark || "退货验收入库" }) },
      });
      if (completed.count !== 1) return this.bad("售后状态已变化，请刷新后重试");
      const movement = await tx.inventoryMovement.create({ data: {
        merchantId, productId: target.productId, skuId: target.skuId,
        type: "REFUND_RETURN", quantity, beforeStock: target.stock, afterStock,
        referenceType: "RETURN", referenceId: afterSaleId, idempotencyKey: key,
        operatorId, reason: dto.remark || "退货验收合格入库",
        metadata: { orderId: order.id, afterSaleId, refundStage: "AFTER_SHIPMENT" },
      } });
      return { movement, replayed: false, restocked: true };
    });
  }
}
