import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rebu-channel-source-'))
  t.after(() => {
    const resolved = path.resolve(root)
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('rebu-channel-source-')) throw new Error('临时仓库清理边界异常')
    rmSync(resolved, { recursive: true, force: true })
  })
  const write = (file, value) => { const target = path.join(root, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, value) }
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim()
  git('init', '-q')
  write('.gitignore', 'artifacts/\npackages/shared/dist/\n')
  write('package.json', '{"private":true}')
  write('pnpm-lock.yaml', 'lockfileVersion: 9.0\n')
  write('pnpm-workspace.yaml', 'packages: [apps/*, packages/*]\n')
  write('apps/mobile/package.json', '{"private":true}')
  write('apps/mobile/src/manifest.json', '{"versionCode":"254"}')
  write('packages/shared/dist/app-channels.js', 'exports.APP_CHANNELS = [{id:"app-store",platforms:["ios"]}]')
  write('packages/shared/dist/client-presentation.js', 'exports.CLIENT_CAPABILITY_PROFILES = {"presentation-v1":[]}')
  // 替代编译器仅记录是否被调用，实际 Git、构建脚本、锁和身份文件使用真实路径。
  write('scripts/release/compiler-stub.mjs', 'import {writeFileSync} from "node:fs"; writeFileSync("artifacts/compiler-called", "synthetic-only")')
  write('scripts/release/resolve-pnpm-invocation.mjs', 'export function resolvePnpmInvocation(){return {command:process.execPath,prefix:["scripts/release/compiler-stub.mjs"]}}')
  copyFileSync(path.join(project, 'scripts/release/build-channel-resources.mjs'), path.join(root, 'scripts/release/build-channel-resources.mjs'))
  git('add', '.')
  git('-c', 'user.name=isolated-test', '-c', 'user.email=isolated@example.invalid', 'commit', '-qm', '合成构建身份基线')
  const sourceSha = git('rev-parse', 'HEAD')
  const identity = {sourceSha,applicationId:'rebu',productId:'rebu',channelId:'app-store',platform:'ios',clientKey:'test-apple',packageName:'test.rebu.apple',nativeBuild:254,resourceVersion:0}
  write('artifacts/input.json', JSON.stringify(identity))
  const output = path.join(root,'artifacts/app-channels/rebu/ios/app-store',sourceSha)
  return {root,write,git,output,run(mode) { return spawnSync(process.execPath,[path.join(root,'scripts/release/build-channel-resources.mjs'),path.join(root,'artifacts/input.json'),...(mode?[mode]:[])],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000}) }}
}

for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
  test(`根构建依赖 ${file} 未提交时，在调用编译器和生成身份前阻断`, t => {
    const f = fixture(t)
    f.write(file, readFileSync(path.join(f.root,file),'utf8')+'\n')
    if (file === 'pnpm-lock.yaml') f.git('add',file)
    const result = f.run()
    assert.notEqual(result.status,0)
    assert.match(result.stderr,/源代码未干净提交/)
    assert.equal(existsSync(path.join(f.root,'artifacts/compiler-called')),false)
    assert.equal(existsSync(f.output),false)
  })
}

test('未跟踪的应用源码同样阻断渠道构建', t => {
  const f = fixture(t)
  f.write('apps/mobile/src/new-input.ts','export const changed = true')
  const result = f.run()
  assert.notEqual(result.status,0)
  assert.match(result.stderr,/源代码未干净提交/)
  assert.equal(existsSync(path.join(f.root,'artifacts/compiler-called')),false)
})

test('仅有未提交交接文档不阻断编译，产物仍注明非原生验收', t => {
  const f = fixture(t)
  f.write('docs/handoff.md','合成交接文档')
  const result = f.run()
  assert.equal(result.status,0,result.stderr)
  assert.equal(existsSync(path.join(f.root,'artifacts/compiler-called')),true)
  const record = JSON.parse(readFileSync(path.join(f.output,'channel-build-identity.json'),'utf8'))
  assert.equal(record.nativePackageVerified,false)
  assert.equal(record.wgtEnabled,false)
  assert.equal(record.artifactType,'compiled-resources')
})

test('干跑仍只检查构建身份，不启动编译器或生成资源', t => {
  const f = fixture(t)
  f.write('pnpm-lock.yaml','未提交的合成依赖')
  const result = f.run('--dry-run')
  assert.equal(result.status,0,result.stderr)
  assert.equal(JSON.parse(result.stdout).nativePackageVerified,false)
  assert.equal(existsSync(path.join(f.root,'artifacts/compiler-called')),false)
  assert.equal(existsSync(f.output),false)
})
