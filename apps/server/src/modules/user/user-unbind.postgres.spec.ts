import { Prisma, PrismaClient } from "@prisma/client";
import { UserService } from "./user.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462" || url.username !== "qa_voice" || url.pathname !== "/entitlement_notice_qa_20261003_unbind") {
    throw new Error("账号解绑仅允许专用本机合成库");
  }
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("账号解绑真实PG事务与并发边界", () => {
  let db: PrismaClient, other: PrismaClient;
  const users: string[] = [];
  const service = (client: unknown = db) => UserService.prototype.unbindAccount.bind({
    prisma: client, logger: { log: jest.fn() },
  });
  const fixture = async (providers = ["WECHAT", "QQ"]) => {
    const user = await db.user.create({ data: { nickname: "合成解绑用户" } });
    users.push(user.id);
    await db.auth.createMany({ data: providers.map(provider => ({
      userId: user.id, provider, namespace: "synthetic-unbind", subject: user.id + provider,
      credential: provider === "PASSWORD" ? "synthetic-password-hash" : null,
    })) });
    return user.id;
  };
  // 保证修复前两个外部读取都完成，确定性复现旧快照允许双方解绑的缺陷。
  const oldReadBarrier = () => {
    let reads = 0, release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    const client = (base: PrismaClient) => ({
      auth: { findMany: async (args: Prisma.AuthFindManyArgs) => {
        const rows = await base.auth.findMany(args);
        if (++reads === 2) release();
        await ready;
        return rows;
      } },
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => base.$transaction(work),
    });
    return { clients: [client(db), client(other)], readCount: () => reads };
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    other = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [identity] = await db.$queryRaw<Array<{ name: string; owner: string }>>`SELECT current_database() AS name, current_user AS owner`;
    if (identity.name !== "entitlement_notice_qa_20261003_unbind" || identity.owner !== "qa_voice") throw new Error("合成库身份不符");
  });
  afterEach(async () => {
    expect(await db.notification.count({ where: { userId: { in: users } } })).toBe(0);
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await Promise.all([db.$disconnect(), other.$disconnect()]); });

  it("不同连接同时解绑两种方式，拒绝后完成者并留下至少一种", async () => {
    const user = await fixture(), barrier = oldReadBarrier();
    const results = await Promise.allSettled([
      service(barrier.clients[0])(user, "wechat", user),
      service(barrier.clients[1])(user, "qq", user),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.auth.count({ where: { userId: user } })).toBe(1);
    expect(barrier.readCount()).toBe(0);
  });
  it("两个连接同时解绑同一提供方只成功一次", async () => {
    const user = await fixture(), barrier = oldReadBarrier();
    const results = await Promise.allSettled(barrier.clients.map(client => service(client)(user, "wechat", user)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.auth.count({ where: { userId: user, provider: "QQ" } })).toBe(1);
    expect(await db.auth.count({ where: { userId: user, provider: "WECHAT" } })).toBe(0);
  });
  it("所有微信渠道和union锚点一起删除，保留手机号登录", async () => {
    const user = await fixture(["WECHAT", "WECHAT_UNION", "PHONE"]);
    await db.auth.create({ data: { userId: user, provider: "WECHAT", namespace: "synthetic-unbind-other-app", subject: user } });
    await expect(service()(user, "wechat", user)).resolves.toEqual({ success: true, provider: "wechat" });
    expect((await db.auth.findMany({ where: { userId: user } })).map(row => row.provider)).toEqual(["PHONE"]);
  });
  it("union锚点不能算成另一种登录方式", async () => {
    const user = await fixture(["WECHAT", "WECHAT_UNION"]);
    await expect(service()(user, "wechat", user)).rejects.toThrow("至少保留一种登录方式");
    expect(await db.auth.count({ where: { userId: user } })).toBe(2);
  });
  it("无密码凭据的占位行不能允许删除最后一种登录方式", async () => {
    const user = await fixture(["WECHAT", "PASSWORD"]);
    await db.auth.updateMany({ where: { userId: user, provider: "PASSWORD" }, data: { credential: null } });
    await expect(service()(user, "wechat", user)).rejects.toThrow("至少保留一种登录方式");
    expect(await db.auth.count({ where: { userId: user, provider: "WECHAT" } })).toBe(1);
  });
  it("第二次删除失败时第一批微信身份整笔回滚", async () => {
    const user = await fixture(["WECHAT", "WECHAT_UNION", "PHONE"]);
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_unbind_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.provider = 'WECHAT_UNION' THEN RAISE EXCEPTION 'synthetic union delete failure'; END IF; RETURN OLD; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_unbind_fail BEFORE DELETE ON "Auth" FOR EACH ROW EXECUTE FUNCTION synthetic_unbind_fail()');
    try {
      await expect(service()(user, "wechat", user)).rejects.toThrow("synthetic union delete failure");
      expect(await db.auth.count({ where: { userId: user } })).toBe(3);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_unbind_fail ON "Auth"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_unbind_fail()");
    }
  });
  it("旧操作主体不匹配在事务前拒绝，两个账号身份都不变", async () => {
    const user = await fixture(), another = await fixture();
    const transaction = jest.fn();
    await expect(service({ $transaction: transaction })(user, "wechat", another)).rejects.toThrow("登录账号已变化");
    expect(transaction).not.toHaveBeenCalled();
    expect(await db.auth.count({ where: { userId: { in: [user, another] } } })).toBe(4);
  });
  it("实际删除数量不匹配不返回成功，union锚点也保持不变", async () => {
    const user = await fixture(["WECHAT", "WECHAT_UNION", "PHONE"]);
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_unbind_skip() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.provider = 'WECHAT' THEN RETURN NULL; END IF; RETURN OLD; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_unbind_skip BEFORE DELETE ON "Auth" FOR EACH ROW EXECUTE FUNCTION synthetic_unbind_skip()');
    try {
      await expect(service()(user, "wechat", user)).rejects.toThrow("绑定状态已变化");
      expect(await db.auth.count({ where: { userId: user } })).toBe(3);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_unbind_skip ON "Auth"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_unbind_skip()");
    }
  });
  it("不存在的账号在行锁检查时拒绝，不返回解绑成功", async () => {
    await expect(service()("00000000-0000-0000-0000-000000000000", "wechat")).rejects.toThrow("用户不存在");
  });
  it("不支持的提供方在事务前拒绝", async () => {
    const user = await fixture();
    await expect(service()(user, "phone", user)).rejects.toThrow("不支持的 provider");
    expect(await db.auth.count({ where: { userId: user } })).toBe(2);
  });
});
