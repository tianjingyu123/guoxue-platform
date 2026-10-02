import { CircleMembershipService } from "./circle-membership.service";
import type { PrismaService } from "../../../prisma/prisma.service";
import type { RedisService } from "../../../redis/redis.service";
import type { UnifiedPricingService } from "../../pricing/unified-pricing.service";
import type { CircleSharedService } from "./circle-shared.service";

describe("圈子到期提醒调度", () => {
  const service = () => new CircleMembershipService({} as PrismaService, {} as RedisService, {} as UnifiedPricingService, {} as CircleSharedService);
  afterEach(() => jest.restoreAllMocks());

  it("当前实例重复tick不会重叠，完成后恢复调度", async () => {
    const s = service(); let finish!: (value: number) => void;
    const run = jest.spyOn(s, "runExpirationReminders").mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(0);
    const first = s.sendExpirationReminders();
    await s.sendExpirationReminders(); expect(run).toHaveBeenCalledTimes(1);
    finish(1); await first;
    await s.sendExpirationReminders(); expect(run).toHaveBeenCalledTimes(2);
  });

  it("失败释放本实例标志，下次重试；日志不包含SQL或用户原文", async () => {
    const s = service(); const run = jest.spyOn(s, "runExpirationReminders").mockRejectedValueOnce(new Error("secret-user-sql")).mockResolvedValue(0);
    const warn = jest.spyOn((s as unknown as { logger: { warn: (value: string) => void } }).logger, "warn").mockImplementation(() => undefined);
    await expect(s.sendExpirationReminders()).resolves.toBeUndefined();
    await s.sendExpirationReminders(); expect(run).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-user-sql");
  });
});
