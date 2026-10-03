import { CirclePostRewardNotificationTask } from "./circle-post-reward-notification.task";
import { PrismaService } from "../../../prisma/prisma.service";

describe("打赏通知调度边界", () => {
  it("慢数据库期间不叠加任务，结束后可再次恢复", async () => {
    let release!: (rows: Array<{ id: string }>) => void;
    const query = jest.fn().mockReturnValueOnce(new Promise(resolve => { release = resolve; })).mockResolvedValue([]);
    const task = new CirclePostRewardNotificationTask({ $queryRaw: query } as unknown as PrismaService);
    const first = task.tick(); await task.tick(); expect(query).toHaveBeenCalledTimes(1);
    release([]); await first; await task.tick(); expect(query).toHaveBeenCalledTimes(2);
  });

  it("失败释放运行标记，日志不输出用户、留言或底层SQL", async () => {
    const query = jest.fn().mockRejectedValueOnce(new Error("13800000000 私人留言 SQL user-secret")).mockResolvedValue([]);
    const task = new CirclePostRewardNotificationTask({ $queryRaw: query } as unknown as PrismaService);
    const logger = task as unknown as { logger: { warn: (text: string) => void } };
    const warn = jest.spyOn(logger.logger, "warn").mockImplementation(() => undefined);
    try {
      await task.tick(); await task.tick(); expect(query).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith("圈帖打赏站内通知写入失败，将在下次调度重试");
      expect(JSON.stringify(warn.mock.calls)).not.toMatch(/13800000000|私人留言|SQL|user-secret/);
    } finally { warn.mockRestore(); }
  });
});
