const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const source=fs.readFileSync('apps/server/src/modules/member/member-benefit.service.ts','utf8');
const method=source.slice(source.indexOf('  async effectiveAiLimit'),source.indexOf('  /** 统一会员'));
const ctx={};vm.runInNewContext(ts.transpileModule('class S {'+method+'};globalThis.S=S;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
function svc(config){const s=new ctx.S();s.dailyFreeLimit=10;s.redis={get:async key=>config[key]||null};return s;}
test('测试额度仅作用于指定账号',async()=>{const s=svc({'aiq:override:test':JSON.stringify({dailyLimit:200,expiresAt:Date.now()+60000})});assert.equal(await s.effectiveAiLimit('test'),200);assert.equal(await s.effectiveAiLimit('other'),10)});
test('到期及非法配置恢复普通额度',async()=>{for(const raw of ['bad',JSON.stringify({dailyLimit:200,expiresAt:Date.now()-1}),JSON.stringify({dailyLimit:-1,expiresAt:Date.now()+60000})])assert.equal(await svc({'aiq:override:test':raw}).effectiveAiLimit('test'),10)});
