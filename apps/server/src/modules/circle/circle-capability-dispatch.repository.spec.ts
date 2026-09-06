import { Prisma } from "@prisma/client";
import { CapabilityDispatchRecord, CircleCapabilityDispatchRepository } from "./circle-capability-dispatch.repository";
import { planCapabilityDispatch } from "./circle-capability-dispatch.policy";

describe("派发仓储参数化与条件更新", () => {
  const repo = new CircleCapabilityDispatchRepository();
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const now = new Date("2026-09-05T00:00:00Z");
  const row = (): CapabilityDispatchRecord => ({ id: id(1), reservationId: id(2), providerOperationKey: id(3),
    state: "READY", revision: 1, leaseToken: null, leaseUntil: null, dispatchedAt: null, resolvedAt: null,
    evidenceRef: null, createdAt: now, updatedAt: now });
  const input = () => ({ id: id(1), reservationId: id(2), providerOperationKey: id(3), expectedQuotaRevision: 1, now });
  const sql = (args: unknown[]) => Prisma.sql(args[0] as TemplateStringsArray, ...args.slice(1));
  let raw: jest.Mock, tx: Prisma.TransactionClient;
  beforeEach(() => { raw = jest.fn().mockResolvedValue([]); tx = { $queryRaw: raw } as unknown as Prisma.TransactionClient; });

  it("查询持行锁并参数化，不把输入拼进 SQL", async () => {
    const hostile = "x'; DROP TABLE x;--";
    await repo.byReservation(tx, hostile);
    const q = sql(raw.mock.calls[0]);
    expect(q.text).toContain("FOR UPDATE");
    expect(q.text).not.toContain(hostile); expect(q.values).toContain(hostile);
  });
  it("新建必须匹配未到期预留，零行返回失败", async () => {
    await expect(repo.insertReady(tx, input())).rejects.toThrow("DISPATCH_INSERT_FAILED");
    const q = sql(raw.mock.calls[0]);
    expect(q.text).toContain('q."state" = \'HELD\'');
    expect(q.text).toContain('q."revision" =');
    expect(q.text).toContain('q."holdUntil" >');
    expect(q.text).toContain("::timestamp(3)");
    expect(q.values).toContain(now.toISOString());
    raw.mockResolvedValueOnce([row()]);
    expect(await repo.insertReady(tx, input())).toEqual(row());
  });
  it("唯一约束异常向调用方传播，不尝试补建", async () => {
    const failure = new Error("SYNTHETIC_UNIQUE_CONSTRAINT"); raw.mockRejectedValueOnce(failure);
    await expect(repo.insertReady(tx, input())).rejects.toBe(failure);
    expect(raw).toHaveBeenCalledTimes(1);
  });
  it("回读白名单且拒绝多行和损坏状态", async () => {
    raw.mockResolvedValueOnce([{ ...row(), secret: "must-not-return" }]);
    expect(await repo.byReservation(tx, id(2))).toEqual(row());
    raw.mockResolvedValueOnce([row(), row()]);
    await expect(repo.byReservation(tx, id(2))).rejects.toThrow("DISPATCH_NON_UNIQUE_ROW");
    raw.mockResolvedValueOnce([{ ...row(), state: "DISPATCHING" }]);
    await expect(repo.byReservation(tx, id(2))).rejects.toThrow("DISPATCH_INVALID_STATE");
  });
  it("领取的条件更新绑定版本、旧状态和更新时间，失败不无条件重试", async () => {
    const action = { type: "CLAIM" as const, leaseToken: id(4), leaseUntil: new Date(now.getTime() + 10000), holdUntil: new Date(now.getTime() + 20000) };
    expect(await repo.transition(tx, row(), 1, now, action)).toBeNull();
    const q = sql(raw.mock.calls[0]);
    for (const field of ['"revision"', '"state"', '"updatedAt"', '"providerOperationKey"', '"reservationId"']) expect(q.text.split("WHERE")[1]).toContain(field);
    expect(q.text.split("WHERE")[0]).not.toContain('"providerOperationKey" =');
    expect(raw).toHaveBeenCalledTimes(1);
    const plan = planCapabilityDispatch(row(), 1, now, action);
    if (!plan.allowed) throw new Error(plan.reason);
    raw.mockResolvedValueOnce([{ ...row(), ...plan.next }]);
    expect(await repo.transition(tx, row(), 1, now, action)).toMatchObject({ state: "DISPATCHING", revision: 2 });
  });
  it("旧版本、倒退时间在写 SQL 前拒绝", async () => {
    await expect(repo.transition(tx, row(), 0, now, { type: "CANCEL_READY", evidenceRef: "cancel-1" })).rejects.toThrow();
    await expect(repo.transition(tx, row(), 1, new Date(now.getTime() - 1), { type: "CANCEL_READY", evidenceRef: "cancel-1" })).rejects.toThrow();
    expect(raw).not.toHaveBeenCalled();
  });
});
