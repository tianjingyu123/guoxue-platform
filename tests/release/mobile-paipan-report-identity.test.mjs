import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import vm from 'node:vm'

const requireMobile = createRequire(resolve('apps/mobile/package.json'))
const ts = requireMobile('typescript')

function pageMethod(path, endMarker, context) {
  const source = readFileSync(path, 'utf8')
  const start = source.indexOf('async function openXiaobuReport()')
  const end = source.indexOf(endMarker, start)
  assert.ok(start >= 0 && end > start, `报告入口不存在：${path}`)
  const method = source.slice(start, end)
  const code = ts.transpileModule(`${method}\nglobalThis.run = openXiaobuReport`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, context)
  return context.run
}

function baseContext() {
  let token = 'account-A'
  const visited = []
  const toasts = []
  const context = {
    getToken: () => token,
    getCurrentPages: () => [],
    navigateTo: (url) => visited.push(url),
    uni: { showToast: (notice) => toasts.push(notice.title) },
    preparingReport: { value: false },
  }
  return { context, visited, toasts, switchAccount: (next) => { token = next } }
}

test('紫微结果页换号后重新保存本人盘，不复用旧账号记录', async () => {
  const f = baseContext()
  const chart = { palaces: [{ name: '命宫' }] }
  const saves = []
  Object.assign(f.context, {
    pending: { name: '测试', gender: '男', y: 1990, m: 1, d: 2, hour: 12, minute: 0, useTrueSolar: false, nowYear: 2026 },
    chart: { value: chart },
    savedReportRecord: { value: { key: '', id: '' } },
    aiReportApi: { saveZiweiConsumerRecord: async () => {
      const id = `record-${saves.length + 1}`
      saves.push(id)
      return { id, chart }
    } },
  })
  const run = pageMethod('apps/mobile/src/pkg-paipan/ziwei/result.vue', '/** 服务端安星', f.context)
  await run()
  f.switchAccount('account-B')
  await run()
  assert.deepEqual(saves, ['record-1', 'record-2'])
  assert.deepEqual(f.visited, [
    '/pkg-paipan/bazi/ai-report?recordId=record-1',
    '/pkg-paipan/bazi/ai-report?recordId=record-2',
  ])
})

test('玄空保存迟到时账号已变化，不把旧记录带入报告页', async () => {
  const f = baseContext()
  let releaseSave
  const waiting = new Promise((resolveSave) => { releaseSave = resolveSave })
  const gongs = Array.from({ length: 9 }, (_, index) => ({
    palace: index + 1, yunStar: 8, shanStar: 1, xiangStar: 2,
  }))
  Object.assign(f.context, {
    params: { value: { sitting: 0, year: 2020, period: 8, ti: false } },
    chart: { value: {
      yunPan: Object.fromEntries(gongs.map((g) => [g.palace, g.yunStar])),
      shanPan: Object.fromEntries(gongs.map((g) => [g.palace, g.shanStar])),
      xiangPan: Object.fromEntries(gongs.map((g) => [g.palace, g.xiangStar])),
    } },
    customer: { value: '测试' },
    MOUNTAINS: Array.from({ length: 24 }, (_, index) => String(index)),
    savedReportRecord: { value: { key: '', id: '' } },
    aiReportApi: { saveXuankongRecord: () => waiting },
  })
  const run = pageMethod('apps/mobile/src/pkg-paipan/xuankong/result.vue', 'function pad(n: number)', f.context)
  const pending = run()
  f.switchAccount('account-B')
  releaseSave({ id: 'record-A', result: { basicInfo: { yuanYun: 8 }, gongs } })
  await pending
  assert.equal(f.visited.length, 0)
  assert.match(f.toasts.at(-1), /登录身份已变化/u)
})

test('金口诀结果页换号后不复用上个账号的课盘记录', async () => {
  const f = baseContext()
  const saves = []
  Object.assign(f.context, {
    q: { value: { topic: '测试事项', year: 2026, month: 9, day: 28, hour: 12, minute: 0, dm: 'fixed', dz: '子', jm: 'fixed', gs: 'A', gt: 'B' } },
    result: { value: {} },
    reportRecordId: { value: '' },
    reportRecordKey: { value: '' },
    aiReportApi: { saveJinkoujueRecord: async () => {
      const id = `record-${saves.length + 1}`
      saves.push(id)
      return { id }
    } },
  })
  const run = pageMethod('apps/mobile/src/pkg-paipan/jinkoujue/result.vue', 'function pad(n: number)', f.context)
  await run()
  f.switchAccount('account-B')
  await run()
  assert.deepEqual(saves, ['record-1', 'record-2'])
  assert.deepEqual(f.visited, [
    '/pkg-paipan/bazi/ai-report?recordId=record-1',
    '/pkg-paipan/bazi/ai-report?recordId=record-2',
  ])
})

test('阴盘报告保存核对九宫；盘面不一致时禁止进入付费报告', async () => {
  const f = baseContext()
  const palaces = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, {
    diGan: '甲', tianGan: '乙', tianGan2: '', star: '天蓬', star2: '', men: '休门',
  }]))
  const chart = { ju: { isYang: true, num: 4 }, zhifu: { star: '天蓬' }, zhishi: { men: '休门' }, palaces }
  const saved = {
    id: 'yinpan-record',
    result: {
      juNumber: 4, dunType: 'yang', zhiFu: '天蓬', zhiShiMen: '休门',
      gongs: Array.from({ length: 9 }, (_, i) => ({ index: i + 1, diPan: '甲', tianPan: '乙', star: '天蓬', men: '休门' })),
    },
  }
  Object.assign(f.context, {
    params: { value: { year: 2019, month: 5, day: 2, hour: 9, minute: 9, trueSolar: false, lng: 115.42 } },
    qr: { value: chart }, qrLoading: { value: false }, juOverride: { value: null },
    editedMatter: { value: '学业' }, savedReportRecord: { value: { key: '', id: '' } },
    aiReportApi: { saveYinpanRecord: async () => saved },
  })
  const run = pageMethod('apps/mobile/src/pkg-paipan/yinpan/result.vue', 'function handleShare()', f.context)
  await run()
  assert.deepEqual(f.visited, ['/pkg-paipan/bazi/ai-report?recordId=yinpan-record'])
  f.context.savedReportRecord.value = { key: '', id: '' }
  saved.result.gongs[3].diPan = '庚'
  await run()
  assert.equal(f.visited.length, 1)
  assert.match(f.toasts.at(-1), /盘面与报告记录不一致/u)
})
