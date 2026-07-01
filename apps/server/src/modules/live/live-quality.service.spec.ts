import { Test } from "@nestjs/testing";
import { LiveQualityService } from "./live-quality.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  liveQualityPackage: { findMany: jest.fn(), findUnique: jest.fn() },
  liveQuotaAccount: { findUnique: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
  liveQuotaRecord: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  // 事务：把同一 mock 当作 tx 传入回调
  $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockPrisma)),
};
const mockCoin = { spend: jest.fn().mockResolvedValue({}) };

describe("LiveQualityService", () => {
  let svc: LiveQualityService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        LiveQualityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CoinService, useValue: mockCoin },
      ],
    }).compile();
    svc = mod.get(LiveQualityService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("listPackages — 返回上架时长包", async () => {
    mockPrisma.liveQualityPackage.findMany.mockResolvedValue([{ id: "p1", quality: "hd" }]);
    const r = await svc.listPackages();
    expect(r).toHaveLength(1);
    expect(mockPrisma.liveQualityPackage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" } }),
    );
  });

  it("getQuota — 无账户返回 0", async () => {
    mockPrisma.liveQuotaAccount.findUnique.mockResolvedValue(null);
    expect(await svc.getQuota("u1")).toEqual({ hdMinutes: 0, uhdMinutes: 0 });
  });

  it("getQuota — 返回账户剩余分钟", async () => {
    mockPrisma.liveQuotaAccount.findUnique.mockResolvedValue({ hdMinutes: 600, uhdMinutes: 120 });
    expect(await svc.getQuota("u1")).toEqual({ hdMinutes: 600, uhdMinutes: 120 });
  });

  it("purchasePackage — 扣币+增额度+记流水（单事务）", async () => {
    mockPrisma.liveQualityPackage.findUnique.mockResolvedValue({ id: "p1", name: "高清10时包", quality: "hd", minutes: 600, priceCoin: 1280, status: "ACTIVE" });
    mockPrisma.liveQuotaAccount.upsert.mockResolvedValue({});
    mockPrisma.liveQuotaRecord.create.mockResolvedValue({});
    mockPrisma.liveQuotaAccount.findUnique.mockResolvedValue({ hdMinutes: 600, uhdMinutes: 0 });

    const r = await svc.purchasePackage("u1", "p1");

    expect(mockCoin.spend).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ amountCoin: 1280, scene: "LIVE_QUALITY_PACKAGE", refId: "p1" }),
      mockPrisma,
    );
    expect(mockPrisma.liveQuotaAccount.upsert).toHaveBeenCalled();
    expect(mockPrisma.liveQuotaRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "PURCHASE", quality: "hd", minutes: 600, costCoin: 1280 }) }),
    );
    expect(r).toEqual({ hdMinutes: 600, uhdMinutes: 0 });
  });

  it("purchasePackage — 时长包不存在抛异常", async () => {
    mockPrisma.liveQualityPackage.findUnique.mockResolvedValue(null);
    await expect(svc.purchasePackage("u1", "x")).rejects.toBeInstanceOf(BusinessException);
    expect(mockCoin.spend).not.toHaveBeenCalled();
  });

  it("consumeQuota — basic 档不计费直接放行", async () => {
    const r = await svc.consumeQuota("u1", "basic", 30);
    expect(r.ok).toBe(true);
    expect(mockPrisma.liveQuotaAccount.updateMany).not.toHaveBeenCalled();
  });

  it("consumeQuota — hd 额度充足则原子扣减", async () => {
    mockPrisma.liveQuotaAccount.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.liveQuotaRecord.create.mockResolvedValue({});
    const r = await svc.consumeQuota("u1", "hd", 30, "r1");
    expect(r.ok).toBe(true);
    expect(mockPrisma.liveQuotaAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", hdMinutes: { gte: 30 } } }),
    );
    expect(mockPrisma.liveQuotaRecord.create).toHaveBeenCalled();
  });

  it("consumeQuota — 额度不足返回 ok:false 不记流水", async () => {
    mockPrisma.liveQuotaAccount.updateMany.mockResolvedValue({ count: 0 });
    const r = await svc.consumeQuota("u1", "uhd", 100);
    expect(r.ok).toBe(false);
    expect(mockPrisma.liveQuotaRecord.create).not.toHaveBeenCalled();
  });
});
