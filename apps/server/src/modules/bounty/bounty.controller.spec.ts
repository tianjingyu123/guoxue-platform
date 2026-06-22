import { Test } from "@nestjs/testing";
import { BountyController } from "./bounty.controller";
import { BountyService } from "./bounty.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockBountySvc = {
  createQuestion: jest.fn().mockResolvedValue({ id: "q1", title: "测试悬赏" }),
  list: jest.fn().mockResolvedValue({ items: [{ id: "q1" }], total: 1, page: 1, pageSize: 20 }),
  getById: jest.fn().mockResolvedValue({ id: "q1", title: "测试悬赏" }),
  claim: jest.fn().mockResolvedValue({ id: "q1", claimedBy: "u1" }),
  answer: jest.fn().mockResolvedValue({ id: "a1", content: "测试回答" }),
  settle: jest.fn().mockResolvedValue({ id: "q1", status: "settled" }),
  refund: jest.fn().mockResolvedValue({ id: "q1", status: "refunded" }),
};

describe("BountyController", () => {
  let ctrl: BountyController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BountyController],
      providers: [
        { provide: BountyService, useValue: mockBountySvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(BountyController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("POST /bounty/questions — 发布悬赏", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "测试悬赏", content: "测试内容", bounty: 100 };
    const result = await ctrl.create(req, dto);
    expect(result).toBeDefined();
    expect(mockBountySvc.createQuestion).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /bounty/questions — 悬赏列表", async () => {
    const result = await ctrl.list("1", "20", "cat1", "open");
    expect(result).toBeDefined();
    expect(mockBountySvc.list).toHaveBeenCalledWith(1, 20, "cat1", "open", undefined);
  });

  it("GET /bounty/questions/:id — 悬赏详情", async () => {
    const result = await ctrl.getById("q1");
    expect(result).toBeDefined();
    expect(mockBountySvc.getById).toHaveBeenCalledWith("q1");
  });

  it("POST /bounty/questions/:id/claim — 抢答", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.claim(req, "q1");
    expect(result).toBeDefined();
    expect(mockBountySvc.claim).toHaveBeenCalledWith("u1", "q1");
  });

  it("POST /bounty/questions/:id/answer — 提交回答", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { content: "测试回答" };
    const result = await ctrl.answer(req, "q1", dto);
    expect(result).toBeDefined();
    expect(mockBountySvc.answer).toHaveBeenCalledWith("u1", "q1", dto);
  });

  it("POST /bounty/questions/:id/settle — 确认满意解付赏金", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.settle(req, "q1");
    expect(result).toBeDefined();
    expect(mockBountySvc.settle).toHaveBeenCalledWith("u1", "q1");
  });

  it("POST /bounty/questions/:id/refund — 退款（操作人取自 req.user.id）", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.refund(req, "q1");
    expect(result).toBeDefined();
    expect(mockBountySvc.refund).toHaveBeenCalledWith("u1", "q1");
  });
});
