import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { FundApprovalService } from "./fund-approval.service";
import { FundApprovalExecutor } from "./fund-approval.executor";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55477" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("币审批仅允许本机合成库");
}
const types = ["RECHARGE", "COIN_REFUND"] as const;
type Type = typeof types[number];
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("实际充值退币与审批共同事务", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const approvals = (client: unknown = db) => new FundApprovalService(client as PrismaService);
  const coin = () => new CoinService(db as unknown as PrismaService, {} as RedisService, undefined, undefined, approvals());
  const executor = (service = coin(), client: unknown = db) => new FundApprovalExecutor(approvals(client), undefined!, undefined!, service, undefined!, undefined!, undefined!, undefined!);
  const fixture = async (type: Type) => {
    const actor = await db.user.create({ data: { nickname: "合成申请者" } });
    const owner = await db.user.create({ data: { nickname: "合成币账户" } });
    const reviewer = await db.user.create({ data: { nickname: "合成财务" } });
    users.push(actor.id, owner.id, reviewer.id);
    const role = await db.userRole.create({ data: { userId: reviewer.id, roleType: "FINANCE_ADMIN" } });
    const dto = { userId: owner.id, amountCoin: 100, description: "合成币审批" };
    const submitted = await coin()[type === "RECHARGE" ? "requestRecharge" : "requestRefund"](dto, actor.id);
    return { actorId: actor.id, ownerId: owner.id, reviewerId: reviewer.id, roleId: role.id, approvalId: submitted.approvalId };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const review = (f: Fixture, service = coin(), client: unknown = db) => executor(service, client).review(f.approvalId, true, undefined, f.reviewerId);
  const pendingEmpty = async (f: Fixture) => {
    const row = await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } });
    expect(row.status).toBe("PENDING"); expect(row.reviewedBy).toBeNull(); expect(row.reviewNote).toBeNull(); expect(row.processedAt).toBeNull();
    expect(await db.virtualCoinAccount.count()).toBe(0); expect(await db.virtualCoinRecharge.count()).toBe(0); expect(await db.virtualCoinTransaction.count()).toBe(0);
  };
  const creditedOnce = async (f: Fixture, type: Type) => {
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("APPROVED");
    const account = await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.ownerId } });
    expect(account.balance).toBe(100); expect(account.totalRecharged).toBe(type === "RECHARGE" ? 100 : 0);
    expect(await db.virtualCoinTransaction.count()).toBe(1);
    expect(await db.virtualCoinRecharge.count()).toBe(type === "RECHARGE" ? 1 : 0);
    if (type === "RECHARGE") expect((await db.virtualCoinRecharge.findFirstOrThrow()).orderNo).toBe(`FUND_RECHARGE_${f.approvalId}`);
    else expect((await db.virtualCoinTransaction.findFirstOrThrow()).refId).toBe(f.approvalId);
  };
  const intercepted = (type: Type, after: () => Promise<void>) => {
    const service = coin();
    return new Proxy(service, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === (type === "RECHARGE" ? "recharge" : "refund")) return async (...args: unknown[]) => { const result = await Reflect.apply(value, target, args); await after(); return result; };
      return typeof value === "function" ? value.bind(target) : value;
    } });
  };
  const waitFor = async (fragment: string) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const [row] = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock' AND strpos(query, ${fragment})>0`;
      if (Number(row.n) > 0) return;
      await sleep(20);
    }
    throw new Error("未观测到实际锁等待");
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [id] = await db.$queryRaw<Array<{ db: string; user: string; port: number }>>`SELECT current_database() AS db,current_user AS "user",inet_server_port() AS port`;
    expect(id.port).toBe(55477); expect(id.user).toBe("qa_voice"); expect(id.db.startsWith("entitlement_notice_qa_")).toBe(true);
  });
  afterEach(async () => {
    await db.fundApproval.deleteMany({ where: { requestedBy: { in: users } } });
    await db.virtualCoinRecharge.deleteMany({ where: { userId: { in: users } } });
    await db.virtualCoinTransaction.deleteMany({ where: { userId: { in: users } } });
    await db.virtualCoinAccount.deleteMany({ where: { userId: { in: users } } });
    await db.userRole.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });

  it.each(types)("%s实际服务合法记账一次，重复审核拒绝", async type => {
    const f = await fixture(type); await review(f); await creditedOnce(f, type);
    await expect(review(f)).rejects.toThrow("已处理"); await creditedOnce(f, type);
  });
  it.each(types)("%s业务方法返回前故障回滚首次开户、审批与记账，重试只到账一次", async type => {
    const f = await fixture(type);
    await expect(review(f, intercepted(type, async () => { throw new Error("合成记账后返回前故障"); }))).rejects.toThrow("合成记账后返回前故障");
    await pendingEmpty(f); await review(f); await creditedOnce(f, type);
  });
  it.each(types)("%s真实SQL失败回滚已增加的余额和首次开户", async type => {
    const f = await fixture(type);
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => {
        const transaction = tx as PrismaClient;
        const proxy = new Proxy(transaction, { get(t, name) {
          const field = Reflect.get(t, name);
          if (name === "virtualCoinTransaction") return new Proxy(field, { get(delegate, method) {
            if (method === "create") return () => transaction.$queryRaw`SELECT 1/0`;
            const fn = Reflect.get(delegate, method); return typeof fn === "function" ? fn.bind(delegate) : fn;
          } });
          return typeof field === "function" ? field.bind(t) : field;
        } });
        return callback(proxy);
      }, options]);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(review(f, coin(), client)).rejects.toThrow(); await pendingEmpty(f); await review(f); await creditedOnce(f, type);
  });
  it.each(types)("%s全部写入后提交前故障共同回滚", async type => {
    const f = await fixture(type);
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => { await callback(tx); throw new Error("合成提交前故障"); }, options]);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(review(f, coin(), client)).rejects.toThrow("合成提交前故障"); await pendingEmpty(f); await review(f); await creditedOnce(f, type);
  });
  it.each(types)("%s同一审批并发等待同一行锁，只提交一次", async type => {
    const f = await fixture(type); let ready!: () => void, release!: () => void;
    const reached = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const first = Promise.allSettled([review(f, intercepted(type, async () => { ready(); await gate; }))]);
    let second: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try {
      await reached; await pendingEmpty(f);
      second = Promise.allSettled([review(f)]); await waitFor('FROM "fund_approval"');
    } finally { release(); }
    expect((await first)[0].status).toBe("fulfilled"); expect((await second!)[0].status).toBe("rejected"); await creditedOnce(f, type);
  });
  it.each(types)("%s审核账号已停用时拒绝且不开户", async type => {
    const f = await fixture(type); await db.user.update({ where: { id: f.reviewerId }, data: { status: "BANNED" } });
    await expect(review(f)).rejects.toThrow("审核账号当前不可用"); await pendingEmpty(f);
  });
  it.each(types)("%s财务角色已撤销时拒绝且不开户", async type => {
    const f = await fixture(type); await db.userRole.delete({ where: { id: f.roleId } });
    await expect(review(f)).rejects.toThrow("当前平台权限不足"); await pendingEmpty(f);
  });
  it.each(types)("%s保留禁止自审", async type => {
    const f = await fixture(type); await db.userRole.create({ data: { userId: f.actorId, roleType: "FINANCE_ADMIN" } });
    await expect(executor().review(f.approvalId, true, undefined, f.actorId)).rejects.toThrow("不能审批自己"); await pendingEmpty(f);
  });
  it.each(types)("%s拒绝审批不会记账或开户", async type => {
    const f = await fixture(type); await executor().review(f.approvalId, false, undefined, f.reviewerId);
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: f.approvalId } })).status).toBe("REJECTED");
    expect(await db.virtualCoinAccount.count()).toBe(0); expect(await db.virtualCoinTransaction.count()).toBe(0);
  });
  it.each(types)("%s原有账户按原规则增量记账", async type => {
    const f = await fixture(type); await db.virtualCoinAccount.create({ data: { userId: f.ownerId, balance: 40, totalRecharged: 20 } }); await review(f);
    const account = await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.ownerId } });
    expect(account.balance).toBe(140); expect(account.totalRecharged).toBe(type === "RECHARGE" ? 120 : 20); expect(await db.virtualCoinTransaction.count()).toBe(1);
  });
  it.each(types)("%s提交前保持财务角色共享锁，撤权须等待实际提交", async type => {
    const f = await fixture(type); let ready!: () => void, release!: () => void;
    const reached = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const first = review(f, intercepted(type, async () => { ready(); await gate; }));
    let revoke: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try { await reached; revoke = Promise.allSettled([db.userRole.delete({ where: { id: f.roleId } })]); await waitFor('DELETE FROM "public"."UserRole"'); }
    finally { release(); await first; }
    expect((await revoke!)[0].status).toBe("fulfilled"); await creditedOnce(f, type);
    await expect(review(f)).rejects.toThrow("当前平台权限不足");
  });
  it("外部出款类型不能进入本地资金事务", async () => {
    const f = await fixture("RECHARGE"); await db.fundApproval.update({ where: { id: f.approvalId }, data: { type: "HUIFU_SPLIT" } });
    const snapshot = await approvals().findById(f.approvalId); let called = false;
    await expect(approvals().executeLocalReview(f.approvalId, f.reviewerId, undefined, snapshot, async () => { called = true; })).rejects.toThrow("仅已核验的本地资金类型");
    expect(called).toBe(false); await pendingEmpty(f);
  });
});
