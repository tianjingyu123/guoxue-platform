import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspectWgtArchive } from '../../scripts/release/check-wgt-archive.mjs'
import { inspectNativeBoundary } from '../../scripts/release/check-resource-native-boundary.mjs'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
function zip(names) {
  const locals = [], centrals = []
  let offset = 0
  for (const filename of names) {
    const name = Buffer.from(filename), data = Buffer.from('{}')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(name.length, 26)
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42)
    const entry = Buffer.concat([local, name, data])
    locals.push(entry); centrals.push(Buffer.concat([central, name])); offset += entry.length
  }
  const directory = Buffer.concat(centrals), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10)
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}
test('受限页面资源 ZIP 可通过；截断、原生文件、路径穿越拒绝', () => {
  assert.equal(inspectWgtArchive(zip(['manifest.json', 'app-service.js', 'assets/home.png'])).files, 3)
  for (const names of [['manifest.json', 'lib/sdk.so'], ['manifest.json', 'AndroidManifest.xml'],
    ['manifest.json', 'nativeplugins/plugin.js'], ['manifest.json', '../escape.js'],
    ['manifest.json', 'C:/outside.js'], ['manifest.json', 'app.dex'], ['manifest.json', 'manifest.json']]) {
    assert.throws(() => inspectWgtArchive(zip(names)))
  }
  assert.throws(() => inspectWgtArchive(zip(['manifest.json']).subarray(0, 20)))
  assert.throws(() => inspectWgtArchive(zip(['app-service.js'])))
  const overflow = zip(['manifest.json'])
  const central = overflow.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
  overflow.writeUInt32LE(0xffffffff, central + 20)
  assert.throws(() => inspectWgtArchive(overflow))
  const overlap = zip(['manifest.json', 'app-service.js'])
  const first = overlap.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
  const second = overlap.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), first + 4)
  overlap.writeUInt32LE(0, second + 42)
  assert.throws(() => inspectWgtArchive(overlap))
})

test('真实 Git 基线允许资源变更，拒绝 SDK、原生插件和渠道身份变更', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'rebu-native-gate-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const write = (name, value) => { mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); writeFileSync(path.join(root, name), value) }
  const commit = () => { git('add', '.'); git('-c', 'user.name=isolated-test', '-c', 'user.email=isolated@example.invalid', 'commit', '-qm', '合成基线'); return git('rev-parse', 'HEAD') }
  try {
    git('init', '-q')
    for (const name of ['apps/mobile/src/manifest.json', 'apps/mobile/package.json', 'pnpm-lock.yaml', 'apps/mobile/src/lib/app-distribution.ts', 'apps/mobile/nativeplugins/sdk/plugin.json', 'apps/mobile/native/resource-updater/dependencies.json', 'scripts/release/build-resource-native.mjs', 'scripts/release/native-dependencies.mjs']) write(name, '{}')
    const base = commit(), original = inspectNativeBoundary(base, base, root)
    write('apps/mobile/src/pages/home.vue', '<template>资源修改</template>')
    const resource = commit()
    assert.equal(inspectNativeBoundary(base, resource, root).compatible, true)
    for (const name of ['pnpm-lock.yaml', 'apps/mobile/nativeplugins/sdk/plugin.json', 'apps/mobile/src/lib/app-distribution.ts', 'apps/mobile/native/resource-updater/dependencies.json', 'scripts/release/build-resource-native.mjs', 'scripts/release/native-dependencies.mjs']) {
      git('reset', '--hard', resource)
      write(name, '{"changed":true}')
      const changed = inspectNativeBoundary(base, commit(), root)
      assert.equal(changed.compatible, false)
      assert.notEqual(changed.nativeFingerprint, original.nativeFingerprint)
    }
  } finally {
    const resolved = path.resolve(root)
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith('rebu-native-gate-')) throw new Error('临时测试目录边界异常')
    rmSync(resolved, { recursive: true, force: true })
  }
})
