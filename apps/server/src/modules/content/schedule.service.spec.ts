import { Test } from "@nestjs/testing";
import { ScheduleService } from "./schedule.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  content: { updateMany: jest.fn() },
  article: { updateMany: jest.fn() },
  post: { updateMany: jest.fn() },
  course: { updateMany: jest.fn() },
};

const mockRedis = {
  // 直通执行：默认视为抢锁成功
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

describe("ScheduleService", () => {
  let svc: ScheduleService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(ScheduleService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("publishScheduled", () => {
    it("获取锁失败则跳过", async () => {
      mockRedis.runExclusive.mockImplementationOnce(async () => undefined);
      await svc.publishScheduled();
      expect(mockPrisma.content.updateMany).not.toHaveBeenCalled();
    });

    it("获取锁成功，无到期内容", async () => {
      mockPrisma.content.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.article.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.post.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.course.updateMany.mockResolvedValue({ count: 0 });

      await svc.publishScheduled();

      expect(mockPrisma.content.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "PUBLISHED", scheduledAt: null } }),
      );
      expect(mockRedis.runExclusive).toHaveBeenCalledWith(
        "content_publish_scheduled",
        600,
        expect.any(Function),
      );
    });

    it("有到期内容时自动发布", async () => {
      mockPrisma.content.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.article.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.post.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.course.updateMany.mockResolvedValue({ count: 0 });

      await svc.publishScheduled();

      expect(mockPrisma.content.updateMany).toHaveBeenCalled();
      expect(mockPrisma.article.updateMany).toHaveBeenCalled();
      expect(mockPrisma.post.updateMany).toHaveBeenCalled();
    });

    it("数据库异常时不抛出", async () => {
      mockPrisma.content.updateMany.mockRejectedValue(new Error("DB down"));

      await expect(svc.publishScheduled()).resolves.not.toThrow();
    });
  });
});
