import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { MockEchoDeviceStream } from "./mock-device-stream";
import {
  DeviceStream,
  DeviceStreamRequest,
  EndSessionRequest,
  EndSessionResult,
  IssueSessionRequest,
  IssueSessionResult,
  ProviderProbeResult,
  VoiceProvider,
  VoiceProviderCapabilities,
  VoiceProviderError,
  VoiceProviderErrorCode,
  VoiceUsageEventInput,
} from "./voice-provider.types";

/**
 * 模拟小智供应商——**只用于契约、权限与页面测试**。
 *
 * 红线：
 * - 生产环境（NODE_ENV=production）由注册表拒绝启用，见 voice-provider.registry.ts；
 * - 所有响应带 isMock=true，会话在库里 providerIsMock=true、usageSource=mock，不进真实用量统计；
 * - 不下发任何凭据（clientCredential 恒为 null），端上拿不到可以连任何真实服务的东西；
 * - 回调格式是本模拟器自定义的，与小智商业回调**没有任何对应关系**，真实适配器不得照抄。
 *
 * 模拟行为可在测试中通过 behave() 调整：签发失败/超时、结束是否确认停费、回调签名。
 */
export interface MockBehavior {
  issueError?: VoiceProviderErrorCode | null;
  issueDelayMs?: number;
  endError?: VoiceProviderErrorCode | null;
  stopConfirmed?: boolean;
  capabilities?: Partial<VoiceProviderCapabilities>;
}

const MOCK_CAPABILITIES: VoiceProviderCapabilities = {
  sessionIssue: "supported",
  sessionEnd: "supported",
  usageCallback: "supported",
  callbackSignature: "supported",
  // 下列能力模拟器也不宣称支持：它们正是真实商业接口要回答的问题
  userIdentityToMcp: "unknown",
  agentConfigPush: "unknown",
  deviceBinding: "unknown",
  memoryControl: "unknown",
  answerCompleteness: "unknown",
  audioRecording: "unsupported",
  // 模拟器只「回放」设备上行音频，用来验证协议与音频链路；不做识别与合成
  deviceAudioRelay: "supported",
};

export const MOCK_SIGNATURE_HEADER = "x-xiaobu-mock-signature";

export class MockXiaozhiProvider implements VoiceProvider {
  readonly id = "mock";
  readonly isMock = true;
  /** 进程内随机密钥：每次启动不同，代码里不存在任何固定测试令牌 */
  private readonly secret = randomBytes(32);
  private behavior: MockBehavior = {};
  /** 模拟器自己记住签发过的会话，结束时校验 */
  private readonly issued = new Map<string, { correlationId: string; idempotencyKey: string }>();
  private readonly byIdem = new Map<string, string>();
  /** 调用计数：测试据此断言「重复请求没有重复调用供应商」 */
  readonly calls = { issue: 0, end: 0, stream: 0 };
  /** 测试可读：最近打开的设备中继 */
  lastStream: MockEchoDeviceStream | null = null;

  behave(b: MockBehavior) {
    this.behavior = { ...b };
  }

  async probe(): Promise<ProviderProbeResult> {
    return {
      providerId: this.id,
      isMock: true,
      available: true,
      userMessage: "测试环境：当前为模拟语音会话，不会产生真实通话与费用。",
      opsNote: "MockXiaozhiProvider：仅用于契约/权限/页面测试，非真实供应商",
      capabilities: { ...MOCK_CAPABILITIES, ...(this.behavior.capabilities || {}) },
    };
  }

  async issueSession(req: IssueSessionRequest): Promise<IssueSessionResult> {
    this.calls.issue++;
    if (this.behavior.issueDelayMs) {
      await new Promise((r) => setTimeout(r, this.behavior.issueDelayMs));
    }
    if (this.behavior.issueError) {
      throw new VoiceProviderError(this.behavior.issueError, `模拟签发失败：${this.behavior.issueError}`, this.behavior.issueError === "TIMEOUT");
    }
    // 幂等：同一幂等键重复签发返回同一个模拟会话
    const existing = this.byIdem.get(req.idempotencyKey);
    const providerSessionId = existing ?? `mock-${randomUUID()}`;
    if (!existing) {
      this.byIdem.set(req.idempotencyKey, providerSessionId);
      this.issued.set(providerSessionId, { correlationId: req.correlationId, idempotencyKey: req.idempotencyKey });
    }
    return {
      providerSessionId,
      clientCredential: null,
      expiresAt: new Date(Date.now() + Math.min(req.maxSeconds, 3600) * 1000),
      isMock: true,
    };
  }

  async endSession(req: EndSessionRequest): Promise<EndSessionResult> {
    this.calls.end++;
    if (this.behavior.endError) {
      throw new VoiceProviderError(this.behavior.endError, `模拟结束失败：${this.behavior.endError}`, this.behavior.endError === "TIMEOUT");
    }
    if (!this.issued.has(req.providerSessionId)) {
      throw new VoiceProviderError("REJECTED", "模拟供应商不认识该会话", false);
    }
    return { stopConfirmed: this.behavior.stopConfirmed ?? true, isMock: true };
  }

  /** 设备音频中继（模拟）：原样回放用户刚说的话，所有文本标注「模拟」 */
  async openDeviceStream(req: DeviceStreamRequest): Promise<DeviceStream> {
    this.calls.stream++;
    if (!this.issued.has(req.providerSessionId)) {
      throw new VoiceProviderError("REJECTED", "模拟供应商不认识该会话", false);
    }
    this.lastStream = new MockEchoDeviceStream(req);
    return this.lastStream;
  }

  /** 测试用：按模拟器自己的格式生成一条带签名的用量回调 */
  buildCallback(payload: {
    eventId: string;
    providerSessionId: string;
    correlationId?: string;
    usedSeconds?: number | null;
    isFinal?: boolean;
  }): { headers: Record<string, string>; rawBody: Buffer } {
    const rawBody = Buffer.from(JSON.stringify({ mock: true, ...payload }), "utf8");
    const sig = createHmac("sha256", this.secret).update(rawBody).digest("hex");
    return { headers: { [MOCK_SIGNATURE_HEADER]: sig, "content-type": "application/json" }, rawBody };
  }

  parseUsageCallback(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): VoiceUsageEventInput[] {
    const got = headers[MOCK_SIGNATURE_HEADER];
    const sig = Array.isArray(got) ? got[0] : got;
    const expected = createHmac("sha256", this.secret).update(rawBody).digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(String(sig || ""), "hex");
    } catch {
      provided = Buffer.alloc(0);
    }
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new VoiceProviderError("BAD_CALLBACK", "模拟回调签名不匹配", false);
    }
    let body: any;
    try {
      body = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new VoiceProviderError("BAD_CALLBACK", "模拟回调不是合法 JSON", false);
    }
    if (body?.mock !== true || typeof body.eventId !== "string" || typeof body.providerSessionId !== "string") {
      throw new VoiceProviderError("BAD_CALLBACK", "模拟回调缺少必需字段", false);
    }
    const used = body.usedSeconds;
    return [
      {
        eventId: body.eventId,
        providerSessionId: body.providerSessionId,
        correlationId: typeof body.correlationId === "string" ? body.correlationId : null,
        usedSeconds: typeof used === "number" && Number.isFinite(used) && used >= 0 ? Math.floor(used) : null,
        isFinal: body.isFinal !== false,
        answerCompleteness: "unknown",
        isMock: true,
      },
    ];
  }
}
