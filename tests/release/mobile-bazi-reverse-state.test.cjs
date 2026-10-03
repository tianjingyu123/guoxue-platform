const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('node:module').createRequire(path.resolve('apps/server/package.json'))('typescript')

// 执行实际组件脚本；只替换平台生命周期与响应式容器，不模拟原生 picker 渲染。
function component(file, names, globals = {}) {
  const sfc = fs.readFileSync(file, 'utf8')
  const script = sfc.split('<script setup lang="ts">')[1].split('</script>')[0]
  const source = ts.createSourceFile('component.ts', script, ts.ScriptTarget.Latest, true)
  const body = source.statements.filter((node) => !ts.isImportDeclaration(node)).map((node) => node.getText(source)).join('\n')
  const watchers = []
  const unmounts = []
  const context = {
    ref: (value) => ({ value }),
    computed: (get) => ({ get value() { return get() } }),
    watch: (source, run) => {
      const get = typeof source === 'function' ? source : () => source.value
      watchers.push({ get, run, previous: get() })
    },
    onUnmounted: (run) => unmounts.push(run), onLoad() {}, useOverlayScrollLock() {},
    defineProps: () => ({}), withDefaults: (props, defaults) => {
      for (const [key, value] of Object.entries(defaults)) if (props[key] === undefined) props[key] = value
      return props
    },
    defineEmits: () => () => {}, ...globals,
  }
  const exports = names.map((name) => `${name}: typeof ${name} === 'undefined' ? undefined : ${name}`).join(', ')
  vm.runInNewContext(ts.transpileModule(`${body}\nglobalThis.state = { ${exports} }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context)
  return {
    sfc, state: context.state,
    flush: () => watchers.forEach((watcher) => {
      const current = watcher.get()
      if (current !== watcher.previous) {
        watcher.previous = current
        watcher.run(current)
      }
    }),
    unmount: () => unmounts.forEach((run) => run()),
  }
}

function pending() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function picker(lookup) {
  const props = { open: true, initialMode: 'sizhu', enableSizhu: true, ziShiMode: 'traditional' }
  const emitted = []
  const loaded = component('apps/mobile/src/components/bazi/date-picker-modal.vue', [
    'sizhu', 'mode', 'lookingUp', 'reverseError', 'candidates', 'chosenHour', 'chosenMinute',
    'lookupSizhu', 'clearReverseSelection', 'chooseCandidate', 'chooseHour', 'chooseMinute', 'confirm',
    'hourPickerIndex', 'minutePickerIndex',
  ], { defineProps: () => props, defineEmits: () => (event, value) => emitted.push({ event, value }), baziReverseApi: { lookup } })
  Object.assign(loaded.state.sizhu.value, {
    yearGan: '庚', yearZhi: '辰', monthGan: '壬', monthZhi: '午', dayGan: '甲', dayZhi: '子', hourGan: '庚', hourZhi: '午',
  })
  return { ...loaded, props, emitted }
}

const result = { fromYear: 1900, toYear: 2026, candidates: [
  { year: 2000, month: 6, day: 15, hours: [{ hour: 0, minutes: [0, 1] }, { hour: 23, minutes: [45] }] },
  { year: 1940, month: 6, day: 15, hours: [{ hour: 12, minutes: [30] }] },
] }

test('四柱候选的第一小时及00分能够明确选中，未选择不能提交', async () => {
  const p = picker(async () => result)
  await p.state.lookupSizhu()
  p.state.chooseCandidate(0)
  p.state.confirm()
  assert.equal(p.emitted.length, 0)
  assert.equal(p.state.hourPickerIndex.value, 0)
  p.state.chooseHour({ detail: { value: '1' } })
  p.state.chooseMinute({ detail: { value: '1' } })
  p.state.confirm()
  assert.equal(p.emitted[0].value.hour, 0)
  assert.equal(p.emitted[0].value.minute, 0)
  assert.equal(p.emitted[0].value.isLunar, false)
  assert.equal(p.emitted[1].event, 'close')
})

test('更换日期或小时清空旧分钟，picker值与页面显示同步', async () => {
  const p = picker(async () => result)
  await p.state.lookupSizhu()
  p.state.chooseCandidate(0)
  p.state.chooseHour({ detail: { value: '1' } })
  p.state.chooseMinute({ detail: { value: '2' } })
  assert.equal(p.state.minutePickerIndex.value, 2)
  p.state.chooseHour({ detail: { value: '2' } })
  assert.equal(p.state.chosenHour.value, 23)
  assert.equal(p.state.chosenMinute.value, null)
  assert.equal(p.state.minutePickerIndex.value, 0)
  p.state.chooseCandidate(1)
  assert.equal(p.state.chosenHour.value, null)
  assert.equal(p.state.hourPickerIndex.value, 0)
})

test('关闭或切换子时口径使反查失效，旧成功响应不能恢复候选', async () => {
  for (const close of [true, false]) {
    const late = pending()
    const p = picker(() => late.promise)
    const request = p.state.lookupSizhu()
    if (close) p.props.open = false
    else p.props.ziShiMode = 'modern'
    p.flush()
    late.resolve(result)
    await request
    assert.equal(p.state.candidates.value.length, 0)
    assert.equal(p.state.lookingUp.value, false)
  }
})

test('旧错误不能覆盖新查询，新查询失败能够重新查询', async () => {
  const old = pending(), next = pending()
  let calls = 0
  const p = picker(() => ++calls === 1 ? old.promise : calls === 2 ? next.promise : Promise.resolve(result))
  const first = p.state.lookupSizhu()
  p.state.clearReverseSelection()
  const second = p.state.lookupSizhu()
  old.reject(new Error('旧请求错误'))
  await first
  assert.equal(p.state.reverseError.value, '')
  assert.equal(p.state.lookingUp.value, true)
  next.reject(new Error('网络中断'))
  await second
  assert.equal(p.state.reverseError.value, '网络中断')
  assert.equal(p.state.lookingUp.value, false)
  await p.state.lookupSizhu()
  assert.equal(p.state.candidates.value.length, 2)
})

test('已选日期在子时口径改变后失效，不拿旧候选作为新口径出盘', async () => {
  const p = picker(async () => result)
  await p.state.lookupSizhu()
  p.state.chooseCandidate(0)
  p.props.ziShiMode = 'modern'
  p.flush()
  assert.equal(p.state.candidates.value.length, 0)
  assert.equal(p.state.chosenHour.value, null)
})

test('无匹配日期时不猜测生日，不发出确认事件', async () => {
  const p = picker(async () => ({ ...result, candidates: [] }))
  await p.state.lookupSizhu()
  assert.match(p.state.reverseError.value, /查无匹配日期/)
  assert.equal(p.emitted.length, 0)
})

function form(calculate) {
  const visited = [], toasts = []
  const loaded = component('apps/mobile/src/components/bazi/input-form.vue', [
    'birthDate', 'sourcePillars', 'submitting', 'useTrueSolarTime', 'useDaylightSaving', 'handleSubmit', 'onDateConfirm',
  ], {
    baziApi: { calculate }, navigateTo: (url) => visited.push(url),
    uni: { showToast: ({ title }) => toasts.push(title) },
    toSolarSafe: (value) => ({ date: value, ok: true }),
  })
  loaded.state.onDateConfirm({ year: 2000, month: 6, day: 15, hour: 0, minute: 0, isLunar: false,
    sourcePillars: { year: '庚辰', month: '壬午', day: '甲子', hour: '甲子', ziShiMode: 'traditional' } })
  return { ...loaded, visited, toasts }
}
const chart = { siZhu: {
  year: { gan: '庚', zhi: '辰' }, month: { gan: '壬', zhi: '午' },
  day: { gan: '甲', zhi: '子' }, hour: { gan: '甲', zhi: '子' },
} }

test('四柱提交必须通过实际预览响应复核，保留00时分及保存参数', async () => {
  const f = form(async () => chart)
  assert.equal(f.state.useTrueSolarTime.value, false)
  assert.equal(f.state.useDaylightSaving.value, false)
  await f.state.handleSubmit()
  assert.equal(f.visited.length, 1)
  assert.match(f.visited[0], /hour=0&minute=0/)
  assert.match(f.visited[0], /trueSolar=false&earlyZi=false&dst=false/)
  assert.match(f.visited[0], /save=true/)
})

test('复核等待时连续提交仅发一请求，输入变化不能进入旧结果页', async () => {
  const late = pending()
  let calls = 0
  const f = form(() => { calls++; return late.promise })
  const first = f.state.handleSubmit()
  await f.state.handleSubmit()
  assert.equal(calls, 1)
  f.state.birthDate.value = { ...f.state.birthDate.value, minute: 1 }
  late.resolve(chart)
  await first
  assert.equal(f.visited.length, 0)
  assert.match(f.toasts[0], /输入已更新/)
  assert.equal(f.state.submitting.value, false)
})

test('离开输入页后晚到复核成功不把用户拉回结果页', async () => {
  const late = pending()
  const f = form(() => late.promise)
  const request = f.state.handleSubmit()
  f.unmount()
  late.resolve(chart)
  await request
  assert.equal(f.visited.length, 0)
  assert.equal(f.toasts.length, 0)
})

test('复核不符或网络失败均不出盘，失败后可再次提交', async () => {
  let calls = 0
  const f = form(async () => {
    calls++
    if (calls === 1) return { siZhu: { ...chart.siZhu, hour: { gan: '乙', zhi: '丑' } } }
    if (calls === 2) throw new Error('复核网络失败')
    return chart
  })
  await f.state.handleSubmit()
  assert.equal(f.visited.length, 0)
  assert.match(f.toasts[0], /四柱不符/)
  await f.state.handleSubmit()
  assert.equal(f.visited.length, 0)
  assert.equal(f.toasts[1], '复核网络失败')
  await f.state.handleSubmit()
  assert.equal(f.visited.length, 1)
})
