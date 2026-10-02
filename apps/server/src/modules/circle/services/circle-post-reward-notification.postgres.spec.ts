import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient, Prisma } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { CirclePostService } from "./circle-post.service";
import { CirclePostRewardNotificationTask } from "./circle-post-reward-notification.task";
import { CircleSharedService } from "./circle-shared.service";
import { CircleController } from "../circle.controller";
import { CircleService } from "../circle.service";
import { CircleInsightService } from "./circle-insight.service";
import { CoinService } from "../../coin/coin.service";
import { AuditService } from "../../audit/audit.service";
import { NotificationService } from "../../notification/notification.service";
import { NotificationController } from "../../notification/notification.controller";
import { PushService } from "../../notification/push.service";
import { PushAudienceService } from "../../user/push-audience.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { JwtStrategy } from "../../../common/jwt.strategy";
import { FeatureFlagService } from "../../feature-flag/feature-flag.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55462"
    || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("打赏恢复测试只允许指定合成库，不使用DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("圈帖打赏 PostgreSQL 持久通知与真实JWT入口", () => {
  let db: PrismaClient;
  let app: INestApplication;
  const users: string[] = [];
  const circles: string[] = [];
  const forbidden = jest.fn(() => { throw new Error("禁止真实推送"); });
  const secret = "synthetic-circle-reward-http-secret";
  const oldSecret = process.env.JWT_SECRET;
  const prisma = (client: PrismaClient | Prisma.TransactionClient = db) => client as unknown as PrismaService;
  const task = (client: PrismaClient | Prisma.TransactionClient = db) => new CirclePostRewardNotificationTask(prisma(client));
  const service = (client: PrismaClient = db, notifications?: NotificationService) => new CirclePostService(
    prisma(client), {} as AuditService, new CircleSharedService(prisma(client)), undefined,
    new CoinService(prisma(client), {} as RedisService), notifications,
  );
  const user = async () => {
    const row = await db.user.create({ data: { nickname: "合成打赏用户" } });
    users.push(row.id); return row.id;
  };
  const fixture = async () => {
    const author = await user(), payer = await user();
    const circle = await db.circle.create({ data: { name: "合成打赏圈", intro: "仅本机隔离测试", tags: [], ownerId: author, status: "ACTIVE" } });
    circles.push(circle.id);
    await db.circleMember.createMany({ data: [{ circleId: circle.id, userId: author, role: "OWNER" }, { circleId: circle.id, userId: payer }] });
    const post = await db.post.create({ data: { circleId: circle.id, userId: author, content: "合成私密正文", status: "PUBLISHED" } });
    await db.virtualCoinAccount.create({ data: { userId: payer, balance: 2000 } });
    return { circle: circle.id, post: post.id, author, payer };
  };
  const reward = async (f: Awaited<ReturnType<typeof fixture>>, amount = 9, message = "合成首次留言", id = "synthetic-request-001") => {
    await service().rewardPost(f.circle, f.post, f.payer, amount, message, id);
    return db.virtualCoinTransaction.findFirstOrThrow({ where: { userId: f.payer, scene: "POST_REWARD" } });
  };
  const auth = (id: string) => `Bearer ${jwt.sign({ sub: id }, secret, { expiresIn: "5m" })}`;
  const child = async (action: string) => {
    const code = `require('reflect-metadata');const {PrismaClient}=require('@prisma/client');
      const {CirclePostService}=require(${JSON.stringify(resolve("src/modules/circle/services/circle-post.service.ts"))});
      const {CircleSharedService}=require(${JSON.stringify(resolve("src/modules/circle/services/circle-shared.service.ts"))});
      const {CirclePostRewardNotificationTask}=require(${JSON.stringify(resolve("src/modules/circle/services/circle-post-reward-notification.task.ts"))});
      const {CoinService}=require(${JSON.stringify(resolve("src/modules/coin/coin.service.ts"))});
      const db=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});
      const svc=new CirclePostService(db,{},new CircleSharedService(db),undefined,new CoinService(db,{}));
      (async()=>{try{${action}}finally{await db.$disconnect();}})().catch(()=>{process.exitCode=1;});`;
    return promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      cwd: process.cwd(), env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
  };
  const trigger = async (table: string, action: string, work: () => Promise<void>) => {
    // 名称和动作仅由本文件常量传入，绝不接收用户输入。
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_reward_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic transaction failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_reward_fail BEFORE INSERT ON "${table}" FOR EACH ROW ${action} EXECUTE FUNCTION synthetic_reward_fail()`);
    try { await work(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_reward_fail ON "${table}"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_reward_fail()`);
    }
  };

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity[0].port)) throw new Error("合成库身份不符");
    process.env.JWT_SECRET = secret;
    const mod = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [CircleController, NotificationController],
      providers: [JwtStrategy, NotificationService,
        { provide: PrismaService, useValue: db },
        { provide: RedisService, useValue: { get: async () => null, setNX: async () => { throw new Error("合成Redis不可用"); } } },
        { provide: PushService, useValue: { send: forbidden } },
        { provide: PushAudienceService, useValue: {} },
        { provide: CircleInsightService, useValue: {} },
        { provide: FeatureFlagService, useValue: {} },
        { provide: CircleService, useFactory: (notices: NotificationService) => ({
          rewardPost: service(db, notices).rewardPost.bind(service(db, notices)),
          getPostDetail: service().getPostDetail.bind(service()),
        }), inject: [NotificationService] },
      ],
    }).compile();
    app = mod.createNestApplication(); await app.init();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    await app?.close(); await db?.$disconnect(); expect(forbidden).not.toHaveBeenCalled();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  });

  it("真实扣款、分成及事实同事务提交，恢复准确留言和分类，重复不扣款或重复通知", async () => {
    const f = await fixture(); const debit = await reward(f);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.author } })).balance).toBe(4);
    expect(await task().deliverPending()).toBe(1); expect(await task().deliverPending()).toBe(0);
    await service().rewardPost(f.circle, f.post, f.payer, 9, "修改后的留言", "synthetic-request-001");
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.author } });
    expect(n).toMatchObject({ idempotencyKey: `${f.author}:POST_REWARD:${debit.id}`, targetId: f.post, category: "TRADE", circleId: f.circle });
    expect(n.content).toBe("有人打赏了你的帖子，入账 4 币（已扣除平台服务费）：合成首次留言");
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: [f.payer, f.author] } } })).toBe(2);
  });

  it("真实作者入账失败回滚扣款、开户和事实，不产生成功通知", async () => {
    const f = await fixture();
    await trigger("VirtualCoinTransaction", `WHEN (NEW.type = 'REFUND')`, async () => { await expect(reward(f)).rejects.toThrow(); });
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
    expect(await db.virtualCoinAccount.findUnique({ where: { userId: f.author } })).toBeNull();
    expect(await db.circlePostRewardNotice.count()).toBe(0); expect(await task().deliverPending()).toBe(0);
  });

  it("真实业务事实写入失败回滚整笔资金，不是提交后通知故障", async () => {
    const f = await fixture();
    await trigger("CirclePostRewardNotice", "", async () => { await expect(reward(f)).rejects.toThrow(); });
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: [f.payer, f.author] } } })).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });

  it("真实Notification写入失败不影响已提交余额，下一实例补一条", async () => {
    const f = await fixture(); await reward(f);
    await trigger("Notification", "", async () => { await expect(task().deliverPending()).rejects.toThrow(); });
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
    expect(await db.circlePostRewardNotice.count()).toBe(1);
    expect(await task().deliverPending()).toBe(1); expect(await task().deliverPending()).toBe(0);
  });

  it("子进程在资金提交后立即退出，下次恢复不依赖原进程或Redis认领", async () => {
    const f = await fixture();
    await child(`await svc.rewardPost(${[f.circle, f.post, f.payer, 9, "退出前留言", "synthetic-child-001"].map(x => JSON.stringify(x)).join(",")});process.exit(0);`);
    expect(await db.notification.count({ where: { userId: f.author } })).toBe(0);
    expect(await task().deliverPending()).toBe(1);
    expect((await db.notification.findFirstOrThrow({ where: { userId: f.author } })).content).toContain("退出前留言");
  });

  it("两个独立进程同时恢复，数据库唯一键仅建一条", async () => {
    const f = await fixture(); await reward(f);
    const outputs = await Promise.all([child("console.log(await new CirclePostRewardNotificationTask(db).deliverPending());"), child("console.log(await new CirclePostRewardNotificationTask(db).deliverPending());")]);
    expect(outputs.reduce((sum, r) => sum + Number(r.stdout.trim()), 0)).toBe(1);
    expect(await db.notification.count({ where: { userId: f.author } })).toBe(1);
  });

  it("两个独立进程重试同请求仍只扣一笔并保存一份事实", async () => {
    const f = await fixture();
    const action = `await svc.rewardPost(${[f.circle, f.post, f.payer, 9, "并发留言", "synthetic-child-002"].map(x => JSON.stringify(x)).join(",")});`;
    await Promise.all([child(action), child(action)]);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
    expect(await db.circlePostRewardNotice.count()).toBe(1);
    expect(await task().deliverPending()).toBe(1);
  });

  it("零分成仅扣一币、不新建作者账户，仍恢复零分成通知", async () => {
    const f = await fixture(); await reward(f, 1, "");
    expect(await db.virtualCoinAccount.findUnique({ where: { userId: f.author } })).toBeNull();
    expect(await task().deliverPending()).toBe(1);
    expect((await db.notification.findFirstOrThrow({ where: { userId: f.author } })).content).toBe("有人打赏了你的帖子，入账 0 币（已扣除平台服务费）");
  });

  it.each(["missing", "duplicate", "author", "amount", "scene", "circle"])("%s关联损坏只拒绝恢复，不自动补钱或成功通知", async kind => {
    const f = await fixture(); const debit = await reward(f);
    const credit = await db.virtualCoinTransaction.findFirstOrThrow({ where: { refId: debit.id } });
    if (kind === "missing") await db.virtualCoinTransaction.delete({ where: { id: credit.id } });
    if (kind === "duplicate") await db.virtualCoinTransaction.create({ data: { ...credit, id: "synthetic-duplicate-credit" } });
    if (kind === "author") await db.virtualCoinTransaction.update({ where: { id: credit.id }, data: { userId: f.payer } });
    if (kind === "amount") await db.virtualCoinTransaction.update({ where: { id: credit.id }, data: { amountCoin: 100 } });
    if (kind === "scene") await db.virtualCoinTransaction.update({ where: { id: credit.id }, data: { scene: "POST_REWARD" } });
    if (kind === "circle") await db.circlePostRewardNotice.update({ where: { debitId: debit.id }, data: { circleId: "synthetic-wrong-circle" } });
    expect(await task().deliverPending()).toBe(0);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
  });

  it("旧流水不历史补发；显式重试旧请求仍不新建事实或重新扣款", async () => {
    const f = await fixture(); const debit = await reward(f);
    await db.circlePostRewardNotice.delete({ where: { debitId: debit.id } });
    expect(await task().deliverPending()).toBe(0);
    await service().rewardPost(f.circle, f.post, f.payer, 9, "旧请求", "synthetic-request-001");
    expect(await db.circlePostRewardNotice.count()).toBe(0);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
  });

  it("未提交打赏不可见，所在事务失败时事实、资金及通知共同回滚", async () => {
    const f = await fixture();
    // Prisma使用内部Proxy，不能Object.create后赋值，否则可能修改根客户端。
    const proxy = { post: db.post, circleMember: db.circleMember, $transaction: async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(async tx => {
      await callback(tx); expect(await task().deliverPending()).toBe(0); throw new Error("synthetic commit failure");
    }) } as unknown as PrismaClient;
    await expect(service(proxy).rewardPost(f.circle, f.post, f.payer, 9, "回滚", "synthetic-rollback-001")).rejects.toThrow("synthetic commit failure");
    expect(await task().deliverPending()).toBe(0);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
    expect(await db.circlePostRewardNotice.count()).toBe(0);
  });

  it("作者收益行正在修改时跳过，错误修改提交后也不通知", async () => {
    const f = await fixture(); const debit = await reward(f);
    const credit = await db.virtualCoinTransaction.findFirstOrThrow({ where: { refId: debit.id } });
    await db.$transaction(async tx => {
      await tx.virtualCoinTransaction.update({ where: { id: credit.id }, data: { amountCoin: 99 } });
      expect(await task().deliverPending()).toBe(0);
    });
    expect(await task().deliverPending()).toBe(0);
  });

  it("已通知事件不占批次额度，101笔按100加1处理", async () => {
    const f = await fixture();
    for (let i = 0; i < 101; i++) await reward(f, 9, "", `synthetic-batch-${i.toString().padStart(3, "0")}`);
    expect(await task().deliverPending()).toBe(100); expect(await task().deliverPending()).toBe(1); expect(await task().deliverPending()).toBe(0);
    expect(await db.notification.count({ where: { userId: f.author } })).toBe(101);
  });

  it("JWT付款入口在Redis通知故障时成功，跨用户通知及私密帖子访问拒绝", async () => {
    const f = await fixture(), stranger = await user();
    const path = `/circles/${f.circle}/posts/${f.post}/reward`;
    await request(app.getHttpServer()).post(path).send({ amount: 9 }).expect(401);
    await request(app.getHttpServer()).post(path).set("Authorization", auth(f.payer)).send({ amount: 9, message: "HTTP首次留言", requestId: "synthetic-http-001" }).expect(201);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
    expect(await task().deliverPending()).toBe(1);
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.author } });
    await request(app.getHttpServer()).get(`/notifications/${n.id}`).expect(401);
    await request(app.getHttpServer()).get(`/notifications/${n.id}`).set("Authorization", auth(stranger)).expect(404);
    const own = await request(app.getHttpServer()).get(`/notifications/${n.id}`).set("Authorization", auth(f.author)).expect(200);
    expect(own.body.content).toContain("HTTP首次留言");
    expect(own.body).not.toHaveProperty("payerId");
    await db.post.update({ where: { id: f.post }, data: { status: "HIDDEN" } });
    await request(app.getHttpServer()).get(`/circles/posts/${n.targetId}`).set("Authorization", auth(stranger)).expect(404);
    await request(app.getHttpServer()).get(`/circles/posts/${n.targetId}`).set("Authorization", auth(f.author)).expect(200);
  });

  it("JWT真实资金入口作者入账失败时不留下成功通知或待办", async () => {
    const f = await fixture();
    await trigger("VirtualCoinTransaction", `WHEN (NEW.type = 'REFUND')`, async () => {
      await request(app.getHttpServer()).post(`/circles/${f.circle}/posts/${f.post}/reward`)
        .set("Authorization", auth(f.payer)).send({ amount: 9, requestId: "synthetic-http-failure" }).expect(500);
    });
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
    expect(await db.circlePostRewardNotice.count()).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });
  it.each(["HIDDEN", "DRAFT", "AUDITING"])("%s帖子不得产生新的扣款、分成或通知事实", async status => {
    const f = await fixture(); await db.post.update({ where: { id: f.post }, data: { status } });
    await expect(reward(f)).rejects.toThrow("帖子当前不可打赏");
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
    expect(await db.circlePostRewardNotice.count()).toBe(0); expect(await task().deliverPending()).toBe(0);
  });

  it.each(["hidden", "deleted", "author", "member", "expired", "circle"])("预检后%s变更已提交，真实资金事务重新核验并拒绝", async kind => {
    const f = await fixture(), changedAuthor = await user();
    const other = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const shared = new CircleSharedService(prisma()); const ensure = shared.ensureMember.bind(shared);
    shared.ensureMember = async (circleId, userId) => {
      await ensure(circleId, userId);
      if (kind === "hidden") await other.post.update({ where: { id: f.post }, data: { status: "HIDDEN" } });
      if (kind === "deleted") await other.post.delete({ where: { id: f.post } });
      if (kind === "author") await other.post.update({ where: { id: f.post }, data: { userId: changedAuthor } });
      if (kind === "member") await other.circleMember.delete({ where: { circleId_userId: { circleId: f.circle, userId: f.payer } } });
      if (kind === "expired") await other.circleMember.update({ where: { circleId_userId: { circleId: f.circle, userId: f.payer } }, data: { expireAt: new Date(Date.now() - 1000) } });
      if (kind === "circle") await other.circle.update({ where: { id: f.circle }, data: { status: "DISABLED" } });
    };
    try {
      const svc = new CirclePostService(prisma(), {} as AuditService, shared, undefined, new CoinService(prisma(), {} as RedisService));
      await expect(svc.rewardPost(f.circle, f.post, f.payer, 9, "变更请求", "synthetic-changed-001")).rejects.toThrow();
      expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
      expect(await db.virtualCoinTransaction.count({ where: { userId: { in: [f.payer, f.author] } } })).toBe(0);
      expect(await db.circlePostRewardNotice.count()).toBe(0); expect(await task().deliverPending()).toBe(0);
    } finally { await other.$disconnect(); }
  });

  it("已过期但清理任务尚未移出的成员不能打赏", async () => {
    const f = await fixture(); await db.circleMember.update({ where: { circleId_userId: { circleId: f.circle, userId: f.payer } }, data: { expireAt: new Date(Date.now() - 1000) } });
    await expect(reward(f)).rejects.toThrow("成员权益已失效");
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(2000);
    expect(await db.circlePostRewardNotice.count()).toBe(0);
  });

  it("标题改变采用事务内最新标题，不把旧内容写入实际账本", async () => {
    const f = await fixture(); const shared = new CircleSharedService(prisma()), ensure = shared.ensureMember.bind(shared);
    shared.ensureMember = async (...args) => { await ensure(...args); await db.post.update({ where: { id: f.post }, data: { title: "已核验的新标题" } }); };
    const svc = new CirclePostService(prisma(), {} as AuditService, shared, undefined, new CoinService(prisma(), {} as RedisService));
    await svc.rewardPost(f.circle, f.post, f.payer, 9, undefined, "synthetic-title-001");
    const debit = await db.virtualCoinTransaction.findFirstOrThrow({ where: { userId: f.payer, scene: "POST_REWARD" } });
    expect(debit.description).toBe("打赏帖子: 已核验的新标题");
  });

  it.each(["post", "member", "circle"])("资金事务先锁%s时变更等待，提交后才生效，不拆开分账", async kind => {
    const f = await fixture(); const other = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const pid = (await other.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid;
    let reached!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { reached = resolve; });
    const continuePayment = new Promise<void>(resolve => { release = resolve; });
    const coins = new CoinService(prisma(), {} as RedisService), spend = coins.spend.bind(coins);
    coins.spend = async (...args) => { reached(); await continuePayment; return spend(...args); };
    const svc = new CirclePostService(prisma(), {} as AuditService, new CircleSharedService(prisma()), undefined, coins);
    const payment = svc.rewardPost(f.circle, f.post, f.payer, 9, undefined, "synthetic-lock-001");
    let mutation: Promise<unknown> | undefined;
    try {
      await entered;
      mutation = kind === "post" ? other.post.update({ where: { id: f.post }, data: { status: "HIDDEN" } })
        : kind === "member" ? other.circleMember.delete({ where: { circleId_userId: { circleId: f.circle, userId: f.payer } } })
        : other.circle.update({ where: { id: f.circle }, data: { status: "DISABLED" } });
      const started = mutation.then(() => true);
      let locked = false;
      for (let i = 0; i < 100; i++) {
        const rows = await db.$queryRaw<Array<{ wait_event_type: string | null }>>`SELECT wait_event_type FROM pg_stat_activity WHERE pid = ${pid}`;
        if (rows[0]?.wait_event_type === "Lock") { locked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(locked).toBe(true); release(); await payment; await started;
      expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
      expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.author } })).balance).toBe(4);
      expect(await db.circlePostRewardNotice.count()).toBe(1);
    } finally { release(); await payment.catch(() => undefined); await mutation?.catch(() => undefined); await other.$disconnect(); }
  });

  it.each(["deleted", "hidden", "author", "circle"])("付款提交后%s变化，可信成交快照仍通知原作者且不留下无效帖子跳转", async kind => {
    const f = await fixture(); const debit = await reward(f);
    const fact = await db.circlePostRewardNotice.findUniqueOrThrow({ where: { debitId: debit.id } });
    expect(fact).toMatchObject({ sourceVersion: "POST_REWARD_LOCKED_V1", sourcePostId: f.post, sourceCircleId: f.circle, sourceRecipientId: f.author });
    if (kind === "deleted") await db.post.delete({ where: { id: f.post } });
    if (kind === "hidden") await db.post.update({ where: { id: f.post }, data: { status: "HIDDEN" } });
    if (kind === "author") await db.post.update({ where: { id: f.post }, data: { userId: await user() } });
    if (kind === "circle") {
      const other = await db.circle.create({ data: { name: "隔离归属变更圈", intro: "合成测试", tags: [], ownerId: f.author } }); circles.push(other.id);
      await db.post.update({ where: { id: f.post }, data: { circleId: other.id } });
    }
    expect(await task().deliverPending()).toBe(1); expect(await task().deliverPending()).toBe(0);
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.author } });
    expect(n).toMatchObject({ idempotencyKey: `${f.author}:POST_REWARD:${debit.id}`, targetType: null, targetId: null, circleId: f.circle });
    expect(n.content).toContain("入账 4 币");
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.author } })).balance).toBe(4);
  });

  it.each(["sourcePostId", "sourceCircleId", "sourceRecipientId"])("成交快照%s与既成流水不一致时不恢复，不只凭收益存在", async field => {
    const f = await fixture(); const debit = await reward(f);
    await db.circlePostRewardNotice.update({ where: { debitId: debit.id }, data: { [field]: "synthetic-invalid-snapshot" } });
    await db.post.delete({ where: { id: f.post } });
    expect(await task().deliverPending()).toBe(0);
    expect(await db.notification.count({ where: { userId: f.author } })).toBe(0);
  });

  it("增量字段全空的旧事实仍核当前帖子，删除后不冒充可信新快照", async () => {
    const f = await fixture(); const debit = await reward(f);
    await db.circlePostRewardNotice.update({ where: { debitId: debit.id }, data: { sourceVersion: null, sourcePostId: null, sourceCircleId: null, sourceRecipientId: null } });
    expect(await task().deliverPending()).toBe(1);
    await db.notification.deleteMany({ where: { userId: f.author } }); await db.post.delete({ where: { id: f.post } });
    expect(await task().deliverPending()).toBe(0);
    const fact = await db.circlePostRewardNotice.findUniqueOrThrow({ where: { debitId: debit.id } });
    expect(fact.sourceVersion).toBeNull();
  });

  it.each(["partial", "unknown-version"])("%s快照形态被数据库拒绝，旧事实不隐式变成新凭据", async kind => {
    const f = await fixture(); const debit = await reward(f);
    await expect(db.circlePostRewardNotice.update({ where: { debitId: debit.id }, data: kind === "partial"
      ? { sourceVersion: null } : { sourceVersion: "UNREVIEWED_SOURCE" } })).rejects.toThrow();
    expect((await db.circlePostRewardNotice.findUniqueOrThrow({ where: { debitId: debit.id } })).sourceVersion).toBe("POST_REWARD_LOCKED_V1");
  });

  it("资金提交后帖子删除，即时通知不影响余额且不提供失效跳转", async () => {
    const f = await fixture(); let delivered!: () => void;
    const called = new Promise<void>(resolve => { delivered = resolve; });
    const notices = { sendOnce: jest.fn().mockImplementation(async () => { delivered(); return null; }) } as unknown as NotificationService;
    const proxy = { post: db.post, circleMember: db.circleMember, $transaction: async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const result = await db.$transaction(callback); await db.post.delete({ where: { id: f.post } }); return result;
    } } as unknown as PrismaClient;
    await service(proxy, notices).rewardPost(f.circle, f.post, f.payer, 9, "成交后删帖", "synthetic-immediate-deleted");
    await called;
    expect(notices.sendOnce).toHaveBeenCalledWith(f.author, expect.stringContaining("POST_REWARD:"), expect.objectContaining({ targetType: undefined, targetId: undefined }));
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
  });

  it("提交后的可选帖子读取失败不改变成功资金结果，持久任务仍补通知", async () => {
    const f = await fixture(); let reads = 0; const notices = { sendOnce: jest.fn().mockResolvedValue(null) } as unknown as NotificationService;
    const proxy = { post: { findUnique: async (...args: Parameters<typeof db.post.findUnique>) => {
      if (++reads > 1) throw new Error("synthetic optional read failure"); return db.post.findUnique(...args);
    } }, circleMember: db.circleMember, $transaction: db.$transaction.bind(db) } as unknown as PrismaClient;
    const svc = service(proxy, notices);
    await expect(svc.rewardPost(f.circle, f.post, f.payer, 9, "可选读取失败", "synthetic-optional-read")).resolves.toEqual({ success: true, amount: 9 });
    await new Promise(resolve => setImmediate(resolve)); expect(notices.sendOnce).not.toHaveBeenCalled();
    expect((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: f.payer } })).balance).toBe(1991);
    expect(await task().deliverPending()).toBe(1);
  });

});
