import assert from 'node:assert/strict'
import test from 'node:test'

import { parseAppEntryLink } from '../../apps/mobile/src/utils/app-entry-link.ts'

test('生产与预发布 App Link 映射为站内路由并保留普通查询参数', () => {
  assert.equal(
    parseAppEntryLink('https://api.rebugx.cn/h5/paipan/luopan?source=share&id=42#ignored'),
    '/paipan/luopan?source=share&id=42',
  )
  assert.equal(
    parseAppEntryLink('https://pre-api.rebugx.cn/h5/pkg-paipan3/bazhai/index?handoff=once'),
    '/pkg-paipan3/bazhai/index?handoff=once',
  )
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/'), '/pages/index/index')
})

test('App Link 拒绝非 HTTPS、非受信主机、非默认端口和 URL 凭据', () => {
  assert.equal(parseAppEntryLink('http://api.rebugx.cn/h5/paipan/luopan'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn.evil.test/h5/paipan/luopan'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn:8443/h5/paipan/luopan'), null)
  assert.equal(parseAppEntryLink('https://user:pass@api.rebugx.cn/h5/paipan/luopan'), null)
})

test('App Link 拒绝越界路径、编码分隔符、敏感凭据和异常输入', () => {
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/admin'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/%2F%2Fevil.test'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/paipan%5Cluopan'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/paipan/luopan?access_token=secret'), null)
  assert.equal(parseAppEntryLink('not-a-url'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/' + 'a'.repeat(2048)), null)
})
