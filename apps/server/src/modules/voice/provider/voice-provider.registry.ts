import { Logger } from "@nestjs/common";
import { MockXiaozhiProvider } from "./mock-xiaozhi.provider";
import { UnavailableXiaozhiProvider } from "./unavailable-xiaozhi.provider";
import type { VoiceProvider } from "./voice-provider.types";

const logger = new Logger("VoiceProviderRegistry");

/**
 * 按环境选择实时语音供应商。
 *
 * XIAOBU_VOICE_PROVIDER：
 * - 未设置 / "unavailable"：默认，暂未开放
 * - "mock"：模拟供应商，仅限非生产环境；生产环境设置此值会被拒绝并回退为 unavailable
 * - "xiaozhi"：真实商业适配器——**尚未实现**（商业 API 文档未到位），回退为 unavailable 并在运营面板说明
 * - 其他值：回退为 unavailable
 *
 * 不读取、不校验任何商业凭据；真实适配器到位后在此处接入它自己的配置。
 */
export function createVoiceProvider(env: NodeJS.ProcessEnv = process.env): VoiceProvider {
  const wanted = (env.XIAOBU_VOICE_PROVIDER || "unavailable").trim().toLowerCase();
  const isProduction = env.NODE_ENV === "production";

  if (wanted === "mock") {
    if (isProduction) {
      logger.error("生产环境拒绝启用模拟语音供应商（XIAOBU_VOICE_PROVIDER=mock），已回退为暂未开放");
      return new UnavailableXiaozhiProvider("生产环境禁止模拟供应商；实时语音暂未开放");
    }
    logger.warn("已启用模拟语音供应商：仅用于契约/权限/页面测试，所有结果均非真实接通");
    return new MockXiaozhiProvider();
  }
  if (wanted === "xiaozhi") {
    return new UnavailableXiaozhiProvider("小智商业适配器尚未实现：等待商业 API 文档、测试账号与回调规范");
  }
  if (wanted !== "unavailable") {
    logger.warn(`未知的语音供应商配置 "${wanted}"，已回退为暂未开放`);
  }
  return new UnavailableXiaozhiProvider();
}
