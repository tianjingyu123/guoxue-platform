import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import * as jwt from "jsonwebtoken";
import request from "supertest";
import { CircleCoreService } from "./circle-core.service";
import { CircleController } from "../circle.controller";
import { CircleService } from "../circle.service";
import { CircleInsightService } from "./circle-insight.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { AuditService } from "../../audit/audit.service";
import { CircleSharedService } from "./circle-shared.service";
import { CircleGovernanceService } from "../governance/circle-governance.service";
import { JwtStrategy } from "../../../common/jwt.strategy";
import { FeatureFlagGuard } from "../../../common/feature-flag.guard";

// 数据库和 Redis 使用合成替身；HTTP 入口、JWT 签名校验、可选鉴权及分站守卫真实运行。
function fixture() {
  const cache = new Map<string, unknown>();
  const circle = { id: "privacy-circle", name: "合成隐私圈", ownerId: "owner", memberCount: 3 };
  const memberships = new Map(["a", "b"].map(userId => [userId, {
    id: `member-${userId}`, userId, circleId: circle.id, role: "MEMBER", expireAt: "2027-01-01T00:00:00.000Z",
  }]));
  const prisma = {
    circle: { findUnique: jest.fn(async () => circle as typeof circle | null) },
    circleMember: { findUnique: jest.fn(async (args: { where: { circleId_userId: { userId: string } } }) =>
      memberships.get(args.where.circleId_userId.userId) ?? null) },
    $queryRawUnsafe: jest.fn(async () => [{ needApproval: true }]),
    user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, status: "ACTIVE", roles: [] })) },
    station: { findUnique: jest.fn(async () => null) },
  };
  const redis = {
    getJson: jest.fn(async (key: string) => cache.get(key) ?? null),
    setJson: jest.fn(async (key: string, value: unknown) => { cache.set(key, JSON.parse(JSON.stringify(value))); }),
    get: jest.fn(async () => null as string | null),
  };
  const core = new CircleCoreService(prisma as unknown as PrismaService, redis as unknown as RedisService,
    {} as AuditService, {} as CircleSharedService, {} as CircleGovernanceService);
  return { core, cache, circle, memberships, prisma, redis, key: `circles:detail:${circle.id}` };
}

describe("圈子共享详情缓存的成员隐私隔离", () => {
  it("登录用户填充后，公共缓存没有成员行且游客返回 null", async () => {
    const f = fixture();
    expect((await f.core.getDetail(f.circle.id, "a")).membership?.userId).toBe("a");
    expect(f.cache.get(f.key)).not.toHaveProperty("membership");
    expect((await f.core.getDetail(f.circle.id)).membership).toBeNull();
  });

  it("游客首次访问与缓存命中的返回形状一致", async () => {
    const f = fixture();
    const first = await f.core.getDetail(f.circle.id);
    expect(first.membership).toBeNull();
    expect(await f.core.getDetail(f.circle.id)).toEqual(first);
  });

  it("两位登录用户命中同一公共缓存，只各自返回自己的成员行", async () => {
    const f = fixture();
    await f.core.getDetail(f.circle.id, "a");
    expect((await f.core.getDetail(f.circle.id, "b")).membership?.userId).toBe("b");
    expect((await f.core.getDetail(f.circle.id, "a")).membership?.userId).toBe("a");
    expect((await f.core.getDetail(f.circle.id, "non-member")).membership).toBeNull();
  });

  it("历史污染缓存命中时，游客也拿不到其中的成员数据", async () => {
    const f = fixture();
    f.cache.set(f.key, { ...f.circle, needApproval: true, membership: f.memberships.get("a") });
    expect(await f.core.getDetail(f.circle.id)).toEqual({ ...f.circle, needApproval: true, membership: null });
  });

  it("历史污染缓存不覆盖当前登录用户的成员状态", async () => {
    const f = fixture();
    f.cache.set(f.key, { ...f.circle, membership: f.memberships.get("a") });
    expect((await f.core.getDetail(f.circle.id, "b")).membership?.userId).toBe("b");
    expect((await f.core.getDetail(f.circle.id, "non-member")).membership).toBeNull();
  });

  it("两位用户并发首次填充不把任一成员信息写入公共缓存", async () => {
    const f = fixture();
    const results = await Promise.all([f.core.getDetail(f.circle.id, "a"), f.core.getDetail(f.circle.id, "b")]);
    expect(results.map(r => r.membership?.userId)).toEqual(["a", "b"]);
    expect(f.cache.get(f.key)).not.toHaveProperty("membership");
    expect((await f.core.getDetail(f.circle.id)).membership).toBeNull();
  });

  it("不存在的圈子不会写入共享详情或个人成员缓存", async () => {
    const f = fixture();
    f.prisma.circle.findUnique.mockResolvedValue(null);
    await expect(f.core.getDetail(f.circle.id, "a")).rejects.toThrow("圈子不存在");
    expect(f.redis.setJson).not.toHaveBeenCalled();
  });
});

describe("圈子详情真实 HTTP 与 JWT 隔离", () => {
  let app: INestApplication;
  let f: ReturnType<typeof fixture>;
  const secret = "synthetic-circle-privacy-test-secret-only";
  const oldSecret = process.env.JWT_SECRET;
  const oldPrevious = process.env.JWT_PREVIOUS_SECRETS;
  const token = (userId: string) => jwt.sign({ sub: userId }, secret, { expiresIn: "5m" });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    delete process.env.JWT_PREVIOUS_SECRETS;
    f = fixture();
    const mod = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [CircleController],
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: f.prisma },
        { provide: RedisService, useValue: f.redis },
        // 只接详情委托，其他圈子动作不在本 HTTP 验收范围。
        { provide: CircleService, useValue: { getDetail: f.core.getDetail.bind(f.core) } },
        { provide: CircleInsightService, useValue: {} },
      ],
    }).overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  beforeEach(() => { f.cache.clear(); jest.clearAllMocks(); f.redis.get.mockResolvedValue(null); });
  afterAll(async () => {
    if (app) await app.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
    if (oldPrevious === undefined) delete process.env.JWT_PREVIOUS_SECRETS; else process.env.JWT_PREVIOUS_SECRETS = oldPrevious;
  });

  it("真实入口解析有效 JWT，返回本人的成员状态", async () => {
    const response = await request(app.getHttpServer()).get(`/circles/${f.circle.id}`).set("Authorization", `Bearer ${token("a")}`).expect(200);
    expect(response.body.membership?.userId).toBe("a");
    expect(f.prisma.station.findUnique).toHaveBeenCalledWith({ where: { userId: "a" }, select: { id: true } });
  });

  it("登录用户填充后，游客 HTTP 请求仍不包含个人成员信息", async () => {
    await request(app.getHttpServer()).get(`/circles/${f.circle.id}`).set("Authorization", `Bearer ${token("a")}`).expect(200);
    const response = await request(app.getHttpServer()).get(`/circles/${f.circle.id}`).expect(200);
    expect(response.body.membership).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain("member-a");
  });

  it("不同 JWT 命中公共缓存仍分别返回本人成员信息", async () => {
    await request(app.getHttpServer()).get(`/circles/${f.circle.id}`).set("Authorization", `Bearer ${token("a")}`).expect(200);
    const response = await request(app.getHttpServer()).get(`/circles/${f.circle.id}`).set("Authorization", `Bearer ${token("b")}`).expect(200);
    expect(response.body.membership?.userId).toBe("b");
    expect(JSON.stringify(response.body)).not.toContain("member-a");
  });

  it.each(["forged", "expired", "revoked"])("%s 凭证按游客处理，不能取到成员行", async kind => {
    const raw = kind === "forged" ? jwt.sign({ sub: "a" }, "wrong-synthetic-secret") :
      kind === "expired" ? jwt.sign({ sub: "a" }, secret, { expiresIn: -10 }) : token("a");
    if (kind === "revoked") f.redis.get.mockResolvedValue(String(Date.now() + 1000));
    f.cache.set(f.key, { ...f.circle, membership: f.memberships.get("a") });
    const response = await request(app.getHttpServer()).get(`/circles/${f.circle.id}`).set("Authorization", `Bearer ${raw}`).expect(200);
    expect(response.body.membership).toBeNull();
    expect(f.prisma.circleMember.findUnique).not.toHaveBeenCalled();
  });

  it("客户端 query 或 Header 伪造用户标识不会获得成员行", async () => {
    const response = await request(app.getHttpServer()).get(`/circles/${f.circle.id}?userId=a`).set("x-user-id", "a").expect(200);
    expect(response.body.membership).toBeNull();
    expect(f.prisma.circleMember.findUnique).not.toHaveBeenCalled();
  });
});
