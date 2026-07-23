import { BusinessException } from "../../common/business.exception";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { StationAssistantService } from "./station-assistant.service";
import { StationDashboardService } from "./station-dashboard.service";

function asyncChunks(...chunks: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
  })();
}
function failingChunks(...chunks: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
    throw new Error("provider stream failed");
  })();
}

async function collectChunks(stream: AsyncIterable<string>): Promise<string> {
  let content = "";
  for await (const chunk of stream) content += chunk;
  return content;
}

describe("StationAssistantService", () => {
  const memory = new Map<string, unknown>();
  const prisma = { station: { findFirst: jest.fn() } };
  const dashboard = {
    getOverview: jest.fn(),
    getTrends: jest.fn(),
    getLinkRanking: jest.fn(),
    getSilentUsers: jest.fn(),
    getSettlementTimer: jest.fn(),
  };
  const gateway = { chat: jest.fn(), chatStream: jest.fn() };
  const redis = {
    getJson: jest.fn(async (key: string) => memory.get(key) ?? null),
    setJson: jest.fn(async (key: string, value: unknown) => {
      memory.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      memory.delete(key);
    }),
  };
  let service: StationAssistantService;

  beforeEach(() => {
    jest.clearAllMocks();
    memory.clear();
    prisma.station.findFirst.mockResolvedValue({ id: "station-1" });
    dashboard.getOverview.mockResolvedValue({
      monthEarned: 120,
      monthAmount: 800,
      monthOrders: 6,
      conversionRate: "0",
      qualification: {
        status: "ACTIVE",
        expireAt: null,
        daysLeft: null,
        expired: false,
        expiringSoon: false,
      },
    });
    dashboard.getTrends.mockResolvedValue({ trends: [{ date: "2026-07-20", earned: 20 }] });
    dashboard.getLinkRanking.mockResolvedValue({
      ranking: [{ type: "PRODUCT", earned: 120, count: 6 }],
    });
    dashboard.getSilentUsers.mockResolvedValue({
      count: 2,
      silentUsers: [
        {
          id: "customer-secret-id",
          nickname: "张三",
          avatar: "secret-avatar",
          phone: "13800000000",
        },
      ],
    });
    dashboard.getSettlementTimer.mockResolvedValue({
      nextSettleDate: "2026-08-15",
      remainingDays: 24,
      pendingSettlement: 120,
    });
    gateway.chat.mockResolvedValue({ content: "建议先复盘商品渠道。", model: "test" });
    gateway.chatStream.mockReturnValue(asyncChunks("建议", "复盘"));
    service = new StationAssistantService(
      prisma as unknown as PrismaService,
      dashboard as unknown as StationDashboardService,
      gateway as unknown as AiGatewayService,
      redis as unknown as RedisService,
    );
  });

  it("仅允许 ACTIVE 且未过期分站使用", async () => {
    prisma.station.findFirst.mockResolvedValue(null);
    await expect(service.chat("user-1", { query: "本月怎么提升？" })).rejects.toThrow(
      BusinessException,
    );
    expect(prisma.station.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: "ACTIVE",
          OR: expect.any(Array),
        }),
      }),
    );
    expect(gateway.chat).not.toHaveBeenCalled();
  });

  it("会话键按 userId、stationId、conversationId 三重隔离", async () => {
    const conversationId = "11111111-1111-4111-8111-111111111111";
    await service.chat("user-a", { query: "问题 A", conversationId });
    prisma.station.findFirst.mockResolvedValue({ id: "station-2" });
    await service.chat("user-b", { query: "问题 B", conversationId });
    const keys = redis.setJson.mock.calls.map((call) => call[0]);
    expect(keys).toContain(`station:assistant:session:user-a:station-1:${conversationId}`);
    expect(keys).toContain(`station:assistant:session:user-b:station-2:${conversationId}`);
  });

  it("经营上下文只含汇总指标，不注入客户 PII", async () => {
    await service.chat("user-1", { query: "沉默客户怎么办？" });
    const request = gateway.chat.mock.calls[0][0];
    const prompt = JSON.stringify(request.messages);
    expect(request.scene).toBe("station_assistant");
    expect(request.skipCache).toBe(true);
    expect(prompt).toContain("silentCustomerCount");
    expect(prompt).not.toContain("张三");
    expect(prompt).not.toContain("13800000000");
    expect(prompt).not.toContain("customer-secret-id");
    expect(prompt).not.toContain("secret-avatar");
  });

  it("可恢复并真删除当前会话记忆", async () => {
    const conversationId = "22222222-2222-4222-8222-222222222222";
    await service.chat("user-1", { query: "第一问", conversationId });
    const restored = await service.getSession("user-1", conversationId);
    expect(restored.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(restored.messages[0].content).toBe("第一问");
    expect(restored.disclaimer).toContain("不构成收益承诺");

    await service.clearSession("user-1", conversationId);
    await expect(service.getSession("user-1", conversationId)).resolves.toEqual({
      conversationId,
      messages: [],
      disclaimer: expect.stringContaining("不构成收益承诺"),
    });
    expect(redis.del).toHaveBeenCalledWith(
      `station:assistant:session:user-1:station-1:${conversationId}`,
    );
  });

  it("conversationId 缺失时生成 UUID，传入时原样沿用", async () => {
    const generated = await service.chat("user-1", { query: "首次提问" });
    expect(generated.conversationId).toMatch(/^[0-9a-f-]{36}$/i);

    const conversationId = "33333333-3333-4333-8333-333333333333";
    const continued = await service.chat("user-1", { query: "继续提问", conversationId });
    expect(continued.conversationId).toBe(conversationId);
  });

  it("流式输出结束后写入用户输入与真实模型输出", async () => {
    const conversationId = "44444444-4444-4444-8444-444444444444";
    const prepared = await service.chatStream("user-1", { query: "给我行动建议", conversationId });
    let content = "";
    for await (const chunk of prepared.stream) content += chunk;

    expect(content).toBe("建议复盘");
    const restored = await service.getSession("user-1", conversationId);
    expect(restored.messages).toEqual([
      expect.objectContaining({ role: "user", content: "给我行动建议" }),
      expect.objectContaining({ role: "assistant", content: "建议复盘" }),
    ]);
  });

  it("模型失败时不留下孤立问题，重试成功后只写入一组问答", async () => {
    const conversationId = "88888888-8888-4888-8888-888888888888";
    gateway.chat.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(service.chat("user-1", { query: "给我行动建议", conversationId })).rejects.toThrow(
      "provider unavailable",
    );
    await expect(service.getSession("user-1", conversationId)).resolves.toEqual({
      conversationId,
      messages: [],
      disclaimer: expect.stringContaining("不构成收益承诺"),
    });

    await service.chat("user-1", { query: "给我行动建议", conversationId });
    const restored = await service.getSession("user-1", conversationId);
    expect(restored.messages).toEqual([
      expect.objectContaining({ role: "user", content: "给我行动建议" }),
      expect.objectContaining({ role: "assistant", content: "建议先复盘商品渠道。" }),
    ]);
  });
  it("流式首包前失败时不留下孤立问题", async () => {
    const conversationId = "99999999-9999-4999-8999-999999999999";
    gateway.chatStream.mockReturnValueOnce(failingChunks());

    const prepared = await service.chatStream("user-1", {
      query: "给我行动建议",
      conversationId,
    });
    await expect(collectChunks(prepared.stream)).rejects.toThrow("provider stream failed");
    await expect(service.getSession("user-1", conversationId)).resolves.toEqual({
      conversationId,
      messages: [],
      disclaimer: expect.stringContaining("不构成收益承诺"),
    });
  });

  it("流式已有部分真实内容时成对保存问题与部分回答", async () => {
    const conversationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    gateway.chatStream.mockReturnValueOnce(failingChunks("部分建议"));

    const prepared = await service.chatStream("user-1", {
      query: "给我行动建议",
      conversationId,
    });
    await expect(collectChunks(prepared.stream)).rejects.toThrow("provider stream failed");
    const restored = await service.getSession("user-1", conversationId);
    expect(restored.messages).toEqual([
      expect.objectContaining({ role: "user", content: "给我行动建议" }),
      expect.objectContaining({
        role: "assistant",
        content: "部分建议",
        incomplete: true,
      }),
    ]);
  });
  it("最多保留最近 20 条且每次写入刷新 30 天 TTL", async () => {
    const conversationId = "55555555-5555-4555-8555-555555555555";
    for (let index = 0; index < 11; index++) {
      await service.chat("user-1", { query: `问题 ${index}`, conversationId });
    }
    const restored = await service.getSession("user-1", conversationId);
    expect(restored.messages).toHaveLength(20);
    expect(redis.setJson).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(Object),
      30 * 24 * 60 * 60,
    );
  });

  it("Redis 记忆故障时 fail-open，仍返回真实 AI 结果", async () => {
    redis.getJson.mockRejectedValueOnce(new Error("redis down"));
    redis.setJson.mockRejectedValueOnce(new Error("redis down"));
    await expect(service.chat("user-1", { query: "给我建议" })).resolves.toEqual(
      expect.objectContaining({ content: "建议先复盘商品渠道。" }),
    );
  });
});
