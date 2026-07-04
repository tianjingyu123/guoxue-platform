import { Test } from "@nestjs/testing";
import { MarketingContentService, MARKETING_MONTHLY_LIMIT } from "./marketing-content.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const mockPrisma = {
  marketingContent: {
    count: jest.fn(),
    create: jest.fn(),
  },
};

const mockGateway = {
  chat: jest.fn(),
};

const mockAudit = {
  moderateTextOrThrow: jest.fn(),
};

describe("MarketingContentService（课-P1 AI 获客内容套件）", () => {
  let svc: MarketingContentService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MarketingContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    svc = mod.get(MarketingContentService);
  });

  beforeEach(() => jest.clearAllMocks());

  // 1. 月限额：当月已达上限 → 业务异常，且不调 AI、不落库
  it("月限额：当月 count ≥ 限额 → 抛业务异常且不调AI", async () => {
    mockPrisma.marketingContent.count.mockResolvedValue(MARKETING_MONTHLY_LIMIT);

    await expect(svc.generate("u1", "MOMENTS", "今日小暑")).rejects.toThrow(BusinessException);
    expect(mockGateway.chat).not.toHaveBeenCalled();
    expect(mockAudit.moderateTextOrThrow).not.toHaveBeenCalled();
    expect(mockPrisma.marketingContent.create).not.toHaveBeenCalled();
  });

  // 2. 审核拦截：审核漏斗抛异常 → 向上传播，不落库
  it("审核拦截：moderateTextOrThrow 拦截 → 异常传播且不落库", async () => {
    mockPrisma.marketingContent.count.mockResolvedValue(0);
    mockGateway.chat.mockResolvedValue({ content: "违规文案示例" });
    mockAudit.moderateTextOrThrow.mockRejectedValue(new BusinessException(ErrorCode.BAD_REQUEST, "内容含违规词"));

    await expect(svc.generate("u1", "SHORT_VIDEO", "改运秘籍")).rejects.toThrow("内容含违规词");
    expect(mockAudit.moderateTextOrThrow).toHaveBeenCalledWith(
      "违规文案示例",
      expect.objectContaining({ scene: "MARKETING_CONTENT", userId: "u1" }),
    );
    expect(mockPrisma.marketingContent.create).not.toHaveBeenCalled();
  });

  // 3. 选题规则：纯规则拼装 3-5 条，不调 AI
  it("今日选题：返回 3-5 条选题且不调AI", () => {
    const res = svc.todayTopics();

    expect(res.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.topics.length).toBeGreaterThanOrEqual(3);
    expect(res.topics.length).toBeLessThanOrEqual(5);
    // 至少含模板选题（节气选题仅节气日/临近节气才出现）
    expect(res.topics.some((t) => t.source === "TEMPLATE")).toBe(true);
    for (const t of res.topics) {
      expect(t.title).toBeTruthy();
      expect(["JIEQI", "TEMPLATE"]).toContain(t.source);
    }
    expect(mockGateway.chat).not.toHaveBeenCalled();
  });

  // 4. 成功链路：过审后落库 passedAudit=true，尾部拼 ref 短链
  it("生成成功：过审落库 passedAudit=true 且尾部拼 ref 短链", async () => {
    mockPrisma.marketingContent.count.mockResolvedValue(3);
    mockGateway.chat.mockResolvedValue({ content: "【文案一】小暑至，盛夏始。" });
    mockAudit.moderateTextOrThrow.mockResolvedValue(undefined);
    mockPrisma.marketingContent.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "mc1", ...data }),
    );

    const res = await svc.generate("u1", "MOMENTS", "今日小暑", "轻松");

    expect(res.content).toContain("【文案一】小暑至，盛夏始。");
    expect(res.content).toContain("https://api.rebugx.cn/h5/?ref=u1");
    expect(res.monthlyUsed).toBe(4);
    expect(res.monthlyLimit).toBe(MARKETING_MONTHLY_LIMIT);
    expect(mockPrisma.marketingContent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "u1", kind: "MOMENTS", topic: "今日小暑", passedAudit: true }),
    });
  });
});
