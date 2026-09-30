import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, createPublicKey } from 'node:crypto'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const jdk = process.env.REBU_NATIVE_JDK || 'D:/Tools/xiaozhi-build/jdk-17.0.20.1+1'
const sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const input = process.argv[2] || path.join(root, 'apps/mobile/native/resource-updater/config.template.json')
const config = JSON.parse(readFileSync(input, 'utf8'))
const expectedFields = ['enabled', 'identity', 'clientKey', 'signingCertificateSha256', 'apiBase', 'resourceOrigins', 'publicRoots'].sort()
if (Object.keys(config).sort().join(',') !== expectedFields.join(',')) throw new Error('原生配置字段非法；不得附带私钥、令牌或账户信息')
if (Object.keys(config.identity || {}).sort().join(',') !== ['applicationId', 'productId', 'platform', 'channelId', 'packageName', 'runtimeAppId', 'nativeBuild', 'nativeFingerprint'].sort().join(',')) throw new Error('原生身份字段不符合协议')
const api = new URL(config.apiBase)
if (api.protocol !== 'https:' || api.username || api.password || api.hash || api.search) throw new Error('原生 API 入口必须是无凭据和查询参数的 HTTPS 地址')
for (const origin of config.resourceOrigins || []) { const url = new URL(origin); if (url.protocol !== 'https:' || url.origin !== origin) throw new Error('资源白名单只接受 HTTPS origin，不能包含凭据、路径或查询') }
for (const pem of Object.values(config.publicRoots || {})) {
  if (typeof pem !== 'string' || !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PUBLIC KEY-----\r?\n?$/.test(pem) || createPublicKey(pem).asymmetricKeyType !== 'ed25519') throw new Error('原生资产只接受 Ed25519 SPKI 公钥，拒绝私钥及附加内容')
}
if (config.enabled && ['oppo', 'honor', 'samsung', 'google-play', 'app-store'].includes(config.identity?.channelId)) throw new Error('当前含原生桥接的 WGT 方案不能在此商店启用')
if (config.enabled && (!/^[a-f0-9]{64}$/.test(config.identity?.nativeFingerprint || '') || !/^[a-f0-9]{64}$/.test(config.signingCertificateSha256 || '') || !Object.keys(config.publicRoots || {}).length || !config.resourceOrigins?.length || !config.clientKey || !/^https:\/\//.test(config.apiBase))) throw new Error('启用配置必须绑定完整包身份、公钥根与 HTTPS 入口；此检查不等于真机验收')
const output = path.join(root, 'artifacts/native-resource-update')
const classes = path.join(output, 'classes'), bundle = path.join(output, 'bundle')
mkdirSync(classes, { recursive: true }); mkdirSync(path.join(bundle, 'assets'), { recursive: true })
const sources = path.join(root, 'apps/mobile/native/resource-updater/src/cn/rebu/resource')
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'apps', 'packages', 'scripts'], { cwd: root, encoding: 'utf8' }).trim())
if (config.enabled && sourceDirty) throw new Error('启用原生配置必须固定干净候选源码，禁止用开发目录当已验基座')
execFileSync(path.join(jdk, 'bin/javac.exe'), ['--release', '8', '-encoding', 'UTF-8', '-cp', path.join(sdk, 'platforms/android-35/android.jar'), '-d', classes, ...readdirSync(sources).filter(name => name.endsWith('.java')).map(name => path.join(sources, name))], { stdio: 'inherit' })
execFileSync(path.join(jdk, 'bin/jar.exe'), ['cf', path.join(bundle, 'classes.jar'), '-C', classes, '.'])
writeFileSync(path.join(bundle, 'AndroidManifest.xml'), '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="cn.rebu.resource"><uses-sdk android:minSdkVersion="21" /></manifest>')
writeFileSync(path.join(bundle, 'assets/rebu-resource-native.json'), JSON.stringify(config))
const aar = path.join(output, 'rebu-resource-updater.aar')
execFileSync(path.join(jdk, 'bin/jar.exe'), ['cf', aar, '-C', bundle, '.'])
const libs = path.join(root, 'apps/mobile/src/uni_modules/rebu-resource-updater/utssdk/app-android/libs')
mkdirSync(libs, { recursive: true }); copyFileSync(aar, path.join(libs, 'rebu-resource-updater.aar'))
writeFileSync(path.join(output, 'build.json'), JSON.stringify({ sourceSha, sourceDirty, config, aarSha256: createHash('sha256').update(readFileSync(aar)).digest('hex') }, null, 2) + '\n')
console.log('Android SDK35 原生代码编译和 AAR 已生成；未安装/云打包/发布，未宣称 DCloud 启动钩子实测通过')
