import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { CircleCapabilityQuotaService } from "../circle/circle-capability-quota.service";
import { LiveMediaEvidenceRepository } from "./live-media-evidence.repository";
import { LiveMediaCredentialRepository } from "./live-media-credential.repository";
import { LiveMediaStopRepository } from "./live-media-stop.repository";
import { cssCompletionEvidence } from "./live-media-completion.policy";

/** 内部可信收尾，无请求 DTO；不调用供应商，所有证据和额度在同一主库事务核对。 */
@Injectable()
export class LiveMediaCompletionService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: CircleCapabilityQuotaRepository,
    private readonly quota: CircleCapabilityQuotaService, private readonly media: LiveMediaEvidenceRepository,
    private readonly credentials: LiveMediaCredentialRepository, private readonly stops: LiveMediaStopRepository) {}

  async completeCss(roomId: string) {
    return this.prisma.$transaction(async tx => {
      const pending = (reason: string) => ({ state: "PENDING" as const, reason });
      const initial = await tx.liveRoom.findUnique({ where: { id: roomId }, select: { circleId: true } });
      if (!initial) return pending("ROOM_NOT_FOUND");
      if (initial.circleId) await this.ledger.lockScope(tx, initial.circleId);
      // 与回调和删除统一：圈子锁 → 媒体锁 → 房间行锁 → 凭据 → 停流记录。
      await this.media.lockRoom(tx, roomId);
      await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${roomId} FOR UPDATE`;
      const room = await tx.liveRoom.findUnique({ where: { id: roomId } });
      if (!room || room.circleId !== initial.circleId) return pending("ROOM_SCOPE_CHANGED");
      if (!["ENDED", "REPLAY"].includes(room.status) || !room.endTime) return pending("ROOM_NOT_ENDED");
      const boundaries = await this.credentials.readInTransaction(tx, roomId);
      const stop = await this.stops.readInTransaction(tx, roomId, "CSS");
      const current = await this.ledger.byBusiness(tx, "LIVE_SESSION", roomId);
      if (!current) return pending("NO_QUOTA_RECORD");
      if (current.binding.circleId !== room.circleId || current.binding.actorId !== room.hostUserId
        || current.binding.capability !== "LIVE") return pending("QUOTA_BINDING_MISMATCH");
      const evidenceRef = stop && `live-stop:${stop.operationId}`;
      if (stop?.completion) {
        const receipt = await this.ledger.receipt(tx, stop.operationId);
        if (current.state !== "COMPLETED" || current.id !== stop.completion.quotaId || current.revision !== stop.completion.quotaRevision
          || !receipt || receipt.action !== "COMPLETE" || receipt.reservationId !== current.id || receipt.appliedRevision !== current.revision
          || receipt.source !== "BUSINESS_ADAPTER" || receipt.evidenceRef !== evidenceRef) throw new Error("LIVE_COMPLETION_RECEIPT_INVALID");
        return { state: "COMPLETED" as const, changed: false };
      }
      if (current.state !== "ACTIVE") return pending("QUOTA_NOT_ACTIVE");
      const observed = await this.media.readInTransaction(tx, roomId), nowMs = Date.now();
      const proof = cssCompletionEvidence(boundaries, stop, observed, nowMs);
      if (!proof.allowed) return pending(proof.reason);
      if (room.endTime.getTime() > nowMs || room.endTime.getTime() > stop!.verification!.startedAtMs) return pending("END_TIME_UNVERIFIED");
      const settled = await this.quota.settleInTransaction(tx, { reservationId: current.id, binding: current.binding,
        operationKey: proof.operationId, expectedRevision: current.revision, action: "COMPLETE", evidenceRef: evidenceRef! });
      await this.stops.saveCompletionInTransaction(tx, roomId, proof.operationId, { quotaId: current.id,
        quotaRevision: settled.reservation.revision, completedAtMs: settled.reservation.terminalAt!.getTime(), mediaRevision: proof.mediaRevision,
        credentialRevision: proof.credentialRevision, verification: stop!.verification! });
      return { state: "COMPLETED" as const, changed: true };
    }, { timeout: 15000 });
  }
}
