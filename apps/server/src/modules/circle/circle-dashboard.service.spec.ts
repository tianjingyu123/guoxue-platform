import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { CircleDashboardService } from "./circle-dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  circle: { findUnique: jest.fn() },
  circleMember: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  post: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
  comment: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
  like: { count: jest.fn(), groupBy: jest.fn() },
  order: { findMany: jest.fn(), aggregate: jest.fn() },
  course: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
  paidQuestion: { findMany: jest.fn() },
  circleKnowledgeCandidate: { findMany: jest.fn() },
};

// 调用方传入的当前用户（圈主），归属校验通过用
const UID = "owner1";

describe("CircleDashboardService", () => {
  let svc: CircleDashboardService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [CircleDashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(CircleDashboardService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 默认归属校验通过：当前用户是该圈子的 OWNER
    mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "OWNER" });
  });

  describe("getOverview", () => {
    it("返回圈子月度概览数据", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", name: "易经研习社", memberCount: 120 });
      mockPrisma.circleMember.count.mockResolvedValueOnce(120).mockResolvedValueOnce(15);
      mockPrisma.post.count.mockResolvedValue(30);
      mockPrisma.post.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
      mockPrisma.comment.count.mockResolvedValue(45);
      mockPrisma.like.count.mockResolvedValue(80);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

      const result = await svc.getOverview("c1", UID);

      expect(result.name).toBe("易经研习社");
      expect(result.memberCount).toBe(120);
      expect(result.newMembers).toBe(15);
      expect(result.monthRevenue).toBe(5000);
      expect(result.monthPosts).toBe(30);
      expect(result.monthComments).toBe(45);
      expect(result.monthLikes).toBe(80);
    });

    it("圈子不存在抛出异常", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue(null);
      mockPrisma.circleMember.count.mockResolvedValue(0);
      mockPrisma.post.count.mockResolvedValue(0);
      mockPrisma.post.findMany.mockResolvedValue([]);
      await expect(svc.getOverview("bad", UID)).rejects.toThrow("圈子不存在");
    });

    it("非圈主/管理员访问抛出 ForbiddenException", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "MEMBER" });
      await expect(svc.getOverview("c1", "other")).rejects.toThrow(ForbiddenException);
    });

    it("非成员访问抛出 ForbiddenException", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.getOverview("c1", "stranger")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getTrends", () => {
    it("返回30天趋势数据", async () => {
      const base = new Date("2026-05-01T10:00:00Z");
      mockPrisma.circleMember.findMany.mockResolvedValue([
        { joinedAt: base },
        { joinedAt: new Date(base.getTime() + 86400000) },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { amount: 100, createdAt: base },
      ]);

      const result = await svc.getTrends("c1", UID);

      expect(Array.isArray(result.trends)).toBe(true);
      expect(result.trends.length).toBeGreaterThan(0);
    });
  });

  describe("getRevenueBreakdown", () => {
    it("返回收入构成", async () => {
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 3000 } }) // joinRevenue
        .mockResolvedValueOnce({ _sum: { amount: 1500 } }) // courseRevenue
        .mockResolvedValueOnce({ _sum: { amount: 500 } }); // productRevenue
      mockPrisma.course.findMany.mockResolvedValue([{ id: "course1" }]);
      mockPrisma.product.findMany.mockResolvedValue([{ id: "prod1" }]);

      const result = await svc.getRevenueBreakdown("c1", UID);

      expect(result.breakdown).toHaveLength(3);
      expect(result.breakdown[0]).toEqual({ type: "CIRCLE_JOIN", label: "入圈费", amount: 3000 });
      expect(result.breakdown[1].amount).toBe(1500);
      expect(result.breakdown[2].amount).toBe(500);
    });

    it("无课程时课程收入为0", async () => {
      mockPrisma.order.aggregate.mockResolvedValueOnce({ _sum: { amount: 1000 } });
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await svc.getRevenueBreakdown("c1", UID);

      expect(result.breakdown[1].amount).toBe(0);
      expect(result.breakdown[2].amount).toBe(0);
    });
  });

  describe("getTopContributors", () => {
    it("返回月度贡献排行榜", async () => {
      mockPrisma.circleMember.findMany.mockResolvedValue([
        { userId: "u1", user: { id: "u1", nickname: "张三", avatar: "a.jpg" } },
        { userId: "u2", user: { id: "u2", nickname: "李四", avatar: "b.jpg" } },
      ]);
      mockPrisma.post.groupBy.mockResolvedValue([
        { userId: "u1", _count: 5 },
        { userId: "u2", _count: 2 },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
      mockPrisma.comment.groupBy.mockResolvedValue([
        { userId: "u1", _count: 10 },
        { userId: "u2", _count: 3 },
      ]);

      const result = await svc.getTopContributors("c1", UID);

      expect(result.contributors.length).toBeGreaterThan(0);
      expect(result.contributors[0].nickname).toBe("张三"); // 5*10 + 10*3 = 80 > 2*10+3*3=29
    });
  });

  describe("getHotContent", () => {
    it("返回热门内容Top5", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", title: "精华帖", content: "内容", createdAt: new Date() },
      ]);
      mockPrisma.like.groupBy.mockResolvedValue([{ targetId: "p1", _count: 20 }]);
      mockPrisma.comment.groupBy.mockResolvedValue([{ targetId: "p1", _count: 5 }]);

      const result = await svc.getHotContent("c1", UID);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].likeCount).toBe(20);
      expect(result.posts[0].commentCount).toBe(5);
      expect(result.posts[0].score).toBe(55); // 20*2 + 5*3
    });
  });

  describe("getRecentMembers", () => {
    it("返回最近加入的成员", async () => {
      mockPrisma.circleMember.findMany.mockResolvedValue([
        { user: { id: "u1", nickname: "新成员", avatar: "av.jpg" }, joinedAt: new Date() },
      ]);

      const result = await svc.getRecentMembers("c1", UID);

      expect(result.members).toHaveLength(1);
      expect(result.members[0].nickname).toBe("新成员");
    });
  });

  describe("getChurnWarning", () => {
    it("识别14天未活跃的流失风险用户", async () => {
      mockPrisma.circleMember.findMany.mockResolvedValue([
        { userId: "u1", user: { id: "u1", nickname: "活跃用户", avatar: "" } },
        { userId: "u2", user: { id: "u2", nickname: "沉默用户", avatar: "" } },
      ]);
      mockPrisma.post.findMany
        .mockResolvedValueOnce([{ id: "p1" }]) // postIds
        .mockResolvedValueOnce([{ userId: "u1" }]); // activePosts
      mockPrisma.comment.findMany.mockResolvedValue([]);

      const result = await svc.getChurnWarning("c1", UID);

      expect(result.count).toBe(1);
      expect(result.atRisk[0].nickname).toBe("沉默用户");
    });
  });

  describe("getPendingQuestions", () => {
    it("返回待回答的付费问题", async () => {
      mockPrisma.paidQuestion.findMany.mockResolvedValue([
        { id: "q1", questionTitle: "求教", question: "详细", priceCoin: 100, createdAt: new Date(), asker: { id: "u1", nickname: "提问者" } },
      ]);

      const result = await svc.getPendingQuestions("c1", UID);

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].questionTitle).toBe("求教");
    });
  });

  describe("getKnowledgeCandidates", () => {
    it("返回知识库候选条目", async () => {
      mockPrisma.circleKnowledgeCandidate.findMany.mockResolvedValue([
        { id: "k1", content: "易经智慧", similarityScore: 0.95, sourceType: "POST", createdAt: new Date() },
      ]);

      const result = await svc.getKnowledgeCandidates("c1", UID);

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].similarityScore).toBe(0.95);
    });
  });
});
