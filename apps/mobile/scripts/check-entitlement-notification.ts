import assert from 'node:assert/strict'
import { presentEntitlement, ENTITLEMENT_NOTIFICATION_ROUTE } from '../src/lib/entitlement-presentation'
import type { EntitlementItem } from '../src/lib/entitlement-data'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'

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

async function checkMainNotificationAdapter() {
  const notice = { type: 'ENTITLEMENT', title: '权益已到账', content: '有一笔权益已发放', targetType: 'ENTITLEMENT', targetId: '不能用于查询他人权益', createdAt: new Date().toISOString(), isRead: false }
  const rows = [{ ...notice, id: 'grant-a' }, { ...notice, id: 'grant-b' }, { ...notice, id: 'grant-a' }]
  const source = process.argv.includes('--historical-adapter')
    ? execFileSync('git', ['show', 'ad85d913ecdf2facf92bd8c33357a04afefbe814:apps/mobile/src/lib/mine-data.ts'], { encoding: 'utf8' })
    : readFileSync(fileURLToPath(new URL('../src/lib/mine-data.ts', import.meta.url)), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} as { mineApi: { getNotifications(): Promise<Array<{ id: string; kind: string; category: string; link: string }>> } } }
  // 执行真实数据适配器，只替换 HTTP 边界；任何未声明的依赖立即失败。
  const requireFixture = (id: string) => {
    if (id === '@/utils/request') return { apiGet: async (url: string) => {
      assert.equal(url, '/notifications?page=1&pageSize=50')
      return { notifications: rows }
    } }
    if (id === '@/lib/entitlement-presentation') return { ENTITLEMENT_NOTIFICATION_ROUTE }
    throw new Error(`通知适配器出现未声明的测试依赖：${id}`)
  }
  // Node 无 Vite import.meta.env；支付函数未调用，环境边界使用空的合成配置。
  new Function('exports', 'require', 'module', 'fixtureImportMeta', compiled.outputText.replaceAll('import.meta', 'fixtureImportMeta'))(module.exports, requireFixture, module, { env: {} })
  const notifications = await module.exports.mineApi.getNotifications()
  if (process.argv.includes('--historical-adapter')) console.log(JSON.stringify({ historicalSource: 'ad85d913e', notifications }))
  assert.deepEqual(notifications.map(row => row.id), ['grant-a', 'grant-b'])
  assert(notifications.every(row => row.kind === 'transaction' && row.category === '权益'))
  assert(notifications.every(row => row.link === ENTITLEMENT_NOTIFICATION_ROUTE))
  console.log('主通知适配器：同文案两笔权益保留，重复ID去重，交易分类与本人权益跳转通过')
}
checkMainNotificationAdapter().catch(error => { console.error(error); process.exitCode = 1 })
