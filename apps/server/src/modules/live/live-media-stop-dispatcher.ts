import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LiveMediaCredentialRepository } from "./live-media-credential.repository";
import { LiveMediaStopRepository } from "./live-media-stop.repository";
import { LiveCssStopClient } from "./live-css-stop.client";

/** 由可信运维核验来源提供，不能绑定请求 DTO；仅有布尔开关不足以证明腾讯云匹配范围。 */
export interface CssExactScopeAttestation {
  domain: string;
  appName: string;
  evidenceId: string;
  verifiedUntil: Date;
}

/** 后台派发与只读核验，必须由部署侧可信范围证明放行。 */
@Injectable()
export class LiveMediaStopDispatcher {
  constructor(private readonly prisma: PrismaService, private readonly stops: LiveMediaStopRepository,
    private readonly credentials: LiveMediaCredentialRepository, private readonly css: LiveCssStopClient) {}

  /** 只读供应商查询；不调用 forbid、不改意图派发状态、不释放额度。 */
  async verifyCss(roomId: string, attestation: CssExactScopeAttestation | null) {
    if (typeof roomId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(roomId)) {
      throw new Error("LIVE_STOP_ROOM_ID_INVALID");
    }
    const proof = attestation && { domain: attestation.domain, appName: attestation.appName, reference: attestation.evidenceId,
      until: attestation.verifiedUntil instanceof Date ? attestation.verifiedUntil.getTime() : NaN };
    if (!proof || typeof proof.reference !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(proof.reference)
      || !Number.isFinite(proof.until) || proof.until <= Date.now()) return { state: "BLOCKED" as const, reason: "EXACT_SCOPE_NOT_VERIFIED" };
    const prepared = await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${roomId} FOR UPDATE`;
      const room = await tx.liveRoom.findUnique({ where: { id: roomId }, select: { status: true, endTime: true } });
      if (!room || !["ENDED", "REPLAY"].includes(room.status) || !room.endTime) return { state: "BLOCKED" as const, reason: "ROOM_NOT_ENDED" };
      const boundary = (await this.credentials.readInTransaction(tx, roomId)).find(row => row.provider === "CSS");
      const intent = await this.stops.readInTransaction(tx, roomId, "CSS");
      if (!intent || intent.state === "READY") return { state: "BLOCKED" as const, reason: "STOP_NOT_DISPATCHED" };
      if (!boundary || boundary.scope.provider !== "CSS" || intent.scope.provider !== "CSS"
        || boundary.revision !== intent.credentialRevision || boundary.scope.domain !== intent.scope.domain
        || boundary.scope.appName !== intent.scope.appName || boundary.scope.streamName !== intent.scope.streamName) {
        return { state: "BLOCKED" as const, reason: "BOUNDARY_DRIFT" };
      }
      if (proof.domain !== intent.scope.domain || proof.appName !== intent.scope.appName || proof.until <= Date.now()) {
        return { state: "BLOCKED" as const, reason: "EXACT_SCOPE_NOT_VERIFIED" };
      }
      const verification = await this.stops.beginVerificationInTransaction(tx, roomId, intent.operationId, proof, new Date());
      return { state: "QUERYING" as const, operationId: intent.operationId, queryId: verification.queryId, target: {
        roomId, domain: intent.scope.domain, appName: intent.scope.appName, resumeAtMs: intent.protectUntil.getTime(), exactScopeEnabled: true,
      } };
    }, { timeout: 15000 });
    if (!("target" in prepared) || !prepared.target) return prepared;
    let response: { state: "active" | "inactive" | "forbid" | "UNKNOWN"; requestId?: string } = { state: "UNKNOWN" };
    try { response = await this.css.queryState(prepared.target); } catch { /* 原始供应商错误不外传。 */ }
    try {
      const result = await this.prisma.$transaction(tx => this.stops.finishVerificationInTransaction(tx, roomId,
        prepared.operationId, prepared.queryId, response, new Date()), { timeout: 15000 });
      return { state: result.verification?.state ?? "UNKNOWN", applied: result.applied, operationId: prepared.operationId };
    } catch { throw new Error("LIVE_STOP_VERIFICATION_PERSIST_FAILED"); }
  }

  async dispatchCss(roomId: string, attestation: CssExactScopeAttestation | null) {
    if (typeof roomId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(roomId)) {
      throw new Error("LIVE_STOP_ROOM_ID_INVALID");
    }
    // 在异步边界前复制配置，避免等待数据库期间调用方修改证据对象。
    const proof = attestation && { domain: attestation.domain, appName: attestation.appName,
      evidenceId: attestation.evidenceId, until: attestation.verifiedUntil instanceof Date ? attestation.verifiedUntil.getTime() : NaN };
    if (!proof || typeof proof.evidenceId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(proof.evidenceId)
      || !Number.isFinite(proof.until) || proof.until <= Date.now()) {
      return { state: "BLOCKED" as const, reason: "EXACT_SCOPE_NOT_VERIFIED" };
    }
    const prepared = await this.prisma.$transaction(async tx => {
      // 与结束业务、凭据记录采用相同锁序；供应商网络调用绝不在事务内执行。
      await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${roomId} FOR UPDATE`;
      const room = await tx.liveRoom.findUnique({ where: { id: roomId }, select: { status: true, endTime: true } });
      if (!room || !["ENDED", "REPLAY"].includes(room.status) || !room.endTime) return { state: "BLOCKED" as const, reason: "ROOM_NOT_ENDED" };
      const boundary = (await this.credentials.readInTransaction(tx, roomId)).find(row => row.provider === "CSS");
      const intent = await this.stops.readInTransaction(tx, roomId, "CSS");
      if (!intent) return { state: "BLOCKED" as const, reason: "INTENT_NOT_FOUND" };
      if (intent.state !== "READY") return { state: intent.state, operationId: intent.operationId };
      if (!boundary || boundary.scope.provider !== "CSS" || intent.scope.provider !== "CSS"
        || boundary.revision !== intent.credentialRevision || boundary.scope.domain !== intent.scope.domain
        || boundary.scope.appName !== intent.scope.appName || boundary.scope.streamName !== intent.scope.streamName
        || intent.protectUntil.getTime() < boundary.expiresAt.getTime() + 300000) {
        return { state: "BLOCKED" as const, reason: "BOUNDARY_DRIFT" };
      }
      const now = new Date();
      if (proof.until <= now.getTime() || proof.domain !== intent.scope.domain || proof.appName !== intent.scope.appName) {
        return { state: "BLOCKED" as const, reason: "EXACT_SCOPE_NOT_VERIFIED" };
      }
      // 过期边界需只读媒体核验，不能发无效禁推请求，也不能据此释放额度。
      if (intent.protectUntil.getTime() <= now.getTime() + 60000 || intent.protectUntil.getTime() > now.getTime() + 90 * 86400000) {
        return { state: "BLOCKED" as const, reason: "PROTECTION_WINDOW_INVALID" };
      }
      const claim = await this.stops.claimInTransaction(tx, roomId, "CSS", now);
      if (!claim) throw new Error("LIVE_STOP_CLAIM_LOST");
      return { state: "CLAIMED" as const, operationId: claim.operationId, target: {
        roomId, domain: intent.scope.domain, appName: intent.scope.appName,
        resumeAtMs: intent.protectUntil.getTime(), exactScopeEnabled: true,
      } };
    }, { timeout: 15000 });
    if (!("target" in prepared) || !prepared.target) return prepared;
    let result: { state: "UNKNOWN" } | { state: "ACKNOWLEDGED"; requestId: string } = { state: "UNKNOWN" };
    try {
      const response = await this.css.forbidOnce(prepared.target);
      if (response.state === "ACKNOWLEDGED" && typeof response.requestId === "string"
        && /^[A-Za-z0-9-]{1,128}$/.test(response.requestId)) result = { state: "ACKNOWLEDGED", requestId: response.requestId };
    } catch {
      // 供应商可能已执行；不向外传播原始错误、不自动重发。
    }
    try {
      const saved = await this.prisma.$transaction(tx => this.stops.recordResultInTransaction(tx, roomId, "CSS",
        prepared.operationId, result, new Date()), { timeout: 15000 });
      if (!saved) throw new Error("LIVE_STOP_RESULT_MISSING");
      return { state: saved.state, operationId: saved.operationId };
    } catch {
      // 已提交的 DISPATCHING 仍在数据库，后续只能核验/标 UNKNOWN，不能重新领取。
      throw new Error("LIVE_STOP_RESULT_PERSIST_FAILED");
    }
  }
}
