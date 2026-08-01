import { Test } from "@nestjs/testing";
import { MerchantBackendController } from "./merchant-backend.controller";
import { MerchantService } from "./merchant.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { MerchantInventoryService } from "./merchant-inventory.service";
import { MerchantShippingService } from "./merchant-shipping.service";
import { MerchantGuard } from "./merchant.guard";

const mockMerchantSvc = {
  getDashboard: jest.fn().mockResolvedValue({ todayOrders: 5, totalProducts: 10, pendingReviews: 2, totalSales: 10000 }),
  getMerchantById: jest.fn().mockResolvedValue({ id: "m1", shopName: "店铺A" }),
  updateProfile: jest.fn().mockResolvedValue({ id: "m1" }),
  listProducts: jest.fn().mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 }),
  createProduct: jest.fn().mockResolvedValue({ id: "p1" }),
  getProduct: jest.fn().mockResolvedValue({ id: "p1", userId: "u1", status: "PENDING" }),
  updateProduct: jest.fn().mockResolvedValue({ count: 1 }),
  deleteProduct: jest.fn().mockResolvedValue({ count: 1 }),
  listProduct: jest.fn().mockResolvedValue({ count: 1 }),
  unlistProduct: jest.fn().mockResolvedValue({ count: 1 }),
  listOrders: jest.fn().mockResolvedValue({ list: [], total: 0 }),
  getOrder: jest.fn().mockResolvedValue({ id: "o1", merchantId: "m1", status: "PAID" }),
  approveRefund: jest.fn().mockResolvedValue({ count: 1 }),
  listReviews: jest.fn().mockResolvedValue({ list: [], total: 0 }),
  replyReview: jest.fn().mockResolvedValue({ id: "r1" }),
  listViolations: jest.fn().mockResolvedValue({ list: [], total: 0 }),
  appealViolation: jest.fn().mockResolvedValue({ id: "v1" }),
  listMembers: jest.fn().mockResolvedValue([]),
  listMemberAudit: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
};

const mockSettlementSvc = {
  getRevenueOverview: jest.fn().mockResolvedValue({ totalSales: 5000, merchantShare: 4000 }),
  listSettlements: jest.fn().mockResolvedValue({ list: [], total: 0 }),
};
const mockInventorySvc = {
  overview: jest.fn(), stocks: jest.fn(), movements: jest.fn(), adjust: jest.fn(),
  alerts: jest.fn(), setAlert: jest.fn(), createPurchaseOrder: jest.fn(),
  listPurchaseOrders: jest.fn(), getPurchaseOrder: jest.fn(), submitPurchaseOrder: jest.fn(),
  receivePurchaseOrder: jest.fn(), cancelPurchaseOrder: jest.fn(),
};
const mockShippingSvc = {
  shipOrder: jest.fn().mockResolvedValue({ success: true }),
  batchShipOrders: jest.fn().mockResolvedValue({ successCount: 1, failedCount: 0, items: [] }),
  getShipment: jest.fn().mockResolvedValue({ logistics: null, track: null }),
  updateShipment: jest.fn().mockResolvedValue({ success: true }),
};

describe("MerchantBackendController", () => {
  let ctrl: MerchantBackendController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MerchantBackendController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantSvc },
        { provide: MerchantSettlementService, useValue: mockSettlementSvc },
        { provide: MerchantInventoryService, useValue: mockInventorySvc },
        { provide: MerchantShippingService, useValue: mockShippingSvc },
      ],
    })
      .overrideGuard(MerchantGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MerchantBackendController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = () => {
    const req: any = { user: { id: "u1" } };
    req.merchant = { id: "m1", userId: "u1", status: "ACTIVE" };
    req.merchantRole = "OWNER";
    req.actingUserId = "u1";
    return req;
  };

  it("GET /merchant-backend/dashboard — 数据概览", async () => {
    const result = await ctrl.getDashboard(mockReq());
    expect(result.todayOrders).toBe(5);
  });

  it("GET /merchant-backend/profile — 获取店铺信息", async () => {
    const result = await ctrl.getProfile(mockReq());
    expect(result.shopName).toBe("店铺A");
  });

  it("PUT /merchant-backend/profile — 更新店铺信息", async () => {
    const result = await ctrl.updateProfile(mockReq(), { shopName: "新名称" });
    expect(result.id).toBe("m1");
    expect(mockMerchantSvc.updateProfile).toHaveBeenCalled();
  });

  it("GET /merchant-backend/products — 商品列表", async () => {
    const result = await ctrl.listProducts(mockReq(), {});
    expect(result.list).toHaveLength(0);
  });

  it("POST /merchant-backend/products — 发布商品", async () => {
    const result = await ctrl.createProduct(mockReq(), { title: "测试商品", detail: "<p>详情</p>", price: 99, stock: 10 } as any);
    expect(result.id).toBe("p1");
  });

  it("PUT /merchant-backend/orders/:id/ship — 发货", async () => {
    const result = await ctrl.shipOrder(mockReq(), "o1", { company: "顺丰", trackingNo: "SF123" });
    expect(result.success).toBe(true);
    expect(mockShippingSvc.shipOrder).toHaveBeenCalledWith("m1", "u1", "o1", { company: "顺丰", trackingNo: "SF123" });
  });

  it("POST /merchant-backend/orders/batch-ship — 批量发货", async () => {
    const result = await ctrl.batchShipOrders(mockReq(), { items: [{ orderId: "o1", company: "顺丰", trackingNo: "SF123" }] });
    expect(result.successCount).toBe(1);
  });

  it("GET/PUT /merchant-backend/orders/:id/shipment — 查询并修改运单", async () => {
    await ctrl.getShipment(mockReq(), "o1");
    await ctrl.updateShipment(mockReq(), "o1", { company: "中通快递", trackingNo: "ZT456" });
    expect(mockShippingSvc.getShipment).toHaveBeenCalledWith("m1", "o1");
    expect(mockShippingSvc.updateShipment).toHaveBeenCalledWith("m1", "u1", "o1", { company: "中通快递", trackingNo: "ZT456" });
  });

  it("GET /merchant-backend/revenue — 收入概览", async () => {
    const result = await ctrl.getRevenue(mockReq());
    expect(result.merchantShare).toBe(4000);
  });

  it("GET /merchant-backend/members — 返回当前店铺成员", async () => {
    await ctrl.listMembers(mockReq());
    expect(mockMerchantSvc.listMembers).toHaveBeenCalledWith("m1", "u1");
  });

  it("GET /merchant-backend/members/audit — 仅店主查看本店审计", async () => {
    const result = await ctrl.listMemberAudit(mockReq(), { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(0);
    expect(mockMerchantSvc.listMemberAudit).toHaveBeenCalledWith("m1", { page: 1, pageSize: 20 });

    const operatorReq = mockReq() as any;
    operatorReq.merchantRole = "OPERATOR";
    expect(() => ctrl.listMemberAudit(operatorReq, {})).toThrow("仅店主可管理操作员");
  });

  it("GET /merchant-backend/violations — 违规记录", async () => {
    const result = await ctrl.listViolations(mockReq(), {});
    expect(result.list).toHaveLength(0);
  });
});
