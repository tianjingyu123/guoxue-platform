import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { CircleDashboardController } from "./circle-dashboard.controller";
import { CircleDashboardService } from "./circle-dashboard.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockService: Record<string, jest.Mock> = {
  getOverview: jest.fn(),
  getTrends: jest.fn(),
  getRevenueBreakdown: jest.fn(),
  getTopContributors: jest.fn(),
  getHotContent: jest.fn(),
  getRecentMembers: jest.fn(),
  getChurnWarning: jest.fn(),
  getPendingQuestions: jest.fn(),
  getKnowledgeCandidates: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("CircleDashboardController", () => {
  let ctrl: CircleDashboardController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CircleDashboardController],
      providers: [{ provide: CircleDashboardService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CircleDashboardController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("圈主概览", async () => {
    mockService.getOverview.mockResolvedValue({ memberCount: 120, monthlyNew: 15, revenue: 5000 });
    const result: any = await ctrl.getOverview("circle1");
    expect(result.memberCount).toBe(120);
    expect(result.monthlyNew).toBe(15);
  });

  it("成员增长+收入趋势", async () => {
    mockService.getTrends.mockResolvedValue({ members: [10, 12, 15], revenue: [100, 200, 300] });
    const result: any = await ctrl.getTrends("circle1");
    expect(result.members).toHaveLength(3);
  });

  it("收入来源占比", async () => {
    mockService.getRevenueBreakdown.mockResolvedValue({ entryFee: 60, course: 25, shop: 10, qa: 5 });
    const result: any = await ctrl.getRevenueBreakdown("circle1");
    expect(result.entryFee).toBe(60);
  });

  it("活跃成员贡献榜", async () => {
    mockService.getTopContributors.mockResolvedValue([{ userId: "u1", contribution: 500 }]);
    const result: any = await ctrl.getTopContributors("circle1");
    expect(result).toHaveLength(1);
  });

  it("热门内容Top5", async () => {
    mockService.getHotContent.mockResolvedValue([{ id: "c1", title: "热门帖" }]);
    const result: any = await ctrl.getHotContent("circle1");
    expect(result).toHaveLength(1);
  });

  it("最近加入成员", async () => {
    mockService.getRecentMembers.mockResolvedValue([{ userId: "u1", joinedAt: new Date() }]);
    const result: any = await ctrl.getRecentMembers("circle1");
    expect(result).toHaveLength(1);
  });

  it("成员流失预警", async () => {
    mockService.getChurnWarning.mockResolvedValue([{ userId: "u1", lastActive: "14天前" }]);
    const result: any = await ctrl.getChurnWarning("circle1");
    expect(result).toHaveLength(1);
  });

  it("待回复付费提问", async () => {
    mockService.getPendingQuestions.mockResolvedValue([{ id: "q1", question: "问题" }]);
    const result: any = await ctrl.getPendingQuestions("circle1");
    expect(result).toHaveLength(1);
  });

  it("待确认知识库候选", async () => {
    mockService.getKnowledgeCandidates.mockResolvedValue([{ id: "c1", content: "候选" }]);
    const result: any = await ctrl.getKnowledgeCandidates("circle1");
    expect(result).toHaveLength(1);
  });
});
