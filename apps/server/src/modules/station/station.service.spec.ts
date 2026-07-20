import { Test } from "@nestjs/testing";
import { StationService } from "./station.service";
import { StationPinnedService } from "./station-pinned.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { InsightService } from "../track/insight.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  station: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  stationEarning: { findMany: jest.fn(), count: jest.fn() },
  operator: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
};

const mockRedis = {
  del: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
};

describe("StationService", () => {
  let svc: StationService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        StationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: InsightService, useValue: { buildCustomerProfiles: jest.fn().mockResolvedValue([]), getTimeline: jest.fn().mockResolvedValue({ events: [] }) } },
        { provide: StationPinnedService, useValue: { getBoards: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    svc = mod.get(StationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma));
  });

  describe("createStation", () => {
    it("创建分站成功", async () => {
      mockPrisma.station.create.mockResolvedValue({ id: "s-1", name: "国学分站", code: "gx001" });
      const result = await svc.createStation("user-1", { name: "国学分站", code: "gx001" });
      expect(result.id).toBe("s-1");
    });
  });

  describe("applyStation", () => {
    it("自主申请创建 PENDING 分站且不绑定运营商", async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      mockPrisma.station.create.mockResolvedValue({ id: "s-1", status: "PENDING", operatorId: null });

      await svc.applyStation("u-1", { name: "我的分站", code: "MINE" });

      expect(mockPrisma.station.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ userId: "u-1", status: "PENDING", operatorId: undefined }),
      }));
      expect(mockPrisma.operator.updateMany).not.toHaveBeenCalled();
    });

    it("有效邀请以真实站数校准 usedQuota 并绑定运营商", async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-1", status: "ACTIVE", expireAt: null, containQuota: 6, usedQuota: 0 });
      mockPrisma.station.count.mockResolvedValue(2);
      mockPrisma.operator.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.station.create.mockResolvedValue({ id: "s-1", operatorId: "op-1" });

      const result = await svc.applyStation("u-1", { name: "团队分站", code: "TEAM", operatorId: "op-1" });

      expect(result.operatorId).toBe("op-1");
      expect(mockPrisma.operator.updateMany).toHaveBeenCalledWith({
        where: { id: "op-1", status: "ACTIVE", usedQuota: 0 },
        data: { usedQuota: 3 },
      });
      expect(mockPrisma.station.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ operatorId: "op-1" }) }));
    });

    it("过期运营商邀请不占名额也不建站", async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-1", status: "ACTIVE", expireAt: new Date("2020-01-01"), containQuota: 6, usedQuota: 0 });

      await expect(svc.applyStation("u-1", { name: "团队分站", code: "TEAM", operatorId: "op-1" })).rejects.toThrow("邀请码无效或已过期");
      expect(mockPrisma.operator.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.station.create).not.toHaveBeenCalled();
    });

    it("真实站数达到配额时拒绝邀请开站", async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-1", status: "ACTIVE", expireAt: null, containQuota: 6, usedQuota: 1 });
      mockPrisma.station.count.mockResolvedValue(6);

      await expect(svc.applyStation("u-1", { name: "团队分站", code: "TEAM", operatorId: "op-1" })).rejects.toThrow("名额已用完");
      expect(mockPrisma.station.create).not.toHaveBeenCalled();
    });

    it("并发抢占名额失败时不创建分站", async () => {
      mockPrisma.station.findFirst.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-1", status: "ACTIVE", expireAt: null, containQuota: 6, usedQuota: 2 });
      mockPrisma.station.count.mockResolvedValue(2);
      mockPrisma.operator.updateMany.mockResolvedValue({ count: 0 });

      await expect(svc.applyStation("u-1", { name: "团队分站", code: "TEAM", operatorId: "op-1" })).rejects.toThrow("名额状态已变化");
      expect(mockPrisma.station.create).not.toHaveBeenCalled();
    });
  });

  describe("getOperatorInvite", () => {
    it("只返回公开品牌与真实剩余名额", async () => {
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-1", brandName: "华夏运营中心", status: "ACTIVE", expireAt: null, containQuota: 6, usedQuota: 1 });
      mockPrisma.station.count.mockResolvedValue(3);

      await expect(svc.getOperatorInvite("op-1")).resolves.toEqual({
        operatorId: "op-1", operatorName: "华夏运营中心", availableQuota: 3,
      });
    });
  });

  describe("updateStation", () => {
    it("更新成功并清除缓存", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "s-1", name: "旧名称", code: "gx001" });
      mockPrisma.station.update.mockResolvedValue({ id: "s-1", name: "新名称", code: "gx001" });
      mockRedis.del.mockResolvedValue(undefined);
      const result = await svc.updateStation("s-1", { name: "新名称" });
      expect(result.name).toBe("新名称");
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
    });
  });

  describe("getStation", () => {
    it("返回分站详情", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "s-1", name: "国学分站", user: { id: "u1", nickname: "张三" } });
      const result = await svc.getStation("s-1");
      expect(result.name).toBe("国学分站");
    });
    it("分站不存在抛出 NotFoundException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getStation("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("getBrandByCode", () => {
    it("缓存命中直接返回", async () => {
      mockRedis.getJson.mockResolvedValue({ id: "s-1", name: "国学分站" });
      const result = await svc.getBrandByCode("gx001");
      expect(result.name).toBe("国学分站");
      expect(mockPrisma.station.findUnique).not.toHaveBeenCalled();
    });
    it("缓存未命中查数据库并回填", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue({ id: "s-1", name: "国学分站", code: "gx001", logo: null, themeColor: null, intro: null });
      mockRedis.setJson.mockResolvedValue(undefined);
      const result = await svc.getBrandByCode("gx001");
      expect(result.name).toBe("国学分站");
      expect(mockRedis.setJson).toHaveBeenCalled();
    });
    it("分站不存在抛出 NotFoundException", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getBrandByCode("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("getBrand", () => {
    it("通过 ID 获取品牌配置（缓存命中）", async () => {
      mockRedis.getJson.mockResolvedValue({ id: "s-1", name: "国学分站" });
      const result = await svc.getBrand("s-1");
      expect(result.name).toBe("国学分站");
    });
    it("缓存未命中查数据库并回填", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue({ id: "s-1", name: "国学分站", code: "gx001", logo: null, themeColor: null, intro: null });
      mockRedis.setJson.mockResolvedValue(undefined);
      const result = await svc.getBrand("s-1");
      expect(result.name).toBe("国学分站");
    });
    it("分站不存在抛出 NotFoundException", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getBrand("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("listStations", () => {
    it("返回分页分站列表", async () => {
      mockPrisma.station.findMany.mockResolvedValue([{ id: "s-1", name: "分站1", user: { id: "u1", nickname: "张三" } }]);
      mockPrisma.station.count.mockResolvedValue(1);
      const result = await svc.listStations(1, 20);
      expect(result.stations).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("非法 page 参数不产生 skip:NaN", async () => {
      mockPrisma.station.findMany.mockResolvedValue([]);
      mockPrisma.station.count.mockResolvedValue(0);
      await svc.listStations("abc" as any, -1 as any);
      const callArg = mockPrisma.station.findMany.mock.calls[0][0];
      expect(Number.isNaN(callArg.skip)).toBe(false);
      expect(callArg.skip).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStationEarnings", () => {
    it("返回分页收益列表", async () => {
      mockPrisma.stationEarning.findMany.mockResolvedValue([{ id: "e-1", amount: 100, earned: 10 }]);
      mockPrisma.stationEarning.count.mockResolvedValue(1);
      const result = await svc.getStationEarnings("s-1");
      expect(result.earnings).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("createOperator", () => {
    it("创建运营商成功", async () => {
      mockPrisma.operator.create.mockResolvedValue({ id: "op-1", level: "GOLD", containQuota: 0 });
      const result = await svc.createOperator("user-1", { level: "GOLD" });
      expect(result.id).toBe("op-1");
    });
    it("创建含配额的运营商", async () => {
      mockPrisma.operator.create.mockResolvedValue({ id: "op-2", level: "PLATINUM", containQuota: 100 });
      const result = await svc.createOperator("user-1", { level: "PLATINUM", containQuota: 100 });
      expect(result.containQuota).toBe(100);
    });
  });

  describe("listOperators", () => {
    it("返回分页运营商列表", async () => {
      mockPrisma.operator.findMany.mockResolvedValue([{ id: "op-1", level: "GOLD", user: { id: "u1", nickname: "张三" } }]);
      mockPrisma.operator.count.mockResolvedValue(1);
      const result = await svc.listOperators();
      expect(result.operators).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ═══════════════════ 多小程序配置 ═══════════════════

  describe("getMiniConfig", () => {
    it("分站有独立小程序时返回分站 AppId", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: "s-1", name: "独立分站", code: "standalone",
        miniAppId: "wx_station_app", mpAppId: "wx_station_mp",
        miniPages: { home: "pages/home/index", share: "pages/share/index" },
        logo: "https://cdn/logo.png", themeColor: "#ff6600",
      });
      const result = await svc.getMiniConfig("s-1");
      expect(result.miniAppId).toBe("wx_station_app");
      expect(result.mpAppId).toBe("wx_station_mp");
      expect(result.pages.home).toBe("pages/home/index");
    });

    it("分站无独立小程序时返回平台主 AppId", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: "s-2", name: "普通分站", code: "normal",
        miniAppId: null, mpAppId: null, miniPages: null,
        logo: null, themeColor: "#8B4513",
      });
      const result = await svc.getMiniConfig("s-2");
      expect(result.miniAppId).toBe(process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_APP_ID || "");
    });

    it("分站不存在抛出 NotFoundException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getMiniConfig("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("resolveJumpTarget", () => {
    it("自定义页面路径映射生效", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: "s-1", name: "分站", code: "gz001",
        miniAppId: "wx_custom", mpAppId: null, miniPages: { course: "pages/course/list" },
        logo: null, themeColor: "#8B4513",
      });
      const result = await svc.resolveJumpTarget("s-1", "course");
      expect(result.path).toBe("pages/course/list");
      expect(result.crossApp).toBe(true);
    });

    it("未配置映射则原样返回路径", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: "s-2", name: "分站", code: "gz002",
        miniAppId: null, mpAppId: null, miniPages: null,
        logo: null, themeColor: null,
      });
      const result = await svc.resolveJumpTarget("s-2", "pages/other/index");
      expect(result.path).toBe("pages/other/index");
      expect(result.crossApp).toBe(false);
    });
  });
});
