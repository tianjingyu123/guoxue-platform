import { Test } from "@nestjs/testing";
import { CommissionService } from "./commission.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

const mockPrisma = {
  commissionConfig: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  stationEarning: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  station: { findUnique: jest.fn(), update: jest.fn() },
  notification: { create: jest.fn() },
  withdrawal: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
  referralLink: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };

describe("CommissionService", () => {
  let svc: CommissionService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhook },
      ],
    }).compile();
    svc = mod.get(CommissionService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getAllConfigs", () => {
    it("返回所有配置", async () => {
      const data = [{ configKey: "course_basic", rateA: 0.1 }];
      mockPrisma.commissionConfig.findMany.mockResolvedValue(data);
      const result = await svc.getAllConfigs();
      expect(result).toEqual(data);
    });
  });

  describe("updateConfig", () => {
    it("配置存在时更新成功", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic" });
      mockPrisma.commissionConfig.update.mockResolvedValue({ configKey: "course_basic", rateA: 0.15 });
      const result = await svc.updateConfig("course_basic", { rateA: 0.15 });
      expect(result.rateA).toBe(0.15);
    });
    it("配置不存在抛出 NotFoundException", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null);
      await expect(svc.updateConfig("invalid", {})).rejects.toThrow(NotFoundException);
    });
  });

  describe("calculateAndRecord", () => {
    it("有效推荐计算佣金并创建记录", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "user-1", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1", stationId: "station-1", amount: 100, earned: 10 });
      mockPrisma.notification.create.mockResolvedValue({});
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(result).toBeTruthy();
      expect(mockPrisma.stationEarning.create).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.station.update).toHaveBeenCalled();
    });
    it("无配置时返回 null", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null);
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(result).toBeNull();
    });
    it("无推荐人时返回 null", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100);
      expect(result).toBeNull();
    });
  });

  describe("getStationEarnings", () => {
    it("返回分页收益列表", async () => {
      mockPrisma.stationEarning.findMany.mockResolvedValue([{ id: "e1", earned: 10 }]);
      mockPrisma.stationEarning.count.mockResolvedValue(1);
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 10 } });
      const result = await svc.getStationEarnings("station-1");
      expect(result.earnings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalEarned).toBe(10);
    });
  });

  describe("getStationBalance", () => {
    it("计算余额正确", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", totalEarning: 500 });
      mockPrisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 200 } });
      const result = await svc.getStationBalance("station-1");
      expect(result.totalEarned).toBe(500);
      expect(result.totalWithdrawn).toBe(200);
      expect(result.balance).toBe(300);
    });
    it("分站不存在抛出 NotFoundException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getStationBalance("invalid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("applyWithdrawal", () => {
    it("余额充足时创建提现申请", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "user-1" });
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 500 } });
      mockPrisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null);
      mockPrisma.withdrawal.create.mockResolvedValue({ id: "w-1", amount: 200, status: "PENDING" });
      const result = await svc.applyWithdrawal("user-1", { amount: 200, alipayAccount: "test@alipay.com" });
      expect(result.status).toBe("PENDING");
      expect(result.amount).toBe(200);
    });
    it("余额不足抛出 BadRequestException", async () => {
      // applyWithdrawal 先查 userId -> 分站
      mockPrisma.station.findUnique.mockResolvedValueOnce({ id: "station-1", userId: "user-1" });
      // getStationBalance 再查 id -> 收益
      mockPrisma.station.findUnique.mockResolvedValueOnce({ id: "station-1", totalEarning: 50 });
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 50 } });
      mockPrisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      await expect(svc.applyWithdrawal("user-1", { amount: 200 })).rejects.toThrow(BadRequestException);
    });
    it("无分站抛出 BadRequestException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.applyWithdrawal("user-1", { amount: 200 })).rejects.toThrow(BadRequestException);
    });
  });

  describe("auditWithdrawal", () => {
    it("审核通过", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue({ id: "w-1", status: "PENDING" });
      mockPrisma.withdrawal.update.mockResolvedValue({ id: "w-1", status: "APPROVED" });
      const result = await svc.auditWithdrawal("w-1", { status: "APPROVED" });
      expect(result.status).toBe("APPROVED");
    });
    it("不存在抛出 NotFoundException", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue(null);
      await expect(svc.auditWithdrawal("w-1", { status: "APPROVED" })).rejects.toThrow(NotFoundException);
    });
    it("已处理记录不可重复审核", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue({ id: "w-1", status: "APPROVED" });
      await expect(svc.auditWithdrawal("w-1", { status: "PAID" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("trackClick", () => {
    it("有效链接增加点击计数", async () => {
      mockPrisma.referralLink.findUnique.mockResolvedValue({ code: "abc123", userId: "user-1", targetType: "COURSE", targetId: "course-1", clickCount: 0 });
      const result = await svc.trackClick("abc123");
      expect(result).toBeTruthy();
      expect(result!.referrerId).toBe("user-1");
    });
    it("无效链接返回 null", async () => {
      mockPrisma.referralLink.findUnique.mockResolvedValue(null);
      const result = await svc.trackClick("invalid");
      expect(result).toBeNull();
    });
  });
});