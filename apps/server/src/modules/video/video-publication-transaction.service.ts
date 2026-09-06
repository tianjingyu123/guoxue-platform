import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { CircleCapabilityQuotaService } from "../circle/circle-capability-quota.service";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { QuotaBinding } from "../circle/circle-capability-quota.policy";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 短视频投稿资源事务；调用方必须传真实主库事务，提交前不允许调度外部机审。 */
@Injectable()
export class VideoPublicationTransactionService {
  constructor(private readonly quota: CircleCapabilityQuotaService, private readonly repo: CircleCapabilityQuotaRepository) {}

  async createInTransaction<T extends { id: string }>(tx: Prisma.TransactionClient,
    input: { circleId: string; userId: string; videoId: string; requestKey: string; executor: ExecutorType },
    writeVideoAndAudit: (videoId: string) => Promise<T>): Promise<T> {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (![input.circleId, input.userId, input.videoId, input.requestKey].every(value => typeof value === "string" && uuid.test(value))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "投稿业务标识无效");
    }
    // 先锁同圈，再决定圈主/个人直授主体，与授权撤销共用锁顺序。
    await this.repo.lockScope(tx, input.circleId);
    const circle = await tx.circle.findUnique({ where: { id: input.circleId }, select: { ownerId: true } });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    const binding: QuotaBinding = { circleId: input.circleId, capability: "SHORT_VIDEO", actorId: input.userId,
      subjectUserId: circle.ownerId === input.userId ? null : input.userId, businessType: "SHORT_VIDEO_PUBLISH",
      businessId: input.videoId, requestKey: input.requestKey, units: 1, holdSeconds: 60 };
    const actor = { userId: input.userId, executor: input.executor };
    const held = await this.quota.reserveInTransaction(tx, binding, actor);
    // 本方法只做一次新投稿；重复请求必须由外层从已提交业务读取，不重复写视频或发机审。
    if (held.effect !== "INSERT_HELD") throw new BusinessException(ErrorCode.CONFLICT, "投稿请求已处理，请刷新查看结果");
    const active = await this.quota.activateInTransaction(tx, { reservationId: held.reservation.id, binding,
      operationKey: randomUUID(), expectedRevision: held.reservation.revision }, actor);
    if (active.reservation.state !== "ACTIVE") throw new Error("VIDEO_QUOTA_NOT_ACTIVE");
    const result = await writeVideoAndAudit(input.videoId);
    if (result.id !== input.videoId) throw new Error("VIDEO_PUBLICATION_ID_MISMATCH");
    // 不能把错误作者/圈子的记录当作本次业务完成证据。
    const stored = await tx.video.findUnique({ where: { id: input.videoId }, select: { userId: true, circleId: true } });
    if (!stored || stored.userId !== input.userId || stored.circleId !== input.circleId) throw new Error("VIDEO_PUBLICATION_BINDING_MISMATCH");
    // 次数按成功提交的投稿计；审核是否允许展示是独立状态，不能因驳回后删除视频返还已提交次数。
    const completed = await this.quota.settleInTransaction(tx, { reservationId: active.reservation.id, binding,
      operationKey: randomUUID(), expectedRevision: active.reservation.revision, action: "COMPLETE", evidenceRef: `video:${input.videoId}` });
    if (completed.reservation.state !== "COMPLETED") throw new Error("VIDEO_QUOTA_NOT_COMPLETED");
    return result;
  }
}
