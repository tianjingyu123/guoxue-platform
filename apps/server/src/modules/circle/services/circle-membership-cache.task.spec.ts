import {
  CircleMembershipCacheTask,
  clearCircleMembershipCaches,
} from "./circle-membership-cache.task";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { Test } from "@nestjs/testing";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { CircleModule } from "../circle.module";

describe("圈子成员缓存恢复调度", () => {
  it("真实CircleModule包含缓存恢复任务", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CircleModule)).toContain(
      CircleMembershipCacheTask,
    );
  });
  it("实际Nest调度每分钟执行并在关闭时释放", async () => {
    const mod = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        CircleMembershipCacheTask,
        { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([]) } },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();
    try {
      await mod.init();
      expect(
        mod.get(SchedulerRegistry).getCronJob("circle_membership_cache_restore").cronTime.source,
      ).toBe("*/1 * * * *");
    } finally {
      await mod.close();
    }
  });
  const create = () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ id: "synthetic", circleId: "circle", userId: "user" }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const redis = { clearCircleMembershipShared: jest.fn().mockResolvedValue(undefined) };
    const restore = () =>
      clearCircleMembershipCaches(
        prisma as unknown as PrismaService,
        redis as unknown as RedisService,
      );
    const task = new CircleMembershipCacheTask(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
    return { prisma, redis, task, restore };
  };
  it("无待办不访问Redis", async () => {
    const { prisma, redis, restore } = create();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await restore()).toBe(0);
    expect(redis.clearCircleMembershipShared).not.toHaveBeenCalled();
  });
  it("共享清理失败不确认，下次调度可以恢复", async () => {
    const { prisma, redis, task } = create();
    redis.clearCircleMembershipShared.mockRejectedValueOnce(new Error("synthetic failure"));
    await task.tick();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    await task.tick();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });
  it("确认失败保留待办，重复清理可以再次确认", async () => {
    const { prisma, redis, restore } = create();
    prisma.$executeRaw.mockRejectedValueOnce(new Error("synthetic ack failure"));
    expect(await restore()).toBe(0);
    expect(await restore()).toBe(1);
    expect(redis.clearCircleMembershipShared).toHaveBeenCalledTimes(2);
  });
  it("读取失败释放执行标志", async () => {
    const { prisma, task } = create();
    prisma.$queryRaw.mockRejectedValueOnce(new Error("synthetic read failure"));
    await task.tick();
    await task.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it("本进程调度不重叠，完成后可再调度", async () => {
    const { prisma, task } = create();
    let done!: (rows: []) => void;
    prisma.$queryRaw.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const first = task.tick();
    await task.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    done([]);
    await first;
    await task.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
