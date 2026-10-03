import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, RoleType } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RolesGuard } from "../../common/roles.guard";
import { InstituteService } from "./institute.service";
import { InstituteController } from "./institute.controller";
import { InstituteAssessmentService } from "./institute-assessment.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("后台写权限仅允许本机合成库");
}
const methods = ["createTaskTemplate", "updateTaskTemplate", "updateMember", "updateLecturerLevel", "addTask", "updateEvent"] as const;
type Method = typeof methods[number];
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院后台写入口当前权限与真实事务", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [], templates: string[] = [];
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成后台管理员" } });
    const owner = await db.user.create({ data: { nickname: "合成会籍用户" } });
    const other = await db.user.create({ data: { nickname: "合成其他用户" } }); users.push(actor.id, owner.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成后台院", adminUserId: actor.id } });
    const otherInstitute = await db.institute.create({ data: { name: "合成其他院", adminUserId: other.id } }); institutes.push(institute.id, otherInstitute.id);
    const member = await db.instituteMember.create({ data: { instituteId: institute.id, userId: owner.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    const role = await db.userRole.create({ data: { userId: actor.id, roleType: "OPERATION_ADMIN" } });
    const template = await db.instituteTaskTemplate.create({ data: { taskType: "ARTICLE", title: "合成原模板" } }); templates.push(template.id);
    const event = await db.instituteEvent.create({ data: { instituteId: institute.id, lecturerId: owner.id, title: "合成原活动", type: "SALON", scheduleAt: new Date() } });
    return { actorId: actor.id, ownerId: owner.id, otherId: other.id, instituteId: institute.id, otherInstituteId: otherInstitute.id, memberId: member.id, roleId: role.id, templateId: template.id, eventId: event.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const hook = () => ({ awardEventPointsForCompletedEvent: jest.fn().mockResolvedValue(null) });
  const service = (client: unknown = db, assessment = hook()) => new InstituteService(client as PrismaService, undefined, undefined, assessment as unknown as InstituteAssessmentService);
  const invoke = async (method: Method, f: Fixture, client: unknown = db, actorId = f.actorId, assessment = hook()) => {
    const controller = new InstituteController(service(client, assessment), undefined!, undefined!, undefined!);
    const req = { user: { id: actorId } } as unknown as Parameters<InstituteController["addTask"]>[2];
    if (method === "createTaskTemplate") {
      const result = await controller.createTaskTemplate({ taskType: "ARTICLE", title: "合成新模板" }, req); templates.push(result.id); return result;
    }
    if (method === "updateTaskTemplate") return controller.updateTaskTemplate(f.templateId, { taskType: "ARTICLE", title: "合成新模板" }, req);
    if (method === "updateMember") return controller.updateMember(f.memberId, { tasksRequired: 7 }, req);
    if (method === "updateLecturerLevel") return controller.updateLecturerLevel(f.memberId, { lecturerLevel: "SIGNED" }, req);
    if (method === "addTask") return controller.addTask(f.memberId, { taskType: "ARTICLE", title: "合成新任务" }, req);
    return controller.updateEvent(f.eventId, { title: "合成新活动" }, req);
  };
  const state = async (f: Fixture) => ({
    member: await db.instituteMember.findUnique({ where: { id: f.memberId } }),
    event: await db.instituteEvent.findUnique({ where: { id: f.eventId } }),
    template: await db.instituteTaskTemplate.findUnique({ where: { id: f.templateId } }),
    taskCount: await db.instituteTask.count({ where: { memberId: f.memberId } }),
    templateCount: await db.instituteTaskTemplate.count(),
  });
  const beforeTransaction = (change: () => Promise<unknown>) => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "$transaction") return async (...args: unknown[]) => { await change(); return Reflect.apply(value, target, args); };
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const snapshotGuard = async (method: Method, f: Fixture) => {
    const roles = (await db.userRole.findMany({ where: { userId: f.actorId } })).map(r => r.roleType);
    expect(Reflect.getMetadata("roles", InstituteController.prototype[method])).toEqual(["SUPER_ADMIN", "OPERATION_ADMIN"]);
    expect(new RolesGuard(new Reflector()).canActivate({ getHandler: () => InstituteController.prototype[method], getClass: () => InstituteController, switchToHttp: () => ({ getRequest: () => ({ user: { id: f.actorId, roles } }) }) } as unknown as ExecutionContext)).toBe(true);
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [id] = await db.$queryRaw<Array<{ port: number; db: string; user: string }>>`SELECT inet_server_port() AS port, current_database() AS db, current_user AS "user"`;
    expect(id.port).toBe(55477); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true); expect(id.user).toBe("qa_voice");
  });
  afterEach(async () => {
    await db.instituteEvent.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } });
    await db.instituteTaskTemplate.deleteMany({ where: { id: { in: templates.splice(0) } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  it.each(methods.flatMap(method => (["SUPER_ADMIN", "OPERATION_ADMIN"] as const).map(role => [method, role] as const)))("%s允许当前%s且身份来自请求", async (method, role) => {
    const f = await fixture(); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } }); await snapshotGuard(method, f);
    await invoke(method, f); const after = await state(f);
    if (method === "createTaskTemplate") expect(after.templateCount).toBe(2);
    if (method === "updateTaskTemplate") expect(after.template?.title).toBe("合成新模板");
    if (method === "updateMember") expect(after.member?.tasksRequired).toBe(7);
    if (method === "updateLecturerLevel") expect(after.member?.lecturerLevel).toBe("SIGNED");
    if (method === "addTask") expect(after.taskCount).toBe(1);
    if (method === "updateEvent") expect(after.event?.title).toBe("合成新活动");
    expect(after.member?.userId).toBe(f.ownerId); expect(after.member?.tasksCompleted).toBe(0);
  });
  it.each(methods)("%s真实守卫缓存通过后角色删除拒绝写入", async method => {
    const f = await fixture(); await snapshotGuard(method, f); const before = await state(f); await db.userRole.delete({ where: { id: f.roleId } });
    await expect(invoke(method, f)).rejects.toThrow("平台权限不足"); expect(await state(f)).toEqual(before);
  });
  it.each(methods)("%s没有当前平台角色拒绝", async method => {
    const f = await fixture(); await db.userRole.delete({ where: { id: f.roleId } }); const before = await state(f);
    await expect(invoke(method, f)).rejects.toThrow(); expect(await state(f)).toEqual(before);
  });
  it.each(methods.flatMap(method => (["DISABLED", "BANNED"] as const).map(status => [method, status] as const)))("%s快照后账号%s拒绝", async (method, status) => {
    const f = await fixture(); const before = await state(f); await snapshotGuard(method, f);
    const client = beforeTransaction(() => db.user.update({ where: { id: f.actorId }, data: { status } }));
    await expect(invoke(method, f, client)).rejects.toThrow("账号当前不可用"); expect(await state(f)).toEqual(before);
  });
  it.each(Object.values(RoleType).filter(r => r !== "SUPER_ADMIN" && r !== "OPERATION_ADMIN").map((role, i) => [methods[i % methods.length], role] as const))("%s拒绝其他平台角色%s", async (method, role) => {
    const f = await fixture(); await db.userRole.update({ where: { id: f.roleId }, data: { roleType: role } }); const before = await state(f);
    await expect(invoke(method, f)).rejects.toThrow("平台权限不足"); expect(await state(f)).toEqual(before);
  });
  it.each(methods.flatMap(method => ["角色降级", "角色改属"].map(change => [method, change] as const)))("%s事务前%s拒绝", async (method, change) => {
    const f = await fixture(); const before = await state(f);
    const client = beforeTransaction(() => db.userRole.update({ where: { id: f.roleId }, data: change === "角色降级" ? { roleType: "FINANCE_ADMIN" } : { userId: f.otherId } }));
    await expect(invoke(method, f, client)).rejects.toThrow(); expect(await state(f)).toEqual(before);
  });
  it.each(methods)("%s保留另一允许角色时仍可提交", async method => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.actorId, roleType: "SUPER_ADMIN" } });
    await invoke(method, f, beforeTransaction(() => db.userRole.delete({ where: { id: f.roleId } })));
  });
  it.each(methods)("%s真实写入后故障整体回滚", async method => {
    const f = await fixture(); const before = await state(f);
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>) => db.$transaction(async tx => { await callback(tx); throw new Error("合成提交前故障"); });
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(invoke(method, f, client)).rejects.toThrow("合成提交前故障"); expect(await state(f)).toEqual(before);
  });
  it.each((["updateMember", "updateLecturerLevel", "addTask"] as const).flatMap(method => ["换用户", "换院"].map(change => [method, change] as const)))("%s快照后会籍%s不能误改新身份", async (method, change) => {
    const f = await fixture(); const client = beforeTransaction(() => db.instituteMember.update({ where: { id: f.memberId }, data: change === "换用户" ? { userId: f.otherId } : { instituteId: f.otherInstituteId } }));
    await expect(invoke(method, f, client)).rejects.toThrow("会籍身份已变化");
    const after = await state(f); expect(after.member?.tasksRequired).toBe(3); expect(after.member?.lecturerLevel).toBe("NONE"); expect(after.taskCount).toBe(0);
  });
  it.each(["换讲师", "换院"])("活动快照后%s拒绝", async change => {
    const f = await fixture(); const client = beforeTransaction(() => db.instituteEvent.update({ where: { id: f.eventId }, data: change === "换讲师" ? { lecturerId: f.otherId } : { instituteId: f.otherInstituteId } }));
    await expect(invoke("updateEvent", f, client)).rejects.toThrow("活动归属已变化"); expect((await state(f)).event?.title).toBe("合成原活动");
  });
  it.each(["updateTaskTemplate", "updateMember", "updateLecturerLevel", "addTask", "updateEvent"] as const)("%s快照后目标删除拒绝", async method => {
    const f = await fixture(); const client = beforeTransaction(() => method === "updateTaskTemplate" ? db.instituteTaskTemplate.delete({ where: { id: f.templateId } }) : method === "updateEvent" ? db.instituteEvent.delete({ where: { id: f.eventId } }) : db.instituteMember.delete({ where: { id: f.memberId } }));
    await expect(invoke(method, f, client)).rejects.toThrow(); expect(await db.instituteTask.count()).toBe(0);
  });
  it.each(["PENDING", "REJECTED", "GRADUATED", "SUSPENDED"])("保留平台管理对%s会籍的编辑政策", async status => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.memberId }, data: { status } });
    for (const method of ["updateMember", "updateLecturerLevel", "addTask"] as const) await invoke(method, f);
    const after = await state(f); expect(after.member?.status).toBe(status); expect(after.member?.tasksRequired).toBe(7); expect(after.taskCount).toBe(1);
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    }
    throw new Error("未观测到后台写入真实行锁等待");
  };
  it.each(methods)("%s真实角色写锁等待后撤权拒绝", async method => {
    const f = await fixture(); const before = await state(f); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => { await tx.userRole.update({ where: { id: f.roleId }, data: { roleType: "FINANCE_ADMIN" } }); signal(); await gate; }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([invoke(method, f)]);
    try { await waitFor('FROM "UserRole"'); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); expect(await state(f)).toEqual(before);
  });
  it("真实账号封禁锁等待后不添加任务", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => { await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } }); signal(); await gate; }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([invoke("addTask", f)]);
    try { await waitFor('FROM "User"'); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); expect((await state(f)).taskCount).toBe(0);
  });
  it("写入先持有角色共享锁，撤权真实等待到提交后", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>) => db.$transaction(async tx => { const result = await callback(tx); signal(); await gate; return result; }, { timeout: 15000 });
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const first = invoke("updateMember", f, client); await ready;
    const revoke = db.userRole.update({ where: { id: f.roleId }, data: { roleType: "FINANCE_ADMIN" } }); const settled = Promise.allSettled([revoke]);
    try { await waitFor('UPDATE "public"."UserRole"'); } finally { release(); await first; }
    expect((await settled)[0].status).toBe("fulfilled"); expect((await state(f)).member?.tasksRequired).toBe(7);
    await expect(invoke("updateMember", f)).rejects.toThrow();
  });
  it("真实会籍身份写锁等待后拒绝旧目标", async () => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => { await tx.instituteMember.update({ where: { id: f.memberId }, data: { userId: f.otherId } }); signal(); await gate; }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([invoke("updateLecturerLevel", f)]);
    try { await waitFor('FROM "InstituteMember"'); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); expect((await state(f)).member?.lecturerLevel).toBe("NONE");
  });
  it("两个真实活动快照并发完成只触发一次记分挂点", async () => {
    const f = await fixture(); let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; }); const assessment = hook();
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "instituteEvent") return new Proxy(value, { get(delegate, name) {
        const fn = Reflect.get(delegate, name);
        if (name === "findUnique") return async (...args: unknown[]) => { const snapshot = await Reflect.apply(fn, delegate, args); if (++arrived === 2) release(); await gate; return snapshot; };
        return typeof fn === "function" ? fn.bind(delegate) : fn;
      } });
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const svc = service(client, assessment); const results = await Promise.all([svc.updateEvent(f.eventId, { status: "COMPLETED" }, f.actorId), svc.updateEvent(f.eventId, { status: "COMPLETED" }, f.actorId)]);
    expect(results.every(r => r.status === "COMPLETED")).toBe(true); expect(assessment.awardEventPointsForCompletedEvent).toHaveBeenCalledTimes(1);
  });
  it("活动权限拒绝不调用记分挂点", async () => {
    const f = await fixture(); await db.userRole.delete({ where: { id: f.roleId } }); const assessment = hook();
    await expect(service(db, assessment).updateEvent(f.eventId, { status: "COMPLETED" }, f.actorId)).rejects.toThrow(); expect(assessment.awardEventPointsForCompletedEvent).not.toHaveBeenCalled(); expect((await state(f)).event?.status).toBe("SCHEDULED");
  });
});
