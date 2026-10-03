import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

/** 本地真实 HTTP 路由与鉴权回归；数据库为内存测试替身，不是上线数据库验收。 */
describe("兴趣完成态与视频互动跨入口 HTTP 回归", () => {
  let app: INestApplication;
  let prisma: any;
  let jwt: JwtService;
  let users: Map<string, any>;
  let likes: Map<string, any>;
  let video: any;
  const auth = (id: string) => `Bearer ${jwt.sign({ sub: id })}`;

  beforeAll(async () => {
    const context = await createE2eApp();
    app = context.app;
    prisma = context.prisma;
    jwt = app.get(JwtService);
  });
  afterAll(async () => { await app?.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    users = new Map(["A", "B"].map((id) => [id, { id, nickname: id, status: "ACTIVE", roles: [], interestCategories: [], interestGuideCompleted: false }]));
    likes = new Map();
    video = { id: "v1", userId: "author", title: "本地测试视频", status: "PUBLISHED", visibility: "PLATFORM", isPrivate: false, auditStatus: "APPROVED", likeCount: 0, collectCount: 0, viewCount: 0, user: { id: "author", nickname: "作者" }, products: [], circle: null };
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => users.get(where.id) ?? null);
    prisma.user.update.mockImplementation(async ({ where, data }: any) => {
      const user = { ...users.get(where.id), ...data }; users.set(where.id, user); return user;
    });
    prisma.merchant.findUnique.mockResolvedValue(null);
    prisma.merchantMember.findFirst.mockResolvedValue(null);
    prisma.video.findUnique.mockImplementation(async () => ({ ...video }));
    prisma.video.findMany.mockImplementation(async () => [{ ...video }]);
    prisma.video.count.mockResolvedValue(1);
    prisma.video.update.mockImplementation(async ({ data }: any) => {
      for (const [key, value] of Object.entries(data)) video[key] = typeof value === "object" ? video[key] + (value as any).increment : value;
      return { ...video };
    });
    prisma.like.findUnique.mockImplementation(async ({ where }: any) => where.id ? likes.get(where.id) ?? null : [...likes.values()].find((item) => item.userId === where.userId_targetType_targetId.userId && item.targetId === where.userId_targetType_targetId.targetId) ?? null);
    prisma.like.findMany.mockImplementation(async ({ where }: any) => [...likes.values()].filter((item) => item.userId === where.userId && (!where.targetId?.in || where.targetId.in.includes(item.targetId))));
    prisma.like.create.mockImplementation(async ({ data }: any) => { const like = { id: `like-${data.userId}`, ...data }; likes.set(like.id, like); return like; });
    prisma.like.delete.mockImplementation(async ({ where }: any) => { const old = likes.get(where.id); likes.delete(where.id); return old; });
    prisma.collect.findMany.mockResolvedValue([]);
    prisma.follow.findMany.mockResolvedValue([]);
  });

  it("未登录不能设置账号引导完成态", async () => {
    await request(app.getHttpServer()).put("/api/v1/users/profile").send({ interestGuideCompleted: true }).expect(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("主动跳过持久到账号；另一会话读取完成，另一账号不继承", async () => {
    await request(app.getHttpServer()).put("/api/v1/users/profile").set("Authorization", auth("A")).send({ interestGuideCompleted: true }).expect(200);
    const a = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", auth("A")).expect(200);
    const b = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", auth("B")).expect(200);
    expect(a.body.interestCategories).toEqual([]);
    expect(a.body.interestGuideCompleted).toBe(true);
    expect(b.body.interestGuideCompleted).toBe(false);
  });

  it("保存兴趣后清空兴趣不会重置完成态", async () => {
    await request(app.getHttpServer()).put("/api/v1/users/profile").set("Authorization", auth("A")).send({ interestCategories: ["经典研读"] }).expect(200);
    await request(app.getHttpServer()).put("/api/v1/users/profile").set("Authorization", auth("A")).send({ interestCategories: [] }).expect(200);
    const result = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", auth("A")).expect(200);
    expect(result.body.interestGuideCompleted).toBe(true);
    expect(result.body.interestCategories).toEqual([]);
  });

  it.each([{ interestGuideCompleted: false }, { interestGuideCompleted: "true" }, { interestGuideCompleted: true, userId: "B" }])("拒绝重置、类型绕过或指定其他账号：%j", async (body) => {
    await request(app.getHttpServer()).put("/api/v1/users/profile").set("Authorization", auth("A")).send(body).expect(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("点赞后详情和列表重新读取一致，其他账号与游客不带入红心", async () => {
    const mutation = await request(app.getHttpServer()).post("/api/v1/videos/v1/like").set("Authorization", auth("A")).expect(201);
    expect(mutation.body).toMatchObject({ liked: true, likeCount: 1 });
    const detail = await request(app.getHttpServer()).get("/api/v1/videos/v1").set("Authorization", auth("A")).expect(200);
    const list = await request(app.getHttpServer()).get("/api/v1/videos").set("Authorization", auth("A")).expect(200);
    expect(detail.body).toMatchObject({ isLiked: true, likeCount: 1 });
    expect(list.body.videos[0]).toMatchObject({ isLiked: true, likeCount: 1 });
    for (const id of ["B", ""]) {
      const query = request(app.getHttpServer()).get("/api/v1/videos/v1");
      if (id) query.set("Authorization", auth(id));
      expect((await query.expect(200)).body.isLiked).toBe(false);
    }
  });

  it("我的点赞按记录取消后详情计数同步归零，重复取消不反向点赞", async () => {
    await request(app.getHttpServer()).post("/api/v1/interaction/like").set("Authorization", auth("A")).send({ targetType: "VIDEO", targetId: "v1" }).expect(201);
    await request(app.getHttpServer()).delete("/api/v1/interaction/like/like-A").set("Authorization", auth("B")).expect(403);
    await request(app.getHttpServer()).delete("/api/v1/interaction/like/like-A").set("Authorization", auth("A")).expect(200);
    const detail = await request(app.getHttpServer()).get("/api/v1/videos/v1").set("Authorization", auth("A")).expect(200);
    expect(detail.body).toMatchObject({ isLiked: false, likeCount: 0 });
    await request(app.getHttpServer()).delete("/api/v1/interaction/like/like-A").set("Authorization", auth("A")).expect(404);
    expect(likes.size).toBe(0);
    expect(video.likeCount).toBe(0);
  });
});
