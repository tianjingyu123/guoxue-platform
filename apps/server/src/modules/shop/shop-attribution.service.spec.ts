import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";
import { ShopAttributionService } from "./shop-attribution.service";

const mockPrisma = {
  order: { findMany: jest.fn() },
  station: { findMany: jest.fn() },
};
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  runExclusive: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
};
const mockCommission = {
  calculateAndRecord: jest.fn(),
  calculatePlatformFee: jest.fn(),
  recordPlatformFee: jest.fn(),
};

describe("ShopAttributionService 支付账务补偿", () => {
  let service: ShopAttributionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ShopAttributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: CommissionService, useValue: mockCommission },
      ],
    }).compile();
    service = module.get(ShopAttributionService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue(undefined);
    mockRedis.runExclusive.mockImplementation(
      (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
    );
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.station.findMany.mockResolvedValue([]);
    mockCommission.calculateAndRecord.mockResolvedValue(null);
    mockCommission.calculatePlatformFee.mockResolvedValue(null);
    mockCommission.recordPlatformFee.mockResolvedValue(null);
  });

  it("永久归属 B 与临时分站 E 同时存在时，支付记账完整透传两者，由佣金服务按 E 优先", async () => {
    mockCommission.calculatePlatformFee.mockResolvedValue({
      platformRate: 0.2,
      platformFee: 20,
    });

    await service.recordOrderCommissionAndFee({
      id: "order-bcde",
      type: "PRODUCT",
      amount: 100,
      userId: "buyer-c",
      referrerId: "station-b-user",
      tempReferrerId: "station-e-user",
    });

    expect(mockCommission.calculateAndRecord).toHaveBeenCalledWith(
      "order-bcde",
      "PRODUCT",
      100,
      "station-b-user",
      "station-e-user",
      undefined,
      "buyer-c",
    );
    expect(mockCommission.recordPlatformFee).toHaveBeenCalledWith({
      type: "PRODUCT",
      sourceId: "order-bcde",
      sourceAmount: 100,
      platformRate: 0.2,
      platformFee: 20,
    });
  });

  it("每十分钟复核近 48 小时终态订单；首轮分佣失败后下一轮会自动重试", async () => {
    const order = {
      id: "order-retry",
      type: "PRODUCT",
      amount: 100,
      userId: "buyer-c",
      referrerId: "station-b-user",
      tempReferrerId: "station-e-user",
      tempRefSubjectType: "STATION",
    };
    mockPrisma.order.findMany.mockResolvedValue([order]);
    mockCommission.calculateAndRecord
      .mockRejectedValueOnce(new Error("temporary commission outage"))
      .mockResolvedValueOnce(null);

    await service.reconcilePaidOrderAccounting();
    await service.reconcilePaidOrderAccounting();

    expect(mockRedis.runExclusive).toHaveBeenCalledWith(
      "shop_paid_order_accounting_reconcile",
      540,
      expect.any(Function),
    );
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
          paidAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
        take: 500,
      }),
    );
    expect(mockCommission.calculateAndRecord).toHaveBeenCalledTimes(2);
  });

  it("超过单页容量后按 Redis offset 轮转，扫到末页自动回到起点", async () => {
    mockRedis.get.mockResolvedValue("500");
    mockPrisma.order.findMany.mockResolvedValue([]);

    await service.reconcilePaidOrderAccounting();

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { paidAt: "asc" }, skip: 500, take: 500 }),
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      "shop_paid_order_accounting_offset",
      "0",
      48 * 60 * 60,
    );
  });

  it("普通用户分享订单周期复核时只补平台费，不重复触发首单成长积分", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: "order-friend-share",
        type: "PRODUCT",
        amount: 100,
        userId: "buyer-1",
        referrerId: "friend-1",
        tempReferrerId: null,
        tempRefSubjectType: null,
      },
    ]);
    mockPrisma.station.findMany.mockResolvedValue([]);
    mockCommission.calculatePlatformFee.mockResolvedValue({
      platformRate: 0.2,
      platformFee: 20,
    });

    await service.reconcilePaidOrderAccounting();
    await service.reconcilePaidOrderAccounting();

    expect(mockPrisma.station.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["friend-1"] } },
      select: { userId: true },
    });
    expect(mockCommission.calculateAndRecord).not.toHaveBeenCalled();
    expect(mockCommission.calculatePlatformFee).toHaveBeenCalledTimes(2);
    expect(mockCommission.recordPlatformFee).toHaveBeenCalledTimes(2);
  });
});