const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const s=fs.readFileSync('apps/server/src/modules/member/member-benefit.service.ts','utf8');
const method=s.slice(s.indexOf('  async withAiQuota'),s.indexOf('  /** AI 额度查询'));
const ctx={BusinessException:class extends Error{constructor(c,m){super(m)}},ErrorCode:{RATE_LIMITED:1}};
vm.runInNewContext(ts.transpileModule('class S {'+method+'};globalThis.S=S;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
function setup(member=false){let count=0;let day='day1';const keys=[];const svc=new ctx.S();svc.dailyFreeLimit=1;svc.effectiveAiLimit=async()=>1;svc.isActiveMember=async()=>member;svc.quotaKey=()=>day;svc.redis={incrWithTtl:async k=>{keys.push(k);return {count:++count}},refundCounter:async k=>{keys.push(k);count--}};return {svc,count:()=>count,keys,nextDay:()=>{day='day2'}};}
test('解读失败退回占额，下一次成功只扣一次',async()=>{const f=setup();await assert.rejects(f.svc.withAiQuota('u',async()=>{throw Error('失败')}));assert.equal(f.count(),0);assert.equal(await f.svc.withAiQuota('u',async()=>'译文'),'译文');assert.equal(f.count(),1)});
test('跨日失败撤回原来的日期，不扣次日额度',async()=>{const f=setup();await assert.rejects(f.svc.withAiQuota('u',async()=>{f.nextDay();throw Error('失败')}));assert.deepEqual(f.keys,['day1','day1']);});
test('并发占额阻止超额请求且不会累计超限计数',async()=>{const f=setup();let done;const a=f.svc.withAiQuota('u',()=>new Promise(r=>done=r));await new Promise(r=>setImmediate(r));let called=false;await assert.rejects(f.svc.withAiQuota('u',async()=>{called=true}));assert.equal(called,false);done('ok');await a;assert.equal(f.count(),1)});
test('会员失败不操作免费额度',async()=>{const f=setup(true);await assert.rejects(f.svc.withAiQuota('u',async()=>{throw Error('失败')}));assert.equal(f.keys.length,0)});
test('流式部分输出后失败退次，正常结束保留扣次',async()=>{const f=setup();await assert.rejects(async()=>{for await(const c of f.svc.withAiStreamQuota('u',(async function*(){yield '部分';throw Error('中断')})())){}});assert.equal(f.count(),0);for await(const c of f.svc.withAiStreamQuota('u',(async function*(){yield '完成'})())){}assert.equal(f.count(),1)});
test('流式消费者提前结束会退次',async()=>{const f=setup();for await(const c of f.svc.withAiStreamQuota('u',(async function*(){yield '部分';yield '剩余'})())){break}assert.equal(f.count(),0)});
test('客户端断开后不把完成生成当作成功扣次',async()=>{const f=setup();await assert.rejects(async()=>{for await(const c of f.svc.withAiStreamQuota('u',(async function*(){yield '文字'})(),()=>true)){}});assert.equal(f.count(),0)});
