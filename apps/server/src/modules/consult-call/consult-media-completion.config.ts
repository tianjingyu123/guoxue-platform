/** 部署侧人工核验记录，不是云端自动证明；禁止从 HTTP 参数或回调正文读取。 */
export function readConsultClosureAttestation(raw: string | undefined, sdkAppId: number, issuedAt: Date, now: number) {
  if (!raw || raw.length > 2048 || !Number.isSafeInteger(now) || !Number.isSafeInteger(sdkAppId) || sdkAppId <= 0
    || !(issuedAt instanceof Date) || !Number.isFinite(issuedAt.getTime())) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).sort().join() !==
      ['sdkAppId', 'advancedPermission', 'exclusiveIssuer', 'verifiedFrom', 'verifiedUntil', 'evidenceId'].sort().join()
      || p.sdkAppId !== sdkAppId || p.advancedPermission !== true || p.exclusiveIssuer !== true
      || typeof p.evidenceId !== 'string' || !/^[a-f0-9]{64}$/.test(p.evidenceId)) return null;
    const from = Date.parse(p.verifiedFrom), until = Date.parse(p.verifiedUntil);
    if (![from, until].every(Number.isFinite) || new Date(from).toISOString() !== p.verifiedFrom
      || new Date(until).toISOString() !== p.verifiedUntil || from > issuedAt.getTime() || issuedAt.getTime() > now
      || until <= now || until <= from || until - from > 30 * 86400000) return null;
    return { evidenceId: p.evidenceId as string };
  } catch { return null; }
}
