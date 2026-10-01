import test from 'node:test'
import assert from 'node:assert/strict'
import { assertCheckpointRecovery, includeScenarioBootContext } from '../../scripts/release/android-probe-recovery-evidence.mjs'
const line=(pid,message)=>`1790839332.498 ${pid} ${pid} I REBU_RESOURCE_PROBE: ${message}`
const valid=[line(7479,'KILL_AT OLD_MOVED'),line(7499,'RECOVERED_BEFORE_JS verified-backup'),line(7499,'BEFORE_WEBVIEW phase=HEALTHY,version=0,ms=156'),line(7558,'BEFORE_WEBVIEW phase=HEALTHY,version=0,ms=381'),line(7566,'HARNESS_CUTOFF new-start'),line(7558,'JS_READY baseline-ready')]

test('本次启动目标PID的BC记录先于标记时仍保留，顺序不变',()=>{
 const boot=line(4480,'CRYPTO_MODE bc'),marker=line(4496,'HARNESS_CUTOFF current'),pending=line(4480,'BEFORE_WEBVIEW phase=PENDING_HEALTH,version=1,ms=5518'),error=line(4480,'JS_ERROR bad-js')
 const filtered=[marker,pending,error]
 assert.deepEqual(includeScenarioBootContext(filtered,[boot,...filtered],/JS_ERROR bad-js/),[boot,...filtered])
})

test('不借用其他PID的BC、目标事件之后的启动或本次窗口以外的记录',()=>{
 const marker=line(4496,'HARNESS_CUTOFF current'),error=line(4480,'JS_ERROR bad-js'),wrong=line(4409,'CRYPTO_MODE bc'),late=line(4480,'CRYPTO_MODE bc')
 assert.deepEqual(includeScenarioBootContext([marker,error],[wrong,marker,error,late],/JS_ERROR bad-js/),[marker,error])
 assert.throws(()=>includeScenarioBootContext([marker,error],[wrong,marker],/JS_ERROR bad-js/))
})
test('自动恢复先于再次启动标记，后续另一进程执行健康基线JS',()=>assert.deepEqual(assertCheckpointRecovery(valid,'OLD_MOVED'),{killedPid:'7479',restoredPid:'7499',jsPid:'7558',recoveryBeforeJs:true}))
test('同一恢复进程执行健康JS',()=>assert.equal(assertCheckpointRecovery([...valid.slice(0,3),line(7499,'JS_READY baseline-ready')],'OLD_MOVED').jsPid,'7499'))
test('缺失恢复、缺失JS、PID相同、非健康基线、JS抢先及JS进程基线缺失均拒绝',()=>{
 const invalid=[valid.filter((_,i)=>i!==1),valid.slice(0,-1),valid.map((text,i)=>i===0?text.replaceAll('7479','7499'):text),valid.map((text,i)=>i===2?text.replace('version=0','version=2'):text),[valid[0],valid.at(-1),...valid.slice(1,-1)],valid.filter((_,i)=>i!==3)]
 for(const logs of invalid)assert.throws(()=>assertCheckpointRecovery(logs,'OLD_MOVED'))
})
