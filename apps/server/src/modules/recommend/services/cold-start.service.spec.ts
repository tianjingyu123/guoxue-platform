import { Test } from "@nestjs/testing";
import { ColdStartService } from "./cold-start.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

const mockPrisma = {
  userBehavior: { count: jest.fn() },
  userInterest: { count: jest.fn() },
  course: { findMany: jest.fn() },
  circle: { findMany: jest.fn() },
  article: { findMany: jest.fn() },
};
const mockRedis = { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn() };

describe("ColdStartService", () => {
  let svc: ColdStartService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ColdStartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(ColdStartService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("isColdStart", () => {
    it("行为<3且无兴趣标签 → 冷启动", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.userBehavior.count.mockResolvedValue(1);
      mockPrisma.userInterest.count.mockResolvedValue(0);

      const result = await svc.isColdStart("u1");
      expect(result).toBe(true);
      expect(mockRedis.setJson).toHaveBeenCalledWith("recommend:coldstart:u1", true, 1800);
    });

    it("行为>=3 → 非冷启动", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.userBehavior.count.mockResolvedValue(5);
      mockPrisma.userInterest.count.mockResolvedValue(2);

      const result = await svc.isColdStart("u2");
      expect(result).toBe(false);
    });

    it("有兴趣标签 → 非冷启动（即使行为少）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.userBehavior.count.mockResolvedValue(0);
      mockPrisma.userInterest.count.mockResolvedValue(3);

      const result = await svc.isColdStart("u3");
      expect(result).toBe(false);
    });

    it("缓存命中时跳过数据库查询", async () => {
      mockRedis.getJson.mockResolvedValue(true);
      const result = await svc.isColdStart("u4");
      expect(result).toBe(true);
      expect(mockPrisma.userBehavior.count).not.toHaveBeenCalled();
    });
  });

  describe("getStarterPack", () => {
    it("返回入门精选内容", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([{ id: "c1", title: "入门课", cover: null, intro: null, tags: ["入门"], price: 0, studentCount: 100 }]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([]);

      const items = await svc.getStarterPack();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].strategies).toContain("cold-start");
      expect(items[0].strategies).toContain("starter-pack");
    });

    it("按类型过滤精选包", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([]);

      const items = await svc.getStarterPack("COURSE");
      expect(items).toHaveLength(0);
    });
  });

  describe("clearCache", () => {
    it("删除用户冷启动标记", async () => {
      await svc.clearCache("u1");
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:coldstart:u1");
    });
  });
});
