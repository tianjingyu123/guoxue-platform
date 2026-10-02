import { EntitlementNotificationTask } from "./entitlement-notification.task";
import { EntitlementController } from "../entitlement/entitlement.controller";
import type { EntitlementService } from "../entitlement/entitlement.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { Request } from "express";

describe("独立权益到账站内通知", () => {
  it("管理员入口在同一份发放输入中记录操作者与持久事件标记", async () => {
    const grant = jest.fn().mockResolvedValue({ id: "balance" });
    const controller = new EntitlementController({ grant } as unknown as EntitlementService);
    await controller.grant({ userId: "recipient", entitlementKey: "quota.report", kind: "QUOTA", quantity: 2, idempotencyKey: "admin-test" }, { user: { id: "operator" } } as unknown as Request);
    expect(grant).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "ADMIN", sourceId: "operator",
      metadata: { operatorId: "operator", notificationEvent: "ENTITLEMENT_GRANTED_V1" },
    }));
  });

  it("发放失败直接保持失败，不在控制器另发通知", async () => {
    const grant = jest.fn().mockRejectedValue(new Error("transaction rollback"));
    const controller = new EntitlementController({ grant } as unknown as EntitlementService);
    await expect(controller.grant({ userId: "u", entitlementKey: "quota.report", kind: "QUOTA", idempotencyKey: "k" }, { user: { id: "operator" } } as unknown as Request)).rejects.toThrow("transaction rollback");
    expect(grant).toHaveBeenCalledTimes(1);
  });

  it("写入失败释放进程内执行标志，下次调度继续尝试", async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValueOnce(new Error("db failure")).mockResolvedValue([]) };
    const task = new EntitlementNotificationTask(prisma as unknown as PrismaService);
    await task.tick();
    await task.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("本进程调度不重叠，执行完毕后可以再次处理", async () => {
    let complete!: (rows: { id: string }[]) => void;
    const prisma = { $queryRaw: jest.fn().mockReturnValueOnce(new Promise(resolve => { complete = resolve; })).mockResolvedValue([]) };
    const task = new EntitlementNotificationTask(prisma as unknown as PrismaService);
    const first = task.tick();
    await task.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    complete([]);
    await first;
    await task.tick();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
