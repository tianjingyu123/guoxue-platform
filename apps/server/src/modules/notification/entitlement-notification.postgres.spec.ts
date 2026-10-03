import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { EntitlementService, GrantEntitlementInput } from "../entitlement/entitlement.service";
import { EntitlementController } from "../entitlement/entitlement.controller";
import { EntitlementNotificationTask } from "./entitlement-notification.task";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { PushService } from "./push.service";
import { PushAudienceService } from "../user/push-audience.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { MemberService } from "../member/member.service";
import { MemberController } from "../member/member.controller";
import { MemberBenefitService } from "../member/member-benefit.service";
import { SystemService } from "../system/system.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";

const localUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (localUrl) {
  const url = new URL(localUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("权益通知测试只允许专用本机合成库，禁止回退 DATABASE_URL");
  }
}

jest.setTimeout(30000);
(localUrl ? describe : describe.skip)("权益到账通知 PostgreSQL 与真实 JWT HTTP", () => {
  let prisma: PrismaClient;
  let service: EntitlementService;
  let task: EntitlementNotificationTask;
  let members: MemberService;
  let app: INestApplication;
  const users: string[] = [];
  const secret = "synthetic-entitlement-notice-http-secret";
  const previousSecret = process.env.JWT_SECRET;
  const channelCall = jest.fn(() => { throw new Error("禁止访问真实推送渠道"); });
  const newUser = async () => {
    const user = await prisma.user.create({ data: { nickname: "合成权益用户" } });
    users.push(user.id);
    return user.id;
  };
  const grantInput = (userId: string, extra: Partial<GrantEntitlementInput> = {}): GrantEntitlementInput => ({
    userId, entitlementKey: "quota.report", kind: "QUOTA", quantity: 2,
    sourceType: "ADMIN", sourceId: "synthetic-operator", idempotencyKey: `notice-qa-${randomUUID()}`,
    metadata: { operatorId: "synthetic-operator", notificationEvent: "ENTITLEMENT_GRANTED_V1" }, ...extra,
  });
  const auth = (id: string) => `Bearer ${jwt.sign({ sub: id }, secret, { expiresIn: "5m" })}`;

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    prisma = new PrismaClient({ datasources: { db: { url: localUrl! } } });
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!rows[0]?.name.startsWith("entitlement_notice_qa_")) throw new Error("测试库身份不符");
    service = new EntitlementService(prisma as unknown as PrismaService);
    task = new EntitlementNotificationTask(prisma as unknown as PrismaService);
    members = new MemberService(prisma as unknown as PrismaService, service);
    const mod = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [EntitlementController, NotificationController, MemberController],
      providers: [
        JwtStrategy, NotificationService,
        { provide: EntitlementService, useValue: service },
        { provide: MemberService, useValue: members },
        { provide: MemberBenefitService, useValue: {} },
        { provide: SystemService, useValue: { logAudit: async () => undefined } },
        { provide: FeatureFlagService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: async () => null } },
        { provide: PushService, useValue: { send: channelCall } },
        { provide: PushAudienceService, useValue: {} },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      // 仅清理本测试随机生成的合成用户；关联流水和通知由外键级联移除。
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    expect(channelCall).not.toHaveBeenCalled();
  });

  it("真实管理员入口提交后换一个任务实例补发；重试发放与双实例处理只生成一条", async () => {
    const operator = await newUser();
    const recipient = await newUser();
    await prisma.userRole.create({ data: { userId: operator, roleType: "SUPER_ADMIN" } });
    const dto = { userId: recipient, entitlementKey: "quota.report", kind: "QUOTA", quantity: 2, idempotencyKey: `http-${randomUUID()}` };
    await request(app.getHttpServer()).post("/entitlements/admin/grant").set("Authorization", auth(operator)).send(dto).expect(201);
    expect(await prisma.notification.count({ where: { userId: recipient } })).toBe(0);
    const ledger = await prisma.entitlementLedger.findUniqueOrThrow({ where: { idempotencyKey: dto.idempotencyKey } });
    expect(ledger.metadata).toEqual({ operatorId: operator, notificationEvent: "ENTITLEMENT_GRANTED_V1" });
    await request(app.getHttpServer()).post("/entitlements/admin/grant").set("Authorization", auth(operator)).send(dto).expect(201);
    const counts = await Promise.all([task.deliverPendingGrants(), new EntitlementNotificationTask(prisma as unknown as PrismaService).deliverPendingGrants()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await prisma.entitlementLedger.count({ where: { idempotencyKey: dto.idempotencyKey } })).toBe(1);
    const notice = await prisma.notification.findFirstOrThrow({ where: { userId: recipient } });
    expect(notice.idempotencyKey).toBe(`${recipient}:ENTITLEMENT_GRANTED:${ledger.id}`);
    expect(notice.targetType).toBe("ENTITLEMENT");
    expect(notice.content).not.toContain(operator);
    expect(await task.deliverPendingGrants()).toBe(0);
  });

  it("权益事务失败不会留下持久事件或成功通知", async () => {
    const userId = await newUser();
    const broken = new EntitlementService(prisma as unknown as PrismaService);
    jest.spyOn(broken as unknown as { rebuildBalanceWithTx: () => Promise<unknown> }, "rebuildBalanceWithTx").mockRejectedValue(new Error("synthetic rollback"));
    const input = grantInput(userId);
    await expect(broken.grant(input)).rejects.toThrow("synthetic rollback");
    expect(await prisma.entitlementLedger.count({ where: { userId } })).toBe(0);
    expect(await prisma.entitlementBalance.count({ where: { userId } })).toBe(0);
    await task.deliverPendingGrants();
    expect(await prisma.notification.count({ where: { userId } })).toBe(0);
  });

  it.each(["UTC", "Asia/Shanghai", "America/Los_Angeles"])("数据库会话时区 %s 不改变生效判断或通知时间", async (zone) => {
    const userId = await newUser();
    await service.grant(grantInput(userId, { validUntil: new Date(Date.now() + 60000) }));
    await prisma.$transaction(async tx => {
      // 值来自测试固定列表，不接受外部输入。
      await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
      expect(await new EntitlementNotificationTask(tx as unknown as PrismaService).deliverPendingGrants()).toBe(1);
    });
    const notice = await prisma.notification.findFirstOrThrow({ where: { userId } });
    expect(Math.abs(notice.createdAt.getTime() - Date.now())).toBeLessThan(60000);
  });

  it("两个独立 Node 进程同时重放同一个持久事件，最终仅创建一条通知", async () => {
    const userId = await newUser();
    await service.grant(grantInput(userId));
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { EntitlementNotificationTask } = require(${JSON.stringify(resolve("src/modules/notification/entitlement-notification.task.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL } } });
      (async () => { try { console.log(JSON.stringify({ inserted: await new EntitlementNotificationTask(db).deliverPendingGrants() })); }
        finally { await db.$disconnect(); } })().catch(() => { process.exitCode = 1; });`;
    const run = () => promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      cwd: process.cwd(), env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    const outputs = await Promise.all([run(), run()]);
    expect(outputs.map(output => JSON.parse(output.stdout.trim()).inserted).reduce((a, b) => a + b, 0)).toBe(1);
    expect(await prisma.notification.count({ where: { userId } })).toBe(1);
    const memberId = await newUser();
    await members.grantMember(memberId, "LIFETIME");
    const memberOutputs = await Promise.all([run(), run()]);
    expect(memberOutputs.map(output => JSON.parse(output.stdout.trim()).inserted).reduce((a, b) => a + b, 0)).toBe(1);
    expect(await prisma.notification.count({ where: { userId: memberId } })).toBe(1);
  });

  it("通知数据库写入失败不回滚已到账权益；下次任务能补发", async () => {
    const userId = await newUser();
    await service.grant(grantInput(userId));
    // 使用实际 PostgreSQL 触发器让通知 INSERT 失败，而不是推断 mock 的事务行为。
    await prisma.$executeRawUnsafe(`CREATE FUNCTION synthetic_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notice failure'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER synthetic_notice_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_notice_fail()`);
    try {
      await expect(task.deliverPendingGrants()).rejects.toThrow();
      expect((await prisma.entitlementBalance.findFirstOrThrow({ where: { userId } })).quantity).toBe(2);
      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER synthetic_notice_fail ON "Notification"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION synthetic_notice_fail()`);
    }
    expect(await task.deliverPendingGrants()).toBe(1);
    expect(await prisma.notification.count({ where: { userId } })).toBe(1);
  });

  it("不补历史、订单、迁移、调整、零数量、未生效、已过期或已冲正记录；无限权益正常通知", async () => {
    const userId = await newUser();
    const yesterday = new Date(Date.now() - 86400000);
    await service.grant(grantInput(userId, { metadata: { operatorId: "old" } }));
    await service.grant(grantInput(userId, { sourceType: "ORDER" }));
    await service.grant(grantInput(userId, { action: "MIGRATE" }));
    await service.grant(grantInput(userId, { action: "ADJUST" }));
    await service.grant(grantInput(userId, { entitlementKey: "membership.school" }));
    await service.grant(grantInput(userId, { entitlementKey: "membership.practitioner" }));
    await service.grant(grantInput(userId, { quantity: 0 }));
    await service.grant(grantInput(userId, { validFrom: new Date(Date.now() + 86400000) }));
    await service.grant(grantInput(userId, { validFrom: yesterday, validUntil: yesterday }));
    const reversed = grantInput(userId, { sourceId: `reversed-${randomUUID()}` });
    await service.grant(reversed);
    await service.revokeSource(userId, "ADMIN", reversed.sourceId!, "合成冲正测试");
    const unlimited = grantInput(userId, { unlimited: true, quantity: 0 });
    await service.grant(unlimited);
    expect(await task.deliverPendingGrants()).toBe(1);
    const ledger = await prisma.entitlementLedger.findUniqueOrThrow({ where: { idempotencyKey: unlimited.idempotencyKey } });
    expect((await prisma.notification.findFirstOrThrow({ where: { userId } })).idempotencyKey).toBe(`${userId}:ENTITLEMENT_GRANTED:${ledger.id}`);
  });

  it("已完成记录超过一批后不饿死新待办：100 + 5，之后为零", async () => {
    const userId = await newUser();
    await prisma.entitlementLedger.createMany({ data: Array.from({ length: 105 }, (_, i) => ({
      userId, entitlementKey: "quota.report", kind: "QUOTA", quantity: 1, action: "GRANT", sourceType: "ADMIN",
      idempotencyKey: `batch-${userId}-${i}`, metadata: { notificationEvent: "ENTITLEMENT_GRANTED_V1" },
    })) });
    expect(await task.deliverPendingGrants()).toBe(100);
    expect(await task.deliverPendingGrants()).toBe(5);
    expect(await task.deliverPendingGrants()).toBe(0);
    expect(await prisma.notification.count({ where: { userId } })).toBe(105);
  });

  it("真实 JWT 和角色守卫拒绝普通用户发放；通知与权益点击接口均只读取本人数据", async () => {
    const owner = await newUser();
    const other = await newUser();
    await service.grant(grantInput(owner));
    await task.deliverPendingGrants();
    const notice = await prisma.notification.findFirstOrThrow({ where: { userId: owner } });
    await request(app.getHttpServer()).post("/entitlements/admin/grant").set("Authorization", auth(other)).send({ userId: owner, entitlementKey: "quota.report", kind: "QUOTA", idempotencyKey: "forbidden" }).expect(403);
    await request(app.getHttpServer()).get(`/notifications/${notice.id}`).expect(401);
    await request(app.getHttpServer()).get(`/notifications/${notice.id}`).set("Authorization", auth(other)).expect(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: notice.id } })).isRead).toBe(false);
    await request(app.getHttpServer()).get(`/notifications/${notice.id}`).set("Authorization", auth(owner)).expect(200);
    await request(app.getHttpServer()).get("/entitlements/me").expect(401);
    const otherRights = await request(app.getHttpServer()).get(`/entitlements/me?userId=${owner}`).set("Authorization", auth(other)).expect(200);
    expect(otherRights.body.userId).toBe(other);
    expect(otherRights.body.items).toEqual([]);
    const ownRights = await request(app.getHttpServer()).get("/entitlements/me").set("Authorization", auth(owner)).expect(200);
    expect(ownRights.body.items.some((item: { entitlementKey: string }) => item.entitlementKey === "quota.report")).toBe(true);
  });

  it("真实会员授予 HTTP：状态、购买记录与标记同事务提交，重启和并发只通知一次", async () => {
    const operator = await newUser();
    const owner = await newUser();
    const other = await newUser();
    await prisma.userRole.create({ data: { userId: operator, roleType: "SUPER_ADMIN" } });
    await request(app.getHttpServer()).post("/member/admin/grant").set("Authorization", auth(operator))
      .send({ userId: owner, level: "MONTHLY", durationDays: 30 }).expect(201);
    const state = await members.getStatus(owner);
    expect(state.isActive).toBe(true);
    const ledger = await prisma.entitlementLedger.findFirstOrThrow({ where: { userId: owner } });
    expect(ledger.metadata).toEqual({ level: "MONTHLY", durationDays: 30, operatorId: operator, notificationEvent: "MEMBER_GRANTED_V1" });
    const purchase = await prisma.memberPurchase.findUniqueOrThrow({ where: { id: ledger.sourceId! } });
    expect(purchase.userId).toBe(owner);
    expect(purchase.expireAt?.toISOString()).toBe(state.memberExpire);
    expect(await prisma.notification.count({ where: { userId: owner } })).toBe(0);
    const counts = await Promise.all([task.deliverPendingGrants(), new EntitlementNotificationTask(prisma as unknown as PrismaService).deliverPendingGrants()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    const notice = await prisma.notification.findFirstOrThrow({ where: { userId: owner } });
    expect(notice.idempotencyKey).toBe(`${owner}:ENTITLEMENT_GRANTED:${ledger.id}`);
    expect(notice.targetType).toBe("ENTITLEMENT");
    expect(notice.content).not.toContain(operator);
    await request(app.getHttpServer()).get(`/notifications/${notice.id}`).set("Authorization", auth(other)).expect(404);
    const ownStatus = await request(app.getHttpServer()).get(`/member/status?userId=${other}`).set("Authorization", auth(owner)).expect(200);
    expect(ownStatus.body.memberLevel).toBe("MONTHLY");
    expect(await task.deliverPendingGrants()).toBe(0);
  });

  it("真实数据库拒绝会员流水时，购买记录和用户会员状态一起回滚，不发送成功通知", async () => {
    const owner = await newUser();
    await prisma.$executeRawUnsafe(`CREATE FUNCTION synthetic_member_ledger_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic member rollback'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER synthetic_member_ledger_fail BEFORE INSERT ON "EntitlementLedger" FOR EACH ROW EXECUTE FUNCTION synthetic_member_ledger_fail()`);
    try {
      await expect(members.grantMember(owner, "YEARLY", 365, "synthetic-admin")).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER synthetic_member_ledger_fail ON "EntitlementLedger"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION synthetic_member_ledger_fail()`);
    }
    expect((await members.getStatus(owner)).memberLevel).toBe("NONE");
    expect(await prisma.memberPurchase.count({ where: { userId: owner } })).toBe(0);
    expect(await prisma.entitlementLedger.count({ where: { userId: owner } })).toBe(0);
    expect(await task.deliverPendingGrants()).toBe(0);
    expect(await prisma.notification.count({ where: { userId: owner } })).toBe(0);
  });

  it("会员通知 INSERT 失败不影响会员已生效；故障释放后能恢复发送", async () => {
    const owner = await newUser();
    await members.grantMember(owner, "YEARLY", 365);
    await prisma.$executeRawUnsafe(`CREATE FUNCTION synthetic_member_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic member notice failure'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER synthetic_member_notice_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_member_notice_fail()`);
    try {
      await task.tick();
      expect((await members.getStatus(owner)).isActive).toBe(true);
      expect(await prisma.notification.count({ where: { userId: owner } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER synthetic_member_notice_fail ON "Notification"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION synthetic_member_notice_fail()`);
    }
    await task.tick();
    expect(await prisma.notification.count({ where: { userId: owner } })).toBe(1);
    expect(await task.deliverPendingGrants()).toBe(0);
  });

  it("只有流水或错误归属的购买记录，不能冒充已生效会员；从业会员继续排除", async () => {
    const owner = await newUser();
    const other = await newUser();
    await members.grantMember(other, "LIFETIME");
    const purchase = await prisma.memberPurchase.findFirstOrThrow({ where: { userId: other } });
    // 先清除另一合成用户的真实待办，避免影响本条的反证计数。
    expect(await task.deliverPendingGrants()).toBe(1);
    await prisma.user.update({ where: { id: owner }, data: { memberLevel: "LIFETIME" } });
    for (const sourceId of ["missing-purchase", purchase.id]) {
      await service.grant(grantInput(owner, {
        entitlementKey: "membership.school", kind: "MEMBERSHIP", unlimited: true,
        resourceType: "MEMBER_PLAN", sourceId, metadata: { notificationEvent: "MEMBER_GRANTED_V1", level: "LIFETIME" },
      }));
    }
    await service.grant(grantInput(owner, { entitlementKey: "membership.practitioner", unlimited: true,
      metadata: { notificationEvent: "MEMBER_GRANTED_V1", level: "LIFETIME" } }));
    expect(await task.deliverPendingGrants()).toBe(0);
    expect(await prisma.notification.count({ where: { userId: owner } })).toBe(0);
  });

  it("授予已被新等级覆盖、被撤销或已过期，不再发送陈旧成功通知", async () => {
    const owner = await newUser();
    await members.grantMember(owner, "MONTHLY", 30);
    await members.grantMember(owner, "YEARLY", 365);
    expect(await task.deliverPendingGrants()).toBe(1);
    const newLedger = await prisma.entitlementLedger.findFirstOrThrow({ where: { userId: owner, metadata: { path: ["level"], equals: "YEARLY" } } });
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: owner } })).idempotencyKey).toBe(`${owner}:ENTITLEMENT_GRANTED:${newLedger.id}`);
    const revoked = await newUser();
    await members.grantMember(revoked, "LIFETIME");
    await members.revokeMember(revoked);
    const expired = await newUser();
    await members.grantMember(expired, "MONTHLY", 1);
    const expiredLedger = await prisma.entitlementLedger.findFirstOrThrow({ where: { userId: expired } });
    const yesterday = new Date(Date.now() - 86400000);
    await prisma.$transaction([
      prisma.user.update({ where: { id: expired }, data: { memberExpire: yesterday } }),
      prisma.memberPurchase.update({ where: { id: expiredLedger.sourceId! }, data: { expireAt: yesterday } }),
      prisma.entitlementLedger.update({ where: { id: expiredLedger.id }, data: { validUntil: yesterday } }),
    ]);
    expect(await task.deliverPendingGrants()).toBe(0);
    expect(await prisma.notification.count({ where: { userId: { in: [revoked, expired] } } })).toBe(0);
  });

  it("终身会员 NULL 到期和三种数据库时区均匹配，已有通知不重建", async () => {
    for (const zone of ["UTC", "Asia/Shanghai", "America/Los_Angeles"]) {
      const owner = await newUser();
      await members.grantMember(owner, "LIFETIME");
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
        expect(await new EntitlementNotificationTask(tx as unknown as PrismaService).deliverPendingGrants()).toBe(1);
      });
      expect((await members.getStatus(owner)).memberExpire).toBeNull();
    }
    expect(await task.deliverPendingGrants()).toBe(0);
  });

  it("会员授予守卫及参数拒绝：普通用户、NONE、非正整数均不修改会员", async () => {
    const operator = await newUser();
    const owner = await newUser();
    await prisma.userRole.create({ data: { userId: operator, roleType: "SUPER_ADMIN" } });
    await request(app.getHttpServer()).post("/member/admin/grant").send({ userId: owner, level: "MONTHLY" }).expect(401);
    await request(app.getHttpServer()).post("/member/admin/grant").set("Authorization", auth(owner)).send({ userId: owner, level: "MONTHLY" }).expect(403);
    for (const body of [{ level: "NONE" }, { level: "MONTHLY", durationDays: 0 }, { level: "MONTHLY", durationDays: 1.5 }]) {
      await request(app.getHttpServer()).post("/member/admin/grant").set("Authorization", auth(operator)).send({ userId: owner, ...body }).expect(400);
    }
    expect((await members.getStatus(owner)).memberLevel).toBe("NONE");
    expect(await prisma.memberPurchase.count({ where: { userId: owner } })).toBe(0);
  });
});
