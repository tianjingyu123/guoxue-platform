/** 从本次启动观察窗口补齐目标事件同PID的前置启动记录，不引入其他进程或旧场景。 */
export function includeScenarioBootContext(filtered, launchWindow, expected) {
 const event = filtered.find(line => expected.test(line)), index = launchWindow.indexOf(event)
 if (!event || index < 0) throw Error('目标事件不在本次启动观察窗口')
 const pid = event.trim().split(/\s+/)[1], selected = new Set(filtered)
 return launchWindow.filter((line, position) => selected.has(line) || (position < index && line.trim().split(/\s+/)[1] === pid && /REBU_RESOURCE_PROBE: (CRYPTO_MODE|BEFORE_WEBVIEW|RECOVERED_BEFORE_JS)\b/.test(line)))
}

/** 杀进程后系统可能自动重建；恢复窗口从实际 KILL_AT 开始，不能仅用再次启动标记。 */
export function assertCheckpointRecovery(logs, checkpoint) {
 const pid = line => line?.trim().split(/\s+/)[1]
 const killedIndex = logs.findIndex(line => line.includes('KILL_AT ' + checkpoint))
 const recoveryIndex = logs.findIndex((line, index) => index > killedIndex && line.includes('RECOVERED_BEFORE_JS'))
 const killedPid = pid(logs[killedIndex]), restoredPid = pid(logs[recoveryIndex])
 const bootIndex = logs.findIndex((line, index) => index > recoveryIndex && pid(line) === restoredPid && line.includes('BEFORE_WEBVIEW'))
 const jsIndex = logs.findIndex((line, index) => index > killedIndex && line.includes('JS_READY'))
 // 恢复进程必须实际报告健康基线，且整个窗口中首个 JS 事件不得先于该恢复。
 if (killedIndex < 0 || recoveryIndex < 0 || bootIndex < 0 || jsIndex < 0 || !killedPid || !restoredPid || killedPid === restoredPid || jsIndex <= bootIndex || !/phase=HEALTHY,version=0,/.test(logs[bootIndex]) || !logs[jsIndex].includes('JS_READY baseline-ready')) throw Error('杀进程后恢复顺序/PID/基线失败：' + checkpoint)
 const jsPid = pid(logs[jsIndex])
 const jsBootIndex = logs.findIndex((line, index) => index >= bootIndex && index < jsIndex && pid(line) === jsPid && /BEFORE_WEBVIEW phase=HEALTHY,version=0,/.test(line))
 if (jsBootIndex < 0) throw Error('执行JS的进程未报告健康基线：' + checkpoint)
 return { killedPid, restoredPid, jsPid, recoveryBeforeJs: true }
}
