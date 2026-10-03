import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, RoleType } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RolesGuard } from "../../common/roles.guard";
import { InstituteService } from "../institute/institute.service";
import { FundApprovalService } from "./fund-approval.service";
import { FundApprovalExecutor } from "./fund-approval.executor";
import { FundApprovalController } from "./fund-approval.controller";
const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("审核认领仅允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("资金审核当前权限与审批认领", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const approvals = (client: unknown = db) => new FundApprovalService(client as PrismaService);
  const executor = (client: unknown = db) => new FundApprovalExecutor(approvals(client), new InstituteService(db as unknown as PrismaService, approvals()), undefined!, undefined!, undefined!, undefined!, undefined!, undefined!);
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成申请者" } });
    const owner = await db.user.create({ data: { nickname: "合成分配对象" } });
    const reviewer = await db.user.create({ data: { nickname: "合成审核者" } });
    const other = await db.user.create({ data: { nickname: "合成其他审核者" } }); users.push(actor.id, owner.id, reviewer.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成审核院", adminUserId: actor.id } }); institutes.push(institute.id);
    await db.instituteMember.create({ data: { userId: actor.id, instituteId: institute.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } });
    await db.instituteMember.create({ data: { userId: owner.id, instituteId: institute.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    await db.instituteRevenue.create({ data: { instituteId: institute.id, sourceType: "MEMBERSHIP", amount: 1000, description: "合成验收值，无真实付款" } });
    const role = await db.userRole.create({ data: { userId: reviewer.id, roleType: "FINANCE_ADMIN" } });
    const submitted = await new InstituteService(db as unknown as PrismaService, approvals()).requestDividend(actor.id, { userId: owner.id, type: "TEACHER_AWARD", amount: 100 });
    const cachedUser = { id: reviewer.id, roles: (await db.userRole.findMany({ where: { userId: reviewer.id } })).map(r => r.roleType) };
    return { actorId: actor.id, ownerId: owner.id, reviewerId: reviewer.id, otherId: other.id, instituteId: institute.id, roleId: role.id, approvalId: submitted.approvalId, cachedUser };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const invoke = (f: Fixture, approve: boolean, client: unknown = db, user = f.cachedUser) => {
    expect(Reflect.getMetadata("roles", FundApprovalController.prototype.review)).toEqual(["SUPER_ADMIN", "FINANCE_ADMIN"]);
    expect(new RolesGuard(new Reflector()).canActivate({ getHandler: () => FundApprovalController.prototype.review, getClass: () => FundApprovalController, switchToHttp: () => ({ getRequest: () => ({ user }) }) } as unknown as ExecutionContext)).toBe(true);
    const controller = new FundApprovalController(approvals(client), executor(client));
    return controller.review(f.approvalId, { approve, note: "合成审核" }, { user } as unknown as Parameters<FundApprovalController["review"]>[2]);
  };
  const pending = async (f: Fixture) => {
    const row = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } }); expect(row.status).toBe("PENDING"); expect(row.reviewedBy).toBeNull(); expect(row.processedAt).toBeNull(); expect(await db.instituteDividend.count()).toBe(0); expect(await db.userWallet.count()).toBe(0);
  };
  const staleApproval = (change: () => Promise<unknown>) => {
    let changed = false;
    return new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "fundApproval") return new Proxy(value, { get(delegate, name) {
        const fn = Reflect.get(delegate, name);
        if (name === "findUnique") return async (...args: unknown[]) => { const snapshot = await Reflect.apply(fn, delegate, args); if (!changed) { changed = true; await change(); } return snapshot; };
        return typeof fn === "function" ? fn.bind(delegate) : fn;
      } });
      return typeof value === "function" ? value.bind(target) : value;
    } });
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [id] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`;
    expect(id.port).toBe(55477); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(id.user).toBe("qa_voice");
  });
  afterEach(async () => {
    await db.fundApproval.deleteMany({ where: { requestedBy: { in: users } } });
    await db.instituteDividend.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.instituteRevenue.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  it.each((["SUPER_ADMIN", "FINANCE_ADMIN"] as const).flatMap(role => [true, false].map(approve => [role, approve] as const)))("当前%s可审核，approve=%s", async (role, approve) => {
    const f = await fixture(); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } }); f.cachedUser.roles = [role]; await invoke(f, approve);
    const row = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } }); expect(row.status).toBe(approve ? "APPROVED" : "REJECTED"); expect(row.reviewedBy).toBe(f.reviewerId); expect(row.reviewNote).toBe("合成审核"); expect(row.processedAt).not.toBeNull(); expect(await db.instituteDividend.count()).toBe(approve ? 1 : 0); expect(await db.userWallet.count()).toBe(0);
  });
  it.each(Object.values(RoleType).filter(r => r !== "SUPER_ADMIN" && r !== "FINANCE_ADMIN").map((role, i) => [role, i % 2 === 0] as const))("当前其他角色%s不能审核，approve=%s", async (role, approve) => {
    const f = await fixture(); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } }); await expect(invoke(f, approve)).rejects.toThrow("平台权限不足"); await pending(f);
  });
  const changes = ["角色删除", "角色降级", "角色改属", "账号封禁", "账号停用", "账号删除"];
  const change = (f: Fixture, name: string) => {
    if (name === "角色删除") return db.userRole.delete({ where: { id: f.roleId } });
    if (name === "角色降级" || name === "角色改属") return db.userRole.update({ where: { id: f.roleId }, data: name === "角色降级" ? { roleType: "OPERATION_ADMIN" } : { userId: f.otherId } });
    if (name === "账号删除") return db.user.delete({ where: { id: f.reviewerId } });
    return db.user.update({ where: { id: f.reviewerId }, data: { status: name === "账号封禁" ? "BANNED" : "DISABLED" } });
  };
  it.each(changes.flatMap(name => [true, false].map(approve => [name, approve] as const)))("缓存守卫通过后%s拒绝，approve=%s", async (name, approve) => {
    const f = await fixture(); await expect(invoke(f, approve, staleApproval(() => change(f, name)))).rejects.toThrow(); await pending(f);
  });
  it.each([true, false])("无当前平台角色拒绝，approve=%s", async approve => {
    const f = await fixture(); await db.userRole.delete({ where: { id: f.roleId } }); await expect(invoke(f, approve)).rejects.toThrow(); await pending(f);
  });
  it.each([true, false])("保留另一个允许角色仍可审核，approve=%s", async approve => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.reviewerId, roleType: "SUPER_ADMIN" } }); await invoke(f, approve, staleApproval(() => db.userRole.delete({ where: { id: f.roleId } })));
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe(approve ? "APPROVED" : "REJECTED");
  });
  it.each([true, false])("有审核权限的申请人也不能自审，approve=%s", async approve => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.actorId, roleType: "FINANCE_ADMIN" } }); await expect(invoke(f, approve, db, { id: f.actorId, roles: ["FINANCE_ADMIN"] })).rejects.toThrow("不能审批自己"); await pending(f);
  });
  it.each(["APPROVED", "REJECTED", "UNKNOWN"].flatMap(status => [true, false].map(approve => [status, approve] as const)))("当前%s不可再次审核，approve=%s", async (status, approve) => {
    const f = await fixture(); await db.fundApproval.update({ where: { id: f.approvalId }, data: { status, reviewedBy: f.otherId } }); const before = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } }); await expect(invoke(f, approve)).rejects.toThrow("已处理"); expect(await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).toEqual(before); expect(await db.instituteDividend.count()).toBe(0);
  });
  it("不存在审批单拒绝", async () => { const f = await fixture(); await expect(executor().review("missing-approval", true, undefined, f.reviewerId)).rejects.toThrow("不存在"); await pending(f); });
  it("不存在审核账号拒绝", async () => { const f = await fixture(); await expect(executor().review(f.approvalId, true, undefined, "missing-reviewer")).rejects.toThrow("账号当前不可用"); await pending(f); });
  it.each((["DISABLED", "BANNED"] as const).flatMap(status => [true, false].map(approve => [status, approve] as const)))("当前审核账号%s拒绝，approve=%s", async (status, approve) => {
    const f = await fixture(); await db.user.update({ where: { id: f.reviewerId }, data: { status } }); await expect(invoke(f, approve)).rejects.toThrow("账号当前不可用"); await pending(f);
  });
  it.each(["载荷", "金额", "类型", "摘要", "申请人", "变为本人申请", "已被处理", "删除"].flatMap(kind => [true, false].map(approve => [kind, approve] as const)))("审批快照后%s拒绝，approve=%s", async (kind, approve) => {
    const f = await fixture(); const client = staleApproval(async () => {
      if (kind === "删除") return db.fundApproval.delete({ where: { id: f.approvalId } });
      const old = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } });
      return db.fundApproval.update({ where: { id: f.approvalId }, data: kind === "载荷" ? { payload: { ...(old.payload as object), amount: 200 } } : kind === "金额" ? { amount: 200 } : kind === "类型" ? { type: "MEMBER_CONFIG" } : kind === "摘要" ? { summary: "合成新摘要" } : kind === "申请人" || kind === "变为本人申请" ? { requestedBy: kind === "申请人" ? f.ownerId : f.reviewerId } : { status: "REJECTED", reviewedBy: f.otherId } });
    });
    const reason = kind === "删除" ? "不存在" : kind === "已被处理" ? "已处理" : kind === "变为本人申请" ? "不能审批自己" : "审批内容已变化";
    await expect(invoke(f, approve, client)).rejects.toThrow(reason); const row = await db.fundApproval.findUnique({ where: { id: f.approvalId } }); expect(row?.status).toBe(kind === "删除" ? undefined : kind === "已被处理" ? "REJECTED" : "PENDING"); if (row && kind !== "已被处理") expect(row.reviewedBy).toBeNull(); expect(await db.instituteDividend.count()).toBe(0);
  });
  it.each(["双通过", "双拒绝", "通过拒绝"])("两个真实审批快照%s只接受一次认领", async kind => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.otherId, roleType: "SUPER_ADMIN" } }); let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; });
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "fundApproval") return new Proxy(value, { get(delegate, name) {
        const fn = Reflect.get(delegate, name); if (name === "findUnique") return async (...args: unknown[]) => { const snapshot = await Reflect.apply(fn, delegate, args); if (++arrived === 2) release(); await gate; return snapshot; }; return typeof fn === "function" ? fn.bind(delegate) : fn;
      } }); return typeof value === "function" ? value.bind(target) : value;
    } });
    const results = await Promise.allSettled([invoke(f, kind !== "双拒绝", client), invoke(f, kind === "双通过", client, { id: f.otherId, roles: ["SUPER_ADMIN"] })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1); const row = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } }); expect(["APPROVED", "REJECTED"]).toContain(row.status); expect(await db.instituteDividend.count()).toBe(row.status === "APPROVED" ? 1 : 0);
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    } throw new Error("未观测到审核认领真实行锁等待");
  };
  it.each(["角色撤销", "账号封禁", "另一审核已处理"].flatMap(kind => [true, false].map(approve => [kind, approve] as const)))("真实%s行锁等待后拒绝，approve=%s", async (kind, approve) => {
    const f = await fixture(); let signal!: () => void, release!: () => void; const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      if (kind === "角色撤销") await tx.userRole.update({ where: { id: f.roleId }, data: { roleType: "OPERATION_ADMIN" } });
      else if (kind === "账号封禁") await tx.user.update({ where: { id: f.reviewerId }, data: { status: "BANNED" } });
      else await tx.fundApproval.update({ where: { id: f.approvalId }, data: { status: "REJECTED", reviewedBy: f.otherId } }); signal(); await gate;
    }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([invoke(f, approve)]);
    try { await waitFor(`FROM "${kind === "角色撤销" ? "UserRole" : kind === "账号封禁" ? "User" : "fund_approval"}"`); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); if (kind !== "另一审核已处理") await pending(f); else expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).reviewedBy).toBe(f.otherId);
  });
  it.each(["角色撤销", "账号封禁"].flatMap(kind => [true, false].map(approve => [kind, approve] as const)))("认领先持权限锁，%s真实等待至认领提交，approve=%s", async (kind, approve) => {
    const f = await fixture(); let signal!: () => void, release!: () => void; const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key); if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>) => db.$transaction(async tx => { const result = await callback(tx); signal(); await gate; return result; }, { timeout: 15000 }); return typeof value === "function" ? value.bind(target) : value;
    } });
    const first = invoke(f, approve, client); await ready;
    const revoke = Promise.allSettled([kind === "角色撤销" ? db.userRole.update({ where: { id: f.roleId }, data: { roleType: "OPERATION_ADMIN" } }) : db.user.update({ where: { id: f.reviewerId }, data: { status: "BANNED" } })]);
    try { await waitFor(`UPDATE "public"."${kind === "角色撤销" ? "UserRole" : "User"}"`); } finally { release(); await first; }
    expect((await revoke)[0].status).toBe("fulfilled"); expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe(approve ? "APPROVED" : "REJECTED"); expect(await db.instituteDividend.count()).toBe(approve ? 1 : 0);
    const old = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } }); const next = await approvals().create({ type: "DIVIDEND", payload: old.payload as Record<string, unknown>, amount: 100, summary: "合成后续申请", requestedBy: f.actorId }); await expect(executor().review(next.approvalId, false, undefined, f.reviewerId)).rejects.toThrow(); expect((await db.fundApproval.findUniqueOrThrow({ where: { id: next.approvalId } })).status).toBe("PENDING");
  });
  it("真实审批状态写入后故障整体回滚，重试仅执行一次", async () => {
    const f = await fixture(); const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key); if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>) => db.$transaction(async tx => { await callback(tx); throw new Error("合成认领提交前故障"); }); return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(invoke(f, true, client)).rejects.toThrow("合成认领提交前故障"); await pending(f); await invoke(f, true); expect(await db.instituteDividend.count()).toBe(1);
  });
  it("审核身份来自请求而不信任正文中的审核人", async () => {
    const f = await fixture(); const controller = new FundApprovalController(approvals(), executor()); const body = { approve: false, reviewerId: f.actorId }; await controller.review(f.approvalId, body, { user: f.cachedUser } as unknown as Parameters<FundApprovalController["review"]>[2]); expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).reviewedBy).toBe(f.reviewerId);
  });
});
