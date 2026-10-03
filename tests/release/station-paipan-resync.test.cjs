const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const source=fs.readFileSync('apps/mobile/src/pkg-operator/lib/legacy-paipan-station.ts','utf8').replace(/^import .*$/mg,'').replace(/export /g,'');
const c={};vm.createContext(c);vm.runInContext(ts.transpile(source),c);
test('旧站完成授权后优先复核同步，不再次送去授权',async()=>{let calls=0;const r=await c.resolveOwnerPaipanState({getState:async()=>({state:'PENDING_AUTHORIZATION',authorizationUrl:'old'}),retry:async()=>{calls++;return {state:'SYNCED',referralUrl:'https://www.yrydai.com/p1.php?ruid=123'}}});assert.equal(calls,1);assert.equal(r.state,'SYNCED');});
test('已同步站长不重复调用开通操作',async()=>{await c.resolveOwnerPaipanState({getState:async()=>({state:'SYNCED'}),retry:async()=>{throw Error('不应调用')}})});
test('旧站仍缺用户保留授权入口，同步故障不假装成功',async()=>{const state={state:'PENDING_AUTHORIZATION',authorizationUrl:'https://www.yrydai.cn/my.php'};assert.equal(await c.resolveOwnerPaipanState({getState:async()=>state,retry:async()=>state}),state);await assert.rejects(c.resolveOwnerPaipanState({getState:async()=>state,retry:async()=>{throw Error('不可用')}}),/不可用/)});
