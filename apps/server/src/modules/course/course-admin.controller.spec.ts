import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { CourseAdminController } from "./course-admin.controller";
import { CourseService } from "./course.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockCourse = {
  audit: jest.fn(),
  batchAudit: jest.fn(),
  forceDelete: jest.fn(),
  forceStatus: jest.fn(),
  getCourseStudents: jest.fn(),
  getStudentProgress: jest.fn(),
  replyReview: jest.fn(),
  toggleReviewStatus: jest.fn(),
  listAllReviews: jest.fn(),
  scoreWork: jest.fn(),
  aiScoreWork: jest.fn(),
  aiBatchScoreWorks: jest.fn(),
  answerQuestion: jest.fn(),
  aiSuggestAnswer: jest.fn(),
};

const mockSystem = { logAudit: jest.fn().mockResolvedValue(undefined) };
const mockGuard: CanActivate = { canActivate: () => true };

describe("CourseAdminController", () => {
  let ctrl: CourseAdminController;
  const mockReq = { user: { id: "admin1", roles: ["SUPER_ADMIN"] }, ip: "127.0.0.1" } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CourseAdminController],
      providers: [
        { provide: CourseService, useValue: mockCourse },
        { provide: SystemService, useValue: mockSystem },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CourseAdminController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("审核", () => {
    it("单课审核", async () => {
      mockCourse.audit.mockResolvedValue({ id: "c1", status: "APPROVED" } as any);
      const result: any = await ctrl.audit("c1", "APPROVED", mockReq);
      expect(result.status).toBe("APPROVED");
      expect(mockSystem.logAudit).toHaveBeenCalled();
    });

    it("批量审核", async () => {
      mockCourse.batchAudit.mockResolvedValue({ count: 3 } as any);
      const result: any = await ctrl.batchAudit(["c1", "c2", "c3"], "APPROVED", mockReq);
      expect(result.count).toBe(3);
    });
  });

  describe("强制操作", () => {
    it("强制删除课程", async () => {
      mockCourse.forceDelete.mockResolvedValue({ success: true } as any);
      const result: any = await ctrl.forceDelete("c1", mockReq);
      expect(result.success).toBe(true);
    });

    it("强制变更状态", async () => {
      mockCourse.forceStatus.mockResolvedValue({ id: "c1", status: "PUBLISHED" } as any);
      const result: any = await ctrl.forceStatus("c1", "PUBLISHED", mockReq);
      expect(result.status).toBe("PUBLISHED");
    });
  });

  describe("学员管理", () => {
    it("获取课程学员列表", async () => {
      mockCourse.getCourseStudents.mockResolvedValue({ items: [], total: 0 });
      const result: any = await ctrl.getCourseStudents("c1");
      expect(result.items).toHaveLength(0);
    });

    it("查看学生学习进度", async () => {
      mockCourse.getStudentProgress.mockResolvedValue({ userId: "u1", progress: 80 });
      const result: any = await ctrl.getStudentProgress("c1", "u1");
      expect(result.progress).toBe(80);
    });
  });

  describe("评价管理", () => {
    it("回复评价", async () => {
      mockCourse.replyReview.mockResolvedValue({ id: "r1", reply: "感谢反馈" } as any);
      const result: any = await ctrl.replyReview("r1", "感谢反馈");
      expect(result.reply).toBe("感谢反馈");
    });

    it("隐藏/恢复评价", async () => {
      mockCourse.toggleReviewStatus.mockResolvedValue({ id: "r1", status: "HIDDEN" } as any);
      const result: any = await ctrl.toggleReviewStatus("r1", "HIDDEN");
      expect(result.status).toBe("HIDDEN");
    });

    it("查看所有评价含隐藏", async () => {
      mockCourse.listAllReviews.mockResolvedValue({ items: [], total: 0 });
      const result: any = await ctrl.listAllReviews("c1");
      expect(result.items).toHaveLength(0);
    });
  });

  describe("作业批改", () => {
    it("评分作业", async () => {
      mockCourse.scoreWork.mockResolvedValue({ id: "w1", score: 95 } as any);
      const result: any = await ctrl.scoreWork("w1", mockReq, 95, "很好");
      expect(result.score).toBe(95);
    });

    it("AI单题批改", async () => {
      mockCourse.aiScoreWork.mockResolvedValue({ score: 85 } as any);
      const result: any = await ctrl.aiScoreWork("w1");
      expect(result.score).toBe(85);
    });

    it("AI批量批改", async () => {
      mockCourse.aiBatchScoreWorks.mockResolvedValue({ count: 10 } as any);
      const result: any = await ctrl.aiBatchScoreWorks("c1");
      expect(result.count).toBe(10);
    });
  });

  describe("问答管理", () => {
    it("回答问题", async () => {
      mockCourse.answerQuestion.mockResolvedValue({ id: "qa1", content: "回答" } as any);
      const result: any = await ctrl.answerQuestion(mockReq, "qa1", { content: "回答" } as any);
      expect(result.content).toBe("回答");
    });

    it("AI生成回答建议", async () => {
      mockCourse.aiSuggestAnswer.mockResolvedValue({ suggestion: "建议答案" } as any);
      const result: any = await ctrl.aiSuggestAnswer("qa1");
      expect(result.suggestion).toBe("建议答案");
    });
  });
});
