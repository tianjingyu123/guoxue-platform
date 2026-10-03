import type { EntitlementItem } from './entitlement-data'

export const ENTITLEMENT_NOTIFICATION_ROUTE = '/mine/memberships'

const names: Record<string, string> = {
  'quota.report': '排盘报告额度',
  'quota.ai': '智能对话额度',
  'quota.voice': '语音服务额度',
  'course.access': '课程学习权益',
  'bundle.access': '课程合集权益',
  'bot_service.access': '智能体服务权益',
  'paipan.access': '排盘服务权益',
  'livestream.access': '直播观看权益',
  'ebook.access': '古籍阅读权益',
  'membership.practitioner': '术师服务权益',
}

/** 只展示当前读模型，不能把发放流水的原始数量当成剩余额度。 */
export function presentEntitlement(item: EntitlementItem, now = Date.now()) {
  const future = item.validFrom && new Date(item.validFrom).getTime() > now
  const expired = item.effectiveStatus === 'EXPIRED' || (item.validUntil && new Date(item.validUntil).getTime() <= now)
  const exhausted = !item.unlimited && item.quantity <= 0
  const status = item.effectiveStatus === 'REVOKED' ? '已撤销'
    : expired ? '已过期' : future ? '待生效' : exhausted ? '已用完' : '可使用'
  const label = names[item.entitlementKey] || ({ QUOTA: '服务额度', ACCESS: '服务使用权益', CREDIT: '服务额度', COUPON: '优惠券权益', MEMBERSHIP: '会员服务权益' } as Record<string, string>)[item.kind] || '服务权益'
  const quantity = status !== '可使用' ? status
    : item.unlimited ? (item.kind === 'QUOTA' ? '不限次数' : '已开通')
      : item.kind === 'ACCESS' || item.kind === 'MEMBERSHIP' ? '已开通'
        : `${item.quantity}${item.kind === 'QUOTA' ? '次' : item.kind === 'COUPON' ? '张' : '份'}`
  let validity = '长期有效'
  if (item.validUntil) {
    const date = new Date(item.validUntil)
    validity = `有效期至 ${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }
  if (future) {
    const date = new Date(item.validFrom!)
    validity = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 生效`
  }
  return { label, quantity, status, validity, available: status === '可使用' }
}
