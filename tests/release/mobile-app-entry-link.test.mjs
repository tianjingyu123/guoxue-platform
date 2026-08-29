import assert from 'node:assert/strict'
import test from 'node:test'

import { parseAppEntryLink } from '../../apps/mobile/src/utils/app-entry-link.ts'

const formalApiOrigin = 'https://api.rebugx.cn'
const parseFormalAppEntryLink = (raw) => parseAppEntryLink(raw, formalApiOrigin)

test('生产 App Link 映射为站内路由并保留普通查询参数', () => {
  assert.equal(
    parseFormalAppEntryLink('https://api.rebugx.cn/h5/paipan/luopan?source=share&id=42#ignored'),
    '/paipan/luopan?source=share&id=42',
  )
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/'), '/pages/index/index')
})

test('App Link 拒绝非 HTTPS、非受信主机、非默认端口和 URL 凭据', () => {
  assert.equal(parseFormalAppEntryLink('http://api.rebugx.cn/h5/paipan/luopan'), null)
  assert.equal(parseFormalAppEntryLink('https://pre-api.rebugx.cn/h5/pkg-paipan3/bazhai/index'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn.evil.test/h5/paipan/luopan'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn:8443/h5/paipan/luopan'), null)
  assert.equal(parseFormalAppEntryLink('https://user:pass@api.rebugx.cn/h5/paipan/luopan'), null)
  assert.equal(
    parseFormalAppEntryLink('HTTPS://API.REBUGX.CN:443/h5/pkg-live/manage/index'),
    '/pkg-live/manage/index',
  )
})

test('App Link 拒绝越界路径、编码分隔符、敏感凭据和异常输入', () => {
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/admin'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/%2F%2Fevil.test'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/paipan%5Cluopan'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/pkg-live/%2e%2e/manage/index'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/pkg-live%3Ftoken=hidden'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/paipan/luopan?access_token=secret'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/paipan/luopan?access%5Ftoken=secret'), null)
  assert.equal(parseFormalAppEntryLink('not-a-url'), null)
  assert.equal(parseFormalAppEntryLink('https://api.rebugx.cn/h5/' + 'a'.repeat(2048)), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/', ''), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/', 'http://api.rebugx.cn'), null)
  assert.equal(parseAppEntryLink('https://api.rebugx.cn/h5/', 'https://api.rebugx.cn/path'), null)
})

test('App Link 解析器不依赖 DCloud Android 缺失的 WHATWG URL', async () => {
  const parserSource = await import('node:fs/promises').then(({ readFile }) => readFile('apps/mobile/src/utils/app-entry-link.ts', 'utf8'))
  assert.doesNotMatch(parserSource, /new URL\(/u)
  assert.match(parserSource, /authority\.includes\('@'\)/u)
  assert.match(parserSource, /port !== '443'/u)
})

test('Android App Link 通过主 Activity 别名接管冷热启动', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const path of ['apps/mobile/AndroidManifest.xml', 'apps/mobile/src/AndroidManifest.xml']) {
    const manifest = await readFile(path, 'utf8')
    assert.match(manifest, /<activity-alias[\s\S]*?android:name="com\.rebu\.apprebu\.AppLinkEntry"/u)
    assert.match(manifest, /android:targetActivity="io\.dcloud\.PandoraEntryActivity"/u)
    assert.doesNotMatch(manifest, /<activity\s+[\s\S]*?android:name="io\.dcloud\.PandoraEntry"[\s\S]*?android:autoVerify="true"/u)
  }
})

test('App 生命周期按 DCloud 约定在 onShow 和全局 newintent 事件处理深链', async () => {
  const appSource = await import('node:fs/promises').then(({ readFile }) => readFile('apps/mobile/src/App.vue', 'utf8'))
  assert.match(appSource, /document\.addEventListener\('newintent'/u)
  assert.match(appSource, /globalEvent\.addEventListener\('newintent'/u)
  assert.match(appSource, /document\.addEventListener\('plusready'/u)
  assert.match(appSource, /getEnterOptionsSync\(\)/u)
  assert.match(appSource, /getLaunchOptionsSync\(\)/u)
  assert.match(appSource, /enterOptions\.appLink/u)
  assert.match(appSource, /runtimeMainActivity/u)
  assert.match(appSource, /invoke\?\.\(activity, 'getIntent'\)/u)
  assert.match(appSource, /invoke\?\.\(intent, 'getDataString'\)/u)
  assert.match(appSource, /invoke\?\.\(intent, 'setData', null\)/u)
  assert.match(appSource, /lastHandledAndroidIntentCleared/u)
  assert.match(appSource, /repeatedAndroidIntentDelivery/u)
  assert.match(appSource, /explicitLifecycleDelivery/u)
  assert.match(appSource, /return !readCurrentAndroidIntentData\(\)/u)
  assert.match(appSource, /getCurrentPages\(\)\.length === 0/u)
  assert.match(appSource, /reLaunchAppEntryWhenReady\(target\)/u)
  assert.match(appSource, /appEntryReadRetryTimer/u)
  assert.match(appSource, /openCurrentAppEntryArgument\(source, options, retries - 1\)/u)
  assert.match(appSource, /platform !== 'android'[\s\S]*?explicitCandidates/u)
  assert.match(appSource, /source === 'newintent'[\s\S]*?runtimeArgument, nativeIntentData/u)
  assert.match(appSource, /readAppRuntimePlatform\(\) === 'android' && retries > 0/u)
  assert.match(appSource, /readAppRuntimePlatform\(\) !== 'android'[\s\S]*?openCurrentAppEntryArgument\('lifecycle', options, 0\)/u)
  assert.match(appSource, /rawArgument === lastHandledAppEntryArgument[\s\S]*?readAppRuntimePlatform\(\) !== 'android'\) return/u)
  assert.match(appSource, /installAppEntryLinkRouting\(options\)/u)
  assert.match(appSource, /bootstrapHandoff\(parseAppEntryQuery\(queryText\)\)/u)
  assert.match(appSource, /onShow\([\s\S]*?openCurrentAppEntryArgument\('lifecycle', options\)/u)
  assert.doesNotMatch(appSource, /runtime\.addEventListener/u)
  assert.match(appSource, /lastHandledAppEntryArgument/u)
  assert.doesNotMatch(appSource, /App Link 诊断|showAppEntryDiagnostic|recordAppEntryDiagnostic/u)
})
