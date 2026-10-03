import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, InstituteRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteAssessmentService, SHARE_POINT_TYPES } from "./institute-assessment.service";
import { InstituteController } from "./institute.controller";
const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) { const u = new URL(testUrl); if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("人工记分仅允许本机合成库"); }
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("人工记分当前权限与目标归属", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const managementRoles = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"] as const;
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成记分者" } }), owner = await db.user.create({ data: { nickname: "合成目标" } }), other = await db.user.create({ data: { nickname: "合成其他用户" } }); users.push(actor.id, owner.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成记分院", adminUserId: owner.id } }), elsewhere = await db.institute.create({ data: { name: "合成另一院", adminUserId: owner.id } }); institutes.push(institute.id, elsewhere.id);
    const manager = await db.instituteMember.create({ data: { userId: actor.id, instituteId: institute.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } }), target = await db.instituteMember.create({ data: { userId: owner.id, instituteId: institute.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    return { actorId: actor.id, ownerId: owner.id, otherId: other.id, instituteId: institute.id, elsewhereId: elsewhere.id, managerId: manager.id, targetId: target.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const invoke = (f: Fixture, points = 10, client: unknown = db, afterSnapshot?: () => Promise<unknown>, dto: object = {}) => {
    const svc = new InstituteAssessmentService(client as PrismaService);
    if (afterSnapshot) { const original = (svc as any).assertManagement.bind(svc); (svc as any).assertManagement = async (...args: unknown[]) => { const snapshot = await original(...args); await afterSnapshot(); return snapshot; }; }
    return new InstituteController(undefined!, svc, undefined!, undefined!).addMemberPoints({ user: { id: f.actorId, roles: [] } } as any, f.targetId, { points, remark: "合成记分，无真实资产", ...dto });
  };
  const check = async (f: Fixture, points = 10, count = 1) => { const rows = await db.instituteSharePoint.findMany(); expect(rows).toHaveLength(count); for (const row of rows) { expect(row.memberId).toBe(f.targetId); expect(row.userId).toBe(f.ownerId); expect(row.instituteId).toBe(f.instituteId); expect(row.points).toBe(points); expect(row.verifiedBy).toBe(f.actorId); } expect(await db.userWallet.count()).toBe(0); };
  const empty = async () => { expect(await db.instituteSharePoint.count()).toBe(0); expect(await db.userWallet.count()).toBe(0); };
  const managerChanges = ["降级", "停用", "改属", "改院", "删除会籍", "封禁账号", "停用账号", "删除账号"];
  const change = async (f: Fixture, name: string, client: any = db) => {
    if (name === "删除会籍" || name === "删除账号") { await client.instituteMember.delete({ where: { id: f.managerId } }); if (name === "删除账号") return client.user.delete({ where: { id: f.actorId } }); return; }
    if (name === "封禁账号" || name === "停用账号") return client.user.update({ where: { id: f.actorId }, data: { status: name === "封禁账号" ? "BANNED" : "DISABLED" } });
    return client.instituteMember.update({ where: { id: f.managerId }, data: name === "降级" ? { role: "TYPE_A" } : name === "停用" ? { status: "SUSPENDED" } : name === "改属" ? { userId: f.otherId } : { instituteId: f.elsewhereId } });
  };
  const afterTarget = (change: () => Promise<unknown>) => { let done = false; return new Proxy(db, { get(target, key) { const value = Reflect.get(target, key); if (key === "instituteMember") return new Proxy(value, { get(model, method) { const fn = Reflect.get(model, method); if (method === "findUnique") return async (...args: unknown[]) => { const snapshot = await Reflect.apply(fn, model, args); if (!done) { done = true; await change(); } return snapshot; }; return typeof fn === "function" ? fn.bind(model) : fn; } }); return typeof value === "function" ? value.bind(target) : value; } }); };
  beforeAll(async () => { db = new PrismaClient({ datasources: { db: { url: testUrl } } }); const [id] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`; expect(id.port).toBe(55477); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(id.user).toBe("qa_voice"); });
  afterEach(async () => { await db.instituteSharePoint.deleteMany({ where: { instituteId: { in: institutes } } }); await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } }); await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } }); await db.userRole.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });
  afterAll(async () => { await db.$disconnect(); });
  it.each(managementRoles.flatMap(role => [10, -10].map(points => [role, points] as const)))("当前%s可记%s分", async (role, points) => { const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); await invoke(f, points); await check(f, points); });
  it.each(SHARE_POINT_TYPES)("原积分类型%s可写", async pointType => { const f = await fixture(); await invoke(f, 10, db, undefined, { pointType }); await check(f); expect((await db.instituteSharePoint.findFirstOrThrow()).pointType).toBe(pointType); });
  it.each(Object.values(InstituteRole).filter(r => !(managementRoles as readonly string[]).includes(r)))("当前非管理角色%s拒绝", async role => { const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); await expect(invoke(f)).rejects.toThrow("管理层"); await empty(); });
  it.each(managerChanges.flatMap(name => [10, -10].map(points => [name, points] as const)))("真实管理快照后%s拒绝记%s分", async (name, points) => { const f = await fixture(); await expect(invoke(f, points, db, () => change(f, name))).rejects.toThrow(); await empty(); });
  it.each(["改属", "改院", "删除"].flatMap(name => [10, -10].map(points => [name, points] as const)))("目标快照后%s拒绝记%s分", async (name, points) => { const f = await fixture(); const client = afterTarget(() => name === "删除" ? db.instituteMember.delete({ where: { id: f.targetId } }) : db.instituteMember.update({ where: { id: f.targetId }, data: name === "改属" ? { userId: f.otherId } : { instituteId: f.elsewhereId } })); await expect(invoke(f, points, client)).rejects.toThrow(name === "删除" ? "成员不存在" : "目标归属已变化"); await empty(); });
  it.each(["PENDING", "ACTIVE", "REJECTED", "GRADUATED", "SUSPENDED"].flatMap(status => [10, -10].map(points => [status, points] as const)))("原%s目标仍允许历史调整%s分", async (status, points) => { const f = await fixture(); await db.instituteMember.update({ where: { id: f.targetId }, data: { status } }); await invoke(f, points); await check(f, points); });
  it.each(["BANNED", "DISABLED"] as const)("目标账号%s仍允许历史纠错", async status => { const f = await fixture(); await db.user.update({ where: { id: f.ownerId }, data: { status } }); await invoke(f, -10); await check(f, -10); });
  it.each([10, -10])("关闭院原历史调整保持，积分%s", async points => { const f = await fixture(); await db.institute.update({ where: { id: f.instituteId }, data: { status: "CLOSED" } }); await invoke(f, points); await check(f, points); });
  it.each([10, -10])("原管理者可调整自己，积分%s", async points => { const f = await fixture(); f.targetId = f.managerId; f.ownerId = f.actorId; await invoke(f, points); await check(f, points); });
  it.each([0, 1.5, 1001, -1001, NaN, Infinity])("非法积分%s不写入", async points => { const f = await fixture(); await expect(invoke(f, points)).rejects.toThrow("非零整数"); await empty(); });
  it("非法积分类型拒绝", async () => { const f = await fixture(); await expect(invoke(f, 10, db, undefined, { pointType: "INVALID" })).rejects.toThrow("无效积分类型"); await empty(); });
  it("其他院目标拒绝", async () => { const f = await fixture(); await db.instituteMember.update({ where: { id: f.targetId }, data: { instituteId: f.elsewhereId } }); await expect(invoke(f)).rejects.toThrow("本研究院"); await empty(); });
  it("缺失目标拒绝", async () => { const f = await fixture(); f.targetId = "missing-member"; await expect(invoke(f)).rejects.toThrow("成员不存在"); await empty(); });
  it("缺失当前操作者会籍拒绝", async () => { const f = await fixture(); await db.instituteMember.delete({ where: { id: f.managerId } }); await expect(invoke(f)).rejects.toThrow("管理层"); await empty(); });
  it("合法管理角色变更保持", async () => { const f = await fixture(); await invoke(f, 10, db, () => db.instituteMember.update({ where: { id: f.managerId }, data: { role: "SECRETARY_GENERAL" } })); await check(f); });
  it("原手工调整同refId可重复记分，不引入自动事件幂等规则", async () => { const f = await fixture(); await invoke(f, 10, db, undefined, { refId: "synthetic-ref" }); await invoke(f, 10, db, undefined, { refId: "synthetic-ref" }); await check(f, 10, 2); });
  it("请求体操作者不能替代req.user.id", async () => { const f = await fixture(); await invoke(f, 10, db, undefined, { operatorUserId: f.otherId, verifiedBy: f.otherId }); await check(f); });
  it("实际积分写入后故障回滚，再次调用仅一条记录", async () => {
    const f = await fixture(); const client = new Proxy(db, { get(target, key) { const value = Reflect.get(target, key); if (key === "$transaction") return (callback: any) => target.$transaction(async tx => { await callback(tx); throw new Error("合成记分写入后故障"); }); return typeof value === "function" ? value.bind(target) : value; } });
    await expect(invoke(f, 10, client)).rejects.toThrow("合成记分写入后故障"); await empty(); await invoke(f); await check(f);
  });
  const gate = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };
  const waitLocked = async (pid: number) => { for (let i = 0; i < 150; i++) { const [r] = await db.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${pid} AND wait_event_type='Lock') AS waiting`; if (r.waiting) return; await sleep(20); } throw new Error("未观测真实行锁等待"); };
  const watched = (ready: { release: () => void }, release: Promise<void>, pid: (id: number) => void, pauseWrite = false) => new Proxy(db, { get(target, key) { const value = Reflect.get(target, key); if (key === "$transaction") return (callback: any) => target.$transaction(async tx => { const [r] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`; pid(r.pid); if (!pauseWrite) ready.release(); const wrapped = new Proxy(tx, { get(client, name) { const delegate = Reflect.get(client, name); if (pauseWrite && name === "instituteSharePoint") return new Proxy(delegate, { get(model, method) { const fn = Reflect.get(model, method); if (method === "create") return async (...args: unknown[]) => { ready.release(); await release; return Reflect.apply(fn, model, args); }; return typeof fn === "function" ? fn.bind(model) : fn; } }); return typeof delegate === "function" ? delegate.bind(client) : delegate; } }); return callback(wrapped); }, { timeout: 15000 }); return typeof value === "function" ? value.bind(target) : value; } });
  it.each(["账号", "管理会籍", "目标会籍"].flatMap(kind => [10, -10].map(points => [kind, points] as const)))("%s变更先锁，记%s分等待后拒绝", async (kind, points) => {
    const f = await fixture(), ready = gate(), release = gate(), writerReady = gate(); let pid = 0;
    const writer = db.$transaction(async tx => { if (kind === "账号") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); else if (kind === "管理会籍") await tx.instituteMember.update({ where: { id: f.managerId }, data: { status: "SUSPENDED" } }); else await tx.instituteMember.update({ where: { id: f.targetId }, data: { userId: f.otherId } }); ready.release(); await release.promise; }, { timeout: 15000 }); await ready.promise;
    const reader = invoke(f, points, watched(writerReady, Promise.resolve(), id => { pid = id; })).then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
    try { await writerReady.promise; await waitLocked(pid); } finally { release.release(); } await writer; expect((await reader).error).toBeDefined(); await empty();
  });
  it.each(["账号", "管理会籍", "目标会籍"].flatMap(kind => [10, -10].map(points => [kind, points] as const)))("先记分持锁，%s变更等待提交，积分%s", async (kind, points) => {
    const f = await fixture(), ready = gate(), release = gate(), writerReady = gate(); let pid = 0;
    const reader = invoke(f, points, watched(ready, release.promise, () => {}, true)); await ready.promise;
    const writer = db.$transaction(async tx => { const [r] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`; pid = r.pid; writerReady.release(); if (kind === "账号") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); else if (kind === "管理会籍") await tx.instituteMember.update({ where: { id: f.managerId }, data: { status: "SUSPENDED" } }); else await tx.instituteMember.update({ where: { id: f.targetId }, data: { userId: f.otherId } }); }, { timeout: 15000 });
    try { await writerReady.promise; await waitLocked(pid); } finally { release.release(); } await reader; await writer; await check(f, points); if (kind !== "目标会籍") await expect(invoke(f, points)).rejects.toThrow();
  });
});
