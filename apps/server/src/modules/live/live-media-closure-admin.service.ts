import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { LiveMediaEvidenceRepository } from "./live-media-evidence.repository";
import { LiveMediaCredentialRepository } from "./live-media-credential.repository";
import { LiveMediaStopRepository } from "./live-media-stop.repository";
import { LiveMediaStopWorker } from "./live-media-stop.worker";
import { CircleCapabilityQuotaRepository } from "../circle/circle-capability-quota.repository";
import { cssCompletionEvidence } from "./live-media-completion.policy";
import { mediaEvidenceStatus } from "./live-media-evidence.policy";
import { readCssStopAttestation } from "./live-media-stop-config";

const guidance: Record<string, [string, string]> = {
  COMPLETED: ["媒体资源已收尾", "并发名额已归还；累计使用次数保留，无需重复操作。"],
  READY_TO_COMPLETE: ["收尾证据已齐备", "等待后台任务完成记账；稍后刷新查看，不要重新推流。"],
  ROOM_NOT_ENDED: ["本场直播尚未结束", "如需结束直播，请返回列表执行结束；本页不会停止正在进行的直播。"],
  NO_QUOTA_RECORD: ["没有本场资源额度记录", "可能是历史房间或平台直播；请运维核对实际媒体状态，不能据此判为已收尾。"],
  EXACT_SCOPE_NOT_VERIFIED: ["等待运维核验供应商范围", "请运维确认腾讯云推流域名、路径和流名精确匹配已开通，并配置有效核验证明。"],
  OTHER_PROVIDER_NOT_CLOSED: ["仍有其他媒体通道待核验", "本场曾签发 RTC 凭据或缺少可信签发记录，需要核对相应通道；不要强制释放。"],
  BOUNDARY_DRIFT: ["签发范围与停流记录不一致", "请运维比对本场凭据版本及供应商范围；不要重新提交停流请求。"],
  STOP_NOT_ACKNOWLEDGED: ["停流请求尚未确认", "后台将按原请求核验；结果未知时不会自动重复发送。"],
  NO_FRESH_FORBID_EVIDENCE: ["等待有效的禁止重连证明", "后台会重新查询供应商状态；非活跃或一次查询成功都不等于可释放资源。"],
  RECONNECT_PROTECTION_UNPROVEN: ["凭据失效前的重连保护未确认", "请运维核对禁推有效期；禁止仅凭旧地址过期或页面结束释放名额。"],
  MEDIA_NOT_CLOSED: ["仍有媒体连接待确认断开", "等待签名有效的断流回调；若持续未更新，请运维核对回调投递。"],
  MEDIA_EVENT_OUTSIDE_STOP_WINDOW: ["收到的断流记录不属于本次停流窗口", "请运维核对本次请求和回调时间，不要使用历史断流记录替代。"],
};

@Injectable()
export class LiveMediaClosureAdminService {
  constructor(private readonly prisma: PrismaService, private readonly credentials: LiveMediaCredentialRepository,
    private readonly stops: LiveMediaStopRepository, private readonly media: LiveMediaEvidenceRepository,
    private readonly ledger: CircleCapabilityQuotaRepository, private readonly worker: LiveMediaStopWorker) {}

  async get(roomId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      // 主库验证真实平台角色，不以旧 JWT、圈子绑定角色或主播身份代替运维权限。
      const users = await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM "User" WHERE id=${userId}`;
      const roles = await tx.$queryRaw<Array<{ roleType: string; bindId: string | null }>>`SELECT "roleType", "bindId" FROM "UserRole" WHERE "userId"=${userId}`;
      if (users[0]?.status !== "ACTIVE" || !roles.some(r => r.bindId === null && ["SUPER_ADMIN", "OPERATION_ADMIN"].includes(r.roleType))) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "仅当前有效的平台管理员可查看媒体资源核验");
      }
      await this.media.lockRoom(tx, roomId);
      await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${roomId} FOR SHARE`;
      const room = await tx.liveRoom.findUnique({ where: { id: roomId }, select: { id: true, title: true, status: true, endTime: true } });
      if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
      const boundaries = await this.credentials.readInTransaction(tx, roomId);
      const css = await this.stops.readInTransaction(tx, roomId, "CSS"), trtc = await this.stops.readInTransaction(tx, roomId, "TRTC");
      const evidence = await this.media.readInTransaction(tx, roomId), quota = await this.ledger.byBusiness(tx, "LIVE_SESSION", roomId);
      if (css?.completion) {
        const receipt = await this.ledger.receipt(tx, css.operationId);
        if (!quota || quota.state !== "COMPLETED" || quota.id !== css.completion.quotaId || quota.revision !== css.completion.quotaRevision
          || !receipt || receipt.action !== "COMPLETE" || receipt.reservationId !== quota.id || receipt.appliedRevision !== quota.revision
          || receipt.source !== "BUSINESS_ADAPTER" || receipt.evidenceRef !== `live-stop:${css.operationId}`) {
          throw new Error("LIVE_COMPLETION_RECEIPT_INVALID");
        }
      }
      const now = Date.now(), attestation = readCssStopAttestation(process.env.LIVE_CSS_EXACT_SCOPE_ATTESTATION, now);
      const scopeVerified = !!attestation && css?.scope.provider === "CSS" && attestation.domain === css.scope.domain && attestation.appName === css.scope.appName;
      const evaluated = cssCompletionEvidence(boundaries, css, evidence, now);
      let reason = !["ENDED", "REPLAY"].includes(room.status) || !room.endTime ? "ROOM_NOT_ENDED" : !quota ? "NO_QUOTA_RECORD"
        : css?.completion && quota.state === "COMPLETED" ? "COMPLETED" : !scopeVerified ? "EXACT_SCOPE_NOT_VERIFIED"
        : evaluated.allowed ? "READY_TO_COMPLETE" : evaluated.reason;
      if (!guidance[reason]) reason = "BOUNDARY_DRIFT";
      return { room, checkedAt: new Date(now).toISOString(), scopeVerified, worker: this.worker.status(),
        outcome: { reason, title: guidance[reason][0], nextStep: guidance[reason][1] }, quotaState: quota?.state ?? null,
        mediaState: evidence ? mediaEvidenceStatus(evidence.snapshot.evidence) : "UNKNOWN",
        providers: [css, trtc].filter(row => row !== null).map(row => ({ provider: row.provider, state: row.state,
          requestedAt: row.createdAt.toISOString(), resultAt: row.resultAt?.toISOString() ?? null,
          queryState: row.verification?.state ?? null, checkedAt: row.verification?.receivedAtMs ? new Date(row.verification.receivedAtMs).toISOString() : null,
          completedAt: row.completion ? new Date(row.completion.completedAtMs).toISOString() : null })) };
    }, { timeout: 15000 });
  }
}
