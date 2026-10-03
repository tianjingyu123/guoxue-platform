/** 仅连接固定回环测试服务；不加载环境文件，不发送任何真实推送。 */
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { NotificationService } from "../src/modules/notification/notification.service";
import { RedisService } from "../src/redis/redis.service";

const dbUrl = "postgresql://rebu_test@127.0.0.1:55439/rebu_candidate_test";
const redisUrl = "redis://127.0.0.1:56379/0";
if (process.env.REBU_ALLOW_LOCAL_NOTIFICATION_PROCESS_TEST !== "1") {
  throw new Error("须显式启用本机合成通知测试");
}
process.env.REDIS_URL = redisUrl;
delete process.env.REDIS_SENTINEL_HOSTS;

async function worker() {
  const userId = process.argv[3];
  const event = process.argv[4];
  assert.match(userId, /^synthetic-notification-process-/);
  assert.match(event, /^ORDER_PAID:synthetic-/);
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const redis = new RedisService();
  const svc = new NotificationService(prisma as any, redis, {} as any, {} as any);
  await prisma.$connect();
  // 从另一个连接核对真实 Redis，防止把内存降级误记为共享去重。
  const probe = new Redis(redisUrl, { maxRetriesPerRequest: 0 });
  await redis.setNX(`probe:${userId}:${process.pid}`, "shared", 60);
  assert.equal(await probe.get(`probe:${userId}:${process.pid}`), "shared");
  await probe.del(`probe:${userId}:${process.pid}`);
  await probe.quit();
  const go = new Promise<void>(resolve => process.once("message", () => resolve()));
  process.send?.({ ready: true, pid: process.pid });
  await go;
  try {
    const result = await svc.sendOnce(userId, event, {
      type: "PURCHASE", title: "合成通知", content: "仅用于本机隔离验证",
      targetType: "ORDER", targetId: "synthetic-order",
    });
    process.send?.({ result: result ? "created" : "duplicate" });
  } catch (err) {
    process.send?.({ result: "failed", code: (err as any).code || "UNKNOWN" });
  } finally {
    await prisma.$disconnect();
    await redis.onModuleDestroy();
    process.disconnect?.();
  }
}

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 0 });
  const users = [0, 1].map(() => `synthetic-notification-process-${randomUUID()}`);
  const event = `ORDER_PAID:synthetic-${randomUUID()}`;
  const key = (u: string) => `notification:sent:${u}:${event}`;
  const prefs = (u: string) => `notification:prefs:${u}`;
  const run = async (userId: string, count: number) => {
    const children: ReturnType<typeof fork>[] = [];
    const ready: Promise<void>[] = [];
    const pids = new Set<number>();
    const outcomes: Promise<string>[] = [];
    for (let i = 0; i < count; i++) {
      const child = fork(__filename, ["worker", userId, event], {
        execArgv: ["-r", "ts-node/register/transpile-only"],
        stdio: ["ignore", "ignore", "inherit", "ipc"],
      });
      children.push(child);
      let readyResolve!: () => void;
      let readyReject!: (e: Error) => void;
      ready.push(new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; }));
      outcomes.push(new Promise((resolve, reject) => {
        let outcome: string | undefined;
        const timer = setTimeout(() => { child.kill(); reject(new Error("子进程超时")); }, 30000);
        child.on("message", (msg: any) => {
          if (msg.ready) { pids.add(msg.pid); readyResolve(); }
          if (msg.result) outcome = msg.result;
        });
        child.on("error", err => { clearTimeout(timer); readyReject(err); reject(err); });
        child.on("exit", code => {
          clearTimeout(timer);
          if (code === 0 && outcome) resolve(outcome);
          else { const e = new Error(`子进程失败 ${code}`); readyReject(e); reject(e); }
        });
      }));
    }
    // 立即订阅所有拒绝，避免启动错误变为未处理拒绝。
    const completed = Promise.all(outcomes);
    try {
      await Promise.all(ready);
      assert.equal(pids.size, count);
      children.forEach(child => child.send("go"));
      return await completed;
    } finally { children.forEach(child => { if (child.exitCode === null) child.kill(); }); }
  };
  try {
    assert.equal(await redis.ping(), "PONG");
    await prisma.$connect();
    for (const user of users) await redis.set(prefs(user), JSON.stringify({ PUSH_ENABLED: false }), "EX", 300);
    await prisma.user.create({ data: { id: users[0], nickname: "合成并发用户" } });
    assert.deepEqual((await run(users[0], 2)).sort(), ["created", "duplicate"]);
    assert.equal(await prisma.notification.count({ where: { userId: users[0] } }), 1);
    assert.equal(await redis.get(key(users[0])), "1");
    console.log("PASS 两个独立进程并发，仅一条通知，真实 Redis 占位存在");
    await redis.del(key(users[0]));
    assert.deepEqual(await run(users[0], 2), ["duplicate", "duplicate"]);
    assert.equal(await prisma.notification.count({ where: { userId: users[0] } }), 1);
    console.log("PASS Redis 去重记录丢失后，数据库唯一键阻止重复通知");
    assert.deepEqual(await run(users[1], 1), ["failed"]);
    assert.equal(await redis.get(key(users[1])), null);
    await prisma.user.create({ data: { id: users[1], nickname: "合成重试用户" } });
    assert.deepEqual((await run(users[1], 2)).sort(), ["created", "duplicate"]);
    assert.equal(await prisma.notification.count({ where: { userId: users[1] } }), 1);
    console.log("PASS 真实外键失败释放 Redis 占位，修复条件后跨进程重试成功");
  } finally {
    await prisma.notification.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await redis.del(...users.flatMap(u => [key(u), prefs(u)]));
    await prisma.$disconnect();
    await redis.quit();
  }
}

(process.argv[2] === "worker" ? worker() : main()).catch(err => {
  console.error(err);
  process.exitCode = 1;
});
