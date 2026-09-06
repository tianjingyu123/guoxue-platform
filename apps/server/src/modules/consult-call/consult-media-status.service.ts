import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { consultFinalRoomObservation, observeConsultMedia, validConsultMediaEvidence } from "./consult-media-evidence.policy";
import { consultTrtcUserId } from "./trtc-sig.util";
import { ConsultStopIntent, validConsultStopIntent } from "./consult-call-stop-intent.policy";
import { validConsultFinalProbe } from './consult-trtc-final-probe.policy';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};
const iso = (value: unknown) => {
  const time = value instanceof Date ? value.getTime() : typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};
const revision = (value: unknown) => Number.isInteger(value) && Number(value) > 0 && Number(value) <= 2147483647 ? Number(value) : null;

/** 管理端只读投影。单条 SELECT 获得一致快照，不派发停流、退款或额度变更。 */
@Injectable()
export class ConsultMediaStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async read(callId: string) {
    if (!uuid.test(callId)) throw new BusinessException(ErrorCode.BAD_REQUEST, "请输入有效的通话记录ID");
    callId = callId.toLowerCase();
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT c.id, c.status, c.type, c."circleId", c."callerId", c."expertId", c."rtcRoomId",
        b."callId" AS "boundaryId", b.scope, b."expiresAt", b.revision, b."stopIntent", b."mediaEvidence",
        q.state AS "quotaState", q.id AS "quotaId", q.revision AS "quotaRevision", q."circleId" AS "quotaCircleId", q."actorId" AS "quotaActorId", q."subjectUserId" AS "quotaSubjectId",
        r.action AS "receiptAction", r."source" AS "receiptSource", r."actorId" AS "receiptActorId", r."evidenceRef" AS "receiptEvidenceRef",
        r."reservationId" AS "receiptQuotaId", r."appliedRevision" AS "receiptRevision", r."afterSnapshot" AS "receiptSnapshot"
      FROM "ConsultCall" c
      LEFT JOIN "ConsultCallMediaBoundary" b ON b."callId"=c.id
      LEFT JOIN "CircleCapabilityQuota" q ON q."businessId"=c.id
        AND q."businessType"=CASE WHEN c.type='VOICE' THEN 'AUDIO_QUESTION' ELSE 'VIDEO_QUESTION' END
      LEFT JOIN "CircleCapabilityQuotaReceipt" r ON r."operationKey"=b."stopIntent"->>'operationId'
      WHERE c.id=${callId}`;
    if (!rows.length) throw new BusinessException(ErrorCode.NOT_FOUND, "通话记录不存在");
    if (rows.length !== 1) throw new Error("CONSULT_MEDIA_STATUS_NOT_UNIQUE");
    const row = rows[0], scope = object(row.scope), stop = object(row.stopIntent), stopScope = object(stop.scope);
    const boundaryValid = row.boundaryId === callId && revision(row.revision) !== null && iso(row.expiresAt) !== null
      && Number.isSafeInteger(scope.sdkAppId) && Number(scope.sdkAppId) > 0 && Number(scope.sdkAppId) <= 0xffffffff
      && typeof row.rtcRoomId === "string" && /^consult_[a-f0-9]{16}$/.test(row.rtcRoomId) && scope.rtcRoomId === row.rtcRoomId;
    const partiesValid = typeof row.callerId === "string" && uuid.test(row.callerId)
      && typeof row.expertId === "string" && uuid.test(row.expertId) && row.callerId !== row.expertId;
    const participants: [string, string] = partiesValid && boundaryValid
      ? [consultTrtcUserId(String(row.callerId), String(row.rtcRoomId)), consultTrtcUserId(String(row.expertId), String(row.rtcRoomId))] : ["", ""];
    const evidence = row.mediaEvidence;
    const evidenceValid = boundaryValid && partiesValid && validConsultMediaEvidence(evidence)
      && evidence.events.every(event => event.sdkAppId === scope.sdkAppId && event.roomId === scope.rtcRoomId
        && (event.userId === null || participants.includes(event.userId)));
    const stopBound = boundaryValid && partiesValid && stop.version === 1 && stop.credentialRevision === row.revision
      && stopScope.sdkAppId === scope.sdkAppId && stopScope.rtcRoomId === scope.rtcRoomId
      && validConsultStopIntent(stop as unknown as ConsultStopIntent,
        { scope: { sdkAppId: Number(scope.sdkAppId), rtcRoomId: String(scope.rtcRoomId) },
          expiresAt: new Date(iso(row.expiresAt)!), revision: Number(row.revision) },
        { status: String(row.status), callerId: String(row.callerId), expertId: String(row.expertId), rtcRoomId: String(row.rtcRoomId) });
    const stopState = !row.stopIntent ? "NOT_REQUESTED" : stopBound
      && ["READY", "DISPATCHING", "ACKNOWLEDGED", "UNKNOWN"].includes(String(stop.state)) ? String(stop.state) : "INVALID";
    const quotaMatches = row.quotaCircleId === row.circleId && row.quotaActorId === row.callerId && row.quotaSubjectId === row.expertId;
    const quotaState = row.quotaState === null ? "UNTRACKED" : quotaMatches
      && ["HELD", "ACTIVE", "COMPLETED", "RELEASED", "EXPIRED"].includes(String(row.quotaState)) ? String(row.quotaState) : "UNKNOWN";
    const completion = object(stop.completion), receiptSnapshot = object(row.receiptSnapshot), receiptBinding = object(receiptSnapshot.binding);
    const expectedCapability = row.type === 'VOICE' ? 'AUDIO_QUESTION' : row.type === 'VIDEO' ? 'VIDEO_QUESTION' : null;
    const completionVerified = !!expectedCapability && stopBound && quotaState === 'COMPLETED'
      && revision(row.quotaRevision) !== null && completion.quotaId === row.quotaId && completion.quotaRevision === row.quotaRevision
      && typeof completion.evidenceRef === 'string' && /^consult-final:[a-f0-9]{64}$/.test(completion.evidenceRef)
      && row.receiptAction === 'COMPLETE' && row.receiptSource === 'BUSINESS_ADAPTER' && row.receiptActorId === null
      && row.receiptEvidenceRef === completion.evidenceRef && row.receiptQuotaId === row.quotaId && row.receiptRevision === row.quotaRevision
      && receiptSnapshot.id === row.quotaId && receiptSnapshot.revision === row.quotaRevision
      && receiptBinding.circleId === row.circleId && receiptBinding.actorId === row.callerId && receiptBinding.subjectUserId === row.expertId
      && receiptBinding.businessId === callId && receiptBinding.requestKey === callId && receiptBinding.businessType === expectedCapability
      && receiptBinding.capability === expectedCapability && receiptBinding.units === 1;
    const now = new Date();
    const finalProbeState = !stop.finalProbe ? 'NOT_REQUESTED' : stopBound && validConsultFinalProbe(stop.finalProbe, String(stop.protectUntil), now.getTime())
      ? stop.finalProbe.state : 'INVALID';
    const mediaObservation = evidenceValid ? observeConsultMedia(evidence, participants) : "UNKNOWN";
    const finalRoomObservation = stopBound && evidenceValid ? consultFinalRoomObservation(evidence, participants,
      { sdkAppId: Number(scope.sdkAppId), rtcRoomId: String(scope.rtcRoomId) }, Date.parse(String(stop.protectUntil)), now.getTime()) : null;
    const closureChecks: Array<{ code: string; message: string }> = [];
    if (!["ENDED", "MISSED", "REFUNDED"].includes(String(row.status))) closureChecks.push({ code: "ORDER_NOT_TERMINAL", message: "订单尚未结束，不能进入资源收尾。" });
    if (!boundaryValid || !partiesValid) closureChecks.push({ code: "BOUNDARY_UNVERIFIED", message: "缺少可信的本单签发范围，请技术人员核查历史记录。" });
    else if (Math.max(Date.parse(iso(row.expiresAt)!) + 300000, stopBound ? Date.parse(String(stop.protectUntil)) : 0) > now.getTime()) closureChecks.push({ code: "REENTRY_WINDOW_OPEN", message: "已发出票据仍在有效期或保护窗口内；退房后仍可能重新入房。" });
    if (stopState !== "ACKNOWLEDGED") closureChecks.push({ code: "STOP_UNVERIFIED", message: "停流请求尚无完整受理记录；未知结果不可直接重发或手动改库。" });
    if (mediaObservation !== "OFFLINE_OBSERVED") closureChecks.push({ code: "MEDIA_NOT_CLOSED", message: "尚未取得本单参与者的可信离线观察。" });
    if (mediaObservation === "OFFLINE_OBSERVED" && finalRoomObservation && !finalRoomObservation.observed
      && finalRoomObservation.reason !== "REENTRY_WINDOW_OPEN") closureChecks.push({
      code: "FINAL_ROOM_OBSERVATION_MISSING", message: "现有离线记录尚不能证明重入保护窗之后整房已解散；不能用旧退房回调提前归还并发名额。",
    });
    closureChecks.push({ code: "FINAL_PROOF_REQUIRED", message: "还需核验禁止旧票据重入的云端权限范围及最终媒体状态，并在同一事务完成账本收尾；本页不会释放资源。" });
    if (finalProbeState === 'UNKNOWN' || finalProbeState === 'INVALID') closureChecks.push({ code: 'FINAL_PROBE_REQUIRES_REVIEW',
      message: '保护期后的最终核验结果未知或记录异常，系统不会重复解散；请核查原请求，不要手动修改额度。' });
    if (completionVerified) closureChecks.length = 0;
    return {
      callId, checkedAt: now.toISOString(),
      orderStatus: ["WAITING", "ONGOING", "ENDED", "MISSED", "REFUNDED"].includes(String(row.status)) ? String(row.status) : "UNKNOWN",
      boundaryStatus: !row.boundaryId ? "UNTRACKED" : boundaryValid ? "TRACKED" : "INVALID",
      credentialRevision: boundaryValid ? revision(row.revision) : null, credentialExpiresAt: boundaryValid ? iso(row.expiresAt) : null,
      stopState, stopRequestedAt: stopBound ? iso(stop.requestedAt) : null,
      finalProbeState,
      mediaObservation,
      finalRoomObserved: finalRoomObservation?.observed === true,
      evidenceRevision: evidenceValid ? evidence.revision : null,
      lastEventAt: evidenceValid ? iso(new Date(Math.max(...evidence.events.map(event => event.eventAt)))) : null,
      quotaState, completionVerified, canRelease: false, closureChecks,
      notice: completionVerified ? "已核对同一事务的媒体收尾与额度回执，并发名额已归还，累计使用记录保留；无需重复操作。"
        : "停流待办状态仅为数据库记录；请求已受理、退房回调或票据过期均不单独证明资源已安全释放。缺少可信收尾证据时保留占用，请联系技术人员核验，勿重复停流或手动改库。",
    };
  }
}
