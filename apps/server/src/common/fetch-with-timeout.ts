/**
 * 带超时的 fetch 封装。
 *
 * 背景：审计发现大量外部调用（银联/微信/腾讯云/DeepSeek/地图/快递等）
 * 无超时设置，第三方抖动可拖垮同步业务（连接池耗尽、请求堆积）。
 *
 * 用法：
 *   import { fetchWithTimeout } from '../../common/fetch-with-timeout';
 *   const resp = await fetchWithTimeout('https://api.example.com', { timeoutMs: 5000 });
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`请求超时 (${timeoutMs}ms): ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** 常用超时预设（毫秒） */
export const FETCH_TIMEOUT = {
  /** 支付网关（银联/微信/汇付）：需较快响应 */
  PAYMENT: 8_000,
  /** 腾讯云 API（短信/OCR/ASR）：中等 */
  TENCENT_CLOUD: 15_000,
  /** AI 模型调用（DeepSeek/混元）：推理耗时较长 */
  AI_MODEL: 30_000,
  /** 地图/快递/邮件等非关键外部服务 */
  EXTERNAL_SERVICE: 10_000,
  /** 默认兜底 */
  DEFAULT: 10_000,
} as const;
