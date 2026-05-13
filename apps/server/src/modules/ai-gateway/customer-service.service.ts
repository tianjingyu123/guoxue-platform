import { Injectable, Logger } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";
import { AiMessage } from "./adapters/base.adapter";

const CUSTOMER_SERVICE_PROMPT = `你是热卜国学平台的智能客服助手。你的职责是帮助用户解决平台使用问题。

规则：
1. 优先根据提供的帮助文档/FAQ内容回答，不编造信息
2. 如果问题超出知识范围，引导用户输入"转人工"联系人工客服
3. 回答风格亲切友好，使用简洁中文
4. 可在回答中推荐相关课程、商品、圈子（根据知识库内容）
5. 不要承诺退款、赔偿等需要人工处理的事项`;

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(private readonly gateway: AiGatewayService) {}

  /** 智能客服对话（非流式） */
  async ask(
    question: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<{ answer: string; needHuman: boolean }> {
    const messages: AiMessage[] = [
      { role: "system", content: CUSTOMER_SERVICE_PROMPT },
      ...(history || []),
      { role: "user", content: question },
    ];

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

    return { answer: result.content, needHuman };
  }

  /** 智能客服流式对话 */
  async *askStream(
    question: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    const messages: AiMessage[] = [
      { role: "system", content: CUSTOMER_SERVICE_PROMPT },
      ...(history || []),
      { role: "user", content: question },
    ];

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
