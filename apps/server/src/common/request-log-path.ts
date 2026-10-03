/** 请求日志与告警只保留路径，查询参数可能包含回调签名或临时凭据。 */
export function requestLogPath(url: unknown): string {
  return typeof url === "string" ? url.split(/[?#]/, 1)[0] || "/" : "/";
}

/** IM 异常原文可能包含消息或第三方签名，统一日志不展开其内容。 */
export function isImLogPath(path: string): boolean {
  return /(?:^|\/)im(?:\/|$)/i.test(path);
}
