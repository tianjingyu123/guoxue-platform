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
    findFirst: jest.fn(),
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
  stationProduct: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  stationTeacherBooking: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  stationTeacher: {
    findMany: jest.fn(),
  },
  // 佣-V2-P3 驿站开通赠"高级线下运营商"
  operator: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  teacherCertification: {
    findMany: jest.fn(),
  },
  stationOrder: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  stationSettlement: {
    findMany: jest.fn(),
    count: jest.fn(),
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
      expect(mockPrisma.operator.findUnique).not.toHaveBeenCalled(); // 非 ACTIVE 不触发赠送
    });
  });

  // ═══════════ 佣-V2-P3 驿站开通赠"高级线下运营商"（拍板规则3·幂等） ═══════════

  describe("auditStation → grantOfflineOperator（佣-V2-P3）", () => {
    it("首次激活：创建 OFFLINE 运营商（level=BLACK_GOLD·status=ACTIVE·mgmtRate 留空=渠道默认20%）并回链 operatorId", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", ownerUserId: "owner1", operatorId: null });
      mockPrisma.stationOffline.update
        .mockResolvedValueOnce({ id: "s1", status: "ACTIVE", ownerUserId: "owner1", operatorId: null }) // 审核置 ACTIVE
        .mockResolvedValueOnce({ id: "s1", operatorId: "op-new" }); // 回链
      mockPrisma.operator.findUnique.mockResolvedValue(null); // 驿站主尚无运营商身份
      mockPrisma.operator.create.mockResolvedValue({ id: "op-new", channelType: "OFFLINE" });

      const result: any = await svc.auditStation("s1", "ACTIVE");

      const createData = mockPrisma.operator.create.mock.calls[0][0].data;
      expect(createData).toEqual(
        expect.objectContaining({ userId: "owner1", level: "BLACK_GOLD", channelType: "OFFLINE", status: "ACTIVE" }),
      );
      expect(createData.mgmtRate).toBeUndefined(); // 留空 → 按 OFFLINE 渠道默认 20%
      // 回链 StationOffline.operatorId
      expect(mockPrisma.stationOffline.update.mock.calls[1][0]).toEqual(
        expect.objectContaining({ where: { id: "s1" }, data: { operatorId: "op-new" } }),
      );
      expect(result.operatorGrant).toEqual(expect.objectContaining({ granted: true, operatorId: "op-new" }));
    });

    it("重复激活（operatorId 已回链）：幂等跳过，不查不建运营商", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "ACTIVE", ownerUserId: "owner1", operatorId: "op-1" });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "ACTIVE", ownerUserId: "owner1", operatorId: "op-1" });

      const result: any = await svc.auditStation("s1", "ACTIVE");

      expect(mockPrisma.operator.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.operator.create).not.toHaveBeenCalled();
      expect(mockPrisma.stationOffline.update).toHaveBeenCalledTimes(1); // 仅审核更新，无回链写入
      expect(result.operatorGrant.granted).toBe(false);
      expect(result.operatorGrant.operatorId).toBe("op-1");
    });

    it("驿站主已是 ONLINE 运营商：不重复建、不动其线上身份、不回链，返回值注明冲突", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", ownerUserId: "owner1", operatorId: null });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "ACTIVE", ownerUserId: "owner1", operatorId: null });
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-online", channelType: "ONLINE" });

      const result: any = await svc.auditStation("s1", "ACTIVE");

      expect(mockPrisma.operator.create).not.toHaveBeenCalled();
      expect(mockPrisma.stationOffline.update).toHaveBeenCalledTimes(1); // 不回链
      expect(result.operatorGrant.granted).toBe(false);
      expect(result.operatorGrant.reason).toContain("线上运营商");
    });

    it("驿站主已是 OFFLINE 运营商（无回链）：不重复建，仅补回链", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", ownerUserId: "owner1", operatorId: null });
      mockPrisma.stationOffline.update
        .mockResolvedValueOnce({ id: "s1", status: "ACTIVE", ownerUserId: "owner1", operatorId: null })
        .mockResolvedValueOnce({ id: "s1", operatorId: "op-off" });
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op-off", channelType: "OFFLINE" });

      const result: any = await svc.auditStation("s1", "ACTIVE");

      expect(mockPrisma.operator.create).not.toHaveBeenCalled();
      expect(mockPrisma.stationOffline.update.mock.calls[1][0].data).toEqual({ operatorId: "op-off" });
      expect(result.operatorGrant).toEqual(expect.objectContaining({ granted: false, operatorId: "op-off" }));
    });

    it("赠送流程异常：不阻塞驿站审核，operatorGrant 注明失败", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", ownerUserId: "owner1", operatorId: null });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "ACTIVE", ownerUserId: "owner1", operatorId: null });
      mockPrisma.operator.findUnique.mockRejectedValue(new Error("db down"));

      const result: any = await svc.auditStation("s1", "ACTIVE");

      expect(result.status).toBe("ACTIVE");
      expect(result.operatorGrant.granted).toBe(false);
      expect(result.operatorGrant.reason).toContain("失败");
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

  // ───────── T11 P0：驿站经营后台读端点越权修复（归属校验） ─────────
  describe("经营后台读端点归属校验（T11 越权修复）", () => {
    const OWNER = "owner1";
    const ATTACKER = "attacker";
    const asOwnedBy = (uid: string) => mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: uid });

    describe("signInCourse", () => {
      it("驿站主可扫码签到", async () => {
        asOwnedBy(OWNER);
        mockPrisma.offlineCourseRegistration.findFirst.mockResolvedValue({ id: "reg1", status: "REGISTERED", course: {} });
        mockPrisma.offlineCourseRegistration.update.mockResolvedValue({ id: "reg1", status: "SIGNED_IN" });
        const result = await svc.signInCourse(OWNER, "s1", "QR_x");
        expect(result.status).toBe("SIGNED_IN");
      });
      it("非驿站主签到抛 FORBIDDEN 且不查签到码", async () => {
        asOwnedBy(OWNER);
        await expect(svc.signInCourse(ATTACKER, "s1", "QR_x")).rejects.toThrow(BusinessException);
        expect(mockPrisma.offlineCourseRegistration.findFirst).not.toHaveBeenCalled();
      });
    });

    describe("listRegistrations", () => {
      it("驿站主查报名列表：脱敏且不含 qrCode", async () => {
        mockPrisma.offlineCourse.findUnique.mockResolvedValue({ stationId: "s1" });
        asOwnedBy(OWNER);
        mockPrisma.offlineCourseRegistration.findMany.mockResolvedValue([
          { id: "reg1", userId: "u9", status: "SIGNED_IN", signedAt: new Date(), createdAt: new Date() },
        ]);
        mockPrisma.offlineCourseRegistration.count.mockResolvedValue(1);
        mockPrisma.user.findMany.mockResolvedValue([{ id: "u9", nickname: "学员甲", avatar: "a.png" }]);
        const result = await svc.listRegistrations(OWNER, "oc1");
        // select 收敛：断言未请求 qrCode
        const selectArg = mockPrisma.offlineCourseRegistration.findMany.mock.calls[0][0].select;
        expect(selectArg.qrCode).toBeUndefined();
        expect(result.registrations[0]).not.toHaveProperty("qrCode");
        expect(result.registrations[0].user).toEqual({ nickname: "学员甲", avatar: "a.png" });
      });
      it("课程不存在抛 NOT_FOUND", async () => {
        mockPrisma.offlineCourse.findUnique.mockResolvedValue(null);
        await expect(svc.listRegistrations(OWNER, "bad")).rejects.toThrow(BusinessException);
      });
      it("非驿站主抛 FORBIDDEN 且不查报名", async () => {
        mockPrisma.offlineCourse.findUnique.mockResolvedValue({ stationId: "s1" });
        asOwnedBy(OWNER);
        await expect(svc.listRegistrations(ATTACKER, "oc1")).rejects.toThrow(BusinessException);
        expect(mockPrisma.offlineCourseRegistration.findMany).not.toHaveBeenCalled();
      });
    });

    describe("listProducts", () => {
      it("驿站主查商品列表", async () => {
        asOwnedBy(OWNER);
        mockPrisma.stationProduct.findMany.mockResolvedValue([{ id: "p1" }]);
        mockPrisma.stationProduct.count.mockResolvedValue(1);
        const result = await svc.listProducts(OWNER, "s1");
        expect(result.total).toBe(1);
      });
      it("非驿站主抛 FORBIDDEN 且不查商品", async () => {
        asOwnedBy(OWNER);
        await expect(svc.listProducts(ATTACKER, "s1")).rejects.toThrow(BusinessException);
        expect(mockPrisma.stationProduct.findMany).not.toHaveBeenCalled();
      });
    });

    describe("listTeacherBookings", () => {
      it("驿站主查预约列表", async () => {
        asOwnedBy(OWNER);
        mockPrisma.stationTeacherBooking.findMany.mockResolvedValue([{ id: "b1" }]);
        mockPrisma.stationTeacherBooking.count.mockResolvedValue(1);
        const result = await svc.listTeacherBookings(OWNER, "s1");
        expect(result.total).toBe(1);
      });
      it("非驿站主抛 FORBIDDEN 且不查预约", async () => {
        asOwnedBy(OWNER);
        await expect(svc.listTeacherBookings(ATTACKER, "s1")).rejects.toThrow(BusinessException);
        expect(mockPrisma.stationTeacherBooking.findMany).not.toHaveBeenCalled();
      });
    });

    describe("listOrders", () => {
      it("驿站主查订单列表", async () => {
        asOwnedBy(OWNER);
        mockPrisma.stationOrder.findMany.mockResolvedValue([{ id: "o1" }]);
        mockPrisma.stationOrder.count.mockResolvedValue(1);
        const result = await svc.listOrders(OWNER, "s1");
        expect(result.total).toBe(1);
      });
      it("非驿站主抛 FORBIDDEN 且不查订单", async () => {
        asOwnedBy(OWNER);
        await expect(svc.listOrders(ATTACKER, "s1")).rejects.toThrow(BusinessException);
        expect(mockPrisma.stationOrder.findMany).not.toHaveBeenCalled();
      });
    });

    describe("listSettlements", () => {
      it("驿站主查结算记录", async () => {
        asOwnedBy(OWNER);
        mockPrisma.stationSettlement.findMany.mockResolvedValue([{ id: "st1" }]);
        mockPrisma.stationSettlement.count.mockResolvedValue(1);
        const result = await svc.listSettlements(OWNER, "s1");
        expect(result.total).toBe(1);
      });
      it("非驿站主抛 FORBIDDEN 且不查结算", async () => {
        asOwnedBy(OWNER);
        await expect(svc.listSettlements(ATTACKER, "s1")).rejects.toThrow(BusinessException);
        expect(mockPrisma.stationSettlement.findMany).not.toHaveBeenCalled();
      });
    });
  });

  // ───────── 品牌主页（驿-P1） ─────────

  describe("getStationHome（品牌主页公开聚合）", () => {
    const baseStation = {
      id: "s1", name: "北京驿站", city: "北京", address: "东城区", phone: "010-1234",
      cover: null, type: "center", intro: "简介", businessHours: null,
      images: [], tags: [], facilities: [], status: "ACTIVE",
      brandStory: "十年国学耕耘", photos: ["p1.jpg"], featuredTeacherIds: ["t2", "t1"],
      owner: { id: "u1", nickname: "站长", avatar: null },
    };

    it("聚合基础+讲师阵容(按挑选顺序·签约讲师带认证徽章)+课程+评价", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue(baseStation);
      mockPrisma.stationTeacher.findMany.mockResolvedValue([
        { id: "t1", name: "自建讲师", avatar: null, specialties: [], bio: null, sourceUserId: null },
        { id: "t2", name: "签约讲师", avatar: null, specialties: ["易经"], bio: null, sourceUserId: "tu1" },
      ]);
      mockPrisma.teacherCertification.findMany.mockResolvedValue([{ userId: "tu1", verifiedTitle: "国学讲师" }]);
      mockPrisma.instituteMember.findMany.mockResolvedValue([{ userId: "tu1", lecturerLevel: "SIGNED" }]);
      mockPrisma.offlineCourse.findMany.mockResolvedValue([]);
      mockPrisma.offlineCourseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.66 }, _count: 3 });
      mockPrisma.offlineCourseReview.findMany.mockResolvedValue([
        { id: "r1", rating: 5, content: "很好", createdAt: new Date(), userId: "u9", course: { title: "论语课" } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u9", nickname: "学员甲", avatar: null }]);

      const result = await svc.getStationHome("s1");
      expect(result.station.brandStory).toBe("十年国学耕耘");
      // 按 featuredTeacherIds 顺序：t2 在前
      expect(result.featuredTeachers.map((t: { id: string }) => t.id)).toEqual(["t2", "t1"]);
      const signed = result.featuredTeachers[0] as { verifiedTitle: string | null; institute?: { signed: boolean } };
      expect(signed.verifiedTitle).toBe("国学讲师");
      expect(signed.institute?.signed).toBe(true);
      expect(result.rating).toEqual({ avg: 4.7, count: 3 });
      expect(result.reviews[0].user.nickname).toBe("学员甲");
      expect(result.reviews[0].courseTitle).toBe("论语课");
    });

    it("无评价时省略 rating 字段（诚实降级）", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ...baseStation, featuredTeacherIds: [] });
      mockPrisma.stationTeacher.findMany.mockResolvedValue([]);
      mockPrisma.offlineCourse.findMany.mockResolvedValue([]);
      mockPrisma.offlineCourseReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
      mockPrisma.offlineCourseReview.findMany.mockResolvedValue([]);
      const result = await svc.getStationHome("s1");
      expect("rating" in result).toBe(false);
      expect(result.reviews).toEqual([]);
    });

    it("DISABLED 驿站不公开（404）", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ...baseStation, status: "DISABLED" });
      await expect(svc.getStationHome("s1")).rejects.toThrow(BusinessException);
    });
  });

  describe("updateStationBrand（驿站长更新品牌资料）", () => {
    it("非驿站运营者抛 NOT_FOUND", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue(null);
      await expect(svc.updateStationBrand("nobody", { brandStory: "x" })).rejects.toThrow(BusinessException);
      expect(mockPrisma.stationOffline.update).not.toHaveBeenCalled();
    });

    it("featuredTeacherIds 只收本驿站在岗讲师（防挂他站讲师·保持提交顺序）", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1" });
      mockPrisma.stationTeacher.findMany.mockResolvedValue([{ id: "t1" }, { id: "t3" }]);
      mockPrisma.stationOffline.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "s1", ...data }));
      const result = await svc.updateStationBrand("owner1", { featuredTeacherIds: ["t3", "t2-other-station", "t1"] });
      expect(result.featuredTeacherIds).toEqual(["t3", "t1"]);
    });

    it("brandStory 空白串归一为 null", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1" });
      mockPrisma.stationOffline.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "s1", ...data }));
      const result = await svc.updateStationBrand("owner1", { brandStory: "   " });
      expect(result.brandStory).toBeNull();
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("listStations: 非法 page(NaN 字符串) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations("abc" as any, "xyz" as any);
      const arg = mockPrisma.stationOffline.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
      expect(arg.take).toBe(20);
    });
  });
});
