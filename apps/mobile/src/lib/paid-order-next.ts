/** 已核验支付的订单应回到对应服务，避免把数字服务用户送去商城。 */
export function paidOrderNext(type?: string, targetId?: string, returnRecordId?: string): { label: string; path: string; title: string } | null {
  if (type === 'XIAOBU_REPORT') {
    const recordId = targetId?.split(':')[0]
    return recordId ? {
      label: '生成并查看报告',
      path: `/pkg-paipan/bazi/ai-report?recordId=${encodeURIComponent(recordId)}`,
      title: '排盘报告',
    } : null
  }
  if (type === 'XIAOBU_MEMBER') return returnRecordId
    ? { label: '生成并查看报告', path: `/pkg-paipan/bazi/ai-report?recordId=${encodeURIComponent(returnRecordId)}`, title: '小卜AI会员' }
    : { label: '查看小卜AI会员', path: '/pkg-agent/agent/xiaobu-member', title: '小卜AI会员' }
  if (type === 'VOICE_MINUTES') return { label: '查看语音时长', path: '/pkg-agent/agent/xiaobu-voice-topup', title: '语音时长' }
  if (type === 'PRACTITIONER_PRO') return { label: '返回从业者工作台', path: '/pkg-workspace/index/index', title: '从业者会员' }
  return null
}
