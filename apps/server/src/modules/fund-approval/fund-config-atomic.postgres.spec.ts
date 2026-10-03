import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CommissionService } from "../commission/commission.service";
import { AdminReferralService } from "../station/admin-referral.service";
import { SystemService } from "../system/system.service";
import { SettlementRuleAdminService } from "../settlement/settlement-rule-admin.service";
import { FundApprovalService } from "./fund-approval.service";
import { FundApprovalExecutor } from "./fund-approval.executor";

const testUrl = process.env.CONFIG_APPROVAL_TEST_DATABASE_URL;
const databaseName = "entitlement_notice_qa_phase94_config_atomic";
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55478" || u.username !== "qa_voice" || u.pathname !== `/${databaseName}`)
    throw new Error("配置审批仅允许指定本机合成库");
}
const methods = ["upsertMemberConfig", "updateMemberConfig", "deleteMemberConfig", "updateCommissionConfig", "updateConfig", "createTemporaryReferralConfig", "updateTemporaryReferralConfig", "deleteTemporaryReferralConfig", "createSettlementRule", "updateSettlementRule"] as const;
type Method = typeof methods[number];
jest.setTimeout(60000);

(testUrl ? describe : describe.skip)("十条配置审批真实共同事务", () => {
  let db: PrismaClient;
  const users: string[] = [], keys: string[] = [], scenes: string[] = [], referralIds: string[] = [], stationIds: string[] = [];
  const approvals = (client: unknown = db) => new FundApprovalService(client as PrismaService);
  // 审批执行中的业务服务不允许退回根客户端，能同时发现辅助读查询漏传事务。
  const deniedRoot = new Proxy({} as PrismaService, { get(_target, key) { throw new Error(`配置业务越出事务: ${String(key)}`); } });
  const services = () => ({
    commission: new CommissionService(deniedRoot, undefined!, undefined!),
    referrals: new AdminReferralService(deniedRoot, approvals()),
    system: new SystemService(deniedRoot, undefined!, undefined!, undefined!, undefined!, approvals()),
    settlement: new SettlementRuleAdminService(deniedRoot, approvals()),
  });
  type Services = ReturnType<typeof services>;
  const executor = (s = services(), client: unknown = db) => new FundApprovalExecutor(approvals(client), undefined!, undefined!, undefined!, s.commission, s.referrals, s.system, s.settlement);
  const fixture = async (method: Method) => {
    const actor = await db.user.create({ data: { nickname: "合成配置发起人" } });
    const reviewer = await db.user.create({ data: { nickname: "合成配置审核人" } });
    users.push(actor.id, reviewer.id);
    const role = await db.userRole.create({ data: { userId: reviewer.id, roleType: "FINANCE_ADMIN" } });
    const key = `CONFIG_QA_${randomUUID()}`, scene = `SCENE_QA_${randomUUID()}`;
    keys.push(key); scenes.push(scene);
    let id: string | undefined, payload: Record<string, unknown>;
    if (method === "upsertMemberConfig") payload = { method, dto: { level: "MONTHLY", name: "合成月卡", price: 19, isActive: false } };
    else if (method === "updateMemberConfig" || method === "deleteMemberConfig") {
      const row = await db.memberConfig.create({ data: { level: "MONTHLY", name: "合成月卡", price: 9, isActive: false } }); id = row.id;
      payload = { method, id, dto: { price: 19 } };
    } else if (method === "updateCommissionConfig") payload = { method, type: key, rate: 0.33 };
    else if (method === "updateConfig") {
      await db.commissionConfig.create({ data: { configKey: key, configName: "合成佣金", rateA: 0.1, rateB: 0 } });
      payload = { method, key, dto: { rateA: 0.33 } };
    } else if (method.includes("TemporaryReferral")) {
      const station = await db.station.create({ data: { userId: actor.id, name: "合成范围", code: key } }); stationIds.push(station.id);
      const dto = { stationId: station.id, commissionRate: 10, validFrom: "2026-10-01T00:00:00.000Z", validTo: "2026-10-08T00:00:00.000Z" };
      if (method !== "createTemporaryReferralConfig") {
        const row = await db.temporaryReferralConfig.create({ data: { ...dto, validFrom: new Date(dto.validFrom), validTo: new Date(dto.validTo), createdBy: actor.id } });
        id = row.id; referralIds.push(id);
      }
      payload = { method, id, dto: method === "updateTemporaryReferralConfig" ? { commissionRate: 20 } : dto };
    } else {
      const dto = { scene, splits: [{ role: "PROVIDER", rate: 0.8, basis: "GROSS", category: "SERVICE" }] };
      if (method === "updateSettlementRule") {
        const row = await db.settlementRule.create({ data: { scene, splits: dto.splits, enabled: true } }); id = row.id;
      }
      payload = { method, id, dto: method === "updateSettlementRule" ? { enabled: false } : dto };
    }
    const type = method.includes("MemberConfig") ? "MEMBER_CONFIG" : "COMMISSION_CONFIG";
    const submitted = await approvals().create({ type, payload, summary: "合成配置事务验证", requestedBy: actor.id });
    return { method, actorId: actor.id, reviewerId: reviewer.id, roleId: role.id, approvalId: submitted.approvalId, key, scene, id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const state = async (f: Fixture) => ({
    member: await db.memberConfig.findMany({ where: { level: "MONTHLY" } }),
    commission: await db.commissionConfig.findMany({ where: { configKey: f.key } }),
    versions: await db.configVersion.findMany({ where: { configKey: `commission_config_${f.key}` } }),
    referral: await db.temporaryReferralConfig.findMany({ where: { createdBy: f.actorId } }),
    settlement: await db.settlementRule.findMany({ where: { scene: f.scene } }),
  });
  const pending = async (f: Fixture, before: Awaited<ReturnType<typeof state>>) => {
    expect(await state(f)).toEqual(before);
    const row = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } });
    expect(row.status).toBe("PENDING"); expect(row.reviewedBy).toBeNull(); expect(row.processedAt).toBeNull(); expect(row.reviewNote).toBeNull();
  };
  const committed = async (f: Fixture) => {
    const row = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } });
    expect(row.status).toBe("APPROVED"); expect(row.reviewedBy).toBe(f.reviewerId); expect(row.processedAt).not.toBeNull();
    const s = await state(f);
    if (f.method === "deleteMemberConfig") expect(s.member).toHaveLength(0);
    else if (f.method.includes("MemberConfig")) { expect(s.member).toHaveLength(1); expect(s.member[0].price.toString()).toBe("19"); }
    else if (f.method === "updateConfig" || f.method === "updateCommissionConfig") {
      expect(s.commission).toHaveLength(1); expect(s.commission[0].rateA.toString()).toBe("0.33");
      expect(s.versions).toHaveLength(f.method === "updateCommissionConfig" ? 1 : 0);
    } else if (f.method === "deleteTemporaryReferralConfig") expect(s.referral).toHaveLength(0);
    else if (f.method.includes("TemporaryReferral")) {
      expect(s.referral).toHaveLength(1); expect(s.referral[0].commissionRate.toString()).toBe(f.method === "createTemporaryReferralConfig" ? "10" : "20"); expect(s.referral[0].createdBy).toBe(f.actorId);
    } else { expect(s.settlement).toHaveLength(1); expect(s.settlement[0].enabled).toBe(f.method === "createSettlementRule"); }
  };
  const review = (f: Fixture, s = services(), client: unknown = db) => executor(s, client).review(f.approvalId, true, "合成审核", f.reviewerId);
  const intercepted = (method: Method, after: () => Promise<void>) => {
    const s = services();
    const name: keyof Services = method.includes("MemberConfig") ? "system" : method.includes("TemporaryReferral") ? "referrals" : method.includes("SettlementRule") ? "settlement" : "commission";
    const operation = method === "createTemporaryReferralConfig" ? "create" : method === "updateTemporaryReferralConfig" ? "update" : method === "deleteTemporaryReferralConfig" ? "delete" : method === "createSettlementRule" ? "createRule" : method === "updateSettlementRule" ? "updateRule" : method;
    s[name] = new Proxy(s[name], { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === operation) return async (...args: unknown[]) => { const result = await Reflect.apply(value, target, args); await after(); return result; };
      return typeof value === "function" ? value.bind(target) : value;
    } }) as never;
    return s;
  };
  const transactionProxy = (wrap: (tx: PrismaClient, callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>) => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [(tx: PrismaClient) => wrap(tx, callback), options]);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const waitFor = async (fragment: string) => {
    for (let i = 0; i < 100; i++) {
      const [r] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${fragment})>0`;
      if (Number(r.n)) return; await sleep(20);
    }
    throw new Error("未观测到真实锁等待");
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [identity] = await db.$queryRaw<Array<{ db: string; role: string; port: number }>>`SELECT current_database() AS db,current_user AS role,inet_server_port() AS port`;
    expect(identity).toEqual({ db: databaseName, role: "qa_voice", port: 55478 });
    for (const model of [db.user, db.memberConfig, db.commissionConfig, db.temporaryReferralConfig, db.settlementRule]) expect(await (model.count as () => Promise<number>)()).toBe(0);
  });
  afterEach(async () => {
    await db.fundApproval.deleteMany({ where: { requestedBy: { in: users } } });
    await db.configVersion.deleteMany({ where: { configKey: { in: keys.map(k => `commission_config_${k}`) } } });
    await db.commissionConfig.deleteMany({ where: { configKey: { in: keys.splice(0) } } });
    await db.memberConfig.deleteMany({ where: { level: "MONTHLY" } });
    await db.temporaryReferralConfig.deleteMany({ where: { OR: [{ id: { in: referralIds.splice(0) } }, { createdBy: { in: users } }] } });
    await db.settlementRule.deleteMany({ where: { scene: { in: scenes.splice(0) } } });
    await db.station.deleteMany({ where: { id: { in: stationIds.splice(0) } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });

  it.each(methods)("%s配置与审批提交一次且辅助查询不越出事务", async method => {
    const f = await fixture(method); await review(f); await committed(f);
    await expect(review(f)).rejects.toThrow("已处理"); await committed(f);
  });
  it.each(methods)("%s实际写入后业务返回前失败回滚，重试一次生效", async method => {
    const f = await fixture(method), before = await state(f);
    await expect(review(f, intercepted(method, async () => { throw new Error("合成配置返回前故障"); }))).rejects.toThrow("合成配置返回前故障");
    await pending(f, before); await review(f); await committed(f);
  });
  it.each(methods)("%s提交前故障回滚全部写入及审批，重试一次生效", async method => {
    const f = await fixture(method), before = await state(f);
    const client = transactionProxy(async (tx, callback) => { await callback(tx); throw new Error("合成配置提交前故障"); });
    await expect(review(f, services(), client)).rejects.toThrow("合成配置提交前故障");
    await pending(f, before); await review(f); await committed(f);
  });
  it.each(methods)("%s同审批并发等真实行锁，只有一个成功", async method => {
    const f = await fixture(method); let ready!: () => void, release!: () => void;
    const reached = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const first = Promise.allSettled([review(f, intercepted(method, async () => { ready(); await gate; }))]);
    let second: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try { await reached; second = Promise.allSettled([review(f)]); await waitFor('SELECT id FROM "fund_approval"'); }
    finally { release(); }
    expect((await first)[0].status).toBe("fulfilled"); expect((await second!)[0].status).toBe("rejected"); await committed(f);
  });
  it.each(methods)("%s角色撤销必须等待配置实际提交", async method => {
    const f = await fixture(method); let ready!: () => void, release!: () => void;
    const reached = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const first = Promise.allSettled([review(f, intercepted(method, async () => { ready(); await gate; }))]);
    let revoke: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try { await reached; revoke = Promise.allSettled([db.userRole.delete({ where: { id: f.roleId } })]); await waitFor('DELETE FROM "public"."UserRole"'); }
    finally { release(); }
    expect((await first)[0].status).toBe("fulfilled"); expect((await revoke!)[0].status).toBe("fulfilled"); await committed(f);
    await expect(review(f)).rejects.toThrow("当前平台权限不足");
  });
  it.each(methods)("%s账号停用必须等待配置实际提交", async method => {
    const f = await fixture(method); let ready!: () => void, release!: () => void;
    const reached = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const first = Promise.allSettled([review(f, intercepted(method, async () => { ready(); await gate; }))]);
    let ban: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try { await reached; ban = Promise.allSettled([db.user.update({ where: { id: f.reviewerId }, data: { status: "BANNED" } })]); await waitFor('UPDATE "public"."User"'); }
    finally { release(); }
    expect((await first)[0].status).toBe("fulfilled"); expect((await ban!)[0].status).toBe("fulfilled"); await committed(f);
    await expect(review(f)).rejects.toThrow("审核账号当前不可用");
  });
  it.each(methods)("%s无当前权限与自审均拒绝，配置和审批不改变", async method => {
    const f = await fixture(method), before = await state(f);
    await db.userRole.delete({ where: { id: f.roleId } });
    await expect(review(f)).rejects.toThrow("当前平台权限不足"); await pending(f, before);
    await db.userRole.create({ data: { userId: f.actorId, roleType: "FINANCE_ADMIN" } });
    await expect(executor().review(f.approvalId, true, undefined, f.actorId)).rejects.toThrow("不能审批自己"); await pending(f, before);
  });
  it("版本记录真实SQL故障回滚已写配置及审批，重试生成一条版本", async () => {
    const f = await fixture("updateCommissionConfig"), before = await state(f);
    const client = transactionProxy(async (tx, callback) => callback(new Proxy(tx, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "configVersion") return new Proxy(value, { get(delegate, method) {
        if (method === "create") return () => tx.$queryRaw`SELECT 1/0`;
        const fn = Reflect.get(delegate, method); return typeof fn === "function" ? fn.bind(delegate) : fn;
      } });
      return typeof value === "function" ? value.bind(target) : value;
    } })));
    await expect(review(f, services(), client)).rejects.toThrow(); await pending(f, before); await review(f); await committed(f);
  });
  it.each(["updateConfig", "updateCommissionConfig"] as const)("%s进程缓存只在提交后失效，故障不恢复已提交审批", async method => {
    const f = await fixture(method), before = await state(f), s = services();
    const invalidate = jest.spyOn(s.commission, "invalidateConfigCache");
    const fail = transactionProxy(async (tx, callback) => { await callback(tx); expect(invalidate).not.toHaveBeenCalled(); throw new Error("合成提交前失败"); });
    await expect(review(f, s, fail)).rejects.toThrow("合成提交前失败"); expect(invalidate).not.toHaveBeenCalled(); await pending(f, before);
    invalidate.mockImplementation(() => { throw new Error("合成缓存失败"); });
    await review(f, s); expect(invalidate).toHaveBeenCalledTimes(1); await committed(f);
  });
  it("旧默认分佣载荷保留，未知方法拒绝而不静默改写默认配置", async () => {
    const f = await fixture("updateConfig");
    await db.fundApproval.update({ where: { id: f.approvalId }, data: { payload: { key: f.key, dto: { rateA: 0.33 } } } });
    await review(f); await committed(f);
    const other = await fixture("updateConfig"), before = await state(other);
    await db.fundApproval.update({ where: { id: other.approvalId }, data: { payload: { method: "unknownConfigOperation", key: other.key, dto: { rateA: 0.99 } } } });
    await expect(review(other)).rejects.toThrow("未知分佣配置审批方法"); await pending(other, before);
  });
  it.each(["REFUND", "HUIFU_SPLIT"])("%s不能进入配置共同事务，未调用外部执行", async type => {
    const f = await fixture("updateConfig"), before = await state(f);
    await db.fundApproval.update({ where: { id: f.approvalId }, data: { type } });
    const snapshot = await approvals().findById(f.approvalId), execute = jest.fn();
    await expect(approvals().executeLocalReview(f.approvalId, f.reviewerId, undefined, snapshot, execute)).rejects.toThrow("仅已核验的本地资金类型");
    expect(execute).not.toHaveBeenCalled(); await pending(f, before);
  });
});
