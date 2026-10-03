import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { CourseReviewQaService } from "./course-review-qa.service";
import { SystemService } from "../system/system.service";
import { LiveService } from "../live/live.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { CourseCreatorGuard } from "../../common/course-creator.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { MemberGuard } from "../../common/member.guard";

const localUrl = process.env.REBU_LOCAL_REVIEW_TEST_URL || "";
const isIsolatedLocalDb = (() => {
  try {
    const url = new URL(localUrl);
    return url.protocol === "postgresql:" && url.hostname === "127.0.0.1"
      && url.port === "55439" && url.username === "rebu_test" && url.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isIsolatedLocalDb ? describe : describe.skip)("课程本人评价状态独立库 HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const previousSecret = process.env.JWT_SECRET;
  const secret = "synthetic-course-review-local-db-secret";
  const userA = `synthetic-review-a-${randomUUID()}`;
  const userB = `synthetic-review-b-${randomUUID()}`;
  const courseId = `synthetic-review-course-${randomUUID()}`;
  const reviewId = `synthetic-review-${randomUUID()}`;

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
    await prisma.$connect();
    await prisma.user.createMany({ data: [{ id: userA, nickname: "合成评价用户A" }, { id: userB, nickname: "合成评价用户B" }] });
    await prisma.course.create({ data: { id: courseId, userId: userA, title: "合成课程", price: 0, auditStatus: "APPROVED", visibility: "PLATFORM" } });
    await prisma.courseReview.create({ data: { id: reviewId, courseId, userId: userA, rating: 5, content: "合成评价", status: "HIDDEN" } });
    const redis = { get: async () => null };
    const reviewSvc = new CourseReviewQaService(prisma as any, redis as any, {} as any, {} as any, {} as any);
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [CourseController],
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: CourseService, useValue: { getMyReviewStatus: (userId: string, id: string) => reviewSvc.getMyReviewStatus(userId, id) } },
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
      await prisma.courseReview.deleteMany({ where: { id: reviewId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
      await prisma.$disconnect();
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it("真实本地库按 JWT 用户隔离本人记录且拒绝游客", async () => {
    const url = `/api/v1/courses/${courseId}/reviews/my`;
    await request(app.getHttpServer()).get(url).expect(401);
    const tokenA = jwt.sign({ sub: userA }, secret, { expiresIn: "5m" });
    const tokenB = jwt.sign({ sub: userB }, secret, { expiresIn: "5m" });
    const responseA = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${tokenA}`).expect(200);
    const responseB = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${tokenB}`).expect(200);
    expect(responseA.body).toEqual({ hasReviewed: true, status: "HIDDEN" });
    expect(responseB.body).toEqual({ hasReviewed: false, status: null });
  });
});
