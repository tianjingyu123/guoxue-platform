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
  setNX: jest.fn(),
  del: jest.fn(),
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
      mockRedis.setNX.mockResolvedValue(false);
      await svc.publishScheduled();
      expect(mockPrisma.content.updateMany).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("获取锁成功，无到期内容", async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockPrisma.content.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.article.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.post.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.course.updateMany.mockResolvedValue({ count: 0 });

      await svc.publishScheduled();

      expect(mockPrisma.content.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "PUBLISHED", scheduledAt: null } }),
      );
      expect(mockRedis.del).toHaveBeenCalledWith("cron:lock:publish_scheduled");
    });

    it("有到期内容时自动发布", async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockPrisma.content.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.article.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.post.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.course.updateMany.mockResolvedValue({ count: 0 });

      await svc.publishScheduled();

      expect(mockPrisma.content.updateMany).toHaveBeenCalled();
      expect(mockPrisma.article.updateMany).toHaveBeenCalled();
      expect(mockPrisma.post.updateMany).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("数据库异常时仍释放锁", async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockPrisma.content.updateMany.mockRejectedValue(new Error("DB down"));

      await svc.publishScheduled();

      expect(mockRedis.del).toHaveBeenCalledWith("cron:lock:publish_scheduled");
    });
  });
});
