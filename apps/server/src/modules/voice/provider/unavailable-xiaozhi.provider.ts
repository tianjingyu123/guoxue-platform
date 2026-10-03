import {
  EndSessionResult,
  IssueSessionResult,
  ProviderProbeResult,
  VoiceProvider,
  VoiceProviderCapabilities,
  VoiceProviderError,
  VoiceUsageEventInput,
} from "./voice-provider.types";

/** 未取得商业文档与联调证据的能力一律 unknown */
export const ALL_UNKNOWN: VoiceProviderCapabilities = {
  sessionIssue: "unknown",
  sessionEnd: "unknown",
  usageCallback: "unknown",
  callbackSignature: "unknown",
  userIdentityToMcp: "unknown",
  agentConfigPush: "unknown",
  deviceBinding: "unknown",
  memoryControl: "unknown",
  answerCompleteness: "unknown",
  audioRecording: "unknown",
  deviceAudioRelay: "unknown",
};

export const VOICE_NOT_OPEN_MESSAGE = "小卜语音暂未开放，你可以先用文字和小卜聊。";

/**
 * 小智商业 API 未配置时的默认供应商。
 *
 * 行为：能力全部 unknown、不可开始会话、给出用户能看懂的「暂未开放」。
 * 它不发任何网络请求，也不产生任何费用。
 */
export class UnavailableXiaozhiProvider implements VoiceProvider {
  readonly id = "unavailable";
  readonly isMock = false;

  constructor(private readonly opsReason = "小智商业 API 未签约/未配置，实时语音会话不可用") {}

  async probe(): Promise<ProviderProbeResult> {
    return {
      providerId: this.id,
      isMock: false,
      available: false,
      userMessage: VOICE_NOT_OPEN_MESSAGE,
      opsNote: this.opsReason,
      capabilities: ALL_UNKNOWN,
    };
  }

  async issueSession(): Promise<IssueSessionResult> {
    throw new VoiceProviderError("UNAVAILABLE", VOICE_NOT_OPEN_MESSAGE, false);
  }

  async endSession(): Promise<EndSessionResult> {
    // 从未签发过会话，也就没有需要停止计费的供应商会话
    return { stopConfirmed: false, isMock: false };
  }

  parseUsageCallback(): VoiceUsageEventInput[] {
    throw new VoiceProviderError("BAD_CALLBACK", "未配置语音供应商，拒绝用量回调", false);
  }
}
