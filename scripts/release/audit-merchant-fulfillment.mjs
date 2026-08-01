#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function hasAll(content, patterns) {
  return patterns.every((pattern) =>
    typeof pattern === "string" ? content.includes(pattern) : pattern.test(content),
  );
}

const mobileInventory = read("apps/mobile/src/pkg-merchant/inventory/index.vue");
const merchantData = read("apps/mobile/src/pkg-merchant/lib/merchant-data.ts");
const adminInventory = read("apps/admin/src/views/merchant-backend/MerchantInventory.vue");
const serverController = read("apps/server/src/modules/merchant/merchant-backend.controller.ts");
const serverInventory = read("apps/server/src/modules/merchant/merchant-inventory.service.ts");
const serverInventoryTests = read("apps/server/src/modules/merchant/merchant-inventory.service.spec.ts");
const serverMerchant = read("apps/server/src/modules/merchant/merchant.service.ts");
const serverMerchantTests = read("apps/server/src/modules/merchant/merchant.service.spec.ts");
const serverShipping = read("apps/server/src/modules/merchant/merchant-shipping.service.ts");
const serverShippingTests = read("apps/server/src/modules/merchant/merchant-shipping.service.spec.ts");
const serverLogistics = read("apps/server/src/modules/shop/logistics.service.ts");
const serverLogisticsTests = read("apps/server/src/modules/shop/logistics.service.spec.ts");
const shopRefund = read("apps/server/src/modules/shop/shop-refund.service.ts");
const shopRefundTests = read("apps/server/src/modules/shop/shop-refund.service.spec.ts");
const adminApi = read("apps/admin/src/api/index.ts");
const adminShipping = read("apps/admin/src/views/merchant-backend/MerchantShipping.vue");
const adminOrders = read("apps/admin/src/views/merchant-backend/MerchantOrders.vue");
const adminCustomers = read("apps/admin/src/views/merchant-backend/MerchantCustomers.vue");
const adminAfterSales = read("apps/admin/src/views/merchant-backend/MerchantAfterSales.vue");
const adminDashboard = read("apps/admin/src/views/merchant-backend/MerchantDashboard.vue");
const mobileDashboard = read("apps/mobile/src/pkg-merchant/dashboard/index.vue");
const adminRevenue = read("apps/admin/src/views/merchant-backend/MerchantRevenue.vue");
const mobileRevenue = read("apps/mobile/src/pkg-merchant/revenue/index.vue");
const mobileAnalytics = read("apps/mobile/src/pkg-merchant/analytics/index.vue");
const mobileContentStats = read("apps/mobile/src/pkg-merchant/content-stats/index.vue");
const mobileOrderDetail = read("apps/mobile/src/pkg-merchant/order-detail/index.vue");
const mobileCustomers = read("apps/mobile/src/pkg-merchant/customers/index.vue");
const mobileOrders = read("apps/mobile/src/pkg-merchant/orders/index.vue");
const prismaSchema = read("apps/server/prisma/schema.prisma");

const checks = [
  {
    name: "移动端采购单支持读取并展示不可变的到货质检批次",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "merchantBackendApi.getPurchaseReceipts",
      "receipt-history-sheet",
      "history-batch",
      "rejectionReason",
    ]),
  },
  {
    name: "PC 商家后台支持按采购单查看验收批次、仓库和拒收原因",
    file: "apps/admin/src/views/merchant-backend/MerchantInventory.vue",
    pass: hasAll(adminInventory, [
      "merchantBackendApi.listPurchaseReceipts",
      "receipt-log-card",
      "receipt.warehouseName",
      "item.rejectionReason",
    ]),
  },
  {
    name: "服务端提供按商家隔离的采购验收批次查询接口",
    file: "apps/server/src/modules/merchant/merchant-backend.controller.ts",
    pass:
      hasAll(serverController, [
        '@Get("purchase-orders/:id/receipts")',
        "inventoryService.listPurchaseReceipts",
      ]) &&
      hasAll(serverInventory, [
        "async listPurchaseReceipts",
        "purchaseReceipt.findMany",
        "purchaseOrderId",
      ]),
  },
  {
    name: "服务端测试保护验收批次商家隔离和排序",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.spec.ts",
    pass: hasAll(serverInventoryTests, [
      'listPurchaseReceipts("merchant-1", "po-1")',
      "receivedAt: \"desc\"",
      "purchaseReceipt.findMany",
    ]),
  },
  {
    name: "移动端库存档案按商品与 SKU 双键读取并展示精确流水",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "async function openStockDetail",
      "merchantBackendApi.getInventoryMovements",
      "productId: item.productId",
      "skuId: item.skuId || undefined",
      "(movement.skuId || null) === (item.skuId || null)",
      "全部流水",
    ]),
  },
  {
    name: "移动端 SKU 档案保留预警、盘点、报损和采购四类动作",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "runStockDetailAction('threshold')",
      "runStockDetailAction('stocktake')",
      "runStockDetailAction('damage')",
      "runStockDetailAction('purchase')",
    ]),
  },
  {
    name: "移动端采购支持筛选、建单、确认、取消与分批验收",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "purchaseFilters",
      "createPurchaseOrder",
      "submitPurchaseOrder",
      "cancelPurchaseOrder",
      "receivePurchaseOrder",
      "分批验收",
    ]),
  },
  {
    name: "移动端采购可复用供应商档案并自动回填联系人和建议交期",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "activeSuppliers",
      "applySupplier(supplier)",
      "supplierId: draft.supplierId || undefined",
      "supplier.leadTimeDays",
      "常用供货方",
    ]),
  },
  {
    name: "移动端到货质检区分合格与拒收数量并记录原因、仓库和批次备注",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "rejectedQuantities",
      "rejectionReason",
      "合格品才进入可售库存",
      "warehouseName: draft.warehouseName",
      "拒收原因",
    ]),
  },
  {
    name: "移动端库存工作台具备平板弹层边界和横向筛选防溢出",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(mobileInventory, [
      "@media (min-width:700px)",
      "width:min(720px,100%)",
      "max-height:88vh",
      ".purchase-filters{width:100%;white-space:nowrap",
      ".purchase-filter-row{display:inline-flex",
    ]),
  },
  {
    name: "PC 库存档案支持行级进入、精确流水和四类库存动作",
    file: "apps/admin/src/views/merchant-backend/MerchantInventory.vue",
    pass: hasAll(adminInventory, [
      '@row-click="openStockFile"',
      'size="min(520px, 94vw)"',
      "movement.productId===movementFocus.value?.productId",
      "(movement.skuId||null)===(movementFocus.value?.skuId||null)",
      "runStockFileAction('alert')",
      "runStockFileAction('stocktake')",
      "runStockFileAction('damage')",
      "runStockFileAction('purchase')",
    ]),
  },
  {
    name: "PC 履约主线可达采购、批量发货和售后验收",
    file: "apps/admin/src/views/merchant-backend/MerchantInventory.vue",
    pass: hasAll(adminInventory, [
      "新建采购单",
      "/merchant-backend/shipping",
      "/merchant-backend/after-sales",
      "到货验收",
      "合格回补、不合格留证",
    ]),
  },
  {
    name: "PC 经营台具备供应商档案、停启用和一键创建采购单",
    file: "apps/admin/src/views/merchant-backend/MerchantInventory.vue",
    pass: hasAll(adminInventory, [
      "供应商档案",
      "openSupplierEditor",
      "setSupplierStatus",
      "useSupplierForPurchase",
      "supplierId:purchaseForm.supplierId||undefined",
    ]),
  },
  {
    name: "PC 到货质检明确合格入库与拒收留痕并展示批次合计",
    file: "apps/admin/src/views/merchant-backend/MerchantInventory.vue",
    pass: hasAll(adminInventory, [
      "receiveRejectedTotal",
      "拒收留痕",
      "rejectionReason",
      "确认质检批次",
      "合格品进入可售库存",
    ]),
  },
  {
    name: "移动端数据契约保留库存引用键及采购、物流、售后接口",
    file: "apps/mobile/src/pkg-merchant/lib/merchant-data.ts",
    pass: hasAll(merchantData, [
      "productId?: string; skuId?: string | null; referenceType?: string | null; referenceId?: string | null",
      "/merchant-backend/orders/batch-ship",
      "/merchant-backend/orders/${id}/shipment",
      "/merchant-backend/after-sales/${afterSaleId}/return-inspection",
      "/merchant-backend/purchase-orders/${id}/receive",
    ]),
  },
  {
    name: "移动端库存台账区分账面现货、待付款、待发货和可售数量",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass:
      hasAll(merchantData, [
        "availableStock: number; physicalOnHandStock: number",
        "unpaidReservedUnitCount: number; unshippedUnitCount: number",
      ]) &&
      hasAll(mobileInventory, [
        "overview.physicalOnHandStock",
        "overview.unpaidReservedUnitCount",
        "overview.unshippedUnitCount",
        "item.availableStock",
        "stock-balance-strip",
      ]),
  },
  {
    name: "PC 库存台账以账面、占用和可售四列呈现订单占用关系",
    file: "apps/admin/src/views/merchant-backend/MerchantInventory.vue",
    pass: hasAll(adminInventory, [
      'prop="physicalOnHandStock" label="账面现货"',
      'prop="unpaidReservedUnitCount" label="待付款"',
      'prop="unshippedUnitCount" label="待发货"',
      'prop="availableStock" label="可售"',
      "stock-file-breakdown",
    ]),
  },
  {
    name: "服务端保留库存、采购、物流和退货验收真实路由",
    file: "apps/server/src/modules/merchant/merchant-backend.controller.ts",
    pass: hasAll(serverController, [
      '@Post("orders/batch-ship")',
      '@Get("orders/:id/shipment")',
      '@Post("after-sales/:id/return-inspection")',
      '@Get("inventory/movements")',
      '@Post("inventory/adjustments")',
      '@Post("purchase-orders/:id/receive")',
    ]),
  },
  {
    name: "服务端库存测试覆盖退货验收幂等与重复请求",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.spec.ts",
    pass: hasAll(serverInventoryTests, [
      "return-inspection:",
      "inspect-retry",
      "idempotencyKey",
    ]),
  },
  {
    name: "服务端到货质检以批次幂等且只有合格品产生库存流水",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.ts",
    pass: hasAll(serverInventory, [
      "purchaseReceipt.findUnique",
      'referenceType: "PURCHASE_RECEIPT"',
      "rejectedQuantity",
      "receiptNo",
      "acceptedQuantity > 0",
    ]),
  },
  {
    name: "服务端到货质检测试覆盖混合验收、整批拒收与批次重放",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.spec.ts",
    pass: hasAll(serverInventoryTests, [
      "到货质检只把合格数量入库并完整记录拒收原因",
      "整批拒收不增加库存且相同 requestId 重放不重复写入",
      "purchaseReceiptItem.create",
    ]),
  },
  {
    name: "服务端供应商档案与采购统计采用真实关联并防重复累计",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.ts",
    pass: hasAll(serverInventory, [
      "resolveSupplierForPurchase",
      "supplierId: supplier.id",
      "purchaseCount: { increment: 1 }",
      'status: "DRAFT"',
      "result.count !== 1",
    ]),
  },
  {
    name: "服务端按待付款和待发货订单聚合占用并反算账面现货",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.ts",
    pass:
      hasAll(serverInventory, [
        'status: { in: ["PENDING", "PAID"] }',
        "unpaidReservedUnitCount",
        "unshippedUnitCount",
        "physicalOnHandStock",
      ]) &&
      hasAll(serverInventoryTests, [
        "库存列表区分可售、待付款占用、待发货与账面现货",
        "physicalOnHandStock: 10",
      ]),
  },
  {
    name: "库存盘点按仓库实物总数扣除订单占用后写回可售且不释放预留库存",
    file: "apps/server/src/modules/merchant/merchant-inventory.service.ts",
    pass:
      hasAll(serverInventory, [
        "countedPhysicalStock",
        "targetAvailableStock",
        "reservedUnitCount",
        "盘点实物数不能低于订单占用数",
      ]) &&
      hasAll(serverInventoryTests, [
        "库存盘点按实物总数扣除订单占用后写回可售库存",
        "库存盘点实物数低于订单占用时拒绝",
      ]) &&
      hasAll(adminInventory, [
        "仓库实物总数",
        "physicalOnHandStock",
      ]) &&
      hasAll(mobileInventory, [
        "输入仓库实物总数",
        "physicalOnHandStock",
      ]),
  },
  {
    name: "平台自营未发货订单退款同样回补库存且不伪造商家流水",
    file: "apps/server/src/modules/shop/shop-refund.service.ts",
    pass:
      hasAll(shopRefund, [
        'order.status === "PAID" && !isStocklessOrderType(order.type)',
        "if (order.merchantId && productId && beforeStock !== null)",
      ]) &&
      hasAll(shopRefundTests, [
        "平台自营未发货订单退款：同样回补库存但不伪造商家流水",
        "inventoryMovement.create).not.toHaveBeenCalled",
      ]),
  },
  {
    name: "服务端订单列表批量补齐真实运单并避免发货页逐行查询",
    file: "apps/server/src/modules/merchant/merchant.service.ts",
    pass:
      hasAll(serverMerchant, [
        "orderLogistics.findMany",
        "shipCompany: logistics?.company",
        "trackingNo: logistics?.logisticsNo",
        "shipmentUpdatedAt: logistics?.updatedAt",
      ]) &&
      hasAll(serverMerchantTests, [
        "订单列表批量补齐真实运单，发货页无需逐行查询",
        "orderLogistics.findMany",
      ]),
  },
  {
    name: "PC 批量发货使用服务端批量接口并保留失败订单重试",
    file: "apps/admin/src/views/merchant-backend/MerchantShipping.vue",
    pass:
      hasAll(adminApi, [
        "batchShipOrders",
        'api.post("/merchant-backend/orders/batch-ship", { items })',
      ]) &&
      hasAll(adminShipping, [
        "merchantBackendApi.batchShipOrders",
        "failedIds.has(row.id)",
        "失败 ${result.failedCount} 单",
      ]),
  },
  {
    name: "物流回调保留异常、派送与退回语义，并阻止终态被延迟回调倒退",
    file: "apps/server/src/modules/shop/logistics.service.ts",
    pass:
      hasAll(serverLogistics, [
        "TERMINAL_LOGISTICS_STATUSES",
        "normalizePushState",
        "OUT_FOR_DELIVERY",
        "EXCEPTION",
        "RETURNING",
        'status: { notIn: [...TERMINAL_LOGISTICS_STATUSES] }',
      ]) &&
      hasAll(serverLogisticsTests, [
        "异常与退回状态保留业务语义",
        "非终态延迟回调不得把已签收或已退回运单倒退",
      ]),
  },
  {
    name: "实时物流不可用时服务端、移动端与 PC 端统一回退已同步轨迹",
    file: "apps/server/src/modules/merchant/merchant-shipping.service.ts",
    pass:
      hasAll(serverShipping, [
        "persistedTracks",
        "当前展示最近一次已同步的物流轨迹",
        "实时物流暂时不可用，当前展示最近一次已同步的轨迹",
      ]) &&
      hasAll(serverShippingTests, [
        "实时物流不可用时回退到数据库已同步轨迹",
        "实时物流查询异常时仍展示数据库最近一次轨迹",
      ]) &&
      hasAll(adminShipping, [
        "merchantBackendApi.getShipment(row.id)",
        "logisticsStateText",
        "OUT_FOR_DELIVERY",
      ]) &&
      hasAll(mobileOrderDetail, [
        "OUT_FOR_DELIVERY: '派送中'",
        "EXCEPTION: '物流异常'",
        "RETURNED: '已退回'",
      ]),
  },
  {
    name: "订单页不能绕过售后申请与退货验收直接退款",
    file: "apps/server/src/modules/merchant/merchant.service.ts",
    pass:
      hasAll(serverMerchant, [
        "该订单没有待处理的退款申请，请到售后管理核对",
        "退货退款请到售后管理填写退货地址",
        "this.processAfterSale(merchantId, afterSale.id, { action: \"approve\" })",
      ]) &&
      hasAll(serverMerchantTests, [
        "旧订单退款端点必须先命中真实的仅退款售后单",
        "旧订单退款端点禁止绕过退货验收入库",
        "旧订单退款端点禁止无售后申请直接退款",
      ]) &&
      hasAll(adminOrders, [
        'router.push("/merchant-backend/after-sales")',
        "买家发起的退款/退货申请，请到「售后管理」页处理",
      ]) &&
      !hasAll(adminOrders, ["REFUNDABLE", "doApproveRefund"]),
  },
  {
    name: "Prisma 模型保留供应商唯一性、状态索引和采购单外键",
    file: "apps/server/prisma/schema.prisma",
    pass: hasAll(prismaSchema, [
      "model MerchantSupplier",
      "@@unique([merchantId, name])",
      "@@index([merchantId, status, updatedAt])",
      "supplierId   String?",
      "supplier     MerchantSupplier?",
    ]),
  },
  {
    name: "Prisma 模型保存不可变到货质检批次、明细快照和请求幂等键",
    file: "apps/server/prisma/schema.prisma",
    pass: hasAll(prismaSchema, [
      "model PurchaseReceipt",
      "model PurchaseReceiptItem",
      "@@unique([merchantId, requestId])",
      "productTitle",
      "rejectedQuantity",
    ]),
  },
  {
    name: "PC 订单中枢保留稳定经营快照并可直达发货和售后工作台",
    file: "apps/admin/src/views/merchant-backend/MerchantOrders.vue",
    pass: hasAll(adminOrders, [
      "订单中枢 · ORDER CONTROL",
      "orderMetrics",
      "overviewList",
      "goShipping",
      "goAfterSales",
    ]),
  },
  {
    name: "PC 履约控制台具备稳定指标、批量发货和真实物流轨迹",
    file: "apps/admin/src/views/merchant-backend/MerchantShipping.vue",
    pass: hasAll(adminShipping, [
      "履约控制台 · FULFILLMENT CONTROL",
      "shippingMetrics",
      "overviewList",
      "merchantBackendApi.batchShipOrders",
      "merchantBackendApi.getShipment",
    ]),
  },
  {
    name: "PC 售后质检台具备稳定指标和退货验收入库闭环",
    file: "apps/admin/src/views/merchant-backend/MerchantAfterSales.vue",
    pass: hasAll(adminAfterSales, [
      "售后质检台 · SERVICE RECOVERY",
      "afterSalesMetrics",
      "overviewList",
      "验收不合格",
      "验收入库并退款",
      "merchantBackendApi.inspectReturn",
    ]),
  },
  {
    name: "PC 经营驾驶舱以稳定经营快照串联订单、收入、履约、售后与口碑",
    file: "apps/admin/src/views/merchant-backend/MerchantDashboard.vue",
    pass: hasAll(adminDashboard, [
      "经营脉搏 · BUSINESS PULSE",
      "const cards = computed",
      "pendingShip",
      "pendingAfterSales",
      "router.push(card.path)",
      "merchantBackendApi.listOrders",
      "/merchant-backend/shipping",
      "/merchant-backend/after-sales",
      "/merchant-backend/revenue",
      "/merchant-backend/reviews",
    ]),
  },
  {
    name: "移动端经营指标支持收入、订单、在售商品与评价直接下钻",
    file: "apps/mobile/src/pkg-merchant/dashboard/index.vue",
    pass: hasAll(mobileDashboard, [
      "@tap=\"openRevenue\"",
      "@tap=\"openTodayOrders\"",
      "@tap=\"openOnSaleProducts\"",
      "@tap=\"openReviews\"",
      "openOrdersForDay",
      "m-cell-link",
    ]),
  },
  {
    name: "PC 资金对账中心区分商家留成、平台服务费与结算账期汇总",
    file: "apps/admin/src/views/merchant-backend/MerchantRevenue.vue",
    pass: hasAll(adminRevenue, [
      "资金对账中心 · SETTLEMENT LEDGER",
      "filteredList",
      "merchantShare",
      "pendingSettlement",
      "settledAmount",
      "platformFeeText",
      "merchantBackendApi.listSettlements",
    ]),
  },
  {
    name: "移动端结算收入优先使用全量聚合金额并正确换算平台服务费",
    file: "apps/mobile/src/pkg-merchant/revenue/index.vue",
    pass:
      hasAll(mobileRevenue, [
        "revenue.value.pendingSettlement != null",
        "revenue.value.settledAmount != null",
        "merchantShareRate",
        "platformFeePct",
        "1 - merchantShareRate.value",
      ]) &&
      hasAll(merchantData, [
        "merchantShareRate?: number",
        "pendingSettlement?: number",
        "settledAmount?: number",
      ]),
  },
  {
    name: "移动端经营分析使用真实订单时间窗并提供趋势、结构、风险与业务下钻",
    file: "apps/mobile/src/pkg-merchant/analytics/index.vue",
    pass: hasAll(mobileAnalytics, [
      "merchantBackendApi.getOrders",
      "startDate: startDate.value",
      "dailyTrend",
      "orderStructure",
      "actionList",
      "/merchant/batch-ship",
      "/merchant/reviews",
      "/merchant/revenue",
      "没有足够样本时不伪造增长率和趋势",
    ]),
  },
  {
    name: "内容资产中心以真实商品和文章聚合替代陈旧占位并提供业务下钻",
    file: "apps/mobile/src/pkg-merchant/content-stats/index.vue",
    pass:
      hasAll(serverMerchant, [
        "this.prisma.article.count",
        "this.prisma.article.aggregate",
        "publishedArticles",
        "articleEngagement._sum.viewCount",
      ]) &&
      hasAll(serverMerchantTests, [
        'describe("内容资产统计"',
        'auditStatus: "APPROVED"',
        "viewCount: 1260",
        "likeCount: 84",
      ]) &&
      hasAll(mobileContentStats, [
        "内容资产图谱",
        "productPublishRate",
        "averageViews",
        "engagementRate",
        "/merchant/products",
        "/pages/circles/index",
        "没有阅读或互动时保持为 0",
      ]) &&
      !mobileContentStats.includes("图文内容管理即将开放"),
  },
  {
    name: "客户档案以有效交易口径生成详情，并保持手机号脱敏与本店隔离",
    file: "apps/server/src/modules/merchant/merchant.service.ts",
    pass:
      hasAll(serverController, [
        '@Get("customers/:id")',
        "getCustomerDetail",
      ]) &&
      hasAll(serverMerchant, [
        "async getCustomerDetail",
        'status: { in: ["PAID", "SHIPPED", "COMPLETED"] }',
        "averageOrderValue",
        "refundedOrderCount",
        "maskPhone(customer.phone)",
      ]) &&
      hasAll(serverMerchantTests, [
        'getCustomerDetail("m1", "u-customer")',
        'phone: "138****8000"',
        "averageOrderValue: 180",
      ]),
  },
  {
    name: "移动端客户档案可查看交易关系、最近订单并按客户下钻全部订单",
    file: "apps/mobile/src/pkg-merchant/customers/index.vue",
    pass:
      hasAll(merchantData, [
        "export interface MerchantCustomerDetail",
        "getCustomerDetail: (id: string)",
        "customerId?: string",
        "q.set('customerId', params.customerId)",
      ]) &&
      hasAll(mobileCustomers, [
        'class="detail-sheet"',
        "detail.averageOrderValue",
        "detail.recentOrders",
        "goCustomerOrders",
      ]) &&
      hasAll(mobileOrders, [
        "const customerId = ref('')",
        "customerId: customerId.value || undefined",
        "customerName.value",
      ]),
  },
  {
    name: "PC 商家后台客户档案具备价值分层、最近订单和单笔订单下钻闭环",
    file: "apps/admin/src/views/merchant-backend/MerchantCustomers.vue",
    pass:
      hasAll(adminApi, ["getCustomerDetail", "customerId?: string"]) &&
      hasAll(adminCustomers, [
        'class="value-hero"',
        'class="recent-orders"',
        "merchantBackendApi.getCustomerDetail",
        "goCustomerOrders",
        "goOrder(order.id)",
      ]) &&
      hasAll(adminOrders, [
        "const focusOrderId",
        "merchantBackendApi.getOrder(focusOrderId.value)",
        "params.customerId = customerId.value",
        'class="customer-scope"',
      ]),
  },
  {
    name: "无真实业务闭环的圈子绑定与客户咨询孤页不得重新混入商家端",
    file: "apps/mobile/src/pkg-merchant",
    pass:
      !exists("apps/mobile/src/pkg-merchant/circle-bindding/index.vue") &&
      !exists("apps/mobile/src/pkg-merchant/inquiries/index.vue"),
  },
];

const failed = checks.filter((item) => !item.pass);

console.log("商家库存、采购、质检、物流与售后发布审计");
console.log(`检查结果：${checks.length - failed.length}/${checks.length} 通过`);
for (const item of checks) {
  console.log(`${item.pass ? "通过" : "失败"}：${item.name}（${item.file}）`);
}

if (failed.length > 0) {
  console.error(`发布门禁失败：${failed.length} 项商家履约规则不满足。`);
  process.exit(1);
}

console.log("商家履约门禁通过：移动端与 PC 端库存档案、采购质检、物流和售后链路均有静态防回归保护。");
