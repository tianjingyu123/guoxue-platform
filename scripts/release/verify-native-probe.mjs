import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installProbe } from './android-probe-install.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const device = process.argv[2]
if (!device || !/^[a-zA-Z0-9-]{4,80}$/.test(device)) throw new Error('必须指定已核验设备序列号')
const pkg = 'cn.rebu.resourceprobe', component = pkg + '/.ProbeActivity'
const adb = (...args) => execFileSync(path.join(sdk, 'platform-tools/adb.exe'), ['-s', device, ...args], { encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024 })
const passed = [], evidence = []
const record = name => { passed.push(name); console.log('通过：' + name) }
const baseline = adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line)).map(line => line.trim())
const api = adb('shell', 'getprop', 'ro.build.version.sdk').trim()
if (Number(api) < 26) throw new Error('设备低于实现边界，不安装')
const evidenceName = process.argv[4] || 'android-probe'
if (!['android-probe', 'android-r8-probe'].includes(evidenceName)) throw new Error('证据名称必须在测试交接白名单内')
const build = Number(process.argv[3] || 1)
if (!Number.isInteger(build) || build < 1 || build > 64) throw new Error('无效独立测试构建')
const info = JSON.parse(readFileSync(path.join(root, 'artifacts/android-resource-probe-' + build + '/build.json')))
if (info.packageName !== pkg || !info.syntheticOnly || info.dcloud !== false) throw new Error('拒绝非独立探针包')
const badging = execFileSync(path.join(sdk, 'build-tools/35.0.0/aapt2.exe'), ['dump', 'badging', info.apk], { encoding: 'utf8' })
if (!badging.includes("package: name='" + pkg + "'") || createHash('sha256').update(readFileSync(info.apk)).digest('hex') !== info.sha256) throw new Error('探针包名或摘要不匹配')
const installation = await installProbe(sdk, device, info)
async function launch(scenario, expected, { force = true, extras = [] } = {}) {
 if (force) adb('shell', 'am', 'force-stop', pkg)
 const cutoff = Number(adb('shell', 'date', '+%s.%N').trim())
 // 同进程场景使用唯一 Intent data，避免 am start 只复用旧顶层 Intent 的 OEM 行为。
 adb('shell', 'am', 'start', '-n', component, '-d', 'rebu-probe://' + scenario + '/' + Date.now(), '--es', 'scenario', scenario, ...extras)
 const began = Date.now()
 while (Date.now() - began < 18000) {
  const logs = adb('logcat', '-d', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S').split('\n').filter(line => Number(line.trim().split(/\s+/)[0]) >= cutoff - 0.01)
  const text = logs.join('\n')
  if (expected.test(text)) { evidence.push({ scenario, cutoff, elapsedMs: Date.now() - began, logs }); return text }
  if (/BOOT_REFUSED|SCENARIO_REFUSED/.test(text) && !/REFUSED/.test(expected.source)) throw new Error('独立探针拒绝：' + scenario + '\n' + text)
  await new Promise(resolve => setTimeout(resolve, 300))
 }
 throw new Error('探针未出现预期结果：' + scenario + ' / ' + expected)
}
async function fresh() { await launch('new-suite', /NEW_SUITE/); const text = await launch('show', /JS_READY baseline-ready/); if (!/BEFORE_WEBVIEW phase=HEALTHY,version=0/.test(text)) throw new Error('未恢复基线') }
try {
 await fresh()
 const keys = await launch('keystore', /BUSY_GUARD rejected=true/)
 if (!/NATIVE_REFLECTION entrypointsRetained=true/.test(keys)) throw new Error("原生固定名称桥接入口未通过");
 if (!/NATIVE_BIND .*"ok":true/.test(keys)) throw new Error("既有原生资源绑定未通过");
 if (!/ANDROID_KEYSTORE saved=true,encrypted=true,decrypted=true/.test(keys) || !/HEALTH_WINDOW earlyRejected=true/.test(keys)) throw new Error('Keystore或健康窗口失败')
 record('Android Keystore AES-GCM 写入及解密、原生健康窗口、合成四类忙碌标记保护')
 await launch('portable', /PORTABLE_NEXT_BOOT bc/)
 await launch('prepare-bad', /PREPARED bad/)
 const bad = await launch('show', /JS_ERROR bad-js/)
 if (!/CRYPTO_MODE bc/.test(bad) || !/BEFORE_WEBVIEW phase=PENDING_HEALTH,version=1/.test(bad)) throw new Error('BC或事务未进入')
 const recovered = await launch('show', /JS_READY baseline-ready/)
 if (!/RECOVERED_BEFORE_JS/.test(recovered) || recovered.indexOf('RECOVERED_BEFORE_JS') > recovered.indexOf('JS_READY')) throw new Error('恢复顺序错误')
 record('实际 BC 验签、错误 JS 后下一冷启动在 WebView/JS 前恢复摘要核验的基线')
 for (const kind of ['wrong-base', 'cross-channel', 'expired']) { await fresh(); await launch('prepare-' + kind, new RegExp('SCENARIO_REFUSED prepare-' + kind)); await launch('show', /JS_READY baseline-ready/) }
 record('实际 Android 拒绝错误基座、跨渠道、过期清单，保留基线')
 await fresh(); await launch('prepare-good', /PREPARED good/, { extras: ['--ez', 'denyOffer', 'true'] })
 const offline = await launch('show', /JS_READY baseline-ready/); if (!/version=0/.test(offline)) throw new Error('断网/停发仍激活')
 record('合成冷启动停发/离线准入拒绝保持当前基线')
 await fresh(); await launch('prepare-good', /PREPARED good/); await launch('tamper-archive', /TAMPERED/, { force: false })
 const tamper = await launch('show', /JS_READY baseline-ready/); if (!/version=0/.test(tamper)) throw new Error('篡改后仍激活')
 record('篡改暂存的原始签名归档后冷启动拒绝激活')
 for (const point of ['JOURNAL_SYNCED', 'OLD_MOVED', 'NEW_MOVED', 'PENDING_HEALTH']) {
  await fresh(); await launch('prepare-good', /PREPARED good/, { extras: ['--es', 'killAt', point] }); await launch('show', new RegExp('KILL_AT ' + point))
  const crashCutoff = evidence.at(-1).cutoff
  const restored = await launch('show', /JS_READY baseline-ready/)
  // Android 可能在显式再次启动前自动重建进程；把该原生恢复纳入同一检查点证据。
  const recoveryLogs = adb('logcat', '-d', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S').split('\n').filter(line => Number(line.trim().split(/\s+/)[0]) >= crashCutoff - 0.01)
  evidence.push({ checkpoint: point, recoveryLogs })
  if (!/RECOVERED_BEFORE_JS/.test(recoveryLogs.join('\n')) || !/phase=HEALTHY,version=0/.test(restored)) throw new Error('杀进程后恢复失败：' + point)
 }
 record('四个真实目录事务检查点杀进程，下一启动先恢复旧健康资源再执行 JS')
 await fresh(); await launch('prepare-good', /PREPARED good/); await launch('show', /FIXTURE_HEALTH core-acknowledged/); const healthy = await launch('show', /FIXTURE_HEALTH core-acknowledged/)
 if (!/phase=HEALTHY,version=2/.test(healthy)) throw new Error('健康版本未保持')
 record('正确签名资源激活及后续冷启动保持；核心夹具健康确认不冒充正式 App 健康观察')
 const after = adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line)).map(line => line.trim())
 if (JSON.stringify(after) !== JSON.stringify(baseline)) throw new Error('正式包元数据改变')
 record('正式包版本与更新时间未变；未清数据、未卸载、未清全局日志')
 writeFileSync(path.join(root, 'docs/operations/channel-updates-evidence/' + evidenceName + '.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), sourceSha: info.sourceSha, sourceDirty: info.sourceDirty, minified: Boolean(info.minified), shrinker: info.shrinker || 'D8', consumerRulesSha256: info.consumerRulesSha256, installation, deviceModel: adb('shell', 'getprop', 'ro.product.model').trim(), api, packageName: pkg, apkSha256: info.sha256, passed, evidence, limits: ['独立 Application/WebView，非 DCloud 完整包', 'API 34 强制 BC，不能替代 API 26–32 实机覆盖', 'OfferCheck、忙碌标记及核心健康确认是明确的合成夹具', '没有真实交易、TRTC、录音或上传业务实测'] }, null, 2) + '\n')
} finally { adb('shell', 'am', 'force-stop', pkg) }
