/** 已核验支付的订单应回到对应服务，避免把数字服务用户送去商城。 */
const REPORT_TYPES = new Set(['general', 'career', 'love', 'wealth', 'health'])

function reportRoute(targetId?: string) {
  const split = targetId?.lastIndexOf(':') ?? -1
  if (split < 1) return null
  const recordId = targetId!.slice(0, split)
  const reportType = targetId!.slice(split + 1)
  if (!REPORT_TYPES.has(reportType)) return null
  return `/pkg-paipan/bazi/ai-report?recordId=${encodeURIComponent(recordId)}&reportType=${reportType}`
}

export function paidOrderNext(type?: string, targetId?: string, returnRecordId?: string): { label: string; path: string; title: string } | null {
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
  if (type === 'VOICE_MINUTES') return { label: '查看语音时长', path: '/pkg-agent/agent/xiaobu-voice-topup', title: '语音时长' }
  if (type === 'PRACTITIONER_PRO') return { label: '返回从业者工作台', path: '/pkg-workspace/index/index', title: '从业者会员' }
  return null
}
