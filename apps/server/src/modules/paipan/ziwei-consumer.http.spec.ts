import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import * as jwt from "jsonwebtoken";
import request from "supertest";
import { PaipanController } from "./paipan.controller";
import { PaipanService } from "./paipan.service";
import { PaipanAiService } from "./paipan-ai.service";
import { PaipanReportService } from "./paipan-report.service";
import { PaipanReportDialogueService } from "./paipan-report-dialogue.service";
import { PaipanCaseFeedbackService } from "./paipan-case-feedback.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { PaipanRuntimeService } from "../../common/paipan-runtime.service";

describe("消费者紫微命书 HTTP 入口", () => {
  let app: INestApplication;
  const previous = {
    jwt: process.env.JWT_SECRET,
    encryption: process.env.ENCRYPTION_KEY,
    mode: process.env.PAIPAN_MODE,
  };
  const jwtSecret = "synthetic-ziwei-consumer-http-secret";
  const rows: Array<{
    id: string; userId: string; clientBirth: string;
    resultData: { source: string }; inputParams: unknown; createdAt: Date;
  }> = [];
  const users = new Set(["synthetic-owner", "synthetic-other"]);
  const prisma = {
    user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
      users.has(where.id) ? { id: where.id, status: "ACTIVE", roles: [] } : null) },
    paipanRecord: {
      create: jest.fn(async ({ data }: { data: {
        userId: string; clientBirth: string; resultData: { source: string }; inputParams: unknown;
      } }) => {
        const row = { ...data, id: `synthetic-record-${rows.length + 1}`, createdAt: new Date() };
        rows.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const row = rows.find((item) => item.id === where.id && item.userId === where.userId);
        return row ? { ...row } : null;
      }),
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    process.env.ENCRYPTION_KEY = "test-key-for-32-byte-encryption!";
    process.env.PAIPAN_MODE = "native";
    const redis = { get: jest.fn(async () => null) };
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [PaipanController],
      providers: [
        JwtStrategy, PaipanService, PaipanRuntimeService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: PaipanAiService, useValue: {} },
        { provide: PaipanReportService, useValue: {} },
        { provide: PaipanReportDialogueService, useValue: {} },
        { provide: PaipanCaseFeedbackService, useValue: {} },
      ],
    }).overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (previous.jwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwt;
    if (previous.encryption === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = previous.encryption;
    if (previous.mode === undefined) delete process.env.PAIPAN_MODE;
    else process.env.PAIPAN_MODE = previous.mode;
  });

  it("真实 JWT 与全局 DTO 校验后，只写本人同源盘；他人不能读取", async () => {
    const path = "/api/v1/paipan/ziwei/consumer-save";
    const body = {
      name: "合成测试", gender: "男", y: 1990, m: 1, d: 20,
      hour: 10, minute: 20, nowYear: 2026,
    };
    const ownerToken = jwt.sign({ sub: "synthetic-owner" }, jwtSecret, { expiresIn: "5m" });
    const otherToken = jwt.sign({ sub: "synthetic-other" }, jwtSecret, { expiresIn: "5m" });
    await request(app.getHttpServer()).post(path).send(body).expect(401);
    await request(app.getHttpServer()).post(path)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ ...body, gender: "未知" }).expect(400);
    await request(app.getHttpServer()).post(path)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...body, d: 30, m: 2 }).expect(400);
    expect(rows).toHaveLength(0);

    const response = await request(app.getHttpServer()).post(path)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...body, untrustedChart: { palaces: [] } });
    expect(response.status).toBe(201);
    expect(response.body.chart.palaces).toHaveLength(12);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("synthetic-owner");
    expect(rows[0].resultData.source).toBe("ziwei-engine-v2");
    expect(JSON.stringify(rows[0].inputParams)).not.toContain("1990");
    expect(JSON.stringify(rows[0].resultData)).not.toContain("untrustedChart");

    await request(app.getHttpServer()).get(`/api/v1/paipan/ziwei/${response.body.id}`)
      .set("Authorization", `Bearer ${otherToken}`).expect(404);
    const own = await request(app.getHttpServer()).get(`/api/v1/paipan/ziwei/${response.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect(own.body.id).toBe(response.body.id);
  });
});
