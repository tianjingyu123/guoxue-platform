import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const ts = createRequire(new URL('../../apps/admin/package.json', import.meta.url))('typescript')
const vue = readFileSync(new URL('../../apps/admin/src/views/ai/XiaobuOps.vue', import.meta.url), 'utf8')
const sf = ts.createSourceFile('page.ts', vue.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1], ts.ScriptTarget.Latest, true)
const source = sf.statements.filter(n => ts.isFunctionDeclaration(n) && ['doGrant','errMsg'].includes(n.name?.text)).map(n => n.getText(sf)).join('\n')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
function setup(handler = async () => ({ duplicated: false })) {
  const calls=[],dialogs=[],messages=[]; let refreshed=0
  const ctx={quota:{ownerType:'user',ownerId:'test-user-a'},grant:{minutes:30,reason:'测试发放'},granting:{value:false},pendingGrant:{value:null},
    ElMessageBox:{confirm:(text)=>new Promise((resolve,reject)=>dialogs.push({text,resolve,reject}))},
    ElMessage:{warning:m=>messages.push(m),error:m=>messages.push(m),success:m=>messages.push(m)},
    xiaobuOpsApi:{grant:async body=>{calls.push({...body});return handler(body)}},loadQuota:()=>{refreshed++}}
  vm.runInNewContext(js,ctx);return{ctx,calls,dialogs,messages,refreshed:()=>refreshed}
}
test('确认窗口中的对象及分钟数锁定，连点只显示一个确认框',async()=>{
  const s=setup(), a=s.ctx.doGrant(); await s.ctx.doGrant(); assert.equal(s.dialogs.length,1)
  s.ctx.quota.ownerId='test-user-b';s.ctx.grant.minutes=90;s.ctx.grant.reason='新输入';s.dialogs[0].resolve();await a
  assert.equal(s.calls[0].ownerId,'test-user-a');assert.equal(s.calls[0].minutes,30);assert.equal(s.ctx.grant.reason,'新输入');assert.equal(s.refreshed(),0)
})
test('服务端已落账但响应丢失，重试沿用原请求且不多发',async()=>{
  const ledger=new Set();let first=true
  const s=setup(async b=>{const duplicated=ledger.has(b.requestId);ledger.add(b.requestId);if(first){first=false;throw new Error('模拟响应丢失')}return{duplicated}})
  let task=s.ctx.doGrant();s.dialogs[0].resolve();await task;assert.ok(s.ctx.pendingGrant.value)
  s.ctx.grant.minutes=50;task=s.ctx.doGrant();s.dialogs[1].resolve();await task
  assert.equal(s.calls[0].requestId,s.calls[1].requestId);assert.equal(s.calls[1].minutes,30);assert.equal(ledger.size,1);assert.equal(s.ctx.pendingGrant.value,null)
})
test('取消确认不发请求并释放点击锁',async()=>{
  const s=setup(),task=s.ctx.doGrant();s.dialogs[0].reject(new Error('cancel'));await task
  assert.equal(s.calls.length,0);assert.equal(s.ctx.granting.value,false);assert.equal(s.ctx.pendingGrant.value,null)
})
test('明确参数拒绝允许修正后再次发放',async()=>{
  const s=setup(async()=>{throw {response:{status:400,data:{message:'参数不合法'}}}}),task=s.ctx.doGrant();s.dialogs[0].resolve();await task
  assert.equal(s.ctx.pendingGrant.value,null);assert.equal(s.ctx.granting.value,false)
})
test('无效对象或分钟数不会打开确认或发送请求',async()=>{
  const s=setup();s.ctx.quota.ownerId=' ';await s.ctx.doGrant();s.ctx.quota.ownerId='test';s.ctx.grant.minutes=0;await s.ctx.doGrant()
  assert.equal(s.dialogs.length,0);assert.equal(s.calls.length,0)
})
