import { Test } from "@nestjs/testing";
import { CourseService } from "./course.service";
import { CourseRecommendService } from "./course-recommend.service";
import { CourseAdminService } from "./course-admin.service";
import { CourseCreatorService } from "./course-creator.service";
import { CoursePurchaseService } from "./course-purchase.service";
import { CourseLearningService } from "./course-learning.service";
import { CourseWorkService } from "./course-work.service";
import { CourseReviewQaService } from "./course-review-qa.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { PUBLIC_QUARANTINED_IDS } from "../../common/public-content-quarantine";

const mockPrisma = {
  course: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  courseChapter: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  courseProgress: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  courseWork: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  courseReview: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  userBehavior: {
    create: jest.fn().mockResolvedValue({}),
  },
  configSystem: {
    findUnique: jest.fn().mockResolvedValue(null), // 官方圈未配置：circleId 缺省保持 undefined
  },
  userRole: {
    findFirst: jest.fn().mockResolvedValue(null), // 默认非平台管理员：非本人编辑仍 403（管理员放行逻辑见 isPlatformAdmin）
  },
};

const mockRedis = {
  delByPattern: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
  del: jest.fn(),
  setNX: jest.fn().mockResolvedValue(true), // Redis 锁：默认加锁成功
};

describe("CourseService", () => {
  let svc: CourseService;

  beforeAll(async () => {
    const mockAiGateway = { chat: jest.fn(), chatStream: jest.fn(), embed: jest.fn() };
    const mockUnifiedPricing = {
      calculateTargetPrice: jest.fn().mockResolvedValue({
        targetId: "co1",
        targetType: "COURSE",
        effectivePrice: 50,
        originalPrice: 50,
        hasPromotion: false,
        appliedPromotion: null,
        activePromotions: [],
      }),
    };

    const mod = await Test.createTestingModule({
      providers: [
        CourseService,
        CourseRecommendService,
        CourseAdminService,
        CourseCreatorService,
        CoursePurchaseService,
        CourseLearningService,
        CourseWorkService,
        CourseReviewQaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiGatewayService, useValue: mockAiGateway },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        {
          provide: AuditService,
          useValue: {
            moderateTextOrThrow: jest.fn().mockResolvedValue(undefined),
            // 默认按 CIRCLE_ONLY 直生效；分流逻辑本体在 audit.service.spec 覆盖
            resolveContentVisibility: jest.fn().mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "APPROVED" }),
            openContentAudit: jest.fn().mockResolvedValue(undefined),
            queueContentModeration: jest.fn(),
          },
        },
      ],
    }).compile();
    svc = mod.get(CourseService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create", () => {
    it("创建课程成功", async () => {
      mockPrisma.course.create.mockResolvedValue({ id: "co1", title: "论语精讲", chapters: [] });
      mockRedis.delByPattern.mockResolvedValue(undefined);

      const result = await svc.create("u1", { title: "论语精讲" });
      expect(result.id).toBe("co1");
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("courses:list:*");
    });

    it("创建课程带默认值", async () => {
      mockPrisma.course.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "co1", ...data, chapters: [] }),
      );
      mockRedis.delByPattern.mockResolvedValue(undefined);

      const result = await svc.create("u1", { title: "测试" });
      expect(result.type).toBe("VIDEO");
      expect(result.price).toBe(0);
    });
  });

  describe("update", () => {
    it("更新自己的课程成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.course.update.mockResolvedValue({ id: "co1", title: "新标题", chapters: [] });
      mockRedis.delByPattern.mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(undefined);

      const result = await svc.update("co1", "u1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });

    it("课程不存在抛出 NotFoundException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(svc.update("invalid", "u1", { title: "新标题" })).rejects.toThrow(BusinessException);
    });

    it("编辑他人课程抛出 ForbiddenException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u2" });
      await expect(svc.update("co1", "u1", { title: "新标题" })).rejects.toThrow(BusinessException);
    });
  });

  describe("delete", () => {
    it("删除自己的课程成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.course.delete.mockResolvedValue({});
      const result = await svc.delete("co1", "u1");
      expect(result.success).toBe(true);
    });

    it("课程不存在抛出 NotFoundException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(svc.delete("invalid", "u1")).rejects.toThrow(BusinessException);
    });

    it("删除他人课程抛出 ForbiddenException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u2" });
      await expect(svc.delete("co1", "u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("getDetail", () => {
    it("有缓存时返回缓存数据", async () => {
      mockRedis.getJson.mockResolvedValue({ id: "co1", title: "缓存课程", chapters: [], user: {}, circle: {} });
      const result = await svc.getDetail("co1");
      expect(result.title).toBe("缓存课程");
      expect(mockPrisma.course.findUnique).not.toHaveBeenCalled();
    });

    it("无缓存时查询数据库并写入缓存", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findUnique.mockResolvedValue({
        id: "co1", title: "数据库课程", user: {}, circle: {}, chapters: [],
      });
      mockPrisma.course.update.mockResolvedValue({});
      mockRedis.setJson.mockResolvedValue(undefined);

      const result = await svc.getDetail("co1");
      expect(result.title).toBe("数据库课程");
      expect(mockRedis.setJson).toHaveBeenCalled();
    });

    it("课程不存在抛出 NotFoundException", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(svc.getDetail("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("listCourses", () => {
    it("无缓存时查询并写入缓存", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      mockRedis.setJson.mockResolvedValue(undefined);

      const result = await svc.listCourses({ page: 1, pageSize: 20 });
      expect(result).toHaveProperty("courses");
      expect(result.total).toBe(0);
      expect(mockRedis.setJson).toHaveBeenCalled();
      const where = mockPrisma.course.findMany.mock.calls.at(-1)![0].where;
      expect(where.id).toEqual({ notIn: [...PUBLIC_QUARANTINED_IDS.course] });
    });

    it("有缓存时直接返回", async () => {
      const cached = { courses: [], total: 0, page: 1, pageSize: 20 };
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.listCourses({ page: 1, pageSize: 20 });
      expect(result).toEqual(cached);
    });

    it("管理端 ALL 保留隔离记录用于审核", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      await svc.listCourses({ page: 1, pageSize: 20, status: "ALL" });
      expect(mockPrisma.course.findMany.mock.calls.at(-1)![0].where.id).toBeUndefined();
    });

    // 分类/排序/免费 下沉：作用于 where/orderBy，且筛选态绕过缓存
    describe("筛选与排序下沉", () => {
      beforeEach(() => {
        mockRedis.getJson.mockResolvedValue(null);
        mockPrisma.course.findMany.mockResolvedValue([]);
        mockPrisma.course.count.mockResolvedValue(0);
      });

      it("categoryLevel1 过滤进 where，且绕过缓存", async () => {
        await svc.listCourses({ page: 1, pageSize: 20, categoryLevel1: "国学经典" });
        const arg = mockPrisma.course.findMany.mock.calls.at(-1)![0];
        expect(arg.where.categoryLevel1).toBe("国学经典");
        expect(arg.where.auditStatus).toBe("APPROVED"); // 默认只看已审核
      });

      it("free=true → where.price=0", async () => {
        await svc.listCourses({ page: 1, pageSize: 20, free: true });
        expect(mockPrisma.course.findMany.mock.calls.at(-1)![0].where.price).toBe(0);
      });

      it("sort=popular→studentCount desc / price-asc→price asc / 默认→createdAt desc", async () => {
        await svc.listCourses({ page: 1, pageSize: 20, sort: "popular" });
        expect(mockPrisma.course.findMany.mock.calls.at(-1)![0].orderBy).toEqual({ studentCount: "desc" });
        await svc.listCourses({ page: 1, pageSize: 20, sort: "price-asc" });
        expect(mockPrisma.course.findMany.mock.calls.at(-1)![0].orderBy).toEqual({ price: "asc" });
        await svc.listCourses({ page: 1, pageSize: 20 });
        expect(mockPrisma.course.findMany.mock.calls.at(-1)![0].orderBy).toEqual({ createdAt: "desc" });
      });
    });
  });

  describe("listCourseCategoryTabs", () => {
    it("聚合一级品类+计数，按计数降序，过滤空品类", async () => {
      mockPrisma.course.groupBy.mockResolvedValue([
        { categoryLevel1: "国学经典", _count: { _all: 2 } },
        { categoryLevel1: "易经命理", _count: { _all: 5 } },
        { categoryLevel1: null, _count: { _all: 9 } },
      ]);
      const result = await svc.listCourseCategoryTabs();
      expect(result).toEqual([
        { name: "易经命理", count: 5 },
        { name: "国学经典", count: 2 },
      ]);
    });
  });

  describe("audit", () => {
    it("审核课程成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ auditStatus: "PENDING" });
      mockPrisma.course.update.mockResolvedValue({ id: "co1", auditStatus: "APPROVED" });
      const result = await svc.audit("co1", "APPROVED");
      expect(result.auditStatus).toBe("APPROVED");
    });
  });

  describe("addChapter", () => {
    it("添加章节成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.courseChapter.create.mockResolvedValue({ id: "ch1", title: "第一章" });
      const result = await svc.addChapter("co1", "u1", { title: "第一章" });
      expect(result.id).toBe("ch1");
    });

    it("非所有者添加章节抛出 ForbiddenException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u2" });
      await expect(svc.addChapter("co1", "u1", { title: "第一章" })).rejects.toThrow(BusinessException);
    });
  });

  describe("updateChapter", () => {
    it("更新章节成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.courseChapter.findUnique.mockResolvedValue({ id: "ch1", courseId: "co1" });
      mockPrisma.courseChapter.update.mockResolvedValue({ id: "ch1", title: "更新后" });
      const result = await svc.updateChapter("ch1", "co1", "u1", { title: "更新后" });
      expect(result.title).toBe("更新后");
    });
  });

  describe("deleteChapter", () => {
    it("删除章节成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.courseChapter.findUnique.mockResolvedValue({ id: "ch1", courseId: "co1" });
      mockPrisma.courseChapter.delete.mockResolvedValue({});
      const result = await svc.deleteChapter("ch1", "co1", "u1");
      expect(result.success).toBe(true);
    });
  });

  describe("getChapters", () => {
    it("获取章节列表（仅元数据）", async () => {
      mockPrisma.courseChapter.findMany.mockResolvedValue([{ id: "ch1", title: "第一章", duration: 300, sortOrder: 0, freeTrial: false }]);
      const result = await svc.getChapters("co1");
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty("content");
    });
  });

  describe("getChapterContent", () => {
    it("免费章节直接返回内容", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "试看", content: "免费内容", freeTrial: true,
        course: { id: "co1", price: 99, userId: "u2" },
      });
      const result = await svc.getChapterContent("u1", "ch1");
      expect(result.content).toBe("免费内容");
    });

    it("课程作者可以访问", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "第一章", content: "付费内容", freeTrial: false,
        course: { id: "co1", price: 99, userId: "u1" },
      });
      const result = await svc.getChapterContent("u1", "ch1");
      expect(result.content).toBe("付费内容");
    });

    it("免费课程直接返回内容", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "第一章", content: "免费课程内容", freeTrial: false,
        course: { id: "co1", price: 0, userId: "u2" },
      });
      const result = await svc.getChapterContent("u1", "ch1");
      expect(result.content).toBe("免费课程内容");
    });

    it("未购买且非免费章节抛出 ForbiddenException", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "付费章节", content: "secret", freeTrial: false,
        course: { id: "co1", price: 99, userId: "u2" },
      });
      mockPrisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(svc.getChapterContent("u1", "ch1")).rejects.toThrow(BusinessException);
    });

    it("已购买用户可访问付费章节", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "付费章节", content: "secret", freeTrial: false,
        course: { id: "co1", price: 99, userId: "u2" },
      });
      mockPrisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID", paidAt: new Date() });
      const result = await svc.getChapterContent("u1", "ch1");
      expect(result.content).toBe("secret");
    });

    it("章节不存在抛出 NotFoundException", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue(null);
      await expect(svc.getChapterContent("u1", "invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("updateProgress", () => {
    it("更新进度未完成", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({ id: "ch1", courseId: "co1" });
      mockPrisma.courseProgress.upsert.mockResolvedValue({ progress: 50, completed: false });
      const result = await svc.updateProgress("u1", "ch1", { progress: 50 });
      expect(result.progress).toBe(50);
      expect(result.completed).toBe(false);
    });

    it("进度 100 标记完成", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({ id: "ch1", courseId: "co1" });
      mockPrisma.courseProgress.upsert.mockResolvedValue({ progress: 100, completed: true });
      const result = await svc.updateProgress("u1", "ch1", { progress: 100 });
      expect(result.completed).toBe(true);
    });

    it("章节不存在抛出 NotFoundException", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue(null);
      await expect(svc.updateProgress("u1", "invalid", { progress: 50 })).rejects.toThrow(BusinessException);
    });
  });

  describe("getMyProgress", () => {
    it("获取学习进度", async () => {
      mockPrisma.courseProgress.findMany.mockResolvedValue([{ chapterId: "ch1", progress: 80, completed: false }]);
      const result = await svc.getMyProgress("u1", "co1");
      expect(result).toHaveLength(1);
    });
  });

  describe("submitWork", () => {
    it("提交作业成功", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue({ id: "ch1", courseId: "co1" });
      mockPrisma.courseWork.create.mockResolvedValue({ id: "w1", content: "作业" });
      const result = await svc.submitWork("u1", "ch1", { content: "作业内容" });
      expect(result.id).toBe("w1");
    });

    it("章节不存在抛出 NotFoundException", async () => {
      mockPrisma.courseChapter.findUnique.mockResolvedValue(null);
      await expect(svc.submitWork("u1", "invalid", { content: "作业" })).rejects.toThrow(BusinessException);
    });
  });

  describe("getWorks", () => {
    it("获取作业列表", async () => {
      mockPrisma.courseWork.findMany.mockResolvedValue([{ id: "w1", content: "作业" }]);
      const result = await svc.getWorks("co1");
      expect(result.list).toHaveLength(1);
    });

    it("按章节过滤", async () => {
      mockPrisma.courseWork.findMany.mockResolvedValue([]);
      await svc.getWorks("co1", "ch1");
      expect(mockPrisma.courseWork.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courseId: "co1", chapterId: "ch1" } }),
      );
    });
  });

  describe("scoreWork", () => {
    it("批改作业成功", async () => {
      mockPrisma.courseWork.findUnique.mockResolvedValue({ courseId: "co1" });
      mockPrisma.course.findUnique.mockResolvedValue({ userId: "u1" });
      mockPrisma.courseWork.update.mockResolvedValue({ id: "w1", score: 95, feedback: "优秀" });
      const result = await svc.scoreWork("w1", "u1", 95, true, "优秀");
      expect(result.score).toBe(95);
    });
  });

  // ═══════════════════ 购买 ═══════════════════

  describe("purchase", () => {
    it("创建购买订单成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, title: "论语精讲" });
      mockPrisma.order.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // no paid, no pending
      mockPrisma.order.create.mockResolvedValue({ id: "o1", status: "PENDING", amount: 99 });

      const result = await svc.purchase("u1", "co1");
      expect(result.id).toBe("o1");
      expect(result.status).toBe("PENDING");
    });

    it("已购买抛出 BadRequestException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, title: "论语" });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID", paidAt: new Date() });
      await expect(svc.purchase("u1", "co1")).rejects.toThrow(BusinessException);
    });

    it("有未支付订单直接返回", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, title: "论语" });
      mockPrisma.order.findFirst
        .mockResolvedValueOnce(null) // no paid
        .mockResolvedValueOnce({ id: "o1", status: "PENDING" }); // has pending
      const result = await svc.purchase("u1", "co1");
      expect(result.id).toBe("o1");
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it("课程不存在抛出 NotFoundException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(svc.purchase("u1", "invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("checkAccess", () => {
    it("免费课程返回 true", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ price: 0, userId: "u2" });
      const result = await svc.checkAccess("u1", "co1");
      expect(result).toBe(true);
    });

    it("课程作者返回 true", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u1" });
      const result = await svc.checkAccess("u1", "co1");
      expect(result).toBe(true);
    });

    it("已购买用户返回 true", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID", paidAt: new Date() });
      const result = await svc.checkAccess("u1", "co1");
      expect(result).toBe(true);
    });

    it("未购买用户返回 false", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue(null);
      const result = await svc.checkAccess("u1", "co1");
      expect(result).toBe(false);
    });

    it("课程不存在返回 false", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      const result = await svc.checkAccess("u1", "invalid");
      expect(result).toBe(false);
    });
  });

  describe("getMyCourses", () => {
    it("获取已购课程列表", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o1", targetId: "co1", paidAt: new Date(), amount: 99 }]);
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "co1", title: "论语精讲", cover: null, type: "VIDEO", user: { id: "u2", nickname: "讲师", avatar: null } },
      ]);
      const result = await svc.getMyCourses("u1");
      expect(result.total).toBe(1);
      expect(result.courses[0].course?.title).toBe("论语精讲");
    });
  });

  // ═══════════════════ 评价 ═══════════════════

  describe("createReview", () => {
    it("创建评价成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID", paidAt: new Date() });
      mockPrisma.courseReview.findFirst.mockResolvedValue(null);
      mockPrisma.courseReview.create.mockResolvedValue({
        id: "r1", rating: 5, content: "很棒", user: { id: "u1", nickname: "学生", avatar: null },
      });
      mockRedis.del.mockResolvedValue(undefined);

      const result = await svc.createReview("u1", "co1", { rating: 5, content: "很棒" });
      expect(result.rating).toBe(5);
    });

    it("未购买不能评价", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(svc.createReview("u1", "co1", { rating: 5, content: "很棒" })).rejects.toThrow(BusinessException);
    });

    it("课程作者不需要购买也能评价", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, userId: "u1" });
      mockPrisma.courseReview.findFirst.mockResolvedValue(null);
      mockPrisma.courseReview.create.mockResolvedValue({
        id: "r1", rating: 4, content: "测试", user: { id: "u1", nickname: "讲师", avatar: null },
      });
      mockRedis.del.mockResolvedValue(undefined);

      const result = await svc.createReview("u1", "co1", { rating: 4, content: "测试" });
      expect(result.rating).toBe(4);
    });

    it("不能重复评价", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 99, userId: "u2" });
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID", paidAt: new Date() });
      mockPrisma.courseReview.findFirst.mockResolvedValue({ id: "r1" });
      await expect(svc.createReview("u1", "co1", { rating: 3, content: "再次" })).rejects.toThrow(BusinessException);
    });

    it("评分范围校验", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", price: 0, userId: "u1" });
      await expect(svc.createReview("u1", "co1", { rating: 6, content: "过高" })).rejects.toThrow(BusinessException);
      await expect(svc.createReview("u1", "co1", { rating: 0, content: "过低" })).rejects.toThrow(BusinessException);
    });

    it("课程不存在抛出 NotFoundException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(svc.createReview("u1", "invalid", { rating: 5, content: "好" })).rejects.toThrow(BusinessException);
    });
  });

  describe("listReviews", () => {
    it("获取评价列表", async () => {
      mockPrisma.courseReview.findMany.mockResolvedValue([{ id: "r1", rating: 5, content: "好", user: {} }]);
      mockPrisma.courseReview.count.mockResolvedValue(1);
      const result = await svc.listReviews("co1");
      expect(result.total).toBe(1);
    });
  });

  describe("getCourseRating", () => {
    it("获取评分统计", async () => {
      mockPrisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 10 });
      const result = await svc.getCourseRating("co1");
      expect(result.avgRating).toBe(4.5);
      expect(result.reviewCount).toBe(10);
    });

    it("无评价时返回零值", async () => {
      mockPrisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
      const result = await svc.getCourseRating("co1");
      expect(result.avgRating).toBe(0);
      expect(result.reviewCount).toBe(0);
    });
  });

  // ═══════════════════ 学习看板 ═══════════════════

  describe("getMyLearningDashboard", () => {
    it("返回学习看板数据", async () => {
      mockPrisma.order.count.mockResolvedValue(3);
      mockPrisma.courseProgress.count.mockResolvedValueOnce(12).mockResolvedValueOnce(5);
      mockPrisma.courseWork.count.mockResolvedValue(2);
      mockPrisma.courseProgress.findMany.mockResolvedValue([]);

      const result = await svc.getMyLearningDashboard("u1");
      expect(result.enrolledCourses).toBe(3);
      expect(result.completedChapters).toBe(12);
      expect(result.inProgressChapters).toBe(5);
      expect(result.pendingWorks).toBe(2);
    });
  });

  describe("getCourseStats", () => {
    it("讲师查看自己课程的统计", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1", title: "测试课" });
      mockPrisma.order.count.mockResolvedValue(50);
      mockPrisma.courseProgress.count.mockResolvedValue(30);
      mockPrisma.courseChapter.count.mockResolvedValue(10);
      mockPrisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.2 } });
      mockPrisma.courseReview.count.mockResolvedValue(25);
      mockPrisma.courseWork.count.mockResolvedValue(40);

      const result = await svc.getCourseStats("u1", "co1");
      expect(result.enrollmentCount).toBe(50);
      expect(result.avgRating).toBe(4.2);
      expect(result.totalWorks).toBe(40);
    });

    it("非课程作者查看统计抛出 ForbiddenException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u2", title: "别人的课" });
      await expect(svc.getCourseStats("u1", "co1")).rejects.toThrow(BusinessException);
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("listCourses: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockRedis.setJson.mockResolvedValue(undefined);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      await svc.listCourses({ page: "abc" as any, pageSize: 20 });
      const arg = mockPrisma.course.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
    });

    it("listCourses: 负数 pageSize 归一化至1·skip=0（pageSize 不能为负）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockRedis.setJson.mockResolvedValue(undefined);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      await svc.listCourses({ page: 1, pageSize: -5 as any });
      const arg = mockPrisma.course.findMany.mock.calls.at(-1)![0];
      expect(arg.skip).toBe(0);
      expect(arg.take).toBeGreaterThan(0);
    });
  });
});
