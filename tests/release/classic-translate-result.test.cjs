const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const source = fs.readFileSync('apps/server/src/modules/classic/classic.service.ts', 'utf8');
const body = source.slice(source.indexOf('  async translateClassical'), source.indexOf('  // ── 古籍AI问答'));
const js = ts.transpileModule('class Service {' + body + '}; globalThis.Service=Service;', { compilerOptions: {target: ts.ScriptTarget.ES2022} }).outputText;
const ctx = {createHash: require('node:crypto').createHash, ServiceUnavailableException: Error};
vm.runInNewContext(js,ctx);
function fixture(content) {
 const requests=[];
 const svc=new ctx.Service();
 svc.logger={warn(){}};
 svc.gateway={chat:async req=>{requests.push(req);return {content};}};
 return {svc,requests};
}
test('代码块 JSON 可解析，原文以请求为准',async()=>{
 const f=fixture('```json\n{"original":"错误原文","translation":"  正确译文  ","notes":["注释",null],"source":1}\n```');
 const r=await f.svc.translateClassical({text:'原文',context:'第一章'});
 assert.equal(r.original,'原文');assert.equal(r.translation,'正确译文');assert.equal(r.notes.length,1);assert.equal(r.source,'');
});
test('空内容、截断 JSON 和缺失译文均不能伪装成功',async()=>{
 for(const content of ['', '   ','{"translation":','{}','{"translation":null}','{"translation":"  "}']) {
  await assert.rejects(fixture(content).svc.translateClassical({text:'原文'}),/不完整/);
 }
});
test('相同文本不同章节、相近文本使用独立缓存作用域',async()=>{
 const f=fixture('{"translation":"译文"}');
 for(const dto of [{text:'子曰学而',context:'甲'},{text:'子曰学而',context:'乙'},{text:'子曰学而时习',context:'甲'},{text:'子曰学而',context:'甲'}]) await f.svc.translateClassical(dto);
 assert.equal(new Set(f.requests.map(r=>r.cacheScopeKey)).size,3);
});
test('切章乱序返回不覆盖当前正文或恢复旧解读',async()=>{
 const src=fs.readFileSync('apps/mobile/src/pkg-classics/reader/index.vue','utf8');
 const fn=src.slice(src.indexOf('let chapterLoadSeq ='),src.indexOf('// ── 古籍伴读'));
 const pending={};const ref=value=>({value});let saves=0;
 const c={chapters:ref([{id:'a'},{id:'b'}]),curIndex:ref(0),paragraphs:ref(['旧正文']),aiSeq:0,aiLoading:ref(true),aiOpen:ref(true),aiSeg:ref('旧句'),aiResult:ref({}),classicsApi:{chapter:id=>new Promise((resolve,reject)=>{pending[id]={resolve,reject};})},splitParagraphs:s=>[s],uni:{pageScrollTo(){}},saveProgress:()=>saves++};
 vm.runInNewContext(ts.transpileModule(fn,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);
 const a=c.loadChapter(0);const b=c.loadChapter(1);
 pending.b.resolve({content:'乙章'});await b;pending.a.resolve({content:'甲章'});await a;
 assert.equal(c.paragraphs.value[0],'乙章');assert.equal(c.aiOpen.value,false);assert.equal(c.aiSeq,2);assert.equal(saves,1);
});
