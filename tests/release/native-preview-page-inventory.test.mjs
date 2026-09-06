import test from 'node:test'
import assert from 'node:assert/strict'
import { auditNativePreviewPages } from '../../scripts/release/audit-native-preview-pages.mjs'

function audit(page, routes = ['index']) {
  return auditNativePreviewPages('.', file => file.endsWith('pages.json')
    ? JSON.stringify({ subPackages: [{ root: 'pkg-paipan2', pages: routes.map(path => ({ path })) }] }) : page)
}
test('裸入口和只导入未调用均不得通过', () => {
  assert.equal(audit('<script setup>onLoad(loadHistory)</script><template/>').wired, 0)
  assert.equal(audit('<script setup>import { useNativePreviewPage } from "@/composables/useNativePreviewPage"</script><template/>').wired, 0)
})
test('接线仍必须在模板隔离未授权内容，扫描不冒充完整验收', () => {
  const script = '<script setup>import { useNativePreviewPage } from "@/composables/useNativePreviewPage"; const preview = useNativePreviewPage(load, clear)</script>'
  assert.equal(audit(script + '<template/>').wired, 0)
  assert.equal(audit(script + '<template><view v-if="preview.allowed.value"/></template>').wired, 1)
  assert.equal(audit(script.replace('</script>', '; const { allowed, checking } = preview</script>') + '<template><view v-if="!allowed"/><view v-else/></template>').wired, 1)
})
test('清单不允许空集或重复路由造成假绿', () => {
  assert.throws(() => audit('', []))
  assert.throws(() => audit('', ['index', 'index']))
})

test('只有精确共用罗盘承接页豁免，自研邻页及缺少承接仍阻断', () => {
  const page = '<script setup>function openCompass(){uni.redirectTo({url:"/pkg-common/compass/index"})};onLoad(openCompass)</script><template/>'
  const run = (route, source) => auditNativePreviewPages('.', file => file.endsWith('pages.json')
    ? JSON.stringify({ subPackages: [{ root: 'pkg-paipan3', pages: [{ path: route }] }] }) : source)
  assert.equal(run('luopan/index', page).wired, 1)
  assert.equal(run('bazhai/index', page).wired, 0)
  assert.equal(run('luopan/index', page.replace('/pkg-common/compass/index', '/pkg-paipan/bazi/index')).wired, 0)
  assert.equal(run('luopan/index', page.replace('onLoad(openCompass)', '')).wired, 0)
  assert.equal(run('luopan/index', page.replace('function openCompass()', 'getStorageSync("private");function openCompass()')).wired, 0)
})
