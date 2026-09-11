const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const src=fs.readFileSync('apps/mobile/src/pages/paipan/index.vue','utf8');
const method=src.slice(src.indexOf('async function loadPaipanEntry()'),src.indexOf('function paipanReturnPath()'));
async function run({target='tool',mode='legacy',wechat=true,app=false}={}){
 const calls=[],urls=[];const c={entryTarget:target,entryStationId:'s',nativeQaRequested:false,navigator:{userAgent:wechat?'MicroMessenger':'Chrome'},window:{location:{assign:u=>urls.push(u)}},hydratePaipanRuntime:async()=>mode,legacyWechatToolUrl:u=>u,getFavorites:()=>[],loadPlatformAgents:async()=>{},stageLegacyPaipanEntry:()=>{},uni:{navigateTo:()=>{}},legacyPaipanApi:{entry:async()=>{calls.push('tool');throw Error('进入排盘服务前请先绑定中国大陆手机号')},account:async()=>{calls.push('account');throw Error('需要登录')},stationEntry:async()=>{calls.push('station');return {mode:'legacy',url:'https://www.yrydai.com/p1.php?ruid=123'}}}};
 for(const k of ['entryLoading','entryError','allowNative','qaNotFound','loginRequired','favIds','legacyRouting'])c[k]={value:null};
 const body=app?method.replace(/\/\/ #ifdef H5[\s\S]*?\/\/ #endif/g,''):method;
 vm.runInNewContext(ts.transpileModule(body+';globalThis.run=loadPaipanEntry',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);await c.run();return {c,calls,urls};
}
test('微信普通工具不调用要求绑定手机号的签名接口',async()=>{const r=await run();assert.deepEqual(r.calls,[]);assert.deepEqual(r.urls,['https://www.yrydai.com/p1.php']);assert.equal(r.c.entryError.value,'')});
test('模式未确认不能自行跳转旧站',async()=>{const r=await run({mode:'unknown'});assert.deepEqual(r.urls,[]);assert.match(r.c.entryError.value,/状态暂时无法确认/)});
test('原生模式不跳旧站',async()=>{const r=await run({mode:'native'});assert.deepEqual(r.urls,[]);assert.equal(r.c.allowNative.value,true)});
test('个人中心仍调用账号接口',async()=>assert.deepEqual((await run({target:'account'})).calls,['account']));
test('分站仍经分站接口取得推荐地址',async()=>{const r=await run({target:'station'});assert.deepEqual(r.calls,['station']);assert.match(r.urls[0],/ruid=123/)});
test('App与非微信浏览器保留原签名入口',async()=>{for(const options of [{app:true},{wechat:false}]){const r=await run(options);assert.deepEqual(r.calls,['tool']);assert.match(r.c.entryError.value,/绑定中国大陆手机号/)}});
