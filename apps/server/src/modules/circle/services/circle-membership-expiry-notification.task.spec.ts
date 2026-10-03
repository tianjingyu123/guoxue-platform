import { Test } from "@nestjs/testing";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { CircleModule } from "../circle.module";
import { CircleMembershipExpiryNotificationTask } from "./circle-membership-expiry-notification.task";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

describe("到期恢复任务的运行模块与调度注册", () => {
  it("真实CircleModule包含恢复任务提供者", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CircleModule)).toContain(CircleMembershipExpiryNotificationTask);
  });
  it("Nest启动后注册每分钟任务，应用关闭释放调度", async () => {
    const mod = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [CircleMembershipExpiryNotificationTask,
        { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([]) } },
        { provide: RedisService, useValue: { delByPattern: jest.fn(), del: jest.fn() } }],
    }).compile();
    try {
      await mod.init();
      const job = mod.get(SchedulerRegistry).getCronJob("circle_membership_expiry_notice_restore");
      expect(job.cronTime.source).toBe("*/1 * * * *");
    } finally { await mod.close(); }
  });
});
