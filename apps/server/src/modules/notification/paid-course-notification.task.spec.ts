import { Test } from "@nestjs/testing";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { SCHEDULE_CRON_OPTIONS } from "@nestjs/schedule/dist/schedule.constants";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationModule } from "./notification.module";
import { PaidCourseNotificationTask } from "./paid-course-notification.task";

describe("付费课程开通通知生产调度注册", () => {
  const fixture = () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const service = new PaidCourseNotificationTask(prisma as unknown as PrismaService);
    return { prisma, service };
  };
  it("通知模块注册任务，Nest实际发现每分钟调度", async () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, NotificationModule)).toContain(
      PaidCourseNotificationTask,
    );
    const { service } = fixture();
    expect(Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, service.tick).cronTime).toBe("*/1 * * * *");
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [{ provide: PaidCourseNotificationTask, useValue: service }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      expect(
        [...app.get(SchedulerRegistry).getCronJobs().values()].some(
          (job) => job.cronTime.source === "*/1 * * * *",
        ),
      ).toBe(true);
    } finally {
      await app.close();
    }
  });
  it("本进程不能重叠，完成后允许下次调度", async () => {
    const { service, prisma } = fixture();
    let release!: (rows: []) => void;
    prisma.$queryRaw.mockReturnValueOnce(
      new Promise<[]>((resolve) => {
        release = resolve;
      }),
    );
    const first = service.tick();
    await service.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    release([]);
    await first;
    await service.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it("调度失败不阻断调用，并释放本机运行标记", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockRejectedValueOnce(new Error("合成通知失败"));
    await expect(service.tick()).resolves.toBeUndefined();
    await service.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
