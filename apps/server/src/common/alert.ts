/**
 * 统一运维告警通道 — 供异常过滤器 / 慢请求拦截器 / 队列监控等（含非 DI 单例）发送告警。
 *
 * 启动时由 main 注入企微 notifyAlert；无 webhook 配置时降级为 stderr 日志。
 * 按 key 节流（同类告警 5 分钟内最多一条），防止 5xx 风暴 / 慢请求刷屏把告警群淹没。
 */
let alertHandler: ((title: string, detail: string) => void) | null = null;
const lastSentAt = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000;

/** 注入告警发送实现（如 wework.notifyAlert）。传 null 可解除（测试用）。 */
export function setAlertHandler(fn: ((title: string, detail: string) => void) | null): void {
  alertHandler = fn;
}

/**
 * 发送运维告警（按 key 节流）。
 * @param key 告警归并键（如 "5xx:500" / "slow:critical" / "queue:health"），同 key 在节流窗口内只发一条
 */
export function sendAlert(key: string, title: string, detail: string): void {
  const now = Date.now();
  if (now - (lastSentAt.get(key) ?? 0) < THROTTLE_MS) return;
  lastSentAt.set(key, now);
  if (alertHandler) {
    try { alertHandler(title, detail); } catch { /* 告警失败不影响主流程 */ }
  } else {
    process.stderr.write(`[Alert] ${title} | ${detail}\n`);
  }
}

/** 测试用：清空节流状态。 */
export function __resetAlertThrottle(): void {
  lastSentAt.clear();
}
