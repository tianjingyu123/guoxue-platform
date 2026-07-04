import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TeamTaskService, CreateTeamTaskDto } from "./team-task.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  operator: { findFirst: jest.fn() },
  station: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  teamTask: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  teamTaskProgress: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  referralRelation: { count: jest.fn() },
  order: { aggregate: jest.fn() },
};

const OPERATOR = { id: "op-1", brandName: "华东运营中心" };
const TEAM_STATIONS = [
  { id: "st-1", name: "易学驿站", userId: "master-1", user: { nickname: "张三" } },
  { id: "st-2", name: "国学小站", userId: "master-2", user: { nickname: "李四" } },
];

function futureIso(days = 7) {
  return new Date(Date.now() + days * 86400_000).toISOString();
}

describe("TeamTaskService（商-P2 团队任务下发）", () => {
  let svc: TeamTaskService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [TeamTaskService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(TeamTaskService);
    jest.clearAllMocks();
    mockPrisma.operator.findFirst.mockResolvedValue(OPERATOR);
    mockPrisma.station.findMany.mockResolvedValue(TEAM_STATIONS);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  // ───────── 建任务：团队归属校验 ─────────
  describe("create 建任务", () => {
    const baseDto: CreateTeamTaskDto = {
      title: "七月拉新冲刺",
      desc: "完成者获荣誉表彰与首页资源位展示",
      type: "PROMOTE",
      targetValue: 10,
      deadline: futureIso(),
    };

    it("非运营商 403", async () => {
      mockPrisma.operator.findFirst.mockResolvedValue(null);
      await expect(svc.create("u-normal", baseDto)).rejects.toThrow(ForbiddenException);
    });

    it("指派了不属于本团队的站长 → 拒绝", async () => {
      await expect(
        svc.create("u-op", { ...baseDto, stationMasterIds: ["master-1", "outsider-9"] }),
      ).rejects.toThrow(/不属于本团队/);
      expect(mockPrisma.teamTask.create).not.toHaveBeenCalled();
    });

    it("缺省指派 = 全团队站长，逐人建进度行", async () => {
      mockPrisma.teamTask.create.mockResolvedValue({
        id: "t-1", type: "CUSTOM", status: "OPEN", targetValue: null,
        createdAt: new Date(), deadline: new Date(baseDto.deadline), progresses: [],
      });
      await svc.create("u-op", { ...baseDto, type: "CUSTOM", targetValue: undefined });
      const createArg = mockPrisma.teamTask.create.mock.calls[0][0];
      expect(createArg.data.operatorId).toBe("op-1");
      expect(createArg.data.progresses.createMany.data).toEqual([
        { stationMasterId: "master-1" },
        { stationMasterId: "master-2" },
      ]);
    });

    it("R1 红线：文案含现金类承诺 → 拒绝", async () => {
      await expect(
        svc.create("u-op", { ...baseDto, desc: "完成任务奖励现金 500 元" }),
      ).rejects.toThrow(/荣誉|现金/);
      expect(mockPrisma.teamTask.create).not.toHaveBeenCalled();
    });

    it("截止时间早于当前 → 拒绝", async () => {
      await expect(
        svc.create("u-op", { ...baseDto, deadline: new Date(Date.now() - 86400_000).toISOString() }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ───────── 三类自动进度计算 ─────────
  describe("recalcTask 自动结算", () => {
    const period = { createdAt: new Date("2026-07-01"), deadline: new Date("2026-07-31") };

    it("PROMOTE：按任务期内 ref 新注册数计，达标写 completedAt", async () => {
      mockPrisma.referralRelation.count.mockResolvedValue(12);
      const updated = await svc.recalcTask({
        id: "t-p", type: "PROMOTE", status: "OPEN", targetValue: 10, ...period,
        progresses: [{ id: "pg-1", stationMasterId: "master-1", currentValue: 0, completedAt: null }],
      });
      expect(updated).toBe(1);
      expect(mockPrisma.referralRelation.count).toHaveBeenCalledWith({
        where: { referrerId: "master-1", createdAt: { gte: period.createdAt, lte: period.deadline } },
      });
      const updArg = mockPrisma.teamTaskProgress.update.mock.calls[0][0];
      expect(updArg.data.currentValue).toBe(12);
      expect(updArg.data.completedAt).toBeInstanceOf(Date);
    });

    it("RECRUIT：按任务期内新增下级站长数计，未达标不写 completedAt", async () => {
      mockPrisma.station.count.mockResolvedValue(2);
      const updated = await svc.recalcTask({
        id: "t-r", type: "RECRUIT", status: "OPEN", targetValue: 5, ...period,
        progresses: [{ id: "pg-2", stationMasterId: "master-2", currentValue: 0, completedAt: null }],
      });
      expect(updated).toBe(1);
      expect(mockPrisma.station.count).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: period.createdAt, lte: period.deadline },
          user: { referralUsers: { some: { referrerId: "master-2" } } },
        },
      });
      const updArg = mockPrisma.teamTaskProgress.update.mock.calls[0][0];
      expect(updArg.data.currentValue).toBe(2);
      expect(updArg.data.completedAt).toBeNull();
    });

    it("SALES：按任务期内归因订单 GMV（实付优先·元取整）计", async () => {
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { payAmount: 336.5 } })
        .mockResolvedValueOnce({ _sum: { amount: 100 } });
      const updated = await svc.recalcTask({
        id: "t-s", type: "SALES", status: "OPEN", targetValue: 400, ...period,
        progresses: [{ id: "pg-3", stationMasterId: "master-1", currentValue: 0, completedAt: null }],
      });
      expect(updated).toBe(1);
      // 已支付口径 + paidAt 限定任务期
      const aggWhere = mockPrisma.order.aggregate.mock.calls[0][0].where;
      expect(aggWhere.referrerId).toBe("master-1");
      expect(aggWhere.status.in).toEqual(["PAID", "SHIPPED", "COMPLETED"]);
      expect(aggWhere.paidAt).toEqual({ gte: period.createdAt, lte: period.deadline });
      const updArg = mockPrisma.teamTaskProgress.update.mock.calls[0][0];
      expect(updArg.data.currentValue).toBe(437); // round(336.5 + 100)
      expect(updArg.data.completedAt).toBeInstanceOf(Date);
    });

    it("CUSTOM：不参与自动结算", async () => {
      const updated = await svc.recalcTask({
        id: "t-c", type: "CUSTOM", status: "OPEN", targetValue: null, ...period,
        progresses: [{ id: "pg-4", stationMasterId: "master-1", currentValue: 0, completedAt: null }],
      });
      expect(updated).toBe(0);
      expect(mockPrisma.teamTaskProgress.update).not.toHaveBeenCalled();
    });

    it("进度无变化时不写库", async () => {
      mockPrisma.referralRelation.count.mockResolvedValue(3);
      const updated = await svc.recalcTask({
        id: "t-p2", type: "PROMOTE", status: "OPEN", targetValue: 10, ...period,
        progresses: [{ id: "pg-5", stationMasterId: "master-1", currentValue: 3, completedAt: null }],
      });
      expect(updated).toBe(0);
      expect(mockPrisma.teamTaskProgress.update).not.toHaveBeenCalled();
    });
  });

  // ───────── 关闭后不再更新 ─────────
  describe("关闭任务", () => {
    it("dailyRecalc 只结算 OPEN 任务（CLOSED 不再更新）", async () => {
      mockPrisma.teamTask.findMany.mockResolvedValue([]);
      await svc.dailyRecalc();
      expect(mockPrisma.teamTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "OPEN" } }),
      );
    });

    it("recalcTask 对 CLOSED 任务直接跳过", async () => {
      const updated = await svc.recalcTask({
        id: "t-x", type: "PROMOTE", status: "CLOSED", targetValue: 10,
        createdAt: new Date(), deadline: new Date(),
        progresses: [{ id: "pg-9", stationMasterId: "master-1", currentValue: 0, completedAt: null }],
      });
      expect(updated).toBe(0);
      expect(mockPrisma.referralRelation.count).not.toHaveBeenCalled();
      expect(mockPrisma.teamTaskProgress.update).not.toHaveBeenCalled();
    });

    it("只能关闭自己下发的任务，他人任务 403", async () => {
      mockPrisma.teamTask.findFirst.mockResolvedValue({ id: "t-other", operatorId: "op-other", status: "OPEN" });
      await expect(svc.close("u-op", "t-other")).rejects.toThrow(ForbiddenException);
    });

    it("关闭自己的任务 → 状态置 CLOSED", async () => {
      mockPrisma.teamTask.findFirst.mockResolvedValue({ id: "t-1", operatorId: "op-1", status: "OPEN" });
      mockPrisma.teamTask.update.mockResolvedValue({ id: "t-1", status: "CLOSED" });
      const res = await svc.close("u-op", "t-1");
      expect(res.status).toBe("CLOSED");
      expect(mockPrisma.teamTask.update).toHaveBeenCalledWith({ where: { id: "t-1" }, data: { status: "CLOSED" } });
    });

    it("CLOSED 任务站长不能再手动标记完成", async () => {
      mockPrisma.teamTaskProgress.findFirst.mockResolvedValue({
        id: "pg-1", taskId: "t-1", stationMasterId: "master-1", completedAt: null,
        task: { id: "t-1", status: "CLOSED", type: "CUSTOM" },
      });
      await expect(svc.markComplete("master-1", "t-1")).rejects.toThrow(/已关闭/);
    });
  });

  // ───────── 站长视角 ─────────
  describe("listMine 站长视角", () => {
    it("只查询自己的进度行", async () => {
      mockPrisma.station.findFirst.mockResolvedValue({ id: "st-1", operatorId: "op-1" });
      mockPrisma.teamTaskProgress.findMany.mockResolvedValue([
        {
          taskId: "t-1", currentValue: 5, completedAt: null,
          task: {
            title: "拉新", desc: null, type: "PROMOTE", targetValue: 10,
            deadline: new Date(), status: "OPEN",
            operator: { brandName: "华东运营中心", user: { nickname: "运营商" } },
          },
        },
      ]);
      const res = await svc.listMine("master-1");
      expect(mockPrisma.teamTaskProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stationMasterId: "master-1" } }),
      );
      expect(res.inTeam).toBe(true);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].currentValue).toBe(5);
      expect(res.items[0].operatorName).toBe("华东运营中心");
    });

    it("未归属任何运营商团队 → inTeam=false 空列表", async () => {
      mockPrisma.station.findFirst.mockResolvedValue({ id: "st-9", operatorId: null });
      const res = await svc.listMine("master-9");
      expect(res).toEqual({ inTeam: false, items: [] });
      expect(mockPrisma.teamTaskProgress.findMany).not.toHaveBeenCalled();
    });

    it("CUSTOM 任务手动标记完成", async () => {
      mockPrisma.teamTaskProgress.findFirst.mockResolvedValue({
        id: "pg-1", taskId: "t-1", stationMasterId: "master-1", completedAt: null,
        task: { id: "t-1", status: "OPEN", type: "CUSTOM" },
      });
      mockPrisma.teamTaskProgress.update.mockResolvedValue({ id: "pg-1", currentValue: 1 });
      await svc.markComplete("master-1", "t-1");
      const updArg = mockPrisma.teamTaskProgress.update.mock.calls[0][0];
      expect(updArg.where).toEqual({ id: "pg-1" });
      expect(updArg.data.currentValue).toBe(1);
      expect(updArg.data.completedAt).toBeInstanceOf(Date);
    });

    it("自动结算类型不允许手报", async () => {
      mockPrisma.teamTaskProgress.findFirst.mockResolvedValue({
        id: "pg-2", taskId: "t-2", stationMasterId: "master-1", completedAt: null,
        task: { id: "t-2", status: "OPEN", type: "SALES" },
      });
      await expect(svc.markComplete("master-1", "t-2")).rejects.toThrow(/自动结算/);
    });

    it("未指派给自己的任务 → 404", async () => {
      mockPrisma.teamTaskProgress.findFirst.mockResolvedValue(null);
      await expect(svc.markComplete("master-1", "t-none")).rejects.toThrow(NotFoundException);
    });
  });

  // ───────── 运营商列表聚合 ─────────
  describe("listForOperator 运营商视角", () => {
    it("带各站长进度与完成度聚合", async () => {
      mockPrisma.teamTask.findMany.mockResolvedValue([
        {
          id: "t-1", title: "拉新", desc: null, type: "PROMOTE", targetValue: 10,
          deadline: new Date(), status: "OPEN", createdAt: new Date(),
          progresses: [
            { stationMasterId: "master-1", currentValue: 12, completedAt: new Date() },
            { stationMasterId: "master-2", currentValue: 3, completedAt: null },
          ],
        },
      ]);
      const res = await svc.listForOperator("u-op");
      expect(res.items).toHaveLength(1);
      expect(res.items[0].total).toBe(2);
      expect(res.items[0].completedCount).toBe(1);
      expect(res.items[0].completionRate).toBe(50);
      expect(res.items[0].progresses[0].stationName).toBe("易学驿站");
      expect(res.items[0].progresses[0].nickname).toBe("张三");
    });
  });
});
