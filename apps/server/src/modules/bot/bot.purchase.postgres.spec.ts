import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { BotService } from "./bot.service";

jest.setTimeout(60000);
const testUrl = process.env.BOT_QUOTA_TEST_DATABASE_URL;
const target = testUrl ? new URL(testUrl) : null;
if (target && (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.slice(1).startsWith('bot_quota_qa_'))) {
  throw new Error('追问包集成测试只能连接本机 bot_quota_qa_ 专用库');
}

(target ? describe : describe.skip)('BotQuotaPurchase PostgreSQL 购包幂等', () => {
  let prisma: PrismaClient;
  const users: string[] = [];
  const botConfigId = `bot-purchase-qa-${randomUUID()}`;
  const price = 100;

  const coin = {
    async spend(userId: string, input: { amountCoin: number; scene: string; refId?: string; description?: string }, tx: PrismaClient) {
      const result = await tx.virtualCoinAccount.updateMany({
        where: { userId, balance: { gte: input.amountCoin } },
        data: { balance: { decrement: input.amountCoin }, totalSpent: { increment: input.amountCoin } },
      });
      if (result.count !== 1) throw new Error('测试账户余额不足');
      const account = await tx.virtualCoinAccount.findUniqueOrThrow({ where: { userId } });
      await tx.virtualCoinTransaction.create({
        data: { userId, type: 'SPEND', amountCoin: -input.amountCoin, balanceAfter: account.balance,
          scene: 'BOT_CALL', refId: input.refId, description: input.description },
      });
    },
  };

  const service = (db: PrismaClient) => {
    const svc = new BotService(db as any, {} as any, {} as any, {} as any, coin as any);
    jest.spyOn(svc as any, 'getBotOrThrow').mockResolvedValue({ id: botConfigId, name: '测试助手', pricePer10Coin: price });
    return svc;
  };

  const newUser = async () => {
    const user = await prisma.user.create({ data: { nickname: `额度测试-${randomUUID()}` } });
    users.push(user.id);
    await prisma.virtualCoinAccount.create({ data: { userId: user.id, balance: 500 } });
    return user.id;
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!rows[0]?.name.startsWith('bot_quota_qa_')) throw new Error('测试库身份核验失败');
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const userId of users) {
      await prisma.botQuotaPurchase.deleteMany({ where: { userId } });
      await prisma.userBotQuota.deleteMany({ where: { userId } });
      await prisma.virtualCoinTransaction.deleteMany({ where: { userId } });
      await prisma.virtualCoinAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('同号并发及超时重试只扣一次币、发放一包；新号才再次购买', async () => {
    const userId = await newUser();
    const svc = service(prisma);
    const requestId = `bot-purchase-${randomUUID()}`;
    const attempts = await Promise.all(Array.from({ length: 6 }, () => svc.purchaseUses(botConfigId, userId, requestId)));
    expect(attempts).toEqual(Array.from({ length: 6 }, () => ({ purchased: 10, paidRemaining: 10 })));
    expect(await svc.purchaseUses(botConfigId, userId, requestId)).toEqual({ purchased: 10, paidRemaining: 10 });
    expect(await prisma.botQuotaPurchase.count({ where: { userId, botConfigId } })).toBe(1);
    expect(await prisma.virtualCoinTransaction.count({ where: { userId, scene: 'BOT_CALL' } })).toBe(1);
    expect((await prisma.virtualCoinAccount.findUniqueOrThrow({ where: { userId } })).balance).toBe(400);
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).paidRemaining).toBe(10);

    expect(await svc.purchaseUses(botConfigId, userId, `bot-purchase-${randomUUID()}`)).toEqual({ purchased: 10, paidRemaining: 20 });
    expect(await prisma.virtualCoinTransaction.count({ where: { userId, scene: 'BOT_CALL' } })).toBe(2);
  });

  it('发放写入失败时整笔回滚，原请求号仍可重试', async () => {
    const userId = await newUser();
    const requestId = `bot-purchase-${randomUUID()}`;
    const faulty = prisma.$extends({
      query: { userBotQuota: { async upsert() { throw new Error('injected purchase grant failure'); } } },
    });
    await expect(service(faulty as any).purchaseUses(botConfigId, userId, requestId)).rejects.toThrow('injected purchase grant failure');
    expect(await prisma.botQuotaPurchase.count({ where: { userId, botConfigId } })).toBe(0);
    expect(await prisma.virtualCoinTransaction.count({ where: { userId, scene: 'BOT_CALL' } })).toBe(0);
    expect((await prisma.virtualCoinAccount.findUniqueOrThrow({ where: { userId } })).balance).toBe(500);
    expect(await service(prisma).purchaseUses(botConfigId, userId, requestId)).toEqual({ purchased: 10, paidRemaining: 10 });
  });
});
