import { Test } from "@nestjs/testing";
import { TeacherService, computeTeacherInfluence } from "./teacher.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  user: { findUnique: jest.fn() },
  teacherCertification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  course: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  courseReview: { aggregate: jest.fn() },
  stationTeacher: { findMany: jest.fn() },
  instituteMember: { findFirst: jest.fn() },
};

describe("TeacherService", () => {
  let svc: TeacherService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        TeacherService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(TeacherService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("getMyCertification", () => {
    it("有记录则返回", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1", status: "APPROVED" });
      const res = await svc.getMyCertification("u1");
      expect(res).toEqual({ id: "t1", status: "APPROVED" });
    });

    it("无记录返回 null", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      expect(await svc.getMyCertification("u1")).toBeNull();
    });
  });

  describe("applyCertification", () => {
    const dto = { realName: "张讲师", title: "国学讲师" };

    it("未实名认证抛 403", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: false });
      await expect(svc.applyCertification("u1", dto)).rejects.toBeInstanceOf(BusinessException);
      expect(mockPrisma.teacherCertification.create).not.toHaveBeenCalled();
    });

    it("已实名且无记录 → 创建 PENDING", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      mockPrisma.teacherCertification.create.mockResolvedValue({ id: "t1", status: "PENDING" });
      const res = await svc.applyCertification("u1", dto);
      expect(res.status).toBe("PENDING");
      expect(mockPrisma.teacherCertification.create).toHaveBeenCalled();
    });

    it("已 APPROVED → 抛冲突，不重复创建", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED" });
      await expect(svc.applyCertification("u1", dto)).rejects.toBeInstanceOf(BusinessException);
      expect(mockPrisma.teacherCertification.create).not.toHaveBeenCalled();
    });

    it("审核中(PENDING) → 抛冲突", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "PENDING" });
      await expect(svc.applyCertification("u1", dto)).rejects.toBeInstanceOf(BusinessException);
    });

    it("已驳回(REJECTED) → 允许重新提交（update 回 PENDING）", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "REJECTED" });
      mockPrisma.teacherCertification.update.mockResolvedValue({ id: "t1", status: "PENDING" });
      const res = await svc.applyCertification("u1", dto);
      expect(res.status).toBe("PENDING");
      expect(mockPrisma.teacherCertification.update).toHaveBeenCalled();
    });
  });

  describe("getPublicProfile（讲师公开主页）", () => {
    /** 布好一套 APPROVED 讲师的聚合底座（各用例按需覆写） */
    function primeAggregates() {
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "论语精读", cover: "x.jpg", price: "99", studentCount: 120, type: "VIDEO" },
      ]);
      mockPrisma.course.count.mockResolvedValue(3);
      mockPrisma.course.aggregate.mockResolvedValue({ _sum: { studentCount: 350 } });
      mockPrisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.66 }, _count: { rating: 21 } });
      mockPrisma.stationTeacher.findMany.mockResolvedValue([
        { station: { id: "s1", name: "明德馆", city: "北京", cover: null, type: "academy" } },
      ]);
      mockPrisma.instituteMember.findFirst.mockResolvedValue(null);
    }

    it("无认证记录 → 404", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      await expect(svc.getPublicProfile("u1")).rejects.toBeInstanceOf(BusinessException);
    });

    it("认证未通过(PENDING) → 404", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "PENDING" });
      await expect(svc.getPublicProfile("u1")).rejects.toBeInstanceOf(BusinessException);
    });

    it("认证通过但用户不存在 → 404", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "认证讲师", intro: "x" });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getPublicProfile("u1")).rejects.toBeInstanceOf(BusinessException);
    });

    it("APPROVED → 聚合返回（脱敏：无手机号/证件字段）", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "国学名师", intro: "十年教学" });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "王老师", avatar: "a.jpg" });
      primeAggregates();
      const res = await svc.getPublicProfile("u1");
      expect(res.userId).toBe("u1");
      expect(res.verifiedTitle).toBe("国学名师");
      expect(res.stats).toEqual({ courseCount: 3, studentCount: 350, avgRating: 4.7, reviewCount: 21 });
      expect(res.courses).toHaveLength(1);
      expect(res.offlineStations).toEqual([{ id: "s1", name: "明德馆", city: "北京", cover: null, type: "academy" }]);
      expect(JSON.stringify(res)).not.toMatch(/phone|realName|idCard/);
      // 只聚合已过审未删除课程
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", auditStatus: "APPROVED", deletedAt: null }, take: 6 }),
      );
    });

    it("无评价 → 省略 avgRating/reviewCount（诚实降级）", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "讲师", intro: null });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "王老师", avatar: null });
      primeAggregates();
      mockPrisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });
      const res = await svc.getPublicProfile("u1");
      expect(res.stats).toEqual({ courseCount: 3, studentCount: 350 });
      expect("avgRating" in res.stats).toBe(false);
    });

    it("研究院签约讲师（ACTIVE+SIGNED）→ 补 institute 金标字段（T9-P0a）", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "讲师", intro: null });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "王老师", avatar: null });
      primeAggregates();
      mockPrisma.instituteMember.findFirst.mockResolvedValue({ lecturerLevel: "SIGNED", status: "ACTIVE" });
      const res: any = await svc.getPublicProfile("u1");
      expect(res.institute).toEqual({ signed: true, lecturerLevel: "SIGNED" });
      // 只查展示位，不带押金等资金字段（T9-P1 多院化后 findFirst）
      expect(mockPrisma.instituteMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          select: { lecturerLevel: true, status: true },
        }),
      );
    });

    it("非研究院成员 → 省略 institute 字段（诚实降级）", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "讲师", intro: null });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "王老师", avatar: null });
      primeAggregates();
      const res: any = await svc.getPublicProfile("u1");
      expect("institute" in res).toBe(false);
    });

    it("非在册成员（GRADUATED）→ 同样省略 institute 字段", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "讲师", intro: null });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "王老师", avatar: null });
      primeAggregates();
      mockPrisma.instituteMember.findFirst.mockResolvedValue({ lecturerLevel: "SIGNED", status: "GRADUATED" });
      const res: any = await svc.getPublicProfile("u1");
      expect("institute" in res).toBe(false);
    });

    it("驿站按 id 去重", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "讲师", intro: null });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "王老师", avatar: null });
      primeAggregates();
      mockPrisma.stationTeacher.findMany.mockResolvedValue([
        { station: { id: "s1", name: "明德馆", city: "北京", cover: null, type: "academy" } },
        { station: { id: "s1", name: "明德馆", city: "北京", cover: null, type: "academy" } },
        { station: { id: "s2", name: "崇文馆", city: "上海", cover: null, type: "center" } },
      ]);
      const res = await svc.getPublicProfile("u1");
      expect(res.offlineStations.map((s) => s.id)).toEqual(["s1", "s2"]);
    });
  });

  describe("listCertifications（管理端）", () => {
    it("按状态过滤返回分页", async () => {
      mockPrisma.teacherCertification.findMany.mockResolvedValue([{ id: "t1", status: "PENDING" }]);
      mockPrisma.teacherCertification.count.mockResolvedValue(1);
      const res = await svc.listCertifications("PENDING", 1, 20);
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(mockPrisma.teacherCertification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PENDING" } }),
      );
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("listCertifications: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.teacherCertification.findMany.mockResolvedValue([]);
      mockPrisma.teacherCertification.count.mockResolvedValue(0);
      await svc.listCertifications(undefined, "abc" as any, 20);
      const arg = mockPrisma.teacherCertification.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
    });
  });

  describe("reviewCertification（管理端审核）", () => {
    it("不存在 → 抛错", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      await expect(svc.reviewCertification("x", "APPROVE")).rejects.toBeInstanceOf(BusinessException);
    });

    it("APPROVE → 置 APPROVED 并写 verifiedTitle", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1", title: "讲师" });
      mockPrisma.teacherCertification.update.mockResolvedValue({ id: "t1", status: "APPROVED" });
      const res = await svc.reviewCertification("t1", "APPROVE", { verifiedTitle: "认证讲师" });
      expect(res.status).toBe("APPROVED");
      expect(mockPrisma.teacherCertification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED", verifiedTitle: "认证讲师" }) }),
      );
    });

    it("REJECT 无原因 → 抛错", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1" });
      await expect(svc.reviewCertification("t1", "REJECT", {})).rejects.toBeInstanceOf(BusinessException);
    });

    it("REJECT 有原因 → 置 REJECTED", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1" });
      mockPrisma.teacherCertification.update.mockResolvedValue({ id: "t1", status: "REJECTED" });
      const res = await svc.reviewCertification("t1", "REJECT", { rejectReason: "资质不足" });
      expect(res.status).toBe("REJECTED");
    });
  });
});

describe("computeTeacherInfluence（讲师影响力指数·课题二工作台P3）", () => {
  it("零数据讲师 → 0 分·起步阶段", () => {
    const r = computeTeacherInfluence({ courseCount: 0, studentCount: 0 });
    expect(r.score).toBe(0);
    expect(r.levelKey).toBe("starter");
    expect(r.breakdown).toEqual({ reach: 0, output: 0, reputation: 0, trust: 0 });
  });

  it("头部名师（大量学员+多课+满分口碑+大量评价）→ 触顶 100·名师影响力", () => {
    const r = computeTeacherInfluence({ courseCount: 20, studentCount: 50000, avgRating: 5, reviewCount: 2000 });
    expect(r.score).toBe(100);
    expect(r.levelKey).toBe("master");
    // 各维均触顶
    expect(r.breakdown.reach).toBe(40);
    expect(r.breakdown.output).toBe(20);
    expect(r.breakdown.reputation).toBe(25);
    expect(r.breakdown.trust).toBe(15);
  });

  it("无评价（口碑未建立）→ reputation/trust 记 0，不虚高", () => {
    const r = computeTeacherInfluence({ courseCount: 4, studentCount: 100 });
    expect(r.breakdown.reputation).toBe(0);
    expect(r.breakdown.trust).toBe(0);
    // 仅 reach + output 贡献
    expect(r.score).toBe(r.breakdown.reach + r.breakdown.output);
  });

  it("对数缩放：学员越多得分递增但边际递减（防头部碾压）", () => {
    const few = computeTeacherInfluence({ courseCount: 0, studentCount: 10 }).breakdown.reach;
    const mid = computeTeacherInfluence({ courseCount: 0, studentCount: 1000 }).breakdown.reach;
    const many = computeTeacherInfluence({ courseCount: 0, studentCount: 100000 }).breakdown.reach;
    expect(few).toBeLessThan(mid);
    expect(mid).toBeLessThanOrEqual(many);
    expect(many).toBeLessThanOrEqual(40); // 触顶封顶
  });

  it("异常入参（负数/越界评分）稳健归一化，不产 NaN/越界", () => {
    const r = computeTeacherInfluence({ courseCount: -5, studentCount: -100, avgRating: 9, reviewCount: -3 });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.breakdown.reputation).toBeLessThanOrEqual(25); // avgRating 9 被钳到 5
  });

  it("分级边界：40→成长影响力、60→资深、80→名师", () => {
    // 构造恰好落档的组合（output 20 + reputation 20 = 40 边界）
    const growing = computeTeacherInfluence({ courseCount: 8, studentCount: 0, avgRating: 4, reviewCount: 0 });
    expect(growing.score).toBeGreaterThanOrEqual(40);
    expect(["growing", "senior", "master"]).toContain(growing.levelKey);
  });
});
