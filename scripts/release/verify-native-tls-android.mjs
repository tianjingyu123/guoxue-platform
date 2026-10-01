import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installProbe } from './android-probe-install.mjs'
import { captureProbeLogCutoff } from './android-probe-log-cutoff.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const [device, build, evidenceName, serverEvidence] = process.argv.slice(2)
if (!/^[a-zA-Z0-9-]{4,80}$/.test(device || '') || !['android-phase7-tls-api26', 'android-phase7-tls-api34'].includes(evidenceName)) throw Error('设备或新证据名称不在测试边界内')
const sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const adb = (...args) => execFileSync(path.join(sdk, 'platform-tools/adb.exe'), ['-s', device, ...args], { encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 * 1024 })
const pkg = 'cn.rebu.resourceprobe'
const info = JSON.parse(readFileSync(path.join(root, 'artifacts/android-resource-probe-' + Number(build) + '/build.json')))
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex')
if (info.packageName !== pkg || !info.syntheticOnly || info.dcloud !== false || info.sourceDirty || !info.minified || !info.tlsCertificateSha256 || hash(info.apk) !== info.sha256) throw Error('拒绝非干净R8独立TLS探针')
const badging = execFileSync(path.join(sdk, 'build-tools/35.0.0/aapt2.exe'), ['dump', 'badging', info.apk], { encoding: 'utf8' })
if (!badging.includes("package: name='" + pkg + "'")) throw Error('实际APK包名不在独立探针范围内')
const fixture = path.join(root, 'artifacts/android-resource-probe-' + Number(build) + '/assets')
if (hash(path.join(fixture, 'tls-fixture-public.pem')) !== info.tlsCertificateSha256) throw Error('公开TLS证书绑定不符')
const output = path.join(root, 'docs/operations/channel-updates-evidence/' + evidenceName + '.json')
if (existsSync(output)) throw Error('不覆盖既有TLS证据')
const before = adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line))
const api = Number(adb('shell', 'getprop', 'ro.build.version.sdk').trim())
if (api !== (evidenceName.endsWith('26') ? 26 : 34)) throw Error('API与证据名称不符')
const reverses = adb('reverse', '--list')
for (const port of [58843, 58844]) if (reverses.includes('tcp:' + port)) throw Error('测试端口已被映射，先核查所有者')
const installation = await installProbe(sdk, device, info)
let logs = '', result
try {
 for (const port of [58843, 58844]) adb('reverse', 'tcp:' + port, 'tcp:' + port)
 adb('shell', 'am', 'force-stop', pkg)
 const cutoff = captureProbeLogCutoff(adb)
 adb('shell', 'am', 'start', '-n', pkg + '/.ProbeActivity', '-d', 'rebu-probe://tls/' + Date.now(), '--es', 'scenario', 'tls')
 const began = Date.now()
 while (Date.now() - began < 90000) {
  logs = adb('logcat', '-d', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S').split('\n').filter(line => Number(line.trim().split(/\s+/)[0]) >= cutoff - .01).join('\n')
  if (/TLS_FAILED/.test(logs)) throw Error('实际TLS探针失败：' + logs)
  const done = logs.match(/TLS_DONE (\{[^\r\n]+\})/)
  if (done) { result = JSON.parse(done[1]); break }
  await new Promise(resolve => setTimeout(resolve, 500))
 }
 if (!result || result.groups !== 8 || result.trickleBytes < 2 || result.trickleMs >= 6500 || !result.certificateValidation || !result.hostnameValidation || result.businessRequests !== false) throw Error('TLS八组实际结果缺失或不符')
 for (const kind of ['tls-wrongcert', 'tls-wronghost']) if (!logs.includes('TLS_REJECT ' + kind + ' type=javax.net.ssl.SSL')) throw Error('没有实际证书/主机名拒绝证据')
 const server = JSON.parse(readFileSync(serverEvidence))
 for (const route of ['/tls-normal', '/tls-redirect', '/tls-short', '/tls-oversize', '/tls-cancel', '/tls-trickle']) if (!server.requests.some(request => request.route === route)) throw Error('服务端缺少实际请求:' + route)
 if (server.requests.filter(request => request.route === '/tls-normal').length !== 1 || server.requests.some(request => request.route === '/tls-wronghost') || server.wrongCertificateConnections < 1 || server.wrongCertificateHttpRequests !== 0 || server.certificateSha256 !== info.tlsCertificateSha256 || server.fixtureSha256 !== hash(path.join(fixture, 'good.wgt'))) throw Error('证书拒绝、重定向拒绝或TLS证据绑定不符')
 const after = adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line))
 if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('正式包元数据改变')
 writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), sourceSha: info.sourceSha, verificationHarnessSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), apkSha256: info.sha256, certificateSha256: info.tlsCertificateSha256, installation, api, device, deviceType: adb('shell', 'getprop', 'ro.kernel.qemu').trim() === '1' ? 'emulator' : 'physical', abi: adb('shell', 'getprop', 'ro.product.cpu.abi').trim(), result, server, logs, formalMetadataBefore: before, formalMetadataAfter: after, limits: ['独立Application/WebView宿主，非DCloud完整包', '仅回环合成资源请求；测试进程临时信任公开证书，仍保留实际链和主机名验证', '取消耗时来自本设备，不能代表所有Android网络栈', '没有实际支付、直播、录音或上传业务'] }, null, 2) + '\n')
 console.log('Android实际TLS八组通过：' + JSON.stringify(result))
} finally {
 writeFileSync(path.join(root, 'artifacts/' + evidenceName + '-raw.log'), logs)
 adb('shell', 'am', 'force-stop', pkg)
 for (const port of [58843, 58844]) adb('reverse', '--remove', 'tcp:' + port)
}
