import { Test } from "@nestjs/testing";
import { StationBillingService } from "./station-billing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma: any = {
  station: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  operator: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  notification: { create: jest.fn() },
};
const mockRedis: any = {
  setNX: jest.fn().mockResolvedValue(true),
  runExclusive: jest.fn((_k: string, _t: number, fn: () => any) => fn()),
};

/**
 * n 天后的时间点，减 1h 缓冲。
 * 服务用 Math.ceil 算 daysLeft，所以必须让差值略小于整数天（6.96 → ceil 7）；
 * 若略大于（7.04）会被 ceil 成 8，落到相邻档。
 */
const inDays = (n: number) => new Date(Date.now() + n * 86400000 - 3600000);

describe("StationBillingService", () => {
  let svc: StationBillingService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        StationBillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(StationBillingService);
  });

  beforeEach(() => {
    // clearAllMocks 只清调用记录，不清 mockResolvedValue → 必须显式重设默认值，
    // 否则上个用例的 findMany 返回值会串到下一个用例。
    jest.clearAllMocks();
    mockRedis.setNX.mockResolvedValue(true);
    mockPrisma.station.findMany.mockResolvedValue([]);
    mockPrisma.operator.findMany.mockResolvedValue([]);
    mockPrisma.station.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.operator.updateMany.mockResolvedValue({ count: 0 });
  });

  describe("到期提醒", () => {
    it("剩 7 天：发提醒", async () => {
      mockPrisma.station.findMany.mockResolvedValue([
        { id: "st1", userId: "u1", name: "北京站", expireAt: inDays(7) },
      ]);
      const sent = await svc.runExpiryRemind();
      expect(sent).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: "u1" }) }),
      );
    });

    it("剩 5 天：不在 7/3/1 档位，不打扰", async () => {
      mockPrisma.station.findMany.mockResolvedValue([
        { id: "st1", userId: "u1", name: "北京站", expireAt: inDays(5) },
      ]);
      const sent = await svc.runExpiryRemind();
      expect(sent).toBe(0);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it("同一档位重复跑：redis 判重，不重复发", async () => {
      mockPrisma.station.findMany.mockResolvedValue([
        { id: "st1", userId: "u1", name: "北京站", expireAt: inDays(3) },
      ]);
      mockRedis.setNX.mockResolvedValue(false); // 已发过
      const sent = await svc.runExpiryRemind();
      expect(sent).toBe(0);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it("运营商同样提醒", async () => {
      mockPrisma.operator.findMany.mockResolvedValue([
        { id: "op1", userId: "u2", level: "SILVER", expireAt: inDays(1) },
      ]);
      const sent = await svc.runExpiryRemind();
      expect(sent).toBe(1);
    });
  });

  describe("过期停用", () => {
    it("过期分站置 EXPIRED，且只停开了 autoSuspendOnExpiry 的", async () => {
      mockPrisma.station.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.operator.updateMany.mockResolvedValue({ count: 1 });

      const r = await svc.runSuspendExpired();

      expect(r).toEqual({ stations: 2, operators: 1 });
      const where = mockPrisma.station.updateMany.mock.calls[0][0].where;
      expect(where.autoSuspendOnExpiry).toBe(true); // 关掉开关的分站豁免
      expect(where.status).toBe("ACTIVE");
      expect(mockPrisma.station.updateMany.mock.calls[0][0].data).toEqual({ status: "EXPIRED" });
    });

    it("只改 status，不触碰佣金/数据", async () => {
      await svc.runSuspendExpired();
      const data = mockPrisma.station.updateMany.mock.calls[0][0].data;
      expect(Object.keys(data)).toEqual(["status"]);
    });
  });
});
