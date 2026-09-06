import type { CssExactScopeAttestation } from "./live-media-stop-dispatcher";

/** 仅读取部署侧核验证明；不接受客户端开关或自动推断腾讯云已开通精确匹配。 */
export function readCssStopAttestation(raw: string | undefined, nowMs: number): CssExactScopeAttestation | null {
  if (!raw || raw.length > 2048 || !Number.isSafeInteger(nowMs)) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object" || Array.isArray(p) || Object.keys(p).sort().join() !==
      ["domain", "appName", "evidenceId", "verifiedAt", "verifiedUntil"].sort().join()) return null;
    const v = p as Record<string, unknown>;
    if (typeof v.domain !== "string" || v.domain.length > 253 || v.domain.split(".").length < 2
      || !v.domain.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
      || typeof v.appName !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(v.appName)
      || typeof v.evidenceId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(v.evidenceId)
      || typeof v.verifiedAt !== "string" || typeof v.verifiedUntil !== "string"
      || ![v.verifiedAt, v.verifiedUntil].every(t => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(t))) return null;
    const at = Date.parse(v.verifiedAt), until = Date.parse(v.verifiedUntil);
    if (!Number.isFinite(at) || !Number.isFinite(until) || at > nowMs || until <= nowMs || until <= at
      || until - at > 30 * 86400000) return null;
    return { domain: v.domain, appName: v.appName, evidenceId: v.evidenceId, verifiedUntil: new Date(until) };
  } catch { return null; }
}
