import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readProbeDeviceIdentity } from './android-probe-device-identity.mjs'
import { installProbe } from './android-probe-install.mjs'
import { createProbeLogStream } from './android-probe-log-stream.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const device = process.argv[2], build = Number(process.argv[3])
if (!/^[a-zA-Z0-9-]{4,80}$/.test(device || '') || !Number.isInteger(build) || build < 1 || build > 64) throw Error('必须指定设备及独立探针构建号')
const output = path.join(root, 'docs/operations/channel-updates-evidence/android-phase9-api26-baseline.json')
if (existsSync(output)) throw Error('第九阶段基线证据已存在，不覆盖或盲目重发')
const executable = path.join(sdk, 'platform-tools/adb.exe')
const adb = (...args) => execFileSync(executable, ['-s', device, ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 })
const result = { verifiedAt: new Date().toISOString(), verificationHarnessSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), passed: false, completeCore: false, observationTimeoutMs: 180000, limits: ['仅API26独立Application/WebView基线，不是完整核心八组或DCloud包', '不扩大产品业务、健康或JS观察期限，不覆盖其他API或真实业务'] }
let observer, started = false
try {
 const identity = readProbeDeviceIdentity(sdk, device, { timeoutMs: 120000 })
 result.identity = identity
 if (identity.api !== '26' || identity.deviceType !== 'emulator' || adb('shell', 'getprop', 'sys.boot_completed').trim() !== '1') throw Error('最小基线只接受已启动的API26模拟器')
 const info = JSON.parse(readFileSync(path.join(root, 'artifacts/android-resource-probe-' + build + '/build.json'), 'utf8'))
 if (info.packageName !== 'cn.rebu.resourceprobe' || !info.syntheticOnly || info.dcloud !== false || createHash('sha256').update(readFileSync(info.apk)).digest('hex') !== info.sha256) throw Error('独立探针绑定不符')
 const badging = execFileSync(path.join(sdk, 'build-tools/35.0.0/aapt2.exe'), ['dump', 'badging', info.apk], { encoding: 'utf8' })
 if (!badging.includes("package: name='cn.rebu.resourceprobe'")) throw Error('APK实际包名不符')
 Object.assign(result, { apkSha256: info.sha256, apkSourceSha: info.sourceSha, minified: info.minified, syntheticOnly: true, dcloud: false })
 result.installation = await installProbe(sdk, device, info, identity)
 console.log('独立探针安装摘要核验完成：' + JSON.stringify(result.installation))
 observer = createProbeLogStream(executable, device, path.join(root, 'artifacts/phase9-probe-log-stream'))
 adb('shell', 'am', 'force-stop', info.packageName)
 const cutoff = await observer.capture(adb)
 result.cutoff = cutoff
 started = true
 adb('shell', 'am', 'start', '-n', info.packageName + '/.ProbeActivity', '-d', 'rebu-probe://show/phase9-baseline-' + Date.now(), '--es', 'scenario', 'show')
 const began = Date.now()
 while (Date.now() - began < result.observationTimeoutMs) {
  const logs = observer.linesAfter(cutoff), text = logs.join('\n')
  if (text.includes('JS_READY baseline-ready')) {
   const js = logs.findIndex(line => line.includes('JS_READY baseline-ready')), jsPid = logs[js].trim().split(/\s+/)[1]
   const boot = logs.findIndex(line => /BEFORE_WEBVIEW phase=HEALTHY,version=0,/.test(line) && line.trim().split(/\s+/)[1] === jsPid)
   if (boot < 0 || js <= boot) throw Error('基线未在JS前报告健康版本0')
   Object.assign(result, { passed: true, elapsedMs: Date.now() - began, jsPid, logs })
   break
  }
  if (/BOOT_REFUSED|SCENARIO_REFUSED|JS_ERROR/.test(text)) throw Error('基线被探针拒绝或JS失败')
  await new Promise(resolve => setTimeout(resolve, 300))
 }
 if (!result.passed) { result.logs = observer.linesAfter(cutoff); throw Error('API26基线180秒内未出现JS就绪') }
} catch (error) { result.failure = error.message }
finally {
 if (started) try { adb('shell', 'am', 'force-stop', 'cn.rebu.resourceprobe'); result.probeStopped = true } catch (error) { result.cleanupFailure = error.message; result.passed = false }
 if (observer) try { result.observation = await observer.close() } catch (error) { result.observerFailure = error.message; result.passed = false }
 writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
}
console.log(JSON.stringify({ passed: result.passed, completeCore: false, failure: result.failure, identity: result.identity }))
if (!result.passed) process.exitCode = 1
