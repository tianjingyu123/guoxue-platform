import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { BotService } from "./bot.service";

jest.setTimeout(30000);

// 只允许专用本机 QA 库；没有明确地址时不连接任何数据库。
const testUrl = process.env.BOT_QUOTA_TEST_DATABASE_URL;
const target = testUrl ? new URL(testUrl) : null;
if (target && (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  !target.pathname.slice(1).startsWith("bot_quota_qa_")
)) throw new Error("额度集成测试只能连接本机 bot_quota_qa_ 专用库");

(target ? describe : describe.skip)("BotQuotaReservation PostgreSQL 集成", () => {
  let prisma: PrismaClient;
  let svc: BotService;
  const identities: Array<{ userId: string; botConfigId: string }> = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!rows[0]?.name.startsWith("bot_quota_qa_")) throw new Error("测试库身份核验失败");
    svc = new BotService(prisma as any, {} as any, {} as any, {} as any);
    jest.spyOn(svc as any, "getBotOrThrow").mockResolvedValue({ pricePer10Coin: 100, freeUses: 1 });
    jest.spyOn(svc as any, "isActiveMember").mockResolvedValue(false);
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const { userId, botConfigId } of identities) {
      await prisma.botQuotaReservation.deleteMany({ where: { userId, botConfigId } });
      await prisma.userBotQuota.deleteMany({ where: { userId, botConfigId } });
    }
    await prisma.$disconnect();
  });

  const identity = () => {
    const item = { userId: `quota-qa-${randomUUID()}`, botConfigId: `bot-qa-${randomUUID()}` };
    identities.push(item);
    return item;
  };

  it("20 个并发请求只预留一次试用；重复并发释放只返还一次", async () => {
    const { userId, botConfigId } = identity();
    await prisma.userBotQuota.create({ data: { userId, botConfigId } });
    const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => svc.consumeQuota(botConfigId, userId)));
    const accepted = attempts.filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<BotService["consumeQuota"]>>> => item.status === "fulfilled");
    expect(accepted).toHaveLength(1);
    const use = accepted[0].value;
    expect(use).toMatchObject({ charge: "trial", reservationId: expect.any(String) });
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(1);
    expect(await prisma.botQuotaReservation.count({ where: { userId, botConfigId, status: "RESERVED" } })).toBe(1);

    await Promise.all(Array.from({ length: 20 }, () => svc.releaseFailedQuota(botConfigId, userId, use)));
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
    expect(await prisma.botQuotaReservation.count({ where: { userId, botConfigId, status: "RELEASED" } })).toBe(1);
  });

  it("两个独立进程同时释放同一预留也只退一次", async () => {
    const { userId, botConfigId } = identity();
    await prisma.userBotQuota.create({ data: { userId, botConfigId, freeUsed: 1 } });
    const reservation = await prisma.botQuotaReservation.create({ data: { userId, botConfigId, charge: "trial" } });
    const worker = resolve(__dirname, "../../../test-support/bot-quota-release-worker.cjs");
    const runWorker = () => new Promise<void>((done, fail) => {
      const child = spawn(process.execPath, ["-r", require.resolve("ts-node/register/transpile-only"), worker, botConfigId, userId, reservation.id], {
        cwd: resolve(__dirname, "../../.."),
        env: { ...process.env, BOT_QUOTA_TEST_DATABASE_URL: testUrl! },
      });
      let error = "";
      child.stderr.on("data", (chunk) => { error += String(chunk); });
      child.on("error", fail);
      child.on("exit", (code) => code === 0 ? done() : fail(new Error(`额度测试子进程失败: ${error.slice(0, 300)}`)));
    });
    await Promise.all([runWorker(), runWorker()]);
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
    expect(await prisma.botQuotaReservation.count({ where: { id: reservation.id, status: "RELEASED" } })).toBe(1);
  });

  it("已购额度交付后不再被失败释放返还", async () => {
    const { userId, botConfigId } = identity();
    await prisma.userBotQuota.create({ data: { userId, botConfigId, freeUsed: 1, paidRemaining: 1 } });
    const use = await svc.consumeQuota(botConfigId, userId);
    expect(use.charge).toBe("paid");
    await svc.markDeliveredQuota(use);
    await svc.releaseFailedQuota(botConfigId, userId, use);
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).paidRemaining).toBe(0);
    expect(await prisma.botQuotaReservation.count({ where: { userId, botConfigId, status: "DELIVERED" } })).toBe(1);
  });

  it("预留流水写失败时整笔事务回滚，不白扣额度", async () => {
    const { userId, botConfigId } = identity();
    await prisma.userBotQuota.create({ data: { userId, botConfigId } });
    const faulty = prisma.$extends({
      query: { botQuotaReservation: { async create() { throw new Error("injected ledger failure"); } } },
    });
    const faultySvc = new BotService(faulty as any, {} as any, {} as any, {} as any);
    jest.spyOn(faultySvc as any, "getBotOrThrow").mockResolvedValue({ pricePer10Coin: 100, freeUses: 1 });
    jest.spyOn(faultySvc as any, "isActiveMember").mockResolvedValue(false);
    await expect(faultySvc.consumeQuota(botConfigId, userId)).rejects.toThrow("injected ledger failure");
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
    expect(await prisma.botQuotaReservation.count({ where: { userId, botConfigId } })).toBe(0);
  });

  it("退额账户写失败时释放状态回滚，后续仍可重试", async () => {
    const { userId, botConfigId } = identity();
    await prisma.userBotQuota.create({ data: { userId, botConfigId, freeUsed: 1 } });
    const reservation = await prisma.botQuotaReservation.create({ data: { userId, botConfigId, charge: "trial" } });
    const faulty = prisma.$extends({
      query: { userBotQuota: { async updateMany() { throw new Error("injected quota write failure"); } } },
    });
    const faultySvc = new BotService(faulty as any, {} as any, {} as any, {} as any);
    const use = { charge: "trial" as const, reservationId: reservation.id };
    await expect(faultySvc.releaseFailedQuota(botConfigId, userId, use)).rejects.toThrow("injected quota write failure");
    expect(await prisma.botQuotaReservation.count({ where: { id: reservation.id, status: "RESERVED" } })).toBe(1);
    await svc.releaseFailedQuota(botConfigId, userId, use);
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
  });

  it("进程遗留的过期预留可恢复；二次扫尾不重复返还", async () => {
    const { userId, botConfigId } = identity();
    await prisma.userBotQuota.create({ data: { userId, botConfigId, freeUsed: 1 } });
    await prisma.botQuotaReservation.create({
      data: { userId, botConfigId, charge: "trial", createdAt: new Date(Date.now() - 40 * 60 * 1000) },
    });
    await svc.sweepStaleQuotaReservations();
    await svc.sweepStaleQuotaReservations();
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
    expect(await prisma.botQuotaReservation.count({ where: { userId, botConfigId, status: "RELEASED" } })).toBe(1);
  });
});
