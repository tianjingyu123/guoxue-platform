import { PrismaClient } from "@prisma/client";

/**
 * 真实库集成测试的全局配置锁。
 *
 * 几个套件要改同一行全局配置（ConfigSystem 的 voice_billing_config / xiaobu_commerce_config），
 * jest 并行跑时一个套件收尾删配置会让另一个中途「不收费」而失败（偶发、难复现）。
 * 用 PostgreSQL 会话级咨询锁把这些套件串行化：beforeAll 拿锁、afterAll 放锁。
 * 锁挂在单连接的专用客户端上（连接断开锁自动释放，测试崩溃也不会死锁）。
 */
const LOCK_KEY = 72_010_922;

export async function acquireGlobalConfigLock(dbUrl: string) {
  const url = dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connection_limit=1";
  const client = new PrismaClient({ datasources: { db: { url } } });
  await client.$executeRawUnsafe(`SELECT pg_advisory_lock(${LOCK_KEY})`);
  return async () => {
    try {
      await client.$executeRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_KEY})`);
    } finally {
      await client.$disconnect();
    }
  };
}
