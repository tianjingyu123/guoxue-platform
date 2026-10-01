import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'
/** 仅安装独立探针；遵循手机安装防护流程，不改系统设置、不替换正式包。 */
export async function installProbe(sdk, device, info) {
 if (info.packageName !== 'cn.rebu.resourceprobe' || !info.syntheticOnly || info.dcloud !== false) throw new Error('拒绝非独立探针')
 const executable = path.join(sdk, 'platform-tools/adb.exe')
 const adb = (...args) => execFileSync(executable, ['-s', device, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024 })
 const current = adb('shell', 'pm', 'path', info.packageName).trim().split('\n').find(line => line.endsWith('/base.apk'))?.replace(/^package:/, '')
 if (current && adb('shell', 'sha256sum', current).trim().split(/\s+/)[0] === info.sha256) return '已核验同一 APK，未重复安装'
 const child = spawn(executable, ['-s', device, 'install', '-r', info.apk], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
 let ended = false, status, output = '', error
 child.stdout.on('data', bytes => output += bytes.toString())
 child.stderr.on('data', bytes => output += bytes.toString())
 child.on('exit', code => { status = code; ended = true })
 child.on('error', failure => { error = failure; ended = true })
 const began = Date.now(); let ownMenu = false, scanRequested = false
 const steps = []
 function tap(xml, resource, exactText) {
  const nodes = xml.match(/<node\b[^>]*>/g) || []
  const node = nodes.find(node => node.includes('resource-id="' + resource + '"') && (!exactText || node.includes('text="' + exactText + '"')) && node.includes('enabled="true"'))
  const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  if (!bounds) return false
  const values = bounds.slice(1).map(Number)
  adb('shell', 'input', 'tap', String(Math.round((values[0] + values[2]) / 2)), String(Math.round((values[1] + values[3]) / 2)))
  steps.push(exactText || resource); return true
 }
 try {
  while (!ended && Date.now() - began < 90000) {
   await new Promise(resolve => setTimeout(resolve, 500))
   if (ended) break
   adb('shell', 'uiautomator', 'dump', '/data/local/tmp/rebu-probe-install.xml')
   const xml = adb('shell', 'cat', '/data/local/tmp/rebu-probe-install.xml')
   const own = xml.includes('text="Rebu Native Probe"')
   if (own && xml.includes('暂无风险')) tap(xml, 'com.oplus.appdetail:id/btn_left', '继续安装')
   else if (own && xml.includes('完成扫描后可继续安装') && !scanRequested) ownMenu = tap(xml, 'com.oplus.appdetail:id/menu_more')
   else if (ownMenu && xml.includes('text="开始深度扫描"')) { scanRequested = tap(xml, 'com.oplus.appdetail:id/popup_list_window_item_title', '开始深度扫描'); ownMenu = false }
   // 其他 OEM/认证页面交给用户，不点击未知按钮或更改防护设置。
  }
  if (error) throw error
  const actual = adb('shell', 'pm', 'path', info.packageName).trim().split('\n').find(line => line.endsWith('/base.apk'))?.replace(/^package:/, '')
  if (!actual || adb('shell', 'sha256sum', actual).trim().split(/\s+/)[0] !== info.sha256) throw new Error('安装尚未完成或被设备拒绝；需核查当前安装会话，不应盲目重发')
  if (ended && status !== 0 && !output.includes('Success')) throw new Error('设备安装结果异常，已保留 APK 核验记录')
  return { method: '官方 adb；必要时按实际 UI 层级完成正常防护扫描', steps }
 } finally { if (!ended) child.kill() }
}
