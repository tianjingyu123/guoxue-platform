import { Prisma } from "@prisma/client";
import { CircleCapabilityService } from "./circle-capability.service";
import { CircleCapabilityQuotaService } from "./circle-capability-quota.service";
import { CircleCapabilityQuotaRepository, QuotaAuditActor, QuotaReceiptRow } from "./circle-capability-quota.repository";
import { QuotaAction, QuotaReservation, quotaContribution } from "./circle-capability-quota.policy";
import { CircleCapability } from "./circle-capability.policy";
import { quotaFixture, quotaClone as clone, quotaId as id, quotaLater as later, quotaNow as now } from "../../../test/fixtures/circle-capability-quota";

function harness(cap: CircleCapability = "LIVE") {
  const fixture = quotaFixture(cap), rows = new Map<string, QuotaReservation>(), receipts = new Map<string, QuotaReceiptRow>();
  const tx = {} as Prisma.TransactionClient;
  const calls: string[] = [];
  const capabilities = { assertAuthorizationInTransaction: jest.fn(async (client, _circle, _cap, actor) => {
    expect(client).toBe(tx); calls.push("authorization-lock");
    return { circleGrant: fixture.authorization.circleGrant!, providerGrant: fixture.authorization.providerGrant, checkedAt: new Date(),
      authorization: { ...clone(fixture.authorization), actor: { ...fixture.authorization.actor, userId: actor.userId } } };
  }) };
  const repo = {
    lockScope: jest.fn(async client => { expect(client).toBe(tx); calls.push("scope-lock"); }),
    byId: jest.fn(async (_tx, key) => clone(rows.get(key) ?? null)),
    byRequest: jest.fn(async (_tx, key) => { calls.push("read-request"); return clone([...rows.values()].find(r => r.binding.requestKey === key) ?? null); }),
    byBusiness: jest.fn(async (_tx, type, key) => clone([...rows.values()].find(r => r.binding.businessType === type && r.binding.businessId === key) ?? null)),
    receipt: jest.fn(async (_tx, key) => clone(receipts.get(key) ?? null)),
    usage: jest.fn(async (client, grantIds: string[], time: Date) => {
      expect(client).toBe(tx); calls.push("usage");
      return grantIds.map(grantId => {
        const total = { grantId, committed: 0, held: 0, active: 0 };
        for (const r of rows.values()) if (r.circleGrantId === grantId || r.providerGrantId === grantId) {
          const contribution = quotaContribution(r, time); if (!contribution.allowed) throw new Error(contribution.reason);
          total.committed += contribution.committed; total.held += contribution.held; total.active += contribution.active;
        }
        return total;
      });
    }),
    insert: jest.fn(async (client, r: QuotaReservation) => { expect(client).toBe(tx); calls.push("insert"); rows.set(r.id, clone(r)); return clone(r); }),
    compareAndSet: jest.fn(async (client, prev: QuotaReservation, next: QuotaReservation) => {
      expect(client).toBe(tx); const current = rows.get(prev.id);
      if (!current || current.revision !== prev.revision || current.state !== prev.state) return null;
      calls.push("cas"); rows.set(next.id, clone(next)); return clone(next);
    }),
    writeReceipt: jest.fn(async (client, key: string, action: QuotaAction | "RESERVE", actor: QuotaAuditActor, _prev, next: QuotaReservation) => {
      expect(client).toBe(tx); calls.push("receipt-write");
      if (receipts.has(key)) throw new Error("UNIQUE_RECEIPT");
      receipts.set(key, { reservationId: next.id, operationKey: key, action, binding: clone(next.binding), appliedRevision: next.revision, ...actor });
    }),
  };
  const service = new CircleCapabilityQuotaService(capabilities as unknown as CircleCapabilityService, repo as unknown as CircleCapabilityQuotaRepository);
  const actor = { userId: fixture.binding.actorId, executor: "HUMAN" as const };
  const transaction = async <T>(fn: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
    const before = clone(rows), previousReceipts = clone(receipts);
    try { return await fn(tx); } catch (error) {
      rows.clear(); for (const [key, value] of before) rows.set(key, value);
      receipts.clear(); for (const [key, value] of previousReceipts) receipts.set(key, value);
      throw error;
    }
  };
  const reserve = () => transaction(client => service.reserveInTransaction(client, fixture.binding, actor));
  const startInput = (r: QuotaReservation) => ({ reservationId: r.id, binding: r.binding, operationKey: id(30), expectedRevision: r.revision });
  return { fixture, rows, receipts, calls, tx, capabilities, repo, service, actor, transaction, reserve, startInput };
}

describe("额度账本事务编排（模拟事务，不冒充实际并发）", () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => { jest.useFakeTimers().setSystemTime(now); h = harness(); });
  afterEach(() => jest.useRealTimers());

  it.each(["LIVE", "SHORT_VIDEO", "AUDIO_QUESTION", "VIDEO_QUESTION"] as CircleCapability[])("%s 使用调用方同一事务预留并写初始回执", async cap => {
    h = harness(cap); const result = await h.reserve();
    expect(result).toMatchObject({ effect: "INSERT_HELD", reservation: { state: "HELD", revision: 1 } });
    expect(h.rows.size).toBe(1); expect(h.receipts.get(id(6))).toMatchObject({ action: "RESERVE", appliedRevision: 1, source: "USER", actorId: h.actor.userId });
    expect(h.calls).toEqual(["authorization-lock", "read-request", "usage", "insert", "receipt-write"]);
    expect(h.repo.usage.mock.calls[0][1]).toHaveLength(cap.includes("QUESTION") ? 2 : 1);
  });
  it("重复预留不再计算或扣额度，也不重写回执", async () => {
    const first = await h.reserve(); const second = await h.reserve();
    expect(second).toMatchObject({ effect: "NONE", reservation: { id: first.reservation.id } });
    expect(h.repo.insert).toHaveBeenCalledTimes(1); expect(h.repo.usage).toHaveBeenCalledTimes(1); expect(h.repo.writeReceipt).toHaveBeenCalledTimes(1);
  });
  it("同一业务换 key 或同 key 换业务冲突，不多占额度", async () => {
    await h.reserve(); h.fixture.binding.requestKey = id(90);
    await expect(h.reserve()).rejects.toMatchObject({ status: 409 });
    h.fixture.binding.requestKey = id(6); h.fixture.binding.businessId = id(91);
    await expect(h.reserve()).rejects.toMatchObject({ status: 409 }); expect(h.rows.size).toBe(1);
  });
  it("账本存在但初始审计缺失停止，不能装作正常幂等", async () => {
    await h.reserve(); h.receipts.clear(); await expect(h.reserve()).rejects.toThrow("QUOTA_INITIAL_RECEIPT_MISSING");
    expect(h.repo.insert).toHaveBeenCalledTimes(1);
  });
  it("初始回执写入失败撤回本次预留", async () => {
    h.repo.writeReceipt.mockRejectedValueOnce(new Error("AUDIT_FAILED"));
    await expect(h.reserve()).rejects.toThrow("AUDIT_FAILED"); expect(h.rows.size).toBe(0); expect(h.receipts.size).toBe(0);
  });
  it("调用方后续业务写入失败也撤回额度和回执，没有独立提交", async () => {
    await expect(h.transaction(async client => { await h.service.reserveInTransaction(client, h.fixture.binding, h.actor); throw new Error("BUSINESS_WRITE_FAILED"); })).rejects.toThrow("BUSINESS_WRITE_FAILED");
    expect(h.rows.size).toBe(0); expect(h.receipts.size).toBe(0);
  });
  it("自动化及伪造发起人进入事务操作前拒绝", async () => {
    await expect(h.service.reserveInTransaction(h.tx, h.fixture.binding, { ...h.actor, executor: "AUTOMATION" })).rejects.toMatchObject({ status: 403 });
    await expect(h.service.reserveInTransaction(h.tx, h.fixture.binding, { ...h.actor, userId: id(99) })).rejects.toMatchObject({ status: 400 });
    expect(h.capabilities.assertAuthorizationInTransaction).not.toHaveBeenCalled(); expect(h.rows.size).toBe(0);
  });
  it("累计或并发不足不插入记录", async () => {
    h.repo.usage.mockResolvedValueOnce([{ grantId: id(10), committed: 10, held: 0, active: 0 }]);
    await expect(h.reserve()).rejects.toMatchObject({ status: 403 });
    h.repo.usage.mockResolvedValueOnce([{ grantId: id(10), committed: 0, held: 2, active: 0 }]);
    await expect(h.reserve()).rejects.toMatchObject({ status: 403 }); expect(h.repo.insert).not.toHaveBeenCalled();
  });
  it("操作重试只回读一次结果；撤权之后不再次核权或重新启动", async () => {
    const held = (await h.reserve()).reservation; jest.setSystemTime(later(1)); const input = h.startInput(held);
    const result = await h.transaction(client => h.service.activateInTransaction(client, input, h.actor));
    expect(result).toMatchObject({ effect: "UPDATE", reservation: { state: "ACTIVE", revision: 2 } });
    h.capabilities.assertAuthorizationInTransaction.mockRejectedValueOnce(new Error("REVOKED"));
    const replay = await h.transaction(client => h.service.activateInTransaction(client, input, h.actor));
    expect(replay).toMatchObject({ effect: "NONE", reservation: { state: "ACTIVE" } });
    expect(h.repo.compareAndSet).toHaveBeenCalledTimes(1); expect(h.capabilities.assertAuthorizationInTransaction).toHaveBeenCalledTimes(2);
  });
  it("等待取锁后按最新时间拒绝到期预留", async () => {
    const r = (await h.reserve()).reservation;
    h.repo.lockScope.mockImplementationOnce(async () => { jest.setSystemTime(later(60)); });
    await expect(h.transaction(client => h.service.activateInTransaction(client, h.startInput(r), h.actor))).rejects.toMatchObject({ status: 409 });
    expect(h.rows.get(r.id)!.state).toBe("HELD"); expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });
  it("撤权或授权修订变化不激活已有预留", async () => {
    const r = (await h.reserve()).reservation; h.fixture.authorization.circleGrant!.revision++;
    await expect(h.transaction(client => h.service.activateInTransaction(client, h.startInput(r), h.actor))).rejects.toMatchObject({ status: 409 });
    h.fixture.authorization.circleGrant!.state = "REVOKED";
    await expect(h.transaction(client => h.service.activateInTransaction(client, h.startInput(r), h.actor))).rejects.toMatchObject({ status: 403 });
    expect(h.rows.get(r.id)!.state).toBe("HELD");
  });
  it("CAS 竞争失败不写成功回执", async () => {
    const r = (await h.reserve()).reservation; h.repo.compareAndSet.mockResolvedValueOnce(null);
    await expect(h.transaction(client => h.service.activateInTransaction(client, h.startInput(r), h.actor))).rejects.toMatchObject({ status: 409 });
    expect(h.receipts.size).toBe(1); expect(h.rows.get(r.id)!.state).toBe("HELD");
  });
  it("激活回执失败撤回状态变更", async () => {
    const r = (await h.reserve()).reservation; h.repo.writeReceipt.mockRejectedValueOnce(new Error("AUDIT_FAILED"));
    await expect(h.transaction(client => h.service.activateInTransaction(client, h.startInput(r), h.actor))).rejects.toThrow("AUDIT_FAILED");
    expect(h.rows.get(r.id)).toMatchObject({ state: "HELD", revision: 1 }); expect(h.receipts.size).toBe(1);
  });
  it("可信业务完成不再受当前授权限制，重复同证据只回读", async () => {
    const held = (await h.reserve()).reservation; jest.setSystemTime(later(1));
    const current = (await h.transaction(client => h.service.activateInTransaction(client, h.startInput(held), h.actor))).reservation;
    h.capabilities.assertAuthorizationInTransaction.mockRejectedValue(new Error("REVOKED")); jest.setSystemTime(later(2));
    const input = { ...h.startInput(current), operationKey: id(31), action: "COMPLETE" as const, evidenceRef: "event:trusted-1" };
    const end = await h.transaction(client => h.service.settleInTransaction(client, input));
    expect(end).toMatchObject({ effect: "UPDATE", reservation: { state: "COMPLETED", revision: 3 } });
    expect(quotaContribution(end.reservation, later(2))).toEqual({ allowed: true, held: 0, committed: 1, active: 0 });
    expect(await h.transaction(client => h.service.settleInTransaction(client, input))).toMatchObject({ effect: "NONE" });
    await expect(h.transaction(client => h.service.settleInTransaction(client, { ...input, evidenceRef: "event:another" }))).rejects.toMatchObject({ status: 409 });
  });
  it.each(["RELEASE", "EXPIRE"] as const)("未开始的 %s 留证据且不需要可用账号", async action => {
    const r = (await h.reserve()).reservation; jest.setSystemTime(later(action === "EXPIRE" ? 60 : 1));
    h.capabilities.assertAuthorizationInTransaction.mockRejectedValue(new Error("ACCOUNT_DISABLED"));
    const result = await h.transaction(client => h.service.settleInTransaction(client, { ...h.startInput(r), action, evidenceRef: "event:cleanup" }));
    expect(result).toMatchObject({ effect: "UPDATE", reservation: { state: action === "EXPIRE" ? "EXPIRED" : "RELEASED" } });
    expect(h.receipts.get(id(30))).toMatchObject({ source: "BUSINESS_ADAPTER", actorId: null, evidenceRef: "event:cleanup" });
  });
  it("已开始不能按 TTL 回收，操作证据不接受原始 URL", async () => {
    const r = (await h.reserve()).reservation;
    const current = (await h.transaction(client => h.service.activateInTransaction(client, h.startInput(r), h.actor))).reservation;
    jest.setSystemTime(later(3600));
    await expect(h.transaction(client => h.service.settleInTransaction(client, { ...h.startInput(current), operationKey: id(31), action: "EXPIRE", evidenceRef: "event:cleanup" }))).rejects.toMatchObject({ status: 409 });
    await expect(h.transaction(client => h.service.settleInTransaction(client, { ...h.startInput(current), operationKey: id(31), action: "COMPLETE", evidenceRef: "https://private.example/sign" }))).rejects.toMatchObject({ status: 400 });
    expect(h.rows.get(r.id)!.state).toBe("ACTIVE");
  });
  it("预留操作键不能挪作激活键，不存在记录返回404", async () => {
    const r = (await h.reserve()).reservation;
    await expect(h.transaction(client => h.service.activateInTransaction(client, { ...h.startInput(r), operationKey: id(6) }, h.actor))).rejects.toMatchObject({ status: 409 });
    await expect(h.transaction(client => h.service.activateInTransaction(client, { ...h.startInput(r), reservationId: id(99) }, h.actor))).rejects.toMatchObject({ status: 404 });
  });
});
