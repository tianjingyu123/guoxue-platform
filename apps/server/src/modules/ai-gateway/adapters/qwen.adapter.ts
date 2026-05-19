import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/**
 * 通义千问模型适配器（P1 预留）
 *
 * 当需要使用阿里云通义千问（Qwen）模型时，实现此适配器。
 * 目前为桩代码，待 DashScope API 接入后补全。
 *
 * @see https://help.aliyun.com/zh/model-studio
 */
export class QwenAdapter implements AiModelAdapter {
  readonly provider = "alibaba";

  async chat(
    _model: string,
    _messages: AiMessage[],
    _options?: AiChatOptions,
  ): Promise<AiChatResponse> {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Qwen适配器尚未实现。请配置 DASHSCOPE_API_KEY 后启用。");
  }

  // eslint-disable-next-line require-yield
  async *chatStream(
    _model: string,
    _messages: AiMessage[],
    _options?: AiChatOptions,
  ): AsyncIterable<string> {
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Qwen适配器尚未实现。请配置 DASHSCOPE_API_KEY 后启用。");
  }
}
