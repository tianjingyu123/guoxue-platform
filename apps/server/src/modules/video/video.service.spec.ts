import { Test } from "@nestjs/testing";
import { VideoService } from "./video.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VodService } from "./vod.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PUBLIC_QUARANTINED_IDS } from "../../common/public-content-quarantine";
import { VideoPublicationTransactionService } from "./video-publication-transaction.service";

const mockPrisma = {
  video: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  like: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
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
  configSystem: {
    findUnique: jest.fn().mockResolvedValue(null), // 官方圈未配置：circleId 缺省保持 undefined
  },
  follow: { findMany: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
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

const mockPublication = { createInTransaction: jest.fn() };

describe("VideoService", () => {
  let svc: VideoService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        VideoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VodService, useValue: mockVod },
        { provide: VideoPublicationTransactionService, useValue: mockPublication },
        {
          provide: AuditService,
          useValue: {
            moderateTextOrThrow: jest.fn().mockResolvedValue(undefined),
            // 默认按 CIRCLE_ONLY 直生效；分流逻辑本体在 audit.service.spec 覆盖
            resolveContentVisibility: jest.fn().mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "APPROVED" }),
            openContentAudit: jest.fn().mockResolvedValue(undefined),
            queueContentModeration: jest.fn(),
          },
        },
      ],
    }).compile();
    svc = mod.get(VideoService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPublication.createInTransaction.mockReset().mockImplementation((_tx, input, write) => write(input.videoId));
    mockPrisma.like.findMany.mockResolvedValue([]);
    mockPrisma.collect.findMany.mockResolvedValue([]);
    mockPrisma.follow.findMany.mockResolvedValue([]);
    mockPrisma.video.findMany.mockResolvedValue([]);
    mockPrisma.video.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.$transaction.mockImplementation(async (operation) => operation(mockPrisma));
  });

  describe("create", () => {
    it.each([undefined, "CIRCLE_ONLY", "PLATFORM", "SELF_ONLY"])("可见范围 %s 不能绕过投稿授权", async visibility => {
      mockPublication.createInTransaction.mockRejectedValue(new BusinessException(ErrorCode.FORBIDDEN, "未开通发布资格"));
      await expect(svc.create("u1", { circleId: "c1", visibility, videoUrl: "https://example.com/video.mp4" })).rejects.toThrow("未开通发布资格");
      expect(mockPublication.createInTransaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.video.create).not.toHaveBeenCalled();
    });
    it("真人平台管理员保留直接发布能力，不消耗圈子授权额度", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: "admin", status: "ACTIVE", deletedAt: null }])
        .mockResolvedValueOnce([{ roleType: "SUPER_ADMIN", bindId: null }]);
      mockPrisma.video.create.mockResolvedValue({ id: "admin-video" });
      await expect(svc.create("admin", { videoUrl: "https://example.com/video.mp4" }, true)).resolves.toMatchObject({ id: "admin-video" });
      expect(mockPublication.createInTransaction).not.toHaveBeenCalled();
    });
    it("自动化即使带管理员身份也不能创建视频", async () => {
      await expect(svc.create("admin", { videoUrl: "https://example.com/video.mp4" }, true, "AUTOMATION")).rejects.toThrow();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.video.create).not.toHaveBeenCalled();
    });
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
    it.each(["PUBLISHED", "PROCESSING", "AUDITING", "APPROVED", "REJECTED"])("作者编辑不能把状态设为%s", async status => {
      await expect(svc.update("u1", "v1", { status })).rejects.toThrow("恢复发布请通过审核流程");
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
    });
    it("作者可以隐藏，额外内部字段不能进入更新", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ userId: "u1" });
      mockPrisma.video.update.mockResolvedValue({ id: "v1", status: "HIDDEN" });
      await svc.update("u1", "v1", { status: "HIDDEN", auditStatus: "APPROVED", userId: "other" } as any);
      expect(mockPrisma.video.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { title: undefined, coverUrl: undefined, status: "HIDDEN" } });
    });
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

  describe("audit", () => {
    it("管理审核通过同时更新发布和审核状态，清除旧驳回原因", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1" });
      await svc.audit("v1", "approve");
      expect(mockPrisma.video.update).toHaveBeenCalledWith({ where: { id: "v1" },
        data: { status: "PUBLISHED", auditStatus: "APPROVED", auditReason: null } });
    });
    it("管理驳回同时关闭发布与审核状态", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1" });
      await svc.audit("v1", "reject", "需修改");
      expect(mockPrisma.video.update).toHaveBeenCalledWith({ where: { id: "v1" },
        data: { status: "REJECTED", auditStatus: "REJECTED", auditReason: "需修改" } });
    });
    it("非法审核动作不当成默认驳回", async () => {
      await expect(svc.audit("v1", "other" as any)).rejects.toThrow("不支持的审核动作");
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
    });
    it("不存在视频不更新审核状态", async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);
      await expect(svc.audit("missing", "approve")).rejects.toThrow("视频不存在");
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
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
      expect(mockPrisma.video.findMany.mock.calls.at(-1)![0].where.id).toEqual({
        notIn: [...PUBLIC_QUARANTINED_IDS.video],
      });
    });

    it("按 circleId 和 status 过滤（圈内列表排除机审降级 SELF_ONLY）", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ circleId: "c1", status: "PUBLISHED" });
      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            circleId: "c1",
            status: "PUBLISHED",
            visibility: { not: "SELF_ONLY" },
            id: { notIn: [...PUBLIC_QUARANTINED_IDS.video] },
          }),
        }),
      );
    });

    it("管理端 scope=all 保留隔离记录用于审核", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ scope: "all" });
      expect(mockPrisma.video.findMany.mock.calls.at(-1)![0].where.id).toBeUndefined();
    });
    it.each(["HIDDEN", "REJECTED", "AUDITING", "PROCESSING"])("普通列表不能用%s筛选读取非发布内容", async status => {
      mockPrisma.video.findMany.mockResolvedValue([]); mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ circleId: "c1", status });
      const where = mockPrisma.video.findMany.mock.calls.at(-1)![0].where;
      expect(where).toMatchObject({ status: "PUBLISHED", isPrivate: false, auditStatus: { not: "REJECTED" }, visibility: { not: "SELF_ONLY" } });
      expect(mockPrisma.video.count).toHaveBeenCalledWith({ where });
    });
    it("管理授权后的scope保留审核状态筛选", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]); mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ scope: "all", status: "REJECTED" });
      expect(mockPrisma.video.findMany.mock.calls.at(-1)![0].where).toEqual({ status: "REJECTED" });
    });
  });

  describe("短视频封面数据", () => {
    it("瀑布流返回 videoUrl，供无首图时提取第一帧", async () => {
      mockPrisma.video.findMany.mockResolvedValue([{
        id: "v1",
        title: "测试视频",
        coverUrl: "",
        videoUrl: "https:&#x2F;&#x2F;cdn.example.com&#x2F;video.mp4",
        duration: 8,
        user: { nickname: "作者", avatar: null },
        likeCount: 1,
        viewCount: 2,
        _count: { products: 0 },
      }]);

      const result = await svc.listItems(1, 10);

      expect(result[0]).toEqual(expect.objectContaining({
        coverUrl: "",
        videoUrl: "https://cdn.example.com/video.mp4",
      }));
    });

    it("搜索结果返回 videoUrl，保持搜索卡与发现页封面规则一致", async () => {
      mockPrisma.video.findMany.mockResolvedValue([{
        id: "v1",
        title: "测试视频",
        coverUrl: null,
        videoUrl: "https:&#x2F;&#x2F;cdn.example.com&#x2F;video.mp4",
        duration: 8,
        user: { nickname: "作者", avatar: null },
        viewCount: 2,
        categoryLevel1: "国学",
        createdAt: new Date(),
      }]);
      mockPrisma.video.count.mockResolvedValue(1);

      const result = await svc.searchVideos({ page: 1, pageSize: 10 });

      expect(result.items[0]).toEqual(expect.objectContaining({
        cover: null,
        videoUrl: "https://cdn.example.com/video.mp4",
      }));
    });
  });

  describe("getDetail", () => {
    it("同一账号发布被拒后仍可阅读，阅读不消耗或校验发布授权", async () => {
      mockPublication.createInTransaction.mockRejectedValue(new BusinessException(ErrorCode.FORBIDDEN, "未开通发布资格"));
      await expect(svc.create("ordinary-viewer", { circleId: "c1", visibility: "PLATFORM",
        videoUrl: "https://example.com/video.mp4" })).rejects.toThrow("未开通发布资格");
      expect(mockPrisma.video.create).not.toHaveBeenCalled();
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1", userId: "author", circleId: "c1",
        status: "PUBLISHED", visibility: "PLATFORM", auditStatus: "APPROVED", isPrivate: false });
      await expect(svc.getDetail("v1", "ordinary-viewer")).resolves.toMatchObject({ id: "v1" });
      await expect(svc.list({ circleId: "c1" })).resolves.toBeDefined();
      expect(mockPublication.createInTransaction).toHaveBeenCalledTimes(1);
    });
    it.each([undefined, "ordinary-viewer"])("发布授权不成为普通读者的详情门槛：%s", async viewerId => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1", userId: "author", circleId: "c1",
        status: "PUBLISHED", visibility: "CIRCLE_ONLY", auditStatus: "APPROVED", isPrivate: false });
      await expect(svc.getDetail("v1", viewerId)).resolves.toMatchObject({ id: "v1" });
    });
    it("获取视频详情成功", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({
        id: "v1", title: "视频", status: "PUBLISHED", visibility: "PLATFORM", auditStatus: "APPROVED", user: {}, circle: {}, products: [],
      });
      mockPrisma.video.update.mockResolvedValue({});
      const result = await svc.getDetail("v1");
      expect(result.id).toBe("v1");
    });

    it("视频不存在抛出 NotFoundException", async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);
      await expect(svc.getDetail("invalid")).rejects.toThrow(BusinessException);
    });

    it.each([
      { status: "HIDDEN" }, { status: "REJECTED" }, { status: "PROCESSING" },
      { status: "AUDITING" }, { isPrivate: true }, { visibility: "SELF_ONLY" }, { auditStatus: "REJECTED" },
    ])("直接详情也拒绝不可公开视频 %p，且不计播放量", async restricted => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1", userId: "owner", status: "PUBLISHED", ...restricted });
      await expect(svc.getDetail("v1", "other")).rejects.toThrow(BusinessException);
      await expect(svc.getDetail("v1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
      expect(mockPrisma.like.findMany).not.toHaveBeenCalled();
      await expect(svc.getDetail("v1", "owner")).resolves.toMatchObject({ id: "v1" });
    });

    it("公开详情读取后下架，下一次请求重新读库而非复用旧发布态", async () => {
      mockPrisma.video.findUnique.mockResolvedValueOnce({ id: "v1", userId: "owner", status: "PUBLISHED", visibility: "PLATFORM", auditStatus: "APPROVED" })
        .mockResolvedValueOnce({ id: "v1", userId: "owner", status: "HIDDEN" });
      await expect(svc.getDetail("v1")).resolves.toMatchObject({ id: "v1" });
      await expect(svc.getDetail("v1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.video.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.video.update).toHaveBeenCalledTimes(1);
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
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1" });
      mockPrisma.collect.findFirst.mockResolvedValue(null);
      mockPrisma.collect.create.mockResolvedValue({ id: "c1" });
      mockPrisma.video.update.mockResolvedValue({});
      const result = await svc.toggleCollect("u1", "v1");
      expect(result.collected).toBe(true);
    });

    it("已收藏时取消收藏", async () => {
      mockPrisma.video.findUnique.mockResolvedValue({ id: "v1" });
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
    it.each([undefined, null, "", " ", " f1", 123, {}])("无效媒资ID %p 不查询或修改任何视频", async fileId => {
      mockVod.parseEventNotification.mockReturnValue({ eventType: "TranscodeComplete", fileId });
      await svc.handleVodCallback({});
      expect(mockPrisma.video.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.video.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
    });
    it("处理转码完成回调", async () => {
      mockVod.parseEventNotification.mockReturnValue({
        eventType: "TranscodeComplete",
        fileId: "vod-file-1",
        status: "FINISH",
        playUrl: "https://play.example.com/v.mp4",
        coverUrl: "https://cover.example.com/c.jpg",
        duration: 300,
      });
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v1", videoUrl: "vod-file-1", status: "PROCESSING", auditStatus: "APPROVED" }]);
      mockPrisma.video.update.mockResolvedValue({});

      await svc.handleVodCallback({ EventType: "TranscodeComplete" });

      expect(mockPrisma.video.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "v1", status: "PROCESSING", auditStatus: "APPROVED", videoUrl: "vod-file-1" },
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
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v2", videoUrl: "vod-file-2", status: "PUBLISHED", auditStatus: "APPROVED" }]);
      mockPrisma.video.update.mockResolvedValue({});

      await svc.handleVodCallback({ EventType: "NewFileUpload" });

      expect(mockPrisma.video.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PROCESSING" }),
        }),
      );
    });

    it("回调解析失败不更新", async () => {
      mockVod.parseEventNotification.mockReturnValue(null);
      await svc.handleVodCallback({});
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
      expect(mockPrisma.video.updateMany).not.toHaveBeenCalled();
    });

    it.each(["HIDDEN", "REJECTED", "AUDITING"])("转码和上传回调不能恢复 %s 视频", async status => {
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v1", videoUrl: "f1", status, auditStatus: "APPROVED" }]);
      for (const eventType of ["TranscodeComplete", "NewFileUpload"]) {
        mockVod.parseEventNotification.mockReturnValue({ eventType, fileId: "f1" });
        await svc.handleVodCallback({});
      }
      expect(mockPrisma.video.updateMany).not.toHaveBeenCalled();
    });

    it.each(["PENDING", "REJECTED"])("转码不能绕过平台审核 %s", async auditStatus => {
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v1", videoUrl: "f1", status: "PROCESSING", auditStatus }]);
      mockVod.parseEventNotification.mockReturnValue({ eventType: "TranscodeComplete", fileId: "f1" });
      await svc.handleVodCallback({});
      expect(mockPrisma.video.updateMany).not.toHaveBeenCalled();
    });

    it("查找后并发下架使条件更新失败，不再无条件重试发布", async () => {
      mockPrisma.video.findMany.mockResolvedValue([{ id: "v1", videoUrl: "f1", status: "PROCESSING", auditStatus: "APPROVED" }]);
      mockPrisma.video.updateMany.mockResolvedValue({ count: 0 });
      mockVod.parseEventNotification.mockReturnValue({ eventType: "TranscodeComplete", fileId: "f1" });
      await svc.handleVodCallback({});
      expect(mockPrisma.video.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.video.update).not.toHaveBeenCalled();
      expect(mockPrisma.video.updateMany.mock.calls[0][0].where).toEqual({
        id: "v1", status: "PROCESSING", auditStatus: "APPROVED", videoUrl: "f1",
      });
    });
  });

  describe("searchVodMedia", () => {
    it("搜索媒资成功", async () => {
      mockVod.searchMedia.mockResolvedValue({ MediaInfoSet: [] });
      const result = await svc.searchVodMedia({ keyword: "国学" });
      expect(result.MediaInfoSet).toEqual([]);
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN 进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("list: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.video.count.mockResolvedValue(0);
      await svc.list({ page: "abc" as any, pageSize: "xyz" as any });
      const arg = mockPrisma.video.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
      expect(arg.take).toBe(20);
    });

    it("listCollected: 负数 page 归一化第1页·skip=0", async () => {
      mockPrisma.collect.findMany.mockResolvedValue([]);
      mockPrisma.collect.count.mockResolvedValue(0);
      await svc.listCollected("u1", -3 as any, 10);
      const arg = mockPrisma.collect.findMany.mock.calls.at(-1)![0];
      expect(arg.skip).toBe(0);
    });
  });
});
