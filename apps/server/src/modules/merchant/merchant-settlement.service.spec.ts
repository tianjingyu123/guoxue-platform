import { Test } from "@nestjs/testing";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SystemService } from "../system/system.service";
import { NotFoundException } from "@nestjs/common";

const mockSystemService = {
  getConfig: jest.fn().mockResolvedValue({ configKey: "merchant_commission_rate", configValue: "0.85" }),
};

const mockPrisma: any = {
  merchant: { findUnique: jest.fn(), update: jest.fn() },
  order: { aggregate: jest.fn() },
};

describe("MerchantSettlementService", () => {
  let svc: MerchantSettlementService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantSettlementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SystemService, useValue: mockSystemService },
      ],
    }).compile();
    svc = mod.get(MerchantSettlementService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getRevenueOverview", () => {
    it("返回收入概览", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.8, totalSales: 10000 });
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 25 });
      const result = await svc.getRevenueOverview("m1");
      expect(result.totalSales).toBe(5000);
      expect(result.totalOrders).toBe(25);
      expect(result.merchantShare).toBe(4000); // 5000 * 0.8
      expect(result.platformShare).toBe(1000);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getRevenueOverview("m1")).rejects.toThrow(NotFoundException);
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

  describe("setCommissionRate", () => {
    it("设置分佣比例成功", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", commissionRate: 0.85 });
      mockPrisma.merchant.update.mockResolvedValue({ id: "m1", commissionRate: 0.9 });
      const result = await svc.setCommissionRate("m1", { rate: 0.9 });
      expect(result.commissionRate).toBe(0.9);
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.setCommissionRate("invalid", { rate: 0.9 })).rejects.toThrow(NotFoundException);
    });
  });
});
