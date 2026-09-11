const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
function load(app=false){
 const calls=[];let now=1000;
 let source=fs.readFileSync('apps/mobile/src/lib/legacy-paipan-data.ts','utf8').replace(/^import .*;\r?\n/m,'').replace(/export /g,'');
 if(app) source=source.replace(/\/\/ #ifdef H5[\s\S]*?\/\/ #endif/g, "");
 const c={Date:{now:()=>now},apiGet:async p=>{calls.push(p);return{}},apiGetOptionalAuth:async p=>{calls.push(p);return{}},encodeURIComponent};
 vm.runInNewContext(ts.transpileModule(source+';globalThis.api={stageLegacyPaipanEntry,consumeLegacyPaipanEntry,readLegacyPaipanContext,legacyPaipanContextPath,requestLegacyPaipanEntry,legacyToolEntryPath}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);
 return {...c.api,calls,expire:()=>{now+=16000}};
}
test('分站交接过期后重新获取同站入口，不能落到普通入口',async()=>{
 const a=load(),context=a.readLegacyPaipanContext({target:'station',stationId:'station-1'});
 a.stageLegacyPaipanEntry({mode:'legacy',url:'https://www.yrydai.com/p1.php?ruid=123'},context);
 a.expire();assert.equal(a.consumeLegacyPaipanEntry(context),null);await a.requestLegacyPaipanEntry(context);
 assert.deepEqual(a.calls,['/legacy-paipan/station/station-1/entry']);
 assert.equal(a.legacyPaipanContextPath(context),'/pkg-common/legacy-paipan/index?target=station&stationId=station-1');
});
test('不同分站不消费对方推荐地址，签名不进入回跳链接',()=>{
 const a=load(),x={target:'station',stationId:'x'},y={target:'station',stationId:'y'};
 a.stageLegacyPaipanEntry({mode:'legacy',url:'https://www.yrydai.cn/guoxueApp.php?key=secret'},x);
 assert.equal(a.consumeLegacyPaipanEntry(y),null);assert.doesNotMatch(a.legacyPaipanContextPath(x),/key|secret/);
});
test('个人中心刷新仍请求个人中心，缺分站标识不擅自降级',async()=>{
 const a=load();await a.requestLegacyPaipanEntry(a.readLegacyPaipanContext({target:'account'}));
 assert.deepEqual(a.calls,['/legacy-paipan/account']);
 await assert.rejects(a.requestLegacyPaipanEntry(a.readLegacyPaipanContext({target:'station'})),/缺少标识/);
});
test('同一上下文交接仅消费一次，分站标识不会注入新参数',()=>{
 const a=load(),context=a.readLegacyPaipanContext({target:'station',stationId:'x&target=account'}),entry={mode:'legacy',url:'https://www.yrydai.com/p1.php?ruid=1'};
 a.stageLegacyPaipanEntry(entry,context);assert.equal(a.consumeLegacyPaipanEntry(context),entry);assert.equal(a.consumeLegacyPaipanEntry(context),null);
 assert.match(a.legacyPaipanContextPath(context),/stationId=x%26target%3Daccount$/);
});

test('H5 明确选择网页入口，App 保留旧接口兼容',async()=>{
 const h5=load(),app=load(true);
 assert.equal(h5.legacyToolEntryPath(),'/legacy-paipan/entry?client=h5');
 assert.equal(app.legacyToolEntryPath(),'/legacy-paipan/entry');
 await h5.requestLegacyPaipanEntry({target:'tool',stationId:''});
 assert.deepEqual(h5.calls,['/legacy-paipan/entry?client=h5']);
});
