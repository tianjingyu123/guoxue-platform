import { setTimeout as sleep } from "node:timers/promises";
import { Prisma, PrismaClient, RoleType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteService } from "./institute.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("任务验证仅允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院任务验证当前平台权限与真实事务", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const service = (client: unknown = db) => new InstituteService(client as PrismaService);
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成任务验证者" } });
    const owner = await db.user.create({ data: { nickname: "合成任务所有者" } });
    const other = await db.user.create({ data: { nickname: "合成其他验证者" } }); users.push(actor.id, owner.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成任务验证院", adminUserId: actor.id } });
    const otherInstitute = await db.institute.create({ data: { name: "合成其他院", adminUserId: other.id } }); institutes.push(institute.id, otherInstitute.id);
    const member = await db.instituteMember.create({ data: { instituteId: institute.id, userId: owner.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026, tasksCompleted: 1 } });
    const otherMember = await db.instituteMember.create({ data: { instituteId: institute.id, userId: other.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    const role = await db.userRole.create({ data: { userId: actor.id, roleType: "OPERATION_ADMIN" } });
    const task = await db.instituteTask.create({ data: { memberId: member.id, taskType: "ARTICLE", title: "合成已完成任务", status: "COMPLETED", completedAt: new Date() } });
    return { actorId: actor.id, ownerId: owner.id, otherId: other.id, instituteId: institute.id, otherInstituteId: otherInstitute.id, memberId: member.id, otherMemberId: otherMember.id, roleId: role.id, taskId: task.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const staleRead = (change: () => Promise<unknown>) => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "instituteTask") return new Proxy(value, { get(delegate, name) {
      const method = Reflect.get(delegate, name);
      if (name === "findUnique") return async (...args: unknown[]) => { const snapshot = await Reflect.apply(method, delegate, args); await change(); return snapshot; };
      return typeof method === "function" ? method.bind(delegate) : method;
    } });
    return typeof value === "function" ? value.bind(target) : value;
  } });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [id] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`;
    expect(id.port).toBe(55477); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(id.user).toBe("qa_voice");
  });
  afterEach(async () => {
    await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  const unchanged = async (f: Fixture) => {
    const task = await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } });
    expect(task.status).toBe("COMPLETED"); expect(task.verifiedBy).toBeNull();
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(1);
  };
  it.each(["SUPER_ADMIN", "OPERATION_ADMIN"] as const)("有效%s可验证，保留完成时间和任务非验证字段", async role => {
    const f = await fixture(); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } });
    const before = await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } });
    const result = await service().verifyTask(f.taskId, f.actorId); expect(result.status).toBe("VERIFIED"); expect(result.verifiedBy).toBe(f.actorId);
    const { status: _oldStatus, verifiedBy: _oldVerifier, ...oldFields } = before;
    const { status: _status, verifiedBy: _verifier, ...newFields } = result; expect(newFields).toEqual(oldFields);
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(1);
  });
  it.each(Object.values(RoleType).filter(r => r !== "SUPER_ADMIN" && r !== "OPERATION_ADMIN"))("其他平台角色%s不可验证", async role => {
    const f = await fixture(); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } });
    await expect(service().verifyTask(f.taskId, f.actorId)).rejects.toThrow("平台权限不足"); await unchanged(f);
  });
  it("没有平台角色不可验证", async () => {
    const f = await fixture(); await db.userRole.delete({ where: { id: f.roleId } }); await expect(service().verifyTask(f.taskId, f.actorId)).rejects.toThrow(); await unchanged(f);
  });
  it("保留有平台权限的本人验证政策", async () => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.ownerId, roleType: "SUPER_ADMIN" } });
    expect((await service().verifyTask(f.taskId, f.ownerId)).verifiedBy).toBe(f.ownerId);
  });
  it("移除一条角色但保留另一个允许角色仍可验证", async () => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.actorId, roleType: "SUPER_ADMIN" } });
    const client = staleRead(() => db.userRole.delete({ where: { id: f.roleId } }));
    expect((await service(client).verifyTask(f.taskId, f.actorId)).verifiedBy).toBe(f.actorId);
  });
  it.each(["PENDING", "VERIFIED", "UNKNOWN"])("非已完成%s不能验证", async status => {
    const f = await fixture(); await db.instituteTask.update({ where: { id: f.taskId }, data: { status } });
    await expect(service().verifyTask(f.taskId, f.actorId)).rejects.toThrow();
    expect((await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } })).status).toBe(status);
  });
  it("不存在任务拒绝", async () => { await expect(service().verifyTask("missing-task", "missing-verifier")).rejects.toThrow(); });
  it.each(["角色删除", "角色降级", "角色改属", "账号停用", "账号封禁", "会籍换用户", "会籍换院", "任务换会籍", "任务重置待完成", "任务被他人验证", "任务删除", "会籍删除"])("快照后%s不能使用旧权限或覆盖新身份", async change => {
    const f = await fixture(); const client = staleRead(async () => {
      if (change === "角色删除") return db.userRole.delete({ where: { id: f.roleId } });
      if (change === "角色降级") return db.userRole.update({ where: { id: f.roleId }, data: { roleType: "FINANCE_ADMIN" } });
      if (change === "角色改属") return db.userRole.update({ where: { id: f.roleId }, data: { userId: f.otherId } });
      if (change.startsWith("账号")) return db.user.update({ where: { id: f.actorId }, data: { status: change === "账号封禁" ? "BANNED" : "DISABLED" } });
      if (change === "会籍换用户") { await db.instituteMember.delete({ where: { id: f.otherMemberId } }); return db.instituteMember.update({ where: { id: f.memberId }, data: { userId: f.otherId } }); }
      if (change === "会籍换院") return db.instituteMember.update({ where: { id: f.memberId }, data: { instituteId: f.otherInstituteId } });
      if (change === "任务换会籍") return db.instituteTask.update({ where: { id: f.taskId }, data: { memberId: f.otherMemberId } });
      if (change === "任务重置待完成") return db.instituteTask.update({ where: { id: f.taskId }, data: { status: "PENDING", completedAt: null } });
      if (change === "任务被他人验证") return db.instituteTask.update({ where: { id: f.taskId }, data: { status: "VERIFIED", verifiedBy: f.otherId } });
      if (change === "任务删除") return db.instituteTask.delete({ where: { id: f.taskId } });
      return db.instituteMember.delete({ where: { id: f.memberId } });
    });
    await expect(service(client).verifyTask(f.taskId, f.actorId)).rejects.toThrow();
    const stored = await db.instituteTask.findUnique({ where: { id: f.taskId } }); if (stored) expect(stored.verifiedBy).toBe(change === "任务被他人验证" ? f.otherId : null);
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    }
    throw new Error("未观测到任务验证真实行锁等待");
  };
  it.each(["角色降级", "账号封禁", "会籍换用户", "任务被他人验证"])("真实%s锁等待后重新核验", async change => {
    const f = await fixture(); if (change === "会籍换用户") await db.instituteMember.delete({ where: { id: f.otherMemberId } });
    let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      if (change === "角色降级") await tx.userRole.update({ where: { id: f.roleId }, data: { roleType: "FINANCE_ADMIN" } });
      if (change === "账号封禁") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } });
      if (change === "会籍换用户") await tx.instituteMember.update({ where: { id: f.memberId }, data: { userId: f.otherId } });
      if (change === "任务被他人验证") await tx.instituteTask.update({ where: { id: f.taskId }, data: { status: "VERIFIED", verifiedBy: f.otherId } });
      signal(); await gate;
    }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([service().verifyTask(f.taskId, f.actorId)]);
    const table = change === "角色降级" ? "UserRole" : change === "账号封禁" ? "User" : change === "会籍换用户" ? "InstituteMember" : "InstituteTask";
    try { await waitFor(`FROM "${table}"`); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected");
    expect((await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } })).verifiedBy).toBe(change === "任务被他人验证" ? f.otherId : null);
  });
  it("两个真实已完成快照只接受一个验证者，失败者不能覆盖", async () => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.otherId, roleType: "SUPER_ADMIN" } });
    let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; });
    const client = staleRead(async () => { if (++arrived === 2) release(); await gate; });
    const results = await Promise.allSettled([service(client).verifyTask(f.taskId, f.actorId), service(client).verifyTask(f.taskId, f.otherId)]);
    const successes = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<InstituteService["verifyTask"]>>> => r.status === "fulfilled");
    expect(successes).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    expect((await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } })).verifiedBy).toBe(successes[0].value.verifiedBy);
  });
  it("写后异常回滚验证状态和验证人，重试成功后再次验证不能覆盖", async () => {
    const f = await fixture(); const client = new Proxy(db, { get(target, key) {
      if (key === "$transaction") return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(tx => work(new Proxy(tx, { get(obj, prop) {
        const value = Reflect.get(obj, prop);
        if (prop === "instituteTask") return new Proxy(value, { get(delegate, name) {
          const method = Reflect.get(delegate, name);
          if (name === "update") return async (...args: unknown[]) => { await Reflect.apply(method, delegate, args); throw new Error("合成提交前失败"); };
          return typeof method === "function" ? method.bind(delegate) : method;
        } });
        return typeof value === "function" ? value.bind(obj) : value;
      } })));
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(service(client).verifyTask(f.taskId, f.actorId)).rejects.toThrow("合成提交前失败"); await unchanged(f);
    await service().verifyTask(f.taskId, f.actorId); await expect(service().verifyTask(f.taskId, f.actorId)).rejects.toThrow();
    expect((await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } })).verifiedBy).toBe(f.actorId);
  });
  it("历史COMPLETED但已有验证人的记录不能被覆盖或自动改状态", async () => {
    const f = await fixture(); const before = await db.instituteTask.update({ where: { id: f.taskId }, data: { verifiedBy: f.otherId } });
    await expect(service().verifyTask(f.taskId, f.actorId)).rejects.toThrow("验证记录已存在");
    expect(await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } })).toEqual(before);
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(1);
  });
  it("快照后COMPLETED任务增加验证人也不能覆盖", async () => {
    const f = await fixture(); const client = staleRead(() => db.instituteTask.update({ where: { id: f.taskId }, data: { verifiedBy: f.otherId } }));
    await expect(service(client).verifyTask(f.taskId, f.actorId)).rejects.toThrow("验证记录已存在");
    const task = await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } }); expect(task.status).toBe("COMPLETED"); expect(task.verifiedBy).toBe(f.otherId);
  });
  it("等待历史验证人真实写锁后保留其记录", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => { await tx.instituteTask.update({ where: { id: f.taskId }, data: { verifiedBy: f.otherId } }); signal(); await gate; }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([service().verifyTask(f.taskId, f.actorId)]);
    try { await waitFor('FROM "InstituteTask"'); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected");
    const task = await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } }); expect(task.status).toBe("COMPLETED"); expect(task.verifiedBy).toBe(f.otherId);
  });
});
