import { PrismaClient } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { FundApprovalExecutor } from "../fund-approval/fund-approval.executor";
import { CreateDividendDto } from "./institute.dto";
import { InstituteService } from "./institute.service";

const testUrl = process.env.DIVIDEND_PRECISION_TEST_DATABASE_URL;
const databaseName = "entitlement_notice_qa_phase95_dividend_precision";
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55479" || u.username !== "qa_voice" || u.pathname !== `/${databaseName}`)
    throw new Error("金额精度验收仅允许指定本机合成库");
}
const methods = ["requestDividend", "createDividend"] as const;
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("研究院分红分币精度与半池边界", () => {
  let db: PrismaClient;
  const users: string[] = [], institutes: string[] = [];
  const fund = (client: unknown = db) => new FundApprovalService(client as PrismaService);
  const service = (client: unknown = db) => new InstituteService(client as PrismaService, fund());
  const executor = (client: unknown = db) => new FundApprovalExecutor(fund(client), service(), undefined!, undefined!, undefined!, undefined!, undefined!, undefined!);
  const fixture = async (income = 0.03) => {
    const actor = await db.user.create({ data: { nickname: "合成资金管理者" } });
    const target = await db.user.create({ data: { nickname: "合成分配对象" } });
    const reviewer = await db.user.create({ data: { nickname: "合成财务" } }); users.push(actor.id, target.id, reviewer.id);
    await db.userRole.create({ data: { userId: reviewer.id, roleType: "FINANCE_ADMIN" } });
    const institute = await db.institute.create({ data: { name: "合成分币边界院", adminUserId: actor.id } }); institutes.push(institute.id);
    await db.instituteMember.create({ data: { userId: actor.id, instituteId: institute.id, role: "PRESIDENT", status: "ACTIVE", joinYear: 2026 } });
    await db.instituteMember.create({ data: { userId: target.id, instituteId: institute.id, role: "TYPE_A", status: "ACTIVE", joinYear: 2026 } });
    await db.instituteRevenue.create({ data: { instituteId: institute.id, sourceType: "MEMBERSHIP", amount: income, description: "合成资金，无真实渠道交易" } });
    return { actorId: actor.id, targetId: target.id, reviewerId: reviewer.id, instituteId: institute.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const dto = (f: Fixture, amount = 0.01) => ({ instituteId: f.instituteId, userId: f.targetId, type: "TEACHER_AWARD", amount, description: "合成分币", period: "2026-Q4" });
  const empty = async () => { expect(await db.fundApproval.count()).toBe(0); expect(await db.instituteDividend.count()).toBe(0); expect(await db.userWallet.count()).toBe(0); };
  const beforeTransaction = (before: () => Promise<void>) => new Proxy(db, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "$transaction") return async (...args: unknown[]) => { await before(); return Reflect.apply(value, target, args); };
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const noOverdraft = async (f: Fixture) => {
    const [row] = await db.$queryRaw<Array<{ remaining: string }>>`SELECT ((SELECT COALESCE(SUM(amount),0)*0.5 FROM "InstituteRevenue" WHERE "instituteId"=${f.instituteId} AND "sourceType"='MEMBERSHIP')-(SELECT COALESCE(SUM(amount),0) FROM "InstituteDividend" WHERE "instituteId"=${f.instituteId}))::text AS remaining`;
    expect(Number(row.remaining)).toBeGreaterThanOrEqual(0);
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const [identity] = await db.$queryRaw<Array<{ db: string; role: string; port: number }>>`SELECT current_database() AS db,current_user AS role,inet_server_port() AS port`;
    expect(identity).toEqual({ db: databaseName, role: "qa_voice", port: 55479 });
    expect(await db.user.count()).toBe(0); expect(await db.instituteDividend.count()).toBe(0);
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

  it.each([0.015, 0.001, 1.234, 0.30000000000000004])("DTO拒绝超过分的金额%s", amount => {
    const instance = plainToInstance(CreateDividendDto, { userId: "synthetic", type: "TEACHER_AWARD", amount });
    expect(validateSync(instance).some(e => e.property === "amount" && e.constraints?.isNumber)).toBe(true);
  });
  it.each([0.01, 0.1, 0.3, 19.99, 1000000])("DTO保留合法元金额%s", amount => {
    expect(validateSync(plainToInstance(CreateDividendDto, { userId: "synthetic", type: "TEACHER_AWARD", amount }))).toHaveLength(0);
  });
  it.each(methods.flatMap(method => [0.015, 0.001, 1.234].map(amount => [method, amount] as const)))("%s业务入口拒绝精度非法金额%s，未写审批或分配", async (method, amount) => {
    const f = await fixture(10); await expect(service()[method](f.actorId, dto(f, amount))).rejects.toThrow("最多保留两位小数"); await empty();
  });
  it.each(methods)("%s收入0.01的半池不足一分，拒绝分配0.01", async method => {
    const f = await fixture(0.01); await expect(service()[method](f.actorId, dto(f))).rejects.toThrow("¥0.00"); await empty();
  });
  it.each(methods)("%s收入0.03可用一分，拒绝0.02并允许0.01", async method => {
    const f = await fixture(); await expect(service()[method](f.actorId, dto(f, 0.02))).rejects.toThrow("¥0.01"); await empty();
    await service()[method](f.actorId, dto(f));
    if (method === "requestDividend") expect((await db.fundApproval.findFirstOrThrow()).amount?.toString()).toBe("0.01");
    else expect((await db.instituteDividend.findFirstOrThrow()).amount.toString()).toBe("0.01");
    await expect(service()[method](f.actorId, dto(f))).rejects.toThrow("¥0.00"); await noOverdraft(f);
  });
  it.each(methods)("%s收入0.30已分配0.10后精确允许0.05，余额不会受浮点差影响", async method => {
    const f = await fixture(0.30); await db.instituteDividend.create({ data: dto(f, 0.10) });
    await service()[method](f.actorId, dto(f, 0.05));
    if (method === "requestDividend") expect((await db.fundApproval.findFirstOrThrow()).amount?.toString()).toBe("0.05");
    else expect((await db.instituteDividend.aggregate({ _sum: { amount: true } }))._sum.amount?.toString()).toBe("0.15");
    await noOverdraft(f);
  });
  it("待审0.10及0.04占用后，0.30收入半池精确允许0.01", async () => {
    const f = await fixture(0.30);
    for (const amount of [0.10, 0.04]) await fund().create({ type: "DIVIDEND", payload: dto(f, amount), amount, summary: "合成合法待审", requestedBy: f.actorId });
    await service().requestDividend(f.actorId, dto(f));
    expect((await db.fundApproval.aggregate({ _sum: { amount: true } }))._sum.amount?.toString()).toBe("0.15");
    await expect(service().requestDividend(f.actorId, dto(f))).rejects.toThrow("¥0.00");
  });
  it("合法一分申请经实际审批提交一次，重复审核拒绝", async () => {
    const f = await fixture(), submitted = await service().requestDividend(f.actorId, dto(f));
    await executor().review(submitted.approvalId, true, undefined, f.reviewerId);
    expect((await db.instituteDividend.findFirstOrThrow()).amount.toString()).toBe("0.01");
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: submitted.approvalId } })).status).toBe("APPROVED");
    await expect(executor().review(submitted.approvalId, true, undefined, f.reviewerId)).rejects.toThrow("已处理"); expect(await db.instituteDividend.count()).toBe(1); await noOverdraft(f);
  });
  it("历史三位小数载荷执行拒绝且审批回滚待审，不静默舍入", async () => {
    const f = await fixture();
    const submitted = await fund().create({ type: "DIVIDEND", payload: dto(f, 0.015), amount: 0.015, summary: "合成旧载荷", requestedBy: f.actorId });
    expect((await db.fundApproval.findUniqueOrThrow({ where: { id: submitted.approvalId } })).amount?.toString()).toBe("0.02");
    await expect(executor().review(submitted.approvalId, true, undefined, f.reviewerId)).rejects.toThrow("最多保留两位小数");
    const row = await db.fundApproval.findUniqueOrThrow({ where: { id: submitted.approvalId } });
    expect(row.status).toBe("PENDING"); expect(row.reviewedBy).toBeNull(); expect(row.processedAt).toBeNull(); expect(await db.instituteDividend.count()).toBe(0); await noOverdraft(f);
  });
  it.each(methods)("%s一分提交前失败全部回滚，重试精确写入一次", async method => {
    const f = await fixture();
    const client = new Proxy(db, { get(target, key) {
      const value = Reflect.get(target, key);
      if (key === "$transaction") return (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Reflect.apply(value, target, [async (tx: unknown) => { await callback(tx); throw new Error("合成分币提交前故障"); }, options]);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    await expect(service(client)[method](f.actorId, dto(f))).rejects.toThrow("合成分币提交前故障"); await empty();
    await service()[method](f.actorId, dto(f)); expect(method === "requestDividend" ? await db.fundApproval.count() : await db.instituteDividend.count()).toBe(1);
    await expect(service()[method](f.actorId, dto(f))).rejects.toThrow("¥0.00"); await noOverdraft(f);
  });
  it.each(methods)("%s两个一分并发只有一个成功，失败重试仍不超过0.03半池", async method => {
    const f = await fixture(); let arrived = 0, release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const client = beforeTransaction(async () => { if (++arrived === 2) release(); await gate; });
    const result = await Promise.allSettled([service(client)[method](f.actorId, dto(f)), service(client)[method](f.actorId, dto(f))]);
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(result.filter(r => r.status === "rejected")).toHaveLength(1);
    await expect(service()[method](f.actorId, dto(f))).rejects.toThrow("¥0.00");
    expect(method === "requestDividend" ? await db.fundApproval.count() : await db.instituteDividend.count()).toBe(1); await noOverdraft(f);
  });
  it("两笔旧一分审批真实并发仅提交一笔，失败保持待审且不能越池重试", async () => {
    const f = await fixture(); const ids: string[] = [];
    for (let i = 0; i < 2; i++) ids.push((await fund().create({ type: "DIVIDEND", payload: dto(f), amount: 0.01, summary: "合成旧一分审批", requestedBy: f.actorId })).approvalId);
    let arrived = 0, release!: () => void; const gate = new Promise<void>(r => { release = r; });
    const client = beforeTransaction(async () => { if (++arrived === 2) release(); await gate; });
    const results = await Promise.allSettled(ids.map(id => executor(client).review(id, true, undefined, f.reviewerId)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const pending = await db.fundApproval.findFirstOrThrow({ where: { status: "PENDING" } });
    await expect(executor().review(pending.id, true, undefined, f.reviewerId)).rejects.toThrow("¥0.00");
    expect(await db.fundApproval.count({ where: { status: "APPROVED" } })).toBe(1); expect(await db.instituteDividend.count()).toBe(1); await noOverdraft(f);
  });
});
