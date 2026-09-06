import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleCapabilityQuotaRepository } from '../circle/circle-capability-quota.repository';
import { CircleCapabilityQuotaService } from '../circle/circle-capability-quota.service';
import { ConsultStopIntent, validConsultStopIntent } from './consult-call-stop-intent.policy';
import { consultFinalRoomObservation, ConsultMediaEvidence, validConsultMediaEvidence } from './consult-media-evidence.policy';
import { ConsultFinalProbe, validConsultFinalProbe } from './consult-trtc-final-probe.policy';
import { readConsultClosureAttestation } from './consult-media-completion.config';
import { consultTrtcUserId } from './trtc-sig.util';

type Call = { id: string; circleId: string; callerId: string; expertId: string; rtcRoomId: string; status: string; type: string; createdAt: Date };
type Completion = { quotaId: string; quotaRevision: number; evidenceRef: string };
type Boundary = { scope: { sdkAppId: number; rtcRoomId: string }; expiresAt: Date; revision: number;
  mediaEvidence: ConsultMediaEvidence | null; stopIntent: (ConsultStopIntent & { completion?: Completion; finalProbe?: ConsultFinalProbe }) | null };

/** 无外部释放接口。圈子锁→订单锁→媒体边界锁；额度和证明回执同事务提交。 */
@Injectable()
export class ConsultMediaCompletionService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: CircleCapabilityQuotaRepository,
    private readonly quota: CircleCapabilityQuotaService) {}

  async complete(callId: string) {
    const pending = (reason: string) => ({ state: 'PENDING' as const, reason });
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(callId)) return pending('INVALID_CALL_ID');
    return this.prisma.$transaction(async tx => {
      const initial = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId}`)[0];
      if (!initial) return pending('CALL_NOT_FOUND');
      await this.ledger.lockScope(tx, initial.circleId);
      const call = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId} FOR UPDATE`)[0];
      if (!call || call.circleId !== initial.circleId) return pending('CALL_SCOPE_CHANGED');
      if (!['VOICE', 'VIDEO'].includes(call.type) || !['ENDED', 'MISSED', 'REFUNDED'].includes(call.status)
        || call.callerId === call.expertId) return pending('CALL_NOT_TERMINAL');
      const boundary = (await tx.$queryRaw<Boundary[]>`SELECT * FROM "ConsultCallMediaBoundary" WHERE "callId"=${callId} FOR UPDATE`)[0];
      const stop = boundary?.stopIntent;
      if (!boundary || !stop || !validConsultStopIntent(stop, boundary, call)) return pending('BOUNDARY_UNVERIFIED');
      const capability = call.type === 'VOICE' ? 'AUDIO_QUESTION' : 'VIDEO_QUESTION';
      const current = await this.ledger.byBusiness(tx, capability, callId);
      const b = current?.binding;
      if (!current || !b || b.circleId !== call.circleId || b.actorId !== call.callerId || b.subjectUserId !== call.expertId
        || b.capability !== capability || b.businessType !== capability || b.businessId !== callId || b.requestKey !== callId || b.units !== 1) {
        return pending('QUOTA_BINDING_MISMATCH');
      }
      if (stop.completion) {
        const saved = stop.completion, receipt = await this.ledger.receipt(tx, stop.operationId);
        if (current.state !== 'COMPLETED' || saved.quotaId !== current.id || saved.quotaRevision !== current.revision
          || !/^consult-final:[a-f0-9]{64}$/.test(saved.evidenceRef) || !receipt || receipt.action !== 'COMPLETE'
          || receipt.reservationId !== current.id || receipt.appliedRevision !== current.revision || receipt.source !== 'BUSINESS_ADAPTER'
          || receipt.actorId !== null || receipt.evidenceRef !== saved.evidenceRef
          || Object.keys(b).some(key => b[key] !== receipt.binding?.[key])) throw new Error('CONSULT_COMPLETION_RECEIPT_INVALID');
        return { state: 'COMPLETED' as const, changed: false };
      }
      if (current.state !== 'ACTIVE' || stop.state !== 'ACKNOWLEDGED') return pending('STOP_OR_QUOTA_NOT_READY');
      const now = Date.now();
      const attestation = readConsultClosureAttestation(process.env.CONSULT_TRTC_CLOSURE_ATTESTATION, boundary.scope.sdkAppId, call.createdAt, now);
      if (!attestation || String(boundary.scope.sdkAppId) !== process.env.CONSULT_TRTC_SDK_APP_ID) return pending('CLOUD_SCOPE_UNVERIFIED');
      const participants: [string, string] = [consultTrtcUserId(call.callerId, call.rtcRoomId), consultTrtcUserId(call.expertId, call.rtcRoomId)];
      const observed = consultFinalRoomObservation(boundary.mediaEvidence, participants,
        boundary.scope, Date.parse(stop.protectUntil), now);
      const probe = stop.finalProbe;
      const absent = !!probe && validConsultFinalProbe(probe, stop.protectUntil, now) && probe.state === 'ABSENT'
        && (!boundary.mediaEvidence || (validConsultMediaEvidence(boundary.mediaEvidence) && !boundary.mediaEvidence.overflow
          && boundary.mediaEvidence.events.every(e => e.sdkAppId === boundary.scope.sdkAppId && e.roomId === boundary.scope.rtcRoomId
            && (e.userId === null || participants.includes(e.userId))
            && e.eventAt < Date.parse(probe.claimedAt) && e.callbackAt <= now && e.receivedAt <= now)));
      if (!observed.observed && !absent) return pending(boundary.mediaEvidence === null ? 'NO_MEDIA_EVIDENCE' : observed.reason);
      const evidenceRef = `consult-final:${createHash('sha256').update(JSON.stringify({ operationId: stop.operationId,
        credentialRevision: boundary.revision, evidenceRevision: observed.observed ? observed.evidenceRevision : boundary.mediaEvidence?.revision ?? 0,
        eventKey: observed.observed ? observed.eventKey : null, absentRequestId: absent ? probe!.requestId : null,
        scopeEvidence: attestation.evidenceId })).digest('hex')}`;
      const settled = await this.quota.settleInTransaction(tx, { reservationId: current.id, binding: b, operationKey: stop.operationId,
        expectedRevision: current.revision, action: 'COMPLETE', evidenceRef });
      if (settled.reservation.state !== 'COMPLETED') throw new Error('CONSULT_COMPLETION_NOT_APPLIED');
      const completion = { quotaId: current.id, quotaRevision: settled.reservation.revision, evidenceRef };
      const updated = await tx.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "stopIntent"=${JSON.stringify({ ...stop, completion })}::jsonb
        WHERE "callId"=${callId} AND revision=${boundary.revision} AND "stopIntent"=${JSON.stringify(stop)}::jsonb`;
      if (updated !== 1) throw new Error('CONSULT_COMPLETION_CAS_FAILED');
      return { state: 'COMPLETED' as const, changed: true };
    }, { timeout: 15000 });
  }
}
