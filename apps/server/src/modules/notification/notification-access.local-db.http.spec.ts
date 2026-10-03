import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import { PushAudienceService } from "../user/push-audience.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";

// 仅允许本机固定测试库；不从生产 DATABASE_URL 自动回退。
const localUrl = process.env.REBU_LOCAL_NOTIFICATION_TEST_URL || "";
const isolated = (() => {
  try {
    const url = new URL(localUrl);
    return url.protocol === "postgresql:" && url.hostname === "127.0.0.1"
      && url.port === "55439" && url.username === "rebu_test"
      && url.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isolated ? describe : describe.skip)("通知本人权限独立库 HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const previousSecret = process.env.JWT_SECRET;
  const secret = "synthetic-notification-local-http-secret";
  const users = [0, 1].map(() => `synthetic-notify-user-${randomUUID()}`);
  const notifications = [0, 1].map(() => `synthetic-notify-record-${randomUUID()}`);
  const token = (i: number) => jwt.sign({ sub: users[i] }, secret, { expiresIn: "5m" });
  const channelCall = jest.fn(() => { throw new Error("本地读取验收禁止调用推送渠道"); });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
    await prisma.$connect();
    await prisma.user.createMany({ data: users.map(id => ({ id, nickname: "合成通知用户" })) });
    // 直接准备合成站内记录，不调用发送方法或任何外部服务。
    await prisma.notification.createMany({ data: notifications.map((id, i) => ({
      id, userId: users[i], type: "SYSTEM", title: `合成通知${i}`,
      content: `仅用户${i}可见的合成正文`,
    })) });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [NotificationController],
      providers: [
        NotificationService, JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: async () => null } },
        { provide: PushService, useValue: { send: channelCall, push: channelCall } },
        { provide: PushAudienceService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      await prisma.notification.deleteMany({ where: { id: { in: notifications } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it("列表仅含本人通知；游客和其他用户无法查看正文，拒绝访问不修改已读", async () => {
    const base = "/api/v1/notifications";
    await request(app.getHttpServer()).get(`${base}/${notifications[1]}`).expect(401);
    const list = await request(app.getHttpServer()).get(base)
      .set("Authorization", `Bearer ${token(0)}`).expect(200);
    expect(list.body.notifications.map((n: { id: string }) => n.id)).toEqual([notifications[0]]);
    const denied = await request(app.getHttpServer()).get(`${base}/${notifications[1]}`)
      .set("Authorization", `Bearer ${token(0)}`).expect(404);
    expect(JSON.stringify(denied.body)).not.toContain("仅用户1可见的合成正文");
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: notifications[1] } })).isRead).toBe(false);
    const own = await request(app.getHttpServer()).get(`${base}/${notifications[1]}`)
      .set("Authorization", `Bearer ${token(1)}`).expect(200);
    expect(own.body.content).toBe("仅用户1可见的合成正文");
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: notifications[1] } })).isRead).toBe(true);
  });

  it("不能修改他人已读状态或调用管理员发送入口", async () => {
    const base = "/api/v1/notifications";
    await request(app.getHttpServer()).put(`${base}/${notifications[0]}/read`)
      .set("Authorization", `Bearer ${token(1)}`).expect(403);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: notifications[0] } })).isRead).toBe(false);
    await request(app.getHttpServer()).post(base).set("Authorization", `Bearer ${token(0)}`)
      .send({ userId: users[1], type: "SYSTEM", title: "禁止发送", content: "禁止发送" }).expect(403);
    expect(await prisma.notification.count({ where: { userId: { in: users } } })).toBe(2);
    expect(channelCall).not.toHaveBeenCalled();
  });
});
