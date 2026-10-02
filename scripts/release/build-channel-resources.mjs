import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync, execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { resolvePnpmInvocation } from './resolve-pnpm-invocation.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)
const { APP_CHANNELS } = require('../../packages/shared/dist/app-channels')
const { CLIENT_CAPABILITY_PROFILES } = require('../../packages/shared/dist/client-presentation')
const [input, mode] = process.argv.slice(2)
if (!input) throw new Error('用法：node build-channel-resources.mjs 已核验渠道构建身份.json [--dry-run]')
const data = JSON.parse(readFileSync(input, 'utf8'))
const channel = APP_CHANNELS.find(c => c.id === data.channelId && c.platforms.includes(data.platform))
if (!channel) throw new Error('渠道和平台组合不在目录内')
for (const field of ['applicationId', 'productId', 'channelId']) if (!/^[a-z][a-z0-9-]{1,47}$/.test(data[field])) throw new Error('应用标识非法')
if (!/^[a-z][a-z0-9._-]{1,79}$/.test(data.clientKey) || !/^[a-zA-Z0-9._-]{1,160}$/.test(data.packageName) ||
    !/^\d+$/.test(String(data.nativeBuild)) || !Number.isSafeInteger(data.resourceVersion) || data.resourceVersion < 0) throw new Error('构建身份不完整')
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
if (data.sourceSha !== sourceSha) throw new Error('构建身份必须绑定当前完整源码 SHA')
const manifest = JSON.parse(readFileSync(path.join(root, 'apps/mobile/src/manifest.json'), 'utf8'))
if (String(data.nativeBuild) !== manifest.versionCode) throw new Error('原生构建号与同源码 manifest 不一致；请建立新的完整包候选')
const output = path.join(root, 'artifacts/app-channels', data.applicationId, data.platform, data.channelId, sourceSha)
const buildEnvironment = {
  VITE_APP_CLIENT_KEY: data.clientKey, VITE_APP_APPLICATION_ID: data.applicationId,
  VITE_APP_CHANNEL_ID: data.channelId, VITE_APP_RESOURCE_VERSION: String(data.resourceVersion),
  UNI_OUTPUT_DIR: output,
}
const record = { sourceSha, ...Object.fromEntries(['productId','applicationId','platform','channelId','clientKey','packageName','nativeBuild','resourceVersion'].map(key => [key, data[key]])),
  output, artifactType: 'compiled-resources', wgtEnabled: false, nativePackageVerified: false }
if (mode === '--dry-run') { console.log(JSON.stringify(record, null, 2)); process.exit(0) }
// 根依赖和工作区配置也会影响渠道构建，不能只检查子目录。
if (execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'apps', 'packages', 'scripts', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('源代码未干净提交，禁止渠道构建')
if (data.platform === 'android') {
  const native = JSON.parse(readFileSync(path.join(root, 'artifacts/native-resource-update/build.json'), 'utf8'))
  const aar = readFileSync(path.join(root, 'apps/mobile/src/uni_modules/rebu-resource-updater/utssdk/app-android/libs/rebu-resource-updater.aar'))
  if (native.sourceDirty || native.sourceSha !== sourceSha || native.aarSha256 !== createHash('sha256').update(aar).digest('hex')) throw new Error('原生 AAR 与干净候选源码不匹配，请先在同提交重建原生扩展')
  if (native.config.enabled) {
    for (const field of ['applicationId', 'productId', 'channelId', 'packageName', 'nativeBuild']) if (String(native.config.identity[field]) !== String(data[field])) throw new Error('已启用的原生身份与渠道构建不匹配')
    if (native.config.clientKey !== data.clientKey || native.config.identity.nativeFingerprint !== data.nativeFingerprint) throw new Error('原生选择器/基座指纹与渠道构建不匹配')
  }
}
mkdirSync(output, { recursive: true })
const lockPath = path.join(root, 'artifacts/app-channels/.build.lock')
const lock = openSync(lockPath, 'wx')
try {
  const pnpm = resolvePnpmInvocation()
  if (!pnpm) throw new Error('找不到 pnpm')
  const result = spawnSync(pnpm.command, [...pnpm.prefix, '--filter', '@guoxue/mobile', 'exec', 'uni', 'build', '-p', data.platform === 'harmony' ? 'app-harmony' : 'app'],
    { cwd: root, env: { ...process.env, ...buildEnvironment }, stdio: 'inherit', shell: false })
  if (result.status !== 0) throw new Error('渠道资源编译失败')
  writeFileSync(path.join(output, 'channel-build-identity.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
  writeFileSync(path.join(output, 'client-capability-manifest.json'), JSON.stringify({ schemaVersion: 1, sourceSha, profileId: 'presentation-v1', ...record, resourceVersion: data.resourceVersion, capabilities: CLIENT_CAPABILITY_PROFILES['presentation-v1'], nativeCapabilities: { wgtRecovery: { implementedInSource: data.platform === 'android', requiresMatchingCompletePackage: true, enabled: false, androidMinApi: 26 } } }, null, 2) + '\n', { flag: 'wx' })
  console.log('渠道资源已编译；尚未签名完整原生包、上传或发布')
} finally { closeSync(lock); unlinkSync(lockPath) }
