import { Test } from "@nestjs/testing";
import { ShareService } from "./share.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ShareService", () => {
  let svc: ShareService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      miniAppConfig: { findMany: jest.fn() },
      course: { findUnique: jest.fn() },
      article: { findUnique: jest.fn() },
      bountyQuestion: { findUnique: jest.fn() },
    };

    const mod = await Test.createTestingModule({
      providers: [
        ShareService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(ShareService);
  });

  describe("getShareConfig", () => {
    beforeEach(() => {
      prisma.miniAppConfig.findMany.mockResolvedValue([
        { appId: "wx123", type: "MAIN", isActive: true },
      ]);
    });

    it("课程分享配置", async () => {
      prisma.course.findUnique.mockResolvedValue({
        title: "论语精讲", cover: "/cover.jpg", intro: "一场关于论语的深度解读",
      });

      const result = await svc.getShareConfig("course", "c1");
      expect(result.title).toBe("论语精讲");
      expect(result.desc).toBe("一场关于论语的深度解读");
      expect(result.miniPath).toBe("/pages/course/detail?id=c1");
      expect(result.appId).toBe("wx123");
    });

    it("课程不存在返回默认配置", async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      const result = await svc.getShareConfig("course", "c99");
      expect(result.title).toBe("国学传统文化");
      expect(result.miniPath).toBe("/pages/index/index");
    });

    it("文章分享配置", async () => {
      prisma.article.findUnique.mockResolvedValue({
        title: "易经入门", cover: "/article.jpg", content: "《易经》是中国最古老的经典之一，被誉为群经之首...",
      });

      const result = await svc.getShareConfig("article", "a1");
      expect(result.title).toBe("易经入门");
      expect(result.desc).toContain("易经");
      expect(result.miniPath).toBe("/pages/article/detail?id=a1");
    });

    it("文章不存在返回默认配置", async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      const result = await svc.getShareConfig("article", "a99");
      expect(result.miniPath).toBe("/pages/index/index");
    });

    it("直播分享配置", async () => {
      const result = await svc.getShareConfig("live", "l1");
      expect(result.title).toBe("直播分享");
      expect(result.desc).toBe("精彩直播正在进行");
      expect(result.miniPath).toBe("/pages/live/room?id=l1");
    });

    it("悬赏分享配置", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({
        title: "急求八字解析", description: "请老师帮忙看看我的八字命盘",
      });

      const result = await svc.getShareConfig("bounty", "b1");
      expect(result.title).toBe("急求八字解析");
      expect(result.miniPath).toBe("/pages/bounty/detail?id=b1");
    });

    it("悬赏不存在返回默认配置", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue(null);

      const result = await svc.getShareConfig("bounty", "b99");
      expect(result.title).toBe("国学传统文化");
    });

    it("未知类型返回默认配置", async () => {
      const result = await svc.getShareConfig("unknown", "x1");
      expect(result.title).toBe("国学传统文化");
      expect(result.desc).toBe("传承千年智慧");
      expect(result.miniPath).toBe("/pages/index/index");
    });

    it("无小程序配置时appId为空", async () => {
      prisma.miniAppConfig.findMany.mockResolvedValue([]);

      const result = await svc.getShareConfig("live", "l1");
      expect(result.appId).toBeUndefined();
    });

    it("课程intro为空时desc使用title", async () => {
      prisma.course.findUnique.mockResolvedValue({
        title: "孟子导读", cover: null, intro: null,
      });

      const result = await svc.getShareConfig("course", "c2");
      expect(result.desc).toBe("孟子导读");
    });

    it("文章content为空时desc使用title", async () => {
      prisma.article.findUnique.mockResolvedValue({
        title: "短文章", cover: null, content: null,
      });

      const result = await svc.getShareConfig("article", "a2");
      expect(result.desc).toBe("短文章");
    });
  });
});
