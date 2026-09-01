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
  $queryRawUnsafe: jest.fn(),
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
  merchantQualificationReview: { create: jest.fn(), findMany: jest.fn() },
  merchantViolation: { count: jest.fn() },
  order: {
    aggregate: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  orderLogistics: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  afterSale: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    count: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
  },
  product: {
    count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(),
    findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
  },
  productSku: {
    updateMany: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
  },
  configSystem: { findUnique: jest.fn() },
  article: { count: jest.fn(), aggregate: jest.fn() },
  user: { findMany: jest.fn(), findFirst: jest.fn() },
  merchantMember: { findMany: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
  auditLog: { findMany: jest.fn(), count: jest.fn() },
  productReview: { count: jest.fn(), aggregate: jest.fn() },
};

const completeQualification = {
  contactName: "张三",
  contactPhone: "13800138000",
  idCardNumber: "encrypted-id-card",
  idCardFront: "https://cdn.example.com/id-front.jpg",
  idCardBack: "https://cdn.example.com/id-back.jpg",
  businessLicense: "https://cdn.example.com/license.jpg",
  unifiedSocialCreditCode: "91110108MA01234567",
  registeredAddress: "北京市海淀区示例路 1 号",
  legalRepresentative: "张三",
  licenseLongTerm: false,
  licenseValidUntil: new Date("2099-12-31"),
  categoryIds: ["c1"],
  privacyConsentAt: new Date(),
  complianceDeclarationAt: new Date(),
  qualificationFiles: [],
  riskFlags: [],
  riskLevel: "MEDIUM",
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
    mockPrisma.orderLogistics.findMany.mockResolvedValue([]);
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

  describe("商品编辑审核与规格事务", () => {
    const baseProduct = {
      id: "p1",
      userId: "u1",
      title: "原商品",
      intro: "原简介",
      detail: "<p>原详情</p>",
      images: ["cover.jpg"],
      price: 99,
      originalPrice: 129,
      stock: 10,
      categoryId: "c1",
      tags: ["国学"],
      status: "ON_SALE",
      skus: [],
    };

    beforeEach(() => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1" });
      mockPrisma.product.findFirst.mockResolvedValue(baseProduct);
      mockPrisma.product.update.mockImplementation(({ data }: any) => Promise.resolve({ ...baseProduct, ...data }));
      mockPrisma.productSku.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.productSku.findMany.mockResolvedValue([]);
    });

    it("普通商家修改在售商品核心信息后必须重新审核", async () => {
      const result = await svc.updateProduct("u1", "p1", { title: "新商品名" });

      expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ title: "新商品名", status: "PENDING" }),
      }));
      expect((result as any).reviewRequired).toBe(true);
    });

    it("仅调整商品库存不触发重新审核", async () => {
      const result = await svc.updateProduct("u1", "p1", { stock: 20 });

      expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { stock: 20 },
      }));
      expect((result as any).reviewRequired).toBe(false);
    });

    it("规格在商品事务中原位更新并保留已有 SKU ID", async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...baseProduct,
        skus: [{ id: "sku1", specs: { 颜色: "红" }, price: 99, stock: 3 }],
      });
      mockPrisma.productSku.update.mockResolvedValue({ id: "sku1" });
      mockPrisma.productSku.findMany.mockResolvedValue([
        { id: "sku1", specs: { 颜色: "红" }, price: 99, stock: 8 },
      ]);

      await svc.updateProduct("u1", "p1", {
        skus: [{ id: "sku1", specs: { 颜色: "红" }, price: 99, stock: 8 }],
      });

      expect(mockPrisma.productSku.update).toHaveBeenCalledWith({
        where: { id: "sku1" },
        data: { specs: { 颜色: "红" }, price: 99, stock: 8, isActive: true },
      });
      expect(mockPrisma.productSku.create).not.toHaveBeenCalled();
      expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
    });

    it("移除规格时只停用 SKU，保留历史订单规格记录", async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...baseProduct,
        status: "PENDING",
        skus: [{ id: "sku-old", specs: { 颜色: "旧款" }, price: 99, stock: 0, isActive: true }],
      });

      await svc.updateProduct("u1", "p1", { skus: [] });

      expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
        where: { productId: "p1", isActive: true },
        data: { isActive: false },
      });
      expect(mockPrisma.productSku.deleteMany).toBeUndefined();
    });
  });

  describe("updateApplication", () => {
    it("修改草稿申请", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING_REVIEW" });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", shopName: "新名称" });
      const result = await svc.updateApplication("u1", { shopName: "新名称" });
      expect(result.shopName).toBe("新名称");
    });

    it("已开店商户可更新资质并进入重新审核草稿", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "ACTIVE" });
      mockPrisma.merchant.update.mockResolvedValue({
        id: "m1", userId: "u1", status: "ACTIVE", qualificationStatus: "DRAFT",
      });
      const result = await svc.updateApplication("u1", { shopName: "新名称" });
      expect(result.qualificationStatus).toBe("DRAFT");
    });
  });

  describe("submitForReview", () => {
    it("提交审核成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", ...completeQualification,
      });
      mockPrisma.merchant.update.mockResolvedValue({
        id: "m1", status: "PENDING_REVIEW", qualificationStatus: "PENDING",
      });
      const result = await svc.submitForReview("u1");
      expect(result.status).toBe("PENDING_REVIEW");
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING_REVIEW", qualificationStatus: "PENDING" }),
      }));
      expect(mockPrisma.merchantQualificationReview.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ merchantId: "m1", status: "PENDING" }),
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

      await expect(svc.submitForReview("u1")).rejects.toThrow("营业执照");
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
      expect(mockPrisma.merchantQualificationReview.create).not.toHaveBeenCalled();
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
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", qualificationStatus: "PENDING",
        ...completeQualification,
      });
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
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", status: "PENDING_REVIEW", qualificationStatus: "PENDING",
        ...completeQualification,
      });
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

  describe("内容资产统计", () => {
    it("按商家绑定用户聚合真实商品与审核通过文章数据", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", userId: "u1" });
      mockPrisma.product.count
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(5);
      mockPrisma.article.count.mockResolvedValue(3);
      mockPrisma.article.aggregate.mockResolvedValue({
        _sum: { viewCount: 1260, likeCount: 84 },
      });

      const result = await svc.getContentStats("m1");

      expect(mockPrisma.article.count).toHaveBeenCalledWith({
        where: { userId: "u1", auditStatus: "APPROVED", deletedAt: null },
      });
      expect(mockPrisma.article.aggregate).toHaveBeenCalledWith({
        where: { userId: "u1", auditStatus: "APPROVED", deletedAt: null },
        _sum: { viewCount: true, likeCount: true },
      });
      expect(result).toEqual({
        totalProducts: 8,
        publishedProducts: 5,
        draftProducts: 3,
        publishedArticles: 3,
        totalViews: 1260,
        totalLikes: 84,
      });
    });
  });

  describe("客户交易档案", () => {
    it("按有效交易统计并返回脱敏手机号与最近订单", async () => {
      const firstOrderAt = new Date("2026-06-01T08:00:00.000Z");
      const lastOrderAt = new Date("2026-07-20T09:30:00.000Z");
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "u-customer",
        nickname: "林女士",
        avatar: null,
        phone: "13800138000",
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
      });
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { amount: 360 },
        _count: { _all: 2 },
        _min: { createdAt: firstOrderAt },
        _max: { createdAt: lastOrderAt },
      });
      mockPrisma.order.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: "o1",
          userId: "u-customer",
          targetId: "p1",
          amount: 200,
          status: "COMPLETED",
          createdAt: lastOrderAt,
        },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1", title: "文房套装", images: ["cover.jpg"] }]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u-customer", nickname: "林女士", phone: "13800138000" }]);

      const result = await svc.getCustomerDetail("m1", "u-customer");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "u-customer", orders: { some: { merchantId: "m1" } } },
      }));
      expect(mockPrisma.order.aggregate).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          merchantId: "m1",
          userId: "u-customer",
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        },
      }));
      expect(result).toMatchObject({
        id: "u-customer",
        phone: "138****8000",
        orderCount: 2,
        totalSpent: 360,
        averageOrderValue: 180,
        refundedOrderCount: 1,
      });
      expect(result.recentOrders[0]).toMatchObject({
        id: "o1",
        productTitle: "文房套装",
        buyerPhone: "138****8000",
      });
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

    it("客户档案下钻订单时只返回当前商家的指定客户订单", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await svc.listOrders("m1", {
        customerId: "customer-1",
        page: 1,
        pageSize: 20,
      });

      const expectedWhere = {
        merchantId: "m1",
        userId: "customer-1",
      };
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expectedWhere,
      }));
      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });
  });

  describe("商家发货与售后真实状态", () => {
    it("订单列表批量补齐真实运单，发货页无需逐行查询", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o1", merchantId: "m1", userId: "u1", targetId: "p1", status: "SHIPPED" },
        { id: "o2", merchantId: "m1", userId: "u2", targetId: "p2", status: "PAID" },
      ]);
      mockPrisma.order.count.mockResolvedValue(2);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "p1", title: "文房套装", images: ["p1.jpg"] },
        { id: "p2", title: "宣纸", images: ["p2.jpg"] },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "甲", phone: null },
        { id: "u2", nickname: "乙", phone: null },
      ]);
      mockPrisma.orderLogistics.findMany.mockResolvedValue([
        {
          orderId: "o1",
          company: "顺丰速运",
          logisticsNo: "SF123",
          status: "SHIPPED",
          updatedAt: new Date("2026-07-29T08:00:00.000Z"),
        },
      ]);

      const result = await svc.listOrders("m1", { status: "SHIPPED", page: 1, pageSize: 20 });

      expect(mockPrisma.orderLogistics.findMany).toHaveBeenCalledWith({
        where: { orderId: { in: ["o1", "o2"] } },
        select: { orderId: true, company: true, logisticsNo: true, status: true, updatedAt: true },
      });
      expect(result.list[0]).toEqual(expect.objectContaining({
        shipCompany: "顺丰速运",
        trackingNo: "SF123",
        logisticsStatus: "SHIPPED",
      }));
      expect(result.list[1]).toEqual(expect.objectContaining({
        shipCompany: null,
        trackingNo: null,
      }));
    });

    it("订单详情返回真实运单信息", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", userId: "u1", targetId: "p1", status: "SHIPPED" });
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1", title: "测试商品", images: ["cover.jpg"] }]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "用户", phone: null }]);
      mockPrisma.orderLogistics.findUnique.mockResolvedValue({ orderId: "o1", company: "顺丰速运", logisticsNo: "SF123" });

      const result = await svc.getOrder("m1", "o1");

      expect(result.logistics).toEqual(expect.objectContaining({ company: "顺丰速运", logisticsNo: "SF123" }));
      expect((result as any).productTitle).toBe("测试商品");
    });

    it("旧订单退款端点必须先命中真实的仅退款售后单", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", status: "PAID" });
      mockPrisma.afterSale.findFirst.mockResolvedValue({
        id: "a1", orderId: "o1", type: "refund_only", status: "PENDING",
      });
      const processSpy = jest.spyOn(svc, "processAfterSale")
        .mockResolvedValueOnce({ id: "a1", status: "COMPLETED" } as any);

      const result = await svc.approveRefund("m1", "o1");

      expect(mockPrisma.afterSale.findFirst).toHaveBeenCalledWith({
        where: { orderId: "o1", status: "PENDING", type: { contains: "refund", mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
      expect(processSpy).toHaveBeenCalledWith("m1", "a1", { action: "approve" });
      expect(result).toEqual({ success: true, afterSaleId: "a1", refundStatus: "COMPLETED" });
      processSpy.mockRestore();
    });

    it("旧订单退款端点禁止绕过退货验收入库", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", status: "SHIPPED" });
      mockPrisma.afterSale.findFirst.mockResolvedValue({
        id: "a1", orderId: "o1", type: "refund_with_return", status: "PENDING",
      });

      await expect(svc.approveRefund("m1", "o1")).rejects.toThrow("退货退款请到售后管理");
      expect(mockShopRefund.refundOrder).not.toHaveBeenCalled();
    });

    it("旧订单退款端点禁止无售后申请直接退款", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", merchantId: "m1", status: "PAID" });
      mockPrisma.afterSale.findFirst.mockResolvedValue(null);

      await expect(svc.approveRefund("m1", "o1")).rejects.toThrow("没有待处理的退款申请");
      expect(mockShopRefund.refundOrder).not.toHaveBeenCalled();
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
