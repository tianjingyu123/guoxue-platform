import { setTimeout as sleep } from "node:timers/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteService } from "./institute.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("任务完成仅允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院任务完成原子提交与当前归属", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const service = (client: unknown = db) => new InstituteService(client as PrismaService);
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成任务提交者" } });
    const other = await db.user.create({ data: { nickname: "合成其他任务身份" } });
    users.push(actor.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成任务院", adminUserId: actor.id } }); institutes.push(institute.id);
    const member = await db.instituteMember.create({ data: { instituteId: institute.id, userId: actor.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    const otherMember = await db.instituteMember.create({ data: { instituteId: institute.id, userId: other.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    const task = await db.instituteTask.create({ data: { memberId: member.id, taskType: "ARTICLE", title: "合成年度任务" } });
    return { actorId: actor.id, otherId: other.id, memberId: member.id, otherMemberId: otherMember.id, taskId: task.id };
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
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  const expectPending = async (f: Fixture) => {
    const task = await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } });
    expect(task.status).toBe("PENDING"); expect(task.completedAt).toBeNull();
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(0);
  };

  it("本人完成任务并从已有计数加一，保留其他字段", async () => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.memberId }, data: { tasksCompleted: 7 } });
    const before = await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } });
    const result = await service().completeTask(f.taskId, f.actorId);
    expect(result.status).toBe("COMPLETED"); expect(result.completedAt).toBeInstanceOf(Date);
    const { status: _oldStatus, completedAt: _oldDate, ...oldFields } = before;
    const { status: _status, completedAt: _date, ...newFields } = result;
    expect(newFields).toEqual(oldFields);
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(8);
  });
  it("不存在的任务拒绝", async () => { await expect(service().completeTask("missing-task", "missing-user")).rejects.toThrow(); });
  it("他人不能完成任务", async () => { const f = await fixture(); await expect(service().completeTask(f.taskId, f.otherId)).rejects.toThrow(); await expectPending(f); });
  it.each(["COMPLETED", "VERIFIED", "UNKNOWN"])("非待完成%s不重复计数", async status => {
    const f = await fixture(); await db.instituteTask.update({ where: { id: f.taskId }, data: { status } });
    await expect(service().completeTask(f.taskId, f.actorId)).rejects.toThrow();
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(0);
  });
  it.each(["会籍换用户", "任务换会籍", "任务已完成", "任务删除", "会籍删除"])("快照后%s拒绝旧归属或旧状态", async change => {
    const f = await fixture();
    const client = staleRead(async () => {
      if (change === "会籍换用户") { await db.instituteMember.delete({ where: { id: f.otherMemberId } }); return db.instituteMember.update({ where: { id: f.memberId }, data: { userId: f.otherId } }); }
      if (change === "任务换会籍") return db.instituteTask.update({ where: { id: f.taskId }, data: { memberId: f.otherMemberId } });
      if (change === "任务已完成") return service().completeTask(f.taskId, f.actorId);
      if (change === "任务删除") return db.instituteTask.delete({ where: { id: f.taskId } });
      return db.instituteMember.delete({ where: { id: f.memberId } });
    });
    await expect(service(client).completeTask(f.taskId, f.actorId)).rejects.toThrow();
    const member = await db.instituteMember.findUnique({ where: { id: f.memberId } });
    if (member) expect(member.tasksCompleted).toBe(change === "任务已完成" ? 1 : 0);
    expect((await db.instituteMember.findUnique({ where: { id: f.otherMemberId } }))?.tasksCompleted ?? 0).toBe(0);
  });
  it("同一任务两个真实待完成快照只有一次提交", async () => {
    const f = await fixture(); let arrived = 0, release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const client = staleRead(async () => { if (++arrived === 2) release(); await gate; });
    const results = await Promise.allSettled([service(client).completeTask(f.taskId, f.actorId), service(client).completeTask(f.taskId, f.actorId)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(1);
  });
  it("同一会籍不同任务并发完成不丢计数", async () => {
    const f = await fixture(); const second = await db.instituteTask.create({ data: { memberId: f.memberId, taskType: "SALON", title: "合成第二任务" } });
    await Promise.all([service().completeTask(f.taskId, f.actorId), service().completeTask(second.id, f.actorId)]);
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(2);
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    }
    throw new Error("未观测到任务完成真实锁等待");
  };
  it.each(["会籍换用户", "任务换会籍", "任务已完成"])("真实%s锁等待后拒绝旧快照", async change => {
    const f = await fixture(); if (change === "会籍换用户") await db.instituteMember.delete({ where: { id: f.otherMemberId } });
    let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      if (change === "会籍换用户") await tx.instituteMember.update({ where: { id: f.memberId }, data: { userId: f.otherId } });
      else await tx.instituteTask.update({ where: { id: f.taskId }, data: change === "任务换会籍" ? { memberId: f.otherMemberId } : { status: "COMPLETED" } });
      signal(); await gate;
    }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([service().completeTask(f.taskId, f.actorId)]);
    try { await waitFor(change === "会籍换用户" ? 'FROM "InstituteMember"' : 'FROM "InstituteTask"'); }
    finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected");
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(0);
  });
  const failingClient = (failure: string) => new Proxy(db, { get(target, key) {
    if (key === "$transaction") return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(async tx => {
      const wrapped = new Proxy(tx, { get(obj, prop) {
        const value = Reflect.get(obj, prop);
        if (prop === (failure === "任务写入" ? "instituteTask" : "instituteMember")) return new Proxy(value, { get(delegate, name) {
          const method = Reflect.get(delegate, name);
          if (name === "update" && failure !== "提交前") return async () => { throw new Error("合成事务失败"); };
          return typeof method === "function" ? method.bind(delegate) : method;
        } });
        return typeof value === "function" ? value.bind(obj) : value;
      } });
      const result = await work(wrapped); if (failure === "提交前") throw new Error("合成事务失败"); return result;
    });
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
  it.each(["任务写入", "计数写入", "提交前"])("%s异常时状态和计数一并回滚", async failure => {
    const f = await fixture(); await expect(service(failingClient(failure)).completeTask(f.taskId, f.actorId)).rejects.toThrow("合成事务失败"); await expectPending(f);
  });
  it("计数写入失败后可重试，成功后再次提交不重复计数", async () => {
    const f = await fixture(); await expect(service(failingClient("计数写入")).completeTask(f.taskId, f.actorId)).rejects.toThrow(); await expectPending(f);
    await service().completeTask(f.taskId, f.actorId); await expect(service().completeTask(f.taskId, f.actorId)).rejects.toThrow();
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(1);
  });
  it.each(["DISABLED", "BANNED"] as const)("任务快照后账号%s不能完成或计数", async status => {
    const f = await fixture(); const client = staleRead(() => db.user.update({ where: { id: f.actorId }, data: { status } }));
    await expect(service(client).completeTask(f.taskId, f.actorId)).rejects.toThrow("账号当前不可用"); await expectPending(f);
  });
  it("等待真实封禁行锁后拒绝旧鉴权的提交", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); signal(); await gate;
    }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([service().completeTask(f.taskId, f.actorId)]);
    try { await waitFor('FROM "User"'); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); await expectPending(f);
  });
  it("提交先取得账号锁时封禁等待提交结束，状态计数保持一致", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const client = new Proxy(db, { get(target, key) {
      if (key === "$transaction") return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(tx => work(new Proxy(tx, { get(obj, prop) {
        const value = Reflect.get(obj, prop);
        if (prop === "instituteTask") return new Proxy(value, { get(delegate, name) {
          const method = Reflect.get(delegate, name);
          if (name === "update") return async (...args: unknown[]) => { const result = await Reflect.apply(method, delegate, args); signal(); await gate; return result; };
          return typeof method === "function" ? method.bind(delegate) : method;
        } });
        return typeof value === "function" ? value.bind(obj) : value;
      } })), { timeout: 15000 });
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    const completion = service(client).completeTask(f.taskId, f.actorId);
    await Promise.race([ready, completion.then(() => { throw new Error("提交未在锁内暂停"); })]);
    const ban = db.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); const settled = Promise.allSettled([completion, ban]);
    try { await waitFor('UPDATE "public"."User"'); } finally { release(); }
    expect((await settled).every(r => r.status === "fulfilled")).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.actorId } })).status).toBe("BANNED");
    expect((await db.instituteTask.findUniqueOrThrow({ where: { id: f.taskId } })).status).toBe("COMPLETED");
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).tasksCompleted).toBe(1);
  });
});
