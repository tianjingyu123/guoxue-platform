import { MemberGrantService } from "./member-grant.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";
import type { MemberBenefitService } from "./member-benefit.service";

describe("会员续费提醒失败恢复", () => {
  const create = () => {
    const prisma = {
      $queryRaw: jest.fn(),
      user: { findMany: jest.fn().mockResolvedValue([{ id: "synthetic", memberExpire: new Date(Date.now() - 1000) }]) },
      notification: { create: jest.fn() },
    };
    const redis = { setNX: jest.fn().mockResolvedValueOnce(true).mockResolvedValue(false), runExclusive: jest.fn() };
    const service = new MemberGrantService(prisma as unknown as PrismaService, redis as unknown as RedisService, {} as MemberBenefitService);
    return { prisma, redis, service };
  };

  it("数据库失败不伪报发送成功，下一次可以补发且不留下 Redis 占位", async () => {
    const { prisma, redis, service } = create();
    prisma.$queryRaw.mockRejectedValueOnce(new Error("synthetic insert failure")).mockResolvedValue([{ id: "notice" }]);
    prisma.notification.create.mockRejectedValueOnce(new Error("synthetic insert failure"));
    await expect(service.runAutoRenewRemind()).rejects.toThrow("synthetic insert failure");
    expect(await service.runAutoRenewRemind()).toBe(1);
    expect(redis.setNX).not.toHaveBeenCalled();
  });

  it("只按实际插入数量计数，已发送记录不再次计为成功", async () => {
    const { prisma, service } = create();
    prisma.$queryRaw.mockResolvedValueOnce([{ id: "one" }, { id: "two" }]).mockResolvedValue([]);
    expect(await service.runAutoRenewRemind()).toBe(2);
    expect(await service.runAutoRenewRemind()).toBe(0);
  });

  it("调度失败释放执行标志，后续调度仍执行", async () => {
    const { prisma, redis, service } = create();
    prisma.$queryRaw.mockRejectedValueOnce(new Error("synthetic failure")).mockResolvedValue([]);
    await service.autoRenewRemindCron();
    await service.autoRenewRemindCron();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(redis.runExclusive).not.toHaveBeenCalled();
  });

  it("本进程调度不重叠，完成后恢复执行", async () => {
    const { prisma, service } = create();
    let complete!: (rows: { id: string }[]) => void;
    prisma.$queryRaw.mockReturnValueOnce(new Promise(resolve => { complete = resolve; })).mockResolvedValue([]);
    const first = service.autoRenewRemindCron();
    await service.autoRenewRemindCron();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    complete([]);
    await first;
    await service.autoRenewRemindCron();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
