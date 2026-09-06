import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { CircleCapabilityQuotaService } from "./circle-capability-quota.service";
import { CircleCapabilityQuotaRepository } from "./circle-capability-quota.repository";
import { QuotaBinding, validQuotaBinding } from "./circle-capability-quota.policy";
import { CircleCapabilityDispatchRepository } from "./circle-capability-dispatch.repository";

type Actor = { userId: string; executor: ExecutorType };

/** 内部事务组合器，尚不注册到模块。调用方须核验真实业务归属，不得在事务内外发。 */
@Injectable()
export class CircleCapabilityDispatchService {
  constructor(private readonly quota: CircleCapabilityQuotaService,
    private readonly quotas: CircleCapabilityQuotaRepository,
    private readonly dispatches: CircleCapabilityDispatchRepository) {}

  async reserveInTransaction(tx: Prisma.TransactionClient, binding: QuotaBinding, actor: Actor) {
    const result = await this.quota.reserveInTransaction(tx, binding, actor);
    const existing = await this.dispatches.byReservation(tx, result.reservation.id);
    if (result.effect === "NONE") {
      if (!existing) throw new Error("DISPATCH_REPLAY_RECORD_MISSING");
      return { effect: "NONE" as const, reservation: result.reservation, dispatch: existing };
    }
    if (existing) throw new Error("DISPATCH_UNEXPECTED_EXISTING_RECORD");
    const dispatch = await this.dispatches.insertReady(tx, { id: randomUUID(), reservationId: result.reservation.id,
      providerOperationKey: randomUUID(), expectedQuotaRevision: result.reservation.revision, now: new Date() });
    return { effect: "PREPARED" as const, reservation: result.reservation, dispatch };
  }

  /** CLAIMED 仅在外层事务成功提交后可消费；NONE 永远不得触发发送，UNKNOWN 只能核对供应商结果。 */
  async claimInTransaction(tx: Prisma.TransactionClient, input: {
    reservationId: string; binding: QuotaBinding; expectedQuotaRevision: number; expectedDispatchRevision: number; leaseSeconds: number;
  }, actor: Actor) {
    assertHumanForRedLine(actor.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!validQuotaBinding(input.binding) || actor.userId !== input.binding.actorId ||
      !Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 1 || input.leaseSeconds > 300) throw new Error("DISPATCH_INVALID_CLAIM");
    await this.quotas.lockScope(tx, input.binding.circleId);
    const reservation = await this.quotas.byId(tx, input.reservationId);
    if (!reservation || Object.keys(reservation.binding).some(key => reservation.binding[key] !== input.binding[key])) {
      throw new Error("DISPATCH_BUSINESS_BINDING_MISMATCH");
    }
    const previous = await this.dispatches.byReservation(tx, reservation.id);
    if (!previous) throw new Error("DISPATCH_RECORD_MISSING");
    if (previous.state !== "READY") return { effect: "NONE" as const, dispatch: previous };
    if (previous.revision !== input.expectedDispatchRevision) throw new Error("DISPATCH_STALE_REVISION");
    const active = await this.quota.activateInTransaction(tx, { reservationId: reservation.id, binding: input.binding,
      expectedRevision: input.expectedQuotaRevision, operationKey: previous.providerOperationKey }, actor);
    if (active.effect === "NONE" || active.reservation.state !== "ACTIVE") throw new Error("DISPATCH_ACTIVATION_DRIFT");
    const now = new Date();
    const leaseUntil = new Date(Math.min(now.getTime() + input.leaseSeconds * 1000, active.reservation.holdUntil.getTime()));
    const dispatch = await this.dispatches.transition(tx, previous, input.expectedDispatchRevision, now,
      { type: "CLAIM", leaseToken: randomUUID(), leaseUntil, holdUntil: active.reservation.holdUntil });
    // 零行不能当成功；必须回滚同事务中已激活的额度及回执。
    if (!dispatch) throw new Error("DISPATCH_CLAIM_CONFLICT");
    return { effect: "CLAIMED" as const, dispatch };
  }

  /** 仅供已验签/已核对真实业务的内部适配器使用；接受成功不等于业务结束，不释放 ACTIVE 额度。 */
  async confirmInTransaction(tx: Prisma.TransactionClient, input: {
    reservationId: string; binding: QuotaBinding; providerOperationKey: string; leaseToken: string;
    expectedDispatchRevision: number; evidenceRef: string;
  }) {
    if (!validQuotaBinding(input.binding) || typeof input.evidenceRef !== "string" ||
      !/^[A-Za-z0-9_./:-]{1,128}$/.test(input.evidenceRef)) throw new Error("DISPATCH_INVALID_CONFIRM");
    await this.quotas.lockScope(tx, input.binding.circleId);
    const reservation = await this.quotas.byId(tx, input.reservationId);
    if (!reservation || Object.keys(reservation.binding).some(key => reservation.binding[key] !== input.binding[key])) {
      throw new Error("DISPATCH_BUSINESS_BINDING_MISMATCH");
    }
    const previous = await this.dispatches.byReservation(tx, reservation.id);
    if (!previous || previous.providerOperationKey !== input.providerOperationKey || previous.leaseToken !== input.leaseToken) {
      throw new Error("DISPATCH_CONFIRM_IDENTITY_MISMATCH");
    }
    if (previous.state === "CONFIRMED") {
      if (previous.evidenceRef !== input.evidenceRef) throw new Error("DISPATCH_CONFIRM_EVIDENCE_CONFLICT");
      return { effect: "NONE" as const, dispatch: previous };
    }
    if (reservation.state !== "ACTIVE") throw new Error("DISPATCH_CONFIRM_QUOTA_NOT_ACTIVE");
    const dispatch = await this.dispatches.transition(tx, previous, input.expectedDispatchRevision, new Date(),
      { type: "CONFIRM", leaseToken: input.leaseToken, evidenceRef: input.evidenceRef });
    if (!dispatch) throw new Error("DISPATCH_CONFIRM_CONFLICT");
    return { effect: "CONFIRMED" as const, dispatch };
  }
}
