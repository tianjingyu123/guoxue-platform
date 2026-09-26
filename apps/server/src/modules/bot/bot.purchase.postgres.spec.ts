import { randomUUID } from "crypto";
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PrismaClient } from "@prisma/client";
import request from 'supertest';
import { BotController } from './bot.controller';
import { BotService } from "./bot.service";
import { CozeService } from './coze.service';
import { CoinService } from "../coin/coin.service";
import { StreamUnifierService } from '../ai-gateway/stream-unifier.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { StrictRedisThrottleGuard } from '../../common/redis-throttle.guard';
import { ResponseInterceptor } from '../../common/response.interceptor';

jest.setTimeout(60000);
const testUrl = process.env.BOT_QUOTA_TEST_DATABASE_URL;
const target = testUrl ? new URL(testUrl) : null;
if (target && (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.slice(1).startsWith('bot_quota_qa_'))) {
  throw new Error('追问包集成测试只能连接本机 bot_quota_qa_ 专用库');
}

(target ? describe : describe.skip)('BotQuotaPurchase PostgreSQL 购包幂等', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let currentUserId: string;
  const users: string[] = [];
  const botConfigId = `bot-purchase-qa-${randomUUID()}`;
  const price = 100;

  const service = (db: PrismaClient) => {
    const coin = new CoinService(db as any, {} as any);
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
    const svc = service(prisma);
    const mod = await Test.createTestingModule({
      controllers: [BotController],
      providers: [
        { provide: BotService, useValue: svc },
        { provide: CozeService, useValue: {} },
        { provide: StreamUnifierService, useValue: {} },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: currentUserId };
      return true;
    } }).overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true }).compile();
    app = mod.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
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

  it('真实 HTTP 入口透传请求号，重复请求只扣一次并返回同一权益', async () => {
    const userId = await newUser();
    currentUserId = userId;
    const requestId = `bot-purchase-http-${randomUUID()}`;
    const endpoint = `/bots/${botConfigId}/purchase-uses`;
    const first = await request(app.getHttpServer()).post(endpoint).send({ requestId }).expect(201);
    const retry = await request(app.getHttpServer()).post(endpoint).send({ requestId }).expect(201);
    expect(first.body.data).toEqual({ purchased: 10, paidRemaining: 10 });
    expect(retry.body.data).toEqual(first.body.data);
    expect(await prisma.botQuotaPurchase.count({ where: { userId, botConfigId } })).toBe(1);
    expect(await prisma.virtualCoinTransaction.count({ where: { userId, scene: 'BOT_CALL' } })).toBe(1);
    expect((await prisma.virtualCoinAccount.findUniqueOrThrow({ where: { userId } })).balance).toBe(400);
  });

  it('不同登录用户使用相同请求号时各自购买，权益和扣币不串户', async () => {
    const firstUserId = await newUser();
    const secondUserId = await newUser();
    const requestId = `bot-purchase-shared-${randomUUID()}`;
    const endpoint = `/bots/${botConfigId}/purchase-uses`;
    currentUserId = firstUserId;
    await request(app.getHttpServer()).post(endpoint).send({ requestId }).expect(201);
    currentUserId = secondUserId;
    await request(app.getHttpServer()).post(endpoint).send({ requestId }).expect(201);
    for (const userId of [firstUserId, secondUserId]) {
      expect(await prisma.botQuotaPurchase.count({ where: { userId, botConfigId, requestId } })).toBe(1);
      expect(await prisma.virtualCoinTransaction.count({ where: { userId, scene: 'BOT_CALL' } })).toBe(1);
      expect((await prisma.virtualCoinAccount.findUniqueOrThrow({ where: { userId } })).balance).toBe(400);
      expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).paidRemaining).toBe(10);
    }
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
