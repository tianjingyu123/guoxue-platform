import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { RoleType } from "@prisma/client";
import { CompetitionAdminController, CompetitionPublicController, CompetitionJudgeController } from "./competition.controller";
import { CompetitionService } from "./competition.service";
import { CompetitionAdminService } from "./competition-admin.service";
import { StageFlowService } from "./stage-flow.service";
import { TalentService } from "./talent.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockService: Record<string, jest.Mock> = {
  createCompetition: jest.fn(),
  updateCompetition: jest.fn(),
  publishCompetition: jest.fn(),
  startCompetition: jest.fn(),
  finishCompetition: jest.fn(),
  listCompetitions: jest.fn(),
  getCompetition: jest.fn(),
  createRound: jest.fn(),
  getRounds: jest.fn(),
  updateRound: jest.fn(),
  createQuestion: jest.fn(),
  batchCreateQuestions: jest.fn(),
  updateQuestion: jest.fn(),
  listQuestions: jest.fn(),
  listRegistrations: jest.fn(),
  updateRegistration: jest.fn(),
  getRankings: jest.fn(),
  calculateRanking: jest.fn(),
  getCompetitionStats: jest.fn(),
  deleteCompetition: jest.fn(),
  deleteRound: jest.fn(),
  deleteQuestion: jest.fn(),
  register: jest.fn(),
  getRegistration: jest.fn(),
  getMyResults: jest.fn(),
  submitAnswer: jest.fn(),
  batchSubmitAnswers: jest.fn(),
  generatePaper: jest.fn(),
  getCertificateHtml: jest.fn(),
  getAnswerById: jest.fn(),
  manualGrade: jest.fn(),
};

const mockAdminService: Record<string, jest.Mock> = {
  createCompetition: jest.fn(),
  updateCompetition: jest.fn(),
  getStages: jest.fn(),
  generateStages: jest.fn(),
  generatePaper: jest.fn(),
};

const mockStageFlow: Record<string, jest.Mock> = {
  forceAdvance: jest.fn(),
  getFlowStatus: jest.fn(),
};

const mockTalent: Record<string, jest.Mock> = {
  listTalents: jest.fn(),
  getMyProfile: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("CompetitionAdminController", () => {
  let ctrl: CompetitionAdminController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CompetitionAdminController],
      providers: [
        { provide: CompetitionService, useValue: mockService },
        { provide: CompetitionAdminService, useValue: mockAdminService },
        { provide: StageFlowService, useValue: mockStageFlow },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CompetitionAdminController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("创建赛事（走 AdminService·含 stagesConfig 校验）", async () => {
    mockAdminService.createCompetition.mockResolvedValue({ id: "comp1" } as any);
    const result: any = await ctrl.create({ title: "国学大赛" } as any);
    expect(result.id).toBe("comp1");
    expect(mockAdminService.createCompetition).toHaveBeenCalled();
  });

  it("更新赛事（走 AdminService·未开赛可改）", async () => {
    mockAdminService.updateCompetition.mockResolvedValue({ id: "comp1" } as any);
    const result: any = await ctrl.update("comp1", { title: "新标题" } as any);
    expect(result.id).toBe("comp1");
    expect(mockAdminService.updateCompetition).toHaveBeenCalledWith("comp1", { title: "新标题" });
  });

  it("阶段列表", async () => {
    mockAdminService.getStages.mockResolvedValue([{ id: "st1", seq: 1 }] as any);
    const result: any = await ctrl.getStages("comp1");
    expect(result).toHaveLength(1);
  });

  it("生成阶段（幂等）", async () => {
    mockAdminService.generateStages.mockResolvedValue({ created: 2, updated: 0, stages: [] } as any);
    const result: any = await ctrl.generateStages("comp1");
    expect(result.created).toBe(2);
    expect(mockAdminService.generateStages).toHaveBeenCalledWith("comp1");
  });

  it("人工强制推进阶段（透传 seq 数字与操作者）", async () => {
    mockStageFlow.forceAdvance.mockResolvedValue({ from: "JUDGING", to: "DONE", transitioned: true } as any);
    const req: any = { user: { id: "admin1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.advanceStage("comp1", "2", req);
    expect(result.to).toBe("DONE");
    expect(mockStageFlow.forceAdvance).toHaveBeenCalledWith("comp1", 2, "admin1", "127.0.0.1");
  });

  it("赛程流转进程监控", async () => {
    mockStageFlow.getFlowStatus.mockResolvedValue({ currentSeq: 1, stages: [] } as any);
    const result: any = await ctrl.flowStatus("comp1");
    expect(result.currentSeq).toBe(1);
    expect(mockStageFlow.getFlowStatus).toHaveBeenCalledWith("comp1");
  });

  it("AI组卷", async () => {
    mockAdminService.generatePaper.mockResolvedValue({ total: 10, questions: [] } as any);
    const result: any = await ctrl.generatePaper("comp1", { count: 10 } as any);
    expect(result.total).toBe(10);
    expect(mockAdminService.generatePaper).toHaveBeenCalledWith("comp1", { count: 10 });
  });

  it("发布赛事", async () => {
    mockService.publishCompetition.mockResolvedValue({ status: "PUBLISHED" } as any);
    const result: any = await ctrl.publish("comp1");
    expect(result.status).toBe("PUBLISHED");
  });

  it("开始赛事", async () => {
    mockService.startCompetition.mockResolvedValue({ status: "ONGOING" } as any);
    const result: any = await ctrl.start("comp1");
    expect(result.status).toBe("ONGOING");
  });

  it("结束赛事", async () => {
    mockService.finishCompetition.mockResolvedValue({ status: "FINISHED" } as any);
    const result: any = await ctrl.finish("comp1");
    expect(result.status).toBe("FINISHED");
  });

  it("赛事列表", async () => {
    mockService.listCompetitions.mockResolvedValue({ items: [], total: 0 } as any);
    const result: any = await ctrl.list({} as any);
    expect(result.items).toHaveLength(0);
  });

  it("赛事详情", async () => {
    mockService.getCompetition.mockResolvedValue({ id: "comp1" } as any);
    const result: any = await ctrl.get("comp1");
    expect(result.id).toBe("comp1");
  });

  it("创建赛程", async () => {
    mockService.createRound.mockResolvedValue({ id: "r1" } as any);
    const result: any = await ctrl.createRound("comp1", { name: "初赛" } as any);
    expect(result.id).toBe("r1");
  });

  it("赛程列表", async () => {
    mockService.getRounds.mockResolvedValue([{ id: "r1" }] as any);
    const result: any = await ctrl.getRounds("comp1");
    expect(result).toHaveLength(1);
  });

  it("创建题目", async () => {
    mockService.createQuestion.mockResolvedValue({ id: "q1" } as any);
    const result: any = await ctrl.createQuestion("comp1", { content: "题目" } as any);
    expect(result.id).toBe("q1");
  });

  it("批量创建题目", async () => {
    mockService.batchCreateQuestions.mockResolvedValue({ count: 5 } as any);
    const result: any = await ctrl.batchCreateQuestions("comp1", { questions: [{ content: "Q" }, { content: "Q2" }] } as any);
    expect(result.count).toBe(5);
  });

  it("题目列表", async () => {
    mockService.listQuestions.mockResolvedValue({ items: [] } as any);
    const result: any = await ctrl.listQuestions("comp1");
    expect(result.items).toHaveLength(0);
  });

  it("报名列表", async () => {
    mockService.listRegistrations.mockResolvedValue({ items: [] } as any);
    const result: any = await ctrl.listRegistrations("comp1");
    expect(result.items).toHaveLength(0);
  });

  it("排名列表", async () => {
    mockService.getRankings.mockResolvedValue({ items: [] } as any);
    const result: any = await ctrl.getRankings("comp1");
    expect(result.items).toHaveLength(0);
  });

  it("计算排名", async () => {
    mockService.calculateRanking.mockResolvedValue({ success: true } as any);
    const result: any = await ctrl.calculateRanking("comp1");
    expect(result.success).toBe(true);
  });

  it("赛事统计", async () => {
    mockService.getCompetitionStats.mockResolvedValue({ participants: 100 } as any);
    const result: any = await ctrl.getStats("comp1");
    expect(result.participants).toBe(100);
  });

  it("删除赛事", async () => {
    await ctrl.remove("comp1");
    expect(mockService.deleteCompetition).toHaveBeenCalledWith("comp1");
  });
});

describe("CompetitionPublicController", () => {
  let ctrl: CompetitionPublicController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CompetitionPublicController],
      providers: [
        { provide: CompetitionService, useValue: mockService },
        { provide: TalentService, useValue: mockTalent },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CompetitionPublicController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("公开赛事列表", async () => {
    mockService.listCompetitions.mockResolvedValue({ items: [] } as any);
    const result: any = await ctrl.list({} as any);
    expect(result.items).toHaveLength(0);
  });

  it("公开赛事详情", async () => {
    mockService.getCompetition.mockResolvedValue({ id: "c1" } as any);
    const result: any = await ctrl.get("c1");
    expect(result.id).toBe("c1");
  });

  it("公开排名", async () => {
    mockService.getRankings.mockResolvedValue({ items: [] } as any);
    const result: any = await ctrl.getRankings("c1", {} as any);
    expect(result.items).toHaveLength(0);
  });

  it("报名参赛", async () => {
    mockService.register.mockResolvedValue({ id: "reg1" } as any);
    const result: any = await ctrl.register("c1", {}, { user: { id: "u1", roles: [] as RoleType[] } } as any);
    expect(result.id).toBe("reg1");
  });

  it("我的报名状态", async () => {
    mockService.getRegistration.mockResolvedValue({ status: "REGISTERED" } as any);
    const result: any = await ctrl.getMyRegistration("c1", { user: { id: "u1", roles: [] as RoleType[] } } as any);
    expect(result.status).toBe("REGISTERED");
  });

  it("我的比赛成绩", async () => {
    mockService.getMyResults.mockResolvedValue({ score: 95 } as any);
    const result: any = await ctrl.getMyResults("c1", { user: { id: "u1", roles: [] as RoleType[] } } as any);
    expect(result.score).toBe(95);
  });

  it("提交答题", async () => {
    mockService.submitAnswer.mockResolvedValue({ id: "a1" } as any);
    const result: any = await ctrl.submitAnswer("r1", { questionId: "q1", answer: "A" } as any, { user: { id: "u1", roles: [] as RoleType[] } } as any);
    expect(result.id).toBe("a1");
  });

  it("批量提交答题", async () => {
    mockService.batchSubmitAnswers.mockResolvedValue({ count: 10 } as any);
    const result: any = await ctrl.batchSubmit("r1", { registrationId: "reg1", answers: [] }, { user: { id: "u1", roles: [] as RoleType[] } } as any);
    expect(result.count).toBe(10);
  });

  it("获取试卷", async () => {
    mockService.generatePaper.mockResolvedValue({ questions: [] } as any);
    const result: any = await ctrl.getPaper("r1");
    expect(result.questions).toHaveLength(0);
  });

  it("查看电子证书", async () => {
    mockService.getCertificateHtml.mockResolvedValue("<html>证书</html>" as any);
    const result: any = await ctrl.viewCertificate("rank1");
    expect(result).toContain("证书");
  });

  it("人才榜（公开·透传分页）", async () => {
    mockTalent.listTalents.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20, _paginated: true } as any);
    const result: any = await ctrl.listTalents("1", "20");
    expect(result.total).toBe(0);
    expect(mockTalent.listTalents).toHaveBeenCalledWith("1", "20");
  });

  it("我的战绩档案（JWT·取当前用户）", async () => {
    mockTalent.getMyProfile.mockResolvedValue({ userId: "u1", talentScore: 102 } as any);
    const result: any = await ctrl.myTalentProfile({ user: { id: "u1", roles: [] as RoleType[] } } as any);
    expect(result.talentScore).toBe(102);
    expect(mockTalent.getMyProfile).toHaveBeenCalledWith("u1");
  });
});

describe("CompetitionJudgeController", () => {
  let ctrl: CompetitionJudgeController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CompetitionJudgeController],
      providers: [{ provide: CompetitionService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CompetitionJudgeController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("评委评分", async () => {
    mockService.getAnswerById.mockResolvedValue({ registrationId: "reg1", questionId: "q1" } as any);
    mockService.manualGrade.mockResolvedValue({ score: 85 } as any);
    const result: any = await ctrl.gradeAnswer("a1", { score: 85, comment: "优秀" } as any, { user: { id: "judge1", roles: [] as RoleType[] } } as any);
    expect(result.score).toBe(85);
    expect(mockService.manualGrade).toHaveBeenCalledWith("reg1", "q1", 85, "judge1", "优秀");
  });
});
