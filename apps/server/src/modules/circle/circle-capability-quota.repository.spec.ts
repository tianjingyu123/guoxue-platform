import { Prisma } from "@prisma/client";
import { CircleCapabilityQuotaRepository } from "./circle-capability-quota.repository";
import { quotaActive, quotaHeld, quotaId as id, quotaLater as later, quotaNow as now } from "../../../test/fixtures/circle-capability-quota";

describe("额度账本参数化仓储（不代替 PostgreSQL 并发）", () => {
  const repo = new CircleCapabilityQuotaRepository();
  const row = () => { const r = quotaHeld(); const { binding, ...rest } = r; return { ...rest, ...binding }; };
  const sql = (args: unknown[]) => Array.isArray(args[0]) ? Prisma.sql(args[0] as unknown as TemplateStringsArray, ...args.slice(1)) : args[0] as Prisma.Sql;
  let raw: jest.Mock, execute: jest.Mock, tx: Prisma.TransactionClient;
  beforeEach(() => { raw = jest.fn().mockResolvedValue([]); execute = jest.fn().mockResolvedValue(1); tx = { $queryRaw: raw, $executeRaw: execute } as unknown as Prisma.TransactionClient; });

  it("收尾锁与授权仓储使用相同键且不读取 void", async () => {
    await repo.lockScope(tx, id(1)); expect(sql(execute.mock.calls[0]).values).toEqual([`circle-capability:${id(1)}`]);
    expect(sql(execute.mock.calls[0]).text).toContain("pg_advisory_xact_lock"); expect(raw).not.toHaveBeenCalled();
  });
  it("三个唯一查询均参数化，不带圈子过滤绕开全局业务唯一", async () => {
    const hostile = "x'; DELETE FROM x;--";
    expect(await repo.byId(tx, hostile)).toBeNull(); expect(await repo.byRequest(tx, hostile)).toBeNull();
    expect(await repo.byBusiness(tx, "LIVE_SESSION", hostile)).toBeNull();
    for (const call of raw.mock.calls) { expect(sql(call).text).not.toContain(hostile); expect(sql(call).values).toContain(hostile); }
    expect(sql(raw.mock.calls[2]).text).not.toContain('"circleId"');
  });
  it("回读只返回账本字段，不泄露额外业务字段", async () => {
    raw.mockResolvedValueOnce([{ ...row(), privatePayload: "not-in-result" }]);
    expect(await repo.byId(tx, id(20))).toEqual(quotaHeld());
  });
  it.each([{ units: 2 }, { state: "ACTIVE" }, { holdUntil: now }, { providerGrantId: id(11) }])("损坏行拒绝 %#", async change => {
    raw.mockResolvedValueOnce([{ ...row(), ...change }]); await expect(repo.byId(tx, id(20))).rejects.toThrow("QUOTA_INVALID_STORED_ROW");
  });
  it("返回多行不任取一条", async () => {
    raw.mockResolvedValueOnce([row(), row()]); await expect(repo.byId(tx, id(20))).rejects.toThrow("QUOTA_NON_UNIQUE_ROW");
  });
  it("预留只插入 HELD/1，缺返回记录即失败", async () => {
    await expect(repo.insert(tx, quotaHeld())).rejects.toThrow("QUOTA_INSERT_FAILED");
    expect(sql(raw.mock.calls[0]).text).toContain("1, 'HELD'");
    raw.mockResolvedValueOnce([row()]); expect(await repo.insert(tx, quotaHeld())).toEqual(quotaHeld());
    await expect(repo.insert(tx, quotaActive())).rejects.toThrow("QUOTA_INVALID_INSERT");
  });
  it("CAS 同时匹配版本与状态，且只更新生命周期", async () => {
    const r = quotaHeld(), next = quotaActive(r); expect(await repo.compareAndSet(tx, r, next)).toBeNull();
    const query = sql(raw.mock.calls[0]); expect(query.text).toContain('AND "revision" ='); expect(query.text).toContain('AND "state" =');
    expect(query.text.split("WHERE")[0]).not.toContain('"circleGrantId"'); expect(query.values.slice(-3)).toEqual([r.id, 1, "HELD"]);
    const { binding, ...rest } = next; raw.mockResolvedValueOnce([{ ...rest, ...binding }]);
    expect(await repo.compareAndSet(tx, r, next)).toEqual(next);
  });
  it.each(["circleGrantId", "ownerId", "holdUntil", "binding"] as const)("CAS 不能修改不可变字段 %s", async key => {
    const r = quotaHeld(), next = quotaActive(r);
    if (key === "binding") next.binding = { ...next.binding, businessId: id(99) };
    else if (key === "holdUntil") next.holdUntil = later(59);
    else next[key] = id(99);
    await expect(repo.compareAndSet(tx, r, next)).rejects.toThrow("QUOTA_IMMUTABLE_BINDING_CHANGED"); expect(raw).not.toHaveBeenCalled();
  });
  it("圈级/个人计数按稳定顺序由主库聚合，过期判断只用于 HELD", async () => {
    raw.mockResolvedValue([{ committed: 3n, held: 1n, active: 1n, invalid: 0n }]);
    expect(await repo.usage(tx, [id(11), id(10)], now)).toEqual([id(10), id(11)].map(grantId => ({ grantId, committed: 3, held: 1, active: 1 })));
    const query = sql(raw.mock.calls[0]); expect(query.values.slice(-2)).toEqual([id(10), id(10)]);
    expect(query.text).toContain("'ACTIVE', 'COMPLETED'"); expect(query.text).toContain('IS NOT TRUE');
    expect(query.text).toContain('"units" = 1'); expect(query.text).toContain('"updatedAt" <=');
    expect(query.text).not.toContain('SELECT *');
  });
  it.each([[], [id(10), id(10)], [id(10), id(11), id(12)], ["bad"]].map(ids => ({ ids })))("无效聚合范围不查询 %#", async ({ ids }) => {
    await expect(repo.usage(tx, ids, now)).rejects.toThrow("QUOTA_INVALID_USAGE_REQUEST"); expect(raw).not.toHaveBeenCalled();
  });
  it.each([{ committed: -1n }, { held: 9007199254740992n }, { active: 1 }, { invalid: 1n }])("坏计数/损坏账本不放行 %#", async change => {
    raw.mockResolvedValueOnce([{ committed: 0n, held: 0n, active: 0n, invalid: 0n, ...change }]);
    await expect(repo.usage(tx, [id(10)], now)).rejects.toThrow();
  });
  it("聚合结果缺失即失败，不能当作零用量", async () => {
    await expect(repo.usage(tx, [id(10)], now)).rejects.toThrow("QUOTA_INVALID_USAGE_ROWS");
  });
  it("回执读取绑定业务，缺失/损坏不会生成猜测结果", async () => {
    expect(await repo.receipt(tx, id(30))).toBeNull();
    const r = quotaHeld(); raw.mockResolvedValueOnce([{ reservationId: r.id, operationKey: id(6), action: "RESERVE", appliedRevision: 1, source: "USER", actorId: id(2), evidenceRef: null, afterSnapshot: r }]);
    expect(await repo.receipt(tx, id(6))).toMatchObject({ action: "RESERVE", binding: r.binding });
    raw.mockResolvedValueOnce([{ reservationId: id(99), appliedRevision: 1, action: "RESERVE", afterSnapshot: r }]);
    await expect(repo.receipt(tx, id(6))).rejects.toThrow("QUOTA_INVALID_RECEIPT");
  });
  it("初次回执与更新回执同事务写入且只保留白名单快照", async () => {
    const r = Object.assign(quotaHeld(), { privatePayload: "not-in-audit" });
    await repo.writeReceipt(tx, id(6), "RESERVE", { source: "USER", actorId: id(2), evidenceRef: null }, null, r);
    expect(JSON.stringify(sql(execute.mock.calls[0]).values)).not.toContain("not-in-audit");
    const next = quotaActive(r); await repo.writeReceipt(tx, id(30), "ACTIVATE", { source: "USER", actorId: id(2), evidenceRef: null }, r, next);
    expect(sql(execute.mock.calls[1]).values).toContain("ACTIVATE");
    execute.mockResolvedValueOnce(0);
    await expect(repo.writeReceipt(tx, id(30), "ACTIVATE", { source: "USER", actorId: id(2), evidenceRef: null }, r, next)).rejects.toThrow("QUOTA_RECEIPT_WRITE_FAILED");
  });
  it("收尾证据引用不得包含 URL/签名/请求正文，回执不能跨版本", async () => {
    const r = quotaHeld();
    await expect(repo.writeReceipt(tx, id(6), "RESERVE", { source: "BUSINESS_ADAPTER", actorId: null, evidenceRef: "https://secret.example/?sign=x" }, null, r)).rejects.toThrow("QUOTA_INVALID_RECEIPT_INPUT");
    await expect(repo.writeReceipt(tx, id(30), "COMPLETE", { source: "USER", actorId: id(2), evidenceRef: null }, r, quotaActive(r))).rejects.toThrow("QUOTA_RECEIPT_TRANSITION_MISMATCH");
    expect(execute).not.toHaveBeenCalled();
  });
});
