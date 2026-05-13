import { Injectable, Logger } from "@nestjs/common";
import { RagService } from "../ai-gateway/rag.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";

export interface AssistantReply {
  answer: string;
  sources: Array<{ id: string; content: string; similarity: number }>;
}

/**
 * 圈主助理服务 — 使用 RAG 回答圈子内的问题
 */
@Injectable()
export class CircleAssistantService {
  private readonly logger = new Logger(CircleAssistantService.name);

  constructor(private readonly rag: RagService) {}

  /** 向圈主助理提问（非流式） */
  async ask(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<AssistantReply> {
    this.logger.log(`圈主助理提问 [circle=${circleId}]: ${question.slice(0, 100)}`);
    return this.rag.askCircle(question, circleId, userId, history);
  }

  /** 向圈主助理提问（流式） */
  askStream(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    this.logger.log(`圈主助理流式提问 [circle=${circleId}]: ${question.slice(0, 100)}`);
    return this.rag.askCircleStream(question, circleId, userId, history);
  }
}
