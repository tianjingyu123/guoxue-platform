import { Test } from "@nestjs/testing";
import { RecommendCacheService } from "./recommend-cache.service";
import { RedisService } from "../../../redis/redis.service";
import { RecommendScene } from "../recommend.dto";

const mockRedis = { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };

describe("RecommendCacheService", () => {
  let svc: RecommendCacheService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [RecommendCacheService, { provide: RedisService, useValue: mockRedis }],
    }).compile();
    svc = mod.get(RecommendCacheService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("buildKey", () => {
    it("有 userId 时包含 userId", () => {
      const key = svc.buildKey({ scene: RecommendScene.GUESS_LIKE, userId: "u1", page: 1, pageSize: 10 });
      expect(key).toContain("u1");
      expect(key).toContain("guess_like");
      expect(key).toContain("v1");
    });

    it("无 userId 时使用 anonymous", () => {
      const key = svc.buildKey({ scene: RecommendScene.PAIPAN_RESULT, page: 1, pageSize: 10 });
      expect(key).toContain("anonymous");
      expect(key).toContain("paipan_result");
    });
  });

  describe("get/set", () => {
    it("get 从 Redis 读取 JSON", async () => {
      mockRedis.getJson.mockResolvedValue({ items: [] });
      const result = await svc.get("key1");
      expect(result).toEqual({ items: [] });
    });

    it("set 写入 Redis JSON 带 TTL", async () => {
      await svc.set("key1", { items: [] }, 300);
      expect(mockRedis.setJson).toHaveBeenCalledWith("key1", { items: [] }, 300);
    });
  });

  describe("clearByScene", () => {
    it("按场景清除缓存", async () => {
      await svc.clearByScene(RecommendScene.GUESS_LIKE);
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("recommend:guess_like:*");
    });
  });

  describe("clearByUser", () => {
    it("清除用户相关所有缓存", async () => {
      await svc.clearByUser("u1");
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("recommend:*:u1:*");
    });
  });

  describe("clearDedup", () => {
    it("清除用户去重缓存", async () => {
      await svc.clearDedup("u1");
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:dedup:u1");
    });
  });
});
