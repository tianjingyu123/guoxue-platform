import { CircleKnowledgeService } from "./circle-knowledge.service";
import { BusinessException } from "../../common/business.exception";

/**
 * #38 「从达人回答提炼知识候选」单测（extractFromExpertAnswers）。
 * 直接实例化（mock prisma/vector/aiGateway），不走 Nest DI。
 */

function buildSvc() {
  const prisma = {
    paidQuestion: { findMany: jest.fn() },
    circleKnowledge: { findUnique: jest.fn() },
    circleKnowledgeCandidate: { create: jest.fn() },
  };
  const vector = {
    embed: jest.fn().mockResolvedValue([[0.1, 0.2]]),
    searchCircleKnowledge: jest.fn().mockResolvedValue([]),
  };
  const aiGateway = { chat: jest.fn() };
  const svc = new CircleKnowledgeService(prisma as never, vector as never, aiGateway as never);
  return { svc, prisma, vector, aiGateway };
}

const QA = [
  { id: "q1", questionTitle: "入户门对电梯", question: "入户门正对电梯怎么办？", answer: "优先玄关柜或屏风缓冲气流与噪音，其次注意门内光线。" },
  { id: "q2", questionTitle: "北向客厅", question: "北向客厅布局？", answer: "以暖色主光源补足采光，家具靠实墙布置。" },
];

describe("CircleKnowledgeService · #38 达人回答提炼候选", () => {
  it("近 30 天无已回答问答 → created 0 且不调 AI", async () => {
    const { svc, prisma, aiGateway } = buildSvc();
    prisma.paidQuestion.findMany.mockResolvedValue([]);
    const r = await svc.extractFromExpertAnswers("c1");
    expect(r.created).toBe(0);
    expect(r.scanned).toBe(0);
    expect(aiGateway.chat).not.toHaveBeenCalled();
  });

  it("AI 未配置/失败 → 抛友好业务异常，不落任何候选", async () => {
    const { svc, prisma, aiGateway } = buildSvc();
    prisma.paidQuestion.findMany.mockResolvedValue(QA);
    aiGateway.chat.mockRejectedValue(new Error("no api key"));
    await expect(svc.extractFromExpertAnswers("c1")).rejects.toThrow(BusinessException);
    await expect(svc.extractFromExpertAnswers("c1")).rejects.toThrow("AI 服务未配置或暂不可用");
    expect(prisma.circleKnowledgeCandidate.create).not.toHaveBeenCalled();
  });

  it("AI 正常输出（含 ```json 围栏）→ 提炼落候选并回写 sourceId", async () => {
    const { svc, prisma, aiGateway } = buildSvc();
    prisma.paidQuestion.findMany.mockResolvedValue(QA);
    prisma.circleKnowledge.findUnique.mockResolvedValue(null); // 不与已入库重复
    prisma.circleKnowledgeCandidate.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "cand1", ...data }));
    aiGateway.chat.mockResolvedValue({
      content:
        '```json\n[{"questionIndex":1,"content":"入户门正对电梯时，优先考虑玄关柜或屏风缓冲气流与噪音，同时兼顾门内采光与动线。"},{"questionIndex":2,"content":"北向客厅宜以暖色主光源补足采光，家具沿实墙布置以稳住空间重心。"}]\n```',
    });

    const r = await svc.extractFromExpertAnswers("c1");
    expect(r.scanned).toBe(2);
    expect(r.created).toBe(2);
    expect(prisma.circleKnowledgeCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceType: "expert_qa", sourceId: "q1" }),
      }),
    );
  });

  it("AI 输出不可解析/条目过短 → created 0（不落垃圾）", async () => {
    const { svc, prisma, aiGateway } = buildSvc();
    prisma.paidQuestion.findMany.mockResolvedValue(QA);
    aiGateway.chat.mockResolvedValue({ content: '[{"questionIndex":1,"content":"太短"}]' });
    const r = await svc.extractFromExpertAnswers("c1");
    expect(r.created).toBe(0);
    expect(prisma.circleKnowledgeCandidate.create).not.toHaveBeenCalled();
  });

  it("单条候选落库失败（向量异常）只跳过该条，不影响其余", async () => {
    const { svc, prisma, vector, aiGateway } = buildSvc();
    prisma.paidQuestion.findMany.mockResolvedValue(QA);
    prisma.circleKnowledge.findUnique.mockResolvedValue(null);
    prisma.circleKnowledgeCandidate.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "cand", ...data }));
    // 第一条相似度检测抛错 → 跳过；第二条正常
    vector.embed.mockRejectedValueOnce(new Error("embedding down")).mockResolvedValue([[0.1]]);
    aiGateway.chat.mockResolvedValue({
      content:
        '[{"questionIndex":1,"content":"入户门正对电梯时，优先考虑玄关柜或屏风缓冲气流与噪音，兼顾采光。"},{"questionIndex":2,"content":"北向客厅宜以暖色主光源补足采光，家具沿实墙布置稳住重心。"}]',
    });

    const r = await svc.extractFromExpertAnswers("c1");
    expect(r.created).toBe(1);
  });
});
