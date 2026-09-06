import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { getVerifiedTrtcCallback } from "../../common/trtc-callback.guard";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { appendConsultMediaEvent, ConsultMediaEvidence, observeConsultMedia, parseConsultMediaEvent } from "./consult-media-evidence.policy";
import { consultTrtcUserId } from "./trtc-sig.util";

type Call = { id: string; circleId: string; callerId: string; expertId: string; rtcRoomId: string };
type Boundary = { callId: string; scope: { sdkAppId: number; rtcRoomId: string }; revision: number; mediaEvidence: ConsultMediaEvidence | null };

/** 从已通过原文守卫的请求取得证据，绝不接收前端 DTO 作为供应商证明。 */
@Injectable()
export class ConsultMediaEvidenceService {
  constructor(private readonly prisma: PrismaService, private readonly scopes: CircleCapabilityQuotaRepository) {}
  async handle(req: object) {
    const verified = getVerifiedTrtcCallback(req), info = verified.body.EventInfo;
    const room = info && typeof info === "object" && "RoomId" in info ? info.RoomId : undefined;
    if (typeof room !== "string" || !room.startsWith("consult_")) return { handled: false };
    const event = parseConsultMediaEvent(verified);
    if (!event) return { handled: true, recorded: false, reason: "UNSUPPORTED_EVENT" };
    return this.prisma.$transaction(async tx => {
      const initial = await tx.$queryRaw<Call[]>`SELECT id, "circleId", "callerId", "expertId", "rtcRoomId"
        FROM "ConsultCall" WHERE "rtcRoomId"=${event.roomId} LIMIT 2`;
      if (initial.length !== 1) return { handled: true, recorded: false, reason: "ROOM_NOT_UNIQUE" };
      await this.scopes.lockScope(tx, initial[0].circleId);
      const call = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${initial[0].id} FOR UPDATE`)[0];
      if (!call || call.circleId !== initial[0].circleId || call.rtcRoomId !== event.roomId) throw new Error("CONSULT_MEDIA_ROOM_DRIFT");
      const boundary = (await tx.$queryRaw<Boundary[]>`SELECT * FROM "ConsultCallMediaBoundary" WHERE "callId"=${call.id} FOR UPDATE`)[0];
      if (!boundary || boundary.scope?.sdkAppId !== event.sdkAppId || boundary.scope?.rtcRoomId !== event.roomId) {
        return { handled: true, recorded: false, reason: "BOUNDARY_NOT_MATCHED" };
      }
      const participants: [string, string] = [consultTrtcUserId(call.callerId, call.rtcRoomId), consultTrtcUserId(call.expertId, call.rtcRoomId)];
      if (participants[0] === participants[1] || (event.userId !== null && !participants.includes(event.userId))) {
        return { handled: true, recorded: false, reason: "PARTICIPANT_NOT_MATCHED" };
      }
      const next = appendConsultMediaEvent(boundary.mediaEvidence, event);
      if (next.events.some(row => row.userId !== null && !participants.includes(row.userId))) throw new Error("CONSULT_MEDIA_PARTICIPANT_DRIFT");
      if (next === boundary.mediaEvidence) return { handled: true, recorded: false, reason: next.overflow ? "OVERFLOW" : "DUPLICATE" };
      const n = await tx.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "mediaEvidence"=${JSON.stringify(next)}::jsonb
        WHERE "callId"=${call.id} AND revision=${boundary.revision}`;
      if (n !== 1) throw new Error("CONSULT_MEDIA_UPDATE_LOST");
      // 只返回观察态，不改变订单、结算、停流意图或资源额度。
      return { handled: true, recorded: true, observation: observeConsultMedia(next, participants) };
    }, { timeout: 15000 });
  }
}
