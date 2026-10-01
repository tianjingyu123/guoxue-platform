import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installProbe } from './android-probe-install.mjs'
import { captureProbeLogCutoff } from './android-probe-log-cutoff.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const [device, buildText] = process.argv.slice(2), build = Number(buildText)
if (!/^emulator-\d{4}$/.test(device || '') || !Number.isInteger(build) || build < 1 || build > 64) throw Error('仅接受已核验API26独立模拟器与探针')
const sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const adb = (...args) => execFileSync(path.join(sdk, 'platform-tools/adb.exe'), ['-s', device, ...args], { encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 * 1024 })
if (adb('shell', 'getprop', 'ro.build.version.sdk').trim() !== '26' || adb('shell', 'getprop', 'ro.kernel.qemu').trim() !== '1' || adb('shell', 'getprop', 'sys.boot_completed').trim() !== '1') throw Error('模拟器/API/开机身份不符')
const info = JSON.parse(readFileSync(path.join(root, 'artifacts/android-resource-probe-' + build + '/build.json'))), pkg = 'cn.rebu.resourceprobe'
if (info.packageName !== pkg || info.dcloud !== false || !info.syntheticOnly || !info.minified || info.sourceDirty || createHash('sha256').update(readFileSync(info.apk)).digest('hex') !== info.sha256) throw Error('独立APK证据不符')
if (!execFileSync(path.join(sdk, 'build-tools/35.0.0/aapt2.exe'), ['dump', 'badging', info.apk], { encoding: 'utf8' }).includes("package: name='" + pkg + "'")) throw Error('实际APK包名不符')
const output = path.join(root, 'docs/operations/channel-updates-evidence/android-phase7-api26-controls.json')
if (existsSync(output)) throw Error('不覆盖既有API26控制证据')
const installation = await installProbe(sdk, device, info), evidence = []
async function launch(scenario, expected) {
 adb('shell', 'am', 'force-stop', pkg); const cutoff = captureProbeLogCutoff(adb)
 adb('shell', 'am', 'start', '-n', pkg + '/.ProbeActivity', '-d', 'rebu-probe://controls/' + Date.now(), '--es', 'scenario', scenario)
 const began = Date.now(); let logs = ''
 while (Date.now() - began < 25000) {
  logs = adb('logcat', '-d', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S').split('\n').filter(line => Number(line.trim().split(/\s+/)[0]) >= cutoff - .01).join('\n')
  if (/BOOT_REFUSED|TRANSFER_FAILED/.test(logs)) throw Error(logs)
  if (expected.test(logs)) { evidence.push({ scenario, cutoff, logs }); return logs }
  await new Promise(resolve => setTimeout(resolve, 400))
 }
 evidence.push({ scenario, cutoff, logs }); throw Error('原生控制场景未完成:' + scenario)
}
try {
 const transfer = await launch('transfer', /TRANSFER_DONE groups=3/)
 for (const action of ['cancel', 'session', 'unhealthy', 'busy']) if (!transfer.includes('TRANSFER_QUEUE_CANCEL ' + action + ' rejectedOld=true,control=true')) throw Error('旧队列未拒绝:' + action)
 if (!transfer.includes('TRANSFER_ABORT oldRejected=true,disconnect=true') || !transfer.includes('TRANSFER_DEADLINE expired=true')) throw Error('独立取消或时限不符')
 const keys = await launch('keystore', /BUSY_GUARD rejected=true/)
 for (const expected of [/NATIVE_REFLECTION entrypointsRetained=true/, /NATIVE_BIND .*"ok":true/, /ANDROID_KEYSTORE saved=true,encrypted=true,decrypted=true/, /HEALTH_WINDOW earlyRejected=true/]) if (!expected.test(keys)) throw Error('真实原生Keystore/绑定/健康保护未完成')
 const webview = adb('shell', 'dumpsys', 'webviewupdate')
 writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), sourceSha: info.sourceSha, verificationHarnessSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), packageName: pkg, apkSha256: info.sha256, api: 26, device, deviceType: 'emulator', abi: adb('shell', 'getprop', 'ro.product.cpu.abi').trim(), minified: true, installation, passedGroups: 4, controlActions: 4, evidence, webview, limits: ['资源串行队列及Keystore实际Android执行，非DCloud完整包', '连接阻塞为控制器替身；真实HTTPS另见同APK的android-phase7-tls-api26.json', 'keystore场景的后续WebView初始化失败不作为JS通过；只验收到原生回调和保护断言', '此模拟器没有正式应用，不把缺席的包元数据当成真机正式包验证', '未使用实际账号、支付、直播、录音或上传业务'] }, null, 2) + '\n')
 console.log('API26原生控制与Keystore四组通过；WebView/JS另行验收')
} finally {
 writeFileSync(path.join(root, 'artifacts/phase7-api26-controls-raw.log'), JSON.stringify(evidence, null, 2) + '\n')
 adb('shell', 'am', 'force-stop', pkg)
}
