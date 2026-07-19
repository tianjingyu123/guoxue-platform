import { Test, TestingModule } from "@nestjs/testing";
import { InstituteService } from "./institute.service";
import { InstituteAssessmentService } from "./institute-assessment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

describe("InstituteService", () => {
  let svc: InstituteService;
  let prisma: any;
  let redis: any;
  let assessment: any;

  beforeEach(async () => {
    prisma = {
      institute: {
        findFirst: jest.fn().mockResolvedValue({ id: "i1", name: "国学研究院", circleId: null }),
      },
      instituteMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
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
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      instituteRevenue: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      instituteDividend: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      stationTeacher: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      circleMember: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      circle: {
        update: jest.fn(),
      },
      // 治理 #10：自动入圈前禁入直查（默认无禁入）
      circleViolation: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "u-vip" }),
      },
      $transaction: jest.fn(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
    };
    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };
    assessment = {
      getEligibility: jest.fn().mockResolvedValue({ seatType: "LECTURE", eligible: true, checks: [] }),
      awardEventPointsForCompletedEvent: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstituteService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: InstituteAssessmentService, useValue: assessment },
      ],
    }).compile();

    svc = module.get<InstituteService>(InstituteService);
  });

  describe("join（T9-P1 双轨席位+多院约束+自动入圈）", () => {
    it("已是成员时报错（同院重复拒·复合唯一语义）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1" });
      await expect(svc.join("u1", { role: "TYPE_A", joinYear: 2026 })).rejects.toThrow(BusinessException);
      // 存在性检查按 (instituteId, userId) 复合语义查——同人在别院的会籍不拦截（一人可入多院）
      expect(prisma.instituteMember.findFirst).toHaveBeenCalledWith({
        where: { instituteId: "i1", userId: "u1" },
      });
    });

    it("成功加入研究院（默认讲席 LECTURE·服务端强制资格校验）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({
        id: "m1", userId: "u1", role: "TYPE_A", seatType: "LECTURE", joinYear: 2026, deposit: 10000,
        user: { id: "u1", nickname: "Alice", avatar: null },
      });
      const result = await svc.join("u1", { role: "TYPE_A", joinYear: 2026 });
      expect(result.id).toBe("m1");
      expect(assessment.getEligibility).toHaveBeenCalledWith("u1", "LECTURE");
      expect(prisma.instituteMember.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", seatType: "LECTURE", tasksRequired: 3 }),
      }));
    });

    it("资格不合格 → 400 且带未通过项，不创建成员", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      assessment.getEligibility.mockResolvedValue({
        seatType: "LECTURE",
        eligible: false,
        checks: [
          { key: "circleScale", label: "圈子规模：成员≥50人", pass: false, current: 12, required: 50 },
          { key: "revenue", label: "经营：圈子/课程累计创收≥5000元", pass: false, current: 800, required: 5000 },
          { key: "circleRole", label: "身份", pass: true, current: 1, required: 1 },
        ],
      });
      await expect(svc.join("u1", { role: "TYPE_A", joinYear: 2026 }))
        .rejects.toThrow(/入会条件未满足.*圈子规模.*创收/);
      expect(prisma.instituteMember.create).not.toHaveBeenCalled();
    });

    it("研修席入会（seatType=STUDY 透传资格校验与落库）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({ id: "m2", seatType: "STUDY", user: {} });
      assessment.getEligibility.mockResolvedValue({ seatType: "STUDY", eligible: true, checks: [] });
      await svc.join("u1", { role: "TYPE_B", joinYear: 2026, seatType: "STUDY" });
      expect(assessment.getEligibility).toHaveBeenCalledWith("u1", "STUDY");
      expect(prisma.instituteMember.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ seatType: "STUDY" }),
      }));
    });

    it("研究院有专属大圈 → 入会自动建 CircleMember(MEMBER) 并增计数", async () => {
      prisma.institute.findFirst.mockResolvedValue({ id: "i1", name: "国学研究院", circleId: "big-c" });
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({ id: "m1", user: {} });
      prisma.circleMember.findUnique.mockResolvedValue(null);
      prisma.circleMember.create.mockResolvedValue({ id: "cm1" });
      prisma.circle.update.mockResolvedValue({});
      await svc.join("u1", { role: "TYPE_A", joinYear: 2026 });
      expect(prisma.circleMember.create).toHaveBeenCalledWith({
        data: { circleId: "big-c", userId: "u1", role: "MEMBER" },
      });
      expect(prisma.circle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { memberCount: { increment: 1 } } }),
      );
    });

    it("治理禁入者：自动入圈静默跳过（不阻断研究院入会主流程）", async () => {
      prisma.institute.findFirst.mockResolvedValue({ id: "i1", name: "国学研究院", circleId: "big-c" });
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({ id: "m1", user: {} });
      prisma.circleMember.findUnique.mockResolvedValue(null);
      prisma.circleViolation.findFirst.mockResolvedValue({ id: "v1" }); // REMOVE ACTIVE 禁入
      const res = await svc.join("u1", { role: "TYPE_A", joinYear: 2026 });
      expect(res.id).toBe("m1"); // 入会本身不受影响
      expect(prisma.circleMember.create).not.toHaveBeenCalled(); // 但不自动入圈
    });

    it("自动入圈幂等：已在圈内则不重复建", async () => {
      prisma.institute.findFirst.mockResolvedValue({ id: "i1", name: "国学研究院", circleId: "big-c" });
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({ id: "m1", user: {} });
      prisma.circleMember.findUnique.mockResolvedValue({ id: "cm-exist" });
      await svc.join("u1", { role: "TYPE_A", joinYear: 2026 });
      expect(prisma.circleMember.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("不能自助申请管理层角色（越权防护）", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      await expect(svc.join("u1", { role: "PRESIDENT", joinYear: 2026 })).rejects.toThrow(BusinessException);
      expect(prisma.instituteMember.create).not.toHaveBeenCalled();
    });
  });

  describe("inviteMember（T9-P1 特邀席位·名师破格引入）", () => {
    it("特邀成功：跳过全部准入门槛（不调 eligibility）·直接 ACTIVE·免会费 deposit=0 无到期·留痕", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({
        id: "m-vip", userId: "u-vip", feeExempt: true, status: "ACTIVE", user: { id: "u-vip", nickname: "名师" },
      });
      const res = await svc.inviteMember("u-admin", { userId: "u-vip", feeExempt: true, remark: "冷启动名师站台" });
      expect(res.id).toBe("m-vip");
      // 命门：特邀=破格，绝不触发五维/三维资格校验
      expect(assessment.getEligibility).not.toHaveBeenCalled();
      expect(prisma.instituteMember.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: "u-vip",
          status: "ACTIVE", // 直接生效无需审核
          deposit: 0, // 免会费 → 0 保证金
          feeExempt: true,
          expireAt: null, // 永久免会费 → 无到期时间
          invitedBy: "u-admin", // 操作留痕
          inviteRemark: "冷启动名师站台",
          seatType: "LECTURE",
        }),
      }));
    });

    it("非免会费特邀：deposit 走默认 10000 且有年度到期时间", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({ id: "m-vip2", user: {} });
      await svc.inviteMember("u-admin", { userId: "u-vip", seatType: "STUDY" });
      expect(prisma.instituteMember.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          deposit: 10000,
          feeExempt: false,
          seatType: "STUDY",
          expireAt: expect.any(Date),
        }),
      }));
    });

    it("重复会籍 → 400 拒绝，不创建", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m-exist" });
      await expect(svc.inviteMember("u-admin", { userId: "u-vip" })).rejects.toThrow("该用户已是研究院成员");
      expect(prisma.instituteMember.create).not.toHaveBeenCalled();
    });

    it("被特邀用户不存在 → 404", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.inviteMember("u-admin", { userId: "u-ghost" })).rejects.toThrow("被特邀用户不存在");
      expect(prisma.instituteMember.create).not.toHaveBeenCalled();
    });

    it("研究院有专属大圈 → 特邀成员复用幂等自动入圈", async () => {
      prisma.institute.findFirst.mockResolvedValue({ id: "i1", name: "国学研究院", circleId: "big-c" });
      prisma.instituteMember.findFirst.mockResolvedValue(null);
      prisma.instituteMember.create.mockResolvedValue({ id: "m-vip", user: {} });
      prisma.circleMember.findUnique.mockResolvedValue(null);
      prisma.circleMember.create.mockResolvedValue({ id: "cm1" });
      await svc.inviteMember("u-admin", { userId: "u-vip", feeExempt: true });
      expect(prisma.circleMember.create).toHaveBeenCalledWith({
        data: { circleId: "big-c", userId: "u-vip", role: "MEMBER" },
      });
    });
  });

  describe("线上会费未开放（资金防假写）", () => {
    it("任务全部完成也不展示已缴或可退款状态", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({
        id: "m1",
        userId: "u1",
        deposit: 10000,
        depositRefunded: false,
        tasksRequired: 3,
        tasks: [
          { status: "VERIFIED" },
          { status: "VERIFIED" },
          { status: "VERIFIED" },
        ],
        expireAt: null,
        institute: { id: "i1", name: "国学研究院" },
      });

      const result = await svc.getMyDashboard("u1");

      expect(result).not.toBeNull()
      expect(result!.depositStatus).toEqual({
        deposited: 0,
        refunded: false,
        canRefund: false,
        refundCondition: "线上会费收退款尚未开放，当前没有可退线上订单",
      });
    });

    it("旧前端直调退款接口会被拒绝且不写成员状态", async () => {
      await expect(svc.requestDepositRefund("u1")).rejects.toThrow(/线上会费收退款尚未开放/);
      expect(prisma.instituteMember.update).not.toHaveBeenCalled();
    });
  });

  describe("requestDividend（只允许真实入账留存）", () => {
    it("收入池为 0 时拒绝发起分红审批", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "mgr", instituteId: "i1", role: "PRESIDENT", status: "ACTIVE" });
      (svc as any).fundApproval = { create: jest.fn() };

      await expect(svc.requestDividend("u-admin", { userId: "u1", type: "MGMT_BONUS", amount: 1 }))
        .rejects.toThrow(/可分配余额不足/);
      expect((svc as any).fundApproval.create).not.toHaveBeenCalled();
    });

    it("金额不超过真实留存余额时才创建审批并携带研究院归属", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "mgr", instituteId: "i1", role: "PRESIDENT", status: "ACTIVE" });
      prisma.instituteRevenue.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      prisma.instituteDividend.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
      const create = jest.fn().mockResolvedValue({ submitted: true });
      (svc as any).fundApproval = { create };

      await svc.requestDividend("u-admin", { userId: "u1", type: "MGMT_BONUS", amount: 400 });

      expect(create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 400,
        payload: expect.objectContaining({ instituteId: "i1", userId: "u1" }),
      }));
    });
  });

  describe("approveMember（自审自批防护）", () => {
    it("不能审批自己的成员申请", async () => {
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "mgr", instituteId: "i1", role: "PRESIDENT", status: "ACTIVE" });
      prisma.instituteMember.findUnique.mockResolvedValue({ id: "m1", userId: "u1", status: "PENDING" });
      await expect(svc.approveMember("u1", "m1", "ACTIVE")).rejects.toThrow(BusinessException);
      expect(prisma.instituteMember.update).not.toHaveBeenCalled();
    });
  });

  describe("updateEvent（T9-P1 活动完成自动记分挂点）", () => {
    it("状态首次流转 COMPLETED → 触发讲师自动记分", async () => {
      prisma.instituteEvent.findUnique.mockResolvedValue({ id: "e1", status: "ONGOING" });
      prisma.instituteEvent.update.mockResolvedValue({
        id: "e1", status: "COMPLETED", type: "SALON", title: "院内沙龙", lecturerId: "uL", instituteId: "i1",
      });
      await svc.updateEvent("e1", { status: "COMPLETED" });
      expect(assessment.awardEventPointsForCompletedEvent).toHaveBeenCalledWith({
        id: "e1", type: "SALON", title: "院内沙龙", lecturerId: "uL", instituteId: "i1",
      });
    });

    it("已是 COMPLETED 再更新 → 不重复触发记分", async () => {
      prisma.instituteEvent.findUnique.mockResolvedValue({ id: "e1", status: "COMPLETED" });
      prisma.instituteEvent.update.mockResolvedValue({ id: "e1", status: "COMPLETED", type: "SALON" });
      await svc.updateEvent("e1", { status: "COMPLETED" });
      expect(assessment.awardEventPointsForCompletedEvent).not.toHaveBeenCalled();
    });

    it("非 COMPLETED 更新（如改标题）→ 不触发记分", async () => {
      prisma.instituteEvent.findUnique.mockResolvedValue({ id: "e1", status: "SCHEDULED" });
      prisma.instituteEvent.update.mockResolvedValue({ id: "e1", status: "SCHEDULED", type: "SALON" });
      await svc.updateEvent("e1", { title: "新标题" });
      expect(assessment.awardEventPointsForCompletedEvent).not.toHaveBeenCalled();
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

    it("page 传非数字串不产生 NaN skip（P2-4 分页加固）", async () => {
      prisma.instituteMember.findMany.mockResolvedValue([]);
      prisma.instituteMember.count.mockResolvedValue(0);
      await svc.listMembers({ page: "abc" as any, pageSize: 10 });
      const arg = prisma.instituteMember.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
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
      prisma.instituteMember.findFirst.mockResolvedValue({ id: "m1", instituteId: "i1", role: "PRESIDENT", status: "ACTIVE" });
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
