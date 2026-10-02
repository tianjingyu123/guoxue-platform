import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { LiveService } from "./live.service";
import { NotificationService } from "../notification/notification.service";

const url = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55462" ||
    u.username !== "qa_voice" ||
    !u.pathname.startsWith("/entitlement_notice_qa_")
  )
    throw new Error("直播取消验收仅允许显式专用合成库");
}
jest.setTimeout(30000);
(url ? describe : describe.skip)("直播预约选取后取消与同事务通知边界", () => {
  let db: PrismaClient, second: PrismaClient;
  const rooms: string[] = [],
    users: string[] = [];
  const forbidden = jest.fn(() => {
    throw new Error("禁止真实外发");
  });
  const redis = {
    runExclusive: async (_key: string, _ttl: number, run: () => Promise<unknown>) => run(),
    getJson: async () => ({ PUSH_ENABLED: false }),
  };
  const notification = () =>
    new NotificationService(db as never, redis as never, new Proxy({}, { get: () => forbidden }) as never, {} as never);
  const service = (n = notification(), p = db) =>
    new LiveService(
      p as never,
      redis as never,
      null as never,
      null as never,
      null as never,
      null as never,
      undefined,
      undefined,
      n,
    );
  const modes = [
    {
      label: "提前",
      status: "WAITING" as const,
      method: "remindUpcomingBookings" as const,
      event: "LIVE_REMINDER",
      marker: "remindedAt" as const,
    },
    {
      label: "开播",
      status: "LIVING" as const,
      method: "reconcileStartedBookingNotifications" as const,
      event: "LIVE_STARTED",
      marker: "notifiedAt" as const,
    },
  ];
  const user = async () => {
    const u = await db.user.create({ data: { nickname: "合成直播预约" } });
    users.push(u.id);
    return u.id;
  };
  const fixture = async (mode: (typeof modes)[number]) => {
    const uid = await user(),
      room = await db.liveRoom.create({
        data: {
          userId: uid,
          hostUserId: uid,
          title: "合成预约直播",
          status: mode.status,
          visibility: "PLATFORM",
          startTime: new Date(Date.now() + 5 * 60_000),
        },
      });
    rooms.push(room.id);
    const booking = await db.liveBooking.create({ data: { roomId: room.id, userId: uid } });
    return { roomId: room.id, userId: uid, bookingId: booking.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const count = (f: Fixture) => db.notification.count({ where: { targetId: f.roomId } });
  const marker = async (f: Fixture, m: (typeof modes)[number]) =>
    (await db.liveBooking.findUniqueOrThrow({ where: { id: f.bookingId } }))[m.marker];
  const beforePersistence = (n: NotificationService, run: () => Promise<unknown>) => {
    const original = n.batchSend.bind(n);
    return jest.spyOn(n, "batchSend").mockImplementation(async (...args) => {
      await run();
      return original(...args);
    });
  };
  const withFailure = async (table: "Notification" | "LiveBooking", work: () => Promise<void>) => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION isolated_live_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic live write failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER isolated_live_notice_fail BEFORE ${table === "Notification" ? "INSERT" : "UPDATE"} ON "${table}" FOR EACH ROW EXECUTE FUNCTION isolated_live_notice_fail()`,
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER isolated_live_notice_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION isolated_live_notice_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasourceUrl: url });
    second = new PrismaClient({ datasourceUrl: url });
    const [i] = await db.$queryRaw<
      Array<{ port: number; database: string; owner: string }>
    >`SELECT inet_server_port() AS port,current_database() AS database,current_user AS owner`;
    expect([55462, 5432]).toContain(i.port);
    expect(i.database).toBe(new URL(url!).pathname.slice(1));
    expect(i.owner).toBe("qa_voice");
  });
  afterEach(async () => {
    expect(forbidden).not.toHaveBeenCalled();
    jest.restoreAllMocks();
    await db.notification.deleteMany({ where: { targetId: { in: rooms } } });
    await db.liveRoom.deleteMany({ where: { id: { in: rooms } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    rooms.length = 0;
    users.length = 0;
  });
  afterAll(async () => {
    await db?.$disconnect();
    await second?.$disconnect();
  });
  for (const m of modes) {
    describe(m.label, () => {
      it("有效预约通知和标记同时提交，重复扫描只一条", async () => {
        const f = await fixture(m);
        await service()[m.method]();
        await service()[m.method]();
        expect(await count(f)).toBe(1);
        expect(await marker(f, m)).not.toBeNull();
        expect((await db.notification.findFirstOrThrow({ where: { targetId: f.roomId } })).idempotencyKey).toBe(
          `${f.userId}:${m.event}:${f.roomId}`,
        );
      });
      it("选取后真实取消已提交，不发通知也不标记已取消行", async () => {
        const f = await fixture(m),
          n = notification();
        beforePersistence(n, () => service(n, second).unbookRoom(f.roomId, f.userId));
        await service(n)[m.method]();
        expect(await count(f)).toBe(0);
        expect(await marker(f, m)).toBeNull();
        expect((await db.liveBooking.findUniqueOrThrow({ where: { id: f.bookingId } })).status).toBe("CANCELLED");
      });
      it("选取后房间结束，不发送过时通知", async () => {
        const f = await fixture(m),
          n = notification();
        beforePersistence(n, () => second.liveRoom.update({ where: { id: f.roomId }, data: { status: "ENDED" } }));
        await service(n)[m.method]();
        expect(await count(f)).toBe(0);
        expect(await marker(f, m)).toBeNull();
      });
      it("选取后房间下架，不泄露下架场次通知", async () => {
        const f = await fixture(m),
          n = notification();
        beforePersistence(n, () =>
          second.liveRoom.update({ where: { id: f.roomId }, data: { auditStatus: "REJECTED" } }),
        );
        await service(n)[m.method]();
        expect(await count(f)).toBe(0);
        expect(await marker(f, m)).toBeNull();
      });
      it("候选行收件人已改变，不能仅凭行ID标记其他用户", async () => {
        const f = await fixture(m),
          other = await user(),
          n = notification();
        beforePersistence(n, () => second.liveBooking.update({ where: { id: f.bookingId }, data: { userId: other } }));
        await service(n)[m.method]();
        expect(await count(f)).toBe(0);
        expect(await marker(f, m)).toBeNull();
      });
      it("通知数据库失败不落标记，释放后下一轮成功", async () => {
        const f = await fixture(m);
        await withFailure("Notification", async () => {
          await service()[m.method]();
          expect(await count(f)).toBe(0);
          expect(await marker(f, m)).toBeNull();
        });
        await service()[m.method]();
        expect(await count(f)).toBe(1);
        expect(await marker(f, m)).not.toBeNull();
      });
      it("标记数据库失败整笔回滚通知，下一轮只一条", async () => {
        const f = await fixture(m);
        await withFailure("LiveBooking", async () => {
          await service()[m.method]();
          expect(await count(f)).toBe(0);
          expect(await marker(f, m)).toBeNull();
        });
        await service()[m.method]();
        expect(await count(f)).toBe(1);
        expect(await marker(f, m)).not.toBeNull();
      });
      it("两个独立数据库连接抢同一批只建立一条通知", async () => {
        const f = await fixture(m);
        await Promise.all([
          service()[m.method](),
          service(new NotificationService(second as never, redis as never, {} as never, {} as never), second)[
            m.method
          ](),
        ]);
        expect(await count(f)).toBe(1);
        expect(await marker(f, m)).not.toBeNull();
      });
      it("通知详情仍核对收件人，其他用户不可读取", async () => {
        const f = await fixture(m),
          other = await user();
        await service()[m.method]();
        const row = await db.notification.findFirstOrThrow({ where: { targetId: f.roomId } });
        expect((await notification().getById(row.id, f.userId)).id).toBe(row.id);
        await expect(notification().getById(row.id, other)).rejects.toThrow();
      });
    });
  }
  it("选取后改期到窗口外，不发原排期提醒", async () => {
    const m = modes[0],
      f = await fixture(m),
      n = notification();
    beforePersistence(n, () =>
      second.liveRoom.update({ where: { id: f.roomId }, data: { startTime: new Date(Date.now() + 90 * 60_000) } }),
    );
    await service(n)[m.method]();
    expect(await count(f)).toBe(0);
    expect(await marker(f, m)).toBeNull();
  });
  it("选取后标题和有效排期变化，按锁定的新值落通知", async () => {
    const m = modes[0],
      f = await fixture(m),
      n = notification();
    beforePersistence(n, () =>
      second.liveRoom.update({
        where: { id: f.roomId },
        data: { title: "更新后的合成直播", startTime: new Date(Date.now() + 10 * 60_000) },
      }),
    );
    await service(n)[m.method]();
    const row = await db.notification.findFirstOrThrow({ where: { targetId: f.roomId } });
    expect(row.content).toContain("更新后的合成直播");
    expect(row.content).toMatch(/约 (9|10) 分钟/);
  });
  it("两个独立Node进程不用Redis锁也由数据库防重", async () => {
    const f = await fixture(modes[1]);
    const worker = `require('reflect-metadata');const{PrismaClient}=require('@prisma/client');const{LiveService}=require(${JSON.stringify(resolve("src/modules/live/live.service.ts"))});const{NotificationService}=require(${JSON.stringify(resolve("src/modules/notification/notification.service.ts"))});const p=new PrismaClient({datasourceUrl:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL});const r={runExclusive:async(_k,_t,fn)=>fn(),getJson:async()=>({PUSH_ENABLED:false})};(async()=>{try{await new LiveService(p,r,null,null,null,null,undefined,undefined,new NotificationService(p,r,{},{})).reconcileStartedBookingNotifications();console.log('WORKER_OK:'+process.pid)}finally{await p.$disconnect()}})().catch(e=>{console.error(e.message);process.exitCode=1});`;
    const run = () =>
      promisify(execFile)(
        process.execPath,
        ["-r", resolve("node_modules/ts-node/register/transpile-only"), "-e", worker],
        { env: { ...process.env, TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: "CommonJS" }) }, timeout: 20000 },
      );
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.stdout).toContain("WORKER_OK:");
    expect(b.stdout).toContain("WORKER_OK:");
    expect(a.stdout).not.toBe(b.stdout);
    expect(await count(f)).toBe(1);
  });
  it("通知已取得行锁时取消等待提交，以实际事务先后决定结果", async () => {
    const m = modes[1],
      f = await fixture(m);
    let locked!: () => void, release!: () => void;
    const held = new Promise<void>((r) => {
        locked = r;
      }),
      released = new Promise<void>((r) => {
        release = r;
      });
    const guarded = new Proxy(db, {
      get(target, name) {
        if (name !== "$transaction") return Reflect.get(target, name);
        return (run: (tx: unknown) => Promise<unknown>) =>
          target.$transaction(
            async (tx) =>
              run(
                new Proxy(tx, {
                  get(client, key) {
                    if (key !== "notification") return Reflect.get(client, key);
                    return new Proxy(client.notification, {
                      get(notices, operation) {
                        if (operation !== "createManyAndReturn") return Reflect.get(notices, operation);
                        return async (args: Parameters<typeof notices.createManyAndReturn>[0]) => {
                          locked();
                          await released;
                          return notices.createManyAndReturn(args);
                        };
                      },
                    });
                  },
                }),
              ),
            { timeout: 10000 },
          );
      },
    });
    const n = new NotificationService(guarded as never, redis as never, {} as never, {} as never);
    const send = service(n, guarded)[m.method]();
    let cancelled = false,
      cancellation: Promise<unknown> | undefined;
    try {
      await held;
      cancellation = service(notification(), second)
        .unbookRoom(f.roomId, f.userId)
        .then((r) => {
          cancelled = true;
          return r;
        });
      let waiting = 0;
      for (let i = 0; i < 40 && !waiting; i++) {
        const [row] = await db.$queryRaw<
          Array<{ n: number }>
        >`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%LiveBooking%'`;
        waiting = row.n;
        if (!waiting) await new Promise((r) => setTimeout(r, 25));
      }
      expect(waiting).toBeGreaterThan(0);
      expect(cancelled).toBe(false);
    } finally {
      release();
      await send;
      await cancellation;
    }
    expect(await count(f)).toBe(1);
    expect(await marker(f, m)).not.toBeNull();
    expect((await db.liveBooking.findUniqueOrThrow({ where: { id: f.bookingId } })).status).toBe("CANCELLED");
  });
});
