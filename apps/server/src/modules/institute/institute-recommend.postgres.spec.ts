import { setTimeout as sleep } from "node:timers/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteService } from "./institute.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || !["55462", "55477"].includes(u.port) || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("研究院推荐仅允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院推荐当前权限与真实事务", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const service = (client: unknown = db) => new InstituteService(client as PrismaService);
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成推荐管理者" } });
    const target = await db.user.create({ data: { nickname: "合成推荐目标" } });
    const outsider = await db.user.create({ data: { nickname: "合成其他身份" } });
    users.push(actor.id, target.id, outsider.id);
    const institute = await db.institute.create({ data: { name: "合成推荐院", adminUserId: actor.id } });
    const other = await db.institute.create({ data: { name: "合成其他院", adminUserId: outsider.id } });
    institutes.push(institute.id, other.id);
    const manager = await db.instituteMember.create({ data: { instituteId: institute.id, userId: actor.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } });
    const member = await db.instituteMember.create({ data: { instituteId: institute.id, userId: target.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    return { actorId: actor.id, targetId: target.id, outsiderId: outsider.id, instituteId: institute.id, otherId: other.id, managerId: manager.id, memberId: member.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const staleRead = (f: Fixture, change: () => Promise<unknown>) => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "instituteMember") return new Proxy(value, { get(delegate, name) {
      const method = Reflect.get(delegate, name);
      if (name === "findUnique") return async (...args: unknown[]) => {
        const snapshot = await Reflect.apply(method, delegate, args);
        if ((args[0] as { where: { id: string } }).where.id === f.memberId) await change();
        return snapshot;
      };
      return typeof method === "function" ? method.bind(delegate) : method;
    } });
    return typeof value === "function" ? value.bind(target) : value;
  } });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [identity] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`;
    expect([55462, 55477]).toContain(identity.port); expect(identity.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(identity.user).toBe("qa_voice");
  });
  afterEach(async () => {
    await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });

  it.each(["管理降级", "管理暂停", "管理改用户", "管理改院", "操作者DISABLED", "操作者BANNED", "目标DISABLED", "目标BANNED", "停院", "目标会籍暂停", "目标改用户", "目标改院"])("快照后%s不能使用旧权限或修改新身份", async change => {
    const f = await fixture();
    const client = staleRead(f, async () => {
      if (change === "管理降级") return db.instituteMember.update({ where: { id: f.managerId }, data: { role: "TYPE_A" } });
      if (change === "管理暂停") return db.instituteMember.update({ where: { id: f.managerId }, data: { status: "SUSPENDED" } });
      if (change === "管理改用户") return db.instituteMember.update({ where: { id: f.managerId }, data: { userId: f.outsiderId } });
      if (change === "管理改院") return db.instituteMember.update({ where: { id: f.managerId }, data: { instituteId: f.otherId } });
      if (change === "停院") return db.institute.update({ where: { id: f.instituteId }, data: { status: "CLOSED" } });
      if (change === "目标会籍暂停") return db.instituteMember.update({ where: { id: f.memberId }, data: { status: "SUSPENDED" } });
      if (change === "目标改用户") return db.instituteMember.update({ where: { id: f.memberId }, data: { userId: f.outsiderId } });
      if (change === "目标改院") return db.instituteMember.update({ where: { id: f.memberId }, data: { instituteId: f.otherId } });
      return db.user.update({ where: { id: change.startsWith("操作者") ? f.actorId : f.targetId }, data: { status: change.endsWith("BANNED") ? "BANNED" : "DISABLED" } });
    });
    await expect(service(client).recommendToTalentPool(f.actorId, f.memberId, "JUNIOR")).rejects.toThrow();
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).lecturerLevel).toBe("NONE");
  });
  const management = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"] as const;
  const levels = ["PREPARATORY", "JUNIOR", "SENIOR", "SIGNED"] as const;
  it.each(management.flatMap(actor => levels.map(target => [actor, target] as const)))("有效%s可推荐%s，保留会籍非讲师等级字段", async (actor, target) => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role: actor } });
    const before = await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } });
    const result = await service().recommendToTalentPool(f.actorId, f.memberId, target); expect(result.lecturerLevel).toBe(target);
    const after = await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } });
    const { lecturerLevel: _before, ...oldFields } = before, { lecturerLevel: _after, ...newFields } = after;
    expect(newFields).toEqual(oldFields);
  });
  it("不能推荐自己进入人才库", async () => {
    const f = await fixture(); await expect(service().recommendToTalentPool(f.actorId, f.managerId, "SIGNED")).rejects.toThrow("不能推荐自己");
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.managerId } })).lecturerLevel).toBe("NONE");
  });
  it.each(["TYPE_A", "TYPE_B", "INITIATOR"] as const)("非管理%s不可推荐", async role => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } });
    await expect(service().recommendToTalentPool(f.actorId, f.memberId, "SIGNED")).rejects.toThrow();
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).lecturerLevel).toBe("NONE");
  });
  it.each(["NONE", "PRESIDENT", "", "未知等级"])("拒绝非法推荐%s", async role => {
    const f = await fixture(); await expect(service().recommendToTalentPool(f.actorId, f.memberId, role)).rejects.toThrow();
  });
  it.each(["PENDING", "REJECTED", "GRADUATED", "SUSPENDED"])("非在册%s不能推荐", async status => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.memberId }, data: { status } });
    await expect(service().recommendToTalentPool(f.actorId, f.memberId, "SIGNED")).rejects.toThrow();
  });
  it("不能越院推荐", async () => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.memberId }, data: { instituteId: f.otherId } });
    await expect(service().recommendToTalentPool(f.actorId, f.memberId, "SIGNED")).rejects.toThrow();
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    }
    throw new Error("未观测到推荐真实行锁等待");
  };
  it.each(["管理降级", "目标暂停", "账号封禁", "停院"])("等待真实%s锁后拒绝撤销前的权限", async change => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      if (change === "管理降级") await tx.instituteMember.update({ where: { id: f.managerId }, data: { role: "TYPE_A" } });
      if (change === "目标暂停") await tx.instituteMember.update({ where: { id: f.memberId }, data: { status: "SUSPENDED" } });
      if (change === "账号封禁") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } });
      if (change === "停院") await tx.institute.update({ where: { id: f.instituteId }, data: { status: "CLOSED" } });
      signal(); await gate;
    }, { timeout: 15000 });
    await ready;
    const attempt = service().recommendToTalentPool(f.actorId, f.memberId, "JUNIOR");
    const settled = Promise.allSettled([attempt]);
    try { await waitFor(change === "账号封禁" ? 'FROM "User"' : change === "停院" ? 'FROM "Institute"' : 'FROM "InstituteMember"'); }
    finally { release(); await holder; }
    expect((await settled)[0].status).toBe("rejected");
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).lecturerLevel).toBe("NONE");
  });
  it("写入后异常完整回滚讲师等级", async () => {
    const f = await fixture();
    const client = new Proxy(db, { get(target, key) {
      if (key === "$transaction") return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(tx => work(new Proxy(tx, { get(obj, prop) {
        const value = Reflect.get(obj, prop);
        if (prop === "instituteMember") return new Proxy(value, { get(delegate, name) {
          const method = Reflect.get(delegate, name);
          if (name === "update") return async (...args: unknown[]) => { await Reflect.apply(method, delegate, args); throw new Error("合成提交前失败"); };
          return typeof method === "function" ? method.bind(delegate) : method;
        } });
        return typeof value === "function" ? value.bind(obj) : value;
      } })));
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(service(client).recommendToTalentPool(f.actorId, f.memberId, "SIGNED")).rejects.toThrow("合成提交前失败");
    expect((await db.instituteMember.findUniqueOrThrow({ where: { id: f.memberId } })).lecturerLevel).toBe("NONE");
  });
});
