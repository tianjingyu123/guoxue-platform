const { test } = require('node:test')
const assert = require('node:assert/strict')
const { generateKeyPairSync, createHash, sign, verify } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const serverRequire = createRequire(path.resolve(__dirname, '../../apps/server/package.json'))
const ts = serverRequire('typescript')
const shared = require('../../packages/shared/dist/resource-update')
const source = readFileSync(path.resolve(__dirname, '../../apps/mobile/src/lib/resource-updater.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const exportsValue = {}
vm.runInNewContext(compiled, { exports: exportsValue, require: () => shared, URL, Date, console })
const { ResourceUpdater } = exportsValue
function fixture() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const bytes = Buffer.from('synthetic WGT package bytes')
  const manifest = {
    schemaVersion: 1, releaseId: 'fixture-v2', productId: 'rebu', applicationId: 'rebu', platform: 'android', channelId: 'xiaomi',
    packageName: 'test.rebu', runtimeAppId: '__TEST_APP', resourceVersion: 2, minNativeBuild: 253, maxNativeBuild: 300,
    nativeFingerprint: 'a'.repeat(64), downloadUrl: 'https://download.example.test/package.wgt',
    byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), keyId: 'test-key',
    issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), changeType: 'web-resources',
  }
  const release = { manifest, signature: sign(null, Buffer.from(shared.canonicalManifest(manifest)), privateKey).toString('base64') }
  let journal = null, currentVersion = 1, activations = 0
  let downloaded = bytes
  let activities = []
  let offered = true
  let recovery = true
  const bridge = {
    identity: async () => ({ ...manifest, nativeBuild: 253, resourceVersion: currentVersion }),
    recoveryContract: async () => ({ beforeJavascript: recovery, atomicSwitch: recovery, verifiedBuild: manifest.nativeFingerprint }),
    verifySignature: async (canonical, signature, keyId) => keyId === 'test-key' && verify(null, Buffer.from(canonical), publicKey, Buffer.from(signature, 'base64')),
    downloadToTemporary: async () => 'synthetic-temp.wgt',
    verifyFile: async (_p, hash, length) => downloaded.length === length && createHash('sha256').update(downloaded).digest('hex') === hash,
    stageAtomically: async () => 'synthetic-staged.wgt',
    discardTemporary: async () => {},
    readJournal: async () => journal,
    writeJournal: async value => { journal = value },
    activateAtomically: async value => {
      if (activities.length) throw new Error('关键业务仍在进行')
      journal = value; currentVersion = value.release.manifest.resourceVersion; activations++
    },
    confirmHealthy: async () => { journal.state = 'HEALTHY' },
    criticalActivities: async () => activities,
  }
  return {
    updater: new ResourceUpdater(bridge, async () => offered), bridge, release,
    corrupt: kind => { downloaded = kind === 'truncate' ? bytes.subarray(0, 3) : Buffer.alloc(bytes.length) },
    stop: () => { offered = false }, noRecovery: () => { recovery = false },
    activities: value => { activities = value },
    get journal() { return journal }, get activations() { return activations }, get version() { return currentVersion },
    // 模拟原生进程重建先执行恢复，明确不是正式基座实测。
    simulateNativeColdStart: () => { if (journal?.state === 'PENDING_HEALTH') { currentVersion = 1; journal = null } },
  }
}
test('可信包暂存、仅冷启动激活、健康确认', async () => {
  const f = fixture()
  await f.updater.downloadAndStage(f.release)
  assert.equal(f.journal.state, 'STAGED')
  assert.equal(await f.updater.activateAtColdLaunch('foreground'), false)
  assert.equal(await f.updater.activateAtColdLaunch('cold-launch'), true)
  assert.equal(f.journal.state, 'PENDING_HEALTH')
  await f.updater.confirmHealthy('wrong-id')
  assert.equal(f.journal.state, 'PENDING_HEALTH')
  await f.updater.confirmHealthy(f.release.manifest.releaseId)
  assert.equal(f.journal.state, 'HEALTHY')
})
for (const kind of ['tamper', 'truncate']) test('拒绝包体' + kind, async () => {
  const f = fixture(); f.corrupt(kind)
  await assert.rejects(f.updater.downloadAndStage(f.release), /篡改或下载不完整/)
  assert.equal(f.journal, null); assert.equal(f.version, 1)
})
test('错误签名、跨渠道、旧原生构建、原生指纹、未来/过期清单均拒绝', async () => {
  for (const patch of [{ channelId: 'huawei' }, { minNativeBuild: 254 }, { nativeFingerprint: 'b'.repeat(64) },
    { expiresAt: new Date(Date.now() - 1).toISOString() }, { issuedAt: new Date(Date.now() + 120000).toISOString() }]) {
    const f = fixture()
    await assert.rejects(f.updater.downloadAndStage({ ...f.release, manifest: { ...f.release.manifest, ...patch } }))
    assert.equal(f.journal, null)
  }
  const f = fixture()
  await assert.rejects(f.updater.downloadAndStage({ ...f.release, signature: 'A'.repeat(86) + '==' }), /签名/)
})
test('缺少 JS 启动前恢复契约禁止下载', async () => {
  const f = fixture(); f.noRecovery()
  await assert.rejects(f.updater.downloadAndStage(f.release), /启动前恢复/)
  assert.equal(f.journal, null)
})
test('下载中断不改旧版；暂存后进程重建可以继续校验', async () => {
  const f = fixture()
  f.bridge.downloadToTemporary = async () => { throw new Error('下载中断') }
  await assert.rejects(f.updater.downloadAndStage(f.release), /下载中断/)
  assert.equal(f.version, 1); assert.equal(f.journal, null)
  f.bridge.downloadToTemporary = async () => 'synthetic-temp.wgt'
  await f.updater.downloadAndStage(f.release)
  const restarted = new ResourceUpdater(f.bridge, async () => true)
  assert.equal(await restarted.activateAtColdLaunch('cold-launch'), true)
})
test('模拟：新 JS 从未启动，原生冷启动恢复；不能用此结果冒充正式包实测', async () => {
  const f = fixture()
  await f.updater.downloadAndStage(f.release)
  await f.updater.activateAtColdLaunch('cold-launch')
  f.simulateNativeColdStart()
  assert.equal(f.version, 1); assert.equal(f.journal, null)
})
test('暂存后停发拒绝激活', async () => {
  const f = fixture()
  await f.updater.downloadAndStage(f.release)
  f.stop()
  await assert.rejects(f.updater.activateAtColdLaunch('cold-launch'), /停发/)
  assert.equal(f.activations, 0)
})
for (const activity of ['payment', 'live', 'recording', 'upload']) test('不打断关键业务 ' + activity, async () => {
  const f = fixture()
  await f.updater.downloadAndStage(f.release)
  f.activities([activity])
  assert.equal(await f.updater.activateAtColdLaunch('cold-launch'), false)
  assert.equal(f.activations, 0)
})
