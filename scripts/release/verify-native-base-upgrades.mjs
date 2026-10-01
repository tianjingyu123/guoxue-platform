import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installProbe } from './android-probe-install.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), sdk = process.env.REBU_ANDROID_SDK || 'D:/Tools/xiaozhi-build/android-sdk'
const device = process.argv[2], base = Number(process.argv[3] || 1), pkg = 'cn.rebu.resourceprobe'
if (!device || !/^[a-zA-Z0-9-]{4,80}$/.test(device) || !Number.isInteger(base) || base < 1 || base > 58) throw new Error('指定已核验设备及独立基线构建')
const adb = (...args) => execFileSync(path.join(sdk, 'platform-tools/adb.exe'), ['-s', device, ...args], { encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024 })
const logsSince = cutoff => adb('logcat', '-d', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S').split('\n').filter(line => Number(line.trim().split(/\s+/)[0]) >= cutoff - 0.01)
const formal = () => adb('shell', 'dumpsys', 'package', 'com.rebu.apprebu').split('\n').filter(line => /versionCode=|versionName=|lastUpdateTime=/.test(line)).map(line => line.trim())
const minified = process.argv.includes('--minify')
const before = formal(), evidence = []
async function launch(scenario, expected, extras = []) {
 adb('shell', 'am', 'force-stop', pkg)
 const cutoff = Number(adb('shell', 'date', '+%s.%N').trim())
 adb('shell', 'am', 'start', '-n', pkg + '/.ProbeActivity', '-d', 'rebu-probe://' + scenario + '/' + Date.now(), '--es', 'scenario', scenario, ...extras)
 const began = Date.now()
 while (Date.now() - began < 15000) {
  const logs = logsSince(cutoff), text = logs.join('\n')
  if (expected.test(text)) return { cutoff, logs }
  if (/BOOT_REFUSED|SCENARIO_REFUSED/.test(text)) throw new Error('独立升级探针拒绝：' + text)
  await new Promise(resolve => setTimeout(resolve, 250))
 }
 throw new Error('独立升级探针超时：' + scenario)
}
try {
 for (const [index, checkpoint] of ['BASE_JOURNAL_SYNCED', 'BASE_OLD_MOVED', 'BASE_NEW_MOVED', 'BASE_PREVIOUS_MOVED', 'BASE_COMMITTED'].entries()) {
  const version = base + index + 1
  await launch('base-upgrade', /BASE_UPGRADE_PREPARED/, ['--es', 'killAt', checkpoint])
  execFileSync(process.execPath, [path.join(root, 'scripts/release/build-native-probe.mjs'), '--build=' + version, ...(minified ? ['--minify'] : [])], { cwd: root, stdio: 'inherit', timeout: 120000 })
  const info = JSON.parse(readFileSync(path.join(root, 'artifacts/android-resource-probe-' + version + '/build.json')))
  if (Boolean(info.minified) !== minified) throw new Error('升级 APK 压缩模式不匹配')
  const installation = await installProbe(sdk, device, info)
  const killed = await launch('show', new RegExp('BASE_KILL_AT ' + checkpoint))
  // 数据读取是同步事件，WebView 就绪是异步事件；两者齐备后才核验升级成功。
  const recovered = await launch('keystore-read', /UPGRADE_USER_DATA sessionDecrypted=true,dataPreserved=true[\s\S]*JS_READY baseline-ready/)
  const logs = logsSince(killed.cutoff), text = logs.join('\n')
  if (!/JS_READY baseline-ready/.test(text) || !/BASE_ARCHIVE kept=true,previous=true/.test(text) || !new RegExp('BEFORE_WEBVIEW phase=HEALTHY,version=0,ms=\\d+,nativeBuild=' + version).test(text)) throw new Error('基座恢复/旧资源归档未通过：' + checkpoint)
  evidence.push({ checkpoint, versionCode: version, sourceSha: info.sourceSha, sourceDirty: info.sourceDirty, minified: Boolean(info.minified), apkSha256: info.sha256, installation, logs })
  console.log('实际 Android 完整包升级通过：' + checkpoint + '，旧资源及会话/合成用户数据保留')
  await launch('prepare-good', /PREPARED good/); await launch('show', /FIXTURE_HEALTH core-acknowledged/)
 }
 if (JSON.stringify(formal()) !== JSON.stringify(before)) throw new Error('正式包元数据改变')
 writeFileSync(path.join(root, 'docs/operations/channel-updates-evidence/' + (minified ? 'android-r8-base-upgrade' : 'android-base-upgrade') + '.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), minified, api: adb('shell', 'getprop', 'ro.build.version.sdk').trim(), packageName: pkg, evidence, formalPackageUnchanged: true, limits: ['独立测试签名 APK，同包升级保留数据', '不是 DCloud SDK 资源释放和完整包验收', '五个检查点真实杀进程；小型夹具不证明正式包启动耗时'] }, null, 2) + '\n')
} finally { adb('shell', 'am', 'force-stop', pkg) }
