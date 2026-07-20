import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

describe("Recommend E2E", () => {
  let app: INestApplication;
  let prisma: any;
  let redis: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    redis = ctx.redis;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 默认 Redis 缓存未命中
    redis.getJson.mockResolvedValue(null);
  });

  // ═══════════════════ 统一场景入口 ═══════════════════

  describe("GET /api/v1/recommend/:scene", () => {
    it("article_detail 返回同标签文章", async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: "a1", tags: ["八字", "命理"], circleId: "c1",
      });
      prisma.article.findMany.mockResolvedValue([
        { id: "a2", title: "八字入门", cover: null, excerpt: "简介", tags: ["八字"], viewCount: 100, likeCount: 20, collectCount: 5, createdAt: new Date(), user: { id: "u1", nickname: "王老师", avatar: null } },
        { id: "a3", title: "命理进阶", cover: null, excerpt: "深入", tags: ["命理"], viewCount: 80, likeCount: 15, collectCount: 3, createdAt: new Date(), user: { id: "u2", nickname: "李老师", avatar: null } },
      ]);
      prisma.circle.findUnique.mockResolvedValue({
        id: "c1", name: "八字研习社", cover: null, intro: "八字交流圈子", memberCount: 200,
      });

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/article_detail?contentId=a1&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.recommendId).toBeDefined();
    });

    it("article_detail 文章不存在时兜底", async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "热门文章", cover: null, excerpt: null, tags: [], viewCount: 50, likeCount: 5, collectCount: 1, createdAt: new Date(), user: { id: "u1", nickname: "作者", avatar: null } },
      ]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/article_detail?contentId=unknown&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("empty_state 返回热门内容", async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.article.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);
      prisma.video.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/empty_state?listType=course&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.recommendId).toBeDefined();
    });

    it("guess_like 返回混合推荐", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "热文", cover: null, excerpt: null, tags: [], viewCount: 200, likeCount: 30, collectCount: 10, createdAt: new Date(), user: { id: "u1", nickname: "作者", avatar: null } },
      ]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/guess_like?page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it("分页参数生效", async () => {
      prisma.article.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/guess_like?page=2&pageSize=3")
        .expect(200);

      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.pageSize).toBe(3);
    });

    it("无效场景返回 404，避免抢占其他控制器路由", async () => {
      prisma.article.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/invalid_scene")
        .expect(404);

      expect(res.body.message).toContain("推荐场景不存在");
    });

    it("A/B 管理接口使用独立 admin 路由并要求登录", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/admin/recommend/ab-tests")
        .expect(401);
      await request(app.getHttpServer())
        .get("/api/v1/recommend/ab-tests")
        .expect(404);
    });
  });

  // ═══════════════════ 缓存验证 ═══════════════════

  describe("缓存", () => {
    it("缓存命中时直接返回", async () => {
      const cachedResponse = {
        items: [{ id: "cached_1", type: "ARTICLE", title: "缓存文章", reason: "缓存", strategies: ["cache"], score: 100 }],
        pagination: { page: 1, pageSize: 10, total: 1 },
        recommendId: "cached_rec_id",
      };
      redis.getJson.mockResolvedValue(cachedResponse);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/guess_like?page=1&pageSize=10")
        .expect(200);

      expect(res.body.recommendId).toBe("cached_rec_id");
      // 缓存命中时不应查询数据库
      expect(prisma.article.findMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════ 去重验证 ═══════════════════

  describe("去重", () => {
    it("已购买内容被过滤", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a10", title: "八字进阶", cover: null, excerpt: null, tags: ["八字"], viewCount: 150, likeCount: 25, collectCount: 8, createdAt: new Date(), user: { id: "u3", nickname: "赵老师", avatar: null } },
      ]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      // 模拟用户已购买 a10（但文章类型不同，用 COURSE 类型测试）
      prisma.order.findMany.mockResolvedValue([
        { type: "COURSE", targetId: "c_already_owned" },
      ]);
      prisma.collect.findMany.mockResolvedValue([]);
      prisma.like.findMany.mockResolvedValue([]);
      prisma.circleMember.findMany.mockResolvedValue([]);
      prisma.courseProgress.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/guess_like?page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });
  });

  // ═══════════════════ 日志回传 ═══════════════════

  describe("POST /api/v1/recommend/log", () => {
    it("上报推荐日志", async () => {
      prisma.recommendLog.createMany.mockResolvedValue({ count: 2 });

      const res = await request(app.getHttpServer())
        .post("/api/v1/recommend/log")
        .send({
          recommendId: "rec_test_123",
          interactions: [
            { itemId: "a1", itemType: "ARTICLE", position: 0, action: "IMPRESSION" },
            { itemId: "a1", itemType: "ARTICLE", position: 0, action: "CLICK", staySeconds: 30 },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════ 旧接口向后兼容 ═══════════════════

  describe("旧接口兼容", () => {
    it("GET /api/v1/recommend/trending 返回热门", async () => {
      prisma.article.findMany.mockResolvedValue([]);
      prisma.like.findMany.mockResolvedValue([]);
      prisma.collect.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/trending")
        .expect(200);

      expect(res.body.byViews).toBeDefined();
      expect(res.body.byEngagement).toBeDefined();
    });

    it("GET /api/v1/recommend/related/:contentId 返回相关内容", async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: "a1", tags: ["八字"],
      });
      prisma.article.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/related/a1")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ═══════════════════ P1 新场景 E2E ═══════════════════

  describe("P1 新场景", () => {
    it("paipan_result 返回排盘相关推荐", async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);
      prisma.article.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/paipan_result?paipanType=BAZI&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.recommendId).toBeDefined();
    });

    it("course_detail 返回学了也学了推荐", async () => {
      prisma.course.findUnique.mockResolvedValue({ id: "c1", tags: ["八字"], circleId: null });
      prisma.order.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/course_detail?contentId=c1&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("product_detail 返回经常一起购买推荐", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "p1", tags: ["风水"] });
      prisma.order.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/product_detail?contentId=p1&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("payment_success 基于已购标签推荐", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/payment_success?page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("search_empty 返回全平台热门", async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.article.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/search_empty?page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("conversation_guess 返回热门圈子和课程", async () => {
      prisma.circle.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/conversation_guess?page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("contacts_discover 返回热门圈主和讲师", async () => {
      prisma.circle.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/contacts_discover?page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it("course_learn 返回相关课程和完成推荐", async () => {
      prisma.course.findUnique.mockResolvedValue({ id: "c1", tags: ["入门"], circleId: "cr1" });
      prisma.course.findMany.mockResolvedValue([]);
      prisma.circle.findUnique.mockResolvedValue({ id: "cr1", name: "学习圈", cover: null, intro: null, tags: [], memberCount: 100 });
      prisma.circle.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/recommend/course_learn?contentId=c1&page=1&pageSize=10")
        .expect(200);

      expect(res.body.items).toBeDefined();
    });
  });
});
