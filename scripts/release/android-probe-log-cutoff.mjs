import { randomUUID } from 'node:crypto'

/** 探针只写 main；限制读取尾部，避免旧系统无界跨缓冲日志读取迟迟不返回。 */
export function readProbeLogs(adb) {
 return adb('logcat', '-b', 'main', '-d', '-t', '1000', '-v', 'epoch', '-s', 'REBU_RESOURCE_PROBE:I', '*:S')
}

/** 老版 Android date 不支持 %N；用唯一日志标记取得设备实际毫秒时间，不清全局日志。 */
export function captureProbeLogCutoff(adb) {
 const marker = 'HARNESS_CUTOFF ' + randomUUID()
 adb('shell', 'log', '-p', 'i', '-t', 'REBU_RESOURCE_PROBE', marker)
 const line = readProbeLogs(adb).split('\n').find(line => line.includes(marker))
 const cutoff = Number(line?.trim().split(/\s+/)[0])
 if (!Number.isFinite(cutoff)) throw Error('独立探针设备日志标记未取得精确时间')
 return cutoff
}
