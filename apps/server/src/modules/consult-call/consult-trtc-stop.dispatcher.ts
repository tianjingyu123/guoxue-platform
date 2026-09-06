import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ConsultCallResourceService } from "./consult-call-resource.service";
import { ConsultStopIntent, validConsultStopIntent } from "./consult-call-stop-intent.policy";
import { ConsultTrtcStopClient, ConsultTrtcStopResult, ConsultTrtcStopTarget } from "./consult-trtc-stop.client";
import { consultTrtcUserId } from "./trtc-sig.util";

type Boundary = { callId: string; scope: { sdkAppId: number; rtcRoomId: string }; revision: number; expiresAt: Date; stopIntent: ConsultStopIntent | null };
type Call = { status: string; callerId: string; expertId: string; rtcRoomId: string };
const invalid = () => new Error("CONSULT_STOP_BOUNDARY_INVALID");
const requestId = (value: unknown): value is string => typeof value === "string"
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const time = (value: string | undefined) => {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : NaN;
};

/** 仅内部调用；事务认领与网络发送分离，未知结果和过期租约都不重发。 */
@Injectable()
export class ConsultTrtcStopDispatcher {
  constructor(private readonly prisma: PrismaService, private readonly resources: ConsultCallResourceService,
    private readonly client: ConsultTrtcStopClient) {}

  private async read(tx: Prisma.TransactionClient, callId: string) {
    await this.resources.lockForStopInTransaction(tx, callId);
    const call = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId}`)[0];
    const boundary = (await tx.$queryRaw<Boundary[]>`SELECT * FROM "ConsultCallMediaBoundary" WHERE "callId"=${callId} FOR UPDATE`)[0];
    if (!call || !["ENDED", "MISSED", "REFUNDED"].includes(call.status) || !boundary?.stopIntent) return null;
    const intent = boundary.stopIntent;
    if (!validConsultStopIntent(intent, boundary, call)) throw invalid();
    return { call, boundary, intent };
  }

  private async save(tx: Prisma.TransactionClient, row: Boundary, next: ConsultStopIntent) {
    const n = await tx.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "stopIntent"=${JSON.stringify(next)}::jsonb
      WHERE "callId"=${row.callId} AND revision=${row.revision} AND "stopIntent"=${JSON.stringify(row.stopIntent)}::jsonb`;
    if (n !== 1) throw new Error("CONSULT_STOP_CLAIM_LOST");
  }

  async dispatch(callId: string, region: ConsultTrtcStopTarget["region"]) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(callId)
      || !["ap-beijing", "ap-guangzhou"].includes(region)) throw invalid();
    const prepared = await this.prisma.$transaction(async tx => {
      const row = await this.read(tx, callId), now = new Date();
      if (!row) return { state: "BLOCKED" as const };
      const { intent, boundary, call } = row;
      if (intent.state !== "READY") {
        if (intent.state === "DISPATCHING" && now.getTime() >= time(intent.dispatch!.leaseUntil)) {
          await this.save(tx, boundary, { ...intent, state: "UNKNOWN", dispatch: { ...intent.dispatch!, resultAt: now.toISOString() } });
          return { state: "UNKNOWN" as const };
        }
        return { state: intent.state };
      }
      if (now.getTime() < time(intent.requestedAt)) throw invalid();
      const target: ConsultTrtcStopTarget = { ...intent.scope, region, userIds: [consultTrtcUserId(call.callerId, call.rtcRoomId), consultTrtcUserId(call.expertId, call.rtcRoomId)] };
      if (target.userIds[0] === target.userIds[1]) throw invalid();
      const claimed: ConsultStopIntent = { ...intent, state: "DISPATCHING", dispatch: {
        region, claimedAt: now.toISOString(), leaseUntil: new Date(now.getTime() + 60000).toISOString() } };
      await this.save(tx, boundary, claimed);
      return { state: "CLAIMED" as const, operationId: intent.operationId, target };
    }, { timeout: 15000 });
    if (!("target" in prepared) || !prepared.target) return prepared;
    let response: ConsultTrtcStopResult = { state: "UNKNOWN" };
    try { response = await this.client.removeOnce(prepared.target); } catch { /* 原始供应商错误不外传、不重发。 */ }
    try {
      return await this.prisma.$transaction(async tx => {
        const row = await this.read(tx, callId), now = new Date();
        if (!row || row.intent.operationId !== prepared.operationId) throw invalid();
        if (row.intent.state !== "DISPATCHING") return { state: row.intent.state, applied: false };
        const previous = row.intent.dispatch!, received = response.state === "ACKNOWLEDGED" ? time(response.receivedAt) : NaN;
        const ack = response.state === "ACKNOWLEDGED" && requestId(response.requestId)
          && Number.isFinite(received) && received >= time(previous.claimedAt) && received <= now.getTime()
          && now.getTime() <= time(previous.leaseUntil);
        const next: ConsultStopIntent = { ...row.intent, state: ack ? "ACKNOWLEDGED" : "UNKNOWN", dispatch: {
          ...previous, resultAt: now.toISOString(), ...(ack && response.state === "ACKNOWLEDGED" ? { providerRequestId: response.requestId } : {}) } };
        await this.save(tx, row.boundary, next);
        return { state: next.state, applied: true };
      }, { timeout: 15000 });
    } catch { throw new Error("CONSULT_STOP_RESULT_PERSIST_FAILED"); }
  }
}
