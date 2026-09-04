import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const policy = read('apps/mobile/src/lib/client-module-policy.ts')
const remoteConfig = read('apps/mobile/src/lib/remote-config.ts')
const app = read('apps/mobile/src/App.vue')
const router = read('apps/mobile/src/utils/router.ts')
const bottomNav = read('apps/mobile/src/components/bottom-nav/bottom-nav.vue')
const coreGrid = read('apps/mobile/src/components/navigation/core-entry-grid.vue')
const allFeatures = read('apps/mobile/src/components/home/all-features-sheet.vue')
const profile = read('apps/mobile/src/pages/profile/index.vue')
const blockRenderer = read('apps/mobile/src/components/layout/block-renderer.vue')
const serverGuard = read('apps/server/src/common/client-module.guard.ts')
const main = read('apps/server/src/main.ts')

test('入口、统一路由、框架直跳和冷启动深链形成三层客户端总闸', () => {
  assert.match(bottomNav, /visibleTabs[\s\S]*isClientRouteEnabled/)
  assert.match(coreGrid, /visibleEntries[\s\S]*isClientRouteEnabled/)
  assert.match(allFeatures, /visibleCoreEntries[\s\S]*visibleServiceGroups/)
  assert.match(profile, /matrixItems[\s\S]*isClientRouteEnabled/)
  assert.match(blockRenderer, /isClientRouteEnabled/)
  assert.match(router, /applyClientModuleGate/)
  assert.match(app, /uni\.addInterceptor[\s\S]*clientFeatureUnavailableRoute/)
  assert.match(app, /setTimeout\(enforceCurrentClientModule, 0\)/)
})

test('直播、商家、商城、会员、短视频、圈子和智能服务共享客户端与服务端开关', () => {
  for (const key of ['live', 'merchant', 'shop', 'member', 'video', 'circle', 'ai']) {
    const flag = `client_module_${key}`
    assert.match(remoteConfig, new RegExp(flag))
    assert.match(serverGuard, new RegExp(flag))
  }
  assert.match(policy, /client_module_\$\{module\}/)
  assert.match(main, /new ClientModuleGuard\(app\.get\(FeatureFlagService\)\)/)
})

test('关闭模块阻断写操作但保留支付、物流和媒体回调以收敛在途状态', () => {
  assert.match(serverGuard, /POST.*PUT.*PATCH.*DELETE/)
  for (const path of ['live', 'videos', 'shop', 'merchant', 'member', 'circles', 'ai']) {
    assert.match(serverGuard, new RegExp(`/${path}`))
  }
  for (const callback of ['callback|trtc\\/callback', 'videos\\/vod\\/callback', 'pay\\/notify', 'kuaidi100\\/callback']) {
    assert.ok(serverGuard.includes(callback), callback)
  }
  assert.match(serverGuard, /NotFoundException\('资源不存在'\)/)
})
