import { Test } from "@nestjs/testing";
import { VideoService } from "./video.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  video: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe("VideoService", () => {
  let svc: VideoService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        VideoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(VideoService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create", () => {
    it("创建视频成功", async () => {
      mockPrisma.video.create.mockResolvedValue({ id: "v1", title: "国学视频", videoUrl: "https://example.com/video.mp4" });
      const result = await svc.create("u1", { videoUrl: "https://example.com/video.mp4" });
      expect(result.id).toBe("v1");
    });

    it("创建视频带全部字段", async () => {
      mockPrisma.video.create.mockResolvedValue({ id: "v1", title: "视频", circleId: "c1", videoUrl: "url", coverUrl: "cover", duration: 300 });
      const result = await svc.create("u1", { circleId: "c1", title: "视频", videoUrl: "url", coverUrl: "cover", duration: 300 });
      expect(result.duration).toBe(300);
    });
  });

  describe("update", () => {
    it("更新视频成功", async () => {
      mockPrisma.video.update.mockResolvedValue({ id: "v1", title: "新标题" });
      const result = await svc.update("v1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });

    it("更新封面成功", async () => {
      mockPrisma.video.update.mockResolvedValue({ id: "v1", coverUrl: "new-cover.jpg" });
      const result = await svc.update("v1", { coverUrl: "new-cover.jpg" });
      expect(result.coverUrl).toBe("new-cover.jpg");
    });

    it("更新状态成功", async () => {
      mockPrisma.video.update.mockResolvedValue({ id: "v1", status: "PUBLISHED" });
      const result = await svc.update("v1", { status: "PUBLISHED" });
      expect(result.status).toBe("PUBLISHED");
    });
  });

  describe("delete", () => {
    it("删除视频成功", async () => {
      mockPrisma.video.delete.mockResolvedValue({});
      const result = await svc.delete("v1");
      expect(result.success).toBe(true);
    });
  });

  describe("list", () => {
    it("列出视频（默认参数）", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      const result = await svc.list({});
      expect(result).toHaveProperty("videos");
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("按 circleId 和 status 过滤", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ circleId: "c1", status: "PUBLISHED" });
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { circleId: "c1", status: "PUBLISHED" } }),
      );
    });

    it("未指定 status 时默认 PUBLISHED", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({});
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED" } }),
      );
    });

    it("支持分页参数", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ page: 2, pageSize: 10 });
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("getDetail", () => {
    it("获取视频详情成功", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        id: "v1", title: "视频", user: {}, circle: {}, products: [],
      });
      mockPrisma.video.update.mockResolvedValue({});
      const result = await svc.getDetail("v1");
      expect(result.id).toBe("v1");
    });

    it("视频不存在抛出 NotFoundException", async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);
      await expect(svc.getDetail("invalid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("toggleLike", () => {
    it("点赞视频成功", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1", likeCount: 10 });
      mockPrisma.video.update.mockResolvedValue({ id: "v1", likeCount: 11 });
      const result = await svc.toggleLike("v1");
      expect(result.likeCount).toBe(11);
    });

    it("视频不存在抛出 NotFoundException", async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);
      await expect(svc.toggleLike("invalid")).rejects.toThrow(NotFoundException);
    });
  });
});
