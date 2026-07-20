import { Test } from "@nestjs/testing";
import { MerchantService } from "./merchant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { NotificationService } from "../notification/notification.service";
import { SystemService } from "../system/system.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";

const mockFeatureFlag = { isEnabled: jest.fn().mockResolvedValue(true) };
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
  order: { aggregate: jest.fn(), count: jest.fn() },
  product: { count: jest.fn() },
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
      ],
    }).compile();
    svc = mod.get(MerchantService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ─── 入驻申请 ───

  describe("createApplication", () => {
    it("创建入驻申请成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      mockPrisma.merchant.create.mockResolvedValue({ id: "m1", userId: "u1", shopName: "测试店铺", status: "PENDING_REVIEW" });

      const result = await svc.createApplication("u1", {
        shopName: "测试店铺", contactName: "张三", contactPhone: "13800138000", idCardNumber: "110101199001011234",
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
});
