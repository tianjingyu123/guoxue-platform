import { Test } from "@nestjs/testing";
import { CourseService } from "./course.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

const mockPrisma = {
  course: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  courseChapter: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  courseProgress: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  courseWork: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedis = {
  delByPattern: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
  del: jest.fn(),
};

describe("CourseService", () => {
  let svc: CourseService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
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
      await expect(svc.update("invalid", "u1", { title: "新标题" })).rejects.toThrow(NotFoundException);
    });

    it("编辑他人课程抛出 ForbiddenException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u2" });
      await expect(svc.update("co1", "u1", { title: "新标题" })).rejects.toThrow(ForbiddenException);
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
      await expect(svc.delete("invalid", "u1")).rejects.toThrow(NotFoundException);
    });

    it("删除他人课程抛出 ForbiddenException", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u2" });
      await expect(svc.delete("co1", "u1")).rejects.toThrow(ForbiddenException);
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
      await expect(svc.getDetail("invalid")).rejects.toThrow(NotFoundException);
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
    });

    it("有缓存时直接返回", async () => {
      const cached = { courses: [], total: 0, page: 1, pageSize: 20 };
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.listCourses({ page: 1, pageSize: 20 });
      expect(result).toEqual(cached);
    });
  });

  describe("audit", () => {
    it("审核课程成功", async () => {
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
      await expect(svc.addChapter("co1", "u1", { title: "第一章" })).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateChapter", () => {
    it("更新章节成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.courseChapter.update.mockResolvedValue({ id: "ch1", title: "更新后" });
      const result = await svc.updateChapter("ch1", "co1", "u1", { title: "更新后" });
      expect(result.title).toBe("更新后");
    });
  });

  describe("deleteChapter", () => {
    it("删除章节成功", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1", userId: "u1" });
      mockPrisma.courseChapter.delete.mockResolvedValue({});
      const result = await svc.deleteChapter("ch1", "co1", "u1");
      expect(result.success).toBe(true);
    });
  });

  describe("getChapters", () => {
    it("获取章节列表", async () => {
      mockPrisma.courseChapter.findMany.mockResolvedValue([{ id: "ch1", title: "第一章" }]);
      const result = await svc.getChapters("co1");
      expect(result).toHaveLength(1);
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
      await expect(svc.updateProgress("u1", "invalid", { progress: 50 })).rejects.toThrow(NotFoundException);
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
      await expect(svc.submitWork("u1", "invalid", { content: "作业" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("getWorks", () => {
    it("获取作业列表", async () => {
      mockPrisma.courseWork.findMany.mockResolvedValue([{ id: "w1", content: "作业" }]);
      const result = await svc.getWorks("co1");
      expect(result).toHaveLength(1);
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
      mockPrisma.courseWork.update.mockResolvedValue({ id: "w1", score: 95, feedback: "优秀" });
      const result = await svc.scoreWork("w1", "u1", 95, "优秀");
      expect(result.score).toBe(95);
    });
  });
});
