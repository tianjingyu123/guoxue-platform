/**
 * 小卜实时语音供应商适配边界（2026-09-21 非商业 API 收口）
 *
 * 这里只定义「热卜需要供应商提供什么」，**不描述小智商业 API 实际长什么样**——
 * 商业接口文档签约后才开放，字段、鉴权、回调格式一律未知，不得猜测。
 * 真实适配器到位后只需实现 VoiceProvider，会话编排、额度、页面都不改。
 *
 * 能力探测结果只有三种：supported / unsupported / unknown。
 * 没有真实文档与联调证据的能力一律 unknown，页面不得据此显示「已开通」。
 */

/** 热卜侧场景（与 VoiceSession.scene 一致） */
export type VoiceScene =
  | "plaza" // 广场语音智能体
  | "circle_assistant" // 圈主语音助理
  | "classic_companion" // 古籍语音伴读
  | "report_dialogue" // 围绕排盘报告对话
  | "content_guide" // 内容导览
  | "device"; // 圈主 IP 硬件

export const VOICE_SCENES: readonly VoiceScene[] = [
  "plaza",
  "circle_assistant",
  "classic_companion",
  "report_dialogue",
  "content_guide",
  "device",
];

export type CapabilityState = "supported" | "unsupported" | "unknown";

/** 需要供应商回答「能不能」的能力清单；每一项都对应一个上线前必须核实的问题 */
export interface VoiceProviderCapabilities {
  /** 服务端签发会话（给端上临时凭据），而不是把长期密钥下发到端上 */
  sessionIssue: CapabilityState;
  /** 服务端主动结束会话并停止计费（仅关闭页面不等于停费） */
  sessionEnd: CapabilityState;
  /** 用量回调（真实时长），否则只能估算 */
  usageCallback: CapabilityState;
  /** 回调签名可校验 */
  callbackSignature: CapabilityState;
  /** 把热卜用户身份（化名引用）安全传给 MCP，决定圈子私有知识能否开放 */
  userIdentityToMcp: CapabilityState;
  /** 按智能体下发角色/提示词/音色 */
  agentConfigPush: CapabilityState;
  /** 设备绑定与商业固件设备映射 */
  deviceBinding: CapabilityState;
  /** 长期记忆的加载/删除/重置 */
  memoryControl: CapabilityState;
  /** 回答完整性（是否被打断/截断）信号 */
  answerCompleteness: CapabilityState;
  /** 是否会录制、保存或允许复播实时对话音频。未取得接口与授权前热卜一律不录不存 */
  audioRecording: CapabilityState;
}

export interface ProviderProbeResult {
  providerId: string;
  /** true=模拟供应商，任何结果都不能当成真实接通 */
  isMock: boolean;
  /** 是否可以开始会话 */
  available: boolean;
  /** 面向用户的说明（不含技术细节与供应商名） */
  userMessage: string;
  /** 面向运营的说明 */
  opsNote: string;
  capabilities: VoiceProviderCapabilities;
}

/**
 * 下发给供应商的最小上下文。只放当前场景必需的内容，
 * 出生信息、手机号、真实姓名、私人笔记、完整聊天记录一律不进入。
 */
export interface MinimalVoiceContext {
  scene: VoiceScene;
  /** 面向模型的简短开场说明，如「正在讨论《论语·学而》第 3 段」 */
  topic: string;
  /** 场景资料（已裁剪、已脱敏），总长受 MAX_CONTEXT_CHARS 限制 */
  facts: Record<string, string | string[] | number | boolean | null>;
  /** 上下文快照版本（报告版本/段落内容哈希），切段切盘时版本变化 */
  version: string;
  /** 本上下文被移除的字段名，审计用 */
  redactions: string[];
}

export const MAX_CONTEXT_CHARS = 4000;

export interface IssueSessionRequest {
  /** 热卜会话关联 ID（VoiceSession.requestId），供应商侧应原样回传 */
  correlationId: string;
  /** 同一会话签发的幂等键：重试必须复用 */
  idempotencyKey: string;
  /** 热卜侧智能体引用；真实供应商的智能体 ID 映射由适配器负责 */
  agentRef: string | null;
  /** 用户化名引用（HMAC），不传热卜用户 ID 原值 */
  userRef: string;
  scene: VoiceScene;
  context: MinimalVoiceContext;
  maxSeconds: number;
  tier: "lite" | "standard";
  /** 硬件会话时的设备引用 */
  deviceRef?: string | null;
  /** 调用超时（毫秒） */
  timeoutMs: number;
}

export interface IssueSessionResult {
  providerSessionId: string;
  /**
   * 端上连接所需的临时凭据（不透明字符串，可能为空）。
   * 热卜不解析、不落库、不写日志，只原样交给发起会话的那一个用户。
   */
  clientCredential: string | null;
  /** 凭据过期时间 */
  expiresAt: Date | null;
  isMock: boolean;
}

export interface EndSessionRequest {
  providerSessionId: string;
  correlationId: string;
  idempotencyKey: string;
  reason: string;
  timeoutMs: number;
}

export interface EndSessionResult {
  /** 供应商是否确认已停止计费；未确认时编排层会把用量状态记为 unknown */
  stopConfirmed: boolean;
  isMock: boolean;
}

/** 规范化后的用量事件（由各供应商适配器从回调原文解析） */
export interface VoiceUsageEventInput {
  eventId: string;
  providerSessionId: string;
  correlationId: string | null;
  /** 供应商给出的计费时长（秒）；供应商未给出时为 null，绝不补 0 */
  usedSeconds: number | null;
  isFinal: boolean;
  /** 回答完整性，供应商未提供时为 unknown */
  answerCompleteness: "complete" | "partial" | "unknown";
  isMock: boolean;
}

export type VoiceProviderErrorCode =
  | "UNAVAILABLE" // 未配置/未开放
  | "TIMEOUT" // 超时：供应商侧是否已建立会话未知
  | "REJECTED" // 供应商明确拒绝（额度、参数、权限）
  | "CANCELLED" // 热卜侧取消
  | "RATE_LIMITED"
  | "BAD_CALLBACK" // 回调无法校验或解析
  | "UNKNOWN";

export class VoiceProviderError extends Error {
  constructor(
    public readonly code: VoiceProviderErrorCode,
    message: string,
    /** 是否值得用同一幂等键重试 */
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "VoiceProviderError";
  }
}

export interface VoiceProvider {
  readonly id: string;
  readonly isMock: boolean;
  probe(): Promise<ProviderProbeResult>;
  issueSession(req: IssueSessionRequest): Promise<IssueSessionResult>;
  endSession(req: EndSessionRequest): Promise<EndSessionResult>;
  /**
   * 解析并校验用量回调。签名/格式不合法时抛 BAD_CALLBACK。
   * rawBody 用原始字节，便于真实供应商做签名校验。
   */
  parseUsageCallback(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): VoiceUsageEventInput[];
}

export const VOICE_PROVIDER = Symbol("VOICE_PROVIDER");
