import { Prisma } from "@prisma/client";
import { CircleCapabilityRepository, CapabilityGrantRow } from "./circle-capability.repository";

/** 只验证参数化 SQL 和失败语义；不伪装为真实 PostgreSQL 并发测试。 */
describe("圈内能力事务仓储", () => {
  const repo = new CircleCapabilityRepository();
  const now = new Date("2026-09-05T00:00:00Z");
  const grant: CapabilityGrantRow = { id: "grant", circleId: "circle", ownerId: "owner", applicantId: "owner",
    subjectUserId: null, subjectKey: "circle", capability: "LIVE", sequence: 1, policyRevision: 1, revision: 1,
    state: "PENDING", enabled: false, expiresAt: null, maxUnits: null, maxConcurrent: null,
    eligibilitySnapshot: {}, createdAt: now, updatedAt: now };
  const sql = (args: unknown[]) => {
    const first = args[0] as Prisma.Sql | TemplateStringsArray;
    return Array.isArray(first) ? Prisma.sql(first as unknown as TemplateStringsArray, ...args.slice(1)) : first as Prisma.Sql;
  };
  let raw: jest.Mock, execute: jest.Mock, tx: Prisma.TransactionClient;
  beforeEach(() => {
    raw = jest.fn().mockResolvedValue([]); execute = jest.fn().mockResolvedValue(1);
    tx = { $queryRaw: raw, $executeRaw: execute } as unknown as Prisma.TransactionClient;
  });

  it("事务锁使用 execute，不尝试反序列化 void；先配置后圈子行锁", async () => {
    const hostile = "circle'); DROP TABLE x; --";
    await repo.lockCircle(tx, hostile);
    const lock = sql(execute.mock.calls[0]);
    expect(lock.text).toContain("pg_advisory_xact_lock"); expect(lock.text).not.toContain(hostile);
    expect(lock.values).toEqual([`circle-capability:${hostile}`]);
    expect(sql(raw.mock.calls[0]).text).toContain('FROM "ConfigSystem"');
    expect(sql(raw.mock.calls[1]).text).toContain('FROM "Circle"');
    expect(raw.mock.calls.every(c => sql(c).text.includes("FOR SHARE"))).toBe(true);
    expect(execute.mock.invocationCallOrder[0]).toBeLessThan(raw.mock.invocationCallOrder[0]);
  });

  it("账号、成员、角色锁按稳定顺序且用户去重", async () => {
    await repo.lockPeople(tx, "circle", "b", ["c", "a", "b"]);
    expect(sql(raw.mock.calls[0]).values).toEqual(["a", "b", "c"]);
    expect(sql(raw.mock.calls[1]).values).toEqual(["circle", "a", "b", "c"]);
    expect(sql(raw.mock.calls[2]).values).toEqual(["b"]);
    expect(raw.mock.calls.every(c => sql(c).text.includes('ORDER BY "id" FOR SHARE'))).toBe(true);
  });
  it("明确返回实际锁定范围，包括未锁定空记录", async () => {
    expect(await repo.lockCircle(tx, "circle")).toEqual({ circleId: null, configId: null });
    raw.mockResolvedValueOnce([{ id: "config" }]).mockResolvedValueOnce([{ id: "circle" }]);
    expect(await repo.lockCircle(tx, "circle")).toEqual({ circleId: "circle", configId: "config" });
    raw.mockResolvedValueOnce([{ id: "owner" }]).mockResolvedValueOnce([{ id: "member" }]).mockResolvedValueOnce([]);
    expect(await repo.lockPeople(tx, "circle", "owner", [])).toEqual({ userIds: ["owner"], memberIds: ["member"], roleIds: [] });
  });

  it.each([null, "guest"])("按能力及圈级/服务者独立读取最新申请：%s", async subject => {
    raw.mockResolvedValueOnce([grant]);
    expect(await repo.latest(tx, "circle", "AUDIO_QUESTION", subject)).toEqual(grant);
    const query = sql(raw.mock.calls[0]);
    expect(query.values).toEqual(["circle", "AUDIO_QUESTION", subject === null ? "circle" : "user:guest"]);
    expect(query.text).toContain('ORDER BY "sequence" DESC LIMIT 1');
  });

  it("不存在的申请返回 null", async () => {
    expect(await repo.byId(tx, "missing")).toBeNull();
    expect(sql(raw.mock.calls[0]).values).toEqual(["missing"]);
  });

  it("普通申请保留待审、禁用及来源参数，事实 JSON 不拼接", async () => {
    raw.mockResolvedValueOnce([grant]);
    const facts = { note: "'); DROP TABLE x; --" };
    expect(await repo.create(tx, grant, 1, facts, now)).toEqual(grant);
    const query = sql(raw.mock.calls[0]);
    expect(query.text).toContain('"source"'); expect(query.values).toContain("CIRCLE_APPLICATION");
    expect(query.values).toContain("PENDING"); expect(query.values).toContain(false);
    expect(query.text).not.toContain(facts.note);
    expect(query.values).toContain(JSON.stringify(facts));
  });

  it.each([{ rows: [] }, { rows: [grant, grant] }])("插入返回非唯一记录即失败：%#", async ({ rows }) => {
    raw.mockResolvedValueOnce(rows);
    await expect(repo.create(tx, grant, 1, {}, now)).rejects.toThrow("CAPABILITY_INSERT_FAILED");
  });

  it("CAS 同时匹配 id、版本和原状态，零行不能宣称成功", async () => {
    expect(await repo.compareAndSet(tx, grant, { ...grant, revision: 2, state: "REJECTED" }, now)).toBeNull();
    const query = sql(raw.mock.calls[0]);
    expect(query.text).toContain('WHERE "id" ='); expect(query.text).toContain('AND "revision" =');
    expect(query.text).toContain('AND "state" =');
    expect(query.values.slice(-3)).toEqual(["grant", 1, "PENDING"]);
  });

  it("CAS 唯一更新返回新记录", async () => {
    const next = { ...grant, revision: 2, state: "REJECTED" as const };
    raw.mockResolvedValueOnce([next]); expect(await repo.compareAndSet(tx, grant, next, now)).toEqual(next);
  });

  it("审计快照白名单不复制资格明细，理由保持参数化", async () => {
    const reason = "'); DELETE FROM users; --";
    const previous = { ...grant, eligibilitySnapshot: { privateMarker: "not-for-audit" } };
    await repo.audit(tx, "reviewer", "REJECT", reason, previous, { ...grant, revision: 2 }, now);
    const query = sql(execute.mock.calls[0]);
    expect(query.text).not.toContain(reason); expect(query.values).toContain(reason);
    expect(JSON.stringify(query.values)).not.toContain("privateMarker");
    const snapshots = query.values.filter(v => typeof v === "string" && v.startsWith('{"id"')) as string[];
    expect(snapshots).toHaveLength(2); expect(JSON.parse(snapshots[1]).revision).toBe(2);
  });

  it.each([0, 2])("审计未唯一写入必须抛错交事务回滚：%s", async count => {
    execute.mockResolvedValueOnce(count);
    await expect(repo.audit(tx, "reviewer", "APPLY", "申请", null, grant, now)).rejects.toThrow("CAPABILITY_AUDIT_FAILED");
  });

  it("列表筛选与计数参数一致，分页不拼接值", async () => {
    raw.mockResolvedValueOnce([grant]).mockResolvedValueOnce([{ count: 1n }]);
    const result = await repo.list(tx, { circleId: "circle", subjectUserId: "guest", capability: "VIDEO_QUESTION", state: "APPROVED" }, 20, 10);
    expect(result).toEqual({ items: [grant], total: 1 });
    const page = sql(raw.mock.calls[0]), count = sql(raw.mock.calls[1]);
    expect(page.values.slice(0, -2)).toEqual(count.values);
    expect(page.values.slice(-2)).toEqual([20, 10]);
    expect(page.text).not.toContain("guest");
  });
});
