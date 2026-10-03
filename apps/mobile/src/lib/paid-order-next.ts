/** 已核验支付的订单应回到对应服务，避免把数字服务用户送去商城。 */
import { queryString } from '@/utils/query-string'

const REPORT_TYPES = new Set(['general', 'career', 'love', 'wealth', 'health'])

function reportRoute(targetId?: string) {
  const split = targetId?.lastIndexOf(':') ?? -1
  if (split < 1) return null
  const recordId = targetId!.slice(0, split)
  const reportType = targetId!.slice(split + 1)
  if (!REPORT_TYPES.has(reportType)) return null
  return `/pkg-paipan/bazi/ai-report?recordId=${encodeURIComponent(recordId)}&reportType=${reportType}`
}

export type VoiceReturn = { scene?: string; contextId?: string; sectionId?: string }

function voiceReturnRoute(value?: VoiceReturn) {
  if (!value || !['report_dialogue', 'circle_assistant'].includes(value.scene || '')
    || !value.contextId || value.contextId.length > 128) return null
  const query = queryString([
    ['scene', value.scene],
    ['contextId', value.contextId],
    ['sectionId', value.scene === 'report_dialogue' && value.sectionId && value.sectionId.length <= 80 ? value.sectionId : undefined],
  ])
  return `/pkg-agent/agent/xiaobu-voice?${query}`
}

export function paidOrderNext(type?: string, targetId?: string, returnRecordId?: string, voiceReturn?: VoiceReturn): { label: string; path: string; title: string } | null {
  if (type === 'XIAOBU_REPORT') {
    const path = reportRoute(targetId)
    return path ? {
      label: '生成并查看报告',
      path,
      title: '排盘报告',
    } : null
  }
  if (type === 'XIAOBU_MEMBER') {
    const path = returnRecordId?.includes(':')
      ? reportRoute(returnRecordId)
      : returnRecordId ? `/pkg-paipan/bazi/ai-report?recordId=${encodeURIComponent(returnRecordId)}` : null
    return path
      ? { label: '生成并查看报告', path, title: '小卜AI会员' }
      : { label: '查看小卜AI会员', path: '/pkg-agent/agent/xiaobu-member', title: '小卜AI会员' }
  }
  if (type === 'VOICE_MINUTES') {
    const path = voiceReturnRoute(voiceReturn)
    return path
      ? { label: '继续语音对话', path, title: '语音时长' }
      : { label: '查看语音时长', path: '/pkg-agent/agent/xiaobu-voice-topup', title: '语音时长' }
  }
  if (type === 'PRACTITIONER_PRO') return { label: '返回从业者工作台', path: '/pkg-workspace/index/index', title: '从业者会员' }
  return null
}
