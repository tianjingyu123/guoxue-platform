import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const checkoutPath = new URL('../../apps/mobile/src/pkg-shop/checkout/index.vue', import.meta.url)
const packagePath = new URL('../../package.json', import.meta.url)

test('商城结算空地址卡展示明确提示并直接进入新增地址', async () => {
  const source = await readFile(checkoutPath, 'utf8')

  assert.match(source, /class="address-card"\s+@tap="onAddressCardTap"/u)
  assert.match(source, /v-else\s+class="address-empty"/u)
  assert.match(source, /addresses\.length > 0 \? '选择收货地址' : '添加收货地址'/u)
  assert.match(source, /addresses\.length > 0 \? '请选择已有地址，或添加新地址' : '请填写收货人、手机号和详细地址'/u)
  assert.match(
    source,
    /function onAddressCardTap\(\)[\s\S]*?!currentAddress\.value\s*&&\s*addresses\.value\.length\s*===\s*0[\s\S]*?goAddAddress\(\)[\s\S]*?showAddress\.value\s*=\s*true/u,
  )
  assert.match(source, /navigateTo\('\/pkg-account\/address-edit\/index'\)/u)
  assert.match(source, /if \(!currentAddress\.value\).*请选择收货地址/u)
})

test('商城空地址回归已接入移动端正式门禁', async () => {
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'))
  assert.match(pkg.scripts['release:test-mobile-native-bundle'], /mobile-shop-checkout-address\.test\.mjs/u)
})
