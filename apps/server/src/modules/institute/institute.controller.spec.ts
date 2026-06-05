import { Test } from "@nestjs/testing";
import { InstituteController } from "./institute.controller";
import { InstituteService } from "./institute.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockInstituteSvc = {
  join: jest.fn().mockResolvedValue({ id: "m1", status: "PENDING" }),
  getMyDashboard: jest.fn().mockResolvedValue({ id: "m1", role: "LECTURER" }),
  listMembers: jest.fn().mockResolvedValue([{ id: "m1", name: "张老师" }]),
  getMember: jest.fn().mockResolvedValue({ id: "m1", name: "张老师", bio: "..." }),
  updateLecturerLevel: jest.fn().mockResolvedValue({ id: "m1", lecturerLevel: 3 }),
  getSigningCandidates: jest.fn().mockResolvedValue([{ id: "u1", name: "候选讲师" }]),
  addTask: jest.fn().mockResolvedValue({ id: "t1", title: "年度任务" }),
  completeTask: jest.fn().mockResolvedValue({ id: "t1", status: "COMPLETED" }),
  verifyTask: jest.fn().mockResolvedValue({ id: "t1", status: "VERIFIED" }),
  createEvent: jest.fn().mockResolvedValue({ id: "e1", title: "学术讲座" }),
  listEvents: jest.fn().mockResolvedValue([{ id: "e1", title: "学术讲座" }]),
  updateEvent: jest.fn().mockResolvedValue({ id: "e1", status: "CANCELLED" }),
};

describe("InstituteController", () => {
  let ctrl: InstituteController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [InstituteController],
      providers: [{ provide: InstituteService, useValue: mockInstituteSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(InstituteController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /institute/members — 加入研究院", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "张老师", bio: "国学研究" };
    const result: any = await ctrl.join(req, dto);
    expect(result.status).toBe("PENDING");
    expect(mockInstituteSvc.join).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /institute/my — 我的研究院信息", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.myMembership(req);
    expect(result.role).toBe("LECTURER");
    expect(mockInstituteSvc.getMyDashboard).toHaveBeenCalledWith("u1");
  });

  it("GET /institute/members — 成员列表", async () => {
    const result: any = await ctrl.listMembers("LECTURER", "ACTIVE", 2025 as any, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockInstituteSvc.listMembers).toHaveBeenCalled();
  });

  it("GET /institute/members/:id — 成员详情", async () => {
    const result: any = await ctrl.getMember("m1");
    expect(result.name).toBe("张老师");
    expect(mockInstituteSvc.getMember).toHaveBeenCalledWith("m1");
  });

  it("PUT /institute/members/:id/lecturer-level — 更新讲师等级", async () => {
    const dto: any = { level: 3 };
    const result: any = await ctrl.updateLecturerLevel("m1", dto);
    expect(result.lecturerLevel).toBe(3);
    expect(mockInstituteSvc.updateLecturerLevel).toHaveBeenCalledWith("m1", dto);
  });

  it("GET /institute/candidates — 候选讲师", async () => {
    const result: any = await ctrl.getCandidates();
    expect(result).toHaveLength(1);
    expect(mockInstituteSvc.getSigningCandidates).toHaveBeenCalled();
  });

  it("POST /institute/members/:id/tasks — 添加任务", async () => {
    const dto: any = { title: "年度任务", year: 2025 };
    const result: any = await ctrl.addTask("m1", dto);
    expect(result.title).toBe("年度任务");
    expect(mockInstituteSvc.addTask).toHaveBeenCalledWith("m1", dto);
  });

  it("POST /institute/tasks/:id/complete — 完成任务", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.completeMyTask("t1", req);
    expect(result.status).toBe("COMPLETED");
    expect(mockInstituteSvc.completeTask).toHaveBeenCalledWith("t1", "u1");
  });

  it("POST /institute/tasks/:id/verify — 验证任务", async () => {
    const req: any = { user: { id: "admin1" } };
    const result: any = await ctrl.verifyTask("t1", req);
    expect(result.status).toBe("VERIFIED");
    expect(mockInstituteSvc.verifyTask).toHaveBeenCalledWith("t1", "admin1");
  });

  it("POST /institute/events — 创建活动", async () => {
    const dto: any = { title: "学术讲座", type: "LECTURE", date: "2025-06-01" };
    const req: any = { user: { id: "admin1" } };
    const result: any = await ctrl.createEvent(req, dto);
    expect(result.title).toBe("学术讲座");
    expect(mockInstituteSvc.createEvent).toHaveBeenCalledWith("admin1", dto);
  });

  it("GET /institute/events — 活动列表", async () => {
    const result: any = await ctrl.listEvents("LECTURE", "UPCOMING", "true", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockInstituteSvc.listEvents).toHaveBeenCalled();
  });

  it("PUT /institute/events/:id — 更新活动", async () => {
    const dto = { status: "CANCELLED" };
    const result: any = await ctrl.updateEvent("e1", dto);
    expect(result.status).toBe("CANCELLED");
    expect(mockInstituteSvc.updateEvent).toHaveBeenCalledWith("e1", dto);
  });
});
