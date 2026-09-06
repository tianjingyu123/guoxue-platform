import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { CircleCapabilityQuotaService } from "../circle/circle-capability-quota.service";
import { CircleCapabilityService } from "../circle/circle-capability.service";
import { QuotaBinding } from "../circle/circle-capability-quota.policy";
import { consultTrtcUserId, TrtcConfig } from "./trtc-sig.util";
import { ConsultStopIntent, createConsultStopIntent, validConsultStopIntent } from "./consult-call-stop-intent.policy";

interface Call { id: string; circleId: string; callerId: string; expertId: string; type: string; status: string; rtcRoomId: string }
interface Boundary { callId: string; scope: { sdkAppId: number; rtcRoomId: string }; expiresAt: Date; revision: number; stopIntent?: ConsultStopIntent | null }
const conflict = () => new BusinessException(ErrorCode.CONFLICT, "咨询资源或授权已变化，请刷新后重试", HttpStatus.CONFLICT);

/** 仅供同一主库事务内调用，不提供独立的签发/释放 HTTP 接口。 */
@Injectable()
export class ConsultCallResourceService {
  constructor(private readonly capabilities: CircleCapabilityService, private readonly scopes: CircleCapabilityQuotaRepository,
    private readonly quota: CircleCapabilityQuotaService) {}

  /** 终态 CAS 前调用，保持与接听一致的圈子锁→订单锁顺序，避免交叉死锁。 */
  async lockForStopInTransaction(tx: Prisma.TransactionClient, callId: string) {
    const initial = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId}`)[0];
    if (!initial) throw new BusinessException(ErrorCode.NOT_FOUND, "通话记录不存在");
    await this.scopes.lockScope(tx, initial.circleId);
    const locked = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId} FOR UPDATE`)[0];
    if (!locked || locked.circleId !== initial.circleId) throw conflict();
  }

  /** 同一事务内成功认领终态后调用；退款失败会连同待办一起回滚。 */
  async requestStopInTransaction(tx: Prisma.TransactionClient, callId: string, reason: ConsultStopIntent["reason"], requestedBy: string | null) {
    const call = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId}`)[0];
    if (!call || (["END", "BUDGET_TIMEOUT"].includes(reason) ? call.status !== "ENDED" : reason === "WAITING_TIMEOUT" ? call.status !== "MISSED"
      : !["MISSED", "REFUNDED"].includes(call.status))) throw conflict();
    if (!["WAITING_TIMEOUT", "BUDGET_TIMEOUT"].includes(reason) && requestedBy !== call.callerId && requestedBy !== call.expertId) throw conflict();
    const boundary = (await tx.$queryRaw<Boundary[]>`SELECT * FROM "ConsultCallMediaBoundary" WHERE "callId"=${callId} FOR UPDATE`)[0];
    // 历史订单无可信签发范围，不能伪造停流待办；取消和退款仍可正常完成。
    if (!boundary) return { tracked: false };
    if (boundary.scope?.rtcRoomId !== call.rtcRoomId) throw conflict();
    if (boundary.stopIntent) {
      if (!validConsultStopIntent(boundary.stopIntent, boundary, call)) throw conflict();
      return { tracked: true };
    }
    const intent = createConsultStopIntent({ operationId: randomUUID(), reason, requestedBy, now: new Date(), boundary });
    const n = await tx.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "stopIntent"=${JSON.stringify(intent)}::jsonb
      WHERE "callId"=${callId} AND revision=${boundary.revision} AND "stopIntent" IS NULL`;
    if (n !== 1) throw conflict();
    return { tracked: true };
  }

  async issueInTransaction(tx: Prisma.TransactionClient, callId: string, stage: "INITIATE" | "ACCEPT",
    actor: { userId: string; executor: ExecutorType }, ticket: TrtcConfig) {
    assertHumanForRedLine(actor.executor, [RedLine.EXTERNAL_PUBLISH]);
    const initial = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId}`)[0];
    if (!initial) throw new BusinessException(ErrorCode.NOT_FOUND, "通话记录不存在");
    await this.scopes.lockScope(tx, initial.circleId);
    const call = (await tx.$queryRaw<Call[]>`SELECT * FROM "ConsultCall" WHERE id=${callId} FOR UPDATE`)[0];
    if (!call || call.circleId !== initial.circleId || call.status !== "WAITING" || !["VOICE", "VIDEO"].includes(call.type)) throw conflict();
    if (!["INITIATE", "ACCEPT"].includes(stage) || actor.userId !== (stage === "INITIATE" ? call.callerId : call.expertId)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "通话票据领取人不匹配");
    }
    const expiresAt = new Date(ticket.expiresAt ?? ""), now = Date.now();
    if (!ticket.configured || !ticket.userSig || !ticket.privateMapKey || ticket.userId !== consultTrtcUserId(actor.userId, call.rtcRoomId)
      || !/^consult_[a-f0-9]{16}$/.test(call.rtcRoomId) || ticket.roomId !== call.rtcRoomId || ticket.strRoomId !== call.rtcRoomId
      || !Number.isSafeInteger(ticket.sdkAppId) || ticket.sdkAppId < 1 || ticket.sdkAppId > 0xffffffff
      || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now || expiresAt.getTime() > now + 86400000) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "通话票据范围或有效期无效");
    }
    const capability = call.type === "VOICE" ? "AUDIO_QUESTION" : "VIDEO_QUESTION";
    const verified = await this.capabilities.assertAuthorizationInTransaction(tx, call.circleId, capability, actor, call.expertId);
    const existing = await this.scopes.byBusiness(tx, capability, call.id);
    if (stage === "INITIATE") {
      if (existing) throw conflict();
      const binding: QuotaBinding = { circleId: call.circleId, capability, actorId: call.callerId, subjectUserId: call.expertId,
        businessType: capability, businessId: call.id, requestKey: call.id, units: 1, holdSeconds: 60 };
      const held = await this.quota.reserveInTransaction(tx, binding, actor);
      if (held.effect !== "INSERT_HELD") throw conflict();
      const active = await this.quota.activateInTransaction(tx, { reservationId: held.reservation.id, binding,
        operationKey: randomUUID(), expectedRevision: held.reservation.revision }, actor);
      if (active.reservation.state !== "ACTIVE") throw conflict();
    } else {
      const binding = existing?.binding;
      if (!existing || existing.state !== "ACTIVE" || binding?.circleId !== call.circleId || binding.actorId !== call.callerId
        || binding.subjectUserId !== call.expertId || binding.capability !== capability || existing.ownerId !== verified.authorization.context.ownerId
        || existing.circleGrantId !== (verified.circleGrant?.id ?? null) || existing.circleGrantRevision !== (verified.circleGrant?.revision ?? null)
        || existing.providerGrantId !== (verified.providerGrant?.id ?? null) || existing.providerGrantRevision !== (verified.providerGrant?.revision ?? null)
        || existing.policyRevision !== (verified.circleGrant ?? verified.providerGrant)?.policyRevision) throw conflict();
    }
    const previous = (await tx.$queryRaw<Boundary[]>`SELECT * FROM "ConsultCallMediaBoundary" WHERE "callId"=${callId} FOR UPDATE`)[0];
    const scope = { sdkAppId: ticket.sdkAppId, rtcRoomId: call.rtcRoomId };
    if (previous) {
      if (stage === "INITIATE" || previous.stopIntent || previous.scope?.sdkAppId !== scope.sdkAppId || previous.scope?.rtcRoomId !== scope.rtcRoomId
        || !(previous.expiresAt instanceof Date) || !Number.isFinite(previous.expiresAt.getTime())
        || !Number.isInteger(previous.revision) || previous.revision < 1 || previous.revision >= 2147483647) throw conflict();
      if (expiresAt > previous.expiresAt) {
        const n = await tx.$executeRaw`UPDATE "ConsultCallMediaBoundary" SET "expiresAt"=${expiresAt.toISOString()}::timestamptz AT TIME ZONE 'UTC',
          revision=revision+1 WHERE "callId"=${callId} AND revision=${previous.revision}`;
        if (n !== 1) throw conflict();
      }
    } else {
      if (stage !== "INITIATE") throw conflict();
      const n = await tx.$executeRaw`INSERT INTO "ConsultCallMediaBoundary" ("callId", scope, "expiresAt", revision)
        VALUES (${callId}, ${JSON.stringify(scope)}::jsonb, ${expiresAt.toISOString()}::timestamptz AT TIME ZONE 'UTC', 1)`;
      if (n !== 1) throw conflict();
    }
    // 不保存票据原文。ACTIVE 仅在未来的可信媒体收尾事务中释放，取消/退款不能据此释放。
  }
}
