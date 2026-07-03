import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { OfflineService } from "./offline.service";
import { OfflineReminderService } from "./offline-reminder.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  stationOffline: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  offlineCourse: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  offlineCourseRegistration: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  offlineCourseReview: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  circle: {
    create: jest.fn(),
  },
  userRole: {
    upsert: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  instituteMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
};

const mockRedis = {
  delByPattern: jest.fn(),
  setNX: jest.fn(),
};

const mockReminder = {
  notifyRegistered: jest.fn(),
  notifyCancelled: jest.fn(),
};

/** 构造 Prisma P2002 唯一约束冲突错误（用于二评拒测试） */
function uniqueError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.19.3",
  });
}

describe("OfflineService", () => {
  let svc: OfflineService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OfflineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: OfflineReminderService, useValue: mockReminder },
      ],
    }).compile();
    svc = mod.get(OfflineService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // getStation 评分聚合默认无评价（count=0 → 无 rating 字段）
    mockPrisma.offlineCourseReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
    // $transaction 默认把 mockPrisma 自身当 tx 传给回调
    mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma));
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockReminder.notifyRegistered.mockResolvedValue(undefined);
    mockReminder.notifyCancelled.mockResolvedValue(undefined);
  });

  describe("createStation", () => {
    it("创建线下驿站成功", async () => {
      mockPrisma.stationOffline.create.mockResolvedValue({
        id: "s1", name: "北京国学驿站", city: "北京", address: "东城区",
        phone: "13800138000",
      });
      const result = await svc.createStation({
        name: "北京国学驿站", city: "北京", address: "东城区", phone: "13800138000",
      }, "u1");
      expect(result.id).toBe("s1");
    });

    it("创建驿站带可选字段", async () => {
      mockPrisma.stationOffline.create.mockResolvedValue({
        id: "s1", name: "驿站", cover: "cover.jpg", depositAmount: 100,
      });
      const result = await svc.createStation({
        name: "驿站", city: "上海", address: "静安区", phone: "13900139000",
        cover: "cover.jpg", depositAmount: 100,
      }, "u1");
      expect(result.depositAmount).toBe(100);
    });

    it("未指定 depositAmount 时默认 0", async () => {
      mockPrisma.stationOffline.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "s1", ...data }),
      );
      const result = await svc.createStation({
        name: "驿站", city: "广州", address: "天河区", phone: "13700137000",
      }, "u1");
      expect(result.depositAmount).toBe(0);
    });
  });

  describe("listStations", () => {
    it("列出所有驿站", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      const result = await svc.listStations();
      expect(result).toHaveProperty("stations");
      expect(result.total).toBe(0);
    });

    it("按城市过滤", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations(1, 20, "北京");
      expect(mockPrisma.stationOffline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { city: "北京" } }),
      );
    });

    it("按状态过滤", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations(1, 20, undefined, "APPROVED");
      expect(mockPrisma.stationOffline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "APPROVED" } }),
      );
    });

    it("支持分页", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations(2, 10);
      expect(mockPrisma.stationOffline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("getStation", () => {
    it("获取驿站详情成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({
        id: "s1", name: "驿站", owner: {}, courses: [], products: [],
      });
      const result = await svc.getStation("s1");
      expect(result.id).toBe("s1");
    });

    it("驿站不存在抛出 NotFoundException", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue(null);
      await expect(svc.getStation("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("auditStation", () => {
    it("审核驿站成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING" });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "APPROVED" });
      const result = await svc.auditStation("s1", "APPROVED");
      expect(result.status).toBe("APPROVED");
    });

    it("驳回驿站成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING" });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "REJECTED" });
      const result = await svc.auditStation("s1", "REJECTED");
      expect(result.status).toBe("REJECTED");
    });
  });

  describe("createOfflineCourse", () => {
    it("创建线下课程成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "u1" });
      mockPrisma.offlineCourse.create.mockResolvedValue({ id: "oc1", title: "易经面授课" });
      const result = await svc.createOfflineCourse("u1", {
        stationId: "s1", title: "易经面授课", maxStudents: 30,
        startTime: "2026-06-01T09:00:00Z", endTime: "2026-06-01T17:00:00Z", location: "北京国学馆",
      });
      expect(result.id).toBe("oc1");
    });

    it("未指定 price 时默认 0", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "u1" });
      mockPrisma.offlineCourse.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "oc1", ...data }),
      );
      const result = await svc.createOfflineCourse("u1", {
        stationId: "s1", title: "课程", maxStudents: 20,
        startTime: "2026-06-01T09:00:00Z", endTime: "2026-06-01T17:00:00Z", location: "地点",
      });
      expect(result.price).toBe(0);
    });

    it("非驿站拥有者创建课程抛出 FORBIDDEN", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "owner" });
      await expect(svc.createOfflineCourse("attacker", {
        stationId: "s1", title: "课程", maxStudents: 20,
        startTime: "2026-06-01T09:00:00Z", endTime: "2026-06-01T17:00:00Z", location: "地点",
      })).rejects.toThrow(BusinessException);
      expect(mockPrisma.offlineCourse.create).not.toHaveBeenCalled();
    });
  });

  describe("listOfflineCourses", () => {
    it("列出驿站线下课程", async () => {
      mockPrisma.offlineCourse.findMany.mockResolvedValue([{ id: "oc1", title: "面授课" }]);
      mockPrisma.offlineCourse.count.mockResolvedValue(1);
      const result = await svc.listOfflineCourses("s1");
      expect(result.courses).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("无课程时返回空数组", async () => {
      mockPrisma.offlineCourse.findMany.mockResolvedValue([]);
      mockPrisma.offlineCourse.count.mockResolvedValue(0);
      const result = await svc.listOfflineCourses("s1");
      expect(result.courses).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("listMembers", () => {
    it("列出研究院成员", async () => {
      mockPrisma.instituteMember.findMany.mockResolvedValue([{ id: "m1", user: { nickname: "张三" } }]);
      mockPrisma.instituteMember.count.mockResolvedValue(1);
      const result = await svc.listMembers();
      expect(result.members).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("支持分页", async () => {
      mockPrisma.instituteMember.findMany.mockResolvedValue([]);
      mockPrisma.instituteMember.count.mockResolvedValue(0);
      await svc.listMembers(2, 10);
      expect(mockPrisma.instituteMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("updateMember", () => {
    it("更新成员信息成功", async () => {
      mockPrisma.instituteMember.findUnique.mockResolvedValue({ id: "m1", role: "STUDENT", status: "ACTIVE" });
      mockPrisma.instituteMember.update.mockResolvedValue({ id: "m1", role: "SCHOLAR", status: "ACTIVE" });
      const result = await svc.updateMember("m1", { role: "SCHOLAR", status: "ACTIVE" });
      expect(result.role).toBe("SCHOLAR");
    });
  });

  // ───────── 课后评价（T8 OMO） ─────────

  describe("createCourseReview", () => {
    it("已签到学员评价成功（写入 stationId 冗余）", async () => {
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue({
        id: "reg1", status: "SIGNED_IN", course: { stationId: "s1" },
      });
      mockPrisma.offlineCourseReview.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "rv1", ...data }),
      );
      const result = await svc.createCourseReview("u1", "oc1", { rating: 5, content: "老师讲得很好" });
      expect(result.id).toBe("rv1");
      expect(mockPrisma.offlineCourseReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: "oc1", stationId: "s1", userId: "u1", registrationId: "reg1", rating: 5,
          }),
        }),
      );
    });

    it("未签到（REGISTERED）不能评价", async () => {
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue({
        id: "reg1", status: "REGISTERED", course: { stationId: "s1" },
      });
      await expect(svc.createCourseReview("u1", "oc1", { rating: 4 }))
        .rejects.toThrow("签到上课后才能评价");
      expect(mockPrisma.offlineCourseReview.create).not.toHaveBeenCalled();
    });

    it("未报名不能评价", async () => {
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue(null);
      await expect(svc.createCourseReview("u1", "oc1", { rating: 4 }))
        .rejects.toThrow(BusinessException);
    });

    it("二评拒：撞 registrationId 唯一约束转「已评价过本课程」", async () => {
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue({
        id: "reg1", status: "SIGNED_IN", course: { stationId: "s1" },
      });
      mockPrisma.offlineCourseReview.create.mockRejectedValue(uniqueError());
      await expect(svc.createCourseReview("u1", "oc1", { rating: 3 }))
        .rejects.toThrow("已评价过本课程");
    });
  });

  describe("listCourseReviews", () => {
    it("公开分页返回评价（脱敏：仅昵称+头像）", async () => {
      mockPrisma.offlineCourseReview.findMany.mockResolvedValue([
        { id: "rv1", userId: "u1", rating: 5, content: "赞", createdAt: new Date() },
      ]);
      mockPrisma.offlineCourseReview.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "张三", avatar: "a.png", phone: "13800138000" },
      ]);
      const result = await svc.listCourseReviews("oc1", 1, 20);
      expect(result.total).toBe(1);
      expect(result.items[0].user).toEqual({ nickname: "张三", avatar: "a.png" });
      expect(result.items[0]).not.toHaveProperty("userId");
    });
  });

  describe("getStation 评分聚合", () => {
    const stationRow = { id: "s1", name: "驿站", owner: {}, courses: [], products: [], teacherBookings: [] };

    it("有评价时返回 rating: { avg 1位小数, count }", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue(stationRow);
      mockPrisma.offlineCourseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.6666 }, _count: 3 });
      const result = await svc.getStation("s1") as Record<string, unknown>;
      expect(result.rating).toEqual({ avg: 4.7, count: 3 });
      expect(mockPrisma.offlineCourseReview.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stationId: "s1" } }),
      );
    });

    it("count=0 时不加 rating 字段（前端诚实降级）", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue(stationRow);
      mockPrisma.offlineCourseReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
      const result = await svc.getStation("s1");
      expect(result).not.toHaveProperty("rating");
    });
  });

  // ───────── 课后同学圈（T8 OMO） ─────────

  describe("createStudyCircle", () => {
    const courseRow = {
      id: "oc1", title: "易经面授课", circleId: null,
      station: { id: "s1", ownerUserId: "owner1" },
    };

    it("幂等：课程已有 circleId 直接返回", async () => {
      mockPrisma.offlineCourse.findUnique.mockResolvedValue({ ...courseRow, circleId: "c-exist" });
      const result = await svc.createStudyCircle("owner1", "oc1");
      expect(result).toEqual({ circleId: "c-exist" });
      expect(mockPrisma.circle.create).not.toHaveBeenCalled();
    });

    it("非驿站主建圈越权 FORBIDDEN(403)", async () => {
      mockPrisma.offlineCourse.findUnique.mockResolvedValue(courseRow);
      await expect(svc.createStudyCircle("attacker", "oc1")).rejects.toThrow("无权操作该驿站课程");
      expect(mockPrisma.circle.create).not.toHaveBeenCalled();
    });

    it("课程不存在 NOT_FOUND", async () => {
      mockPrisma.offlineCourse.findUnique.mockResolvedValue(null);
      await expect(svc.createStudyCircle("owner1", "oc1")).rejects.toThrow("课程不存在");
    });

    it("建圈成功：FREE 圈 ACTIVE + 圈主 OWNER 成员 + 回写 circleId + 清列表缓存", async () => {
      mockPrisma.offlineCourse.findUnique
        .mockResolvedValueOnce(courseRow) // 事务外初查
        .mockResolvedValueOnce({ circleId: null }); // 事务内行锁后复查
      mockPrisma.circle.create.mockResolvedValue({ id: "c-new" });
      mockPrisma.userRole.upsert.mockResolvedValue({});
      mockPrisma.offlineCourse.update.mockResolvedValue({});

      const result = await svc.createStudyCircle("owner1", "oc1");
      expect(result).toEqual({ circleId: "c-new" });
      expect(mockPrisma.circle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "《易经面授课》同学圈",
            type: "FREE",
            needApproval: false,
            status: "ACTIVE",
            ownerId: "owner1",
            memberCount: 1,
            members: { create: { userId: "owner1", role: "OWNER" } },
          }),
        }),
      );
      expect(mockPrisma.offlineCourse.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "oc1" }, data: { circleId: "c-new" } }),
      );
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("circles:list:*");
    });

    it("超长课程标题截断保全名 ≤30 字", async () => {
      const longTitle = "国学经典研修营之周易六十四卦逐卦精讲与人生实践应用高阶班"; // 28 字 > 25
      mockPrisma.offlineCourse.findUnique
        .mockResolvedValueOnce({ ...courseRow, title: longTitle })
        .mockResolvedValueOnce({ circleId: null });
      mockPrisma.circle.create.mockResolvedValue({ id: "c-new" });
      mockPrisma.userRole.upsert.mockResolvedValue({});
      mockPrisma.offlineCourse.update.mockResolvedValue({});

      await svc.createStudyCircle("owner1", "oc1");
      const name = mockPrisma.circle.create.mock.calls[0][0].data.name as string;
      expect(name.length).toBeLessThanOrEqual(30);
      expect(name.endsWith("…》同学圈")).toBe(true);
    });
  });

  // ───────── 报名/取消 通知触点（T8 OMO） ─────────

  describe("registerCourse 通知触点", () => {
    const course = {
      id: "oc1", title: "面授课", maxStudents: 30,
      startTime: new Date("2026-07-10T09:00:00"), location: "北京国学馆",
    };

    it("报名成功后发送站内通知", async () => {
      mockPrisma.offlineCourse.findUnique.mockResolvedValue(course);
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.offlineCourseRegistration.count.mockResolvedValue(0);
      mockPrisma.offlineCourseRegistration.create.mockResolvedValue({ id: "reg1" });

      const result = await svc.registerCourse("u1", "oc1");
      expect(result.id).toBe("reg1");
      expect(mockReminder.notifyRegistered).toHaveBeenCalledWith("u1",
        expect.objectContaining({ id: "oc1", title: "面授课" }),
      );
    });

    it("通知失败不影响报名主流程", async () => {
      mockPrisma.offlineCourse.findUnique.mockResolvedValue(course);
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.offlineCourseRegistration.count.mockResolvedValue(0);
      mockPrisma.offlineCourseRegistration.create.mockResolvedValue({ id: "reg1" });
      mockReminder.notifyRegistered.mockRejectedValue(new Error("通知服务不可用"));

      const result = await svc.registerCourse("u1", "oc1");
      expect(result.id).toBe("reg1"); // 报名照常成功
    });

    it("取消报名成功后发送取消确认通知", async () => {
      mockPrisma.offlineCourseRegistration.findUnique.mockResolvedValue({
        id: "reg1", status: "REGISTERED",
        course: { id: "oc1", title: "面授课", startTime: new Date(), location: "馆" },
      });
      mockPrisma.offlineCourseRegistration.update.mockResolvedValue({ id: "reg1", status: "CANCELLED" });
      const result = await svc.cancelRegistration("u1", "oc1");
      expect(result.status).toBe("CANCELLED");
      expect(mockReminder.notifyCancelled).toHaveBeenCalledWith("u1",
        expect.objectContaining({ id: "oc1" }),
      );
    });
  });
});
