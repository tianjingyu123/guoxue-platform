import { checkServerIdentity, ConnectionOptions, PeerCertificate } from "node:tls";

/**
 * 部分托管 Redis 的服务端证书只有 CN，没有 IP SAN，Node 20 会拒绝直接按 IP 连接。
 * 这里仍保留 CA 链严格校验，只在证书 CN 与连接目标完全一致时兼容该证书格式；
 * 禁止使用 rejectUnauthorized=false 绕过证书校验。
 */
export function buildRedisTlsOptions(redisUrl: string): ConnectionOptions | undefined {
  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "rediss:") return undefined;

  const expectedHost = parsed.hostname;
  return {
    rejectUnauthorized: true,
    checkServerIdentity(host: string, cert: PeerCertificate) {
      const standardError = checkServerIdentity(host, cert);
      if (!standardError) return undefined;
      if (host === expectedHost && cert.subject?.CN === expectedHost) return undefined;
      return standardError;
    },
  };
}
