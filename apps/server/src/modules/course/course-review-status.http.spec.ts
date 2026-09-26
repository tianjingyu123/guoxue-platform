import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
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

describe("课程本人评价状态本地 HTTP", () => {
  let app: INestApplication;
  const secret = "synthetic-course-review-http-secret";
  const previousSecret = process.env.JWT_SECRET;
  const findReview = jest.fn(async ({ where }: { where: { userId: string; courseId: string } }) =>
    where.userId === "user-a" && where.courseId === "course-1"
      ? { id: "review-a", status: "HIDDEN" }
      : null,
  );
  const prisma = {
    user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
      ["user-a", "user-b"].includes(where.id) ? { id: where.id, status: "ACTIVE", roles: [] } : null,
    ) },
    courseReview: { findFirst: findReview },
  };
  const redis = { get: jest.fn(async () => null) };

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const reviewSvc = new CourseReviewQaService(prisma as any, redis as any, {} as any, {} as any, {} as any);
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [CourseController],
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: CourseService, useValue: { getMyReviewStatus: (userId: string, courseId: string) => reviewSvc.getMyReviewStatus(userId, courseId) } },
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
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it("未登录请求返回 401", async () => {
    await request(app.getHttpServer()).get("/api/v1/courses/course-1/reviews/my").expect(401);
  });

  it("按 JWT 用户身份隔离已隐藏的评价状态", async () => {
    const tokenA = jwt.sign({ sub: "user-a" }, secret, { expiresIn: "5m" });
    const tokenB = jwt.sign({ sub: "user-b" }, secret, { expiresIn: "5m" });
    const url = "/api/v1/courses/course-1/reviews/my";
    const responseA = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${tokenA}`).expect(200);
    const responseB = await request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${tokenB}`).expect(200);
    expect(responseA.body).toEqual({ hasReviewed: true, status: "HIDDEN" });
    expect(responseB.body).toEqual({ hasReviewed: false, status: null });
    expect(findReview).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-a", courseId: "course-1" } }));
    expect(findReview).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-b", courseId: "course-1" } }));
  });
});
