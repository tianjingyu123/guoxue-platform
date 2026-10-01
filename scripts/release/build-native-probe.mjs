import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { createHash, generateKeyPairSync, sign, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { nativeCryptoDependency } from './native-dependencies.mjs'
import { probeHealthResources } from './probe-health-resources.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const jdk = process.env.REBU_NATIVE_JDK || 'D:/Tools/xiaozhi-build/jdk-17.0.20.1+1', sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const tools = path.join(sdk, 'build-tools/35.0.0'), android = path.join(sdk, 'platforms/android-35/android.jar')
const run = (exe, args, cwd = root) => { try { return execFileSync(exe, args, { cwd, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }) } catch { throw new Error('独立测试包工具执行失败：' + path.basename(exe) + '（参数不输出）') } }
const version = Number(process.argv.find(arg => arg.startsWith('--build='))?.split('=')[1] || (process.argv.includes('--version-2') ? 2 : 1))
if (!Number.isInteger(version) || version < 1 || version > 64) throw new Error('独立 probe 仅接受受限测试构建 1–64')
const minified = process.argv.includes('--minify')
const output = path.join(root, 'artifacts/android-resource-probe-' + version), assets = path.join(output, 'assets'), classes = path.join(output, 'classes'), dex = path.join(output, 'dex')
for (const dir of [output, assets, classes, dex]) mkdirSync(dir, { recursive: true })
// APK 测试签名仅存在仓库外 ACL 受限目录；不是正式签名，也不读取正式材料。
const secret = path.join(process.env.USERPROFILE, '.codex/secrets/rebu-resource-probe')
mkdirSync(secret, { recursive: true })
const account = run('whoami.exe', []).trim()
run('icacls.exe', [secret, '/inheritance:r', '/grant:r', account + ':(OI)(CI)F', 'SYSTEM:(OI)(CI)F'])
const keystore = path.join(secret, 'probe.jks'), passwordFile = path.join(secret, 'password.txt')
if (!existsSync(passwordFile)) writeFileSync(passwordFile, randomBytes(32).toString('hex'), { flag: 'wx' })
if (!existsSync(keystore)) run(path.join(jdk, 'bin/keytool.exe'), ['-genkeypair', '-alias', 'probe', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '3650', '-dname', 'CN=RebuNativeProbe', '-keystore', keystore, '-storepass:file', passwordFile, '-keypass:file', passwordFile])
const info = run(path.join(jdk, 'bin/keytool.exe'), ['-list', '-v', '-keystore', keystore, '-storepass:file', passwordFile])
const certificate = info.match(/SHA256:\s*([A-F0-9:]{95})/i)?.[1]?.replaceAll(':', '').toLowerCase()
if (!certificate) throw new Error('测试签名摘要未解析')
const roots = generateKeyPairSync('ed25519'), resource = generateKeyPairSync('ed25519')
const { canonicalWgtControl } = createRequire(import.meta.url)('../../packages/shared/dist/wgt-control')
const { canonicalManifest } = createRequire(import.meta.url)('../../packages/shared/dist/resource-update')
const publicPem = key => key.export({ type: 'spki', format: 'pem' })
const identity = { productId: 'rebu', applicationId: 'rebu-probe', platform: 'android', channelId: 'official', packageName: 'cn.rebu.resourceprobe', runtimeAppId: '__UNI__REBUPROBE', nativeBuild: version, nativeFingerprint: 'a'.repeat(64) }
const config = { enabled: true, identity, clientKey: 'synthetic-probe', signingCertificateSha256: certificate, apiBase: 'https://resources.example.invalid/api/v1', resourceOrigins: ['https://resources.example.invalid'], publicRoots: { 'probe-root': publicPem(roots.publicKey) } }
writeFileSync(path.join(assets, 'rebu-resource-native.json'), JSON.stringify(config))
const grant = { schemaVersion: 1, kind: 'resource-key', rootKeyId: 'probe-root', applicationId: 'rebu-probe', keyId: 'probe-key', publicKeyPem: publicPem(resource.publicKey), issuedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() }
writeFileSync(path.join(assets, 'grant.json'), JSON.stringify({ payload: grant, signature: sign(null, Buffer.from(canonicalWgtControl(grant)), roots.privateKey).toString('base64') }))
const baseline = path.join(assets, 'apps/__UNI__REBUPROBE/www'); mkdirSync(baseline, { recursive: true })
writeFileSync(path.join(baseline, 'manifest.json'), JSON.stringify({ id: '__UNI__REBUPROBE' }))
writeFileSync(path.join(baseline, 'index.html'), '<html><body><h1>Native resource probe baseline ' + version + '</h1><script>Probe.signal("baseline-ready")</script></body></html>')
const healthResources = probeHealthResources(root)
for (const [index, kind] of ['bad', 'good', 'wrong-base', 'cross-channel', 'expired'].entries()) {
 const directory = path.join(output, 'fixture-' + kind); mkdirSync(directory, { recursive: true })
 writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ id: '__UNI__REBUPROBE' }))
 writeFileSync(path.join(directory, 'index.html'), kind === 'bad' ? '<html><body><h1>Deliberately bad JS</h1><script>throw new Error("probe-bad-js")</script></body></html>' : '<html><body><h1>Verified native resources</h1><script>Probe.signal("good-ready");if(Probe.realHealth()){var script=document.createElement("script");script.src="health.js";document.head.appendChild(script)}else Probe.healthy()</script></body></html>')
 writeFileSync(path.join(directory, 'health.js'), healthResources.script)
 const archive = path.join(assets, kind + '.wgt'); run(path.join(jdk, 'bin/jar.exe'), ['cfM', archive, '-C', directory, '.'])
 const bytes = readFileSync(archive), manifest = { schemaVersion: 1, releaseId: 'probe-' + kind, productId: identity.productId, applicationId: identity.applicationId, platform: 'android', channelId: kind === 'cross-channel' ? 'xiaomi' : identity.channelId, packageName: identity.packageName, runtimeAppId: identity.runtimeAppId, resourceVersion: index + 1, minNativeBuild: version, maxNativeBuild: version, nativeFingerprint: kind === 'wrong-base' ? 'b'.repeat(64) : identity.nativeFingerprint, downloadUrl: 'https://resources.example.invalid/' + kind + '.wgt', byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), keyId: 'probe-key', issuedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + (kind === 'expired' ? -1000 : 86400000)).toISOString(), changeType: 'web-resources' }
 writeFileSync(path.join(assets, kind + '.json'), JSON.stringify({ manifest, signature: sign(null, Buffer.from(canonicalManifest(manifest)), resource.privateKey).toString('base64') }))
}
const tlsCertificate = process.argv.find(arg => arg.startsWith('--tls-certificate='))?.slice('--tls-certificate='.length)
if (tlsCertificate) {
 const certificateBytes = readFileSync(tlsCertificate)
 if (!certificateBytes.toString('utf8').startsWith('-----BEGIN CERTIFICATE-----') || certificateBytes.toString('utf8').includes('PRIVATE KEY')) throw Error('TLS探针只接受公开证书')
 writeFileSync(path.join(assets, 'tls-fixture-public.pem'), certificateBytes)

 for (const [index, route] of ['tls-normal', 'tls-redirect', 'tls-short', 'tls-oversize', 'tls-wrongcert', 'tls-wronghost', 'tls-cancel'].entries()) {
  const manifest = { ...JSON.parse(readFileSync(path.join(assets, 'good.json'), 'utf8')).manifest, releaseId: route, resourceVersion: 10 + index, downloadUrl: 'https://' + (route === 'tls-wronghost' ? 'localhost' : '127.0.0.1') + ':' + (route === 'tls-wrongcert' ? '58844' : '58843') + '/' + route }
  writeFileSync(path.join(assets, route + '.json'), JSON.stringify({ manifest, signature: sign(null, Buffer.from(canonicalManifest(manifest)), resource.privateKey).toString('base64') }))
 }
}
const nativeSources = path.join(root, 'apps/mobile/native/resource-updater/src/cn/rebu/resource'), probeSources = path.join(root, 'tests/release/android-probe')
run(path.join(jdk, 'bin/javac.exe'), ['--release', '8', '-encoding', 'UTF-8', '-cp', android, '-d', classes, ...[nativeSources, probeSources].flatMap(dir => readdirSync(dir).filter(name => name.endsWith('.java')).map(name => path.join(dir, name)))])
const classesJar = path.join(output, 'classes.jar'); run(path.join(jdk, 'bin/jar.exe'), ['cfM', classesJar, '-C', classes, '.'])
const cryptoJar = await nativeCryptoDependency(root)
writeFileSync(path.join(assets, 'bouncycastle-license.txt'), run(path.join(jdk, 'bin/java.exe'), ['-cp', cryptoJar, 'org.bouncycastle.LICENSE']))
let shrinker = ['com.android.tools.r8.D8'];
if (minified) {
 const rules = path.join(output, 'probe-rules.pro');
 writeFileSync(rules, readFileSync(path.join(root, 'apps/mobile/native/resource-updater/consumer-rules.pro'), 'utf8') + '\n-keep class cn.rebu.resourceprobe.ProbeApplication { public <init>(); }\n-keep class cn.rebu.resourceprobe.ProbeActivity { public <init>(); }\n-keepclassmembers class cn.rebu.resourceprobe.ProbeActivity$Signals { @android.webkit.JavascriptInterface <methods>; }\n-keepclassmembers class cn.rebu.resource.ResourceRuntime { private static java.lang.String session(); private static cn.rebu.resource.ResourceStore store; private static java.util.concurrent.ExecutorService worker; }\n-keepattributes RuntimeVisibleAnnotations,InnerClasses,EnclosingMethod\n');
 shrinker = ['com.android.tools.r8.R8', '--release', '--pg-conf', rules, '--pg-map-output', path.join(output, 'mapping.txt')];
}
run(path.join(jdk, 'bin/java.exe'), ['-cp', path.join(tools, 'lib/d8.jar'), ...shrinker, '--min-api', '26', '--lib', android, '--output', dex, classesJar, cryptoJar])
if (minified) {
 const mapping = readFileSync(path.join(output, 'mapping.txt'), 'utf8');
 for (const name of ['cn.rebu.resource.ResourceRuntime', 'cn.rebu.resource.ResourceRuntime$Callback']) {
  if (!mapping.includes(name + ' -> ' + name + ':')) throw new Error('R8 改写了 Native.js 固定桥接类名');
 }
}
const manifestFile = path.join(output, 'AndroidManifest.xml')
writeFileSync(manifestFile, '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="cn.rebu.resourceprobe" android:versionCode="' + version + '" android:versionName="1.' + version + '"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/><uses-permission android:name="android.permission.INTERNET"/><application android:name=".ProbeApplication" android:label="Rebu Native Probe" android:debuggable="' + (!minified) + '" android:allowBackup="false" android:usesCleartextTraffic="false"><activity android:name=".ProbeActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>')
const unsigned = path.join(output, 'unsigned.apk'), aligned = path.join(output, 'aligned.apk'), apk = path.join(output, 'rebu-native-probe-' + version + '.apk')
run(path.join(tools, 'aapt2.exe'), ['link', '-o', unsigned, '--manifest', manifestFile, '-I', android])
// Windows aapt2 的 -A 会产生反斜线 ZIP 名；使用 JDK jar 写入标准 assets 路径。
run(path.join(jdk, 'bin/jar.exe'), ['uf', unsigned, '-C', output, 'assets'])
for (const name of readdirSync(dex).filter(name => name.endsWith('.dex'))) run(path.join(jdk, 'bin/jar.exe'), ['uf', unsigned, '-C', dex, name])
run(path.join(tools, 'zipalign.exe'), ['-f', '-p', '4', unsigned, aligned])
// 私钥口令与库口令一致；不重复消费同一口令文件的第二行。
run(path.join(jdk, 'bin/java.exe'), ['-jar', path.join(tools, 'lib/apksigner.jar'), 'sign', '--ks', keystore, '--ks-key-alias', 'probe', '--ks-pass', 'file:' + passwordFile, '--out', apk, aligned])
run(path.join(jdk, 'bin/java.exe'), ['-jar', path.join(tools, 'lib/apksigner.jar'), 'verify', '--verbose', apk])
writeFileSync(path.join(output, 'build.json'), JSON.stringify({ sourceSha: run('git', ['rev-parse', 'HEAD']).trim(), sourceDirty: Boolean(run('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests']).trim()), syntheticOnly: true, dcloud: false, tlsCertificateSha256: tlsCertificate ? createHash('sha256').update(readFileSync(tlsCertificate)).digest('hex') : null, healthModuleSourceHashes: healthResources.sourceHashes, minified, shrinker: minified ? 'R8 release' : 'D8', mappingSha256: minified ? createHash('sha256').update(readFileSync(path.join(output, 'mapping.txt'))).digest('hex') : null, consumerRulesSha256: createHash('sha256').update(readFileSync(path.join(root, 'apps/mobile/native/resource-updater/consumer-rules.pro'))).digest('hex'), apk, packageName: identity.packageName, versionCode: version, minSdk: 26, targetSdk: 35, signingCertificateSha256: certificate, sha256: createHash('sha256').update(readFileSync(apk)).digest('hex'), limits: ['Application/WebView 独立宿主，非 DCloud APK', '冷启动 OfferCheck 是合成许可回调', '资源签名私钥仅本构建进程内存'] }, null, 2) + '\n')
console.log('独立测试 APK 构建及签名校验通过；未安装、未发布，非 DCloud 完整包')
