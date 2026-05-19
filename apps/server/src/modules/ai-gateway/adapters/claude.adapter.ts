import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse, AiTimeoutError } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/**
 * Claude 模型适配器（P1 预留）
 *
 * 当需要使用 Anthropic Claude 模型时，实现此适配器。
 * 目前为桩代码，待 Anthropic API 接入后补全。
 *
 * @see https://docs.anthropic.com/en/api
 */
export class ClaudeAdapter implements AiModelAdapter {
  readonly provider = "anthropic";

  async chat(
    _model: string,
    _messages: AiMessage[],
    _options?: AiChatOptions,
  ): Promise<AiChatResponse> {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Claude适配器尚未实现。请配置 ANTHROPIC_API_KEY 后启用。");
  }

  async *chatStream(
    _model: string,
    _messages: AiMessage[],
    _options?: AiChatOptions,
  ): AsyncIterable<string> {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Claude适配器尚未实现。请配置 ANTHROPIC_API_KEY 后启用。");
  }
}
