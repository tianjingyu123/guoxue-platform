import { Test } from "@nestjs/testing";
import { CommentService } from "./comment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

const mockPrisma = {
  comment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe("CommentService", () => {
  let svc: CommentService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [CommentService, { provide: PrismaService, useValue: mockPrisma }],
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
      await expect(svc.create("u1", { targetType: "ARTICLE", targetId: "a1", content: "回复", parentId: "invalid" })).rejects.toThrow(NotFoundException);
    });
    it("回复时目标不匹配抛出 ForbiddenException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "p1", targetType: "VIDEO", targetId: "v1" });
      await expect(svc.create("u1", { targetType: "ARTICLE", targetId: "a1", content: "回复", parentId: "p1" })).rejects.toThrow(ForbiddenException);
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
      await expect(svc.findReplies("invalid")).rejects.toThrow(NotFoundException);
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
      await expect(svc.like("invalid")).rejects.toThrow(NotFoundException);
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
      await expect(svc.delete("u1", "c1")).rejects.toThrow(ForbiddenException);
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
      await expect(svc.hide("invalid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getCommentCount", () => {
    it("返回评论总数", async () => {
      mockPrisma.comment.count.mockResolvedValue(5);
      const result = await svc.getCommentCount("ARTICLE", "a1");
      expect(result).toBe(5);
    });
  });
});