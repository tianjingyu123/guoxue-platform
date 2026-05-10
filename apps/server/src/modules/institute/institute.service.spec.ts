import { Test, TestingModule } from "@nestjs/testing";
import { InstituteService } from "./institute.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("InstituteService", () => {
  let svc: InstituteService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
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
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstituteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    svc = module.get<InstituteService>(InstituteService);
  });

  describe("join", () => {
    it("已是成员时报错", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue({ id: "m1" });
      await expect(svc.join("u1", { role: "TYPE_A", joinYear: 2026 })).rejects.toThrow(BadRequestException);
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
  });

  describe("getMember", () => {
    it("成员不存在时报错", async () => {
      prisma.instituteMember.findUnique.mockResolvedValue(null);
      await expect(svc.getMember("m1")).rejects.toThrow(NotFoundException);
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
    it("任务完成达标后退还保证金", async () => {
      prisma.instituteTask.findUnique.mockResolvedValue({
        id: "t1", memberId: "m1", status: "COMPLETED",
        member: { userId: "u1" },
      });
      prisma.instituteTask.update.mockResolvedValue({ id: "t1", status: "VERIFIED" });
      prisma.instituteMember.findUnique.mockResolvedValue({
        id: "m1", tasksRequired: 1,
        tasks: [{ id: "t1", status: "VERIFIED" }],
      });
      await svc.verifyTask("t1", "v1");
      expect(prisma.instituteMember.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ depositRefunded: true, status: "GRADUATED" }),
      }));
    });
  });

  describe("createEvent / listEvents", () => {
    it("创建活动", async () => {
      prisma.instituteEvent.create.mockResolvedValue({ id: "e1", title: "讲座" });
      const result = await svc.createEvent({ title: "讲座", type: "LECTURE", scheduleAt: new Date().toISOString() });
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
});
