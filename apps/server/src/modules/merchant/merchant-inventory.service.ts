import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import {
  isReturnRefundType,
  parseAfterSaleLogistics,
  stringifyAfterSaleLogistics,
} from "../shop/after-sale-type";
import {
  CreatePurchaseOrderDto, InventoryAdjustmentDto, InventoryAlertSettingDto,
  InventoryListQueryDto, InventoryMovementQueryDto, PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto, SupplierQueryDto, SupplierStatusDto, UpsertSupplierDto,
  ReturnInspectionDto,
} from "./merchant.dto";

type DbClient = PrismaService | Prisma.TransactionClient;
type StockTarget = { productId: string; skuId: string | null; title: string; skuLabel: string | null; stock: number };

@Injectable()
export class MerchantInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopRefund: ShopRefundService,
  ) {}

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
      include: { skus: { where: { isActive: true } } },
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
      select: { id: true, stock: true, skus: { where: { isActive: true }, select: { id: true, stock: true } } },
    });
    const settings = await this.prisma.inventoryAlertSetting.findMany({ where: { merchantId, enabled: true } });
    const thresholds = new Map(settings.map((item) => [item.stockKey, item.lowStockThreshold]));
    const stocks = products.flatMap((product) => product.skus.length
      ? product.skus.map((sku) => ({ key: this.stockKey(product.id, sku.id), stock: sku.stock }))
      : [{ key: this.stockKey(product.id), stock: product.stock }]);
    const [movementCount, pendingPurchases, unshippedOrderCount, merchantOrders, reservedOrders] = await Promise.all([
      this.prisma.inventoryMovement.count({ where: { merchantId } }),
      this.prisma.purchaseOrder.findMany({
        where: { merchantId, status: { in: ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"] } },
        select: {
          status: true,
          expectedAt: true,
          items: { select: { quantity: true, receivedQuantity: true, rejectedQuantity: true } },
        },
      }),
      this.prisma.order.count({ where: { merchantId, type: "PRODUCT", status: "PAID" } }),
      this.prisma.order.findMany({
        where: {
          merchantId,
          type: "PRODUCT",
          status: { in: ["PAID", "SHIPPED", "COMPLETED", "REFUNDED"] },
        },
        select: { id: true },
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        where: { merchantId, type: "PRODUCT", status: { in: ["PENDING", "PAID"] } },
        _sum: { quantity: true },
      }),
    ]);
    const orderIds = merchantOrders.map((order) => order.id);
    const pendingAfterSaleCount = orderIds.length
      ? await this.prisma.afterSale.count({
        where: { orderId: { in: orderIds }, status: { in: ["PENDING", "APPROVED", "PROCESSING"] } },
      })
      : 0;
    const lowStockCount = stocks.filter((item) => item.stock <= (thresholds.get(item.key) ?? 5)).length;
    const pendingReceiptUnitCount = pendingPurchases.reduce(
      (total, order) => total + order.items.reduce(
        (sum, item) => sum + Math.max(0, item.quantity - item.receivedQuantity - (item.rejectedQuantity || 0)),
        0,
      ),
      0,
    );
    const now = Date.now();
    const overduePurchaseCount = pendingPurchases.filter((order) =>
      order.status !== "DRAFT"
      && order.expectedAt != null
      && order.expectedAt.getTime() < now,
    ).length;
    const availableStock = stocks.reduce((sum, item) => sum + item.stock, 0);
    const unpaidReservedUnitCount = reservedOrders.find((item) => item.status === "PENDING")?._sum.quantity ?? 0;
    const unshippedUnitCount = reservedOrders.find((item) => item.status === "PAID")?._sum.quantity ?? 0;
    return {
      skuCount: stocks.length,
      // Product.stock / ProductSku.stock 在创建订单时已原子扣减，因此这里是「当前可售」，
      // 不是仓库里的全部实物。待付款与待发货尚未离仓，需加回才能得到盘点口径的账面现货。
      totalStock: availableStock,
      availableStock,
      physicalOnHandStock: availableStock + unpaidReservedUnitCount + unshippedUnitCount,
      unpaidReservedUnitCount,
      unshippedUnitCount,
      lowStockCount,
      outOfStockCount: stocks.filter((item) => item.stock === 0).length,
      stockHealthRate: stocks.length ? Math.round(((stocks.length - lowStockCount) / stocks.length) * 100) : 100,
      missingAlertCount: stocks.filter((item) => !thresholds.has(item.key)).length,
      movementCount,
      pendingPurchaseCount: pendingPurchases.length,
      pendingReceiptUnitCount,
      overduePurchaseCount,
      unshippedOrderCount,
      pendingAfterSaleCount,
    };
  }

  async stocks(merchantId: string, shopUserId: string, q: InventoryListQueryDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const [products, settings, reservations] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId: shopUserId, deletedAt: null, ...(q.keyword ? { title: { contains: q.keyword, mode: "insensitive" as const } } : {}) },
        include: { skus: { where: { isActive: true }, orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" },
      }),
      this.prisma.inventoryAlertSetting.findMany({ where: { merchantId } }),
      this.prisma.order.groupBy({
        by: ["targetId", "skuId", "status"],
        where: { merchantId, type: "PRODUCT", status: { in: ["PENDING", "PAID"] } },
        _sum: { quantity: true },
      }),
    ]);
    const settingMap = new Map(settings.map((item) => [item.stockKey, item]));
    const reservationMap = new Map<string, { unpaid: number; unshipped: number }>();
    for (const item of reservations) {
      const key = this.stockKey(item.targetId, item.skuId);
      const current = reservationMap.get(key) ?? { unpaid: 0, unshipped: 0 };
      const quantity = item._sum.quantity ?? 0;
      if (item.status === "PENDING") current.unpaid += quantity;
      if (item.status === "PAID") current.unshipped += quantity;
      reservationMap.set(key, current);
    }
    let rows = products.flatMap((product) => {
      const variants = product.skus.length ? product.skus : [{ id: null, stock: product.stock, specs: null }];
      return variants.map((sku) => {
        const stockKey = this.stockKey(product.id, sku.id);
        const setting = settingMap.get(stockKey);
        const reserved = reservationMap.get(stockKey) ?? { unpaid: 0, unshipped: 0 };
        const threshold = setting?.enabled === false ? null : (setting?.lowStockThreshold ?? 5);
        return {
          productId: product.id, skuId: sku.id, title: product.title, image: product.images[0] || null,
          skuLabel: this.skuLabel(sku.specs), stock: sku.stock,
          availableStock: sku.stock,
          physicalOnHandStock: sku.stock + reserved.unpaid + reserved.unshipped,
          unpaidReservedUnitCount: reserved.unpaid,
          unshippedUnitCount: reserved.unshipped,
          threshold,
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
      const reservations = dto.mode === "SET"
        ? await tx.order.groupBy({
            by: ["status"],
            where: {
              merchantId,
              type: "PRODUCT",
              targetId: target.productId,
              skuId: target.skuId,
              status: { in: ["PENDING", "PAID"] },
            },
            _sum: { quantity: true },
          })
        : [];
      const unpaidReservedUnitCount = reservations.find((item) => item.status === "PENDING")?._sum.quantity ?? 0;
      const unshippedUnitCount = reservations.find((item) => item.status === "PAID")?._sum.quantity ?? 0;
      const reservedUnitCount = unpaidReservedUnitCount + unshippedUnitCount;
      if (dto.mode === "SET" && dto.quantity < reservedUnitCount) {
        return this.bad(`盘点实物数不能低于订单占用数（当前占用 ${reservedUnitCount} 件）`);
      }
      // SET 接收仓库实物总数；订单创建时已从 stock 扣减，需先减去尚未出库的订单占用，
      // 再写回真正可继续销售的数量，避免盘点把已占用库存重新释放造成超卖。
      const targetAvailableStock = dto.mode === "SET" ? dto.quantity - reservedUnitCount : target.stock;
      const delta = dto.mode === "SET" ? targetAvailableStock - target.stock : dto.mode === "INCREASE" ? dto.quantity : -dto.quantity;
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
        idempotencyKey, operatorId, reason: dto.reason, metadata: {
          title: target.title,
          skuLabel: target.skuLabel,
          ...(dto.mode === "SET" ? {
            countedPhysicalStock: dto.quantity,
            unpaidReservedUnitCount,
            unshippedUnitCount,
            reservedUnitCount,
            calculatedAvailableStock: afterStock,
          } : {}),
        },
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

  async listSuppliers(merchantId: string, q: SupplierQueryDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const where: Prisma.MerchantSupplierWhereInput = {
      merchantId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.keyword ? {
        OR: [
          { name: { contains: q.keyword, mode: "insensitive" } },
          { contactName: { contains: q.keyword, mode: "insensitive" } },
          { contactPhone: { contains: q.keyword } },
        ],
      } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.merchantSupplier.findMany({
        where,
        orderBy: [{ status: "asc" }, { lastPurchasedAt: "desc" }, { updatedAt: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.merchantSupplier.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createSupplier(merchantId: string, dto: UpsertSupplierDto) {
    const name = dto.name.trim();
    const exists = await this.prisma.merchantSupplier.findUnique({
      where: { merchantId_name: { merchantId, name } },
    });
    if (exists) return this.bad("同名供应商档案已存在");
    return this.prisma.merchantSupplier.create({
      data: {
        merchantId,
        name,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        address: dto.address?.trim() || null,
        settlementTerms: dto.settlementTerms?.trim() || null,
        leadTimeDays: dto.leadTimeDays,
        remark: dto.remark?.trim() || null,
      },
    });
  }

  async updateSupplier(merchantId: string, id: string, dto: UpsertSupplierDto) {
    const current = await this.prisma.merchantSupplier.findFirst({ where: { id, merchantId } });
    if (!current) return this.bad("供应商档案不存在");
    const name = dto.name.trim();
    const duplicate = await this.prisma.merchantSupplier.findFirst({
      where: { merchantId, name, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) return this.bad("同名供应商档案已存在");
    return this.prisma.merchantSupplier.update({
      where: { id },
      data: {
        name,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        address: dto.address?.trim() || null,
        settlementTerms: dto.settlementTerms?.trim() || null,
        leadTimeDays: dto.leadTimeDays,
        remark: dto.remark?.trim() || null,
      },
    });
  }

  async setSupplierStatus(merchantId: string, id: string, dto: SupplierStatusDto) {
    const changed = await this.prisma.merchantSupplier.updateMany({
      where: { id, merchantId },
      data: { status: dto.status },
    });
    if (changed.count !== 1) return this.bad("供应商档案不存在");
    return this.prisma.merchantSupplier.findUnique({ where: { id } });
  }

  private async resolveSupplierForPurchase(
    tx: Prisma.TransactionClient,
    merchantId: string,
    dto: CreatePurchaseOrderDto,
  ) {
    if (dto.supplierId) {
      const supplier = await tx.merchantSupplier.findFirst({
        where: { id: dto.supplierId, merchantId, status: "ACTIVE" },
      });
      if (!supplier) return this.bad("供应商档案不存在、已停用或不属于当前店铺");
      const contactName = dto.contactName?.trim() || supplier.contactName;
      const contactPhone = dto.contactPhone?.trim() || supplier.contactPhone;
      if (contactName !== supplier.contactName || contactPhone !== supplier.contactPhone) {
        await tx.merchantSupplier.update({
          where: { id: supplier.id },
          data: { contactName, contactPhone },
        });
      }
      return { ...supplier, contactName, contactPhone };
    }

    const name = dto.supplierName.trim();
    const existing = await tx.merchantSupplier.findUnique({
      where: { merchantId_name: { merchantId, name } },
    });
    if (existing?.status === "INACTIVE") return this.bad("该供应商档案已停用，请先启用后再采购");
    if (existing) {
      const contactName = dto.contactName?.trim() || existing.contactName;
      const contactPhone = dto.contactPhone?.trim() || existing.contactPhone;
      return tx.merchantSupplier.update({
        where: { id: existing.id },
        data: { contactName, contactPhone },
      });
    }
    return tx.merchantSupplier.create({
      data: {
        merchantId,
        name,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
      },
    });
  }

  async createPurchaseOrder(merchantId: string, shopUserId: string, operatorId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.items?.length) return this.bad("采购单至少需要一条明细");
    return this.prisma.$transaction(async (tx) => {
      const supplier = await this.resolveSupplierForPurchase(tx, merchantId, dto);
      const items = [] as Array<{ productId: string; skuId: string | null; productTitle: string; skuLabel: string | null; quantity: number; unitCost: number }>;
      for (const row of dto.items) {
        const target = await this.resolveTarget(tx, shopUserId, row.productId, row.skuId);
        items.push({ productId: target.productId, skuId: target.skuId, productTitle: target.title, skuLabel: target.skuLabel, quantity: row.quantity, unitCost: row.unitCost });
      }
      return tx.purchaseOrder.create({ data: {
        merchantId, orderNo: `PO${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`,
        supplierId: supplier.id, supplierName: supplier.name,
        contactName: dto.contactName?.trim() || supplier.contactName,
        contactPhone: dto.contactPhone?.trim() || supplier.contactPhone,
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

  async listPurchaseReceipts(merchantId: string, purchaseOrderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, merchantId },
      select: { id: true },
    });
    if (!order) return this.bad("采购单不存在");
    return this.prisma.purchaseReceipt.findMany({
      where: { merchantId, purchaseOrderId },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async submitPurchaseOrder(merchantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id, merchantId, status: "DRAFT" },
        include: { items: true },
      });
      if (!order) return this.bad("采购单不存在或当前状态不可确认");
      const result = await tx.purchaseOrder.updateMany({
        where: { id, merchantId, status: "DRAFT" },
        data: { status: "ORDERED" },
      });
      if (result.count !== 1) return this.bad("采购单状态已变化，请刷新后重试");
      if (order.supplierId) {
        await tx.merchantSupplier.updateMany({
          where: { id: order.supplierId, merchantId },
          data: {
            purchaseCount: { increment: 1 },
            totalPurchaseAmount: { increment: order.totalAmount },
            lastPurchasedAt: new Date(),
          },
        });
      }
      return tx.purchaseOrder.findFirst({ where: { id, merchantId }, include: { items: true } });
    });
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
      const replay = await tx.purchaseReceipt.findUnique({
        where: { merchantId_requestId: { merchantId, requestId: dto.requestId } },
        include: { items: true },
      });
      if (replay) {
        return {
          order: await tx.purchaseOrder.findFirst({ where: { id, merchantId }, include: { items: true } }),
          receipt: replay,
          replayed: true,
        };
      }
      const order = await tx.purchaseOrder.findFirst({ where: { id, merchantId }, include: { items: true } });
      if (!order || !["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)) return this.bad("采购单不存在或当前状态不可入库");
      const seen = new Set<string>();
      for (const incoming of dto.items) {
        if (seen.has(incoming.itemId)) return this.bad("同一采购明细不能重复提交");
        seen.add(incoming.itemId);
        const item = order.items.find((row) => row.id === incoming.itemId);
        if (!item) return this.bad("采购明细不存在");
        const acceptedQuantity = incoming.quantity || 0;
        const rejectedQuantity = incoming.rejectedQuantity || 0;
        if (!Number.isInteger(acceptedQuantity) || !Number.isInteger(rejectedQuantity)) {
          return this.bad("验收数量必须为整数");
        }
        if (acceptedQuantity < 0 || rejectedQuantity < 0 || acceptedQuantity + rejectedQuantity <= 0) {
          return this.bad("每条明细至少填写一件合格或不合格商品");
        }
        const remaining = item.quantity - item.receivedQuantity - (item.rejectedQuantity || 0);
        if (acceptedQuantity + rejectedQuantity > remaining) {
          return this.bad(`商品“${item.productTitle}”验收数量超过未到货数量`);
        }
        if (rejectedQuantity > 0 && !incoming.rejectionReason?.trim()) {
          return this.bad(`商品“${item.productTitle}”存在不合格数量，请填写拒收原因`);
        }
      }
      const receipt = await tx.purchaseReceipt.create({
        data: {
          merchantId,
          purchaseOrderId: order.id,
          receiptNo: `PR${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`,
          requestId: dto.requestId,
          warehouseName: dto.warehouseName?.trim() || null,
          operatorId,
          remark: dto.remark?.trim() || null,
        },
      });
      seen.clear();
      for (let index = 0; index < dto.items.length; index += 1) {
        const incoming = dto.items[index];
        const item = order.items.find((row) => row.id === incoming.itemId)!;
        const acceptedQuantity = incoming.quantity || 0;
        const rejectedQuantity = incoming.rejectedQuantity || 0;
        if (acceptedQuantity > 0) {
          const target = await this.resolveTarget(tx, shopUserId, item.productId, item.skuId);
          const afterStock = target.stock + acceptedQuantity;
          const changed = target.skuId
            ? await tx.productSku.updateMany({ where: { id: target.skuId, stock: target.stock }, data: { stock: afterStock } })
            : await tx.product.updateMany({ where: { id: target.productId, userId: shopUserId, stock: target.stock }, data: { stock: afterStock } });
          if (changed.count !== 1) return this.bad("库存已被其他操作修改，请刷新后重试");
          await tx.inventoryMovement.create({ data: {
            merchantId, productId: target.productId, skuId: target.skuId, type: "PURCHASE_IN", quantity: acceptedQuantity,
            beforeStock: target.stock, afterStock, referenceType: "PURCHASE_RECEIPT", referenceId: receipt.id,
            idempotencyKey: `${prefix}:${index}:${item.id}`, operatorId, reason: `采购单${order.orderNo}质检合格入库`,
            metadata: {
              purchaseOrderId: order.id, purchaseOrderItemId: item.id, receiptNo: receipt.receiptNo,
              title: target.title, skuLabel: target.skuLabel, rejectedQuantity,
            },
          } });
        }
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: { increment: acceptedQuantity },
            rejectedQuantity: { increment: rejectedQuantity },
          },
        });
        await tx.purchaseReceiptItem.create({
          data: {
            receiptId: receipt.id,
            purchaseOrderItemId: item.id,
            productId: item.productId,
            skuId: item.skuId || null,
            productTitle: item.productTitle,
            skuLabel: item.skuLabel || null,
            acceptedQuantity,
            rejectedQuantity,
            rejectionReason: incoming.rejectionReason?.trim() || null,
          },
        });
      }
      const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const complete = refreshed.every((item) => item.receivedQuantity + (item.rejectedQuantity || 0) >= item.quantity);
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED" } });
      return {
        order: await tx.purchaseOrder.findFirst({ where: { id: order.id }, include: { items: true } }),
        receipt: await tx.purchaseReceipt.findUnique({ where: { id: receipt.id }, include: { items: true } }),
        replayed: false,
      };
    });
  }

  async inspectReturn(
    merchantId: string, shopUserId: string, operatorId: string,
    afterSaleId: string, dto: ReturnInspectionDto,
  ) {
    const afterSale = await this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    if (!afterSale || afterSale.status !== "APPROVED" || !isReturnRefundType(afterSale.type)) {
      return this.bad("退货售后不存在或当前状态不可验收");
    }
    const order = await this.prisma.order.findFirst({ where: { id: afterSale.orderId, merchantId } });
    if (!order || !order.targetId) return this.bad("售后订单不存在或不属于当前店铺");
    const quantity = dto.quantity ?? order.quantity;
    if (quantity > order.quantity) return this.bad("验收入库数量不能超过订单购买数量");
    const logistics = parseAfterSaleLogistics(afterSale.logistics);
    if (dto.accepted && (!logistics.company || !logistics.logisticsNo)) {
      return this.bad("买家尚未登记退货运单，不能确认验收入库");
    }
    const key = `return-inspection:${merchantId}:${dto.requestId}`;

    const inspection = await this.prisma.$transaction(async (tx) => {
      const replay = await tx.inventoryMovement.findUnique({ where: { idempotencyKey: key } });
      if (replay) {
        const changed = await tx.afterSale.updateMany({
          where: { id: afterSaleId, status: "APPROVED" },
          data: { status: "PROCESSING" },
        });
        if (changed.count !== 1) return this.bad("售后状态已变化，请刷新后重试");
        return { movement: replay, replayed: true, restocked: true };
      }
      if (!dto.accepted) {
        const changed = await tx.afterSale.updateMany({
          where: { id: afterSaleId, status: "APPROVED" },
          data: {
            status: "REJECTED",
            logistics: stringifyAfterSaleLogistics({
              ...logistics,
              inspection: "REJECTED",
              remark: dto.remark || "退货验收不合格",
            }),
          },
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
      const reserved = await tx.afterSale.updateMany({
        where: { id: afterSaleId, status: "APPROVED" },
        data: {
          status: "PROCESSING",
          logistics: stringifyAfterSaleLogistics({
            ...logistics,
            inspection: "ACCEPTED",
            quantity,
            remark: dto.remark || "退货验收入库",
          }),
        },
      });
      if (reserved.count !== 1) return this.bad("售后状态已变化，请刷新后重试");
      const movement = await tx.inventoryMovement.create({ data: {
        merchantId, productId: target.productId, skuId: target.skuId,
        type: "REFUND_RETURN", quantity, beforeStock: target.stock, afterStock,
        referenceType: "RETURN", referenceId: afterSaleId, idempotencyKey: key,
        operatorId, reason: dto.remark || "退货验收合格入库",
        metadata: { orderId: order.id, afterSaleId, refundStage: "AFTER_SHIPMENT" },
      } });
      return { movement, replayed: false, restocked: true };
    });

    if (!dto.accepted) return inspection;

    try {
      if (order.status !== "REFUNDED") {
        const refundResult = await this.shopRefund.refundOrder(order.id, afterSale.reason || "退货验收合格退款");
        if (refundResult.status === "PROCESSING") {
          return { ...inspection, refundStatus: "PROCESSING" };
        }
      }
      const finalized = await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PROCESSING" },
        data: { status: "COMPLETED" },
      });
      if (finalized.count !== 1) return this.bad("退款已完成，但售后状态同步失败");
      return { ...inspection, refundStatus: "SUCCESS" };
    } catch (error) {
      const latest = await this.prisma.order.findFirst({
        where: { id: order.id, merchantId },
        select: { status: true },
      });
      if (latest?.status === "REFUNDED") {
        await this.prisma.afterSale.update({ where: { id: afterSaleId }, data: { status: "COMPLETED" } });
        return { ...inspection, refundStatus: "SUCCESS" };
      }
      // 商品已实际验收入库，退款失败时回到 APPROVED 允许按同一 requestId 安全重试，绝不重复加库存。
      await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PROCESSING" },
        data: { status: "APPROVED" },
      });
      throw error;
    }
  }
}
