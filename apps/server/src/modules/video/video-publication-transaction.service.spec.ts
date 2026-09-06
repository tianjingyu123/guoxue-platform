import { randomUUID } from "node:crypto";
import { VideoPublicationTransactionService } from "./video-publication-transaction.service";

describe("短视频投稿与额度事务组合", () => {
  const input = { circleId: randomUUID(), userId: randomUUID(), videoId: randomUUID(), requestKey: randomUUID(), executor: "HUMAN" as const };
  const quota = { reserveInTransaction: jest.fn(), activateInTransaction: jest.fn(), settleInTransaction: jest.fn() };
  const repo = { lockScope: jest.fn() };
  const tx = { circle: { findUnique: jest.fn() }, video: { findUnique: jest.fn() } };
  const write = jest.fn();
  const service = new VideoPublicationTransactionService(quota as never, repo as never);
  const run = () => service.createInTransaction(tx as never, input, write);
  beforeEach(() => {
    jest.resetAllMocks();
    const id = randomUUID();
    tx.circle.findUnique.mockResolvedValue({ ownerId: input.userId });
    tx.video.findUnique.mockResolvedValue({ userId: input.userId, circleId: input.circleId });
    quota.reserveInTransaction.mockResolvedValue({ effect: "INSERT_HELD", reservation: { id, revision: 1, state: "HELD" } });
    quota.activateInTransaction.mockResolvedValue({ reservation: { id, revision: 2, state: "ACTIVE" } });
    quota.settleInTransaction.mockResolvedValue({ reservation: { id, revision: 3, state: "COMPLETED" } });
    write.mockResolvedValue({ id: input.videoId });
  });
  it("使用同一事务按锁圈、授权额度、写业务、核对记录、收尾顺序执行", async () => {
    await expect(run()).resolves.toEqual({ id: input.videoId });
    const order = [repo.lockScope, tx.circle.findUnique, quota.reserveInTransaction, quota.activateInTransaction,
      write, tx.video.findUnique, quota.settleInTransaction].map(fn => fn.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const fn of [quota.reserveInTransaction, quota.activateInTransaction, quota.settleInTransaction]) expect(fn.mock.calls[0][0]).toBe(tx);
    expect(quota.reserveInTransaction.mock.calls[0][1]).toMatchObject({ capability: "SHORT_VIDEO", subjectUserId: null, businessId: input.videoId, units: 1 });
  });
  it("非圈主使用本人直授主体，不冒用圈主额度", async () => {
    tx.circle.findUnique.mockResolvedValue({ ownerId: randomUUID() });
    await run();
    expect(quota.reserveInTransaction.mock.calls[0][1].subjectUserId).toBe(input.userId);
  });
  it("自动化在任何数据库操作前被拒绝", async () => {
    await expect(service.createInTransaction(tx as never, { ...input, executor: "AUTOMATION" }, write)).rejects.toThrow();
    expect(repo.lockScope).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it("撤权或额度不足不能留下业务写入", async () => {
    quota.reserveInTransaction.mockRejectedValue(new Error("SYNTHETIC_REVOKED"));
    await expect(run()).rejects.toThrow("SYNTHETIC_REVOKED");
    expect(write).not.toHaveBeenCalled(); expect(quota.settleInTransaction).not.toHaveBeenCalled();
  });
  it("重复请求不再次创建或调度", async () => {
    quota.reserveInTransaction.mockResolvedValue({ effect: "NONE" });
    await expect(run()).rejects.toThrow("已处理");
    expect(write).not.toHaveBeenCalled();
  });
  it("视频或审核台账失败传回事务调用方，不结算成功", async () => {
    write.mockRejectedValue(new Error("SYNTHETIC_AUDIT_FAILED"));
    await expect(run()).rejects.toThrow("SYNTHETIC_AUDIT_FAILED");
    expect(quota.settleInTransaction).not.toHaveBeenCalled();
  });
  it.each([null, { userId: "other", circleId: input.circleId }, { userId: input.userId, circleId: "other" }])("持久业务绑定错误必须回滚：%p", async stored => {
    tx.video.findUnique.mockResolvedValue(stored);
    await expect(run()).rejects.toThrow("BINDING_MISMATCH");
    expect(quota.settleInTransaction).not.toHaveBeenCalled();
  });
  it("额度收尾写入失败不返回投稿成功", async () => {
    quota.settleInTransaction.mockRejectedValue(new Error("SYNTHETIC_RECEIPT_FAILED"));
    await expect(run()).rejects.toThrow("SYNTHETIC_RECEIPT_FAILED");
  });
});
