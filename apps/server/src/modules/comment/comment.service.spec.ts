import { Test } from "@nestjs/testing";
import { CommentService } from "./comment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  comment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  article: { findMany: jest.fn().mockResolvedValue([]) },
  course: { findMany: jest.fn().mockResolvedValue([]) },
  video: { findMany: jest.fn().mockResolvedValue([]) },
  product: { findMany: jest.fn().mockResolvedValue([]) },
  post: { findMany: jest.fn().mockResolvedValue([]) },
  userBehavior: {
    create: jest.fn().mockResolvedValue({}),
  },
};

describe("CommentService", () => {
  let svc: CommentService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    svc = mod.get(CommentService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create", () => {
    it("创建顶级评论成功", async () => {
      mockPrisma.comment.create.mockResolvedValue({ id: "c1", content: "好文", userId: "u1" });
      const result = await svc.create("u1", { targetType: "ARTICLE", targetId: "a1", content: "好文" });
      expect(result).toBeTruthy();
    });
    it("回复时父评论不存在抛出 NotFoundException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      await expect(svc.create("u1", { targetType: "ARTICLE", targetId: "a1", content: "回复", parentId: "invalid" })).rejects.toThrow(BusinessException);
    });
    it("回复时目标不匹配抛出 ForbiddenException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "p1", targetType: "VIDEO", targetId: "v1" });
      await expect(svc.create("u1", { targetType: "ARTICLE", targetId: "a1", content: "回复", parentId: "p1" })).rejects.toThrow(BusinessException);
    });
  });

  describe("findByTarget", () => {
    it("返回分页评论（含嵌套回复）", async () => {
      mockPrisma.comment.findMany.mockResolvedValueOnce([]);
      mockPrisma.comment.count.mockResolvedValue(0);
      const result = await svc.findByTarget({ targetType: "ARTICLE", targetId: "a1" });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(0);
    });
  });

  describe("findReplies", () => {
    it("父评论存在时返回回复列表", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "p1" });
      mockPrisma.comment.findMany.mockResolvedValue([{ id: "r1", content: "回复内容" }]);
      const result = await svc.findReplies("p1");
      expect(result).toHaveLength(1);
    });
    it("父评论不存在抛出 NotFoundException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      await expect(svc.findReplies("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("like", () => {
    it("点赞评论成功", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "c1", likeCount: 0 });
      mockPrisma.comment.update.mockResolvedValue({ id: "c1", likeCount: 1 });
      const result = await svc.like("c1");
      expect(result.likeCount).toBe(1);
    });
    it("评论不存在抛出 NotFoundException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      await expect(svc.like("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("delete", () => {
    it("删除自己的评论成功", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" });
      mockPrisma.comment.delete.mockResolvedValue({});
      const result = await svc.delete("u1", "c1");
      expect(result.success).toBe(true);
    });
    it("删除他人评论抛出 ForbiddenException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u2" });
      await expect(svc.delete("u1", "c1")).rejects.toThrow(BusinessException);
    });
  });

  describe("hide", () => {
    it("隐藏评论成功", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "c1", status: "PUBLISHED" });
      mockPrisma.comment.update.mockResolvedValue({ id: "c1", status: "HIDDEN" });
      const result = await svc.hide("c1");
      expect(result.status).toBe("HIDDEN");
    });
    it("评论不存在抛出 NotFoundException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      await expect(svc.hide("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("getCommentCount", () => {
    it("返回评论总数", async () => {
      mockPrisma.comment.count.mockResolvedValue(5);
      const result = await svc.getCommentCount("ARTICLE", "a1");
      expect(result).toBe(5);
    });
  });

  describe("getUserComments", () => {
    it("批量补全目标详情 + 聚合回复数（不 N+1）", async () => {
      mockPrisma.comment.findMany.mockResolvedValueOnce([
        { id: "c1", userId: "u1", targetType: "ARTICLE", targetId: "a1", content: "评论一", likeCount: 3, createdAt: new Date() },
        { id: "c2", userId: "u1", targetType: "VIDEO", targetId: "v-deleted", content: "评论二", likeCount: 0, createdAt: new Date() },
      ]);
      mockPrisma.comment.count.mockResolvedValue(2);
      mockPrisma.article.findMany.mockResolvedValue([{ id: "a1", title: "文章一", cover: "a.jpg", user: { nickname: "作者", avatar: null } }]);
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.comment.groupBy.mockResolvedValue([{ parentId: "c1", _count: { _all: 2 } }]);

      const result = await svc.getUserComments("u1", 1, 20);

      expect(mockPrisma.comment.groupBy).toHaveBeenCalledTimes(1);
      expect(result.items[0]).toMatchObject({ id: "c1", replyCount: 2, hasReply: true });
      expect(result.items[0].target).toMatchObject({ type: "article", title: "文章一", cover: "a.jpg" });
      // 目标已删除 → null + 无回复
      expect(result.items[1]).toMatchObject({ replyCount: 0, hasReply: false, target: null });
    });
  });

  describe("getReceivedComments", () => {
    it("补全我的内容标题 + 计算 isReplied/myReply", async () => {
      // 拥有内容ID 查询：article 命中 a1，其余为空（course/video/product/post 用默认 []）
      // article.findMany 被调用两次：①查我拥有的文章ID ②resolveTargets 取标题
      mockPrisma.article.findMany
        .mockResolvedValueOnce([{ id: "a1" }])
        .mockResolvedValueOnce([{ id: "a1", title: "我的文章", cover: null, user: { nickname: "我", avatar: null } }]);
      // comment.findMany：①收到的评论列表 ②我对这些评论的回复
      mockPrisma.comment.findMany
        .mockResolvedValueOnce([
          { id: "rc1", userId: "other", targetType: "ARTICLE", targetId: "a1", content: "提问", createdAt: new Date(), user: { id: "other", nickname: "路人", avatar: null } },
        ])
        .mockResolvedValueOnce([
          { id: "rep1", parentId: "rc1", content: "我的回复", createdAt: new Date() },
        ]);
      mockPrisma.comment.count.mockResolvedValue(1);

      const result = await svc.getReceivedComments("owner", 1, 20);

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ id: "rc1", isReplied: true });
      expect(result.items[0].target).toMatchObject({ type: "article", title: "我的文章" });
      expect(result.items[0].myReply).toMatchObject({ content: "我的回复" });
    });
  });
});