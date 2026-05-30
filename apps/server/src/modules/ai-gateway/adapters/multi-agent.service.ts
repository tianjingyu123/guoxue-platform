import { Injectable, Logger } from "@nestjs/common";
import { AiMessage } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/**
 * Agent 角色定义
 */
export interface AgentRole {
  /** 角色唯一标识 */
  id: string;
  /** 角色名称 */
  name: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 可调用的工具列表 */
  tools?: AgentTool[];
  /** 指定模型（默认走网关路由） */
  model?: string;
  /** 优先级（数字越小越优先执行） */
  priority?: number;
}

/**
 * Agent 可调用工具
 */
export interface AgentTool {
  /** 工具名称 */
  name: string;
  /** 工具描述（用于 LLM function calling） */
  description: string;
  /** 参数 JSON Schema */
  parameters: Record<string, unknown>;
  /** 实际执行函数 */
  handler: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * Agent 间消息
 */
export interface AgentMessage {
  /** 发送者 Agent ID */
  from: string;
  /** 接收者 Agent ID（或 "broadcast" 广播） */
  to: string;
  /** 消息类型 */
  type: "task" | "result" | "question" | "handoff" | "summary";
  /** 消息体 */
  content: string;
  /** 附加上下文 */
  context?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 编排策略
 */
export type OrchestrationStrategy =
  | "sequential"   // 顺序执行：A→B→C
  | "parallel"     // 并行执行：A、B、C 同时运行
  | "debate"       // 辩论模式：多Agent辩论后聚合
  | "router"       // 路由模式：根据输入分发到对应Agent
  | "pipeline";    // 流水线：前一个Agent的输出作为后一个的输入

/**
 * 编排任务定义
 */
export interface OrchestrationTask {
  /** 任务ID */
  id: string;
  /** 编排策略 */
  strategy: OrchestrationStrategy;
  /** 参与的 Agent 角色列表 */
  agents: AgentRole[];
  /** 用户输入/初始上下文 */
  input: string;
  /** 最大轮次（辩论模式下有效） */
  maxRounds?: number;
  /** 超时时间(ms) */
  timeout?: number;
}

/**
 * 编排结果
 */
export interface OrchestrationResult {
  taskId: string;
  strategy: OrchestrationStrategy;
  /** 最终输出 */
  output: string;
  /** 各Agent的中间结果 */
  agentResults: Array<{
    agentId: string;
    agentName: string;
    output: string;
    latencyMs: number;
  }>;
  /** 总耗时(ms) */
  totalLatencyMs: number;
  /** 总token消耗 */
  totalTokens: number;
}

/** Gateway 调用签名，避免循环依赖 */
interface GatewayCaller {
  chat(scene: string, messages: AiMessage[]): Promise<{ content: string; usage?: { totalTokens: number } }>;
}

/**
 * 多Agent协作框架
 *
 * 提供Agent角色定义、工具协议、消息总线和编排引擎。
 * 集成 AiGatewayService 实现统一鉴权/限流/日志。
 *
 * 设计目标：
 * - 支持 5 种编排策略（sequential/parallel/debate/router/pipeline）
 * - Agent 间通过消息总线通信
 * - 工具调用采用 Function Calling 协议
 * - 与 AiGatewayService 集成实现统一鉴权/限流/日志
 */
@Injectable()
export class MultiAgentService {
  private readonly logger = new Logger(MultiAgentService.name);

  /** 注册的 Agent 角色 */
  private agents = new Map<string, AgentRole>();

  /** 消息总线监听器 */
  private listeners = new Map<string, Array<(msg: AgentMessage) => void>>();

  /** Gateway 调用者，通过 setter 注入以避免循环依赖 */
  private gateway?: GatewayCaller;

  /** 设置 Gateway 调用者（由 AiGatewayService 在模块初始化时调用） */
  setGateway(gateway: GatewayCaller): void {
    this.gateway = gateway;
  }

  /** 注册Agent角色 */
  registerAgent(agent: AgentRole): void {
    this.agents.set(agent.id, agent);
    this.logger.log(`Agent注册: ${agent.id} (${agent.name})`);
  }

  /** 获取已注册的Agent */
  getAgent(id: string): AgentRole | undefined {
    return this.agents.get(id);
  }

  /** 列出所有已注册Agent */
  listAgents(): AgentRole[] {
    return Array.from(this.agents.values());
  }

  /** 发送Agent间消息 */
  async sendMessage(msg: Omit<AgentMessage, "timestamp">): Promise<void> {
    const fullMsg: AgentMessage = { ...msg, timestamp: new Date() };
    const targets = fullMsg.to === "broadcast"
      ? Array.from(this.listeners.keys())
      : [fullMsg.to];

    for (const target of targets) {
      const handlers = this.listeners.get(target) || [];
      for (const handler of handlers) {
        try {
          handler(fullMsg);
        } catch (err: any) {
          this.logger.warn(`消息处理失败 target=${target}: ${err.message}`);
        }
      }
    }
  }

  /** 订阅消息 */
  subscribe(agentId: string, handler: (msg: AgentMessage) => void): void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, []);
    }
    this.listeners.get(agentId)!.push(handler);
  }

  /** 执行编排任务 */
  async execute(task: OrchestrationTask): Promise<OrchestrationResult> {
    const startedAt = Date.now();
    const agentResults: OrchestrationResult["agentResults"] = [];
    const totalTokens = 0;

    this.logger.log(`编排开始: ${task.id} 策略=${task.strategy} agent数=${task.agents.length}`);

    let output: string;

    switch (task.strategy) {
      case "sequential":
        output = await this.executeSequential(task, agentResults, totalTokens);
        break;
      case "parallel":
        output = await this.executeParallel(task, agentResults);
        break;
      case "router":
        output = await this.executeRouter(task, agentResults);
        break;
      case "pipeline":
        output = await this.executePipeline(task, agentResults);
        break;
      case "debate":
        output = await this.executeDebate(task, agentResults);
        break;
      default:
        throw new BusinessException(ErrorCode.BAD_REQUEST, `未知编排策略: ${task.strategy}`);
    }

    const totalLatencyMs = Date.now() - startedAt;
    this.logger.log(`编排完成: ${task.id} 耗时=${totalLatencyMs}ms`);

    return { taskId: task.id, strategy: task.strategy, output, agentResults, totalLatencyMs, totalTokens };
  }

  /** 顺序执行：前一个Agent的输出作为后一个的上下文 */
  private async executeSequential(
    task: OrchestrationTask,
    results: OrchestrationResult["agentResults"],
    _tokens: number,
  ): Promise<string> {
    const sorted = [...task.agents].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    let context = task.input;

    for (const agent of sorted) {
      const t0 = Date.now();
      const messages: AiMessage[] = [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: context },
      ];
      const resp = await this.callAgent(agent, messages);
      results.push({ agentId: agent.id, agentName: agent.name, output: resp.content, latencyMs: Date.now() - t0 });
      context = `前序Agent「${agent.name}」的输出：\n${resp.content}\n\n原始任务：${task.input}`;
    }

    return results[results.length - 1]?.output ?? "";
  }

  /** 并行执行：所有Agent同时运行，汇总结果 */
  private async executeParallel(
    task: OrchestrationTask,
    results: OrchestrationResult["agentResults"],
  ): Promise<string> {
    const promises = task.agents.map(async (agent) => {
      const t0 = Date.now();
      const messages: AiMessage[] = [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: task.input },
      ];
      const resp = await this.callAgent(agent, messages);
      results.push({ agentId: agent.id, agentName: agent.name, output: resp.content, latencyMs: Date.now() - t0 });
      return { agent, content: resp.content };
    });

    const all = await Promise.all(promises);
    return all.map((r) => `【${r.agent.name}】\n${r.content}`).join("\n\n---\n\n");
  }

  /** 路由模式：用轻量级分类选择最佳Agent */
  private async executeRouter(
    task: OrchestrationTask,
    results: OrchestrationResult["agentResults"],
  ): Promise<string> {
    const sorted = [...task.agents].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    // 用第一个（最高优先级）Agent做路由判断
    const router = sorted[0];
    const routePrompt = `你是一个任务路由器。根据用户输入，从以下Agent中选择最合适的一个来处理任务。只回复Agent的ID，不要解释。\n\nAgent列表：\n${sorted.map((a) => `- ${a.id}: ${a.name} — ${a.systemPrompt}`).join("\n")}\n\n用户输入：${task.input}`;

    const t0 = Date.now();
    const routeResp = await this.callAgent(router, [
      { role: "system", content: "你是一个任务路由器，根据输入选择最合适的Agent。" },
      { role: "user", content: routePrompt },
    ]);

    const selectedId = routeResp.content.trim().toLowerCase();
    const selected = sorted.find((a) => a.id.toLowerCase() === selectedId) || sorted[0];
    this.logger.log(`路由决策: ${selected.id} (${selected.name})`);

    const t1 = Date.now();
    const messages: AiMessage[] = [
      { role: "system", content: selected.systemPrompt },
      { role: "user", content: task.input },
    ];
    const resp = await this.callAgent(selected, messages);
    results.push({ agentId: selected.id, agentName: selected.name, output: resp.content, latencyMs: Date.now() - t1 });
    results.push({ agentId: router.id, agentName: `路由:${router.name}`, output: `→ ${selected.id}`, latencyMs: Date.now() - t0 });

    return resp.content;
  }

  /** 流水线模式：每个Agent处理一部分，输出传给下一个 */
  private async executePipeline(
    task: OrchestrationTask,
    results: OrchestrationResult["agentResults"],
  ): Promise<string> {
    const sorted = [...task.agents].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    let data = task.input;

    for (const agent of sorted) {
      const t0 = Date.now();
      const messages: AiMessage[] = [
        { role: "system", content: `${agent.systemPrompt}\n\n你收到的是上一个处理阶段的输出，请基于此继续处理。` },
        { role: "user", content: data },
      ];
      const resp = await this.callAgent(agent, messages);
      results.push({ agentId: agent.id, agentName: agent.name, output: resp.content, latencyMs: Date.now() - t0 });
      data = resp.content;
    }

    return results[results.length - 1]?.output ?? "";
  }

  /** 辩论模式：Agent多轮辩论，每轮互相审阅对方输出，最终汇总共识 */
  private async executeDebate(
    task: OrchestrationTask,
    results: OrchestrationResult["agentResults"],
  ): Promise<string> {
    const maxRounds = task.maxRounds || 3;
    const agents = task.agents.slice(0, 4);

    if (agents.length < 2) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "辩论模式至少需要2个Agent");
    }

    // 第1轮：所有Agent独立分析
    const round1Outputs: Array<{ agent: AgentRole; content: string }> = [];
    for (const agent of agents) {
      const t0 = Date.now();
      const messages: AiMessage[] = [
        { role: "system", content: `${agent.systemPrompt}\n\n这是多Agent辩论的第1轮，请独立给出你的分析和观点。` },
        { role: "user", content: task.input },
      ];
      const resp = await this.callAgent(agent, messages);
      round1Outputs.push({ agent, content: resp.content });
      results.push({ agentId: agent.id, agentName: `辩论:${agent.name}`, output: resp.content, latencyMs: Date.now() - t0 });
    }

    // 第2-N轮：Agent互相审阅并反驳/补充
    let roundOutputs = round1Outputs;
    for (let round = 2; round <= maxRounds; round++) {
      const prevOutputsSummary = roundOutputs
        .map((o) => `【${o.agent.name}】的观点：\n${o.content.slice(0, 500)}`)
        .join("\n\n---\n\n");

      const newOutputs: typeof round1Outputs = [];
      for (const agent of agents) {
        const t0 = Date.now();
        const messages: AiMessage[] = [
          {
            role: "system",
            content: `${agent.systemPrompt}\n\n这是多Agent辩论的第${round}轮。以下是上一轮各Agent的观点，请审阅后给出你的反驳、补充或新见解。在分析其他Agent观点的同时，完善自己的论证。`,
          },
          { role: "user", content: `原始问题：${task.input}\n\n上一轮观点汇总：\n${prevOutputsSummary}\n\n请以"${agent.name}"的身份，给出第${round}轮观点。` },
        ];
        const resp = await this.callAgent(agent, messages);
        newOutputs.push({ agent, content: resp.content });
        results.push({ agentId: agent.id, agentName: `辩论R${round}:${agent.name}`, output: resp.content, latencyMs: Date.now() - t0 });
      }
      roundOutputs = newOutputs;
    }

    // 最终汇总：让第一个Agent做总结
    const finalSummary = roundOutputs
      .map((o) => `【${o.agent.name}】最终观点：\n${o.content.slice(0, 800)}`)
      .join("\n\n---\n\n");

    const synthesizer = agents[0];
    const synthMessages: AiMessage[] = [
      {
        role: "system",
        content: `你是辩论总结官。请基于以下${agents.length}位专家的${maxRounds}轮辩论结果，给出综合结论。需要指出各方共识点、分歧点，以及最终的推荐方案。`,
      },
      { role: "user", content: `原始问题：${task.input}\n\n辩论结果：\n${finalSummary}\n\n请给出综合结论（含共识、分歧、推荐方案）。` },
    ];
    const synthResp = await this.callAgent(synthesizer, synthMessages);
    results.push({ agentId: "synthesizer", agentName: "辩论总结", output: synthResp.content, latencyMs: 0 });

    return synthResp.content;
  }

  /** 调用Agent（通过Gateway统一出口） */
  private async callAgent(
    agent: AgentRole,
    messages: AiMessage[],
  ): Promise<{ content: string; usage?: { totalTokens: number } }> {
    if (!this.gateway) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "MultiAgentService 尚未绑定 Gateway。请确保 AiGatewayService 已调用 setGateway()。");
    }
    return this.gateway.chat("multi-agent", messages);
  }

  /** 创建预定义Agent（国学平台常用角色） */
  createPresetAgents(): void {
    this.registerAgent({
      id: "content-reviewer",
      name: "内容审核员",
      systemPrompt: "你是国学内容审核专家，负责审核UGC内容是否符合平台规范。请基于国学传统文化价值观进行审核判断。",
      priority: 1,
    });

    this.registerAgent({
      id: "knowledge-curator",
      name: "知识策展人",
      systemPrompt: "你是国学知识策展人，负责从用户内容中萃取、整理、归类国学知识，提炼有价值的见解。",
      priority: 2,
    });

    this.registerAgent({
      id: "bazi-analyst",
      name: "八字分析师",
      systemPrompt: "你是八字命理分析师，精通渊海子平、三命通会等经典。请基于传统命理学给出专业分析。",
      priority: 3,
    });

    this.registerAgent({
      id: "classic-scholar",
      name: "经典学者",
      systemPrompt: "你是国学经典研究学者，精通四书五经、诸子百家。请引经据典，给出权威解读。",
      priority: 3,
    });

    this.registerAgent({
      id: "customer-service",
      name: "智能客服",
      systemPrompt: "你是国学平台智能客服，帮助用户解决平台使用问题，引导用户了解平台功能。",
      priority: 4,
    });

    this.logger.log(`预置Agent创建完成，共 ${this.agents.size} 个`);
  }
}
