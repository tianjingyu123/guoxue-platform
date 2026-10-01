import { spawn } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** 连续接收探针 main 标签，保留顺序与唯一标记；不清日志、不重复扫描全局缓冲。 */
export function createProbeLogStream(executable, device, outputDirectory) {
 if (!/^[a-zA-Z0-9-]{4,80}$/.test(device)) throw Error('日志观察设备无效')
 mkdirSync(outputDirectory, { recursive: true })
 const file = path.join(outputDirectory, device + '-' + randomUUID() + '.log')
 writeFileSync(file, '', { flag: 'wx' })
 const args = ['-s', device, 'logcat', '-b', 'main', '-T', '1', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S']
 const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
 const lines = [], cursors = new WeakSet(); let pending = '', bytes = 0, failure, ended = false, closing = false
 child.stdout.setEncoding('utf8')
 child.stdout.on('data', chunk => {
  bytes += Buffer.byteLength(chunk, 'utf8')
  if (bytes > 4 * 1024 * 1024) { failure = Error('探针标签日志超过4MiB观察边界'); child.kill(); return }
  try { appendFileSync(file, chunk) } catch (error) { failure = error; child.kill(); return }
  pending += chunk
  const complete = pending.split('\n'); pending = complete.pop()
  for (const line of complete) if (/^\s*\d+\.\d+\s+\d+\s+\d+\s+I\s+REBU_RESOURCE_PROBE:/.test(line)) lines.push(line.replace(/\r$/, ''))
 })
 child.stderr.on('data', () => { /* 原始设备业务日志不从 stderr 纳入证据。 */ })
 child.on('error', error => { failure = error; ended = true })
 child.on('close', code => { ended = true; if (!closing && !failure) failure = Error('探针日志连接提前结束，退出码=' + code) })
 const assertAlive = () => { if (failure) throw failure; if (ended && !closing) throw Error('探针日志观察已退出') }
 return {
  cursor() { assertAlive(); const value = Object.freeze({ index: lines.length }); cursors.add(value); return value },
  linesAfterCursor(cursor) { assertAlive(); if (!cursors.has(cursor)) throw Error('日志游标不属于当前观察器'); return lines.slice(cursor.index) },
  linesAfter(cutoff) { assertAlive(); return lines.filter(line => Number(line.trim().split(/\s+/)[0]) >= cutoff - 0.01) },
  async capture(adb) {
   assertAlive()
   const marker = 'HARNESS_CUTOFF ' + randomUUID()
   adb('shell', 'log', '-p', 'i', '-t', 'REBU_RESOURCE_PROBE', marker)
   const began = Date.now()
   let lastMarkerWrite = began
   while (Date.now() - began < 120000) {
    // adb 同步调用结束后让管道回调处理数据，标记须从实际设备流中出现。
    await new Promise(resolve => setTimeout(resolve, 100))
    assertAlive()
    const line = lines.find(line => line.includes(marker))
    const cutoff = Number(line?.trim().split(/\s+/)[0])
    if (Number.isFinite(cutoff)) return cutoff
    // -T 1 不补读已过去的标记；订阅启动期间只重发诊断标记，收到后停止。
    if (Date.now() - lastMarkerWrite >= 3000) { adb('shell', 'log', '-p', 'i', '-t', 'REBU_RESOURCE_PROBE', marker); lastMarkerWrite = Date.now() }
   }
   throw Error('连续探针日志未收到唯一设备标记')
  },
  async close() {
   if (!closing) { closing = true; if (!ended) child.kill() }
   const began = Date.now()
   while (!ended && Date.now() - began < 5000) await new Promise(resolve => setTimeout(resolve, 50))
   if (!ended) throw Error('独立日志观察进程未停止')
   if (failure) throw failure
   return { transport: 'continuous-adb-logcat', buffer: 'main', tag: 'REBU_RESOURCE_PROBE', initialTailLines: 1, maxBytes: 4 * 1024 * 1024, file, bytes, eventLines: lines.length, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), stopped: true }
  }
 }
}
