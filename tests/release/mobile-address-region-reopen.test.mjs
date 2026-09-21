import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../../apps/mobile/src/pkg-account/address-edit/index.vue', import.meta.url),
  'utf8',
)

test('地区选择器每次重新打开都重建微信滚动实例', () => {
  assert.match(source, /const pickerSession = ref\(0\)/)
  assert.match(source, /function openPicker\(\)[\s\S]*?pickerSession\.value \+= 1/)
  assert.match(source, /:key="`\$\{pickerSession\}-\$\{pickerStep\}`"/)
})

test('地区列表给微信 scroll-view 明确高度并启用增强滚动', () => {
  assert.match(source, /class="picker-list"[\s\S]*?:enhanced="true"/)
  assert.match(source, /\.picker-list\s*\{[\s\S]*?height:\s*calc\(70vh - 120rpx\)/)
})
