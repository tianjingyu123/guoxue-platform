import { Prisma, PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { GrowthService } from "./growth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55462" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("入圈审批只允许指定合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("入圈审批状态成员人数通知真实事务", () => {
  let db: PrismaClient;
  const users: string[] = [], circles: string[] = [], requests: string[] = [];
  const service = (client: unknown = db, notification?: unknown) => new GrowthService(client as PrismaService, notification as NotificationService | undefined);
  const fixture = async () => {
    const owner = await db.user.create({ data: { nickname: "合成审批圈主" } }), user = await db.user.create({ data: { nickname: "合成申请人" } }); users.push(owner.id, user.id);
    const circle = await db.circle.create({ data: { name: "合成审批圈", intro: "仅隔离验收", tags: [], type: "FREE", status: "ACTIVE", ownerId: owner.id, memberCount: 1 } }); circles.push(circle.id);
    await db.circleMember.create({ data: { circleId: circle.id, userId: owner.id, role: "OWNER" } });
    const req = await db.circleJoinRequest.create({ data: { circleId: circle.id, userId: user.id } }); requests.push(req.id);
    return { owner: owner.id, user: user.id, circle: circle.id, req: req.id };
  };
  type F = Awaited<ReturnType<typeof fixture>>;
  const requestRow = (f: F) => db.circleJoinRequest.findUniqueOrThrow({ where: { id: f.req } });
  const count = async (f: F) => (await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount;
  const members = (f: F) => db.circleMember.count({ where: { circleId: f.circle, userId: f.user } });
  const notice = (f: F) => db.notification.findUnique({ where: { idempotencyKey: f.user + ":CIRCLE_JOIN_REVIEW:" + f.req } });
  const fail = async (table: string, op: string, work: () => Promise<void>) => {
    if (!["Circle", "CircleMember", "Notification"].includes(table) || !["INSERT", "UPDATE"].includes(op)) throw new Error("审批故障目标非法");
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_join_review_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic join review failure'; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_join_review_failure BEFORE ' + op + ' ON "' + table + '" FOR EACH ROW EXECUTE FUNCTION synthetic_join_review_failure()');
    try { await work(); } finally { await db.$executeRawUnsafe('DROP TRIGGER synthetic_join_review_failure ON "' + table + '"'); await db.$executeRawUnsafe('DROP FUNCTION synthetic_join_review_failure()'); }
  };
  const afterRead = (work: () => Promise<void>) => {
    let changed = false;
    return { circleMember: db.circleMember, circle: db.circle, circleViolation: db.circleViolation,
      circleGovernanceConfig: db.circleGovernanceConfig, circleRule: db.circleRule, circleRuleAck: db.circleRuleAck,
      $queryRawUnsafe: async (query: string, ...values: unknown[]) => {
        const rows = await db.$queryRawUnsafe(query, ...values);
        if (!changed && query.includes('SELECT * FROM "CircleJoinRequest"')) { changed = true; await work(); }
        return rows;
      }, $executeRawUnsafe: db.$executeRawUnsafe.bind(db),
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(work) };
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [id] = await db.$queryRaw<Array<{ name: string; port: number; user: string }>>`SELECT current_database() AS name, inet_server_port() AS port, current_user AS "user"`;
    if (!id.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(id.port) || id.user !== "qa_voice") throw new Error("审批合成库身份不符");
  });
  afterEach(async () => {
    await db.circleMembershipCacheInvalidation.deleteMany({ where: { circleId: { in: circles } } });
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.circleJoinRequest.deleteMany({ where: { id: { in: requests.splice(0) } } });
    await db.circleViolation.deleteMany({ where: { circleId: { in: circles } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });

  it("没有可选推送服务也提交审批成员人数与正确站内正文分类", async () => {
    const f = await fixture(); await service().reviewJoinRequest(f.circle, f.req, f.owner, "approve");
    expect((await requestRow(f)).status).toBe("APPROVED"); expect(await members(f)).toBe(1); expect(await count(f)).toBe(2);
    expect(await notice(f)).toMatchObject({ userId: f.user, type: "CIRCLE_JOIN_REVIEW", category: "GOVERN", circleId: f.circle, targetType: "CIRCLE", targetId: f.circle, title: "入圈申请已通过" });
    expect((await notice(f))?.content).toContain("合成审批圈");
  });
  it("驳回只提交申请与带理由通知，不建成员或加人数", async () => {
    const f = await fixture(); await service().reviewJoinRequest(f.circle, f.req, f.owner, "reject", " 合成理由 ");
    expect(await requestRow(f)).toMatchObject({ status: "REJECTED", rejectReason: "合成理由" }); expect(await members(f)).toBe(0); expect(await count(f)).toBe(1);
    expect((await notice(f))?.content).toContain("：合成理由");
  });
  it.each([["CircleMember", "INSERT"], ["Circle", "UPDATE"], ["Notification", "INSERT"]])("真实%s写入失败审批成员人数通知回滚，恢复后可重试", async (table, op) => {
    const f = await fixture(); await fail(table, op, async () => { await expect(service().reviewJoinRequest(f.circle, f.req, f.owner, "approve")).rejects.toThrow(); });
    expect(await requestRow(f)).toMatchObject({ status: "PENDING", reviewedBy: null, reviewedAt: null }); expect(await members(f)).toBe(0); expect(await count(f)).toBe(1); expect(await notice(f)).toBeNull();
    await service().reviewJoinRequest(f.circle, f.req, f.owner, "approve"); expect(await count(f)).toBe(2); expect(await notice(f)).not.toBeNull();
  });
  it("驳回通知真实写入失败恢复待审，重试只落一条通知", async () => {
    const f = await fixture(); await fail("Notification", "INSERT", async () => { await expect(service().reviewJoinRequest(f.circle, f.req, f.owner, "reject", "合成")).rejects.toThrow(); });
    expect((await requestRow(f)).status).toBe("PENDING"); await service().reviewJoinRequest(f.circle, f.req, f.owner, "reject", "合成");
    await expect(service().reviewJoinRequest(f.circle, f.req, f.owner, "reject")).rejects.toThrow("已处理"); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
  });
  it("已存在的成员不重复加人数，不改角色与到期权益", async () => {
    const f = await fixture(); const expiry = new Date("2040-01-01T00:00:00Z");
    const m = await db.circleMember.create({ data: { circleId: f.circle, userId: f.user, role: "ADMIN", expireAt: expiry } }); await db.circle.update({ where: { id: f.circle }, data: { memberCount: 2 } });
    await service().reviewJoinRequest(f.circle, f.req, f.owner, "approve"); expect(await count(f)).toBe(2);
    expect(await db.circleMember.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ role: "ADMIN", expireAt: expiry }); expect(await notice(f)).not.toBeNull();
  });
  it("同一申请并发通过或驳回，只提交一个裁决与一条通知", async () => {
    const f = await fixture(); const results = await Promise.allSettled([service().reviewJoinRequest(f.circle, f.req, f.owner, "approve"), service().reviewJoinRequest(f.circle, f.req, f.owner, "reject")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
    const approved = (await requestRow(f)).status === "APPROVED"; expect(await members(f)).toBe(approved ? 1 : 0); expect(await count(f)).toBe(approved ? 2 : 1);
  });
  it("同一用户两份申请并发通过，只建一个成员与加一次人数", async () => {
    const f = await fixture(); const other = await db.circleJoinRequest.create({ data: { circleId: f.circle, userId: f.user } }); requests.push(other.id);
    await Promise.all([service().reviewJoinRequest(f.circle, f.req, f.owner, "approve"), service().reviewJoinRequest(f.circle, other.id, f.owner, "approve")]);
    expect(await members(f)).toBe(1); expect(await count(f)).toBe(2); expect(await db.notification.count({ where: { userId: f.user } })).toBe(2);
  });
  it("读取后申请改收件人，旧请求不处理新身份或发给旧用户", async () => {
    const f = await fixture(), other = await db.user.create({ data: { nickname: "合成新申请人" } }); users.push(other.id);
    const client = afterRead(async () => { await db.circleJoinRequest.update({ where: { id: f.req }, data: { userId: other.id } }); });
    await expect(service(client).reviewJoinRequest(f.circle, f.req, f.owner, "approve")).rejects.toThrow();
    expect((await requestRow(f)).status).toBe("PENDING"); expect(await members(f)).toBe(0); expect(await count(f)).toBe(1); expect(await notice(f)).toBeNull();
  });
  it("读取后申请已被驳回，旧通过请求不覆盖状态", async () => {
    const f = await fixture(); const client = afterRead(async () => { await db.circleJoinRequest.update({ where: { id: f.req }, data: { status: "REJECTED" } }); });
    await expect(service(client).reviewJoinRequest(f.circle, f.req, f.owner, "approve")).rejects.toThrow("已处理"); expect(await members(f)).toBe(0); expect(await count(f)).toBe(1); expect(await notice(f)).toBeNull();
  });
  it("读取后操作者降为普通成员，事务内重新核对权限", async () => {
    const f = await fixture(); const client = afterRead(async () => { await db.circleMember.update({ where: { circleId_userId: { circleId: f.circle, userId: f.owner } }, data: { role: "MEMBER" } }); });
    await expect(service(client).reviewJoinRequest(f.circle, f.req, f.owner, "approve")).rejects.toThrow("审批"); expect((await requestRow(f)).status).toBe("PENDING"); expect(await members(f)).toBe(0);
  });
  it("扫描后新增禁入，审批不绕过治理规则", async () => {
    const f = await fixture(); const client = afterRead(async () => { await db.circleViolation.create({ data: { circleId: f.circle, userId: f.user, operatorId: f.owner, type: "REMOVE", status: "ACTIVE", reason: "合成禁入" } }); });
    await expect(service(client).reviewJoinRequest(f.circle, f.req, f.owner, "approve")).rejects.toThrow("限制重新加入"); expect((await requestRow(f)).status).toBe("PENDING"); expect(await members(f)).toBe(0);
  });
  it("非圈内管理成员不能批准也不能驳回", async () => {
    const f = await fixture(); for (const action of ["approve", "reject"] as const) await expect(service().reviewJoinRequest(f.circle, f.req, f.user, action)).rejects.toThrow("管理角色");
    expect((await requestRow(f)).status).toBe("PENDING"); expect(await count(f)).toBe(1); expect(await notice(f)).toBeNull();
  });
  it("可选推送失败不丢已提交审批或重复写站内通知", async () => {
    const f = await fixture(), push = jest.fn().mockRejectedValue(new Error("合成可选推送故障"));
    await service(db, { pushStoredNotification: push }).reviewJoinRequest(f.circle, f.req, f.owner, "approve"); await new Promise(resolve => setImmediate(resolve));
    expect(push).toHaveBeenCalledTimes(1); expect(await count(f)).toBe(2); expect(await notice(f)).not.toBeNull(); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
  });
  it("审批实际COMMIT后独立进程退出，裁决成员人数站内通知均保存", async () => {
    const f = await fixture();
    const keep = new Set(["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMDATA", "OS", "PROCESSOR_ARCHITECTURE"]);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => keep.has(key.toUpperCase())));
    const program = `const {PrismaClient}=require('@prisma/client');const {GrowthService}=require(${JSON.stringify(resolve("src/modules/growth/growth.service.ts"))});
      const u=new URL(process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL);if(u.hostname!=='127.0.0.1'||!['55462','55476'].includes(u.port)||u.username!=='qa_voice'||!u.pathname.startsWith('/entitlement_notice_qa_'))process.exit(97);
      const db=new PrismaClient({datasources:{db:{url:u.href}}});const client=new Proxy(db,{get(t,k){if(k==='$transaction')return async work=>{await db.$transaction(work);process.exit(83)};const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v}});
      new GrowthService(client).reviewJoinRequest(${JSON.stringify(f.circle)},${JSON.stringify(f.req)},${JSON.stringify(f.owner)},'approve').catch(()=>process.exit(98));`;
    const child = spawnSync(process.execPath, ["-r", resolve("node_modules/ts-node/register/transpile-only"), "-e", program],
      { cwd: process.cwd(), timeout: 15000, env: { ...env, ENTITLEMENT_NOTICE_TEST_DATABASE_URL: testUrl!, TS_NODE_COMPILER_OPTIONS: '{"module":"CommonJS"}' } });
    expect(child.error).toBeUndefined(); expect(child.status).toBe(83);
    expect((await requestRow(f)).status).toBe("APPROVED"); expect(await members(f)).toBe(1); expect(await count(f)).toBe(2); expect(await notice(f)).not.toBeNull();
    await expect(service().reviewJoinRequest(f.circle, f.req, f.owner, "approve")).rejects.toThrow("已处理"); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
  });
});
