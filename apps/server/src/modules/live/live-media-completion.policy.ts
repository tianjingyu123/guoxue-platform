import { CredentialBoundary } from "./live-media-credential.repository";
import { MediaStopIntent } from "./live-media-stop.repository";
import { MediaEvidence, mediaEvidenceStatus } from "./live-media-evidence.policy";
import { validStopVerification } from "./live-media-stop-verification.policy";

/** 仅判断证据，不写业务状态。回调、禁推 ACK、实时状态三者不能相互代替。 */
export function cssCompletionEvidence(boundaries: CredentialBoundary[], stop: MediaStopIntent | null,
  media: { revision: number; snapshot: { domain: string; appName: string; evidence: MediaEvidence } } | null, nowMs: number) {
  const pending = (reason: string) => ({ allowed: false as const, reason });
  // 曾签发 TRTC 的房间须等待 TRTC 自身的停流证据，不能只结束 CSS 就归还全房间额度。
  if (boundaries.length !== 1 || boundaries[0].provider !== "CSS") return pending("OTHER_PROVIDER_NOT_CLOSED");
  const boundary = boundaries[0];
  if (!stop || stop.provider !== "CSS" || stop.scope.provider !== "CSS" || boundary.scope.provider !== "CSS"
    || stop.roomId !== boundary.roomId || stop.credentialRevision !== boundary.revision
    || stop.scope.domain !== boundary.scope.domain || stop.scope.appName !== boundary.scope.appName
    || stop.scope.streamName !== boundary.scope.streamName) return pending("BOUNDARY_DRIFT");
  if (stop.state !== "ACKNOWLEDGED" || !stop.providerRequestId || !stop.claimedAt || !stop.resultAt) return pending("STOP_NOT_ACKNOWLEDGED");
  const query = stop.verification;
  if (!query || !validStopVerification(query) || query.state !== "forbid" || query.receivedAtMs === null
    || !Number.isSafeInteger(nowMs) || query.receivedAtMs > nowMs || nowMs - query.receivedAtMs > 60000
    || query.startedAtMs < stop.resultAt.getTime() || query.proofValidUntilMs <= nowMs) return pending("NO_FRESH_FORBID_EVIDENCE");
  if (!Number.isFinite(boundary.expiresAt.getTime()) || !Number.isFinite(stop.protectUntil.getTime())
    || stop.protectUntil.getTime() < boundary.expiresAt.getTime() + 300000 || stop.protectUntil.getTime() <= nowMs) {
    return pending("RECONNECT_PROTECTION_UNPROVEN");
  }
  if (!media || !Number.isInteger(media.revision) || media.revision < 1
    || media.snapshot.domain !== stop.scope.domain || media.snapshot.appName !== stop.scope.appName
    || mediaEvidenceStatus(media.snapshot.evidence) !== "OFFLINE_OBSERVED") return pending("MEDIA_NOT_CLOSED");
  const lastEnd = Math.max(...media.snapshot.evidence.sessions.map(session => session.endedAtMs!));
  // 官方事件时间精度为秒；先取整再比较，避免毫秒导致真实停流回调被误拒。
  if (lastEnd < Math.floor(stop.claimedAt.getTime() / 1000) * 1000 || lastEnd > query.startedAtMs) {
    return pending("MEDIA_EVENT_OUTSIDE_STOP_WINDOW");
  }
  return { allowed: true as const, operationId: stop.operationId, queryId: query.queryId,
    mediaRevision: media.revision, credentialRevision: boundary.revision, stopRequestId: stop.providerRequestId,
    queryRequestId: query.requestId!, scopeProofRef: query.scopeProofRef };
}
