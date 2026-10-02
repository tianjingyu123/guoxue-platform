import { MemberGrantService } from "./member-grant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberBenefitService } from "./member-benefit.service";
import { SCHEDULE_CRON_OPTIONS } from "@nestjs/schedule/dist/schedule.constants";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { Test } from "@nestjs/testing";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { MemberModule } from "./member.module";

describe("当前月权益自动恢复调度", () => {
  const clock = (day = 2, hour = 12) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, day, hour));
  };
  const create = () => {
    const prisma = { user: { findMany: jest.fn().mockResolvedValue([]) } };
    const benefit = { grantMonthlyBenefits: jest.fn().mockResolvedValue(true) };
    const redis = {
      runExclusive: jest.fn(async (_key: string, _ttl: number, work: () => Promise<unknown>) =>
        work(),
      ),
    };
    const service = new MemberGrantService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      benefit as unknown as MemberBenefitService,
    );
    return { service, prisma, benefit, redis };
  };
  afterEach(() => jest.useRealTimers());
  it("生产MemberModule注册服务，Nest启动实际发现命名恢复任务", async () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, MemberModule)).toContain(
      MemberGrantService,
    );
    const { service } = create();
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [{ provide: MemberGrantService, useValue: service }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      expect(app.get(SchedulerRegistry).getCronJob("member_monthly_restore").cronTime.source).toBe(
        "0 0 */6 * * *",
      );
    } finally {
      await app.close();
    }
  });
  it("保留月初九点调度并注册每六小时恢复，不定义历史补发入口", () => {
    const { service } = create();
    expect(Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, service.monthlyGrantCron).cronTime).toBe(
      "0 0 9 1 * *",
    );
    expect(
      Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, service.monthlyGrantRecoveryCron),
    ).toMatchObject({ cronTime: "0 0 */6 * * *", name: "member_monthly_restore" });
  });
  it.each([0, 6, 8])("月初%s点恢复不能提前发下一月份", async (hour) => {
    clock(1, hour);
    const { service, redis, prisma } = create();
    await service.monthlyGrantRecoveryCron();
    expect(redis.runExclusive).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it("月初九点开始，两类任务共用共享critical锁", async () => {
    clock(1, 9);
    const { service, redis } = create();
    await service.monthlyGrantCron();
    await service.monthlyGrantRecoveryCron();
    expect(redis.runExclusive).toHaveBeenCalledTimes(2);
    expect(redis.runExclusive).toHaveBeenCalledWith(
      "member-monthly-grant",
      600,
      expect.any(Function),
      { critical: true },
    );
  });
  it("共享锁失败不降为本机发放，释放标记后可恢复", async () => {
    clock();
    const { service, redis, prisma } = create();
    redis.runExclusive.mockRejectedValueOnce(new Error("synthetic Redis unavailable"));
    await service.monthlyGrantRecoveryCron();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    await service.monthlyGrantRecoveryCron();
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });
  it("原任务与恢复在本进程不能重叠，结束后允许继续", async () => {
    clock();
    const { service, redis } = create();
    let complete!: () => void;
    redis.runExclusive.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const first = service.monthlyGrantCron();
    await service.monthlyGrantRecoveryCron();
    expect(redis.runExclusive).toHaveBeenCalledTimes(1);
    complete();
    await first;
    await service.monthlyGrantRecoveryCron();
    expect(redis.runExclusive).toHaveBeenCalledTimes(2);
  });
  it("成员扫描跨月后旧批次停止，不调用下一月发放", async () => {
    clock(31, 23);
    const { service, prisma, benefit } = create();
    prisma.user.findMany.mockImplementationOnce(async () => {
      jest.setSystemTime(new Date(2026, 10, 1, 0));
      return [{ id: "synthetic", memberLevel: "MONTHLY" }];
    });
    expect(await service.runMonthlyGrant()).toEqual({ granted: 0, skipped: 0 });
    expect(benefit.grantMonthlyBenefits).not.toHaveBeenCalled();
  });
  it.each([0, 12])("获取共享锁跨月到下一月%s点，旧调度不发新月权益", async (hour) => {
    clock(31, 23);
    const { service, prisma, redis } = create();
    redis.runExclusive.mockImplementationOnce(async (_key, _ttl, work) => {
      jest.setSystemTime(new Date(2026, 10, 1, hour));
      return work();
    });
    await service.monthlyGrantRecoveryCron();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it("只传当月幂等源，一个成员失败不影响其余成员", async () => {
    clock();
    const { service, prisma, benefit } = create();
    prisma.user.findMany.mockResolvedValueOnce([
      { id: "synthetic-failed", memberLevel: "MONTHLY" },
      { id: "synthetic-good", memberLevel: "MONTHLY" },
    ]);
    benefit.grantMonthlyBenefits.mockRejectedValueOnce(new Error("synthetic failure"));
    expect(await service.runMonthlyGrant()).toEqual({ granted: 1, skipped: 1 });
    expect(benefit.grantMonthlyBenefits).toHaveBeenNthCalledWith(
      2,
      "synthetic-good",
      "MONTHLY",
      undefined,
      "member_monthly_202610",
    );
  });
});
