import { Test } from "@nestjs/testing";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";
import { BusinessException } from "../../common/business.exception";

const mockRedis = {
  setNX: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockSystemService = {
  getConfig: jest.fn().mockResolvedValue({ configKey: "merchant_commission_rate", configValue: "0.85" }),
};

const mockPrisma: any = {
  merchant: { findUnique: jest.fn(), update: jest.fn() },
  order: { aggregate: jest.fn() },
  merchantSettlement: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), aggregate: jest.fn() },
};

describe("MerchantSettlementService", () => {
  let svc: MerchantSettlementService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantSettlementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SystemService, useValue: mockSystemService },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(MerchantSettlementService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.setNX.mockResolvedValue(true);
    mockRedis.del.mockResolvedValue(undefined);
  });

  describe("getRevenueOverview", () => {
    it("返回收入概览", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.8, totalSales: 10000 });
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 25 });
      // 结算单聚合三连：PAID(已结算) / PENDING(待结算) / 非CANCELLED(累计流水)
      mockPrisma.merchantSettlement.aggregate
        .mockResolvedValueOnce({ _sum: { paidAmount: 800, settlementAmount: 800 } })
        .mockResolvedValueOnce({ _sum: { settlementAmount: 1200 } })
        .mockResolvedValueOnce({ _sum: { totalRevenue: 2500 } });
      const result = await svc.getRevenueOverview("m1");
      expect(result.totalSales).toBe(5000);
      expect(result.totalOrders).toBe(25);
      expect(result.merchantShare).toBe(4000); // 5000 * 0.8
      expect(result.platformShare).toBe(1000);
      expect(result.merchantShareRate).toBe(0.8); // 商家留成比例·命名清晰字段
      expect(result.settledAmount).toBe(800);
      expect(result.pendingSettlement).toBe(1200);
      expect(result.totalRevenue).toBe(2500);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getRevenueOverview("m1")).rejects.toThrow(BusinessException);
    });
  });

  describe("calculateCommission", () => {
    it("计算商家和平台分佣", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.9 });
      const result = await svc.calculateCommission(1000, "m1");
      expect(result.merchantShare).toBe(900);
      expect(result.platformShare).toBe(100);
      expect(result.merchantRate).toBe(0.9);
    });

    it("使用默认分佣比例", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: null });
      const result = await svc.calculateCommission(1000, "m1");
      expect(result.merchantShare).toBe(850); // 1000 * 0.85 default
    });
  });

  describe("generateSettlement", () => {
    const DAY_MS = 86_400_000;
    // 相对日期：周期结束于 30 天前，任何等级的 T+N 结算周期校验都能通过（避免固定日期随时间流逝翻绿翻红）
    const dto = {
      periodStart: new Date(Date.now() - 60 * DAY_MS).toISOString(),
      periodEnd: new Date(Date.now() - 30 * DAY_MS).toISOString(),
    };

    it("含分金额不丢分：分账两者之和严格等于总额", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85, creditGrade: "B" });
      mockPrisma.merchantSettlement.findFirst.mockResolvedValue(null); // 无重叠
      // 订单总额 ¥1234.56（含分），旧逻辑会截整到 1235 元丢分
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 1234.56 }, _count: 10 });
      mockPrisma.merchantSettlement.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const result: any = await svc.generateSettlement("m1", dto as any);

      // 总额保留分，不再截整到元
      expect(result.totalRevenue).toBe(1234.56);
      // 商家分成 0.85：Math.round(123456 * 0.85)=104938 分 → 1049.38
      expect(result.settlementAmount).toBe(1049.38);
      // 平台抽成 = 总额 - 商家 = 18518 分 → 185.18
      expect(result.commission).toBe(185.18);
      // 不丢分铁律：分账在「分」层面严格守恒（避免 JS number 相加的浮点尾数）
      expect(
        Math.round(result.settlementAmount * 100) + Math.round(result.commission * 100),
      ).toBe(Math.round(result.totalRevenue * 100));
    });

    it("周期内无可结算订单抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85, creditGrade: "B" });
      mockPrisma.merchantSettlement.findFirst.mockResolvedValue(null);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: 0 });
      await expect(svc.generateSettlement("m1", dto as any)).rejects.toThrow(BusinessException);
    });

    it("周期重叠已有结算单则拒绝重复生成", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85, creditGrade: "B" });
      mockPrisma.merchantSettlement.findFirst.mockResolvedValue({ id: "s-exist" });
      await expect(svc.generateSettlement("m1", dto as any)).rejects.toThrow(BusinessException);
    });

    // ── 履-P2 信用等级结算周期（T+N）挂钩 ──

    it("B 级 T+7：周期结束日在 5 天前 → 未过沉淀期被拒", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85, creditGrade: "B" });
      const recent = {
        periodStart: new Date(Date.now() - 15 * DAY_MS).toISOString(),
        periodEnd: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      };
      await expect(svc.generateSettlement("m1", recent as any)).rejects.toThrow("T+7");
      // 校验发生在查重/聚合之前
      expect(mockPrisma.merchantSettlement.findFirst).not.toHaveBeenCalled();
    });

    it("A 级 T+3：同样结束于 5 天前的周期 → 允许生成（回款提速权益）", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85, creditGrade: "A" });
      mockPrisma.merchantSettlement.findFirst.mockResolvedValue(null);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 100 }, _count: 1 });
      mockPrisma.merchantSettlement.create.mockImplementation((args: any) => Promise.resolve(args.data));
      const recent = {
        periodStart: new Date(Date.now() - 15 * DAY_MS).toISOString(),
        periodEnd: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      };
      const result: any = await svc.generateSettlement("m1", recent as any);
      expect(result.totalRevenue).toBe(100);
    });

    it("D 级 T+14：周期结束日在 10 天前 → 结算延长被拒；缺 creditGrade 回落 B 档", async () => {
      const recent = {
        periodStart: new Date(Date.now() - 20 * DAY_MS).toISOString(),
        periodEnd: new Date(Date.now() - 10 * DAY_MS).toISOString(),
      };
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85, creditGrade: "D" });
      await expect(svc.generateSettlement("m1", recent as any)).rejects.toThrow("T+14");

      // 历史行未回填 creditGrade（undefined）→ 回落默认 B 档 T+7，10 天前的结束日可过校验
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85 });
      mockPrisma.merchantSettlement.findFirst.mockResolvedValue(null);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 100 }, _count: 1 });
      mockPrisma.merchantSettlement.create.mockImplementation((args: any) => Promise.resolve(args.data));
      const result: any = await svc.generateSettlement("m1", recent as any);
      expect(result.totalRevenue).toBe(100);
    });
  });

  describe("paySettlement", () => {
    it("paidAmount 规整到分写入（CAS 原子翻转）", async () => {
      mockPrisma.merchantSettlement.findUnique
        .mockResolvedValueOnce({ id: "s1", status: "PENDING", merchant: { userId: "u1" } }) // 预检
        .mockResolvedValueOnce({ id: "s1", status: "PAID", paidAmount: 1049.39 }); // CAS 后返回
      mockPrisma.merchantSettlement.updateMany.mockResolvedValue({ count: 1 });
      const result: any = await svc.paySettlement("s1", { amount: 1049.385, remark: "结清" } as any, "admin1");
      expect(result.paidAmount).toBe(1049.39); // 1049.385 → 规整到分
      expect(result.status).toBe("PAID");
      expect(mockPrisma.merchantSettlement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "s1", status: "PENDING" } }),
      );
    });

    it("并发下状态已被翻转时拒绝（CAS count=0）", async () => {
      mockPrisma.merchantSettlement.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", merchant: { userId: "u1" } });
      mockPrisma.merchantSettlement.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.paySettlement("s1", { amount: 100 } as any, "admin1")).rejects.toThrow("结算单状态已变更");
    });

    it("不能给自己名下的商家结算单打款（防自审自批）", async () => {
      mockPrisma.merchantSettlement.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", merchant: { userId: "u1" } });
      await expect(svc.paySettlement("s1", { amount: 100 } as any, "u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("listSettlements", () => {
    it("page='abc' 非法入参 → skip 不为 NaN（safePagination 兜底）", async () => {
      mockPrisma.merchantSettlement.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.merchantSettlement.count = jest.fn().mockResolvedValue(0);
      await svc.listSettlements("m1", { page: "abc" as any, pageSize: "xyz" as any });
      const callArg = (mockPrisma.merchantSettlement.findMany as jest.Mock).mock.calls[0][0];
      expect(Number.isNaN(callArg.skip)).toBe(false);
      expect(callArg.skip).toBe(0);
    });
  });

  describe("setCommissionRate", () => {
    it("设置分佣比例成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85 });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", commissionRate: 0.9 });
      const result = await svc.setCommissionRate("m1", { rate: 0.9 });
      expect(result.commissionRate).toBe(0.9);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.setCommissionRate("invalid", { rate: 0.9 })).rejects.toThrow(BusinessException);
    });
  });
});
