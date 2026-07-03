import { Test } from "@nestjs/testing";
import { OfflineOnboardingService } from "./offline-onboarding.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  stationOffline: { findUnique: jest.fn() },
  stationTeacher: { count: jest.fn() },
  offlineCourse: { count: jest.fn() },
  stationProduct: { count: jest.fn() },
  offlineCourseRegistration: { count: jest.fn(), groupBy: jest.fn() },
  stationEvent: { count: jest.fn() },
  offlineCourseReview: { count: jest.fn() },
};

/** 一把设齐 8 个统计口（offlineCourse.count 按调用顺序：PUBLISHED 课程数 → circleId 非空课程数） */
function primeCounts(opts: {
  teachers?: number;
  publishedCourses?: number;
  products?: number;
  registrations?: number;
  heldEvents?: number;
  circleCourses?: number;
  reviews?: number;
  students?: number;
}) {
  mockPrisma.stationTeacher.count.mockResolvedValue(opts.teachers ?? 0);
  mockPrisma.offlineCourse.count
    .mockResolvedValueOnce(opts.publishedCourses ?? 0)
    .mockResolvedValueOnce(opts.circleCourses ?? 0);
  mockPrisma.stationProduct.count.mockResolvedValue(opts.products ?? 0);
  mockPrisma.offlineCourseRegistration.count.mockResolvedValue(opts.registrations ?? 0);
  mockPrisma.stationEvent.count.mockResolvedValue(opts.heldEvents ?? 0);
  mockPrisma.offlineCourseReview.count.mockResolvedValue(opts.reviews ?? 0);
  mockPrisma.offlineCourseRegistration.groupBy.mockResolvedValue(
    Array.from({ length: opts.students ?? 0 }, (_, i) => ({ userId: `u${i}` })),
  );
}

describe("OfflineOnboardingService · 开业 SOP 进度", () => {
  let svc: OfflineOnboardingService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [OfflineOnboardingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(OfflineOnboardingService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("驿站不存在 → NOT_FOUND", async () => {
    mockPrisma.stationOffline.findUnique.mockResolvedValue(null);
    await expect(svc.getOnboarding("nope")).rejects.toThrow(BusinessException);
  });

  it("全新驿站：全部未完成，progress=0/10（share 引导项不计入分母）", async () => {
    mockPrisma.stationOffline.findUnique.mockResolvedValue({
      name: "明德馆",
      intro: null,
      images: [],
      createdAt: new Date(),
    });
    primeCounts({});

    const res = await svc.getOnboarding("st1");

    expect(res.stationName).toBe("明德馆");
    expect(res.stages.map((s) => s.key)).toEqual(["setup", "operate", "growth"]);
    const all = res.stages.flatMap((s) => s.items);
    expect(all).toHaveLength(11);
    // share 是引导项：done=null 且不计入 total
    expect(all.find((i) => i.key === "share")?.done).toBeNull();
    expect(res.progress).toEqual({ done: 0, total: 10 });
    expect(all.filter((i) => i.done === true)).toHaveLength(0);
  });

  it("各项 done 判定与业务数据一一对应（含 students10/event3 阈值）", async () => {
    mockPrisma.stationOffline.findUnique.mockResolvedValue({
      name: "明德馆",
      intro: "国学线下空间",
      images: ["a.jpg"],
      createdAt: new Date(Date.now() - 40 * 86_400_000),
    });
    primeCounts({
      teachers: 2,
      publishedCourses: 3,
      products: 1,
      registrations: 6,
      heldEvents: 2, // 首场活动✓ 但 3 场未达
      circleCourses: 1,
      reviews: 1,
      students: 9, // 10 位未达
    });

    const res = await svc.getOnboarding("st1");
    const done = Object.fromEntries(res.stages.flatMap((s) => s.items).map((i) => [i.key, i.done]));

    expect(done).toEqual({
      profile: true,
      teacher: true,
      course: true,
      product: true,
      registration: true,
      event: true,
      circle: true,
      review: true,
      share: null,
      students10: false,
      event3: false,
    });
    expect(res.progress).toEqual({ done: 8, total: 10 });
    expect(res.openDays).toBe(40);
  });

  it("资料完善判定：简介为空白字符串或无图集均算未完成", async () => {
    mockPrisma.stationOffline.findUnique.mockResolvedValue({
      name: "馆",
      intro: "   ",
      images: ["a.jpg"],
      createdAt: new Date(),
    });
    primeCounts({});
    const res = await svc.getOnboarding("st1");
    expect(res.stages[0].items.find((i) => i.key === "profile")?.done).toBe(false);
  });

  it("统计口径：报名只算 REGISTERED/SIGNED_IN，活动只算 PUBLISHED/FINISHED，学员按 userId 去重", async () => {
    mockPrisma.stationOffline.findUnique.mockResolvedValue({
      name: "馆",
      intro: "x",
      images: ["a"],
      createdAt: new Date(),
    });
    primeCounts({ students: 10, heldEvents: 3 });

    const res = await svc.getOnboarding("st1");

    expect(mockPrisma.offlineCourseRegistration.count).toHaveBeenCalledWith({
      where: { course: { stationId: "st1" }, status: { in: ["REGISTERED", "SIGNED_IN"] } },
    });
    expect(mockPrisma.stationEvent.count).toHaveBeenCalledWith({
      where: { stationId: "st1", status: { in: ["PUBLISHED", "FINISHED"] } },
    });
    expect(mockPrisma.offlineCourseRegistration.groupBy).toHaveBeenCalledWith({
      by: ["userId"],
      where: { course: { stationId: "st1" }, status: { in: ["REGISTERED", "SIGNED_IN"] } },
    });
    const done = Object.fromEntries(res.stages.flatMap((s) => s.items).map((i) => [i.key, i.done]));
    expect(done.students10).toBe(true);
    expect(done.event3).toBe(true);
  });
});
