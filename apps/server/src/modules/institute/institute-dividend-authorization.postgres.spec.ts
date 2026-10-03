import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, InstituteRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InstituteService } from "./institute.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { FundApprovalExecutor } from "../fund-approval/fund-approval.executor";
const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("分配权限仅允许本机合成库");
}
const methods = ["requestDividend", "createDividend"] as const;
type Method = typeof methods[number];
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院分配当前权限与待审占用事务", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const service = (client: unknown = db) => new InstituteService(client as PrismaService, new FundApprovalService(db as unknown as PrismaService));
  const fixture = async () => {
    const actor = await db.user.create({ data: { nickname: "合成分配管理者" } });
    const owner = await db.user.create({ data: { nickname: "合成分配对象" } });
    const other = await db.user.create({ data: { nickname: "合成其他用户" } }); users.push(actor.id, owner.id, other.id);
    const institute = await db.institute.create({ data: { name: "合成资金院", adminUserId: actor.id } });
    const otherInstitute = await db.institute.create({ data: { name: "合成其他资金院", adminUserId: other.id } }); institutes.push(institute.id, otherInstitute.id);
    const manager = await db.instituteMember.create({ data: { userId: actor.id, instituteId: institute.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } });
    const member = await db.instituteMember.create({ data: { userId: owner.id, instituteId: institute.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    const revenue = await db.instituteRevenue.create({ data: { instituteId: institute.id, sourceType: "MEMBERSHIP", amount: 1000, description: "合成验收值，无真实付款" } });
    return { actorId: actor.id, ownerId: owner.id, otherId: other.id, instituteId: institute.id, otherInstituteId: otherInstitute.id, managerId: manager.id, memberId: member.id, revenueId: revenue.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const dto = (f: Fixture) => ({ instituteId: f.instituteId, userId: f.ownerId, type: "TEACHER_AWARD", amount: 100, description: "合成分配", period: "2026-Q4" });
  const invoke = (method: Method, f: Fixture, client: unknown = db) => service(client)[method](f.actorId, dto(f));
  const empty = async () => { expect(await db.fundApproval.count()).toBe(0); expect(await db.instituteDividend.count()).toBe(0); expect(await db.userWallet.count()).toBe(0); };
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
    await db.fundApproval.deleteMany({ where: { requestedBy: { in: users } } });
    await db.instituteDividend.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.instituteRevenue.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.instituteMember.deleteMany({ where: { instituteId: { in: institutes } } });
    await db.institute.deleteMany({ where: { id: { in: institutes.splice(0) } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  it.each(methods.flatMap(method => (["PRESIDENT", "VICE_PRESIDENT", "SECRETARY_GENERAL"] as const).map(role => [method, role] as const)))("%s允许当前%s且保持审批与执行分离", async (method, role) => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); await invoke(method, f);
    if (method === "requestDividend") {
      const approval = await db.fundApproval.findFirstOrThrow(); expect(approval.status).toBe("PENDING"); expect(approval.requestedBy).toBe(f.actorId); expect(approval.payload).toMatchObject(dto(f)); expect(await db.instituteDividend.count()).toBe(0);
    } else {
      const dividend = await db.instituteDividend.findFirstOrThrow(); expect(dividend.instituteId).toBe(f.instituteId); expect(dividend.userId).toBe(f.ownerId); expect(Number(dividend.amount)).toBe(100); expect(await db.fundApproval.count()).toBe(0);
    }
    expect(await db.userWallet.count()).toBe(0);
  });
  const changes = ["账号停用", "账号封禁", "管理角色撤销", "管理会籍停用", "管理会籍换用户", "管理会籍换院", "管理会籍删除", "院停用", "目标账号封禁", "目标会籍停用", "目标会籍换用户", "目标会籍换院", "目标会籍删除"];
  const change = (f: Fixture, name: string) => {
    if (name === "账号停用" || name.endsWith("账号封禁") || name === "账号封禁") return db.user.update({ where: { id: name.startsWith("目标") ? f.ownerId : f.actorId }, data: { status: name === "账号停用" ? "DISABLED" : "BANNED" } });
    if (name === "院停用") return db.institute.update({ where: { id: f.instituteId }, data: { status: "SUSPENDED" } });
    const id = name.startsWith("目标") ? f.memberId : f.managerId;
    if (name.endsWith("删除")) return db.instituteMember.delete({ where: { id } });
    return db.instituteMember.update({ where: { id }, data: name.endsWith("撤销") ? { role: "TYPE_A" } : name.endsWith("停用") ? { status: "SUSPENDED" } : name.endsWith("换用户") ? { userId: f.otherId } : { instituteId: f.otherInstituteId } });
  };
  it.each(methods.flatMap(method => changes.map(name => [method, name] as const)))("%s快照后%s拒绝且不落记录", async (method, name) => {
    const f = await fixture(); await expect(invoke(method, f, beforeTransaction(() => change(f, name)))).rejects.toThrow(); await empty();
  });
  it.each(methods.flatMap(method => (["INITIATOR", "TYPE_A", "TYPE_B"] as InstituteRole[]).map(role => [method, role] as const)))("%s拒绝普通会籍%s", async (method, role) => {
    const f = await fixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role } }); await expect(invoke(method, f)).rejects.toThrow(); await empty();
  });
  it.each(methods)("%s保留合法管理者本人分配政策", async method => {
    const f = await fixture(); await service()[method](f.actorId, { ...dto(f), userId: f.actorId });
    if (method === "requestDividend") expect((await db.fundApproval.findFirstOrThrow()).payload).toMatchObject({ userId: f.actorId });
    else expect((await db.instituteDividend.findFirstOrThrow()).userId).toBe(f.actorId);
  });
  it.each(methods.flatMap(method => ["MGMT_BONUS", "TEACHER_AWARD", "OPERATION"].map(type => [method, type] as const)))("%s保留分配类型%s", async (method, type) => {
    const f = await fixture(); await service()[method](f.actorId, { ...dto(f), type });
    if (method === "requestDividend") expect((await db.fundApproval.findFirstOrThrow()).payload).toMatchObject({ type });
    else expect((await db.instituteDividend.findFirstOrThrow()).type).toBe(type);
  });
  it.each(methods.flatMap(method => ["无入账", "其他收入"].map(kind => [method, kind] as const)))("%s不从%s生成可分配余额", async (method, kind) => {
    const f = await fixture(); await db.instituteRevenue.update({ where: { id: f.revenueId }, data: kind === "无入账" ? { amount: 0 } : { sourceType: "COURSE" } }); await expect(invoke(method, f)).rejects.toThrow("余额不足"); await empty();
  });
  it.each(methods.flatMap(method => [0, -1, NaN, Infinity].map(amount => [method, amount] as const)))("%s拒绝非法金额%s", async (method, amount) => {
    const f = await fixture(); await expect(service()[method](f.actorId, { ...dto(f), amount })).rejects.toThrow(); await empty();
  });
  it.each(methods)("%s拒绝非法类型", async method => {
    const f = await fixture(); await expect(service()[method](f.actorId, { ...dto(f), type: "UNKNOWN" })).rejects.toThrow(); await empty();
  });
  it("申请余额扣除已有分配和本院待审占用", async () => {
    const f = await fixture(); await db.instituteDividend.create({ data: { ...dto(f), amount: 100 } });
    await new FundApprovalService(db as unknown as PrismaService).create({ type: "DIVIDEND", payload: dto(f), amount: 350, summary: "合成占用", requestedBy: f.actorId });
    await expect(invoke("requestDividend", f)).rejects.toThrow("余额不足"); expect(await db.fundApproval.count()).toBe(1); expect(await db.instituteDividend.count()).toBe(1);
  });
  it("执行时重新核验已确认分配余额", async () => {
    const f = await fixture(); await db.instituteDividend.create({ data: { ...dto(f), amount: 450 } }); await expect(invoke("createDividend", f)).rejects.toThrow("余额不足"); expect(await db.instituteDividend.count()).toBe(1); expect(await db.fundApproval.count()).toBe(0);
  });
  it("两笔真实并发申请只能有一笔占用300，不超500余额", async () => {
    const f = await fixture(); let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; }); const client = beforeTransaction(async () => { if (++arrived === 2) release(); await gate; });
    const results = await Promise.allSettled([service(client).requestDividend(f.actorId, { ...dto(f), amount: 300 }), service(client).requestDividend(f.actorId, { ...dto(f), amount: 300 })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1); const approvals = await db.fundApproval.findMany(); expect(approvals).toHaveLength(1); expect(Number(approvals[0].amount)).toBe(300); expect(await db.instituteDividend.count()).toBe(0);
  });
  it.each(methods)("%s真实写入后故障，实际资金服务也随事务回滚", async method => {
    const f = await fixture(); const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => { await callback(tx); throw new Error("合成提交前故障"); }, options]);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(invoke(method, f, client)).rejects.toThrow("合成提交前故障"); await empty(); await invoke(method, f); expect(method === "requestDividend" ? await db.fundApproval.count() : await db.instituteDividend.count()).toBe(1);
  });
  const waitFor = async (part: string) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${part})>0`;
      if (row.n > 0n) return; await sleep(10);
    }
    throw new Error("未观测到分配权限真实行锁等待");
  };
  it.each(methods.flatMap(method => ["管理角色撤销", "账号封禁", "目标会籍停用", "院停用"].map(name => [method, name] as const)))("%s真实%s锁等待后拒绝", async (method, name) => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const holder = db.$transaction(async tx => {
      if (name === "院停用") await tx.institute.update({ where: { id: f.instituteId }, data: { status: "SUSPENDED" } });
      else if (name === "账号封禁") await tx.user.update({ where: { id: f.actorId }, data: { status: "BANNED" } });
      else await tx.instituteMember.update({ where: { id: name.startsWith("目标") ? f.memberId : f.managerId }, data: name === "管理角色撤销" ? { role: "TYPE_A" } : { status: "SUSPENDED" } });
      signal(); await gate;
    }, { timeout: 15000 });
    await ready; const attempt = Promise.allSettled([invoke(method, f)]);
    try { await waitFor(`FROM "${name === "院停用" ? "Institute" : name === "账号封禁" ? "User" : "InstituteMember"}"`); } finally { release(); await holder; }
    expect((await attempt)[0].status).toBe("rejected"); await empty();
  });
  it.each(methods)("%s先持管理会籍共享锁，撤权等待提交后生效", async method => {
    const f = await fixture(); let signal!: () => void, release!: () => void;
    const ready = new Promise<void>(r => { signal = r; }), gate = new Promise<void>(r => { release = r; });
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => { const result = await callback(tx); signal(); await gate; return result; }, { ...(options as object), timeout: 15000 }]);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const first = invoke(method, f, client); await ready; const revoke = Promise.allSettled([db.instituteMember.update({ where: { id: f.managerId }, data: { role: "TYPE_A" } })]);
    try { await waitFor('UPDATE "public"."InstituteMember"'); } finally { release(); await first; }
    expect((await revoke)[0].status).toBe("fulfilled"); expect(method === "requestDividend" ? await db.fundApproval.count() : await db.instituteDividend.count()).toBe(1); await expect(invoke(method, f)).rejects.toThrow();
  });
  it("其他院待审占用不扣本院余额", async () => {
    const f = await fixture(); await new FundApprovalService(db as unknown as PrismaService).create({ type: "DIVIDEND", payload: { ...dto(f), instituteId: f.otherInstituteId }, amount: 500, summary: "合成其他院占用", requestedBy: f.otherId }); await invoke("requestDividend", f); expect(await db.fundApproval.count()).toBe(2);
  });
  it.each(methods)("%s允许管理角色之间变更后继续", async method => {
    const f = await fixture(); await invoke(method, f, beforeTransaction(() => db.instituteMember.update({ where: { id: f.managerId }, data: { role: "SECRETARY_GENERAL" } })));
  });
  it("两笔真实并发执行保留可串行化余额防超发", async () => {
    const f = await fixture(); let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; }); const client = beforeTransaction(async () => { if (++arrived === 2) release(); await gate; });
    const results = await Promise.allSettled([service(client).createDividend(f.actorId, { ...dto(f), amount: 400 }), service(client).createDividend(f.actorId, { ...dto(f), amount: 400 })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1); const records = await db.instituteDividend.findMany(); expect(records).toHaveLength(1); expect(Number(records[0].amount)).toBe(400); expect(await db.fundApproval.count()).toBe(0);
  });
  const executor = (client: unknown = db) => new FundApprovalExecutor(new FundApprovalService(client as PrismaService), service(client), undefined!, undefined!, undefined!, undefined!, undefined!, undefined!);
  const approvalFixture = async (amount = 100) => {
    const f = await fixture(); await db.userRole.create({ data: { userId: f.otherId, roleType: "FINANCE_ADMIN" } });
    const submitted = await service().requestDividend(f.actorId, { ...dto(f), amount }); return { ...f, approvalId: submitted.approvalId };
  };
  it("实际审批执行器合法通过一次，再次审核不能重复分配", async () => {
    const f = await approvalFixture(); expect((await executor().review(f.approvalId, true, undefined, f.otherId)).approved).toBe(true);
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("APPROVED"); expect(await db.instituteDividend.count()).toBe(1);
    await expect(executor().review(f.approvalId, true, undefined, f.otherId)).rejects.toThrow("已处理"); expect(await db.instituteDividend.count()).toBe(1); expect(await db.userWallet.count()).toBe(0);
  });
  it("实际审批执行器在发起人撤权后退回待审，恢复权限再重试一次", async () => {
    const f = await approvalFixture(); await db.instituteMember.update({ where: { id: f.managerId }, data: { role: "TYPE_A" } });
    await expect(executor().review(f.approvalId, true, "合成审核", f.otherId)).rejects.toThrow();
    const pending = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } }); expect(pending.status).toBe("PENDING"); expect(pending.reviewedBy).toBeNull(); expect(pending.reviewNote).toBeNull(); expect(pending.processedAt).toBeNull(); expect(await db.instituteDividend.count()).toBe(0);
    await db.instituteMember.update({ where: { id: f.managerId }, data: { role: "PRESIDENT" } }); await executor().review(f.approvalId, true, undefined, f.otherId); expect(await db.fundApproval.count()).toBe(1); expect(await db.instituteDividend.count()).toBe(1);
  });
  it("实际审批执行器执行写入后故障回滚分配并退待审，合法重试一次", async () => {
    const f = await approvalFixture(); const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => { await callback(tx); throw new Error("合成执行写入后故障"); }, options]);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(executor(client).review(f.approvalId, true, undefined, f.otherId)).rejects.toThrow("合成执行写入后故障"); expect(await db.instituteDividend.count()).toBe(0); expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("PENDING");
    await executor().review(f.approvalId, true, undefined, f.otherId); expect(await db.instituteDividend.count()).toBe(1); expect(await db.userWallet.count()).toBe(0);
  });
  it("实际审批执行器保留禁止自己审批本人申请", async () => {
    const f = await approvalFixture(); await db.userRole.create({ data: { userId: f.actorId, roleType: "FINANCE_ADMIN" } }); await expect(executor().review(f.approvalId, true, undefined, f.actorId)).rejects.toThrow("不能审批自己"); expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("PENDING"); expect(await db.instituteDividend.count()).toBe(0);
  });


  it.each([[false, false], [false, true], [true, false], [true, true]])("实际审批执行器写入后屏障=%s故障=%s时保持余额占用且共同提交回滚", async (afterWrite, failure) => {
    const f = await approvalFixture(400);
    let ready!: () => void, release!: () => void;
    const reached = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const pause = async () => { ready(); await gate; if (failure) throw new Error("合成审批事务屏障故障"); };
    const local = service();
    const blocked = new Proxy(local, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "createDividend") return async (...args: unknown[]) => {
        if (!afterWrite) await pause();
        const result = await Reflect.apply(value, target, args);
        if (afterWrite) await pause();
        return result;
      };
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const review = new FundApprovalExecutor(new FundApprovalService(db as unknown as PrismaService), blocked, undefined!, undefined!, undefined!, undefined!, undefined!, undefined!);
    const operation = Promise.allSettled([review.review(f.approvalId, true, undefined, f.otherId)]);
    let competing: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try {
      await reached;
      // 独立连接仍看到待审；审批与业务写入尚未提交，不能把占用提前释放。
      expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("PENDING");
      if (!afterWrite) expect((await service().getFinanceOverview(f.actorId)).remaining).toBe(100);
      competing = Promise.allSettled([service().requestDividend(f.actorId, { ...dto(f), amount: 400 })]);
      if (afterWrite) await waitFor('FROM "Institute"');
      else expect((await competing)[0].status).toBe("rejected");
    } finally { release(); }
    expect((await operation)[0].status).toBe(failure ? "rejected" : "fulfilled");
    expect((await competing!)[0].status).toBe("rejected");
    expect(await db.fundApproval.count()).toBe(1);
    expect(await db.instituteDividend.count()).toBe(failure ? 0 : 1);
    const current = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } });
    expect(current.status).toBe(failure ? "PENDING" : "APPROVED");
    if (failure) {
      expect(current.reviewedBy).toBeNull(); expect(current.reviewNote).toBeNull(); expect(current.processedAt).toBeNull();
      await executor().review(f.approvalId, true, undefined, f.otherId);
    }
    expect(await db.instituteDividend.count()).toBe(1);
    expect(Number((await db.instituteDividend.findFirstOrThrow()).amount)).toBe(400);
    expect((await service().getFinanceOverview(f.actorId)).remaining).toBe(100);
    expect(await db.userWallet.count()).toBe(0);
  });
  it("同一审批真实并发审核只共同提交一笔分配", async () => {
    const f = await approvalFixture(400);
    const results = await Promise.allSettled([executor().review(f.approvalId, true, undefined, f.otherId), executor().review(f.approvalId, true, undefined, f.otherId)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(await db.instituteDividend.count()).toBe(1);
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("APPROVED");
    expect(await db.userWallet.count()).toBe(0);
  });

});
