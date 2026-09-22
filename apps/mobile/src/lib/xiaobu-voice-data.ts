/**
 * 小卜实时语音（S01/S06/S07/S09）前端数据层
 *
 * 后端：/voice/capabilities、/voice/sessions*、/voice/devices*
 * 商业 API 未到位时，后端返回 available=false 与「暂未开放」；页面据此显示未开放态，不做假通话。
 * 模拟供应商（仅测试环境）返回 isMock=true，页面必须标注「模拟会话，非真实语音」。
 */
import { apiDelete, apiGet, apiGetOptionalAuth, apiGetPaged, apiPost, apiPut } from '@/utils/request'

export type VoiceScene = 'plaza' | 'circle_assistant' | 'classic_companion' | 'report_dialogue' | 'content_guide'

export interface VoiceCapabilities {
  available: boolean
  isMock: boolean
  userMessage: string
  scenes: Record<string, { open: boolean }>
}

export interface VoiceSessionView {
  id: string
  requestId: string
  scene: string
  contextType: string | null
  contextId: string | null
  agentId: string | null
  status: 'reserved' | 'active' | 'ending' | 'ended' | 'cancelled' | 'failed'
  usageState: 'none' | 'pending' | 'vendor' | 'estimated' | 'unknown' | 'mock'
  technicalOutcome: string | null
  userSatisfaction: string | null
  maxSeconds: number
  usedSeconds: number | null
  startedAt: string
  endedAt: string | null
  endReason: string | null
  lastInputAt?: string | null
  isMock: boolean
  clientCredential?: string | null
  credentialExpiresAt?: string | null
}

export type StartResult =
  | { available: false; userMessage: string; isMock: boolean }
  | {
      available: true
      duplicated: boolean
      session: VoiceSessionView
      context?: { topic: string; version: string }
      /** 连续多少秒没有新输入自动结束（决策人 2026-09-21：1 分钟） */
      policy?: { idleTimeoutSeconds: number }
      error?: { code: string; message: string; retryable: boolean }
    }

export interface VoiceDeviceView {
  id: string
  serialHint: string
  productSku: string
  circleId: string | null
  status: 'unbound' | 'bound' | 'transfer_pending' | 'disabled'
  bindingVersion: number
  activationState: string
  voiceReady: boolean
  disabledReason: string | null
  updatedAt: string
}

export interface DeviceHandoffView {
  deviceId: string
  scene: VoiceScene
  displayTopic: string
  setAt: string
  expiresAt: string
}

/** 客户端请求号：一次「开始」点击生成一次，重试复用，防止重复建会话 */
export function newClientRequestId(): string {
  const rnd = Math.random().toString(36).slice(2, 10)
  return `c${Date.now().toString(36)}${rnd}`
}

/**
 * 页面状态机（与交接书一致的全集）。
 * 商业 SDK 未接入前，聆听/识别/播放/静音/重连这几态无法真实到达，页面不伪造它们。
 */
export type VoiceUiState =
  | 'loading' // 读取入口状态
  | 'not_open' // 暂未开放（商业 API 未到位）
  | 'idle' // 待开始
  | 'connecting' // 连接中（服务端签发会话）
  | 'connected' // 已接通（真实：进入聆听；模拟：仅展示会话已建立）
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'reconnecting'
  | 'ending'
  | 'ended'
  | 'failed'

export function uiStateOfSession(s: VoiceSessionView | null): VoiceUiState {
  if (!s) return 'idle'
  switch (s.status) {
    case 'reserved':
      return 'connecting'
    case 'active':
      return 'connected'
    case 'ending':
      return 'ending'
    case 'ended':
    case 'cancelled':
      return 'ended'
    case 'failed':
      return 'failed'
    default:
      return 'idle'
  }
}

export const USAGE_TEXT: Record<VoiceSessionView['usageState'], string> = {
  none: '未产生语音用量',
  pending: '等待语音服务回传时长',
  vendor: '按语音服务记录的时长',
  estimated: '时长为估算，待核对',
  unknown: '时长未知，待核对（不会按此扣费）',
  mock: '模拟会话，非真实用量',
}

export const SCENE_TEXT: Record<string, string> = {
  plaza: '广场角色',
  circle_assistant: '圈子助理',
  classic_companion: '古籍伴读',
  report_dialogue: '报告对话',
  content_guide: '内容导览',
  device: '硬件设备',
}

export interface VoiceTopupPacks {
  canTopUp: boolean
  reason: string | null
  orderType: string
  pricePerMinuteCents: number
  availableMinutes: number
  packs: { minutes: number; amountYuan: number }[]
}

export interface XiaobuMemberPlan {
  key: string
  label: string
  months: number
  priceYuan: number
}

/** 小卜AI会员（独立于书院会员）：会员免费不限次生成报告，会员期内每月赠送语音 */
export interface XiaobuMemberOverview {
  active: boolean
  expireAt: string | null
  planKey: string | null
  plans: XiaobuMemberPlan[]
  monthlyVoiceMinutes: number
}

export const xiaobuVoiceApi = {
  /** 我的小卜AI会员状态与档位（开通走 /shop/orders type=XIAOBU_MEMBER，价格以服务端为准） */
  xiaobuMember(): Promise<XiaobuMemberOverview> {
    return apiGet<XiaobuMemberOverview>('/voice/xiaobu-member')
  },
  /** 语音时长充值档位（报告赠送时长用完后可充值；语音未开始计费时 canTopUp=false） */
  topupPacks(): Promise<VoiceTopupPacks> {
    return apiGet<VoiceTopupPacks>('/voice/topup/packs')
  },
  capabilities(): Promise<VoiceCapabilities> {
    return apiGetOptionalAuth<VoiceCapabilities>('/voice/capabilities')
  },
  start(body: {
    scene: VoiceScene
    contextId?: string
    sectionId?: string
    selectedText?: string
    intent?: 'explain' | 'ask'
    clientRequestId: string
  }): Promise<StartResult> {
    return apiPost<StartResult>('/voice/sessions', body)
  },
  end(
    id: string,
    clientEstimatedSeconds?: number,
    reason: 'user_hangup' | 'page_exit' | 'idle_timeout' = 'user_hangup',
  ): Promise<{ session: VoiceSessionView }> {
    return apiPost(`/voice/sessions/${encodeURIComponent(id)}/end`, { reason, clientEstimatedSeconds })
  },
  /** 用户有新输入：刷新服务端空闲计时（只报「有输入」这件事，不传语音或文字内容） */
  input(id: string): Promise<{ status: string; lastInputAt: string | null; idleTimeoutSeconds: number }> {
    return apiPost(`/voice/sessions/${encodeURIComponent(id)}/input`, {})
  },
  cancel(id: string): Promise<{ session: VoiceSessionView }> {
    return apiPost(`/voice/sessions/${encodeURIComponent(id)}/cancel`, {})
  },
  feedback(id: string, satisfaction: 'satisfied' | 'neutral' | 'unsatisfied'): Promise<VoiceSessionView> {
    return apiPost(`/voice/sessions/${encodeURIComponent(id)}/feedback`, { satisfaction })
  },
  /** 分页接口：服务端响应拦截器会把分页结构拆成 data + pagination，必须用 apiGetPaged 读 */
  list(page = 1): Promise<{ total: number; page: number; pageSize: number; items: VoiceSessionView[] }> {
    return apiGetPaged<VoiceSessionView>(`/voice/sessions?page=${page}&pageSize=20`)
  },
  devices(): Promise<VoiceDeviceView[]> {
    return apiGet('/voice/devices')
  },
  bindDevice(bindCode: string): Promise<VoiceDeviceView> {
    return apiPost('/voice/devices/bind', { bindCode })
  },
  /** 场景接续：把当前场景交给硬件，2 小时内按设备按键即接着聊 */
  setDeviceHandoff(id: string, body: { scene: VoiceScene; contextId?: string; sectionId?: string; intent?: 'explain' | 'ask' }): Promise<DeviceHandoffView> {
    return apiPut(`/voice/devices/${encodeURIComponent(id)}/handoff`, body)
  },
  getDeviceHandoff(id: string): Promise<DeviceHandoffView | null> {
    return apiGet(`/voice/devices/${encodeURIComponent(id)}/handoff`)
  },
  clearDeviceHandoff(id: string): Promise<{ cleared: boolean }> {
    return apiDelete(`/voice/devices/${encodeURIComponent(id)}/handoff`)
  },
  /** 小智协议终端：输入设备开机播报的数字激活码完成绑定 */
  activateDevice(activationCode: string): Promise<VoiceDeviceView> {
    return apiPost('/voice/devices/activate', { activationCode })
  },
  unbindDevice(id: string): Promise<VoiceDeviceView> {
    return apiPost(`/voice/devices/${encodeURIComponent(id)}/unbind`, {})
  },
  transferDevice(id: string): Promise<{ transferCode: string; expiresAt: string }> {
    return apiPost(`/voice/devices/${encodeURIComponent(id)}/transfer`, {})
  },
  cancelTransfer(id: string): Promise<VoiceDeviceView> {
    return apiPost(`/voice/devices/${encodeURIComponent(id)}/transfer/cancel`, {})
  },
  acceptTransfer(transferCode: string): Promise<VoiceDeviceView> {
    return apiPost('/voice/devices/transfer/accept', { transferCode })
  },
}
