import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/**
 * 本地模型适配器（P1 预留）
 *
 * 当需要在本地/内网部署开源模型（如 Llama、ChatGLM、Qwen 本地版）
 * 并通过兼容 OpenAI 的本地 API 调用时，实现此适配器。
 * 目前为桩代码，待本地模型部署后补全。
 *
 * 适用场景：
 * - 数据不出内网的合规需求
 * - 高频调用降低延迟
 * - 离线环境运行
 *
 * 环境变量：LOCAL_MODEL_BASE_URL、LOCAL_MODEL_API_KEY
 */
export class LocalModelAdapter implements AiModelAdapter {
  readonly provider = "local";

  async chat(
    _model: string,
    _messages: AiMessage[],
    _options?: AiChatOptions,
  ): Promise<AiChatResponse> {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "本地模型适配器尚未实现。请配置 LOCAL_MODEL_BASE_URL 后启用。");
  }

  async *chatStream(
    _model: string,
    _messages: AiMessage[],
    _options?: AiChatOptions,
  ): AsyncIterable<string> {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "本地模型适配器尚未实现。请配置 LOCAL_MODEL_BASE_URL 后启用。");
  }
}
