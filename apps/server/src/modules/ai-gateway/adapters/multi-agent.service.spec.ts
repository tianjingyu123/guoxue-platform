import { Test } from "@nestjs/testing";
import { MultiAgentService, AgentRole, OrchestrationTask } from "./multi-agent.service";

describe("MultiAgentService", () => {
  let svc: MultiAgentService;
  let gatewayChat: jest.Mock;

  const mockAgent = (overrides: Partial<AgentRole> = {}): AgentRole => ({
    id: "test-agent",
    name: "测试Agent",
    systemPrompt: "你是一个测试Agent。",
    priority: 1,
    ...overrides,
  });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [MultiAgentService],
    }).compile();
    svc = mod.get(MultiAgentService);
    gatewayChat = jest.fn();
    svc.setGateway({ chat: gatewayChat });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 清除之前测试注册的Agent
    (svc as any).agents.clear();
    svc.createPresetAgents();
  });

  describe("Agent注册与管理", () => {
    it("注册Agent后可通过 getAgent 获取", () => {
      svc.registerAgent(mockAgent({ id: "a1", name: "审核员" }));
      expect(svc.getAgent("a1")?.name).toBe("审核员");
    });

    it("未注册的Agent返回 undefined", () => {
      expect(svc.getAgent("no-such")).toBeUndefined();
    });

    it("listAgents 返回所有已注册Agent", () => {
      svc.registerAgent(mockAgent({ id: "a2" }));
      svc.registerAgent(mockAgent({ id: "a3" }));
      expect(svc.listAgents().length).toBeGreaterThanOrEqual(2);
    });

    it("createPresetAgents 创建5个预置角色", () => {
      const agents = svc.listAgents();
      expect(agents.length).toBe(5);
      expect(agents.map((a) => a.id)).toEqual(
        expect.arrayContaining(["content-reviewer", "knowledge-curator", "bazi-analyst", "classic-scholar", "customer-service"]),
      );
    });
  });

  describe("消息总线", () => {
    it("sendMessage 触发对应订阅者", async () => {
      const handler = jest.fn();
      svc.subscribe("agent-x", handler);

      await svc.sendMessage({ from: "agent-y", to: "agent-x", type: "task", content: "处理这个" });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ from: "agent-y", to: "agent-x", type: "task", content: "处理这个" }),
      );
    });

    it("broadcast 消息发送给所有订阅者", async () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      svc.subscribe("a", h1);
      svc.subscribe("b", h2);

      await svc.sendMessage({ from: "sys", to: "broadcast", type: "summary", content: "公告" });

      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    it("handler 异常不阻断其他订阅者", async () => {
      const good = jest.fn();
      const bad = jest.fn().mockImplementation(() => { throw new Error("boom"); });
      svc.subscribe("target", bad);
      svc.subscribe("target", good);

      await svc.sendMessage({ from: "x", to: "target", type: "result", content: "ok" });

      expect(good).toHaveBeenCalled();
    });
  });

  describe("execute — 编排策略", () => {
    const task = (strategy: OrchestrationTask["strategy"], agents: AgentRole[], overrides?: Partial<OrchestrationTask>): OrchestrationTask => ({
      id: "task-1",
      strategy,
      agents,
      input: "请帮我分析这段古文的意义。",
      ...overrides,
    });

    it("sequential — 顺序执行所有Agent，前一个输出传给下一个", async () => {
      gatewayChat
        .mockResolvedValueOnce({ content: "第一步分析结果" })
        .mockResolvedValueOnce({ content: "第二步综合结果" });

      const agents = [
        mockAgent({ id: "a1", name: "第一步", systemPrompt: "分析文本。", priority: 1 }),
        mockAgent({ id: "a2", name: "第二步", systemPrompt: "综合整理。", priority: 2 }),
      ];

      const result = await svc.execute(task("sequential", agents));

      expect(result.strategy).toBe("sequential");
      expect(result.output).toBe("第二步综合结果");
      expect(result.agentResults).toHaveLength(2);
      expect(result.agentResults[0].agentId).toBe("a1");
      expect(result.agentResults[1].agentId).toBe("a2");
      // 第二个Agent收到的消息应包含第一个Agent的输出
      const call2Messages = gatewayChat.mock.calls[1][1];
      expect(call2Messages[1].content).toContain("第一步分析结果");
    });

    it("sequential — Agent按优先级排序执行", async () => {
      gatewayChat
        .mockResolvedValueOnce({ content: "低优" })
        .mockResolvedValueOnce({ content: "高优" });

      const agents = [
        mockAgent({ id: "low", name: "低优", systemPrompt: "低", priority: 10 }),
        mockAgent({ id: "high", name: "高优", systemPrompt: "高", priority: 1 }),
      ];

      await svc.execute(task("sequential", agents));

      // 高优先级的先执行
      expect(gatewayChat.mock.calls[0][1][0].content).toBe("高");
    });

    it("parallel — 所有Agent并行执行，汇总结果", async () => {
      gatewayChat
        .mockResolvedValueOnce({ content: "视角A" })
        .mockResolvedValueOnce({ content: "视角B" });

      const agents = [
        mockAgent({ id: "a", name: "分析A", systemPrompt: "A视角" }),
        mockAgent({ id: "b", name: "分析B", systemPrompt: "B视角" }),
      ];

      const result = await svc.execute(task("parallel", agents));

      expect(result.output).toContain("视角A");
      expect(result.output).toContain("视角B");
      expect(result.agentResults).toHaveLength(2);
    });

    it("router — 路由到最匹配的Agent", async () => {
      gatewayChat
        .mockResolvedValueOnce({ content: "bazi-analyst" }) // 路由决策
        .mockResolvedValueOnce({ content: "专业八字分析..." }); // 实际执行

      const agents = [
        mockAgent({ id: "classic-scholar", name: "经典学者", systemPrompt: "经典研究" }),
        mockAgent({ id: "bazi-analyst", name: "八字分析师", systemPrompt: "命理分析" }),
      ];

      const result = await svc.execute(task("router", agents));

      expect(result.output).toBe("专业八字分析...");
      expect(result.agentResults.some((r) => r.agentId === "bazi-analyst")).toBe(true);
    });

    it("router — 路由匹配失败时回退到第一个Agent", async () => {
      gatewayChat
        .mockResolvedValueOnce({ content: "随机文字xyz" }) // 不匹配任何Agent ID
        .mockResolvedValueOnce({ content: "回退结果" });

      const agents = [
        mockAgent({ id: "fallback", name: "回退Agent", systemPrompt: "回退", priority: 1 }),
        mockAgent({ id: "other", name: "其他", systemPrompt: "其他", priority: 2 }),
      ];

      const result = await svc.execute(task("router", agents));

      expect(result.output).toBe("回退结果");
    });

    it("pipeline — 流水线处理，输出依次传递", async () => {
      gatewayChat
        .mockResolvedValueOnce({ content: "阶段1输出" })
        .mockResolvedValueOnce({ content: "阶段2输出" });

      const agents = [
        mockAgent({ id: "s1", name: "阶段1", priority: 1 }),
        mockAgent({ id: "s2", name: "阶段2", priority: 2 }),
      ];

      const result = await svc.execute(task("pipeline", agents));

      expect(result.output).toBe("阶段2输出");
      expect(result.agentResults).toHaveLength(2);
    });

    it("debate — 辩论模式正常执行（已实现，maxRounds=1）", async () => {
      const agents = [
        mockAgent({ id: "a", name: "正方" }),
        mockAgent({ id: "b", name: "反方" }),
      ];

      // maxRounds=1: 第1轮2次 + 最终总结1次 = 3次
      gatewayChat
        .mockResolvedValueOnce({ content: "正方观点" })
        .mockResolvedValueOnce({ content: "反方观点" })
        .mockResolvedValueOnce({ content: "辩论总结" });

      const result = await svc.execute(task("debate", agents, { maxRounds: 1 }));

      expect(result.output).toBe("辩论总结");
      expect(gatewayChat).toHaveBeenCalledTimes(3);
    });

    it("debate — 单个Agent时抛出错误", async () => {
      const agents = [mockAgent({ id: "a" })];
      await expect(svc.execute(task("debate", agents))).rejects.toThrow("至少需要2个Agent");
    });

    it("未绑定Gateway时抛出明确错误", async () => {
      const mod = await Test.createTestingModule({ providers: [MultiAgentService] }).compile();
      const unboundSvc = mod.get(MultiAgentService);
      const agents = [mockAgent()];

      await expect(unboundSvc.execute(task("sequential", agents))).rejects.toThrow("尚未绑定 Gateway");
    });
  });
});
