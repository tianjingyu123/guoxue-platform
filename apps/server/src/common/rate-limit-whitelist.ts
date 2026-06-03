/** 限流白名单：本地环回 + 内网管理端 */
export const RATE_LIMIT_WHITELIST = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

export function isWhitelisted(ip: string): boolean {
  if (RATE_LIMIT_WHITELIST.has(ip)) return true;
  if (ip.startsWith("192.168.")) return true;
  return false;
}
