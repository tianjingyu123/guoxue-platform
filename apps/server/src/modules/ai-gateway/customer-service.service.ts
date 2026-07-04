import { Injectable, Logger, Optional } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";
import { VectorService } from "./vector.service";
import { AiMessage } from "./adapters/base.adapter";
import { SystemService } from "../system/system.service";

/** 客服系统提示词（品牌名走 BrandConfig 注入·其余语义一字不动） */
const buildCustomerServicePrompt = (brandName: string) => `你是${brandName}平台的智能客服助手。你的职责是帮助用户解决平台使用问题。

规则：
1. 优先根据提供的知识库内容回答，不要编造信息
2. 如果知识库中没有相关信息，诚实告知并引导用户输入"转人工"联系人工客服
3. 回答风格亲切友好，使用简洁中文
4. 可在回答中推荐相关课程、商品、圈子（根据知识库内容）
5. 不要承诺退款、赔偿等需要人工处理的事项
6. 回答时引用具体的知识来源`;

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly vector: VectorService,
    // SystemModule 为 @Global 导出·@Optional 保证单测缺 provider 时回退默认品牌名
    @Optional() private readonly systemService?: SystemService,
  ) {}

  /** 品牌名（后台 BrandConfig 可配·拉取失败/未注入时兜底"热卜国学"，与历史口径一致） */
  private async getBrandName(): Promise<string> {
    try {
      const cfg = await this.systemService?.getBrandConfig();
      return (cfg as { siteName?: string } | undefined)?.siteName || "热卜国学";
    } catch {
      return "热卜国学";
    }
  }

  /** 智能客服对话（非流式 + RAG） */
  async ask(
    question: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<{ answer: string; needHuman: boolean; sources?: Array<{ content: string; similarity: number }> }> {
    // 1. 向量化问题
    const [queryVec] = await this.vector.embed([question]);
    if (!queryVec) {
      return { answer: '抱歉，系统暂时无法处理您的问题，请输入"转人工"联系人工客服。', needHuman: true };
    }

    // 2. 全平台知识库检索（不区分圈子，取前5条最相似）
    const chunks = await this.vector.searchPublicKnowledge(queryVec, 5);

    // 3. 构建 RAG 上下文
    let contextText = "";
    if (chunks.length > 0) {
      contextText = chunks
        .map((c, i) => `[参考${i + 1}] ${c.content}`)
        .join("\n\n");
    }

    const messages: AiMessage[] = [
      { role: "system", content: buildCustomerServicePrompt(await this.getBrandName()) },
      ...(contextText ? [{ role: "system", content: `知识库内容：\n${contextText}` } as AiMessage] : []),
      ...(history || []),
      { role: "user", content: question },
    ];

    // 4. 调用 AI 生成回答
    const result = await this.gateway.chat({
      scene: "customer_service",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    });

    const needHuman =
      result.content.includes("转人工") ||
      result.content.includes("人工客服") ||
      question.includes("转人工");

    return {
      answer: result.content,
      needHuman,
      sources: chunks.slice(0, 3).map((c) => ({ content: c.content.slice(0, 100), similarity: c.similarity })),
    };
  }

  /** 智能客服流式对话（+ RAG） */
  async *askStream(
    question: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    // 1. 向量检索
    const [queryVec] = await this.vector.embed([question]);
    let chunks: Array<{ id: string; content: string; similarity: number }> = [];
    if (queryVec) {
      chunks = await this.vector.searchPublicKnowledge(queryVec, 5);
    }

    // 2. 构建上下文
    let contextText = "";
    if (chunks.length > 0) {
      contextText = chunks.map((c, i) => `[参考${i + 1}] ${c.content}`).join("\n\n");
    }

    const messages: AiMessage[] = [
      { role: "system", content: buildCustomerServicePrompt(await this.getBrandName()) },
      ...(contextText ? [{ role: "system", content: `知识库内容：\n${contextText}` } as AiMessage] : []),
      ...(history || []),
      { role: "user", content: question },
    ];

    // 3. 流式输出
    for await (const chunk of this.gateway.chatStream({
      scene: "customer_service",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    })) {
      yield chunk;
    }
  }
}
