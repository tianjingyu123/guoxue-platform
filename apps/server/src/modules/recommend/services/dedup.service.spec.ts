import { Test } from "@nestjs/testing";
import { DedupService } from "./dedup.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

const mockPrisma = {
  order: { findMany: jest.fn() },
  collect: { findMany: jest.fn() },
  like: { findMany: jest.fn() },
  circleMember: { findMany: jest.fn() },
  courseProgress: { findMany: jest.fn() },
};
const mockRedis = { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn() };

describe("DedupService", () => {
  let svc: DedupService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DedupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(DedupService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getUserOwnedSet", () => {
    it("缓存命中直接返回", async () => {
      mockRedis.getJson.mockResolvedValue(["ARTICLE:a1", "COURSE:c1"]);
      const set = await svc.getUserOwnedSet("u1");
      expect(set.has("ARTICLE:a1")).toBe(true);
      expect(set.has("COURSE:c1")).toBe(true);
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
    });

    it("缓存未命中时查询数据库并写缓存", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.order.findMany.mockResolvedValue([{ type: "COURSE", targetId: "c1" }]);
      mockPrisma.collect.findMany.mockResolvedValue([{ targetType: "ARTICLE", targetId: "a1" }]);
      mockPrisma.like.findMany.mockResolvedValue([]);
      mockPrisma.circleMember.findMany.mockResolvedValue([{ circleId: "cr1" }]);
      mockPrisma.courseProgress.findMany.mockResolvedValue([{ courseId: "c2" }]);

      const set = await svc.getUserOwnedSet("u1");
      expect(set.has("COURSE:c1")).toBe(true);
      expect(set.has("ARTICLE:a1")).toBe(true);
      expect(set.has("CIRCLE_JOIN:cr1")).toBe(true);
      expect(set.has("COURSE:c2")).toBe(true);
      expect(mockRedis.setJson).toHaveBeenCalled();
    });

    it("空数据时不报错", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.collect.findMany.mockResolvedValue([]);
      mockPrisma.like.findMany.mockResolvedValue([]);
      mockPrisma.circleMember.findMany.mockResolvedValue([]);
      mockPrisma.courseProgress.findMany.mockResolvedValue([]);

      const set = await svc.getUserOwnedSet("u1");
      expect(set.size).toBe(0);
    });
  });

  describe("clearCache", () => {
    it("删除用户去重缓存", async () => {
      await svc.clearCache("u1");
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:dedup:u1");
    });
  });
});
