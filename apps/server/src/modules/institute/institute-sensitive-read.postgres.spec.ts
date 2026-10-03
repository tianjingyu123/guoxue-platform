import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, RoleType, InstituteRole } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RolesGuard } from "../../common/roles.guard";
import { InstituteService } from "./institute.service";
import { InstituteController } from "./institute.controller";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { FundApprovalController } from "../fund-approval/fund-approval.controller";
const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("内部查询仅允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院与资金内部查询当前权限", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const platforms = ["fundList", "adminMembers", "candidates", "adminFinance"] as const;
  const managers = ["manageOverview", "pendingMembers", "managerFinance"] as const;
  const entries = [...platforms, ...managers];
  type Entry = typeof entries[number];
  const managementRoles = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"] as const;
  const allowed = (entry: Entry): RoleType[] => entry === "fundList" ? ["SUPER_ADMIN", "FINANCE_ADMIN"] : entry === "adminFinance" ? ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] : ["SUPER_ADMIN", "OPERATION_ADMIN"];
  const isManager = (entry: Entry) => (managers as readonly string[]).includes(entry);
  const fixture = async (entry: Entry) => {
    const actor = await db.user.create({ data: { nickname: "合成查询者" } }), owner = await db.user.create({ data: { nickname: "合成待审对象" } }), other = await db.user.create({ data: { nickname: "合成其他用户" } }); users.push(actor.id, owner.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成内部查询院", adminUserId: owner.id } }), elsewhere = await db.institute.create({ data: { name: "合成另一院", adminUserId: owner.id } }); institutes.push(institute.id, elsewhere.id);
    const manager = await db.instituteMember.create({ data: { userId: actor.id, instituteId: institute.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } });
    const member = await db.instituteMember.create({ data: { userId: owner.id, instituteId: institute.id, role: "TYPE_A", status: "PENDING", joinYear: 2026, lecturerLevel: "PREPARATORY", tasksCompleted: 3, inviteRemark: "合成内部留痕" } });
    await db.instituteRevenue.createMany({ data: [{ instituteId: institute.id, sourceType: "MEMBERSHIP", amount: 1000, description: "合成值，无真实付款" }, { instituteId: elsewhere.id, sourceType: "MEMBERSHIP", amount: 9000, description: "合成另一院值" }, { instituteId: institute.id, sourceType: "OTHER", amount: 8000, description: "合成非会费收入" }] });
    // 后台默认院沿用原findFirst未指定排序规则；只留一个院验证关闭院可读，管理会籍模式另测两院隔离。
    if (entry === "adminFinance") { await db.instituteRevenue.deleteMany({ where: { instituteId: elsewhere.id } }); await db.institute.delete({ where: { id: elsewhere.id } }); }
    await db.fundApproval.create({ data: { type: "DIVIDEND", payload: { instituteId: institute.id, syntheticMarker: "合成内部载荷" }, amount: 100, requestedBy: owner.id, summary: "合成待审记录" } });
    const role = await db.userRole.create({ data: { userId: actor.id, roleType: allowed(entry)[0] } });
    return { actorId: actor.id, ownerId: owner.id, otherId: other.id, instituteId: institute.id, elsewhereId: elsewhere.id, managerId: manager.id, memberId: member.id, roleId: role.id, cachedUser: { id: actor.id, roles: isManager(entry) ? [] as RoleType[] : [role.roleType] } };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const invoke = (f: Fixture, entry: Entry, client: unknown = db, afterSnapshot?: () => Promise<unknown>) => {
    const approvals = new FundApprovalService(client as PrismaService), svc = new InstituteService(client as PrismaService, approvals), controller = new InstituteController(svc), fund = new FundApprovalController(approvals, undefined!);
    const user = f.cachedUser, request = { user } as unknown as Parameters<InstituteController["manageOverview"]>[0];
    if (afterSnapshot) { const original = (svc as any).assertManagement.bind(svc); (svc as any).assertManagement = async (...args: unknown[]) => { const snapshot = await original(...args); await afterSnapshot(); return snapshot; }; }
    if (entry === "fundList" || entry === "adminMembers" || entry === "candidates") {
      const target = entry === "fundList" ? FundApprovalController : InstituteController;
      const handler = entry === "fundList" ? FundApprovalController.prototype.listPending : entry === "adminMembers" ? InstituteController.prototype.listAdminMembers : InstituteController.prototype.getCandidates;
      expect(new RolesGuard(new Reflector()).canActivate({ getHandler: () => handler, getClass: () => target, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext)).toBe(true);
    }
    if (entry === "fundList") return fund.listPending(1, 20, "PENDING", request);
    if (entry === "adminMembers") return controller.listAdminMembers(request, undefined, undefined, undefined, 1, 20);
    if (entry === "candidates") return controller.getCandidates(request);
    if (entry === "manageOverview") return controller.manageOverview(request);
    if (entry === "pendingMembers") return controller.pendingMembers(request);
    return controller.manageFinance(request);
  };
  const check = (f: Fixture, entry: Entry, value: any) => {
    if (entry === "fundList") { expect(value.items[0].payload.syntheticMarker).toBe("合成内部载荷"); expect(value.items[0].amountUnit).toBe("CNY"); expect(value.total).toBe(1); }
    if (entry === "adminMembers") expect(value.members.some((m: any) => m.id === f.memberId && m.inviteRemark === "合成内部留痕")).toBe(true);
    if (entry === "candidates") expect(value.some((m: any) => m.id === f.memberId && m.inviteRemark === "合成内部留痕")).toBe(true);
    if (entry === "manageOverview") { expect(Number(value.yearRevenue)).toBe(1000); expect(value.totalMembers).toBe(2); }
    if (entry === "pendingMembers") { expect(value.map((m: any) => m.id)).toEqual([f.memberId]); expect(value[0].inviteRemark).toBeUndefined(); }
    if (entry === "adminFinance" || entry === "managerFinance") { expect(value.totalRevenue).toBe(1000); expect(value.pendingDividends).toBe(100); expect(value.remaining).toBe(400); }
  };
  const platformChanges = ["角色删除", "角色降级", "角色改属", "账号封禁", "账号停用", "账号删除"];
  const managerChanges = ["会籍降级", "会籍停用", "会籍改属", "会籍改院", "会籍删除", "账号封禁", "账号停用", "账号删除"];
  const change = async (f: Fixture, name: string) => {
    if (name === "角色删除") return db.userRole.delete({ where: { id: f.roleId } });
    if (name === "角色降级" || name === "角色改属") return db.userRole.update({ where: { id: f.roleId }, data: name === "角色降级" ? { roleType: "CONTENT_AUDITOR" } : { userId: f.otherId } });
    if (name === "账号封禁" || name === "账号停用") return db.user.update({ where: { id: f.actorId }, data: { status: name === "账号封禁" ? "BANNED" : "DISABLED" } });
    if (name === "账号删除") { await db.instituteMember.deleteMany({ where: { id: f.managerId } }); return db.user.delete({ where: { id: f.actorId } }); }
    if (name === "会籍删除") return db.instituteMember.delete({ where: { id: f.managerId } });
    return db.instituteMember.update({ where: { id: f.managerId }, data: name === "会籍降级" ? { role: "TYPE_A" } : name === "会籍停用" ? { status: "SUSPENDED" } : name === "会籍改属" ? { userId: f.otherId } : { instituteId: f.elsewhereId } });
  };
  beforeAll(async () => { db = new PrismaClient({ datasources: { db: { url: testUrl } } }); const [id] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`; expect(id.port).toBe(55477); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(id.user).toBe("qa_voice"); });
  afterEach(async () => { await db.fundApproval.deleteMany({ where: { requestedBy: { in: users } } }); await db.instituteRevenue.deleteMany({ where: { instituteId: { in: institutes } } }); await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } }); await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } }); await db.userRole.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });
  afterAll(async () => { await db.$disconnect(); });
  it.each(platforms.flatMap(entry => allowed(entry).map(role => [entry, role] as const)))("%s当前%s可查询", async (entry, role) => { const f = await fixture(entry); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } }); f.cachedUser.roles = [role]; if (entry === "adminFinance") await db.instituteMember.delete({ where: { id: f.managerId } }); check(f, entry, await invoke(f, entry)); });
  it.each(managers.flatMap(entry => managementRoles.map(role => [entry, role] as const)))("%s当前管理会籍%s可查询", async (entry, role) => { const f = await fixture(entry); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); check(f, entry, await invoke(f, entry)); });
  it.each(platforms.flatMap(entry => Object.values(RoleType).filter(r => !allowed(entry).includes(r)).map(role => [entry, role] as const)))("%s当前其他角色%s拒绝旧缓存", async (entry, role) => { const f = await fixture(entry); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } }); await expect(invoke(f, entry)).rejects.toThrow("权限不足"); });
  it.each(platforms.flatMap(entry => platformChanges.map(name => [entry, name] as const)))("%s缓存快照后%s拒绝", async (entry, name) => { const f = await fixture(entry); await change(f, name); await expect(invoke(f, entry)).rejects.toThrow(); });
  it.each(managers.flatMap(entry => managerChanges.map(name => [entry, name] as const)))("%s真实会籍快照后%s拒绝", async (entry, name) => { const f = await fixture(entry); await expect(invoke(f, entry, db, () => change(f, name))).rejects.toThrow(); });
  it.each(managers.flatMap(entry => Object.values(InstituteRole).filter(r => !(managementRoles as readonly string[]).includes(r)).map(role => [entry, role] as const)))("%s当前非管理会籍%s拒绝", async (entry, role) => { const f = await fixture(entry); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); await expect(invoke(f, entry)).rejects.toThrow("管理层"); });
  it.each(entries.flatMap(entry => (["BANNED", "DISABLED"] as const).map(status => [entry, status] as const)))("%s初始账号%s拒绝", async (entry, status) => { const f = await fixture(entry); await db.user.update({ where: { id: f.actorId }, data: { status } }); await expect(invoke(f, entry)).rejects.toThrow("账号当前不可用"); });
  it.each(platforms)("%s保留另一允许角色继续查询", async entry => { const f = await fixture(entry); await db.userRole.create({ data: { userId: f.actorId, roleType: allowed(entry)[1] } }); await db.userRole.delete({ where: { id: f.roleId } }); check(f, entry, await invoke(f, entry)); });
  it.each(managers)("%s合法管理角色更换后继续原院查询", async entry => { const f = await fixture(entry); check(f, entry, await invoke(f, entry, db, () => db.instituteMember.update({ where: { id: f.managerId }, data: { role: "VICE_PRESIDENT" } }))); });
  it.each(entries)("%s关闭院历史只读保持", async entry => { const f = await fixture(entry); await db.institute.update({ where: { id: f.instituteId }, data: { status: "CLOSED" } }); check(f, entry, await invoke(f, entry)); });
  const gate = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; };
  const waitLocked = async (pid: number) => { for (let i = 0; i < 150; i++) { const [r] = await db.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${pid} AND wait_event_type='Lock') AS waiting`; if (r.waiting) return; await sleep(20); } throw new Error("未观测真实行锁等待"); };
  const pausedClient = (entry: Entry, ready: { release: () => void }, release: Promise<void>, pid: (id: number) => void, pauseReads = false) => new Proxy(db, { get(target, key) { const value = Reflect.get(target, key); if (key === "$transaction") return (callback: any) => target.$transaction(async tx => {
    const [row] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`; pid(row.pid); if (!pauseReads) ready.release();
    const selected = entry === "fundList" ? "fundApproval" : entry === "adminFinance" || entry === "managerFinance" ? "instituteRevenue" : "instituteMember";
    let paused = false;
    const wrapped = new Proxy(tx, { get(client, name) { const delegate = Reflect.get(client, name); if (pauseReads && name === selected) return new Proxy(delegate, { get(model, method) { const fn = Reflect.get(model, method); if ((method === "findMany" || method === "count") && !paused) return async (...args: unknown[]) => { paused = true; ready.release(); await release; return Reflect.apply(fn, model, args); }; return typeof fn === "function" ? fn.bind(model) : fn; } }); return typeof delegate === "function" ? delegate.bind(client) : delegate; } });
    return callback(wrapped);
  }, { timeout: 15000 }); return typeof value === "function" ? value.bind(target) : value; } });
  it.each(entries.flatMap(entry => ["账号", "授权行"].map(kind => [entry, kind] as const)))("%s%s撤销事务先锁，查询等待后拒绝", async (entry, kind) => {
    const f = await fixture(entry), ready = gate(), release = gate(), readerReady = gate(); let readerPid = 0;
    const writer = db.$transaction(async tx => { if (kind === "账号") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); else if (isManager(entry)) await tx.instituteMember.update({ where: { id: f.managerId }, data: { status: "SUSPENDED" } }); else await tx.userRole.delete({ where: { id: f.roleId } }); ready.release(); await release.promise; }, { timeout: 15000 });
    await ready.promise;
    const reader = invoke(f, entry, pausedClient(entry, readerReady, Promise.resolve(), id => { readerPid = id; })).then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
    try { await readerReady.promise; await waitLocked(readerPid); } finally { release.release(); }
    await writer; const result = await reader; expect(result.error).toBeDefined(); expect(result.value).toBeUndefined();
  });
  it.each(entries.flatMap(entry => ["账号", "授权行"].map(kind => [entry, kind] as const)))("%s先授权持锁，%s撤销等待查询提交", async (entry, kind) => {
    const f = await fixture(entry), readerReady = gate(), release = gate(), writerReady = gate(); let writerPid = 0;
    const reader = invoke(f, entry, pausedClient(entry, readerReady, release.promise, () => {}, true)); await readerReady.promise;
    const writer = db.$transaction(async tx => { const [row] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`; writerPid = row.pid; writerReady.release(); if (kind === "账号") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); else if (isManager(entry)) await tx.instituteMember.update({ where: { id: f.managerId }, data: { status: "SUSPENDED" } }); else await tx.userRole.delete({ where: { id: f.roleId } }); }, { timeout: 15000 });
    try { await writerReady.promise; await waitLocked(writerPid); } finally { release.release(); }
    check(f, entry, await reader); await writer; await expect(invoke(f, entry)).rejects.toThrow();
  });
});
