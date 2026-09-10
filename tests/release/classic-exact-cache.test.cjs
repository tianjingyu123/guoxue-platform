const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const source=fs.readFileSync('apps/server/src/modules/ai-gateway/semantic-cache.service.ts','utf8');
const m={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports:m.exports,require:n=>n==='crypto'?require(n):{Injectable:()=>x=>x,Cron:()=>()=>{},CronExpression:{},Logger:class{debug(){}warn(){}}}});
function fixture(){let embeds=0,created;const db={aiCacheEntry:{findFirst:async()=>null,create:async({data})=>{created=data;}}};const redis={getJson:async()=>null};const vector={embed:async()=>{embeds++;return [[1]];}};return {svc:new m.exports.SemanticCacheService(db,redis,vector),embeds:()=>embeds,created:()=>created};}
test('隔离解读缓存未命中直接进入生成，不等待向量模型',async()=>{const f=fixture();assert.equal(await f.svc.lookup('classic_translate','测试原文','abc'),null);assert.equal(f.embeds(),0);});
test('隔离解读持久化不生成向量，保持一年有效期',async()=>{const f=fixture();await f.svc.persistEntry('classic_translate#abc','hash','原文','译文','model');assert.equal(f.embeds(),0);assert.equal(f.created().queryVectorJson,null);assert.ok(f.created().expiresAt.getTime()-Date.now()>364*86400000);});
