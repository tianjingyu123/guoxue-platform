import { Test } from "@nestjs/testing";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { SystemService } from "../system/system.service";
import { LiveService } from "../live/live.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { MemberGuard } from "../../common/member.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";

const mockCourseSvc = {
  create: jest.fn().mockResolvedValue({ id: "c1", title: "国学入门" }),
  listCourses: jest.fn().mockResolvedValue([{ id: "c1", title: "国学入门" }]),
  getMyCourses: jest.fn().mockResolvedValue([{ id: "c1", progress: 0.5 }]),
  getMyLearningDashboard: jest.fn().mockResolvedValue({ totalCourses: 5, completed: 2 }),
  getUserValidCourses: jest.fn().mockResolvedValue([{ id: "c1", expireAt: new Date() }]),
  checkCourseExpiry: jest.fn().mockResolvedValue({ expired: false, daysLeft: 30 }),
  getDetail: jest.fn().mockResolvedValue({ id: "c1", title: "国学入门", chapters: [] }),
  update: jest.fn().mockResolvedValue({ id: "c1", title: "更新课程" }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  audit: jest.fn().mockResolvedValue({ id: "c1", auditStatus: "APPROVED" }),
  purchase: jest.fn().mockResolvedValue({ orderId: "o1" }),
  checkAccess: jest.fn().mockResolvedValue(true),
  addChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "第一章" }),
  getChapters: jest.fn().mockResolvedValue([{ id: "ch1", title: "第一章" }]),
  getChapterContent: jest.fn().mockResolvedValue({ id: "ch1", title: "第一章", content: "..." }),
  updateChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "更新章节" }),
  deleteChapter: jest.fn().mockResolvedValue({ success: true }),
  updateProgress: jest.fn().mockResolvedValue({ chapterId: "ch1", progress: 0.8 }),
  getMyProgress: jest.fn().mockResolvedValue({ total: 10, completed: 6 }),
  submitWork: jest.fn().mockResolvedValue({ id: "w1", status: "SUBMITTED" }),
  getWorks: jest.fn().mockResolvedValue([{ id: "w1", status: "SUBMITTED" }]),
  scoreWork: jest.fn().mockResolvedValue({ id: "w1", score: 90 }),
  createReview: jest.fn().mockResolvedValue({ id: "rv1", rating: 5 }),
  listReviews: jest.fn().mockResolvedValue([{ id: "rv1", rating: 5 }]),
  getCourseRating: jest.fn().mockResolvedValue({ average: 4.5, count: 20 }),
  getCourseStats: jest.fn().mockResolvedValue({ enrollments: 100, revenue: 5000 }),
};

const mockSystemSvc = {
  logAudit: jest.fn().mockResolvedValue(undefined),
};

const mockLiveSvc = {
  listCourseRooms: jest.fn().mockResolvedValue([{ id: "lr1", courseId: "c1" }]),
};

describe("CourseController", () => {
  let ctrl: CourseController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        { provide: CourseService, useValue: mockCourseSvc },
        { provide: SystemService, useValue: mockSystemSvc },
        { provide: LiveService, useValue: mockLiveSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(MemberGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CourseController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ─── 课程 CRUD ───
  it("POST /courses — 创建课程", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const dto: any = { title: "国学入门" };
    const result: any = await ctrl.create(req, dto);
    expect(result.title).toBe("国学入门");
    expect(mockSystemSvc.logAudit).toHaveBeenCalled();
  });

  it("GET /courses — 课程列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.list(q);
    expect(result).toHaveLength(1);
  });

  it("GET /courses/my — 我购买的课程", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyCourses(req, 1, 20);
    expect(result).toHaveLength(1);
  });

  it("GET /courses/dashboard — 学习看板", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyDashboard(req);
    expect(result.totalCourses).toBe(5);
  });

  it("GET /courses/user/valid — 有效期内课程", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getUserValidCourses(req);
    expect(result).toHaveLength(1);
  });

  it("GET /courses/:id/expiry-check — 过期检查", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.checkCourseExpiry(req, "c1");
    expect(result.expired).toBe(false);
  });

  it("GET /courses/:id — 课程详情", async () => {
    const result: any = await ctrl.detail("c1");
    expect(result.title).toBe("国学入门");
  });

  it("PUT /courses/:id — 更新课程", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const dto: any = { title: "更新课程" };
    const result: any = await ctrl.update("c1", req, dto);
    expect(result.title).toBe("更新课程");
  });

  it("DELETE /courses/:id — 删除课程", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.delete("c1", req);
    expect(result.success).toBe(true);
  });

  it.skip("PUT /courses/:id/audit — 审核课程", () => {
    // 审核方法已从控制器移除，测试跳过
  });

  // ─── 购买 ───
  it("POST /courses/:id/purchase — 购买课程", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.purchase(req, "c1");
    expect(result.orderId).toBe("o1");
  });

  it("GET /courses/:id/access — 检查访问权限", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.checkAccess(req, "c1");
    expect(result.hasAccess).toBe(true);
  });

  // ─── 章节 ───
  it("POST /courses/:id/chapters — 添加章节", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "第一章" };
    const result: any = await ctrl.addChapter("c1", req, dto);
    expect(result.title).toBe("第一章");
  });

  it("GET /courses/:id/chapters — 章节列表", async () => {
    const result: any = await ctrl.getChapters("c1");
    expect(result).toHaveLength(1);
  });

  it("GET /courses/chapters/:chapterId/content — 章节内容", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getChapterContent(req, "ch1");
    expect(result.title).toBe("第一章");
  });

  it("PUT /courses/:id/chapters/:chapterId — 更新章节", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "更新章节" };
    const result: any = await ctrl.updateChapter("c1", "ch1", req, dto);
    expect(result.title).toBe("更新章节");
  });

  it("DELETE /courses/:id/chapters/:chapterId — 删除章节", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deleteChapter("c1", "ch1", req);
    expect(result.success).toBe(true);
  });

  // ─── 学习进度 ───
  it("PUT /courses/chapters/:chapterId/progress — 更新进度", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { progress: 0.8 };
    const result: any = await ctrl.updateProgress(req, "ch1", dto);
    expect(result.progress).toBe(0.8);
  });

  it("GET /courses/:id/progress — 我的学习进度", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyProgress(req, "c1");
    expect(result.completed).toBe(6);
  });

  // ─── 作业 ───
  it("POST /courses/chapters/:chapterId/works — 提交作业", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { content: "作业内容" };
    const result: any = await ctrl.submitWork(req, "ch1", dto);
    expect(result.status).toBe("SUBMITTED");
  });

  it("GET /courses/:id/works — 作业列表", async () => {
    const result: any = await ctrl.getWorks("c1", "ch1");
    expect(result).toHaveLength(1);
  });

  it.skip("PUT /courses/works/:workId/score — 批改作业", () => {
    // 批改作业方法已从控制器移除，测试跳过
  });

  // ─── 评价 ───
  it("POST /courses/:id/reviews — 创建评价", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { rating: 5, content: "非常好" };
    const result: any = await ctrl.createReview(req, "c1", dto);
    expect(result.rating).toBe(5);
  });

  it("GET /courses/:id/reviews — 评价列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.getReviews("c1", q);
    expect(result).toHaveLength(1);
  });

  it("GET /courses/:id/rating — 评分统计", async () => {
    const result: any = await ctrl.getRating("c1");
    expect(result.average).toBe(4.5);
  });

  // ─── 讲师统计 ───
  it("GET /courses/:id/stats — 课程统计", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getStats(req, "c1");
    expect(result.enrollments).toBe(100);
  });

  // ─── 直播联动 ───
  it("GET /courses/:id/live-rooms — 课程关联直播间", async () => {
    const result: any = await ctrl.getLiveRooms("c1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockLiveSvc.listCourseRooms).toHaveBeenCalledWith("c1", 1, 20);
  });
});
