import { Test } from "@nestjs/testing";
import { MerchantService } from "./merchant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { NotificationService } from "../notification/notification.service";
import { SystemService } from "../system/system.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { ShopRefundService } from "../shop/shop-refund.service";

const mockFeatureFlag = { isEnabled: jest.fn().mockResolvedValue(true) };
const mockShopRefund = { refundOrder: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
const mockNotification = { send: jest.fn().mockResolvedValue(undefined) };
const mockSystemService = {
  getConfig: jest.fn((key: string) => {
    if (key === "merchant_deposit_base") return Promise.resolve({ configKey: "merchant_deposit_base", configValue: "1000" });
    if (key === "merchant_deposit_per_category") return Promise.resolve({ configKey: "merchant_deposit_per_category", configValue: "500" });
    return Promise.resolve(null);
  }),
  logAudit: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma: any = {
  $transaction: jest.fn((arg: any) => {
    if (typeof arg === "function") return arg(mockPrisma);
    return Promise.all(arg);
  }),
  merchant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  merchantViolation: { count: jest.fn() },
  order: {
    aggregate: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  orderLogistics: { findUnique: jest.fn(), upsert: jest.fn() },
  afterSale: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  product: { count: jest.fn(), findMany: jest.fn() },
  user: { findMany: jest.fn(), findFirst: jest.fn() },
  merchantMember: { findMany: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
  auditLog: { findMany: jest.fn(), count: jest.fn() },
  productReview: { count: jest.fn(), aggregate: jest.fn() },
};

describe("MerchantService", () => {
  let svc: MerchantService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FeatureFlagService, useValue: mockFeatureFlag },
        { provide: NotificationService, useValue: mockNotification },
        { provide: SystemService, useValue: mockSystemService },
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined) } },
        { provide: ShopRefundService, useValue: mockShopRefund },
      ],
    }).compile();
    svc = mod.get(MerchantService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockShopRefund.refundOrder.mockResolvedValue({ status: "SUCCESS" });
  });

  // ─── 入驻申请 ───

  describe("createApplication", () => {
    it("创建入驻申请成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      mockPrisma.merchant.create.mockResolvedValue({ id: "m1", userId: "u1", shopName: "测试店铺", status: "PENDING_REVIEW" });

      const result = await svc.createApplication("u1", {
        shopName: "测试店铺", contactName: "张三", contactPhone: "13800138000",
        idCardNumber: "110101199001011234", businessLicense: "https://cdn.example.com/license.jpg",
      } as any);

      expect(result.shopName).toBe("测试店铺");
      expect(result.status).toBe("PENDING_REVIEW");
    });

    it("重复申请抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1" });
      await expect(svc.createApplication("u1", { shopName: "测试" } as any)).rejects.toThrow(BusinessException);
    });
  });

  describe("getApplication", () => {
    it("返回申请状态", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", shopName: "测试店铺", status: "PENDING_REVIEW" });
      const result = await svc.getApplication("u1");
      expect(result.shopName).toBe("测试店铺");
    });

    it("无申请记录抛出 NotFoundException", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getApplication("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("updateApplication", () => {
    it("修改草稿申请", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING_REVIEW" });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", shopName: "新名称" });
      const result = await svc.updateApplication("u1", { shopName: "新名称" });
      expect(result.shopName).toBe("新名称");
    });

    it("非可修改状态抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "ACTIVE" });
      await expect(svc.updateApplication("u1", { shopName: "新名称" })).rejects.toThrow(BusinessException);
    });
  });

  describe("submitForReview", () => {
    it("提交审核成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", contactName: "张三",
        idCardNumber: "123", contactPhone: "13800138000", categoryIds: ["c1", "c2"], depositAmount: 0,
        businessLicense: "https://cdn.example.com/license.jpg",
      });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", status: "PENDING_REVIEW" });
      const result = await svc.submitForReview("u1");
      expect(result.status).toBe("PENDING_REVIEW");
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "AGREEMENT_PENDING", depositAmount: 0, depositPaid: false }),
      }));
    });

    it("信息不完整抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", contactName: null,
        idCardNumber: null, contactPhone: null, categoryIds: [],
      });
      await expect(svc.submitForReview("u1")).rejects.toThrow(BusinessException);
    });

    it("缺少营业执照时拒绝进入审核", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", contactName: "张三",
        idCardNumber: "123", contactPhone: "13800138000", categoryIds: ["c1"], businessLicense: null,
      });

      await expect(svc.submitForReview("u1")).rejects.toThrow("请上传营业执照");
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
      expect(mockFeatureFlag.isEnabled).not.toHaveBeenCalled();
    });
  });

  // ─── 保证金计算 ───

  describe("calculateDeposit", () => {
    it("根据类目自动计算保证金", async () => {
      const result = await svc.calculateDeposit(["c1", "c2", "c3"]);
      expect(result).toBe(2500); // 1000 base + 3 * 500
    });

    it("无类目时只收基础保证金", async () => {
      const result = await svc.calculateDeposit([]);
      expect(result).toBe(1000);
    });
  });

  // ─── 管理员操作 ───

  describe("listMerchants", () => {
    it("分页查询商家列表", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", shopName: "店铺A" }]);
      mockPrisma.merchant.count.mockResolvedValue(1);
      const result = await svc.listMerchants({ page: 1, pageSize: 20 });
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按状态筛选", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      mockPrisma.merchant.count.mockResolvedValue(0);
      const result = await svc.listMerchants({ status: "ACTIVE" });
      expect(result.total).toBe(0);
    });

    it("page='abc' 非法入参 → skip 不为 NaN（safePagination 兜底）", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      mockPrisma.merchant.count.mockResolvedValue(0);
      await svc.listMerchants({ page: "abc" as any, pageSize: "xyz" as any });
      const callArg = mockPrisma.merchant.findMany.mock.calls[0][0];
      expect(Number.isNaN(callArg.skip)).toBe(false);
      expect(callArg.skip).toBe(0); // page 回落 1 → skip = (1-1)*20 = 0
    });
  });

  describe("getMerchantById", () => {
    it("返回商家详情", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", shopName: "店铺A", user: { nickname: "张三" }, violations: [], depositRecords: [] });
      const result = await svc.getMerchantById("m1");
      expect(result.shopName).toBe("店铺A");
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getMerchantById("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("approveApplication", () => {
    it("审核通过直接进入待签约", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING_REVIEW" });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", status: "AGREEMENT_PENDING", depositAmount: 0 });
      const result = await svc.approveApplication("m1", "admin1", {});
      expect(result.status).toBe("AGREEMENT_PENDING");
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "AGREEMENT_PENDING", depositAmount: 0, depositPaid: false }),
      }));
      expect(mockNotification.send).toHaveBeenCalled();
      expect(mockSystemService.logAudit).toHaveBeenCalled();
    });

    it("当前免保证金政策拒绝审核人设置正金额", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING_REVIEW" });
      await expect(svc.approveApplication("m1", "admin1", { depositAmount: 2000 })).rejects.toThrow("不可设置保证金金额");
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
    });

    it("非待审核状态抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "ACTIVE" });
      await expect(svc.approveApplication("m1", "admin1", {})).rejects.toThrow(BusinessException);
    });
  });

  describe("rejectApplication", () => {
    it("审核驳回成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING_REVIEW" });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", status: "REVIEW_FAILED", rejectReason: "资质不全" });
      const result = await svc.rejectApplication("m1", "admin1", "资质不全");
      expect(result.status).toBe("REVIEW_FAILED");
      expect(mockNotification.send).toHaveBeenCalled();
    });
  });

  describe("updateMerchantStatus", () => {
    it("暂停商家经营", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "ACTIVE" });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", status: "SUSPENDED" });
      const result = await svc.updateMerchantStatus("m1", "admin1", { status: "SUSPENDED", reason: "违规" });
      expect(result.status).toBe("SUSPENDED");
    });
  });


  describe("handleAgreementSigned", () => {
    it("签署协议后店铺开通", async () => {
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", userId: "u1", status: "ACTIVE", agreementSigned: true });
      const result = await svc.handleAgreementSigned("m1", "127.0.0.1");
      expect(result.status).toBe("ACTIVE");
      expect(mockNotification.send).toHaveBeenCalled();
      expect(mockSystemService.logAudit).toHaveBeenCalled();
    });
  });

  describe("getDashboard", () => {
    it("返回商家仪表盘数据", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", totalSales: 10000, totalOrders: 50, rating: 4.5 });
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      mockPrisma.product.count.mockResolvedValue(10);
      mockPrisma.productReview.count.mockResolvedValue(2);
      // 累计口径改实时聚合后：rating 走 productReview 均分
      mockPrisma.productReview.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: 3 });
      const result = await svc.getDashboard("u1");
      expect(result.todayOrders).toBe(5);
      expect(result.totalProducts).toBe(10);
      expect(result.pendingReviews).toBe(2);
      // 累计=实时聚合值而非去规范化死字段(merchant.totalSales=10000/totalOrders=50/rating=4.5 均不再采用)
      expect(result.totalSales).toBe(500);
      expect(result.totalOrders).toBe(5);
      expect(result.rating).toBe(4);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getDashboard("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("操作员与本店审计", () => {
    it("成员列表标记当前操作者，供前端收敛店主专属操作", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "owner-1" });
      mockPrisma.merchantMember.findMany.mockResolvedValue([
        { userId: "operator-1", role: "OPERATOR", status: "ACTIVE", createdAt: new Date("2026-07-22T00:00:00Z") },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "owner-1", nickname: "店主", avatar: null, phone: null },
        { id: "operator-1", nickname: "操作员", avatar: null, phone: null },
      ]);

      const rows = await svc.listMembers("m1", "operator-1");

      expect(rows.find((row) => row.userId === "operator-1")?.isCurrent).toBe(true);
      expect(rows.find((row) => row.userId === "owner-1")?.isCurrent).toBe(false);
    });

    it("审计只按当前店铺前缀查询并映射为可读动作", async () => {
      const createdAt = new Date("2026-07-22T01:02:03Z");
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "owner-1" });
      mockPrisma.merchantMember.findMany.mockResolvedValue([{ userId: "operator-1" }]);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: "a1",
          userId: "operator-1",
          action: "POST",
          targetType: "PRODUCT",
          detail: "merchant:m1 | POST /api/v1/merchant-backend/products",
          createdAt,
        },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "operator-1", nickname: "小掌柜" }]);

      const result = await svc.listMemberAudit("m1", { page: 1, pageSize: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: { in: ["owner-1", "operator-1"] },
          detail: { startsWith: "merchant:m1 | " },
        },
        skip: 0,
        take: 20,
      }));
      expect(result).toEqual({
        items: [{
          id: "a1",
          memberId: "operator-1",
          operatorName: "小掌柜",
          action: "发布商品",
          target: "商品",
          createdAt,
        }],
        total: 1,
        page: 1,
        pageSize: 20,
      });
    });

    it("审计分页参数异常时安全归一化且不会混入旧的无店铺日志", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m2", userId: "owner-2" });
      mockPrisma.merchantMember.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await svc.listMemberAudit("m2", { page: "bad" as any, pageSize: 500 as any });

      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 100 });
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          userId: { in: ["owner-2"] },
          detail: { startsWith: "merchant:m2 | " },
        },
      });
    });
  });

  describe("商家订单下钻筛选", () => {
    it("支持按时间范围查看仪表盘对应订单", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await svc.listOrders("m1", {
        startDate: "2026-07-25T16:00:00.000Z",
        endDate: "2026-07-26T16:00:00.000Z",
        page: 1,
        pageSize: 20,
      });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          merchantId: "m1",
          createdAt: {
            gte: new Date("2026-07-25T16:00:00.000Z"),
            lt: new Date("2026-07-26T16:00:00.000Z"),
          },
        },
      }));
    });
  });

  describe("商家发货与售后真实状态", () => {
    it("订单详情返回真实运单信息", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", userId: "u1", targetId: "p1", status: "SHIPPED" });
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1", title: "测试商品", images: ["cover.jpg"] }]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "用户", phone: null }]);
      mockPrisma.orderLogistics.findUnique.mockResolvedValue({ orderId: "o1", company: "顺丰速运", logisticsNo: "SF123" });

      const result = await svc.getOrder("m1", "o1");

      expect(result.logistics).toEqual(expect.objectContaining({ company: "顺丰速运", logisticsNo: "SF123" }));
      expect((result as any).productTitle).toBe("测试商品");
    });


    it("退款渠道处理中时售后保持 PROCESSING", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValueOnce({ id: "a1", orderId: "o1", type: "refund", status: "PENDING", reason: "不想要了" })
        .mockResolvedValueOnce({ id: "a1", status: "PROCESSING" });
      mockPrisma.afterSale.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", status: "PAID" });
      mockShopRefund.refundOrder.mockResolvedValueOnce({ status: "PROCESSING" });

      const result = await svc.processAfterSale("m1", "a1", { action: "approve" });

      expect(result?.status).toBe("PROCESSING");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledTimes(1);
    });

    it("退款成功后售后由 PROCESSING 收敛为 COMPLETED", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValueOnce({ id: "a1", orderId: "o1", type: "refund", status: "PENDING", reason: "不想要了" })
        .mockResolvedValueOnce({ id: "a1", status: "COMPLETED" });
      mockPrisma.afterSale.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", status: "PAID" });

      const result = await svc.processAfterSale("m1", "a1", { action: "approve" });

      expect(result?.status).toBe("COMPLETED");
      expect(mockShopRefund.refundOrder).toHaveBeenCalledWith("o1", "不想要了");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: { id: "a1", status: "PROCESSING" },
        data: { status: "COMPLETED" },
      }));
    });

    it("退款失败时售后回退 PENDING 允许安全重试", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "a1", orderId: "o1", type: "refund", status: "PENDING", reason: "不想要了" });
      mockPrisma.afterSale.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findFirst.mockResolvedValueOnce({ id: "o1", merchantId: "m1", status: "PAID" }).mockResolvedValueOnce({ status: "PAID" });
      mockShopRefund.refundOrder.mockRejectedValueOnce(new Error("渠道故障"));

      await expect(svc.processAfterSale("m1", "a1", { action: "approve" })).rejects.toThrow("渠道故障");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenLastCalledWith({
        where: { id: "a1", status: "PROCESSING" },
        data: { status: "PENDING" },
      });
    });

    it("旧咨询兼容端点返回诚实空集，不再伪装售后", async () => {
      const result = await svc.listInquiries("m1", { page: 1, pageSize: 20 });
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
      expect(mockPrisma.afterSale.findMany).not.toHaveBeenCalled();
    });
  });
});
