import { isIP } from "node:net";
import tls from "node:tls";

const DAY_MS = 24 * 60 * 60 * 1000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function summarizeCertificate(certificate, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const minimumRemainingDays = options.minimumRemainingDays ?? 14;
  const validFromMs = Date.parse(String(certificate?.valid_from || ""));
  const validToMs = Date.parse(String(certificate?.valid_to || ""));
  const fingerprintSha256 = String(certificate?.fingerprint256 || "")
    .replaceAll(":", "")
    .toLowerCase();

  assert(Number.isFinite(validFromMs), "证书缺少有效生效时间");
  assert(Number.isFinite(validToMs), "证书缺少有效到期时间");
  assert(validFromMs <= nowMs, "证书尚未生效");
  assert(validToMs > nowMs, "证书已经过期");
  assert(/^[a-f0-9]{64}$/u.test(fingerprintSha256), "证书缺少有效 SHA-256 指纹");

  const remainingMs = validToMs - nowMs;
  assert(
    remainingMs >= minimumRemainingDays * DAY_MS,
    `证书剩余有效期不足 ${minimumRemainingDays} 天`,
  );

  return {
    validFrom: new Date(validFromMs).toISOString(),
    validTo: new Date(validToMs).toISOString(),
    daysRemaining: Math.floor(remainingMs / DAY_MS),
    fingerprintSha256,
    issuerCommonName: String(certificate?.issuer?.CN || "unknown").slice(0, 160),
  };
}

export async function probePublicTls(origin, options = {}) {
  const url = new URL(origin);
  assert(url.protocol === "https:", "公网 TLS 探测仅接受 HTTPS 地址");
  assert(isIP(url.hostname) === 0, "正式公网 TLS 探测必须使用域名，不能使用 IP");

  const timeoutMs = options.timeoutMs ?? 15_000;
  const connect = options.connect ?? tls.connect;
  const port = Number(url.port || 443);

  return await new Promise((resolve, reject) => {
    const socket = connect({
      host: url.hostname,
      port,
      servername: url.hostname,
      rejectUnauthorized: true,
    });
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      socket.end?.();
      callback(value);
    };

    socket.setTimeout?.(timeoutMs, () => {
      socket.destroy?.();
      finish(reject, new Error(`TLS 握手超过 ${timeoutMs}ms`));
    });
    socket.once("error", (error) => finish(reject, error));
    socket.once("secureConnect", () => {
      try {
        assert(socket.authorized === true, socket.authorizationError || "证书链未获信任");
        const summary = summarizeCertificate(socket.getPeerCertificate(true), options);
        finish(resolve, {
          origin: url.origin,
          chainAuthorized: true,
          hostnameMatched: true,
          ...summary,
        });
      } catch (error) {
        finish(reject, error);
      }
    });
  });
}
