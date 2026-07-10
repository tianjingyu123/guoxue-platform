import { CircleInsightService } from "./circle-insight.service";
import { BusinessException } from "../../../common/business.exception";

/**
 * #33 年度报告（真实聚合）/ #37 AI 搜索推荐（fail-open）单测。
 */

function buildMocks() {
  const prisma = {
    circleMember: { findUnique: jest.fn(), findMany: jest.fn() },
    post: { count: jest.fn() },
    paidQuestion: { count: jest.fn() },
    liveRoom: { findMany: jest.fn() },
    liveMic: { findMany: jest.fn() },
    giftRecord: { findMany: jest.fn() },
    circle: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const redis = { sismember: jest.fn().mockResolvedValue(false) };
  const aiGateway = { chat: jest.fn() };
  const svc = new CircleInsightService(prisma as never, redis as never, aiGateway as never);
  return { svc, prisma, redis, aiGateway };
}

describe("CircleInsightService · #33 年度报告", () => {
  it("非成员访问 → 抛业务异常", async () => {
    const { svc, prisma } = buildMocks();
    prisma.circleMember.findUnique.mockResolvedValue(null);
    await expect(svc.annualReport("c1", "u1")).rejects.toThrow(BusinessException);
  });

  it("真实聚合：发帖/提问/获赞/参与直播（上麦+打赏去重）·有分成则含 earningsRmb", async () => {
    const { svc, prisma } = buildMocks();
    prisma.circleMember.findUnique.mockResolvedValue({ joinedAt: new Date(Date.now() - 100 * 86400000) });
    prisma.post.count.mockResolvedValue(12);
    prisma.paidQuestion.count.mockResolvedValue(5);
    // 第一次 $queryRaw = 获赞数；第二次 = 收益聚合
    prisma.$queryRaw
      .mockResolvedValueOnce([{ n: BigInt(34) }])
      .mockResolvedValueOnce([{ s: "36.5", n: BigInt(3) }]);
    prisma.liveRoom.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }, { id: "r3" }]);
    prisma.liveMic.findMany.mockResolvedValue([{ liveRoomId: "r1" }]);
    prisma.giftRecord.findMany.mockResolvedValue([{ liveRoomId: "r1" }, { liveRoomId: "r2" }]); // r1 与上麦重复 → 去重

    const r = await svc.annualReport("c1", "u1");
    expect(r.posts).toBe(12);
    expect(r.questions).toBe(5);
    expect(r.likesReceived).toBe(34);
    expect(r.liveCount).toBe(2); // r1、r2 去重
    expect(r.earningsRmb).toBe(36.5);
    expect(r.joinedDays).toBeGreaterThanOrEqual(100);
  });

  it("期内无可关联分成记录 → 不返回 earningsRmb 字段（不编造）", async () => {
    const { svc, prisma } = buildMocks();
    prisma.circleMember.findUnique.mockResolvedValue({ joinedAt: new Date() });
    prisma.post.count.mockResolvedValue(0);
    prisma.paidQuestion.count.mockResolvedValue(0);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ n: BigInt(0) }])
      .mockResolvedValueOnce([{ s: 0, n: BigInt(0) }]);
    prisma.liveRoom.findMany.mockResolvedValue([]);

    const r = await svc.annualReport("c1", "u1");
    expect(r).not.toHaveProperty("earningsRmb");
    expect(r.liveCount).toBe(0);
  });
});

describe("CircleInsightService · #37 AI 搜索推荐（fail-open）", () => {
  const CIRCLES = [
    { id: "a", name: "风水研习社", intro: "户型实例", cover: "", tags: ["风水"], categoryLevel1: "风水", memberCount: 100 },
    { id: "b", name: "八字圈", intro: "命理", cover: "", tags: ["八字"], categoryLevel1: "命理", memberCount: 50 },
  ];

  it("空 query → 返回 {}", async () => {
    const { svc } = buildMocks();
    expect(await svc.aiSearchRecommend("  ", "u1")).toEqual({});
  });

  it("AI 抛错（未配置/超时） → 返回 {} 不冒泡", async () => {
    const { svc, prisma, aiGateway } = buildMocks();
    prisma.circleMember.findMany.mockResolvedValue([]);
    prisma.circle.findMany.mockResolvedValue(CIRCLES);
    aiGateway.chat.mockRejectedValue(new Error("AI 未配置"));
    expect(await svc.aiSearchRecommend("风水", "u1")).toEqual({});
  });

  it("AI 输出不可解析 → 返回 {}", async () => {
    const { svc, prisma, aiGateway } = buildMocks();
    prisma.circleMember.findMany.mockResolvedValue([]);
    prisma.circle.findMany.mockResolvedValue(CIRCLES);
    aiGateway.chat.mockResolvedValue({ content: "抱歉我不能输出JSON" });
    expect(await svc.aiSearchRecommend("风水", "u1")).toEqual({});
  });

  it("正常解析：过滤清单外 id·followUps 截 3 条·映射圈子摘要", async () => {
    const { svc, prisma, aiGateway } = buildMocks();
    prisma.circleMember.findMany.mockResolvedValue([
      { circle: { name: "八字圈", tags: ["八字"], categoryLevel1: "命理" } },
    ]);
    prisma.circle.findMany.mockResolvedValue(CIRCLES);
    aiGateway.chat.mockResolvedValue({
      content: '```json\n{"recommendCircleIds":["a","不存在的id"],"reason":"「风水研习社」与你的兴趣最匹配","followUps":["北向客厅布局","玄关风水","新手风水课","第四条多余"]}\n```',
    });

    const r = (await svc.aiSearchRecommend("风水", "u1")) as {
      recommendCircleIds: string[];
      circles: Array<{ id: string; name: string }>;
      reason: string;
      followUps: string[];
    };
    expect(r.recommendCircleIds).toEqual(["a"]);
    expect(r.circles).toHaveLength(1);
    expect(r.circles[0].name).toBe("风水研习社");
    expect(r.followUps).toHaveLength(3);
    expect(r.reason).toContain("风水研习社");
  });

  it("未登录（无 userId）也可用：不查加入偏好", async () => {
    const { svc, prisma, aiGateway } = buildMocks();
    prisma.circle.findMany.mockResolvedValue(CIRCLES);
    aiGateway.chat.mockResolvedValue({ content: '{"recommendCircleIds":["b"],"reason":"匹配","followUps":["八字入门"]}' });

    const r = (await svc.aiSearchRecommend("八字")) as { recommendCircleIds: string[] };
    expect(r.recommendCircleIds).toEqual(["b"]);
    expect(prisma.circleMember.findMany).not.toHaveBeenCalled();
  });
});
