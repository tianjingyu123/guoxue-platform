import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('小程序顶部操作区按微信胶囊真实左边界计算右侧避让', () => {
  const source = read('apps/mobile/src/utils/mini-program-menu.ts')
  assert.match(source, /getMenuButtonBoundingClientRect/)
  assert.match(source, /viewportWidth\s*-\s*capsuleLeft/)
  assert.match(source, /return 0/)
})

test('共用客服消息区和导航栏应用胶囊避让', () => {
  const support = read('apps/mobile/src/components/common/platform-support-actions.vue')
  const nav = read('apps/mobile/src/components/common/app-nav-bar.vue')
  assert.match(support, /getMiniProgramMenuSafeRight/)
  assert.match(support, /marginRight: menuSafeRight/)
  assert.match(nav, /getMiniProgramMenuSafeRight/)
  assert.match(nav, /marginRight: menuSafeRight/)
})

test('个人中心消息设置和排盘历史按钮应用胶囊避让', () => {
  const profile = read('apps/mobile/src/pages/profile/index.vue')
  const paipan = read('apps/mobile/src/pages/paipan/index.vue')
  assert.match(profile, /right: menuSafeRight \? menuSafeRight \+ 'px'/)
  assert.match(paipan, /marginRight: menuSafeRight \+ 'px'/)
})
