import { HttpStatus, Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { createHash, createHmac, randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VoiceQuotaService } from "./voice-quota.service";
import { VoiceContextBuilder, VoiceContextRequest, digestContext } from "./voice-context.builder";
import { VoiceDeviceService } from "./voice-device.service";
import { VoiceDeviceHandoffService } from "./voice-device-handoff.service";
import {
  ProviderProbeResult,
  VOICE_PROVIDER,
  VoiceProvider,
  VoiceProviderError,
  VoiceScene,
  VOICE_SCENES,
} from "./provider/voice-provider.types";

/**
 * 小卜实时语音会话编排（S01/S06/S07/S10，2026-09-21 非商业 API 收口）
 *
 * 页面与业务只依赖本服务；供应商差异全部收在 VoiceProvider 里。商业 API 到位后替换适配器即可。
 *
 * 状态机：reserved（已预留额度、未签发）→ active（供应商已签发）→ ending（已请求结束、等用量回调）→ ended
 *         任一步可到 failed / cancelled。
 *
 * 用量口径（S10）：
 * - usageState：none（确定没产生供应商会话）/ pending（等回调）/ vendor（供应商真实用量）/
 *   estimated（客户端估算，待对账）/ unknown（不知道）/ mock（模拟供应商）
 * - 供应商没给真实时长 → unknown 或 estimated，usedSeconds 不填 0 冒充准确
 * - 技术成功、回答完整、用户满意是三个独立维度，分开记录，不互相推断
 */

export const ISSUE_TIMEOUT_MS = 8_000;
export const END_TIMEOUT_MS = 5_000;
/** 请求结束后等待用量回调的最长时间，超时按 unknown/estimated 收尾 */
export const CALLBACK_WAIT_MS = 10 * 60_000;
/** 签发卡住（reserved 超过此时长）视为失败 */
export const RESERVED_STALE_MS = 2 * 60_000;
/** 服务端空闲兜底比客户端多等的秒数：正常由客户端到点挂断，页面关掉或断网时由清理任务收尾 */
export const IDLE_SWEEP_GRACE_MS = 15_000;
/** 客户端上报「有新输入」的最小间隔，防止每句话都打一次库 */
export const INPUT_TOUCH_MIN_INTERVAL_MS = 5_000;

export interface StartVoiceSessionInput extends VoiceContextRequest {
  /** 客户端请求号：重复点击「开始」只建一个会话 */
  clientRequestId: string;
}

export interface EndVoiceSessionInput {
  reason?: "user_hangup" | "page_exit" | "switch_context" | "idle_timeout";
  /** 客户端自报时长，只作估算参考 */
  clientEstimatedSeconds?: number;
}

type SessionRow = Awaited<ReturnType<PrismaService["voiceSession"]["findUniqueOrThrow"]>>;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new VoiceProviderError("TIMEOUT", "语音服务响应超时", true)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

@Injectable()
export class VoiceSessionService {
  private readonly logger = new Logger(VoiceSessionService.name);
  /** 用户化名密钥：未配置时进程内随机（仅适用于模拟与测试；真实供应商上线前必须配置稳定密钥） */
  private readonly userRefSecret: Buffer;
  readonly userRefStable: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: VoiceQuotaService,
    private readonly contexts: VoiceContextBuilder,
    @Inject(VOICE_PROVIDER) private readonly provider: VoiceProvider,
    private readonly devices: VoiceDeviceService,
    /** 场景接续（App 里选好场景，硬件接着聊）；可选只为兼容以五参数构造本服务的测试 */
    @Optional() private readonly handoff?: VoiceDeviceHandoffService,
  ) {
    const configured = process.env.XIAOBU_USER_REF_SECRET;
    this.userRefStable = !!configured && configured.length >= 32;
    this.userRefSecret = this.userRefStable ? Buffer.from(configured!, "utf8") : randomBytes(32);
  }

  get providerId() {
    return this.provider.id;
  }

  /** 给供应商的用户化名引用：同一用户稳定、不可反推热卜用户 ID */
  userRef(userId: string): string {
    return `u_${createHmac("sha256", this.userRefSecret).update(userId).digest("hex").slice(0, 24)}`;
  }

  /** 页面入口判断：能否开始、给用户看的说明、各场景状态 */
  async capabilities(): Promise<ProviderProbeResult & { scenes: Record<VoiceScene, { open: boolean }> }> {
    const probe = await this.provider.probe();
    const open = probe.available;
    const scenes = Object.fromEntries(VOICE_SCENES.map((s) => [s, { open: s === "device" ? false : open }])) as Record<VoiceScene, { open: boolean }>;
    return { ...probe, scenes };
  }

  private startKey(userId: string, clientRequestId: string) {
    return createHash("sha256").update(`${userId}:${clientRequestId}`).digest("hex");
  }

  private async recordAttempt(input: {
    sessionId: string | null;
    operation: "issue" | "end";
    idempotencyKey: string;
    outcome: string;
    errorCode?: string | null;
    retryable?: boolean;
    latencyMs?: number;
  }) {
    try {
      const n = await this.prisma.voiceProviderAttempt.count({ where: { idempotencyKey: { startsWith: `${input.idempotencyKey}#` } } });
      await this.prisma.voiceProviderAttempt.create({
        data: {
          sessionId: input.sessionId,
          provider: this.provider.id,
          isMock: this.provider.isMock,
          operation: input.operation,
          attemptNo: n + 1,
          idempotencyKey: `${input.idempotencyKey}#${n + 1}`,
          outcome: input.outcome,
          errorCode: input.errorCode ?? null,
          retryable: !!input.retryable,
          latencyMs: input.latencyMs,
        },
      });
    } catch (error: any) {
      // 并发下序号撞唯一键：尝试记录是审计用，不影响主流程
      this.logger.warn(`记录供应商调用尝试失败：${error?.code || error?.message || error}`);
    }
  }

  /** 对外返回的会话视图：不含凭据以外的供应商细节，不含成本 */
  toView(s: SessionRow, extra?: { clientCredential?: string | null; credentialExpiresAt?: Date | null }) {
    return {
      id: s.id,
      requestId: s.requestId,
      scene: s.scene,
      contextType: s.contextType,
      contextId: s.contextId,
      agentId: s.agentId,
      status: s.status,
      usageState: s.usageState,
      technicalOutcome: s.technicalOutcome,
      userSatisfaction: s.userSatisfaction,
      maxSeconds: s.maxSeconds,
      usedSeconds: s.usedSeconds,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      endReason: s.endReason,
      lastInputAt: s.lastInputAt,
      isMock: s.providerIsMock,
      ...(extra ? { clientCredential: extra.clientCredential ?? null, credentialExpiresAt: extra.credentialExpiresAt ?? null } : {}),
    };
  }

  /**
   * 开始会话：先鉴权与组装上下文 → 供应商不可用则直接告知「暂未开放」（不建会话、不预留额度）
   * → 幂等建会话并预留额度 → 签发 → 失败则释放预留。
   */
  async start(userId: string, input: StartVoiceSessionInput) {
    if (!input.clientRequestId || input.clientRequestId.length > 64) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少客户端请求号");
    }
    const resolved = await this.contexts.resolve(userId, input);
    return this.startResolved(userId, input.scene, input.clientRequestId, resolved);
  }

  /**
   * 硬件会话（S09）：设备必须绑定在本人名下、未停用、且已由**真实供应商**激活。
   * 商业固件与 API 未接通前 activationState 恒为 pending_vendor，这里返回「待开通」。
   */
  async startForDevice(
    userId: string,
    deviceId: string,
    clientRequestId: string,
    /** 仅小智协议终端接入层传 true：模拟供应商下用于协议与链路契约测试（生产环境注册表禁用模拟供应商） */
    opts: { allowPendingVendorForMockRelay?: boolean } = {},
  ) {
    if (!clientRequestId || clientRequestId.length > 64) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少客户端请求号");
    }
    const d = await this.devices.assertUsable(userId, deviceId);
    // activationState 只能由真实供应商置为 activated。App 发起的硬件会话一律按此判断（未激活显示「待开通」）；
    // 只有协议终端接入层在模拟供应商下显式放行，会话照常标记 providerIsMock=true，不代表真实语音接通
    const mockRelay = opts.allowPendingVendorForMockRelay === true && this.provider.isMock;
    if (d.activationState !== "activated" && !mockRelay) {
      return { available: false as const, userMessage: "设备待开通：商业固件与语音服务接通后即可使用。", isMock: this.provider.isMock };
    }
    // 场景接续：App 里选好的场景（报告/古籍/圈子…）在开会话时按用户身份重新校验，失效则清掉、回到普通硬件对话
    const h = await this.handoff?.current(userId, d);
    if (h) {
      try {
        const resolved = await this.contexts.resolve(userId, h.request);
        // 计费主体按场景（报告=本人、圈子=圈子账户不足转本人），会话仍挂在设备与绑定代次上
        return this.startResolved(userId, h.request.scene, clientRequestId, { ...resolved, device: { id: d.id, bindingVersion: d.bindingVersion } });
      } catch (e: any) {
        await this.handoff!.drop(d.id, e?.message || "resolve_failed");
      }
    }
    const context = {
      scene: "device" as const,
      topic: "你是用户绑定的热卜小卜硬件助理，用自然短句交谈；需要给资料时说明会放到热卜 App 的本次记录里",
      facts: { productSku: d.productSku, circleBound: !!d.circleId },
      version: `device-v${d.bindingVersion}`,
      redactions: ["serial", "previousOwnerHistory"],
    };
    return this.startResolved(userId, "device", clientRequestId, {
      contextType: "device",
      contextId: d.id,
      agentId: d.agentProfileId,
      tier: "lite",
      billingOwner: d.circleId ? { ownerType: "circle", ownerId: d.circleId } : { ownerType: "user", ownerId: userId },
      fallbackBillingOwner: d.circleId ? { ownerType: "user", ownerId: userId } : null,
      context,
      digest: digestContext(context),
      displayTopic: "小卜硬件",
      device: { id: d.id, bindingVersion: d.bindingVersion },
    });
  }

  private async startResolved(
    userId: string,
    scene: VoiceScene,
    clientRequestId: string,
    resolved: Awaited<ReturnType<VoiceContextBuilder["resolve"]>> & { device?: { id: string; bindingVersion: number } },
  ) {
    const input = { scene, clientRequestId };
    const probe = await this.provider.probe();
    if (!probe.available) {
      return { available: false as const, userMessage: probe.userMessage, isMock: probe.isMock };
    }

    const startIdempotencyKey = this.startKey(userId, input.clientRequestId);
    const existing = await this.prisma.voiceSession.findUnique({ where: { startIdempotencyKey } });
    if (existing) {
      if (existing.userId !== userId) throw new BusinessException(ErrorCode.CONFLICT, "请求号冲突，请重试");
      return { available: true as const, duplicated: true, session: this.toView(existing) };
    }

    let session: SessionRow;
    try {
      session = await this.quota.startSession({
        userId,
        scene: input.scene,
        contextType: resolved.contextType ?? undefined,
        contextId: resolved.contextId ?? undefined,
        tier: resolved.tier,
        account: resolved.billingOwner ?? undefined,
        fallbackAccount: resolved.fallbackBillingOwner ?? undefined,
        extra: {
          provider: this.provider.id,
          providerIsMock: this.provider.isMock,
          agentId: resolved.agentId,
          startIdempotencyKey,
          contextVersion: resolved.context.version,
          contextDigest: resolved.digest,
          usageState: "none",
          deviceId: resolved.device?.id ?? null,
          deviceBindingVersion: resolved.device?.bindingVersion ?? null,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        const dup = await this.prisma.voiceSession.findUnique({ where: { startIdempotencyKey } });
        if (dup && dup.userId === userId) return { available: true as const, duplicated: true, session: this.toView(dup) };
      }
      throw error;
    }

    const issueKey = `issue:${session.id}`;
    const t0 = Date.now();
    try {
      const issued = await withTimeout(
        this.provider.issueSession({
          correlationId: session.requestId,
          idempotencyKey: issueKey,
          agentRef: resolved.agentId,
          userRef: this.userRef(userId),
          scene: input.scene,
          context: resolved.context,
          maxSeconds: session.maxSeconds,
          tier: resolved.tier,
          deviceRef: resolved.device?.id ?? null,
          timeoutMs: ISSUE_TIMEOUT_MS,
        }),
        ISSUE_TIMEOUT_MS,
      );
      await this.recordAttempt({ sessionId: session.id, operation: "issue", idempotencyKey: issueKey, outcome: "success", latencyMs: Date.now() - t0 });
      const updated = await this.prisma.voiceSession.updateMany({
        where: { id: session.id, status: "reserved" },
        data: {
          status: "active",
          providerSessionId: issued.providerSessionId,
          issuedAt: new Date(),
          lastEventAt: new Date(),
          lastInputAt: new Date(), // 空闲计时从接通开始算
          usageState: issued.isMock ? "mock" : "pending",
        },
      });
      const fresh = await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: session.id } });
      if (updated.count !== 1) {
        // 签发期间会话已被取消/清理：立即请求供应商结束，避免孤儿会话继续计费
        await this.endAtProvider(fresh, issued.providerSessionId, "cancelled_during_issue");
        return { available: true as const, duplicated: false, session: this.toView(fresh) };
      }
      this.logger.log(`语音会话已签发 requestId=${fresh.requestId} provider=${this.provider.id}${issued.isMock ? "（模拟）" : ""}`);
      // 凭据只返回给本次发起者，不落库、不写日志
      const { idleTimeoutSeconds } = await this.quota.getConfig();
      return {
        available: true as const,
        duplicated: false,
        session: this.toView(fresh, { clientCredential: issued.clientCredential, credentialExpiresAt: issued.expiresAt }),
        // 1 分钟无新输入自动结束：客户端据此到点挂断，服务端清理任务兜底
        policy: { idleTimeoutSeconds },
        // 只给用户看简短话题；给模型的指令（context.topic/facts）不下发到端上
        context: { topic: resolved.displayTopic, version: resolved.context.version },
      };
    } catch (error: any) {
      const code = error instanceof VoiceProviderError ? error.code : "UNKNOWN";
      await this.recordAttempt({
        sessionId: session.id,
        operation: "issue",
        idempotencyKey: issueKey,
        outcome: code === "TIMEOUT" ? "timeout" : code === "UNAVAILABLE" ? "unavailable" : code === "REJECTED" ? "rejected" : "failed",
        errorCode: code,
        retryable: error instanceof VoiceProviderError ? error.retryable : false,
        latencyMs: Date.now() - t0,
      });
      // 超时：供应商侧是否已建会话未知 → 用量记 unknown 待对账；其他失败确定未建会话 → none
      await this.quota.finalizeSession({
        sessionId: session.id,
        usedSeconds: null,
        usageSource: null,
        usageState: code === "TIMEOUT" || code === "UNKNOWN" ? "unknown" : "none",
        endReason: code === "UNAVAILABLE" ? "provider_unavailable" : `issue_${code.toLowerCase()}`,
        technicalOutcome: code === "TIMEOUT" ? "timeout" : "failed",
        status: "failed",
        fromStatuses: ["reserved"],
      });
      this.logger.warn(`语音会话签发失败 requestId=${session.requestId} code=${code}`);
      const failed = await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: session.id } });
      return {
        available: true as const,
        duplicated: false,
        session: this.toView(failed),
        error: {
          code,
          message: code === "TIMEOUT" ? "语音服务响应超时，请稍后重试" : code === "REJECTED" ? "语音服务暂时拒绝了这次通话，请稍后重试" : "语音服务暂不可用，请稍后重试",
          retryable: code === "TIMEOUT" || code === "RATE_LIMITED",
        },
      };
    }
  }

  private async ownSession(userId: string, sessionId: string) {
    const s = await this.prisma.voiceSession.findUnique({ where: { id: sessionId } });
    // 不区分「不存在」与「不是你的」，避免枚举他人会话
    if (!s || s.userId !== userId) throw new BusinessException(ErrorCode.NOT_FOUND, "会话不存在");
    return s;
  }

  /** 请求供应商结束；返回是否确认停费 */
  private async endAtProvider(s: SessionRow, providerSessionId: string | null, reason: string) {
    if (!providerSessionId) return { stopConfirmed: false, attempted: false };
    const endKey = `end:${s.id}`;
    const t0 = Date.now();
    try {
      const r = await withTimeout(
        this.provider.endSession({ providerSessionId, correlationId: s.requestId, idempotencyKey: endKey, reason, timeoutMs: END_TIMEOUT_MS }),
        END_TIMEOUT_MS,
      );
      await this.recordAttempt({ sessionId: s.id, operation: "end", idempotencyKey: endKey, outcome: "success", latencyMs: Date.now() - t0 });
      return { stopConfirmed: r.stopConfirmed, attempted: true };
    } catch (error: any) {
      const code = error instanceof VoiceProviderError ? error.code : "UNKNOWN";
      await this.recordAttempt({
        sessionId: s.id,
        operation: "end",
        idempotencyKey: endKey,
        outcome: code === "TIMEOUT" ? "timeout" : "failed",
        errorCode: code,
        retryable: error instanceof VoiceProviderError ? error.retryable : false,
        latencyMs: Date.now() - t0,
      });
      this.logger.warn(`请求供应商结束会话失败 requestId=${s.requestId} code=${code}（停费未确认，记为用量未知）`);
      return { stopConfirmed: false, attempted: true };
    }
  }

  /**
   * 用户有新的输入（说话、发文字）：刷新空闲计时。
   * 只接受本人、进行中的会话；已结束的会话不会因为迟到的上报「复活」。
   * 真实供应商接通后，适配器把供应商的输入/语音活动事件也映射到这里。
   */
  async recordInput(userId: string, sessionId: string) {
    const s = await this.ownSession(userId, sessionId);
    const { idleTimeoutSeconds } = await this.quota.getConfig();
    if (s.status !== "active") return { status: s.status, lastInputAt: s.lastInputAt, idleTimeoutSeconds };
    const now = new Date();
    await this.prisma.voiceSession.updateMany({
      where: {
        id: s.id,
        status: "active",
        OR: [{ lastInputAt: null }, { lastInputAt: { lt: new Date(now.getTime() - INPUT_TOUCH_MIN_INTERVAL_MS) } }],
      },
      data: { lastInputAt: now },
    });
    const fresh = await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } });
    return { status: fresh.status, lastInputAt: fresh.lastInputAt, idleTimeoutSeconds };
  }

  /**
   * 结束会话（幂等）。
   * - 未签发的（reserved）直接取消并释放预留
   * - 已签发的先条件更新为 ending（并发两次结束只有一次向供应商发请求），再请求供应商停止
   * - 供应商支持用量回调且确认停费 → 保持 ending 等回调；否则按估算/未知收尾
   */
  async end(userId: string, sessionId: string, input: EndVoiceSessionInput = {}) {
    const s = await this.ownSession(userId, sessionId);
    const reason = input.reason ?? "user_hangup";
    const estimate =
      typeof input.clientEstimatedSeconds === "number" && Number.isFinite(input.clientEstimatedSeconds)
        ? Math.max(0, Math.min(Math.floor(input.clientEstimatedSeconds), s.maxSeconds))
        : null;

    if (s.status === "reserved") {
      await this.quota.finalizeSession({
        sessionId: s.id, usedSeconds: null, usageSource: null, usageState: "none",
        endReason: reason, technicalOutcome: "cancelled", status: "cancelled", fromStatuses: ["reserved"],
      });
      return { session: this.toView(await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } })), duplicated: false };
    }
    if (s.status !== "active") {
      return { session: this.toView(s), duplicated: true };
    }

    const claimed = await this.prisma.voiceSession.updateMany({
      where: { id: s.id, status: "active" },
      data: { status: "ending", endReason: reason, clientEstimatedSeconds: estimate, lastEventAt: new Date() },
    });
    if (claimed.count !== 1) {
      return { session: this.toView(await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } })), duplicated: true };
    }

    const probe = await this.provider.probe();
    const { stopConfirmed } = await this.endAtProvider(s, s.providerSessionId, reason);
    const waitCallback = stopConfirmed && probe.capabilities.usageCallback === "supported";
    if (!waitCallback) {
      await this.finalizeWithoutVendorUsage(s.id, estimate, reason, stopConfirmed ? "success" : "interrupted");
    }
    return { session: this.toView(await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } })), duplicated: false };
  }

  /** 没有供应商真实用量时的收尾：有客户端估算记 estimated，没有记 unknown（不填 0） */
  private async finalizeWithoutVendorUsage(sessionId: string, estimate: number | null, reason: string, outcome: string) {
    const s = await this.prisma.voiceSession.findUniqueOrThrow({ where: { id: sessionId } });
    const mock = s.providerIsMock;
    await this.quota.finalizeSession({
      sessionId,
      usedSeconds: estimate,
      usageSource: estimate == null ? null : mock ? "mock" : "estimate",
      usageState: estimate == null ? "unknown" : mock ? "mock" : "estimated",
      endReason: reason,
      technicalOutcome: outcome,
      answerCompleteness: "unknown",
      status: "ended",
      fromStatuses: ["active", "ending"],
    });
  }

  async cancel(userId: string, sessionId: string) {
    return this.end(userId, sessionId, { reason: "page_exit" });
  }

  /** 用户满意度：只记录用户主动反馈，不从时长或行为推断 */
  async feedback(userId: string, sessionId: string, satisfaction: "satisfied" | "neutral" | "unsatisfied") {
    const s = await this.ownSession(userId, sessionId);
    // 用户挂断后（ending：等供应商回传时长）即可评价；评价与用量收尾互不影响
    if (!["ending", "ended", "failed", "cancelled"].includes(s.status)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "通话结束后才能评价");
    }
    const updated = await this.prisma.voiceSession.update({ where: { id: s.id }, data: { userSatisfaction: satisfaction } });
    return this.toView(updated);
  }

  /** 我的语音记录：只返回本人的会话 */
  async listMine(userId: string, query: { scene?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Math.floor(query.page || 1));
    const pageSize = Math.max(1, Math.min(50, Math.floor(query.pageSize || 20)));
    const where = { userId, ...(query.scene ? { scene: query.scene } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.voiceSession.count({ where }),
      this.prisma.voiceSession.findMany({ where, orderBy: { startedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { total, page, pageSize, items: rows.map((r) => this.toView(r)) };
  }

  async getMine(userId: string, sessionId: string) {
    return this.toView(await this.ownSession(userId, sessionId));
  }

  /**
   * 用量回调（S10）：签名/格式由供应商适配器校验；按 (provider, eventId) 幂等。
   * 回调来自哪个供应商由路由参数决定，必须与当前启用的供应商一致。
   */
  async handleUsageCallback(providerId: string, headers: Record<string, string | string[] | undefined>, rawBody: Buffer) {
    if (providerId !== this.provider.id) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "未启用该语音供应商");
    }
    let events;
    try {
      events = this.provider.parseUsageCallback(headers, rawBody);
    } catch (error: any) {
      this.logger.warn(`拒绝用量回调 provider=${providerId}：${error?.code || "BAD_CALLBACK"}`);
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "回调校验失败", HttpStatus.UNAUTHORIZED);
    }
    const digest = createHash("sha256").update(rawBody).digest("hex");
    const results: Array<{ eventId: string; result: "applied" | "duplicate" | "unmatched" | "recorded" }> = [];

    for (const ev of events) {
      const session = await this.prisma.voiceSession.findFirst({
        where: ev.correlationId
          ? { OR: [{ requestId: ev.correlationId }, { provider: providerId, providerSessionId: ev.providerSessionId }] }
          : { provider: providerId, providerSessionId: ev.providerSessionId },
      });
      try {
        await this.prisma.voiceUsageEvent.create({
          data: {
            provider: providerId,
            eventId: ev.eventId,
            sessionId: session?.id ?? null,
            providerSessionId: ev.providerSessionId,
            usedSeconds: ev.usedSeconds,
            isFinal: ev.isFinal,
            isMock: ev.isMock,
            payloadDigest: digest,
            note: session ? null : "未匹配到会话",
          },
        });
      } catch (error: any) {
        if (error?.code === "P2002") {
          results.push({ eventId: ev.eventId, result: "duplicate" });
          continue;
        }
        throw error;
      }
      if (!session) {
        results.push({ eventId: ev.eventId, result: "unmatched" });
        continue;
      }
      if (!ev.isFinal) {
        await this.prisma.voiceSession.update({ where: { id: session.id }, data: { lastEventAt: new Date() } });
        results.push({ eventId: ev.eventId, result: "recorded" });
        continue;
      }
      const r = await this.quota.finalizeSession({
        sessionId: session.id,
        usedSeconds: ev.usedSeconds,
        usageSource: ev.usedSeconds == null ? null : ev.isMock ? "mock" : "vendor",
        usageState: ev.usedSeconds == null ? "unknown" : ev.isMock ? "mock" : "vendor",
        endReason: session.endReason ?? "provider_ended",
        technicalOutcome: session.technicalOutcome ?? "success",
        answerCompleteness: ev.answerCompleteness,
        status: "ended",
        fromStatuses: ["active", "ending"],
      });
      await this.prisma.voiceUsageEvent.updateMany({
        where: { provider: providerId, eventId: ev.eventId },
        data: {
          applied: !r.duplicated,
          note: r.duplicated
            ? `会话已按 ${r.session.usageState} 收尾，本回调未重复扣减${ev.usedSeconds != null && r.session.usedSeconds !== ev.usedSeconds ? "；时长与已结算不一致，待对账" : ""}`
            : null,
        },
      });
      results.push({ eventId: ev.eventId, result: r.duplicated ? "duplicate" : "applied" });
    }
    return { received: events.length, results };
  }

  /**
   * 超时清理（定时任务调用）：
   * - reserved 卡住 → 失败并释放预留
   * - active 超过上限 + 宽限 → 请求供应商结束
   * - ending 等回调超时 → 按估算/未知收尾
   */
  async sweep(now = new Date()) {
    const cfg = await this.quota.getConfig();
    const grace = cfg.pricing.graceSeconds * 1000;
    let released = 0, ended = 0, finalized = 0;

    const stuck = await this.prisma.voiceSession.findMany({
      where: { status: "reserved", startedAt: { lt: new Date(now.getTime() - RESERVED_STALE_MS) } },
      take: 100,
    });
    for (const s of stuck) {
      const r = await this.quota.finalizeSession({
        sessionId: s.id, usedSeconds: null, usageSource: null, usageState: "unknown",
        endReason: "issue_stale", technicalOutcome: "timeout", status: "failed", fromStatuses: ["reserved"],
      });
      if (!r.duplicated) released++;
    }

    // 切换过供应商时（如测试环境的模拟会话遗留），旧供应商的会话不能拿去调用当前供应商：直接按用量未知收尾
    const orphans = await this.prisma.voiceSession.findMany({
      where: { status: { in: ["active", "ending"] }, provider: { not: this.provider.id } },
      take: 200,
    });
    for (const s of orphans) {
      await this.quota.finalizeSession({
        sessionId: s.id, usedSeconds: null, usageSource: null, usageState: "unknown",
        endReason: "provider_switched", technicalOutcome: "interrupted", answerCompleteness: "unknown",
        status: "ended", fromStatuses: ["active", "ending"],
      });
      finalized++;
    }

    // 进行中的会话两条结束线，先到先结束：
    // - 空闲：最近一次用户输入后 idleTimeoutSeconds 没有新输入（决策人 2026-09-21：1 分钟），服务端多给 15 秒让客户端先挂
    // - 上限：超过单次时长上限 + 宽限
    const idleMs = cfg.idleTimeoutSeconds * 1000 + IDLE_SWEEP_GRACE_MS;
    const actives = await this.prisma.voiceSession.findMany({ where: { status: "active", provider: this.provider.id }, take: 200 });
    for (const s of actives) {
      const began = (s.issuedAt ?? s.startedAt).getTime();
      const maxDeadline = began + s.maxSeconds * 1000 + grace;
      const idleDeadline = (s.lastInputAt ?? s.issuedAt ?? s.startedAt).getTime() + idleMs;
      if (Math.min(maxDeadline, idleDeadline) > now.getTime()) continue;
      const reason = idleDeadline <= maxDeadline ? "idle_timeout" : "max_duration";
      const claimed = await this.prisma.voiceSession.updateMany({
        where: { id: s.id, status: "active" },
        data: { status: "ending", endReason: reason, lastEventAt: now },
      });
      if (claimed.count !== 1) continue;
      const { stopConfirmed } = await this.endAtProvider(s, s.providerSessionId, reason);
      const probe = await this.provider.probe();
      if (!(stopConfirmed && probe.capabilities.usageCallback === "supported")) {
        await this.finalizeWithoutVendorUsage(s.id, null, reason, stopConfirmed ? "success" : "interrupted");
      }
      ended++;
    }

    const endings = await this.prisma.voiceSession.findMany({
      where: { status: "ending", provider: this.provider.id, lastEventAt: { lt: new Date(now.getTime() - CALLBACK_WAIT_MS) } },
      take: 200,
    });
    for (const s of endings) {
      await this.finalizeWithoutVendorUsage(s.id, s.clientEstimatedSeconds ?? null, s.endReason ?? "callback_timeout", "success");
      finalized++;
    }
    return { released, ended, finalized };
  }
}
