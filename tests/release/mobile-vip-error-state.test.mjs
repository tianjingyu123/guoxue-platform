import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '../..')
const read = (file) => readFileSync(path.join(root, file), 'utf8')

test('会员页把真实错误原因传给通用错误态，不能统一误报网络异常', () => {
  const page = read('apps/mobile/src/pkg-profile/vip/index.vue')
  const records = read('apps/mobile/src/pkg-profile/vip/records/index.vue')
  assert.match(page, /<app-error[^>]*:desc="error"/u)
  assert.match(records, /<app-error[^>]*:desc="error"/u)
  assert.doesNotMatch(page, /<app-error[^>]*:message=/u)
  assert.doesNotMatch(records, /<app-error[^>]*:message=/u)
})

test('会员套餐为空时明确提示配置未完成，不允许出现无效购买按钮', () => {
  const page = read('apps/mobile/src/pkg-profile/vip/index.vue')
  assert.match(page, /if \(!plans\.length\)/u)
  assert.match(page, /会员套餐暂未配置，请稍后再来/u)
  assert.match(page, /v-if="data && selectedPlan" class="buy-bar"/u)
})
