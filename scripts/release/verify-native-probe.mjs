import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installProbe } from './android-probe-install.mjs'
import { readProbeDeviceIdentity } from './android-probe-device-identity.mjs'
import { captureProbeLogCutoff, readProbeLogs } from './android-probe-log-cutoff.mjs'
import { createProbeLogStream } from './android-probe-log-stream.mjs'
import { assertCheckpointRecovery, includeScenarioBootContext } from './android-probe-recovery-evidence.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const device = process.argv[2]
if (!device || !/^[a-zA-Z0-9-]{4,80}$/.test(device)) throw new Error('必须指定已核验设备序列号')
const pkg = 'cn.rebu.resourceprobe', component = pkg + '/.ProbeActivity'
let adbTimeoutMs = 45000
const adb = (...args) => execFileSync(path.join(sdk, 'platform-tools/adb.exe'), ['-s', device, ...args], { encoding: 'utf8', timeout: adbTimeoutMs, maxBuffer: 4 * 1024 * 1024 })
const passed = [], evidence = []
const record = name => { passed.push(name); console.log('通过：' + name) }
const baseline = adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line)).map(line => line.trim())
const identity = readProbeDeviceIdentity(sdk, device)
const { api, deviceType, abi } = identity
// 软件模拟器放宽观察等待，业务期限、拒绝条件和恢复顺序断言保持原值。
adbTimeoutMs = deviceType === 'emulator' ? 120000 : 45000
const observationTimeoutMs = deviceType === 'emulator' ? 180000 : 18000
if (Number(api) < 26) throw new Error('设备低于实现边界，不安装')
const evidenceName = process.argv[4] || 'android-probe'
if (!['android-probe', 'android-r8-probe', 'android-phase6-probe', 'android-api26-probe', 'android-phase8-api26-core', 'android-phase8-api34-core', 'android-phase9-api34-core', 'android-phase17-api26-core', 'android-phase17-api26-core-fixed', 'android-phase17-api26-core-final'].includes(evidenceName)) throw new Error('证据名称必须在测试交接白名单内')
if (['android-api26-probe', 'android-phase8-api26-core', 'android-phase17-api26-core', 'android-phase17-api26-core-fixed', 'android-phase17-api26-core-final'].includes(evidenceName) && (api !== '26' || deviceType !== 'emulator')) throw new Error('API26证据只接受已核验的API26模拟器')
if (['android-phase8-api34-core', 'android-phase9-api34-core'].includes(evidenceName) && (api !== '34' || deviceType !== 'physical')) throw Error('API34真机证据身份不符')
if (/^android-phase(?:8|9|17)-/.test(evidenceName) && existsSync(path.join(root, 'docs/operations/channel-updates-evidence/' + evidenceName + '.json'))) throw Error('阶段核心证据已存在，不覆盖')
const build = Number(process.argv[3] || 1)
if (!Number.isInteger(build) || build < 1 || build > 64) throw new Error('无效独立测试构建')
const info = JSON.parse(readFileSync(path.join(root, 'artifacts/android-resource-probe-' + build + '/build.json')))
if (info.packageName !== pkg || !info.syntheticOnly || info.dcloud !== false) throw new Error('拒绝非独立探针包')
const badging = execFileSync(path.join(sdk, 'build-tools/35.0.0/aapt2.exe'), ['dump', 'badging', info.apk], { encoding: 'utf8' })
if (!badging.includes("package: name='" + pkg + "'") || createHash('sha256').update(readFileSync(info.apk)).digest('hex') !== info.sha256) throw new Error('探针包名或摘要不匹配')
const installation = await installProbe(sdk, device, info, identity)
const useStream = process.argv.includes('--stream-logs')
if (useStream && !((api === '26' && deviceType === 'emulator') || (api === '34' && deviceType === 'physical'))) throw Error('连续观察只接受已核验API26模拟器或API34真机')
const streamDirectory = evidenceName.startsWith('android-phase17-') ? 'artifacts/phase17-probe-log-stream' + (evidenceName.endsWith('-final') ? '-final' : evidenceName.endsWith('-fixed') ? '-fixed' : '') : evidenceName.startsWith('android-phase9-') ? 'artifacts/phase9-probe-log-stream' : 'artifacts/phase8-probe-log-stream'
const logStream = useStream ? createProbeLogStream(path.join(sdk, 'platform-tools/adb.exe'), device, path.join(root, streamDirectory)) : null
const collectLogs = cutoff => logStream ? logStream.linesAfter(cutoff) : readProbeLogs(adb).split('\n').filter(line => Number(line.trim().split(/\s+/)[0]) >= cutoff - 0.01)
async function launch(scenario, expected, { force = true, extras = [] } = {}) {
 const launchCursor = logStream?.cursor()
 if (force) adb('shell', 'am', 'force-stop', pkg)
 const cutoff = logStream ? await logStream.capture(adb) : captureProbeLogCutoff(adb)
 // 同进程场景使用唯一 Intent data，避免 am start 只复用旧顶层 Intent 的 OEM 行为。
 adb('shell', 'am', 'start', '-n', component, '-d', 'rebu-probe://' + scenario + '/' + Date.now(), '--es', 'scenario', scenario, ...extras)
 const began = Date.now()
 while (Date.now() - began < observationTimeoutMs) {
  const logs = collectLogs(cutoff)
  const text = logs.join('\n')
  if (expected.test(text)) {
   const observed = logStream ? includeScenarioBootContext(logs, logStream.linesAfterCursor(launchCursor), expected) : logs
   evidence.push({ scenario, cutoff, elapsedMs: Date.now() - began, logs: observed, startupContextFromCurrentLaunch: observed.length > logs.length }); console.log('场景完成：' + scenario); return observed.join('\n')
  }
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
  // 不强停系统已自动重建的恢复进程，避免在日志落盘后、恢复事件上报前打断它。
  await launch('show', /JS_READY baseline-ready/, { force: false })
  // Android 可能在显式再次启动前自动重建进程；把该原生恢复纳入同一检查点证据。
  const recoveryLogs = collectLogs(crashCutoff)
  const recovery = assertCheckpointRecovery(recoveryLogs, point)
  evidence.push({ checkpoint: point, ...recovery, recoveryLogs })
 }
 record('四个真实目录事务检查点杀进程，下一启动先恢复旧健康资源再执行 JS')
 await fresh(); await launch('prepare-good', /PREPARED good/); await launch('show', /FIXTURE_HEALTH core-acknowledged/); const healthy = await launch('show', /FIXTURE_HEALTH core-acknowledged/)
 if (!/phase=HEALTHY,version=2/.test(healthy)) throw new Error('健康版本未保持')
 record('正确签名资源激活及后续冷启动保持；核心夹具健康确认不冒充正式 App 健康观察')
 const after = adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line)).map(line => line.trim())
 if (JSON.stringify(after) !== JSON.stringify(baseline)) throw new Error('正式包元数据改变')
 record(baseline.length ? '正式包版本与更新时间未变；未清数据、未卸载、未清全局日志' : '模拟器未安装正式包；未清数据、未卸载、未清全局日志；真机正式包另有证据')
 const logScope = logStream ? await logStream.close() : { buffer: 'main', tailLines: 1000, tag: 'REBU_RESOURCE_PROBE' }
 writeFileSync(path.join(root, 'docs/operations/channel-updates-evidence/' + evidenceName + '.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), sourceSha: info.sourceSha, verificationHarnessSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: info.sourceDirty, minified: Boolean(info.minified), shrinker: info.shrinker || 'D8', consumerRulesSha256: info.consumerRulesSha256, installation, deviceType, abi, observationTimeoutMs, adbTimeoutMs, logScope, deviceModel: adb('shell', 'getprop', 'ro.product.model').trim(), api, packageName: pkg, apkSha256: info.sha256, passed, evidence, limits: ['独立 Application/WebView，非 DCloud 完整包', '当前API' + api + ' / ' + deviceType + ' / ' + abi + '，不能替代其他API、ABI或物理设备覆盖', 'OfferCheck、忙碌标记及核心健康确认是明确的合成夹具', '没有真实交易、TRTC、录音或上传业务实测'] }, null, 2) + '\n')
} catch (error) {
 // 新阶段失败也保留已执行的场景和连续日志，不覆盖旧阶段证据。
 if (evidenceName.startsWith('android-phase17-api26-core')) {
  const logScope = logStream ? await logStream.close() : { buffer: 'main', tailLines: 1000, tag: 'REBU_RESOURCE_PROBE' }
  writeFileSync(path.join(root, 'docs/operations/channel-updates-evidence/' + evidenceName + '.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), verificationHarnessSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), apkSourceSha: info.sourceSha, apkSha256: info.sha256, passedAll: false, completeCore: false, failure: error.message, installation, identity, passed, evidence, logScope, observationTimeoutMs, limits: ['独立Application/WebView，不是DCloud完整包', '失败和部分通过不能替代完整八组验收'] }, null, 2) + '\n', { flag: 'wx' })
 }
 throw error
} finally { try { adb('shell', 'am', 'force-stop', pkg) } finally { if (logStream) await logStream.close() } }
