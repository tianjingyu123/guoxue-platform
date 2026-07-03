import { Test, TestingModule } from "@nestjs/testing";
import { InstituteAssessmentService } from "./institute-assessment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

describe("InstituteAssessmentService（T9-P1 考核制度 V5）", () => {
  let svc: InstituteAssessmentService;
  let prisma: any;

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  beforeEach(async () => {
    prisma = {
      circleMember: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      circle: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      post: { findMany: jest.fn().mockResolvedValue([]) },
      article: { findMany: jest.fn().mockResolvedValue([]) },
      contentQualityScore: { count: jest.fn().mockResolvedValue(0) },
      circleRevenueRecord: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
      course: { findMany: jest.fn().mockResolvedValue([]) },
      order: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
      user: { findUnique: jest.fn() },
      instituteMember: { findFirst: jest.fn(), findUnique: jest.fn() },
      instituteSharePoint: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstituteAssessmentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    svc = module.get(InstituteAssessmentService);
  });

  /** 布好一套讲席五维全过的底座（各用例按需覆写单项造 fail） */
  function primeLecturePass() {
    prisma.circleMember.findMany.mockResolvedValue([
      { circleId: "c1", circle: { id: "c1", name: "儒学圈", memberCount: 80 } },
    ]);
    prisma.circle.findUnique.mockResolvedValue({ memberCount: 80 });
    // 25 篇内容（12 篇近 90 天帖 + 3 篇旧帖 + 10 篇文章），B 级以上 15 篇 → 占比 60%
    const recentPosts = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, createdAt: new Date(now - 10 * DAY) }));
    const oldPosts = Array.from({ length: 3 }, (_, i) => ({ id: `op${i}`, createdAt: new Date(now - 200 * DAY) }));
    prisma.post.findMany.mockResolvedValue([...recentPosts, ...oldPosts]);
    prisma.article.findMany.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: `a${i}` })));
    prisma.contentQualityScore.count.mockResolvedValue(15);
    // 创收：自有圈 4000 + 课程订单 2000 = 6000 元
    prisma.circle.findMany.mockResolvedValue([{ id: "c1" }]);
    prisma.circleRevenueRecord.aggregate.mockResolvedValue({ _sum: { amount: 4000 } });
    prisma.course.findMany.mockResolvedValue([{ id: "co1" }]);
    prisma.order.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
  }

  describe("getEligibility — 讲席五维（§3.2）", () => {
    it("五维全过 → eligible=true，checks 齐 5 项", async () => {
      primeLecturePass();
      const res = await svc.getEligibility("u1", "LECTURE");
      expect(res.eligible).toBe(true);
      expect(res.checks).toHaveLength(5);
      expect(res.checks.map((c) => c.key)).toEqual([
        "circleRole", "circleScale", "contentQuality", "recentActivity", "revenue",
      ]);
      expect(res.checks.every((c) => c.pass)).toBe(true);
    });

    it("维度1不过：非任何圈子的 OWNER/GUEST → circleRole fail 且 2-4 连带 fail", async () => {
      primeLecturePass();
      prisma.circleMember.findMany.mockResolvedValue([]);
      const res = await svc.getEligibility("u1", "LECTURE");
      expect(res.eligible).toBe(false);
      const byKey = Object.fromEntries(res.checks.map((c) => [c.key, c]));
      expect(byKey.circleRole.pass).toBe(false);
      expect(byKey.circleScale.pass).toBe(false);
      expect(byKey.recentActivity.pass).toBe(false);
      // 维度5是用户级累计创收，不依赖圈身份
      expect(byKey.revenue.pass).toBe(true);
    });

    it("维度2不过：圈成员数不足 50", async () => {
      primeLecturePass();
      prisma.circleMember.findMany.mockResolvedValue([
        { circleId: "c1", circle: { id: "c1", name: "小圈", memberCount: 12 } },
      ]);
      prisma.circle.findUnique.mockResolvedValue({ memberCount: 12 });
      const res = await svc.getEligibility("u1", "LECTURE");
      const scale = res.checks.find((c) => c.key === "circleScale")!;
      expect(scale.pass).toBe(false);
      expect(scale.current).toBe(12);
      expect(scale.required).toBe(50);
      expect(res.eligible).toBe(false);
    });

    it("维度3不过：内容数达标但 B 级以上占比不足 50%（数量不能换质量）", async () => {
      primeLecturePass();
      prisma.contentQualityScore.count.mockResolvedValue(5); // 5/25 = 20% < 50%
      const res = await svc.getEligibility("u1", "LECTURE");
      const cq = res.checks.find((c) => c.key === "contentQuality")!;
      expect(cq.pass).toBe(false);
      expect(cq.current).toBe(25); // 内容总数达标，是占比不过
      expect(res.eligible).toBe(false);
    });

    it("维度4不过：近90天圈内发帖不足 10 篇", async () => {
      primeLecturePass();
      // 只有 3 篇近 90 天帖 + 22 篇旧帖（内容总量仍 25）
      const recent = Array.from({ length: 3 }, (_, i) => ({ id: `p${i}`, createdAt: new Date(now - 5 * DAY) }));
      const old = Array.from({ length: 12 }, (_, i) => ({ id: `op${i}`, createdAt: new Date(now - 120 * DAY) }));
      prisma.post.findMany.mockResolvedValue([...recent, ...old]);
      const res = await svc.getEligibility("u1", "LECTURE");
      const act = res.checks.find((c) => c.key === "recentActivity")!;
      expect(act.pass).toBe(false);
      expect(act.current).toBe(3);
      expect(res.eligible).toBe(false);
    });

    it("维度5不过：圈子/课程累计创收不足 5000 元", async () => {
      primeLecturePass();
      prisma.circleRevenueRecord.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      prisma.order.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      const res = await svc.getEligibility("u1", "LECTURE");
      const rev = res.checks.find((c) => c.key === "revenue")!;
      expect(rev.pass).toBe(false);
      expect(rev.current).toBe(1500);
      expect(rev.required).toBe(5000);
      expect(res.eligible).toBe(false);
    });
  });

  describe("getEligibility — 研修席三维", () => {
    it("注册满90天+任一圈子成员 → eligible=true（年费确认为申请时确认项）", async () => {
      prisma.user.findUnique.mockResolvedValue({ createdAt: new Date(now - 200 * DAY) });
      prisma.circleMember.count.mockResolvedValue(2);
      const res = await svc.getEligibility("u1", "STUDY");
      expect(res.seatType).toBe("STUDY");
      expect(res.checks).toHaveLength(3);
      expect(res.eligible).toBe(true);
    });

    it("注册不满90天 → regDays fail", async () => {
      prisma.user.findUnique.mockResolvedValue({ createdAt: new Date(now - 10 * DAY) });
      prisma.circleMember.count.mockResolvedValue(1);
      const res = await svc.getEligibility("u1", "STUDY");
      const reg = res.checks.find((c) => c.key === "regDays")!;
      expect(reg.pass).toBe(false);
      expect(reg.current).toBe(10);
      expect(res.eligible).toBe(false);
    });

    it("未加入任何圈子 → anyCircle fail", async () => {
      prisma.user.findUnique.mockResolvedValue({ createdAt: new Date(now - 200 * DAY) });
      prisma.circleMember.count.mockResolvedValue(0);
      const res = await svc.getEligibility("u1", "STUDY");
      expect(res.checks.find((c) => c.key === "anyCircle")!.pass).toBe(false);
      expect(res.eligible).toBe(false);
    });
  });

  describe("getMyAssessment — 四档判定（V5）", () => {
    const year = new Date().getFullYear();
    /** 每季度一条记录（跨全年·保证已结束季度均达线） */
    function quarterRecords(pointsPerQuarter: number, pointType = "MANUAL") {
      return [0, 1, 2, 3].map((q) => ({
        id: `r${q}`, pointType, points: pointsPerQuarter, refId: null, remark: null,
        createdAt: new Date(year, q * 3, 15),
      }));
    }

    beforeEach(() => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1" });
    });

    it("非研究院成员 → NOT_FOUND", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      await expect(svc.getMyAssessment("u1")).rejects.toThrow(BusinessException);
    });

    it("全返 FULL_REFUND：积分≥100 且线下三选一达标（旗舰驿站≥1场）", async () => {
      prisma.instituteSharePoint.findMany.mockResolvedValue([
        ...quarterRecords(25), // 100 分
        { id: "off1", pointType: "OFFLINE_STATION", points: 25, refId: null, remark: null, createdAt: new Date(year, 0, 20) },
      ]);
      const res = await svc.getMyAssessment("u1");
      expect(res.points).toBe(125);
      expect(res.offline.met).toBe(true);
      expect(res.offline.detail.find((d) => d.type === "OFFLINE_STATION")!.count).toBe(1);
      expect(res.tier).toBe("FULL_REFUND");
    });

    it("半返 HALF_REFUND：积分≥100 但线下未达标（纯线上分享型）", async () => {
      prisma.instituteSharePoint.findMany.mockResolvedValue(quarterRecords(30, "LIVE_COURSE")); // 120 分全线上
      const res = await svc.getMyAssessment("u1");
      expect(res.points).toBe(120);
      expect(res.offline.met).toBe(false);
      expect(res.tier).toBe("HALF_REFUND");
    });

    it("保籍 KEEP：积分≥60 且已结束季度均≥15", async () => {
      prisma.instituteSharePoint.findMany.mockResolvedValue(quarterRecords(20)); // 80 分·每季 20
      const res = await svc.getMyAssessment("u1");
      expect(res.points).toBe(80);
      expect(res.quarterPoints).toEqual([20, 20, 20, 20]);
      expect(res.tier).toBe("KEEP");
    });

    it("AT_RISK：年度积分不足 60", async () => {
      prisma.instituteSharePoint.findMany.mockResolvedValue([
        { id: "r1", pointType: "ARTICLE", points: 50, refId: null, remark: null, createdAt: new Date(year, 0, 10) },
      ]);
      const res = await svc.getMyAssessment("u1");
      expect(res.points).toBe(50);
      expect(res.tier).toBe("AT_RISK");
    });

    it("特邀免会费 EXEMPT：feeExempt=true 无视积分高低恒返 EXEMPT 档（积分与流水照常返回）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1", feeExempt: true });
      prisma.instituteSharePoint.findMany.mockResolvedValue([
        ...quarterRecords(25), // 100 分·本可 FULL_REFUND
        { id: "off1", pointType: "OFFLINE_STATION", points: 25, refId: null, remark: null, createdAt: new Date(year, 0, 20) },
      ]);
      const res = await svc.getMyAssessment("u1");
      expect(res.tier).toBe("EXEMPT"); // 豁免返还与转席档位
      expect(res.feeExempt).toBe(true);
      expect(res.points).toBe(125); // 分享积分照记进榜单
      expect(res.pointItems.length).toBeGreaterThan(0);
    });

    it("特邀免会费 EXEMPT：零积分也不落 AT_RISK 转席档（免会费成员天然豁免转席）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1", feeExempt: true });
      prisma.instituteSharePoint.findMany.mockResolvedValue([]);
      const res = await svc.getMyAssessment("u1");
      expect(res.tier).toBe("EXEMPT");
      expect(res.points).toBe(0);
    });

    it("普通成员 feeExempt=false 照常四档判定且响应带 feeExempt 字段", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1", feeExempt: false });
      prisma.instituteSharePoint.findMany.mockResolvedValue(quarterRecords(30, "LIVE_COURSE"));
      const res = await svc.getMyAssessment("u1");
      expect(res.tier).toBe("HALF_REFUND");
      expect(res.feeExempt).toBe(false);
    });

    it("pointItems 最多返回近 20 条流水", async () => {
      prisma.instituteSharePoint.findMany.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => ({
          id: `r${i}`, pointType: "QA", points: 2, refId: null, remark: null, createdAt: new Date(year, 0, 1 + (i % 28)),
        })),
      );
      const res = await svc.getMyAssessment("u1");
      expect(res.pointItems).toHaveLength(20);
    });
  });

  describe("awardEventPointsForCompletedEvent — 活动自动记分（幂等）", () => {
    beforeEach(() => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1", instituteId: "i1", userId: "uL" });
    });

    it("SALON 完成 → 讲师记 INSTITUTE_SALON 20 分（refId=eventId）", async () => {
      prisma.instituteSharePoint.create.mockResolvedValue({ id: "sp1" });
      const res = await svc.awardEventPointsForCompletedEvent({
        id: "e1", type: "SALON", title: "院内沙龙", lecturerId: "uL", instituteId: "i1",
      });
      expect(res).toEqual({ id: "sp1" });
      expect(prisma.instituteSharePoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: "m1", userId: "uL", pointType: "INSTITUTE_SALON", points: 20, refId: "e1",
        }),
      });
    });

    it("LIVE 完成 → 记 LIVE_COURSE 15 分", async () => {
      prisma.instituteSharePoint.create.mockResolvedValue({ id: "sp2" });
      await svc.awardEventPointsForCompletedEvent({ id: "e2", type: "LIVE", lecturerId: "uL" });
      expect(prisma.instituteSharePoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ pointType: "LIVE_COURSE", points: 15, refId: "e2" }),
      });
    });

    it("幂等：同一活动已记过分（refId 查重命中）→ 不重复记分", async () => {
      prisma.instituteSharePoint.findFirst.mockResolvedValue({ id: "sp-old" });
      const res = await svc.awardEventPointsForCompletedEvent({ id: "e1", type: "SALON", lecturerId: "uL" });
      expect(res).toBeNull();
      expect(prisma.instituteSharePoint.create).not.toHaveBeenCalled();
    });

    it("无讲师/非记分活动类型（COURSE）/讲师非在册成员 → 均不记分", async () => {
      expect(await svc.awardEventPointsForCompletedEvent({ id: "e1", type: "SALON", lecturerId: null })).toBeNull();
      expect(await svc.awardEventPointsForCompletedEvent({ id: "e1", type: "COURSE", lecturerId: "uL" })).toBeNull();
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      expect(await svc.awardEventPointsForCompletedEvent({ id: "e1", type: "SALON", lecturerId: "uL" })).toBeNull();
      expect(prisma.instituteSharePoint.create).not.toHaveBeenCalled();
    });
  });

  describe("addManualPoints — 管理层人工记分", () => {
    it("非管理层 → FORBIDDEN", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null); // 无 ACTIVE 管理层会籍
      await expect(svc.addManualPoints("u-normal", "m2", { points: 10 })).rejects.toThrow("仅研究院管理层可操作");
      expect(prisma.instituteSharePoint.create).not.toHaveBeenCalled();
    });

    it("管理层记分成功：缺省 MANUAL 类型 + verifiedBy 记录操作者（可负分纠错）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "mgr1", instituteId: "i1" });
      prisma.instituteMember.findUnique.mockResolvedValue({ id: "m2", instituteId: "i1", userId: "u2" });
      prisma.instituteSharePoint.create.mockResolvedValue({ id: "sp3", points: -10 });
      const res: any = await svc.addManualPoints("u-mgr", "m2", { points: -10, remark: "重复记分纠错" });
      expect(res.id).toBe("sp3");
      expect(prisma.instituteSharePoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: "m2", userId: "u2", pointType: "MANUAL", points: -10, verifiedBy: "u-mgr", remark: "重复记分纠错",
        }),
      });
    });

    it("成员不存在 → NOT_FOUND；零分/无效类型 → BAD_REQUEST", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "mgr1", instituteId: "i1" });
      prisma.instituteMember.findUnique.mockResolvedValue(null);
      await expect(svc.addManualPoints("u-mgr", "mx", { points: 10 })).rejects.toThrow("成员不存在");

      prisma.instituteMember.findUnique.mockResolvedValue({ id: "m2", instituteId: "i1", userId: "u2" });
      await expect(svc.addManualPoints("u-mgr", "m2", { points: 0 })).rejects.toThrow(BusinessException);
      await expect(svc.addManualPoints("u-mgr", "m2", { points: 10, pointType: "HACK" })).rejects.toThrow(/无效积分类型/);
      expect(prisma.instituteSharePoint.create).not.toHaveBeenCalled();
    });
  });
});
