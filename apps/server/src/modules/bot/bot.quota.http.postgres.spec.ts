import { randomUUID } from "crypto";
import * as http from "http";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { Observable } from "rxjs";
import { BotController } from "./bot.controller";
import { BotService } from "./bot.service";
import { CozeService } from "./coze.service";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { ResponseInterceptor } from "../../common/response.interceptor";

jest.setTimeout(30000);
const raw = process.env.BOT_QUOTA_TEST_DATABASE_URL;
const target = raw ? new URL(raw) : null;
if (target && (!["127.0.0.1", "localhost"].includes(target.hostname) || !target.pathname.slice(1).startsWith("bot_quota_qa_"))) {
  throw new Error("HTTP 额度测试只能连接本机专用库");
}

(target ? describe : describe.skip)("智能体真实 HTTP 与 PostgreSQL 额度交付", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let currentUserId: string;
  const records: Array<{ userId: string; botConfigId: string }> = [];
  const coze = { chat: jest.fn(), chatStreamEx: jest.fn() };
  const reco = { build: jest.fn(), parseProtocol: jest.fn() };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: raw! } } });
    const service = new BotService(prisma as any, coze as any, reco as any, {} as any);
    jest.spyOn(service as any, "getBotOrThrow").mockImplementation(async (...args: unknown[]) => ({
      id: String(args[0]), name: "测试智能体", botId: "coze-test", apiKey: "", runtime: "coze",
      pricePer10Coin: 100, freeUses: 1, isFree: true, dailyLimit: 10,
    }));
    jest.spyOn(service as any, "isActiveMember").mockResolvedValue(false);
    const mod = await Test.createTestingModule({
      controllers: [BotController],
      providers: [
        { provide: BotService, useValue: service },
        { provide: CozeService, useValue: coze },
        { provide: StreamUnifierService, useValue: { encode: (event: unknown) => `data: ${JSON.stringify(event)}\n\n` } },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: currentUserId };
      return true;
    } }).overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true }).compile();
    app = mod.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    if (app) await app.close();
    if (!prisma) return;
    for (const { userId, botConfigId } of records) {
      await prisma.botChatLog.deleteMany({ where: { userId, botConfigId } });
      await prisma.botQuotaReservation.deleteMany({ where: { userId, botConfigId } });
      await prisma.userBotQuota.deleteMany({ where: { userId, botConfigId } });
    }
    await prisma.$disconnect();
  });

  const identity = async () => {
    const item = { userId: `quota-http-${randomUUID()}`, botConfigId: `bot-http-${randomUUID()}` };
    records.push(item);
    currentUserId = item.userId;
    await prisma.userBotQuota.create({ data: item });
    return item;
  };

  it("非流式 HTTP 响应完成后确认消费，不把内部预留标识下发给用户", async () => {
    const { userId, botConfigId } = await identity();
    coze.chat.mockResolvedValue({ content: "有效回答", conversationId: "qa-conversation", chatId: "qa-chat" });
    reco.build.mockResolvedValue({ content: "有效回答", recommendation: null });
    const response = await request(app.getHttpServer()).post(`/bots/${botConfigId}/chat`).send({ query: "测试问题" }).expect(201);
    expect(response.body.data.content).toBe("有效回答");
    expect(response.body.data.quotaUse).toBeUndefined();
    let status = "RESERVED";
    for (let i = 0; i < 40; i++) {
      status = (await prisma.botQuotaReservation.findFirstOrThrow({ where: { userId, botConfigId } })).status;
      if (status !== "RESERVED") break;
      await new Promise((done) => setTimeout(done, 25));
    }
    expect(status).toBe("DELIVERED");
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(1);
  });

  it("SSE 首个可见片段写出后确认消费", async () => {
    const { userId, botConfigId } = await identity();
    coze.chatStreamEx.mockReturnValue(new Observable((subscriber) => {
      subscriber.next({ type: "meta", conversationId: "qa-stream" });
      subscriber.next({ type: "chunk", content: "流式回答" });
      subscriber.complete();
    }));
    reco.build.mockResolvedValue({ content: "流式回答", recommendation: null });
    const response = await request(app.getHttpServer()).post(`/bots/${botConfigId}/chat/stream`).send({ query: "测试问题" }).expect(201);
    expect(response.text).toContain("流式回答");
    let status = "RESERVED";
    for (let i = 0; i < 40; i++) {
      status = (await prisma.botQuotaReservation.findFirstOrThrow({ where: { userId, botConfigId } })).status;
      if (status !== "RESERVED") break;
      await new Promise((done) => setTimeout(done, 25));
    }
    expect(status).toBe("DELIVERED");
  });

  it("SSE 首字前失败返回错误并释放额度", async () => {
    const { userId, botConfigId } = await identity();
    coze.chatStreamEx.mockReturnValue(new Observable((subscriber) => subscriber.error(new Error("test upstream unavailable"))));
    const response = await request(app.getHttpServer()).post(`/bots/${botConfigId}/chat/stream`).send({ query: "测试问题" }).expect(201);
    expect(response.text).toContain("test upstream unavailable");
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
    expect(await prisma.botQuotaReservation.count({ where: { userId, botConfigId, status: "RELEASED" } })).toBe(1);
  });

  it("SSE 首字前客户端断开时停止等待并返还额度", async () => {
    const { userId, botConfigId } = await identity();
    coze.chatStreamEx.mockReturnValue(new Observable(() => undefined));
    const address = app.getHttpServer().address();
    await new Promise<void>((done, fail) => {
      const req = http.request({
        host: "127.0.0.1", port: address.port, method: "POST",
        path: `/bots/${botConfigId}/chat/stream`,
        headers: { "Content-Type": "application/json" },
      }, (res) => {
        expect(res.statusCode).toBe(201);
        res.on("error", () => undefined); // 主动关闭连接产生的本地错误不影响测试
        req.destroy();
        done();
      });
      req.on("error", (err) => fail(err));
      req.end(JSON.stringify({ query: "测试问题" }));
    });
    let status = "RESERVED";
    for (let i = 0; i < 80; i++) {
      status = (await prisma.botQuotaReservation.findFirstOrThrow({ where: { userId, botConfigId } })).status;
      if (status !== "RESERVED") break;
      await new Promise((done) => setTimeout(done, 25));
    }
    expect(status).toBe("RELEASED");
    expect((await prisma.userBotQuota.findUniqueOrThrow({ where: { userId_botConfigId: { userId, botConfigId } } })).freeUsed).toBe(0);
  });
});
