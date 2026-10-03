import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, InstituteRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteService } from "./institute.service";
const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("活动创建仅允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院活动创建当前管理权限与讲师归属", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const service = (client: unknown = db) => new InstituteService(client as PrismaService);
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成活动管理者" } });
    const owner = await db.user.create({ data: { nickname: "合成活动讲师" } });
    const other = await db.user.create({ data: { nickname: "合成其他用户" } }); users.push(actor.id, owner.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成活动院", adminUserId: actor.id } });
    const otherInstitute = await db.institute.create({ data: { name: "合成其他院", adminUserId: other.id } }); institutes.push(institute.id, otherInstitute.id);
    const manager = await db.instituteMember.create({ data: { userId: actor.id, instituteId: institute.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } });
    const lecturer = await db.instituteMember.create({ data: { userId: owner.id, instituteId: institute.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    return { actorId: actor.id, ownerId: owner.id, otherId: other.id, instituteId: institute.id, otherInstituteId: otherInstitute.id, managerId: manager.id, lecturerId: lecturer.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const dto = (f: Fixture) => ({ title: "合成新活动", type: "SALON", lecturerId: f.ownerId, scheduleAt: "2026-10-03T12:00:00.000Z", description: "合成描述", location: "合成地点", maxAttendees: 25 });
  const beforeTransaction = (change: () => Promise<unknown>) => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "$transaction") return async (...args: unknown[]) => { await change(); return Reflect.apply(value, target, args); };
    return typeof value === "function" ? value.bind(target) : value;
  } });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [id] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`;
    expect(id.port).toBe(55477); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(id.user).toBe("qa_voice");
  });
  afterEach(async () => {
    await db.instituteEvent.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  it.each((["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"] as const).flatMap(role => [true, false].map(hasLecturer => [role, hasLecturer] as const)))("当前%s管理者可创建，指定讲师=%s", async (role, hasLecturer) => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } });
    const input = { ...dto(f), lecturerId: hasLecturer ? f.ownerId : undefined }; const result = await service().createEvent(f.actorId, input);
    expect(result.instituteId).toBe(f.instituteId); expect(result.lecturerId).toBe(hasLecturer ? f.ownerId : null); expect(result.status).toBe("SCHEDULED"); expect(result.maxAttendees).toBe(25); expect(result.description).toBe(input.description); expect(result.scheduleAt.toISOString()).toBe(input.scheduleAt);
  });
  it.each(["INITIATOR", "TYPE_A", "TYPE_B"] as InstituteRole[])("普通会籍%s不能创建", async role => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); await expect(service().createEvent(f.actorId, dto(f))).rejects.toThrow(); expect(await db.instituteEvent.count()).toBe(0);
  });
  it("有管理权限的本人可担任讲师，默认人数保持50", async () => {
    const f = await fixture(); const result = await service().createEvent(f.actorId, { ...dto(f), lecturerId: f.actorId, maxAttendees: undefined }); expect(result.lecturerId).toBe(f.actorId); expect(result.maxAttendees).toBe(50);
  });
  it("请求中其他院归属拒绝", async () => {
    const f = await fixture(); await expect(service().createEvent(f.actorId, { ...dto(f), instituteId: f.otherInstituteId })).rejects.toThrow("本研究院"); expect(await db.instituteEvent.count()).toBe(0);
  });
  it.each(["非法类型", "非法日期"])("%s保留原参数校验", async invalid => {
    const f = await fixture(); await expect(service().createEvent(f.actorId, { ...dto(f), ...(invalid === "非法类型" ? { type: "UNKNOWN" } : { scheduleAt: "invalid" }) })).rejects.toThrow(); expect(await db.instituteEvent.count()).toBe(0);
  });
  it("不存在或非本院在册讲师拒绝", async () => {
    const f = await fixture(); await expect(service().createEvent(f.actorId, { ...dto(f), lecturerId: f.otherId })).rejects.toThrow("在册成员"); expect(await db.instituteEvent.count()).toBe(0);
  });
  const changes = ["账号封禁", "管理角色撤销", "管理会籍停用", "管理会籍换用户", "管理会籍换院", "院停用", "讲师会籍停用", "讲师账号封禁", "讲师会籍换用户", "管理会籍删除", "讲师会籍删除", "讲师会籍换院", "管理账号删除", "讲师账号删除"];
  const change = (f: Fixture, name: string) => {
    if (name === "账号封禁" || name === "讲师账号封禁") return db.user.update({ where: { id: name === "账号封禁" ? f.actorId : f.ownerId }, data: { status: "BANNED" } });
    if (name.endsWith("账号删除")) return db.user.delete({ where: { id: name === "管理账号删除" ? f.actorId : f.ownerId } });
    if (name === "院停用") return db.institute.update({ where: { id: f.instituteId }, data: { status: "SUSPENDED" } });
    const id = name.startsWith("讲师") ? f.lecturerId : f.managerId;
    if (name.endsWith("删除")) return db.instituteMember.delete({ where: { id } });
    return db.instituteMember.update({ where: { id }, data: name.endsWith("撤销") ? { role: "TYPE_A" } : name.endsWith("停用") ? { status: "SUSPENDED" } : name.endsWith("换用户") ? { userId: f.otherId } : { instituteId: f.otherInstituteId } });
  };
  it.each(changes)("快照后%s不能创建", async name => {
    const f = await fixture(); await expect(service(beforeTransaction(() => change(f, name))).createEvent(f.actorId, dto(f))).rejects.toThrow(); expect(await db.instituteEvent.count()).toBe(0);
  });
  it.each(["DISABLED", "BANNED"] as const)("当前管理账号%s拒绝", async status => {
    const f = await fixture(); await db.user.update({ where: { id: f.actorId }, data: { status } }); await expect(service().createEvent(f.actorId, dto(f))).rejects.toThrow("账号当前不可用"); expect(await db.instituteEvent.count()).toBe(0);
  });
  it.each(["NONE", "PREPARATORY", "JUNIOR", "SENIOR", "SIGNED"])("保留在册讲师等级%s可选政策", async lecturerLevel => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.lecturerId }, data: { lecturerLevel } }); expect((await service().createEvent(f.actorId, dto(f))).lecturerId).toBe(f.ownerId);
  });
  it.each(["SALON", "LIVE", "COURSE"])("保留活动类型%s", async type => {
    const f = await fixture(); expect((await service().createEvent(f.actorId, { ...dto(f), type })).type).toBe(type);
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    }
    throw new Error("未观测到活动创建真实行锁等待");
  };
  it.each(["管理角色撤销", "账号封禁", "院停用", "讲师账号封禁", "讲师会籍停用", "管理会籍换用户"])("真实%s行锁等待后拒绝", async name => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      if (name === "院停用") await tx.institute.update({ where: { id: f.instituteId }, data: { status: "SUSPENDED" } });
      else if (name === "账号封禁" || name === "讲师账号封禁") await tx.user.update({ where: { id: name === "账号封禁" ? f.actorId : f.ownerId }, data: { status: "BANNED" } });
      else await tx.instituteMember.update({ where: { id: name.startsWith("讲师") ? f.lecturerId : f.managerId }, data: name === "管理角色撤销" ? { role: "TYPE_A" } : name === "管理会籍换用户" ? { userId: f.otherId } : { status: "SUSPENDED" } });
      signal(); await gate;
    }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([service().createEvent(f.actorId, dto(f))]);
    const table = name === "院停用" ? "Institute" : name.includes("账号") ? "User" : "InstituteMember";
    try { await waitFor(`FROM "${table}"`); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); expect(await db.instituteEvent.count()).toBe(0);
  });
  it("创建先持有管理会籍共享锁，撤权真实等待至创建提交", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>) => db.$transaction(async tx => { const result = await callback(tx); signal(); await gate; return result; }, { timeout: 15000 });
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const first = service(client).createEvent(f.actorId, dto(f)); await ready;
    const revoke = Promise.allSettled([db.instituteMember.update({ where: { id: f.managerId }, data: { role: "TYPE_A" } })]);
    try { await waitFor('UPDATE "public"."InstituteMember"'); } finally { release(); await first; }
    expect((await revoke)[0].status).toBe("fulfilled"); expect(await db.instituteEvent.count()).toBe(1); await expect(service().createEvent(f.actorId, dto(f))).rejects.toThrow();
  });
  it("真实创建后故障回滚，合法重试仅留一条活动", async () => {
    const f = await fixture(); const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>) => db.$transaction(async tx => { await callback(tx); throw new Error("合成提交前故障"); });
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(service(client).createEvent(f.actorId, dto(f))).rejects.toThrow("合成提交前故障"); expect(await db.instituteEvent.count()).toBe(0); await service().createEvent(f.actorId, dto(f)); expect(await db.instituteEvent.count()).toBe(1);
  });
  it("两个管理者互选讲师并发创建，排序锁避免相反顺序", async () => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.lecturerId }, data: { role: "VICE_PRESIDENT" } });
    let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; });
    const client = beforeTransaction(async () => { if (++arrived === 2) release(); await gate; });
    const results = await Promise.all([service(client).createEvent(f.actorId, dto(f)), service(client).createEvent(f.ownerId, { ...dto(f), lecturerId: f.actorId })]);
    expect(results).toHaveLength(2); expect(await db.instituteEvent.count()).toBe(2);
  });
  it("快照后仍为另一允许管理角色保持可创建", async () => {
    const f = await fixture(); const client = beforeTransaction(() => db.instituteMember.update({ where: { id: f.managerId }, data: { role: "SECRETARY_GENERAL" } })); expect((await service(client).createEvent(f.actorId, dto(f))).instituteId).toBe(f.instituteId);
  });
});
