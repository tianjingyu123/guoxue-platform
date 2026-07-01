import { Test } from "@nestjs/testing";
import { ArticleService } from "./article.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RecommendService } from "../recommend/recommend.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  article: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  circleMember: { findUnique: jest.fn() },
  articleRecommend: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockRedis = {
  delByPattern: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
  del: jest.fn(),
};

const mockRecommend = {
  related: jest.fn(),
};

describe("ArticleService", () => {
  let svc: ArticleService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: RecommendService, useValue: mockRecommend },
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    svc = mod.get(ArticleService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create", () => {
    it("圈主/管理员创建文章成功", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "OWNER" });
      mockPrisma.article.create.mockResolvedValue({ id: "a1", title: "测试" });
      mockRedis.delByPattern.mockResolvedValue(undefined);

      const result = await svc.create("c1", "u1", {
        title: "国学经典", content: "正文", tags: ["儒家"],
      });
      expect(result.id).toBe("a1");
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("articles:list:*");
    });

    it("非管理员创建文章抛出 ForbiddenException", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.create("c1", "u1", {
        title: "测试", content: "正文", tags: ["儒家"],
      })).rejects.toThrow(BusinessException);
    });
  });

  describe("update", () => {
    it("更新自己的文章成功", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", userId: "u1" });
      mockPrisma.article.update.mockResolvedValue({ id: "a1", title: "新标题" });
      mockRedis.delByPattern.mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(undefined);

      const result = await svc.update("a1", "u1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });

    it("文章不存在抛出 NotFoundException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(svc.update("invalid", "u1", { title: "新标题" })).rejects.toThrow(BusinessException);
    });

    it("编辑他人文章抛出 ForbiddenException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", userId: "u2" });
      await expect(svc.update("a1", "u1", { title: "新标题" })).rejects.toThrow(BusinessException);
    });
  });

  describe("delete", () => {
    it("删除自己的文章成功", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", userId: "u1", circleId: "c1" });
      mockPrisma.article.delete.mockResolvedValue({});
      const result = await svc.delete("a1", "u1");
      expect(result.success).toBe(true);
    });

    it("文章不存在抛出 NotFoundException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(svc.delete("invalid", "u1")).rejects.toThrow(BusinessException);
    });

    it("非作者非管理员删除抛出 ForbiddenException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", userId: "u2", circleId: "c1" });
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "MEMBER" });
      await expect(svc.delete("a1", "u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("getDetail", () => {
    it("有缓存时返回缓存数据", async () => {
      mockRedis.getJson.mockResolvedValue({ id: "a1", title: "缓存文章" });
      mockPrisma.article.update.mockResolvedValue({});
      const result = await svc.getDetail("a1");
      expect(result.title).toBe("缓存文章");
      expect(mockPrisma.article.findUnique).not.toHaveBeenCalled();
    });

    it("无缓存时查询数据库并写入缓存", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue({
        id: "a1", title: "数据库文章", user: {}, circle: {}, recommends: [],
      });
      mockPrisma.article.update.mockResolvedValue({});
      mockRecommend.related.mockResolvedValue([]);
      mockRedis.setJson.mockResolvedValue(undefined);

      const result = await svc.getDetail("a1");
      expect(result.title).toBe("数据库文章");
      expect(mockRedis.setJson).toHaveBeenCalled();
    });

    it("文章不存在抛出 NotFoundException", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(svc.getDetail("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("listArticles", () => {
    it("无缓存时查询并写入缓存", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);
      mockRedis.setJson.mockResolvedValue(undefined);

      const result = await svc.listArticles({ page: 1, pageSize: 20 });
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(0);
      expect(mockRedis.setJson).toHaveBeenCalled();
    });

    it("有缓存时直接返回", async () => {
      const cached = { rows: [], total: 0, page: 1, pageSize: 20, _paginated: true };
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.listArticles({ page: 1, pageSize: 20 });
      expect(result).toEqual(cached);
      expect(mockPrisma.article.findMany).not.toHaveBeenCalled();
    });

    it("按 circleId 过滤", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);
      mockRedis.setJson.mockResolvedValue(undefined);

      await svc.listArticles({ page: 1, pageSize: 20, circleId: "c1" });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ circleId: "c1" }),
        }),
      );
    });
  });

  describe("getHomeFeed", () => {
    it("返回首页信息流", async () => {
      mockPrisma.article.findMany.mockResolvedValue([{ id: "a1", title: "首页文章" }]);
      mockPrisma.article.count.mockResolvedValue(1);
      const result = await svc.getHomeFeed({ page: 1, pageSize: 20 });
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getRelated", () => {
    it("返回相关文章", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", circleId: "c1", tags: ["儒家"] });
      mockPrisma.article.findMany.mockResolvedValue([{ id: "a2", title: "相关文章" }]);
      const result = await svc.getRelated("a1");
      expect(result).toHaveLength(1);
    });

    it("文章不存在抛出 NotFoundException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(svc.getRelated("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("auditArticle", () => {
    it("审核文章成功", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1" });
      mockPrisma.article.update.mockResolvedValue({ id: "a1", auditStatus: "APPROVED" });
      const result = await svc.auditArticle("a1", "APPROVED");
      expect(result.auditStatus).toBe("APPROVED");
    });

    it("文章不存在抛出 NotFoundException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(svc.auditArticle("invalid", "APPROVED")).rejects.toThrow(BusinessException);
    });
  });

  describe("addRecommend", () => {
    it("添加推荐卡片成功", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", userId: "u1" });
      mockPrisma.articleRecommend.create.mockResolvedValue({ id: "r1", recommendType: "CIRCLE", targetId: "c1" });
      const result = await svc.addRecommend("a1", "u1", { recommendType: "CIRCLE", targetId: "c1" });
      expect(result.id).toBe("r1");
    });
  });

  describe("removeRecommend", () => {
    it("移除推荐卡片成功", async () => {
      mockPrisma.articleRecommend.findUnique.mockResolvedValue({
        id: "r1", article: { userId: "u1" },
      });
      mockPrisma.articleRecommend.delete.mockResolvedValue({});
      const result = await svc.removeRecommend("r1", "u1");
      expect(result.success).toBe(true);
    });

    it("推荐卡片不存在抛出 NotFoundException", async () => {
      mockPrisma.articleRecommend.findUnique.mockResolvedValue(null);
      await expect(svc.removeRecommend("invalid", "u1")).rejects.toThrow(BusinessException);
    });
  });
});
