import { SystemService } from "./system.service";

describe("SystemService 定时任务治理", () => {
  function setup(runExclusive?: jest.Mock) {
    const prisma = {
      operationLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const redis = {
      runExclusive:
        runExclusive ||
        jest.fn(async (_name: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
    };
    const scheduler = { getCronJobs: jest.fn().mockReturnValue(new Map()) };
    const service = new SystemService(
      prisma as any,
      redis as any,
      {} as any,
      {} as any,
      scheduler as any,
    );
    return { service, prisma, redis, scheduler };
  }

  it("手动任务经分布式锁执行并记录真实操作者", async () => {
    const { service, prisma, redis } = setup();
    jest.spyOn(service as any, "healthCheck").mockResolvedValue({ status: "ok" });

    const result = await service.executeCronJob("health_check", "admin-1");

    expect(redis.runExclusive).toHaveBeenCalledWith(
      "system-webhook-health_check",
      900,
      expect.any(Function),
    );
    expect(result).toMatchObject({ ok: true, job: "health_check" });
    expect(prisma.operationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "cron.health_check",
        detail: expect.objectContaining({ triggeredBy: "admin-1" }),
      }),
    });
  });

  it("任务正在其他节点运行时明确安全跳过", async () => {
    const runExclusive = jest.fn().mockResolvedValue(undefined);
    const { service, prisma } = setup(runExclusive);

    await expect(service.executeCronJob("daily_report", "admin-1")).resolves.toMatchObject({
      ok: false,
      skipped: true,
      job: "daily_report",
    });
    expect(prisma.operationLog.create).not.toHaveBeenCalled();
  });

  it("总览同时返回运行时任务、真实上次运行时间和受控手动任务", async () => {
    const { service, prisma, scheduler } = setup();
    scheduler.getCronJobs.mockReturnValue(
      new Map([
        [
          "named-runtime-job",
          {
            cronTime: { source: "*/5 * * * *" },
            nextDate: () => new Date("2026-08-31T12:05:00.000Z"),
            lastDate: () => new Date("2026-08-31T12:00:00.000Z"),
            running: false,
          },
        ],
      ]),
    );
    prisma.operationLog.findMany.mockResolvedValue([
      {
        action: "cron.daily_report",
        createdAt: new Date("2026-08-31T08:00:00.000Z"),
        detail: { duration: 1200 },
      },
    ]);

    const result = await service.getCronJobs();

    expect(result.registered[0]).toMatchObject({
      name: "named-runtime-job",
      lastRun: "2026-08-31T12:00:00.000Z",
    });
    expect(result.manual.find((item) => item.name === "daily_report")).toMatchObject({
      lastStatus: "success",
      durationMs: 1200,
    });
  });
});
