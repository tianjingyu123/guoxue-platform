import { Test, TestingModule } from "@nestjs/testing";
import { InstituteService } from "./institute.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

describe("InstituteService", () => {
  let svc: InstituteService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      institute: {
        findFirst: jest.fn().mockResolvedValue({ id: "i1", name: "国学研究院" }),
      },
      instituteMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      instituteTask: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      instituteEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      stationTeacher: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstituteService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    svc = module.get<InstituteService>(InstituteService);
  });

  describe("join", () => {
    it("已是成员时报错", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue({ id: "m1" });
      await expect(svc.join("u1", { role: "TYPE_A", joinYear: 2026 })).rejects.toThrow(BusinessException);
    });

    it("成功加入研究院", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({
        id: "m1", userId: "u1", role: "TYPE_A", joinYear: 2026, deposit: 10000,
        user: { id: "u1", nickname: "Alice", avatar: null },
      });
      const result = await svc.join("u1", { role: "TYPE_A", joinYear: 2026 });
      expect(result.id).toBe("m1");
      expect(prisma.instituteMember.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", tasksRequired: 3 }),
      }));
    });

    it("不能自助申请管理层角色（越权防护）", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue(null);
      await expect(svc.join("u1", { role: "PRESIDENT", joinYear: 2026 })).rejects.toThrow(BusinessException);
      expect(prisma.instituteMember.create).not.toHaveBeenCalled();
    });
  });

  describe("approveMember（自审自批防护）", () => {
    it("不能审批自己的成员申请", async () => {
      prisma.instituteMember.findUnique
        .mockResolvedValueOnce({ id: "mgr", instituteId: "i1", role: "PRESIDENT", status: "ACTIVE" })
        .mockResolvedValueOnce({ id: "m1", userId: "u1", status: "PENDING" });
      await expect(svc.approveMember("u1", "m1", "ACTIVE")).rejects.toThrow(BusinessException);
      expect(prisma.instituteMember.update).not.toHaveBeenCalled();
    });
  });

  describe("getMember", () => {
    it("成员不存在时报错", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue(null);
      await expect(svc.getMember("m1")).rejects.toThrow(BusinessException);
    });

    it("返回成员详情含任务列表", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue({
        id: "m1", user: { id: "u1", nickname: "Alice" }, tasks: [],
      });
      const result = await svc.getMember("m1");
      expect(result.id).toBe("m1");
      expect(result.tasks).toEqual([]);
    });
  });

  describe("listMembers", () => {
    it("分页过滤返回成员列表", async () => {
      prisma.instituteMember.findMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
      prisma.instituteMember.count.mockResolvedValue(2);
      const result = await svc.listMembers({ role: "TYPE_A", page: 1, pageSize: 10 });
      expect(result.members.length).toBe(2);
      expect(result.total).toBe(2);
    });
  });

  describe("addTask", () => {
    it("创建新任务", async () => {
      prisma.instituteTask.create.mockResolvedValue({ id: "t1", title: "授课", status: "PENDING" });
      const result = await svc.addTask("m1", { taskType: "TEACHING", title: "授课", description: "讲授国学课程" });
      expect(result.status).toBe("PENDING");
      expect(prisma.instituteTask.create).toHaveBeenCalled();
    });
  });

  describe("completeTask", () => {
    it("不能完成他人的任务", async () => {
      prisma.instituteTask.findUnique.mockResolvedValue({
        id: "t1", memberId: "m1", member: { userId: "u2" },
        status: "PENDING",
      });
      await expect(svc.completeTask("t1", "u1")).rejects.toThrow("只能完成自己的任务");
    });

    it("完成任务并更新计数", async () => {
      prisma.instituteTask.findUnique.mockResolvedValue({
        id: "t1", memberId: "m1", status: "PENDING",
        member: { userId: "u1" },
      });
      prisma.instituteTask.update.mockResolvedValue({ id: "t1", status: "COMPLETED" });
      const result = await svc.completeTask("t1", "u1");
      expect(result.status).toBe("COMPLETED");
      expect(prisma.instituteMember.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "m1" },
        data: { tasksCompleted: { increment: 1 } },
      }));
    });
  });

  describe("verifyTask", () => {
    it("验证已完成任务", async () => {
      prisma.instituteTask.findUnique.mockResolvedValue({
        id: "t1", memberId: "m1", status: "COMPLETED",
        member: { userId: "u1" },
      });
      prisma.instituteTask.update.mockResolvedValue({ id: "t1", status: "VERIFIED", verifiedBy: "v1" });
      const result = await svc.verifyTask("t1", "v1");
      expect(result.status).toBe("VERIFIED");
    });

    it("未完成任务无法验证", async () => {
      prisma.instituteTask.findUnique.mockResolvedValue({
        id: "t1", memberId: "m1", status: "PENDING",
        member: { userId: "u1" },
      });
      await expect(svc.verifyTask("t1", "v1")).rejects.toThrow("任务尚未完成");
    });
  });

  describe("createEvent / listEvents", () => {
    it("创建活动", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue({ id: "m1", instituteId: "i1", role: "PRESIDENT", status: "ACTIVE" });
      prisma.instituteEvent.create.mockResolvedValue({ id: "e1", title: "讲座" });
      const result = await svc.createEvent("u1", { title: "讲座", type: "LECTURE", scheduleAt: new Date().toISOString() });
      expect(result.id).toBe("e1");
    });

    it("查询进行中的活动", async () => {
      prisma.instituteEvent.findMany.mockResolvedValue([{ id: "e1" }]);
      prisma.instituteEvent.count.mockResolvedValue(1);
      const result = await svc.listEvents({ upcoming: true });
      expect(result.events.length).toBe(1);
    });
  });

  describe("getSigningCandidates", () => {
    it("返回符合条件的候选讲师", async () => {
      prisma.instituteMember.findMany.mockResolvedValue([
        { id: "m1", user: { id: "u1", nickname: "Alice" } },
      ]);
      const result = await svc.getSigningCandidates();
      expect(result.length).toBe(1);
    });
  });

  describe("getRankings（讲师影响力榜单·T9-P0a）", () => {
    const YEAR = 2026;

    /** 两名在册讲师：A 满维度（任务4/授课3/驿站2/资历≥5年），B 半程（任务2/授课0/驿站1/当年新入） */
    function primeTwoMembers() {
      prisma.instituteMember.findMany.mockResolvedValue([
        { userId: "uA", lecturerLevel: "SIGNED", tasksCompleted: 4, joinYear: YEAR - 9, user: { id: "uA", nickname: "甲师", avatar: "a.jpg" } },
        { userId: "uB", lecturerLevel: "JUNIOR", tasksCompleted: 2, joinYear: YEAR, user: { id: "uB", nickname: "乙师", avatar: null } },
      ]);
      prisma.instituteEvent.groupBy.mockResolvedValue([
        { lecturerId: "uA", _count: { _all: 3 } },
      ]);
      prisma.stationTeacher.groupBy.mockResolvedValue([
        { sourceUserId: "uA", _count: { _all: 2 } },
        { sourceUserId: "uB", _count: { _all: 1 } },
      ]);
    }

    it("聚合计分：归一化 + 40/30/20/10 加权，按总分排名", async () => {
      primeTwoMembers();
      const res = await svc.getRankings(YEAR);
      expect(res.items).toHaveLength(2);

      const [first, second] = res.items;
      // A 每个维度都是全员最大值 → 四维全 100 → 总分 100
      expect(first.rank).toBe(1);
      expect(first.userId).toBe("uA");
      expect(first.dims).toEqual({ tasks: 100, events: 100, stations: 100, seniority: 100 });
      expect(first.score).toBe(100);
      // B：任务 2/4=50，授课 0，驿站 1/2=50，资历 1/5 年=20 → 0.4*50+0.3*0+0.2*50+0.1*20=32
      expect(second.rank).toBe(2);
      expect(second.userId).toBe("uB");
      expect(second.dims).toEqual({ tasks: 50, events: 0, stations: 50, seniority: 20 });
      expect(second.score).toBe(32);
      // 明细计数透明可解释
      expect(first.tasksCompleted).toBe(4);
      expect(first.eventCount).toBe(3);
      expect(first.stationCount).toBe(2);
      expect(res.updatedAt).toBeTruthy();
      // 聚合对象过滤：仅 ACTIVE 且 lecturerLevel≠NONE
      expect(prisma.instituteMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "ACTIVE", lecturerLevel: { notIn: ["NONE"] } } }),
      );
    });

    it("公开榜单不含任何收入/资金字段（合规红线）", async () => {
      primeTwoMembers();
      const res = await svc.getRankings(YEAR);
      const json = JSON.stringify(res);
      expect(json).not.toMatch(/deposit|dividend|revenue|income|amount|earning|balance|phone/i);
    });

    it("无符合条件成员 → 空榜（不再触发聚合查询）", async () => {
      prisma.instituteMember.findMany.mockResolvedValue([]);
      const res = await svc.getRankings(YEAR);
      expect(res.items).toEqual([]);
      expect(res.updatedAt).toBeTruthy();
      expect(prisma.instituteEvent.groupBy).not.toHaveBeenCalled();
      expect(prisma.stationTeacher.groupBy).not.toHaveBeenCalled();
    });

    it("Redis 缓存命中 → 直接返回，不查库", async () => {
      const cached = { items: [{ rank: 1, userId: "uX" }], updatedAt: "2026-07-03T00:00:00.000Z" };
      redis.getJson.mockResolvedValue(cached);
      const res = await svc.getRankings(YEAR);
      expect(res).toEqual(cached);
      expect(redis.getJson).toHaveBeenCalledWith(`institute:rankings:${YEAR}`);
      expect(prisma.instituteMember.findMany).not.toHaveBeenCalled();
    });

    it("缓存未命中 → 计算后写缓存（key 含年份·TTL 1h）", async () => {
      primeTwoMembers();
      await svc.getRankings(YEAR);
      expect(redis.setJson).toHaveBeenCalledWith(
        `institute:rankings:${YEAR}`,
        expect.objectContaining({ items: expect.any(Array) }),
        3600,
      );
    });

    it("缺省/非法年份回落到当年", async () => {
      prisma.instituteMember.findMany.mockResolvedValue([]);
      const nowYear = new Date().getFullYear();
      await svc.getRankings();
      expect(redis.getJson).toHaveBeenCalledWith(`institute:rankings:${nowYear}`);
      await svc.getRankings(NaN);
      expect(redis.getJson).toHaveBeenLastCalledWith(`institute:rankings:${nowYear}`);
    });
  });
});
