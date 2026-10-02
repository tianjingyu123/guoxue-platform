import { PrismaClient, Prisma } from "@prisma/client";
import { CircleGovernanceService } from "./circle-governance.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { CircleSharedService } from "../services/circle-shared.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462" || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("治理CAS仅允许指定合成库，不使用DATABASE_URL");
  }
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("圈子人工裁决、审核与禁言到期真实PG竞态", () => {
  let db: PrismaClient;
  const users: string[] = [], circles: string[] = [];
  const redis = { runExclusive: async (_key: string, _ttl: number, work: () => Promise<void>) => work() } as unknown as RedisService;
  const shared = { checkPermission: async () => undefined } as unknown as CircleSharedService;
  const service = (client: unknown = db) => new CircleGovernanceService(client as PrismaService, redis, shared);
  const barrier = () => {
    let count = 0;
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    return async () => { count += 1; if (count === 2) release(); await waiting; };
  };
  const transaction = (input: unknown) => Array.isArray(input)
    ? db.$transaction(input as Prisma.PrismaPromise<unknown>[])
    : db.$transaction(input as (tx: Prisma.TransactionClient) => Promise<unknown>);
  const fixture = async () => {
    const owner = await db.user.create({ data: { nickname: "合成治理CAS用户" } }); users.push(owner.id);
    const circle = await db.circle.create({ data: { name: "合成CAS圈", intro: "仅隔离验证", tags: [], ownerId: owner.id, postCount: 0 } }); circles.push(circle.id);
    const violation = await db.circleViolation.create({ data: { circleId: circle.id, userId: owner.id, type: "MUTE", status: "ACTIVE", operatorId: "synthetic-operator", expiresAt: new Date(Date.now() - 1000) } });
    const appeal = await db.circleAppeal.create({ data: { violationId: violation.id, circleId: circle.id, userId: owner.id, content: "合成申诉", deadlineAt: new Date(Date.now() + 86400000) } });
    const post = await db.post.create({ data: { circleId: circle.id, userId: owner.id, title: "合成待审", content: "合成内容", status: "AUDITING" } });
    return { owner: owner.id, circle: circle.id, violation: violation.id, appeal: appeal.id, post: post.id };
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity[0].port)) throw new Error("合成库身份不符");
  });
  afterEach(async () => {
    await db.circleAppeal.deleteMany({ where: { userId: { in: users } } });
    await db.circleViolation.deleteMany({ where: { userId: { in: users } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  const racedAppeal = () => {
    const wait = barrier();
    return service({ circle: db.circle, circleAppeal: { findUnique: async (args: Prisma.CircleAppealFindUniqueArgs) => { const row = await db.circleAppeal.findUnique(args); await wait(); return row; } }, $transaction: transaction });
  };
  const racedReview = () => {
    const wait = barrier();
    return service({ circle: db.circle, post: { ...db.post, findUnique: async (args: Prisma.PostFindUniqueArgs) => { const row = await db.post.findUnique(args); await wait(); return row; } }, $transaction: transaction });
  };

  it("相反人工裁决并发只有一个成功，处理状态与胜出裁决一致且通知一次", async () => {
    const f = await fixture(), svc = racedAppeal();
    const results = await Promise.allSettled([svc.resolveAppeal(f.appeal, "synthetic-a", { uphold: true, resolution: "合成同意" }), svc.resolveAppeal(f.appeal, "synthetic-b", { uphold: false, resolution: "合成拒绝" })]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    const appeal = await db.circleAppeal.findUniqueOrThrow({ where: { id: f.appeal } });
    const violation = await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } });
    expect(violation.status).toBe(appeal.status === "UPHELD" ? "REVOKED" : "ACTIVE"); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(1);
  });

  it("人工裁决与自动超时裁决竞争不能覆盖已完成的裁决", async () => {
    const f = await fixture();
    const svc = service({ circle: db.circle, circleAppeal: { findUnique: async (args: Prisma.CircleAppealFindUniqueArgs) => {
      const row = await db.circleAppeal.findUnique(args);
      await db.circleAppeal.update({ where: { id: f.appeal }, data: { deadlineAt: new Date(Date.now() - 1000) } });
      await service().processOverdueAppeals(); return row;
    } }, $transaction: transaction });
    await expect(svc.resolveAppeal(f.appeal, "synthetic-a", { uphold: false, resolution: "迟到人工裁决" })).rejects.toThrow();
    expect((await db.circleAppeal.findUniqueOrThrow({ where: { id: f.appeal } })).status).toBe("UPHELD"); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(1);
  });

  it("同一待审帖两次并发通过只计一次且通知一次", async () => {
    const f = await fixture(), svc = racedReview();
    const results = await Promise.allSettled([svc.reviewPost(f.circle, "synthetic-a", f.post, { approve: true }), svc.reviewPost(f.circle, "synthetic-b", f.post, { approve: true })]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).postCount).toBe(1); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(1);
  });

  it("通过和驳回竞争只有一个结果，计数与实际帖子状态一致", async () => {
    const f = await fixture(), svc = racedReview();
    const results = await Promise.allSettled([svc.reviewPost(f.circle, "synthetic-a", f.post, { approve: true }), svc.reviewPost(f.circle, "synthetic-b", f.post, { approve: false, reason: "合成驳回" })]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    const post = await db.post.findUniqueOrThrow({ where: { id: f.post } });
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).postCount).toBe(post.status === "PUBLISHED" ? 1 : 0); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(1);
  });

  it.each(["REVOKED", "LIFTED"])("扫描禁言后状态已改为%s时不覆盖、不发到期解除通知", async status => {
    const f = await fixture();
    const facade = { $transaction: transaction, circle: db.circle, circleViolation: { ...db.circleViolation, findMany: async (args: Prisma.CircleViolationFindManyArgs) => {
      const rows = await db.circleViolation.findMany(args); await db.circleViolation.update({ where: { id: f.violation }, data: { status } }); return rows;
    } } };
    await service(facade).processExpiredViolations();
    expect((await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } })).status).toBe(status); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0);
  });

  it("扫描禁言后期限延长时不提前解除", async () => {
    const f = await fixture();
    const facade = { $transaction: transaction, circle: db.circle, circleViolation: { ...db.circleViolation, findMany: async (args: Prisma.CircleViolationFindManyArgs) => {
      const rows = await db.circleViolation.findMany(args); await db.circleViolation.update({ where: { id: f.violation }, data: { expiresAt: new Date(Date.now() + 86400000) } }); return rows;
    } } };
    await service(facade).processExpiredViolations();
    expect((await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } })).status).toBe("ACTIVE"); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0);
  });

  const failUpdate = async (table: "Circle" | "CircleViolation", work: () => Promise<void>) => {
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_governance_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic governance transaction failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_governance_fail BEFORE UPDATE ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_governance_fail()`);
    try { await work(); }
    finally { await db.$executeRawUnsafe(`DROP TRIGGER synthetic_governance_fail ON "${table}"`); await db.$executeRawUnsafe(`DROP FUNCTION synthetic_governance_fail()`); }
  };

  it("通过审核帖子计数更新失败时帖子事务回滚且不通知", async () => {
    const f = await fixture();
    await failUpdate("Circle", async () => { await expect(service().reviewPost(f.circle, "synthetic-a", f.post, { approve: true })).rejects.toThrow(); });
    expect((await db.post.findUniqueOrThrow({ where: { id: f.post } })).status).toBe("AUDITING");
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).postCount).toBe(0); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0);
  });

  it("人工申诉处理撤销失败时申诉和处理均回滚且不通知", async () => {
    const f = await fixture();
    await failUpdate("CircleViolation", async () => { await expect(service().resolveAppeal(f.appeal, "synthetic-a", { uphold: true, resolution: "合成撤销" })).rejects.toThrow(); });
    expect((await db.circleAppeal.findUniqueOrThrow({ where: { id: f.appeal } })).status).toBe("PENDING");
    expect((await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } })).status).toBe("ACTIVE"); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0);
  });
});
