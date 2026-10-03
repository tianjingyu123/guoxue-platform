import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')

function load(relativePath, dependencies = {}) {
  const source = fs.readFileSync(relativePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(dependencies, name), `未提供依赖：${name}`)
      return dependencies[name]
    },
    encodeURIComponent,
  })
  return exports
}

const query = load('apps/mobile/src/utils/query-string.ts')

test('小程序无 URLSearchParams 时，付款后的语音返回地址仍可安全编码', () => {
  const { paidOrderNext } = load('apps/mobile/src/lib/paid-order-next.ts', {
    '@/utils/query-string': query,
  })
  const next = paidOrderNext('VOICE_MINUTES', undefined, undefined, {
    scene: 'report_dialogue',
    contextId: 'x&y',
    sectionId: 'a b',
  })
  assert.equal(next.path, '/pkg-agent/agent/xiaobu-voice?scene=report_dialogue&contextId=x%26y&sectionId=a%20b')
})

test('小程序无 URLSearchParams 时，驿站公开发现与活动、定价参考仍发出正确请求', async () => {
  const urls = []
  const request = {
    apiGet: async url => { urls.push(url); return {} },
    apiGetPaged: async url => { urls.push(url); return { items: [], total: 0 } },
    apiPost: async () => undefined,
    apiPut: async () => undefined,
    apiDelete: async () => undefined,
  }
  const deps = { '@/utils/query-string': query, '@/utils/request': request }
  const { offlineApi, offlineManageApi } = load('apps/mobile/src/lib/offline-data.ts', deps)
  const { pricingApi } = load('apps/mobile/src/lib/pricing-data.ts', deps)

  await offlineApi.discoverStations({ city: '北京', keyword: '甲&乙' })
  await offlineApi.getEvents({ type: 'all', page: 2 })
  await offlineManageApi.getTeacherBookings('station_1', 'teacher_2')
  await offlineManageApi.getStationOrders('station_1', { status: 'PAID' })
  await offlineManageApi.getStationSettlements('station_1', { page: 3 })
  await pricingApi.getReference({ bizType: 'COURSE', categoryLevel1: '命理/国学', currentPrice: 0 })

  assert.deepEqual(urls, [
    '/offline/stations/discover?city=%E5%8C%97%E4%BA%AC&keyword=%E7%94%B2%26%E4%B9%99&pageSize=100',
    '/offline/events?page=2&pageSize=20',
    '/offline/stations/station_1/teacher-bookings?pageSize=100&teacherId=teacher_2',
    '/offline/stations/station_1/orders?status=PAID&page=1&pageSize=50',
    '/offline/stations/station_1/settlements?page=3&pageSize=50',
    '/pricing/reference?bizType=COURSE&categoryLevel1=%E5%91%BD%E7%90%86%2F%E5%9B%BD%E5%AD%A6&currentPrice=0',
  ])
})

test('小程序无 URLSearchParams 时，排盘报告读取接口保留记录与流派参数', async () => {
  const urls = []
  const { aiReportApi } = load('apps/mobile/src/lib/paipan/ai-report-data.ts', {
    '@/utils/query-string': query,
    '@/utils/request': {
      apiGet: async url => { urls.push(url); return {} },
      apiGetPaged: async () => ({}),
      apiPost: async () => ({}),
      apiDelete: async () => ({}),
    },
  })
  await aiReportApi.access('a&b', 'career')
  await aiReportApi.preflight('a&b', '甲 乙')
  assert.deepEqual(urls, [
    '/paipan/report/access?recordId=a%26b&reportType=career',
    '/paipan/report/preflight?recordId=a%26b&school=%E7%94%B2%20%E4%B9%99',
  ])
})

test('小程序无 URLSearchParams 时，商家订单、物流和库存请求仍可使用', async () => {
  const urls = []
  const request = {
    apiGet: async url => { urls.push(url); return {} },
    apiGetPaged: async url => { urls.push(url); return { items: [], total: 0 } },
    apiPost: async () => undefined,
    apiPut: async () => undefined,
    apiDelete: async () => undefined,
  }
  const { merchantBackendApi } = load('apps/mobile/src/pkg-merchant/lib/merchant-data.ts', {
    '@/utils/query-string': query,
    '@/utils/request': request,
  })
  await merchantBackendApi.getOrders({ status: 'PAID', customerId: 'a&b', page: 2 })
  await merchantBackendApi.getLogisticsTrack('123&456', '顺丰')
  await merchantBackendApi.getInventoryStocks({ keyword: '书 & 画', lowStock: true })
  assert.deepEqual(urls, [
    '/merchant-backend/orders?status=PAID&customerId=a%26b&page=2&pageSize=20',
    '/shop/logistics/track?no=123%26456&company=%E9%A1%BA%E4%B8%B0',
    '/merchant-backend/inventory/stocks?page=1&pageSize=100&keyword=%E4%B9%A6%20%26%20%E7%94%BB&lowStock=true',
  ])
})
