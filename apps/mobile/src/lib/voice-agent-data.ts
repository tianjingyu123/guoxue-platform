/**
 * 小卜 · 圈主语音角色申请（S02）
 * 后端：GET/PUT /circles/:circleId/voice-agent，POST /circles/:circleId/voice-agent/submit
 */
import { apiGet, apiPost, apiPut } from '@/utils/request'

export type VoiceAgentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISABLED'

export interface VoiceAgentVersion {
  version: number
  name: string
  persona: string
  voiceId: string
  tier: string
  approvedAt: string
}

export interface VoiceAgentProfile {
  id: string
  name: string
  persona: string
  prompt: string
  voiceId: string
  tier: string
  status: VoiceAgentStatus
  draftVersion: number
  activeVersion: number | null
  riskFlags: string[]
  reviewNote: string | null
  reviewedAt: string | null
  submittedAt: string | null
  versions?: VoiceAgentVersion[]
}

export interface VoiceAgentDraft {
  name: string
  persona: string
  prompt: string
  voiceId: string
}

/**
 * 平台标准音色（内部代号）。小智商业音色列表未取得前，由平台审核时映射到实际音色；试听待开放。
 */
export const STANDARD_VOICES = [
  { id: 'std-female-gentle', label: '女声 · 温和' },
  { id: 'std-female-bright', label: '女声 · 明亮' },
  { id: 'std-male-steady', label: '男声 · 沉稳' },
  { id: 'std-male-warm', label: '男声 · 温厚' },
]

export const voiceAgentApi = {
  get(circleId: string) {
    return apiGet<VoiceAgentProfile | null>(`/circles/${encodeURIComponent(circleId)}/voice-agent`)
  },
  save(circleId: string, draft: VoiceAgentDraft) {
    return apiPut<VoiceAgentProfile>(`/circles/${encodeURIComponent(circleId)}/voice-agent`, draft)
  },
  submit(circleId: string) {
    return apiPost<VoiceAgentProfile>(`/circles/${encodeURIComponent(circleId)}/voice-agent/submit`)
  },
}
