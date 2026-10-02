import { Prisma, PrismaClient } from "@prisma/client";
import { CircleGovernanceService } from "./circle-governance.service";
import { deliverCircleGovernanceNotices } from "./circle-governance-notification.task";
import { CircleSharedService } from "../services/circle-shared.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { PushService } from "../../notification/push.service";
import { PushAudienceService } from "../../user/push-audience.service";
import { NotificationService } from "../../notification/notification.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55462" ||
    url.username !== "qa_voice" ||
    !url.pathname.startsWith("/entitlement_notice_qa_")
  )
    throw new Error("治理恢复只允许指定合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("治理九入口的事实事务、恢复与权限真实PG验收", () => {
  let db: PrismaClient;
  const users: string[] = [],
    circles: string[] = [];
  const redis = {
    del: jest.fn(async () => 1),
    runExclusive: async (_k: string, _t: number, work: () => Promise<void>) => work(),
  } as unknown as RedisService;
  const service = (client: unknown = db) =>
    new CircleGovernanceService(
      client as PrismaService,
      redis,
      new CircleSharedService(db as PrismaService),
    );
  const fixture = async () => {
    const owner = await db.user.create({ data: { nickname: "合成治理圈主" } }),
      user = await db.user.create({ data: { nickname: "合成治理成员" } });
    users.push(owner.id, user.id);
    const circle = await db.circle.create({
      data: {
        name: "合成持久治理圈",
        intro: "仅隔离验收",
        tags: [],
        ownerId: owner.id,
        memberCount: 2,
        postCount: 0,
      },
    });
    circles.push(circle.id);
    await db.circleMember.createMany({
      data: [
        { circleId: circle.id, userId: owner.id, role: "OWNER" },
        { circleId: circle.id, userId: user.id },
      ],
    });
    const violation = await db.circleViolation.create({
      data: {
        circleId: circle.id,
        userId: user.id,
        type: "MUTE",
        status: "ACTIVE",
        operatorId: owner.id,
        expiresAt: new Date(Date.now() - 86400000),
      },
    });
    const appeal = await db.circleAppeal.create({
      data: {
        circleId: circle.id,
        userId: user.id,
        violationId: violation.id,
        content: "合成申诉",
        deadlineAt: new Date(Date.now() - 86400000),
      },
    });
    const post = await db.post.create({
      data: {
        circleId: circle.id,
        userId: user.id,
        title: "合成待审帖",
        content: "合成正文",
        status: "AUDITING",
      },
    });
    return {
      owner: owner.id,
      user: user.id,
      circle: circle.id,
      violation: violation.id,
      appeal: appeal.id,
      post: post.id,
    };
  };
  type F = Awaited<ReturnType<typeof fixture>>;
  const facts = (f: F) => db.circleGovernanceNotice.findMany({ where: { circleId: f.circle } });
  const notices = (f: F) => db.notification.findMany({ where: { circleId: f.circle } });
  const deliver = () => deliverCircleGovernanceNotices(db as PrismaService);
  const kinds = [
    "WARNING",
    "MUTE",
    "REMOVE",
    "LIFTED",
    "APPEAL",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "OVERDUE",
  ] as const;
  type Kind = (typeof kinds)[number];
  const act = (kind: Kind, f: F, svc = service()) => {
    if (kind === "WARNING" || kind === "MUTE" || kind === "REMOVE")
      return svc.sanction(f.circle, f.owner, {
        userId: f.user,
        type: kind,
        reason: "合成处理说明",
      });
    if (kind === "LIFTED") return svc.liftViolation(f.circle, f.owner, f.violation);
    if (kind === "APPEAL")
      return svc.resolveAppeal(f.appeal, "synthetic-reviewer", {
        uphold: true,
        resolution: "合成仲裁依据",
      });
    if (kind === "APPROVED" || kind === "REJECTED")
      return svc.reviewPost(f.circle, f.owner, f.post, {
        approve: kind === "APPROVED",
        reason: "合成审核依据",
      });
    return kind === "EXPIRED" ? svc.processExpiredViolations() : svc.processOverdueAppeals();
  };
  const fail = async (
    table: "CircleGovernanceNotice" | "Notification",
    work: () => Promise<void>,
  ) => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_governance_notice_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic governance notice failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_governance_notice_failure BEFORE INSERT ON "' +
        table +
        '" FOR EACH ROW EXECUTE FUNCTION synthetic_governance_notice_failure()',
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER synthetic_governance_notice_failure ON "' + table + '"',
      );
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_governance_notice_failure()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [identity] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name, inet_server_port() AS port`;
    if (
      !identity.name.startsWith("entitlement_notice_qa_") ||
      ![55462, 5432].includes(identity.port)
    )
      throw new Error("隔离库身份不符");
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.circleAppeal.deleteMany({ where: { circleId: { in: circles } } });
    await db.circleViolation.deleteMany({ where: { circleId: { in: circles } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    (redis.del as jest.Mock).mockReset().mockResolvedValue(1);
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it.each(kinds)("%s仅随实际处理保存快照，恢复分类目标正确且重复不建通知", async (kind) => {
    const f = await fixture();
    await act(kind, f);
    const events = await facts(f);
    expect(events).toHaveLength(1);
    expect(events[0].recipientId).toBe(f.user);
    expect(events[0].targetId).toBe(
      ["APPROVED", "REJECTED"].includes(kind)
        ? f.post
        : kind === "WARNING" || kind === "MUTE" || kind === "REMOVE"
          ? (
              await db.circleViolation.findFirstOrThrow({
                where: { circleId: f.circle, type: kind },
                orderBy: { createdAt: "desc" },
              })
            ).id
          : f.violation,
    );
    expect(await notices(f)).toHaveLength(0);
    expect(await deliver()).toBe(1);
    expect(await deliver()).toBe(0);
    const [n] = await notices(f);
    expect(n).toMatchObject({
      userId: f.user,
      circleId: f.circle,
      category: "GOVERN",
      type: "CIRCLE_GOVERNANCE",
    });
    expect(n.idempotencyKey).toBe(f.user + ":CIRCLE_GOVERNANCE:" + events[0].eventKey);
    expect(n.content).toContain("处理记录（北京时间");
    expect(n.content).toContain("当前权限");
  });
  it.each(kinds)("%s事实INSERT失败时业务回滚且绝不生成成功通知", async (kind) => {
    const f = await fixture();
    await fail("CircleGovernanceNotice", async () => {
      await Promise.allSettled([act(kind, f)]);
    });
    expect(await facts(f)).toHaveLength(0);
    expect(await deliver()).toBe(0);
    expect(await notices(f)).toHaveLength(0);
    expect(
      (await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } })).status,
    ).toBe("ACTIVE");
    expect((await db.circleAppeal.findUniqueOrThrow({ where: { id: f.appeal } })).status).toBe(
      "PENDING",
    );
    expect((await db.post.findUniqueOrThrow({ where: { id: f.post } })).status).toBe("AUDITING");
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(2);
    expect(await db.circleViolation.count({ where: { circleId: f.circle } })).toBe(1);
  });
  it("真实通知INSERT失败不回滚已经提交的审核，恢复成功只生成一次", async () => {
    const f = await fixture();
    await act("APPROVED", f);
    await fail("Notification", async () => {
      await expect(deliver()).rejects.toThrow();
    });
    expect((await db.post.findUniqueOrThrow({ where: { id: f.post } })).status).toBe("PUBLISHED");
    expect(await facts(f)).toHaveLength(1);
    expect(await deliver()).toBe(1);
    expect(await deliver()).toBe(0);
  });
  it("自动阶梯禁言与警告各有独立事实，不操作资金", async () => {
    const f = await fixture();
    await db.circleViolation.createMany({
      data: [0, 1].map(() => ({
        circleId: f.circle,
        userId: f.user,
        operatorId: f.owner,
        type: "WARNING",
        expiresAt: new Date(Date.now() + 86400000),
      })),
    });
    const result = await service().sanction(f.circle, f.owner, { userId: f.user, type: "WARNING" });
    expect(result.autoMuted).toBe(true);
    expect(await facts(f)).toHaveLength(2);
    expect(await deliver()).toBe(2);
  });
  it("同一帖子再次进入待审形成新的裁决事件，不被永久postId键吞掉", async () => {
    const f = await fixture();
    await act("REJECTED", f);
    await db.post.update({
      where: { id: f.post },
      data: { status: "AUDITING", content: "修改后重新提交" },
    });
    await act("APPROVED", f);
    expect(await facts(f)).toHaveLength(2);
    expect(await deliver()).toBe(2);
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).postCount).toBe(1);
  });
  it("旧待审请求遇到重新提交的新版本不得审核新正文", async () => {
    const f = await fixture();
    const client = {
      ...db,
      post: {
        findUnique: async (args: Prisma.PostFindUniqueArgs) => {
          const old = await db.post.findUnique(args);
          await db.post.update({
            where: { id: f.post },
            data: { content: "新的待审正文", updatedAt: new Date(Date.now() + 1000) },
          });
          return old;
        },
      },
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        db.$transaction(work),
    };
    await expect(act("APPROVED", f, service(client))).rejects.toThrow();
    expect(await facts(f)).toHaveLength(0);
    expect((await db.post.findUniqueOrThrow({ where: { id: f.post } })).status).toBe("AUDITING");
  });
  it("两次并发解除只有一个成功，原ACTIVE状态不被已完成裁决覆盖", async () => {
    const f = await fixture();
    let arrived = 0,
      release!: () => void;
    const waiting = new Promise<void>((r) => {
      release = r;
    });
    const client = {
      ...db,
      circleViolation: {
        findUnique: async (args: Prisma.CircleViolationFindUniqueArgs) => {
          const row = await db.circleViolation.findUnique(args);
          if (++arrived === 2) release();
          await waiting;
          return row;
        },
      },
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        db.$transaction(work),
    };
    const results = await Promise.allSettled([
      act("LIFTED", f, service(client)),
      act("LIFTED", f, service(client)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await facts(f)).toHaveLength(1);
    expect(await deliver()).toBe(1);
  });
  it("权限校验后圈主已转让，旧圈主不得解除", async () => {
    const f = await fixture();
    const client = {
      ...db,
      circleViolation: {
        findUnique: async (args: Prisma.CircleViolationFindUniqueArgs) => {
          const row = await db.circleViolation.findUnique(args);
          await db.circle.update({ where: { id: f.circle }, data: { ownerId: f.user } });
          return row;
        },
      },
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        db.$transaction(work),
    };
    await expect(act("LIFTED", f, service(client))).rejects.toThrow();
    expect(await facts(f)).toHaveLength(0);
    expect(
      (await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } })).status,
    ).toBe("ACTIVE");
  });
  it("普通成员无权解除或审核，跨圈目标拒绝；不产生事实", async () => {
    const f = await fixture();
    await expect(service().liftViolation(f.circle, f.user, f.violation)).rejects.toThrow();
    await expect(
      service().reviewPost(f.circle, f.user, f.post, { approve: true }),
    ).rejects.toThrow();
    const other = await fixture();
    await expect(service().liftViolation(other.circle, other.owner, f.violation)).rejects.toThrow();
    expect(await facts(f)).toHaveLength(0);
  });
  it("迟到恢复保留当时快照和日期，不追随当前改名、撤销或帖子修改", async () => {
    const f = await fixture();
    await act("REJECTED", f);
    const [e] = await facts(f);
    await db.circleGovernanceNotice.update({
      where: { id: e.id },
      data: { occurredAt: new Date("2020-01-01T00:00:00Z") },
    });
    await db.circle.update({ where: { id: f.circle }, data: { name: "当前新名字" } });
    await db.post.update({
      where: { id: f.post },
      data: { title: "当前新标题", status: "PUBLISHED" },
    });
    await deliver();
    const [n] = await notices(f);
    expect(n.content).toContain("2020-01-01 08:00");
    expect(n.content).toContain("合成待审帖");
    expect(n.content).not.toContain("当前新标题");
    expect(n.content).not.toContain("当前新名字");
  });
  it("收件人已注销且旧治理记录仍保留时，状态清理完成而不伪造用户或通知", async () => {
    const f = await fixture();
    await db.user.delete({ where: { id: f.user } });
    await service().processOverdueAppeals();
    expect((await db.circleAppeal.findUniqueOrThrow({ where: { id: f.appeal } })).status).toBe(
      "UPHELD",
    );
    expect(
      (await db.circleViolation.findUniqueOrThrow({ where: { id: f.violation } })).status,
    ).toBe("REVOKED");
    expect(await facts(f)).toHaveLength(0);
    expect(await deliver()).toBe(0);
  });
  it("真实站内通知详情只允许收件人，目标治理记录不跨用户泄露", async () => {
    const f = await fixture();
    await act("APPEAL", f);
    await deliver();
    const [n] = await notices(f);
    const notification = new NotificationService(
      db as PrismaService,
      {} as RedisService,
      {} as PushService,
      {} as PushAudienceService,
    );
    await expect(notification.getById(n.id, f.owner)).rejects.toThrow();
    await expect(notification.getById(n.id, f.user)).resolves.toMatchObject({ id: n.id });
    expect(await service().getMySanctions(f.owner, f.circle)).toHaveLength(0);
    expect(await service().getMySanctions(f.user, f.circle)).toHaveLength(1);
  });
  it("超过一批的通知能够继续恢复，已完成行不堵塞队首", async () => {
    const f = await fixture();
    await db.circleGovernanceNotice.createMany({
      data: Array.from({ length: 220 }, (_, i) => ({
        recipientId: f.user,
        circleId: f.circle,
        eventKey: `synthetic-batch:${f.circle}:${i}`,
        title: "合成恢复记录",
        content: "仅恢复任务压力验证",
        targetType: "CIRCLE",
        targetId: f.circle,
        occurredAt: new Date("2020-01-01T00:00:00Z"),
      })),
    });
    expect(await deliver()).toBe(100);
    expect(await deliver()).toBe(100);
    expect(await deliver()).toBe(20);
    expect(await deliver()).toBe(0);
  });
  it("账户停用或圈子删除不发送，恢复可用后仍能消费保存的快照", async () => {
    const f = await fixture();
    await act("WARNING", f);
    await db.user.update({ where: { id: f.user }, data: { status: "DISABLED" } });
    expect(await deliver()).toBe(0);
    await db.user.update({ where: { id: f.user }, data: { status: "ACTIVE" } });
    await db.circle.update({ where: { id: f.circle }, data: { deletedAt: new Date() } });
    expect(await deliver()).toBe(0);
    await db.circle.update({ where: { id: f.circle }, data: { deletedAt: null } });
    expect(await deliver()).toBe(1);
  });
});
