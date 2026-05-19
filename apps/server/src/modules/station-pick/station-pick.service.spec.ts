import { Test, TestingModule } from "@nestjs/testing";
import { StationPickService } from "./station-pick.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  stationPick: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  station: { findUnique: jest.fn(), update: jest.fn() },
  article: { findUnique: jest.fn(), findMany: jest.fn() },
  course: { findUnique: jest.fn(), findMany: jest.fn() },
  product: { findUnique: jest.fn(), findMany: jest.fn() },
  circle: { findUnique: jest.fn(), findMany: jest.fn() },
  video: { findUnique: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

describe("StationPickService", () => {
  let svc: StationPickService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        StationPickService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(StationPickService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getItems", () => {
    it("返回分站精选列表", async () => {
      mockPrisma.stationPick.findMany.mockResolvedValue([
        { id: "p1", contentType: "ARTICLE", contentId: "a1", sortOrder: 0, remark: "推荐" },
      ]);
      mockPrisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "测试文章", cover: null, excerpt: null, tags: [], viewCount: 100, likeCount: 10 },
      ]);
      const items = await svc.getItems("station1");
      expect(items).toHaveLength(1);
      expect((items[0] as any).title).toBe("测试文章");
    });
  });

  describe("addPick", () => {
    it("添加精选内容", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1" });
      mockPrisma.stationPick.findUnique.mockResolvedValue(null);
      mockPrisma.stationPick.count.mockResolvedValue(5);
      mockPrisma.stationPick.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
      mockPrisma.stationPick.create.mockResolvedValue({ id: "p1", sortOrder: 5 });
      const dto = { contentType: "ARTICLE" as any, contentId: "a1", remark: "推荐" };
      const result = await svc.addPick("station1", dto);
      expect(result.id).toBe("p1");
    });

    it("内容不存在抛出异常", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      const dto = { contentType: "ARTICLE" as any, contentId: "bad", remark: "" };
      await expect(svc.addPick("station1", dto)).rejects.toThrow(BusinessException);
    });

    it("超出上限抛出异常", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1" });
      mockPrisma.stationPick.findUnique.mockResolvedValue(null);
      mockPrisma.stationPick.count.mockResolvedValue(20);
      const dto = { contentType: "ARTICLE" as any, contentId: "a1", remark: "" };
      await expect(svc.addPick("station1", dto)).rejects.toThrow("每个分站最多添加");
    });
  });

  describe("removePick", () => {
    it("移除精选内容", async () => {
      mockPrisma.stationPick.findFirst.mockResolvedValue({ id: "p1", stationId: "station1" });
      const result = await svc.removePick("station1", "p1");
      expect(result.success).toBe(true);
    });

    it("记录不存在抛出异常", async () => {
      mockPrisma.stationPick.findFirst.mockResolvedValue(null);
      await expect(svc.removePick("station1", "bad")).rejects.toThrow(BusinessException);
    });
  });

  describe("reorderPicks", () => {
    it("批量排序", async () => {
      const result = await svc.reorderPicks("station1", [
        { id: "p1", sortOrder: 0 },
        { id: "p2", sortOrder: 1 },
      ]);
      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("getQuota", () => {
    it("返回配额信息", async () => {
      mockPrisma.stationPick.count.mockResolvedValue(5);
      const quota = await svc.getQuota("station1");
      expect(quota.used).toBe(5);
      expect(quota.limit).toBe(20);
    });
  });

  describe("adminSetConfig", () => {
    it("更新分站配置", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station1", templateConfig: {} });
      const result = await svc.adminSetConfig("station1", { maxPicks: 30 });
      expect(result.success).toBe(true);
    });

    it("分站不存在抛出异常", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.adminSetConfig("bad", {})).rejects.toThrow(BusinessException);
    });
  });
});
