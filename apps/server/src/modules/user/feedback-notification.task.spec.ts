import { FeedbackNotificationTask } from "./feedback-notification.task";
import { PrismaService } from "../../prisma/prisma.service";
import { encodeFeedbackReply, publicFeedbackReply } from "./feedback-reply";

describe("工单通知调度与公开回复", () => {
  it("失败后的下一次调度恢复，且日志不带原错误中的敏感信息", async () => {
    const query = jest.fn().mockRejectedValueOnce(new Error("synthetic-sensitive-phone"))
      .mockResolvedValueOnce([{ id: "notice" }]);
    const task = new FeedbackNotificationTask({ $queryRaw: query } as unknown as PrismaService);
    const warn = jest.spyOn((task as unknown as { logger: { warn: (msg: string) => void } }).logger, "warn").mockImplementation();
    await task.tick();
    await task.tick();
    expect(query).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.flat().join(" ")).not.toContain("synthetic-sensitive-phone");
  });

  it("本进程未完成的调度不重复启动，完成后释放", async () => {
    let finish!: (result: []) => void;
    const query = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce([]);
    const task = new FeedbackNotificationTask({ $queryRaw: query } as unknown as PrismaService);
    const first = task.tick();
    await task.tick();
    expect(query).toHaveBeenCalledTimes(1);
    finish([]);
    await first;
    await task.tick();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("新回复不展示内部事件，兼容旧公开回复，普通内部备注不公开", () => {
    const result = encodeFeedbackReply("  已处理  ", true);
    expect(publicFeedbackReply(result)).toBe("已处理");
    expect(publicFeedbackReply("[public-reply:v1]\n旧回复")).toBe("旧回复");
    expect(publicFeedbackReply("内部备注")).toBeNull();
    expect(publicFeedbackReply("[public-reply:v2:伪标记]\n内部备注")).toBeNull();
    expect(publicFeedbackReply(null)).toBeNull();
  });

  it("每次重新结案事件不同，存储长度不超过既有约束", () => {
    expect(encodeFeedbackReply("相同回复", true)).not.toBe(encodeFeedbackReply("相同回复", true));
    const result = encodeFeedbackReply("长".repeat(1200), true);
    expect(result.length).toBe(1000);
    expect(publicFeedbackReply(result)!.length).toBeLessThan(1000);
  });
});
