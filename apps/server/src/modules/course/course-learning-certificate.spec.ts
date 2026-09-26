import { CourseLearningService } from "./course-learning.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CoursePurchaseService } from "./course-purchase.service";

describe("CourseLearningService 完课与证书资格", () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    courseChapter: { findMany: jest.fn() },
    courseProgress: { count: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const purchase = { checkAccess: jest.fn() };
  const service = new CourseLearningService(
    prisma as unknown as PrismaService,
    purchase as unknown as CoursePurchaseService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    purchase.checkAccess.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({ nickname: "测试学员" });
  });

  it("零章节不能标记完成，也不能领取证书", async () => {
    prisma.course.findUnique.mockResolvedValue({ id: "course-1", title: "测试课", user: null, chapters: [] });
    prisma.courseChapter.findMany.mockResolvedValue([]);

    await expect(service.completeCourse("user-1", "course-1")).rejects.toThrow("课程尚无章节");
    await expect(service.getCertificate("user-1", "course-1")).rejects.toThrow("课程尚无章节");
    expect(prisma.courseProgress.count).not.toHaveBeenCalled();
    expect(prisma.courseProgress.findMany).not.toHaveBeenCalled();
  });

  it("完课只统计当前课程章节的已完成进度", async () => {
    prisma.course.findUnique.mockResolvedValue({ id: "course-1", title: "测试课" });
    prisma.courseChapter.findMany.mockResolvedValue([{ id: "chapter-1" }, { id: "chapter-2" }]);
    prisma.courseProgress.count.mockResolvedValue(1);

    await expect(service.completeCourse("user-1", "course-1")).rejects.toThrow("还有 1 个章节未完成");
    expect(prisma.courseProgress.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1", courseId: "course-1", completed: true,
        chapterId: { in: ["chapter-1", "chapter-2"] },
      },
    });
  });

  it("证书只统计当前章节，缺少任一章节则拒绝", async () => {
    prisma.course.findUnique.mockResolvedValue({
      title: "测试课", user: { nickname: "测试讲师" },
      chapters: [{ id: "chapter-1", duration: 600 }, { id: "chapter-2", duration: 1200 }],
    });
    prisma.courseProgress.findMany.mockResolvedValue([{ updatedAt: new Date("2026-09-22T00:00:00Z") }]);

    await expect(service.getCertificate("user-1", "course-1")).rejects.toThrow("尚未完成全部章节");
    expect(prisma.courseProgress.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1", courseId: "course-1", completed: true,
        chapterId: { in: ["chapter-1", "chapter-2"] },
      },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("全部当前章节完成后返回与学员及课程匹配的证书", async () => {
    prisma.course.findUnique.mockResolvedValue({
      title: "测试课", user: { nickname: "测试讲师" },
      chapters: [{ id: "chapter-1", duration: 600 }, { id: "chapter-2", duration: 1200 }],
    });
    prisma.courseProgress.findMany.mockResolvedValue([
      { updatedAt: new Date("2026-09-22T00:00:00Z") },
      { updatedAt: new Date("2026-09-21T00:00:00Z") },
    ]);

    await expect(service.getCertificate("user-1", "course-1")).resolves.toMatchObject({
      courseId: "course-1", courseTitle: "测试课", studentName: "测试学员",
      instructor: "测试讲师", completedChapters: 2, totalChapters: 2,
      totalHours: 0.5, completedAt: "2026-09-22",
    });
  });
});
