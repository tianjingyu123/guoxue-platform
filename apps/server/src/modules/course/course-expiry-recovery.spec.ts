import { Test } from "@nestjs/testing";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { CourseModule } from "./course.module";
import { CourseSchedulerService } from "./course-scheduler.service";

describe("课程到期提醒当天恢复调度", () => {
  it("实际课程模块注册服务，Nest保留9点首轮并发现5次当天恢复", async () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CourseModule)).toContain(
      CourseSchedulerService,
    );
    const service = new CourseSchedulerService({} as never, {} as never);
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [{ provide: CourseSchedulerService, useValue: service }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const expressions = [...app.get(SchedulerRegistry).getCronJobs().values()].map(
        (x) => x.cronTime.source,
      );
      expect(expressions).toContain("0 9 * * *");
      expect(expressions).toContain("0 10,12,15,18,21 * * *");
    } finally {
      await app.close();
    }
  });
  it("恢复入口复用原分布式锁和收件人事件键的处理函数", async () => {
    const locked = jest.fn(async (_key: string, _ttl: number, run: () => Promise<void>) => run());
    const prisma = { course: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new CourseSchedulerService(
      prisma as never,
      { runExclusive: locked } as never,
      {} as never,
    );
    await service.retryExpiringCourses();
    expect(locked).toHaveBeenCalledWith("course_check_expiring_courses", 600, expect.any(Function));
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });
});
