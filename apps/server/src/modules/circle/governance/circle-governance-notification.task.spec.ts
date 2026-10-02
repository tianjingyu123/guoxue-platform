import { Test } from "@nestjs/testing";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { CircleModule } from "../circle.module";
import { PrismaService } from "../../../prisma/prisma.service";
import { CircleGovernanceNotificationTask } from "./circle-governance-notification.task";

describe("圈子治理通知真实模块与恢复调度", () => {
  it("真实CircleModule注册恢复任务", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CircleModule)).toContain(
      CircleGovernanceNotificationTask,
    );
  });
  it("Nest运行时注册每分钟任务并在关闭时释放", async () => {
    const mod = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        CircleGovernanceNotificationTask,
        { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    try {
      await mod.init();
      expect(
        mod.get(SchedulerRegistry).getCronJob("circle_governance_notice_restore").cronTime.source,
      ).toBe("*/1 * * * *");
    } finally {
      await mod.close();
    }
  });
  it("通知数据库失败不会阻止下次调度重试", async () => {
    const query = jest.fn().mockRejectedValueOnce(new Error("合成故障")).mockResolvedValue([]);
    const task = new CircleGovernanceNotificationTask({
      $queryRaw: query,
    } as unknown as PrismaService);
    await expect(task.tick()).resolves.toBeUndefined();
    await task.tick();
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("同进程重入不会并发重复消费，完成后解除保护", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((r) => {
      release = r;
    });
    const query = jest.fn(async () => {
      await waiting;
      return [];
    });
    const task = new CircleGovernanceNotificationTask({
      $queryRaw: query,
    } as unknown as PrismaService);
    const first = task.tick();
    await task.tick();
    expect(query).toHaveBeenCalledTimes(1);
    release();
    await first;
    await task.tick();
    expect(query).toHaveBeenCalledTimes(2);
  });
});
