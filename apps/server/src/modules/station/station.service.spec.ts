import { Test } from "@nestjs/testing";
import { StationService } from "./station.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  station: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  stationEarning: { findMany: jest.fn(), count: jest.fn() },
  operator: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
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
      ],
    }).compile();
    svc = mod.get(StationService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("createStation", () => {
    it("创建分站成功", async () => {
      mockPrisma.station.create.mockResolvedValue({ id: "s-1", name: "国学分站", code: "gx001" });
      const result = await svc.createStation("user-1", { name: "国学分站", code: "gx001" });
      expect(result.id).toBe("s-1");
    });
  });

  describe("updateStation", () => {
    it("更新成功并清除缓存", async () => {
      mockPrisma.station.update.mockResolvedValue({ id: "s-1", name: "新名称", code: "gx001" });
      mockRedis.del.mockResolvedValue(undefined);
      const result = await svc.updateStation("s-1", { name: "新名称" });
      expect(result.name).toBe("新名称");
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
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
      await expect(svc.getStation("invalid")).rejects.toThrow(NotFoundException);
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
      await expect(svc.getBrandByCode("invalid")).rejects.toThrow(NotFoundException);
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
      await expect(svc.getBrand("invalid")).rejects.toThrow(NotFoundException);
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
      await expect(svc.getMiniConfig("invalid")).rejects.toThrow(NotFoundException);
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
