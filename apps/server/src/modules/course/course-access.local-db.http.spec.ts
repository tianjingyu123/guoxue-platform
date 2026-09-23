import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { CoursePurchaseService } from "./course-purchase.service";
import { SystemService } from "../system/system.service";
import { LiveService } from "../live/live.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { CourseCreatorGuard } from "../../common/course-creator.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { MemberGuard } from "../../common/member.guard";

const localUrl = process.env.REBU_LOCAL_COURSE_ACCESS_TEST_URL || "";
const isIsolatedLocalDb = (() => {
  try {
    const url = new URL(localUrl);
    return url.protocol === "postgresql:" && url.hostname === "127.0.0.1"
      && url.port === "55439" && url.username === "rebu_test" && url.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isIsolatedLocalDb ? describe : describe.skip)("课程续购权限独立库 HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const previousSecret = process.env.JWT_SECRET;
  const secret = "synthetic-course-access-local-db-secret";
  const authorId = `synthetic-access-author-${randomUUID()}`;
  const buyerId = `synthetic-access-buyer-${randomUUID()}`;
  const otherId = `synthetic-access-other-${randomUUID()}`;
  const courseId = `synthetic-access-course-${randomUUID()}`;
  const oldOrderId = `synthetic-access-old-${randomUUID()}`;
  const newOrderId = `synthetic-access-new-${randomUUID()}`;

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
    await prisma.$connect();
    await prisma.user.createMany({ data: [
      { id: authorId, nickname: "合成课程作者" },
      { id: buyerId, nickname: "合成续购用户" },
      { id: otherId, nickname: "合成未购用户" },
    ] });
    await prisma.course.create({ data: {
      id: courseId, userId: authorId, title: "合成续购课程", price: 15,
      validityDays: 5, auditStatus: "APPROVED", visibility: "PLATFORM",
    } });
    await prisma.order.createMany({ data: [
      { id: oldOrderId, userId: buyerId, type: "COURSE", targetId: courseId, amount: 15,
        status: "PAID", paidAt: new Date(Date.now() - 10 * 86400000) },
      { id: newOrderId, userId: buyerId, type: "COURSE", targetId: courseId, amount: 15,
        status: "PAID", paidAt: new Date(Date.now() - 86400000) },
    ] });
    const purchase = new CoursePurchaseService(prisma as any, {} as any, {} as any, {} as any);
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [CourseController],
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: async () => null } },
        { provide: CourseService, useValue: {
          checkAccess: (userId: string, id: string) => purchase.checkAccess(userId, id),
          getUserValidCourses: (userId: string) => purchase.getUserValidCourses(userId),
        } },
        { provide: SystemService, useValue: {} },
        { provide: LiveService, useValue: {} },
      ],
    })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(CourseCreatorGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .overrideGuard(MemberGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      await prisma.order.deleteMany({ where: { id: { in: [oldOrderId, newOrderId] } } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: { in: [authorId, buyerId, otherId] } } });
      await prisma.$disconnect();
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it("旧单过期但最新续购有效时允许本人学习，不放行游客和未购用户", async () => {
    const url = `/api/v1/courses/${courseId}/access`;
    await request(app.getHttpServer()).get(url).expect(401);
    const buyerToken = jwt.sign({ sub: buyerId }, secret, { expiresIn: "5m" });
    const otherToken = jwt.sign({ sub: otherId }, secret, { expiresIn: "5m" });
    const buyer = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${buyerToken}`).expect(200);
    const other = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${otherToken}`).expect(200);
    expect(buyer.body).toEqual({ hasAccess: true });
    expect(other.body).toEqual({ hasAccess: false });
    await prisma.order.update({ where: { id: newOrderId }, data: { status: "REFUNDED" } });
    const refunded = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${buyerToken}`).expect(200);
    expect(refunded.body).toEqual({ hasAccess: false });
  });

  it("多笔有效续购在有效课程接口只展示最新一条", async () => {
    const anotherId = `synthetic-access-another-${randomUUID()}`;
    await prisma.order.update({ where: { id: newOrderId }, data: { status: "PAID" } });
    await prisma.order.create({ data: {
      id: anotherId, userId: buyerId, type: "COURSE", targetId: courseId, amount: 15,
      status: "PAID", paidAt: new Date(Date.now() - 12 * 3600000),
    } });
    try {
      const buyerToken = jwt.sign({ sub: buyerId }, secret, { expiresIn: "5m" });
      const response = await request(app.getHttpServer()).get("/api/v1/courses/user/valid")
        .set("Authorization", `Bearer ${buyerToken}`).expect(200);
      expect(response.body.total).toBe(1);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].orderId).toBe(anotherId);
    } finally {
      await prisma.order.delete({ where: { id: anotherId } });
    }
  });
});
