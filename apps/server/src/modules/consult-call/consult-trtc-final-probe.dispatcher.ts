import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultCallResourceService } from './consult-call-resource.service';
import { ConsultStopIntent, validConsultStopIntent } from './consult-call-stop-intent.policy';
import { readConsultClosureAttestation } from './consult-media-completion.config';
import { ConsultTrtcFinalProbeClient, FinalProbeResult } from './consult-trtc-final-probe.client';
import { ConsultFinalProbe, validConsultFinalProbe } from './consult-trtc-final-probe.policy';

type Boundary = { callId: string; scope: { sdkAppId: number; rtcRoomId: string }; expiresAt: Date; revision: number;
  stopIntent: (ConsultStopIntent & { finalProbe?: ConsultFinalProbe; completion?: unknown }) | null };
type Call = { status: string; callerId: string; expertId: string; rtcRoomId: string; createdAt: Date };

/** 保护期后的独立、至多一次解散；未知结果不重发，网络调用不持数据库锁。 */
@Injectable()
export class ConsultTrtcFinalProbeDispatcher {
  constructor(private readonly prisma: PrismaService, private readonly resources: ConsultCallResourceService,
    private readonly client: ConsultTrtcFinalProbeClient) {}
  private async read(tx: Prisma.TransactionClient, callId: string) {
    await this.resources.lockForStopInTransaction(tx, callId);
    const call = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId}`)[0];
    const boundary = (await tx.$queryRaw<Boundary[]>`SELECT * FROM "ConsultCallMediaBoundary" WHERE "callId"=${callId} FOR UPDATE`)[0];
    if (!call || !boundary?.stopIntent || !validConsultStopIntent(boundary.stopIntent, boundary, call)) return null;
    return { call, boundary, stop: boundary.stopIntent };
  }
  private async save(tx: Prisma.TransactionClient, boundary: Boundary, probe: ConsultFinalProbe) {
    const n = await tx.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "stopIntent"=${JSON.stringify({ ...boundary.stopIntent, finalProbe: probe })}::jsonb
      WHERE "callId"=${boundary.callId} AND revision=${boundary.revision} AND "stopIntent"=${JSON.stringify(boundary.stopIntent)}::jsonb`;
    if (n !== 1) throw new Error('CONSULT_FINAL_PROBE_CAS_FAILED');
  }
  async dispatch(callId: string) {
    const pending = () => ({ state: 'BLOCKED' as const });
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(callId)) return pending();
    const prepared = await this.prisma.$transaction(async tx => {
      const row = await this.read(tx, callId), now = Date.now();
      if (!row || row.stop.completion || row.stop.state !== 'ACKNOWLEDGED') return pending();
      if (row.stop.finalProbe) {
        if (!validConsultFinalProbe(row.stop.finalProbe, row.stop.protectUntil, now)) return pending();
        if (row.stop.finalProbe.state === 'DISPATCHING' && Date.parse(row.stop.finalProbe.leaseUntil) < now) {
          await this.save(tx, row.boundary, { ...row.stop.finalProbe, state: 'UNKNOWN', resultAt: new Date(now).toISOString() });
          return { state: 'UNKNOWN' as const };
        }
        return { state: row.stop.finalProbe.state };
      }
      const region = process.env.CONSULT_TRTC_STOP_REGION;
      if (!['ap-beijing', 'ap-guangzhou'].includes(region || '') || now <= Date.parse(row.stop.protectUntil)
        || String(row.boundary.scope.sdkAppId) !== process.env.CONSULT_TRTC_SDK_APP_ID
        || !readConsultClosureAttestation(process.env.CONSULT_TRTC_CLOSURE_ATTESTATION, row.boundary.scope.sdkAppId, row.call.createdAt, now)) return pending();
      const probe: ConsultFinalProbe = { state: 'DISPATCHING', claimedAt: new Date(now).toISOString(), leaseUntil: new Date(now + 60000).toISOString(), region: region! };
      await this.save(tx, row.boundary, probe);
      return { state: 'CLAIMED' as const, target: { ...row.boundary.scope, region: region! }, operationId: row.stop.operationId, claimedAt: probe.claimedAt };
    }, { timeout: 15000 });
    if (!('target' in prepared) || !prepared.target) return prepared;
    let response: FinalProbeResult = { state: 'UNKNOWN' };
    try { response = await this.client.dismissOnce(prepared.target); } catch { /* 不重试，不外传供应商正文。 */ }
    return this.prisma.$transaction(async tx => {
      const row = await this.read(tx, callId), now = Date.now(), probe = row?.stop.finalProbe;
      if (!row || row.stop.operationId !== prepared.operationId || !probe || probe.claimedAt !== prepared.claimedAt) throw new Error('CONSULT_FINAL_PROBE_DRIFT');
      if (probe.state !== 'DISPATCHING' || row.stop.completion) return { state: probe.state };
      const candidate = { ...probe, state: response.state, resultAt: response.state === 'UNKNOWN' ? new Date(now).toISOString() : response.receivedAt,
        ...(response.state !== 'UNKNOWN' ? { requestId: response.requestId } : {}) };
      const next: ConsultFinalProbe = validConsultFinalProbe(candidate, row.stop.protectUntil, now) && now <= Date.parse(probe.leaseUntil)
        ? candidate : { ...probe, state: 'UNKNOWN', resultAt: new Date(now).toISOString() };
      await this.save(tx, row.boundary, next);
      return { state: next.state };
    }, { timeout: 15000 });
  }
}
