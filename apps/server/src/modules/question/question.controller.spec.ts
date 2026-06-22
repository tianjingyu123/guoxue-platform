import { Test } from "@nestjs/testing";
import { QuestionController } from "./question.controller";
import { QuestionService } from "./question.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

const mockQuestionSvc = {
  ask: jest.fn().mockResolvedValue({ id: "q1", status: "PENDING" }),
  answer: jest.fn().mockResolvedValue({ id: "q1", status: "ANSWERED" }),
  reject: jest.fn().mockResolvedValue({ id: "q1", status: "REJECTED" }),
  peek: jest.fn().mockResolvedValue({ id: "q1", canView: true }),
  listQuestions: jest.fn().mockResolvedValue([{ id: "q1", title: "八字问题" }]),
  getQuestion: jest.fn().mockResolvedValue({ id: "q1", title: "八字问题", answer: "..." }),
  refundExpiredQuestions: jest.fn().mockResolvedValue({ refunded: 3 }),
};

describe("QuestionController", () => {
  let ctrl: QuestionController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [QuestionController],
      providers: [{ provide: QuestionService, useValue: mockQuestionSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(OptionalAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(QuestionController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /question/ask — 发起付费提问", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetUserId: "u2", title: "八字问题", content: "...", amount: 50 };
    const result: any = await ctrl.ask(req, dto);
    expect(result.status).toBe("PENDING");
    expect(mockQuestionSvc.ask).toHaveBeenCalledWith("u1", dto);
  });

  it("POST /question/:id/answer — 回答问题", async () => {
    const req: any = { user: { id: "u2" } };
    const dto: any = { content: "解答..." };
    const result: any = await ctrl.answer(req, "q1", dto);
    expect(result.status).toBe("ANSWERED");
    expect(mockQuestionSvc.answer).toHaveBeenCalledWith("u2", "q1", dto);
  });

  it("POST /question/:id/reject — 拒绝提问", async () => {
    const req: any = { user: { id: "u2" } };
    const dto: any = { reason: "无法回答" };
    const result: any = await ctrl.reject(req, "q1", dto);
    expect(result.status).toBe("REJECTED");
    expect(mockQuestionSvc.reject).toHaveBeenCalledWith("u2", "q1", "无法回答");
  });

  it("POST /question/:id/peek — 围观答案", async () => {
    const req: any = { user: { id: "u3" } };
    const result: any = await ctrl.peek(req, "q1");
    expect(result.canView).toBe(true);
    expect(mockQuestionSvc.peek).toHaveBeenCalledWith("u3", "q1");
  });

  it("GET /question — 问答列表", async () => {
    const q: any = { circleId: "c1", page: 1, pageSize: 20 };
    const result: any = await ctrl.listQuestions(q);
    expect(result).toHaveLength(1);
    expect(mockQuestionSvc.listQuestions).toHaveBeenCalledWith(q);
  });

  it("GET /question/:id — 问答详情（登录用户，传 currentUserId）", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getQuestion(req, "q1");
    expect(result.title).toBe("八字问题");
    expect(mockQuestionSvc.getQuestion).toHaveBeenCalledWith("q1", "u1");
  });

  it("GET /question/:id — 问答详情（匿名访问，currentUserId 为 undefined）", async () => {
    const req: any = {};
    const result: any = await ctrl.getQuestion(req, "q1");
    expect(result.title).toBe("八字问题");
    expect(mockQuestionSvc.getQuestion).toHaveBeenCalledWith("q1", undefined);
  });

  it("POST /question/admin/refund-expired — 超时退款", async () => {
    const result: any = await ctrl.refundExpired();
    expect(result.refunded).toBe(3);
    expect(mockQuestionSvc.refundExpiredQuestions).toHaveBeenCalled();
  });
});
