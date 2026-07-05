import { Test } from "@nestjs/testing";
import { TenantService } from "./tenant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

describe("TenantService", () => {
  let svc: TenantService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tenant: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      tenantUsageRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      tenantApiCall: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const mod = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(TenantService);
  });

  describe("create", () => {
    it("创建租户并记录初始配额", async () => {
      prisma.tenant.create.mockResolvedValue({ id: "t1", name: "测试租户", apiKey: "GX_xxx", quotaTotal: 10000 });
      prisma.tenantUsageRecord.create.mockResolvedValue({ id: "r1" });

      const dto = { name: "测试租户", contactName: "张三", contactPhone: "13800138000", contactEmail: "test@test.com" };
      const result = await svc.create(dto, "admin");

      expect(result.id).toBe("t1");
      expect(result.apiKey).toMatch(/^GX_/);
      expect(prisma.tenantUsageRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ changeType: "RECHARGE" }) }),
      );
    });

    it("创建租户使用自定义配额和套餐", async () => {
      prisma.tenant.create.mockResolvedValue({ id: "t2", name: "高级租户", apiKey: "GX_yyy", quotaTotal: 50000, plan: "PRO" });
      prisma.tenantUsageRecord.create.mockResolvedValue({ id: "r2" });

      const dto = { name: "高级租户", contactName: "李四", contactPhone: "13900139000", plan: "PRO", quotaTotal: 50000 };
      const result = await svc.create(dto, "admin");

      expect(result.quotaTotal).toBe(50000);
      expect(result.plan).toBe("PRO");
    });
  });

  describe("list", () => {
    it("分页返回租户列表", async () => {
      prisma.tenant.findMany.mockResolvedValue([{ id: "t1", name: "租户A" }]);
      prisma.tenant.count.mockResolvedValue(1);

      const result = await svc.list({ page: 1, pageSize: 20 });
      expect(result.tenants).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("按关键词过滤", async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await svc.list({ page: 1, pageSize: 20, keyword: "测试" });
      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: { contains: "测试" } } }),
      );
    });

    it("按状态过滤", async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await svc.list({ page: 1, pageSize: 20, status: "ACTIVE" });
      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "ACTIVE" } }),
      );
    });

    it("page=abc 时 skip 不为 NaN（防 Prisma 500）", async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await svc.list({ page: "abc" as any, pageSize: 20 });
      const arg = prisma.tenant.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  describe("getById", () => {
    it("返回租户详情含使用记录和API调用", async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: "t1", name: "租户A", usageRecords: [], apiCalls: [],
      });
      const result = await svc.getById("t1");
      expect(result.id).toBe("t1");
    });

    it("租户不存在抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(svc.getById("t99")).rejects.toThrow(BusinessException);
    });
  });

  describe("update", () => {
    it("更新租户信息", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "t1", name: "旧名称" });
      prisma.tenant.update.mockResolvedValue({ id: "t1", name: "新名称" });
      const result = await svc.update("t1", { name: "新名称" });
      expect(result.name).toBe("新名称");
    });

    it("更新过期时间", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "t1", name: "租户A" });
      prisma.tenant.update.mockResolvedValue({ id: "t1", expireAt: new Date("2027-01-01") });
      const result = await svc.update("t1", { expireAt: "2027-01-01" });
      expect(result.expireAt).toBeDefined();
    });
  });

  describe("recharge", () => {
    it("充值配额成功", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "t1", name: "租户A", quotaTotal: 10000 });
      prisma.tenant.update.mockResolvedValue({ id: "t1", quotaTotal: 15000 });
      prisma.tenantUsageRecord.create.mockResolvedValue({ id: "r1" });

      const result = await svc.recharge("t1", { quotaAmount: 5000, amountRmb: 500 }, "admin");
      expect(result.quotaTotal).toBe(15000);
    });

    it("租户不存在抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(svc.recharge("t99", { quotaAmount: 1000 }, "admin")).rejects.toThrow(BusinessException);
    });
  });

  describe("regenerateApiKey", () => {
    it("重新生成API Key", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "t1", name: "租户A" });
      prisma.tenant.update.mockResolvedValue({ id: "t1" });
      const result = await svc.regenerateApiKey("t1");
      expect(result.apiKey).toMatch(/^GX_/);
    });
  });

  describe("deleteTenant", () => {
    it("删除租户及其关联数据", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "t1", name: "租户A" });
      prisma.tenantApiCall.deleteMany.mockResolvedValue({ count: 10 });
      prisma.tenantUsageRecord.deleteMany.mockResolvedValue({ count: 5 });
      prisma.tenant.delete.mockResolvedValue({ id: "t1" });

      const result = await svc.deleteTenant("t1");
      expect(result.success).toBe(true);
      expect(prisma.tenantApiCall.deleteMany).toHaveBeenCalledWith({ where: { tenantId: "t1" } });
      expect(prisma.tenantUsageRecord.deleteMany).toHaveBeenCalledWith({ where: { tenantId: "t1" } });
    });
  });

  describe("verify", () => {
    it("有效API Key返回租户信息", async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: "t1", name: "租户A", plan: "BASIC", status: "ACTIVE", quotaTotal: 10000, quotaUsed: 500, expireAt: null,
      });
      const result = await svc.verify("GX_valid_key");
      expect(result.id).toBe("t1");
    });

    it("无效API Key抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(svc.verify("GX_invalid")).rejects.toThrow(BusinessException);
    });

    it("非活跃状态抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: "t1", name: "租户A", plan: "BASIC", status: "SUSPENDED", quotaTotal: 10000, quotaUsed: 500, expireAt: null,
      });
      await expect(svc.verify("GX_key")).rejects.toThrow(BusinessException);
    });

    it("已过期租户抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: "t1", name: "租户A", plan: "BASIC", status: "ACTIVE", quotaTotal: 10000, quotaUsed: 500,
        expireAt: new Date("2020-01-01"),
      });
      await expect(svc.verify("GX_key")).rejects.toThrow(BusinessException);
    });
  });

  describe("consume", () => {
    it("消耗配额成功", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ quotaTotal: 10000, quotaUsed: 100 });
      prisma.tenant.update.mockResolvedValue({});
      prisma.tenantApiCall.create.mockResolvedValue({});

      const result = await svc.consume("t1", { apiType: "AI", endpoint: "/ai/chat", tokensUsed: 500, cost: 2 });
      expect(result.consumed).toBe(2);
      expect(result.remainingQuota).toBe(9898);
    });

    it("配额不足时记录调用并抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ quotaTotal: 100, quotaUsed: 99 });
      prisma.tenantApiCall.create.mockResolvedValue({});

      await expect(
        svc.consume("t1", { apiType: "AI", endpoint: "/ai/chat", tokensUsed: 5000, cost: 10 }),
      ).rejects.toThrow(BusinessException);

      expect(prisma.tenantApiCall.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "QUOTA_EXCEEDED" }) }),
      );
    });

    it("使用默认cost=1", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ quotaTotal: 1000, quotaUsed: 0 });
      prisma.tenant.update.mockResolvedValue({});
      prisma.tenantApiCall.create.mockResolvedValue({});

      const result = await svc.consume("t1", { apiType: "SEARCH", endpoint: "/search" });
      expect(result.consumed).toBe(1);
    });
  });

  describe("getQuota", () => {
    it("返回剩余配额", async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: "t1", name: "租户A", quotaTotal: 10000, quotaUsed: 3000, plan: "BASIC", expireAt: null,
      });
      const result = await svc.getQuota("t1");
      expect(result.remaining).toBe(7000);
    });

    it("租户不存在抛出异常", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(svc.getQuota("t99")).rejects.toThrow(BusinessException);
    });
  });

  describe("getUsageStats", () => {
    it("返回近N天用量统计", async () => {
      prisma.tenantApiCall.count.mockResolvedValue(150);
      prisma.tenantApiCall.groupBy.mockResolvedValue([
        { apiType: "AI", _count: 100, _sum: { cost: 200, tokensUsed: 50000 } },
        { apiType: "SEARCH", _count: 50, _sum: { cost: 50, tokensUsed: 0 } },
      ]);

      const result = await svc.getUsageStats("t1", 7);
      expect(result.calls).toBe(150);
      expect(result.byType).toHaveLength(2);
      expect(result.days).toBe(7);
    });
  });

  describe("resetMonthlyQuotas", () => {
    it("重置月度配额", async () => {
      prisma.tenant.findMany.mockResolvedValue([
        { id: "t1", name: "租户A", quotaUsed: 2000 },
        { id: "t2", name: "租户B", quotaUsed: 0 },
      ]);
      prisma.tenantUsageRecord.create.mockResolvedValue({});
      prisma.tenant.update.mockResolvedValue({});

      const result = await svc.resetMonthlyQuotas();
      expect(result.resetCount).toBe(1);
    });

    it("无需要重置的租户", async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      const result = await svc.resetMonthlyQuotas();
      expect(result.resetCount).toBe(0);
    });
  });
});
