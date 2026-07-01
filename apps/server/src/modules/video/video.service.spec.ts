import { Test } from "@nestjs/testing";
import { VideoService } from "./video.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VodService } from "./vod.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  video: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  like: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  collect: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  videoProduct: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockVod = {
  genUploadSignature: jest.fn(),
  genPlayerSignature: jest.fn(),
  pullUpload: jest.fn(),
  processMedia: jest.fn(),
  clipVideo: jest.fn(),
  getMediaInfo: jest.fn(),
  deleteMedia: jest.fn(),
  getDailyPlayStat: jest.fn(),
  getPlayStatSummary: jest.fn(),
  searchMedia: jest.fn(),
  parseEventNotification: jest.fn(),
};

describe("VideoService", () => {
  let svc: VideoService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        VideoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VodService, useValue: mockVod },
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined) } },
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
      mockPrisma.video.findUnique.mockResolvedValue({ userId: "u1" });
      mockPrisma.video.update.mockResolvedValue({ id: "v1", title: "新标题" });
      const result = await svc.update("u1", "v1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });

    it("更新封面成功", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ userId: "u1" });
      mockPrisma.video.update.mockResolvedValue({ id: "v1", coverUrl: "new-cover.jpg" });
      const result = await svc.update("u1", "v1", { coverUrl: "new-cover.jpg" });
      expect(result.coverUrl).toBe("new-cover.jpg");
    });
  });

  describe("delete", () => {
    it("删除视频成功", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ userId: "u1" });
      mockPrisma.video.delete.mockResolvedValue({});
      const result = await svc.delete("u1", "v1");
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
    });

    it("按 circleId 和 status 过滤", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ circleId: "c1", status: "PUBLISHED" });
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { circleId: "c1", status: "PUBLISHED" } }),
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
      await expect(svc.getDetail("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("toggleLike", () => {
    it("未点赞时点赞视频", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1", likeCount: 10 });
      mockPrisma.like.findUnique.mockResolvedValue(null);
      mockPrisma.like.create.mockResolvedValue({ id: "l1" });
      mockPrisma.video.update.mockResolvedValue({ id: "v1", likeCount: 11 });
      const result = await svc.toggleLike("u1", "v1");
      expect(result.liked).toBe(true);
      expect(mockPrisma.like.create).toHaveBeenCalledWith({
        data: { userId: "u1", targetType: "VIDEO", targetId: "v1" },
      });
      expect(mockPrisma.video.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { likeCount: { increment: 1 } } }),
      );
    });

    it("已点赞时取消点赞", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1", likeCount: 10 });
      mockPrisma.like.findUnique.mockResolvedValue({ id: "l1" });
      mockPrisma.like.delete.mockResolvedValue({});
      mockPrisma.video.update.mockResolvedValue({ id: "v1", likeCount: 9 });
      const result = await svc.toggleLike("u1", "v1");
      expect(result.liked).toBe(false);
      expect(mockPrisma.like.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
    });

    it("视频不存在抛出 BusinessException", async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);
      await expect(svc.toggleLike("u1", "invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("toggleCollect", () => {
    it("未收藏时收藏视频", async () => {
      mockPrisma.collect.findFirst.mockResolvedValue(null);
      mockPrisma.collect.create.mockResolvedValue({ id: "c1" });
      mockPrisma.video.update.mockResolvedValue({});
      const result = await svc.toggleCollect("u1", "v1");
      expect(result.collected).toBe(true);
    });

    it("已收藏时取消收藏", async () => {
      mockPrisma.collect.findFirst.mockResolvedValue({ id: "c1" });
      mockPrisma.collect.delete.mockResolvedValue({});
      mockPrisma.video.update.mockResolvedValue({});
      const result = await svc.toggleCollect("u1", "v1");
      expect(result.collected).toBe(false);
    });
  });

  // ═══════════════════ VOD 增强 ═══════════════════

  describe("getUploadSignature", () => {
    it("获取上传签名", () => {
      mockVod.genUploadSignature.mockReturnValue({ signature: "sig123", expiredTime: 9999 });
      const result = svc.getUploadSignature({ videoName: "test.mp4" });
      expect(result.signature).toBe("sig123");
      expect(mockVod.genUploadSignature).toHaveBeenCalledWith({ videoName: "test.mp4" });
    });

    it("无参数获取上传签名", () => {
      mockVod.genUploadSignature.mockReturnValue({ signature: "sig", expiredTime: 7200 });
      const result = svc.getUploadSignature();
      expect(result.signature).toBe("sig");
    });
  });

  describe("getPlaySignature", () => {
    it("获取播放签名", async () => {
      mockVod.genPlayerSignature.mockResolvedValue({ fileId: "f1", psign: "ps", expireTime: 3600000 });
      const result = await svc.getPlaySignature("f1", 3600);
      expect(result.psign).toBe("ps");
    });
  });

  describe("pullUpload", () => {
    it("URL拉取上传成功", async () => {
      mockVod.pullUpload.mockResolvedValue({ TaskId: "t1" });
      const result = await svc.pullUpload([{ url: "https://example.com/v.mp4" }]);
      expect(result.TaskId).toBe("t1");
    });
  });

  describe("processMedia", () => {
    it("转码处理成功", async () => {
      mockVod.processMedia.mockResolvedValue({ TaskId: "proc1" });
      const result = await svc.processMedia("f1", { transcodeDefinitions: [10, 20, 30] });
      expect(result.TaskId).toBe("proc1");
    });

    it("带水印和自适应码流", async () => {
      mockVod.processMedia.mockResolvedValue({ TaskId: "proc2" });
      const result = await svc.processMedia("f1", {
        transcodeDefinitions: [10, 20, 30],
        watermarkDefinition: 100,
        adaptiveDefinition: 200,
      });
      expect(mockVod.processMedia).toHaveBeenCalledWith("f1", expect.objectContaining({
        watermarkDefinition: 100,
        adaptiveDynamicStreamingDefinition: 200,
      }));
      expect(result.TaskId).toBe("proc2");
    });
  });

  describe("clipVideo", () => {
    it("视频剪辑成功", async () => {
      mockVod.clipVideo.mockResolvedValue({ TaskId: "clip1" });
      const result = await svc.clipVideo({ fileId: "f1", startTimeOffset: 10, endTimeOffset: 60, clipName: "精彩片段" });
      expect(result.TaskId).toBe("clip1");
    });
  });

  describe("getMediaInfo", () => {
    it("获取媒资信息成功", async () => {
      mockVod.getMediaInfo.mockResolvedValue({ MediaInfoSet: [{ BasicInfo: { Name: "test" } }] });
      const result = await svc.getMediaInfo("f1");
      expect(result.MediaInfoSet).toHaveLength(1);
    });
  });

  describe("deleteMedia", () => {
    it("删除媒资成功", async () => {
      mockVod.deleteMedia.mockResolvedValue({});
      const result = await svc.deleteMedia("f1");
      expect(result).toBeDefined();
    });
  });

  describe("getPlaybackStats", () => {
    it("获取播放统计成功", async () => {
      mockVod.getDailyPlayStat.mockResolvedValue({ PlayStatFileSet: [] });
      const result = await svc.getPlaybackStats("f1", "2026-05-01", "2026-05-10");
      expect(result.PlayStatFileSet).toEqual([]);
    });
  });

  describe("handleVodCallback", () => {
    it("处理转码完成回调", async () => {
      mockVod.parseEventNotification.mockReturnValue({
        eventType: "TranscodeComplete",
        fileId: "vod-file-1",
        status: "FINISH",
        playUrl: "https://play.example.com/v.mp4",
        coverUrl: "https://cover.example.com/c.jpg",
        duration: 300,
      });
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v1", videoUrl: "vod-file-1" }]);
      mockPrisma.video.update.mockResolvedValue({});

      await svc.handleVodCallback({ EventType: "TranscodeComplete" });

      expect(mockPrisma.video.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "v1" },
          data: expect.objectContaining({
            videoUrl: "https://play.example.com/v.mp4",
            coverUrl: "https://cover.example.com/c.jpg",
            duration: 300,
            status: "PUBLISHED",
          }),
        }),
      );
    });

    it("处理新文件上传回调", async () => {
      mockVod.parseEventNotification.mockReturnValue({
        eventType: "NewFileUpload",
        fileId: "vod-file-2",
        status: "SUCCESS",
      });
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v2", videoUrl: "vod-file-2" }]);
      mockPrisma.video.update.mockResolvedValue({});

      await svc.handleVodCallback({ EventType: "NewFileUpload" });

      expect(mockPrisma.video.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PROCESSING" }),
        }),
      );
    });

    it("回调解析失败不更新", async () => {
      mockVod.parseEventNotification.mockReturnValue(null);
      await svc.handleVodCallback({});
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
    });
  });

  describe("searchVodMedia", () => {
    it("搜索媒资成功", async () => {
      mockVod.searchMedia.mockResolvedValue({ MediaInfoSet: [] });
      const result = await svc.searchVodMedia({ keyword: "国学" });
      expect(result.MediaInfoSet).toEqual([]);
    });
  });
});
