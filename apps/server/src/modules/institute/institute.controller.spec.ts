import { Test } from "@nestjs/testing";
import { InstituteController } from "./institute.controller";
import { InstituteService } from "./institute.service";
import { InstituteAssessmentService } from "./institute-assessment.service";
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
  inviteMember: jest.fn().mockResolvedValue({ id: "m-vip", status: "ACTIVE", feeExempt: true }),
  getRankings: jest.fn().mockResolvedValue({ items: [{ rank: 1, userId: "u1", score: 100 }], updatedAt: "2026-07-03T00:00:00.000Z" }),
};

const mockAssessmentSvc = {
  getEligibility: jest.fn().mockResolvedValue({ seatType: "LECTURE", eligible: true, checks: [] }),
  getMyAssessment: jest.fn().mockResolvedValue({ year: 2026, points: 120, tier: "FULL_REFUND", quarterPoints: [30, 30, 30, 30], offline: { met: true, detail: [] }, pointItems: [] }),
  addManualPoints: jest.fn().mockResolvedValue({ id: "sp1", points: 20 }),
};

describe("InstituteController", () => {
  let ctrl: InstituteController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [InstituteController],
      providers: [
        { provide: InstituteService, useValue: mockInstituteSvc },
        { provide: InstituteAssessmentService, useValue: mockAssessmentSvc },
      ],
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

  it("GET /institute/rankings — 讲师影响力榜单（公开·year 透传数字化）", async () => {
    const result: any = await ctrl.getRankings("2026");
    expect(result.items).toHaveLength(1);
    expect(mockInstituteSvc.getRankings).toHaveBeenCalledWith(2026);
    await ctrl.getRankings(undefined);
    expect(mockInstituteSvc.getRankings).toHaveBeenLastCalledWith(undefined);
  });

  it("GET /institute/eligibility — 入会资格校验（seatType 透传）", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getEligibility(req, "STUDY");
    expect(result.eligible).toBe(true);
    expect(mockAssessmentSvc.getEligibility).toHaveBeenCalledWith("u1", "STUDY");
  });

  it("GET /institute/my/assessment — 我的年度考核", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.myAssessment(req);
    expect(result.tier).toBe("FULL_REFUND");
    expect(mockAssessmentSvc.getMyAssessment).toHaveBeenCalledWith("u1");
  });

  it("POST /institute/manage/members/:id/points — 人工记分", async () => {
    const req: any = { user: { id: "u-mgr" } };
    const dto: any = { points: 20, pointType: "INSTITUTE_SALON" };
    const result: any = await ctrl.addMemberPoints(req, "m1", dto);
    expect(result.id).toBe("sp1");
    expect(mockAssessmentSvc.addManualPoints).toHaveBeenCalledWith("u-mgr", "m1", dto);
  });

  it("POST /institute/admin/members/invite — 特邀席位（操作者透传·直接 ACTIVE）", async () => {
    const req: any = { user: { id: "u-admin" } };
    const dto: any = { userId: "u-vip", seatType: "LECTURE", feeExempt: true, remark: "名师站台" };
    const result: any = await ctrl.inviteMember(req, dto);
    expect(result.status).toBe("ACTIVE");
    expect(result.feeExempt).toBe(true);
    expect(mockInstituteSvc.inviteMember).toHaveBeenCalledWith("u-admin", dto);
  });

  it("特邀端点仅平台管理角色可用（@Roles 元数据=SUPER_ADMIN/OPERATION_ADMIN·RolesGuard 对其余角色 403）", () => {
    const roles = Reflect.getMetadata("roles", InstituteController.prototype.inviteMember);
    expect(roles).toEqual(["SUPER_ADMIN", "OPERATION_ADMIN"]);
    const guards = Reflect.getMetadata("__guards__", InstituteController.prototype.inviteMember);
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  it("PUT /institute/events/:id — 更新活动", async () => {
    const dto = { status: "CANCELLED" };
    const result: any = await ctrl.updateEvent("e1", dto);
    expect(result.status).toBe("CANCELLED");
    expect(mockInstituteSvc.updateEvent).toHaveBeenCalledWith("e1", dto);
  });
});
