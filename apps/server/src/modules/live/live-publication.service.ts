import { HttpStatus, Injectable } from "@nestjs/common";
import { LiveMic, LiveRoom, Prisma } from "@prisma/client";
import { CircleCapabilityService } from "../circle/circle-capability.service";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CircleCapabilityQuotaService } from "../circle/circle-capability-quota.service";
import { QuotaBinding } from "../circle/circle-capability-quota.policy";
import { randomUUID } from "node:crypto";
import { assertPublicationActorInTransaction } from "../../common/publication-actor";

/** 创建预告不占并发；领取可推流凭据或正式开播时原子占用资源。 */
@Injectable()
export class LivePublicationService {
  constructor(private readonly capabilities: CircleCapabilityService, private readonly scopes: CircleCapabilityQuotaRepository,
    private readonly quota: CircleCapabilityQuotaService) {}

  /** 外层角色快照不能充当事务内豁免；撤权与停用必须在签发/状态变更前生效。 */
  private async verifyOperator(tx: Prisma.TransactionClient, operatorId: string, adminClaim: boolean) {
    await assertPublicationActorInTransaction(tx, operatorId, adminClaim);
  }

  /** RTC 发流票据与房间、主播资格、本人账号及获批麦位共同锁定；不影响 CDN 观看。 */
  async rtcInTransaction<T>(tx: Prisma.TransactionClient, input: { roomId: string; userId: string; executor: ExecutorType },
    sign: (room: LiveRoom, mic: LiveMic | null) => T) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!input.userId) throw new BusinessException(ErrorCode.FORBIDDEN, "票据领取人不能为空");
    const initial = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!initial) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (initial.circleId) await this.scopes.lockScope(tx, initial.circleId);
    await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${input.roomId} FOR UPDATE`;
    const room = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!room || room.circleId !== initial.circleId) throw new BusinessException(ErrorCode.CONFLICT, "直播归属已更新", HttpStatus.CONFLICT);
    if (room.status !== "LIVING" || !room.trtcRoomId || room.auditStatus === "REJECTED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    }
    const ids = [...new Set([room.hostUserId, input.userId])].sort();
    const users = await tx.$queryRaw<Array<{ id: string; status: string; deletedAt: Date | null }>>(Prisma.sql`SELECT id, status, "deletedAt" FROM "User"
      WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`);
    if (users.length !== ids.length || users.some(user => user.status !== "ACTIVE" || user.deletedAt)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "直播参与账号不可用");
    }
    // 管理员身份取当前主库且锁住既有角色，不能把旧 JWT 或圈子绑定角色当平台豁免。
    const roles = await tx.$queryRaw<Array<{ roleType: string; bindId: string | null }>>`SELECT "roleType", "bindId" FROM "UserRole"
      WHERE "userId"=${room.hostUserId} ORDER BY id FOR SHARE`;
    const platformHost = roles.some(role => role.bindId === null && ["SUPER_ADMIN", "OPERATION_ADMIN"].includes(role.roleType));
    if (!platformHost) await this.ensureMediaQuota(tx, room, room.hostUserId, input.executor);
    let mic: LiveMic | null = null;
    if (input.userId !== room.hostUserId) {
      const mics = await tx.$queryRaw<LiveMic[]>`SELECT * FROM "LiveMic" WHERE "liveRoomId"=${room.id} AND "userId"=${input.userId} FOR SHARE`;
      mic = mics[0] ?? null;
      if (!mic || !["OCCUPIED", "MUTED"].includes(mic.status)) throw new BusinessException(ErrorCode.FORBIDDEN, "连麦申请尚未获主播批准");
    }
    return sign(room, mic);
  }

  /** 签名计算必须是纯本地同步动作；凭据仅在外层事务提交后才能返回给客户端。 */
  async signInTransaction<T>(tx: Prisma.TransactionClient, input: { roomId: string; operatorId: string; isAdmin: boolean; executor: ExecutorType },
    sign: (room: LiveRoom) => T) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!input.operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "推流凭据领取人不能为空");
    const initial = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!initial) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (initial.circleId) await this.scopes.lockScope(tx, initial.circleId);
    await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${input.roomId} FOR UPDATE`;
    const room = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!room || room.circleId !== initial.circleId) throw new BusinessException(ErrorCode.CONFLICT, "直播归属已更新", HttpStatus.CONFLICT);
    await this.verifyOperator(tx, input.operatorId, input.isAdmin);
    if (!input.isAdmin && room.hostUserId !== input.operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播可获取推流地址");
    if (room.hostUserId !== input.operatorId) await assertPublicationActorInTransaction(tx, room.hostUserId, false);
    if (!["WAITING", "LIVING"].includes(room.status) || room.auditStatus === "REJECTED") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "直播已结束或不可用，不能再领取推流凭据");
    }
    if (!input.isAdmin) await this.ensureMediaQuota(tx, room, input.operatorId, input.executor);
    return sign(room);
  }

  /** 签发已足以开始消耗资源，立即 ACTIVE；刷新和正式开播复用同一份，不新增次数。 */
  private async ensureMediaQuota(tx: Prisma.TransactionClient, room: LiveRoom, operatorId: string, executor: ExecutorType) {
    if (!room.circleId) throw new BusinessException(ErrorCode.FORBIDDEN, "缺少直播所属圈子的发布授权");
    const circle = await tx.circle.findUnique({ where: { id: room.circleId }, select: { ownerId: true } });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    const subjectUserId = circle.ownerId === operatorId ? null : operatorId;
    const actor = { userId: operatorId, executor };
    const verified = await this.capabilities.assertAuthorizationInTransaction(tx, room.circleId, "LIVE", actor, subjectUserId);
    const existing = await this.scopes.byBusiness(tx, "LIVE_SESSION", room.id);
    if (existing) {
      const binding = existing.binding, policy = verified.authorization.policy;
      if (existing.state !== "ACTIVE" || binding.circleId !== room.circleId || binding.actorId !== operatorId
        || binding.subjectUserId !== subjectUserId || binding.capability !== "LIVE" || existing.ownerId !== circle.ownerId
        || existing.circleGrantId !== (verified.circleGrant?.id ?? null) || existing.circleGrantRevision !== (verified.circleGrant?.revision ?? null)
        || existing.providerGrantId !== (verified.providerGrant?.id ?? null) || existing.providerGrantRevision !== (verified.providerGrant?.revision ?? null)
        || !policy.ok || existing.policyRevision !== policy.rule.revision) {
        throw new BusinessException(ErrorCode.CONFLICT, "直播资源或授权已变化，请先结束本场直播", HttpStatus.CONFLICT);
      }
      return existing;
    }
    const binding: QuotaBinding = { circleId: room.circleId, capability: "LIVE", actorId: operatorId, subjectUserId,
      businessType: "LIVE_SESSION", businessId: room.id, requestKey: randomUUID(), units: 1, holdSeconds: 60 };
    const held = await this.quota.reserveInTransaction(tx, binding, actor);
    if (held.effect !== "INSERT_HELD") throw new BusinessException(ErrorCode.CONFLICT, "开播请求已处理，请刷新状态", HttpStatus.CONFLICT);
    const active = await this.quota.activateInTransaction(tx, { reservationId: held.reservation.id, binding,
      operationKey: randomUUID(), expectedRevision: held.reservation.revision }, actor);
    if (active.reservation.state !== "ACTIVE") throw new Error("LIVE_QUOTA_NOT_ACTIVE");
    return active.reservation;
  }

  /** 同一房间只能从 WAITING 开播一次；额度激活与状态更新同事务，不在此调用 SDK。 */
  async startInTransaction(tx: Prisma.TransactionClient, input: { roomId: string; operatorId: string; isAdmin: boolean;
    executor: ExecutorType; obsPreflight: boolean; pushUrl: string; pullUrl: string; trtcRoomId: string }) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!input.operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "开播操作者不能为空");
    const initial = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!initial) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (initial.circleId) await this.scopes.lockScope(tx, initial.circleId);
    await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${input.roomId} FOR UPDATE`;
    const room = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!room || room.circleId !== initial.circleId) throw new BusinessException(ErrorCode.CONFLICT, "直播归属已更新，请刷新", HttpStatus.CONFLICT);
    await this.verifyOperator(tx, input.operatorId, input.isAdmin);
    if (room.status !== "WAITING") throw new BusinessException(ErrorCode.CONFLICT, "直播状态已变化，不能重复开播", HttpStatus.CONFLICT);
    if (!input.isAdmin && room.hostUserId !== input.operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以开播");
    if (room.hostUserId !== input.operatorId) await assertPublicationActorInTransaction(tx, room.hostUserId, false);
    if (room.auditStatus === "REJECTED") throw new BusinessException(ErrorCode.FORBIDDEN, "该直播间已下架");
    if (room.orientation === "landscape" && !input.obsPreflight) throw new BusinessException(ErrorCode.BAD_REQUEST, "OBS 直播必须先通过媒体检测");
    if (!input.isAdmin) await this.ensureMediaQuota(tx, room, input.operatorId, input.executor);
    const claimed = await tx.liveRoom.updateMany({ where: { id: room.id, status: "WAITING", circleId: room.circleId,
      hostUserId: room.hostUserId, auditStatus: { not: "REJECTED" }, orientation: room.orientation }, data: {
      status: "LIVING", startTime: new Date(), pushUrl: input.pushUrl, pullUrl: input.pullUrl, trtcRoomId: input.trtcRoomId,
    } });
    if (claimed.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "直播状态已更新，本次开播未生效", HttpStatus.CONFLICT);
    return tx.liveRoom.findUniqueOrThrow({ where: { id: room.id } });
  }

  /** 结束业务不重新要求发布资格；撤权后仍须能够下播。媒体停止尚未确认，保留 ACTIVE。 */
  async endInTransaction(tx: Prisma.TransactionClient, input: { roomId: string; operatorId: string; isAdmin: boolean; executor: ExecutorType }) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!input.operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "下播操作者不能为空");
    const initial = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!initial) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (initial.circleId) await this.scopes.lockScope(tx, initial.circleId);
    await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${input.roomId} FOR UPDATE`;
    const room = await tx.liveRoom.findUnique({ where: { id: input.roomId } });
    if (!room || room.circleId !== initial.circleId) throw new BusinessException(ErrorCode.CONFLICT, "直播归属已更新", HttpStatus.CONFLICT);
    await this.verifyOperator(tx, input.operatorId, input.isAdmin);
    if (!input.isAdmin && room.hostUserId !== input.operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以结束直播");
    if (room.status === "ENDED") return { room, changed: false };
    if (!["WAITING", "LIVING", "REPLAY"].includes(room.status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可下播");
    const claimed = await tx.liveRoom.updateMany({ where: { id: room.id, status: room.status, hostUserId: room.hostUserId, circleId: room.circleId },
      data: { status: "ENDED", endTime: new Date() } });
    if (claimed.count !== 1) throw new BusinessException(ErrorCode.CONFLICT, "直播状态已变化，请刷新确认", HttpStatus.CONFLICT);
    return { room: await tx.liveRoom.findUniqueOrThrow({ where: { id: room.id } }), changed: true };
  }

  async createInTransaction<T>(tx: Prisma.TransactionClient,
    input: { circleId?: string; userId: string; hostUserId: string; executor: ExecutorType },
    writeRoomAndAudit: () => Promise<T>): Promise<T> {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    if (!input.circleId) throw new BusinessException(ErrorCode.BAD_REQUEST, "创建直播必须选择已获授权的圈子");
    if (input.userId !== input.hostUserId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能使用本人发布资格为其他主播创建直播");
    // 授权撤销、圈主变更与业务写入共用同圈锁，检查后直到事务提交保持有效。
    await this.scopes.lockScope(tx, input.circleId);
    const circle = await tx.circle.findUnique({ where: { id: input.circleId }, select: { ownerId: true } });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    await this.capabilities.assertAuthorizationInTransaction(tx, input.circleId, "LIVE",
      { userId: input.userId, executor: input.executor }, circle.ownerId === input.userId ? null : input.userId);
    // 普通成员的 PLATFORM_DIRECT 在能力服务中核验，不再被 OWNER/ADMIN/PARTNER 静态角色挡住。
    return writeRoomAndAudit();
  }
}
