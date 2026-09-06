import { HttpStatus, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { CircleCapabilityService } from "./circle-capability.service";
import { CircleCapabilityQuotaRepository, QuotaAuditActor, validQuotaAuditActor } from "./circle-capability-quota.repository";
import { QuotaBinding, QuotaAction, planQuotaReservation, planQuotaTransition, validQuotaBinding } from "./circle-capability-quota.policy";

type RequestActor = { userId: string; executor: ExecutorType };
const conflict = () => new BusinessException(ErrorCode.CONFLICT, "资源额度或业务状态已变化，请刷新后重试", HttpStatus.CONFLICT);

/** 仅供受信任业务服务在现有主库事务内调用；尚不注册到模块，也不提供客户端 API。 */
@Injectable()
export class CircleCapabilityQuotaService {
  constructor(private readonly capabilities: CircleCapabilityService, private readonly repo: CircleCapabilityQuotaRepository) {}

  async reserveInTransaction(tx: Prisma.TransactionClient, binding: QuotaBinding, actor: RequestActor) {
    assertHumanForRedLine(actor.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!validQuotaBinding(binding) || binding.actorId !== actor.userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "额度业务绑定无效");
    // 内含同圈事务锁、配置/主体行锁和当前角色核验，绝不接受客户端授权快照。
    const verified = await this.capabilities.assertAuthorizationInTransaction(tx, binding.circleId, binding.capability, actor, binding.subjectUserId);
    const byRequest = await this.repo.byRequest(tx, binding.requestKey);
    const byBusiness = await this.repo.byBusiness(tx, binding.businessType, binding.businessId);
    const initialReceipt = await this.repo.receipt(tx, binding.requestKey);
    if (initialReceipt && (!byRequest || initialReceipt.action !== "RESERVE" || initialReceipt.reservationId !== byRequest.id ||
      initialReceipt.appliedRevision !== 1 || initialReceipt.actorId !== actor.userId || initialReceipt.source !== "USER" ||
      Object.keys(binding).some(k => binding[k] !== initialReceipt.binding[k]))) throw conflict();
    if (byRequest && !initialReceipt) throw new Error("QUOTA_INITIAL_RECEIPT_MISSING");
    const usage = byRequest || byBusiness ? [] : await this.repo.usage(tx,
      [...(verified.circleGrant ? [verified.circleGrant.id] : []), ...(verified.providerGrant ? [verified.providerGrant.id] : [])], verified.checkedAt);
    const plan = planQuotaReservation({ id: randomUUID(), binding, authorization: verified.authorization, now: verified.checkedAt,
      usage, existingByRequest: byRequest, existingByBusiness: byBusiness });
    if (!plan.allowed) this.reject(plan.reason);
    if (plan.effect === "NONE") return plan;
    const stored = await this.repo.insert(tx, plan.reservation);
    await this.repo.writeReceipt(tx, binding.requestKey, "RESERVE", { source: "USER", actorId: actor.userId, evidenceRef: null }, null, stored);
    return { allowed: true as const, effect: "INSERT_HELD" as const, reservation: stored };
  }

  async activateInTransaction(tx: Prisma.TransactionClient, input: { reservationId: string; binding: QuotaBinding; operationKey: string; expectedRevision: number }, actor: RequestActor) {
    assertHumanForRedLine(actor.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (actor.userId !== input.binding.actorId) throw new BusinessException(ErrorCode.FORBIDDEN, "业务发起人不匹配");
    return this.transition(tx, { ...input, action: "ACTIVATE" }, { source: "USER", actorId: actor.userId, evidenceRef: null }, actor);
  }

  /** 调用者必须在同事务核对真实业务状态/回调事件。不能把这些参数直接暴露为 HTTP DTO。 */
  async settleInTransaction(tx: Prisma.TransactionClient, input: { reservationId: string; binding: QuotaBinding; operationKey: string;
    expectedRevision: number; action: Exclude<QuotaAction, "ACTIVATE">; evidenceRef: string }) {
    if (!["COMPLETE", "RELEASE", "EXPIRE"].includes(input.action)) throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的额度收尾操作");
    return this.transition(tx, input, { source: "BUSINESS_ADAPTER", actorId: null, evidenceRef: input.evidenceRef });
  }

  private async transition(tx: Prisma.TransactionClient, input: { reservationId: string; binding: QuotaBinding; operationKey: string; expectedRevision: number; action: QuotaAction },
    auditActor: QuotaAuditActor, actor?: RequestActor) {
    if (!validQuotaBinding(input.binding) || !validQuotaAuditActor(auditActor)) throw new BusinessException(ErrorCode.BAD_REQUEST, "额度操作绑定无效");
    await this.repo.lockScope(tx, input.binding.circleId);
    const current = await this.repo.byId(tx, input.reservationId);
    if (!current) throw new BusinessException(ErrorCode.NOT_FOUND, "资源额度记录不存在");
    const receipt = await this.repo.receipt(tx, input.operationKey);
    if (receipt && (receipt.action === "RESERVE" || receipt.source !== auditActor.source || receipt.actorId !== auditActor.actorId || receipt.evidenceRef !== auditActor.evidenceRef)) throw conflict();
    // 已成功的旧操作只回读；不能因之后撤权而重发 SDK，也不再尝试状态更新。
    const verified = !receipt && input.action === "ACTIVATE" ? await this.capabilities.assertAuthorizationInTransaction(tx,
      input.binding.circleId, input.binding.capability, actor!, input.binding.subjectUserId) : null;
    const priorReceipt = receipt && receipt.action !== "RESERVE" ? { ...receipt, action: receipt.action } : null;
    const plan = planQuotaTransition(current, { ...input, now: verified?.checkedAt ?? new Date(), authorization: verified?.authorization, priorReceipt });
    if (!plan.allowed) this.reject(plan.reason);
    if (plan.effect === "NONE") return plan;
    const stored = await this.repo.compareAndSet(tx, current, plan.reservation);
    if (!stored) throw conflict();
    await this.repo.writeReceipt(tx, input.operationKey, input.action, auditActor, current, stored);
    return { ...plan, reservation: stored };
  }

  private reject(reason: string): never {
    if (["IDEMPOTENCY_CONFLICT", "STALE_REVISION", "GRANT_CHANGED", "HOLD_EXPIRED", "HOLD_NOT_EXPIRED", "INVALID_TRANSITION"].includes(reason)) throw conflict();
    if (reason === "QUOTA_EXHAUSTED" || reason === "CONCURRENCY_LIMIT") throw new BusinessException(ErrorCode.FORBIDDEN, "当前能力额度或并发名额不足");
    throw new BusinessException(ErrorCode.FORBIDDEN, "当前授权或资源记录不可用");
  }
}
