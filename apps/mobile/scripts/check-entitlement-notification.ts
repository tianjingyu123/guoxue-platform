import assert from 'node:assert/strict'
import { presentEntitlement, ENTITLEMENT_NOTIFICATION_ROUTE } from '../src/lib/entitlement-presentation'
import type { EntitlementItem } from '../src/lib/entitlement-data'

const now = Date.UTC(2026, 9, 1, 12)
const item: EntitlementItem = {
  id: 'synthetic', entitlementKey: 'quota.report', kind: 'QUOTA', resourceType: '', resourceId: '', scope: 'GLOBAL',
  quantity: 2, unlimited: false, validUntil: null, effectiveStatus: 'ACTIVE', source: 'ENTITLEMENT_CENTER',
}
assert.equal(ENTITLEMENT_NOTIFICATION_ROUTE, '/mine/memberships')
assert.deepEqual(presentEntitlement(item, now), { label: '排盘报告额度', quantity: '2次', status: '可使用', validity: '长期有效', available: true })
assert.equal(presentEntitlement({ ...item, quantity: 0 }, now).quantity, '已用完')
assert.equal(presentEntitlement({ ...item, quantity: 0, unlimited: true }, now).quantity, '不限次数')
assert.equal(presentEntitlement({ ...item, validUntil: new Date(now - 1).toISOString() }, now).quantity, '已过期')
assert.equal(presentEntitlement({ ...item, effectiveStatus: 'REVOKED', quantity: 999 }, now).quantity, '已撤销')
assert.equal(presentEntitlement({ ...item, validFrom: new Date(now + 86400000).toISOString() }, now).quantity, '待生效')
assert.equal(presentEntitlement({ ...item, kind: 'ACCESS', entitlementKey: 'course.access' }, now).quantity, '已开通')
assert.equal(presentEntitlement({ ...item, entitlementKey: 'internal.unknown' }, now).label, '服务额度')
console.log('权益展示：9 项断言通过，数量、时效和通知目标符合本人权益语义')
