const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=process.cwd(),source='85192ea3cb962133c00c6564c56057667d8ea2da',out=root+'/artifacts/braces-depth';
assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source);fs.mkdirSync(out,{recursive:true});
const paths=[],mobile=createRequire(root+'/apps/mobile/package.json');let req=mobile;
for(const name of ['@dcloudio/uni-app','@dcloudio/uni-cloud','@dcloudio/uni-cli-shared','chokidar']){
 const file=req.resolve(name+'/package.json');paths.push({name,version:JSON.parse(fs.readFileSync(file)).version,path:path.relative(root,file)});req=createRequire(file);
}
const installed=req.resolve('braces'),packageDir=path.dirname(installed);paths.push({name:'braces',version:JSON.parse(fs.readFileSync(packageDir+'/package.json')).version,path:path.relative(root,installed)});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const expected={
 'lib/compile.js':'a50d47615f1a412063a104c17fab9b89aed758af75e569616761098f617d1b3e',
 'lib/expand.js':'ad92e3cb8d50e7fbf85b71faa0910135eb6260562ed700fea3d21e8427ccf633',
 'lib/parse.js':'032ff16b3657d9f8d4bbe42347f39f2a0242d9bff660dfd1f65910329bd0438c',
 'lib/stringify.js':'0a41e0c54433820a5f05cf82fbb9cbe0c2bf6805420fe2dca8e6817189a29e0c',
 'lib/depth-guard.js':'d19fcd17f4143a1f0b85ba8a8d15c5231f587a99993e593040134dc68a676f93'};
for(const [f,h] of Object.entries(expected))assert.equal(sha(fs.readFileSync(packageDir+'/'+f)),h,f);
const patched=require(installed),old=require(path.resolve(root,'../original/node_modules/braces'));
const inputs=['a/{b,c}/d','{1..5}','{01..05}','foo/{a,{b,c}}','\\{a,b\\}','[{}]','${variable}','a(b)c','{a}','{a,b}{c,d}'];
let ordinary=0;for(const input of inputs)for(const method of ['compile','expand','stringify']){assert.deepEqual(patched[method](input),old[method](input));ordinary++;}
const cases=[];for(const method of ['parse','compile','expand','stringify']){assert.throws(()=>patched[method]('{'.repeat(4096)+'x'+'}'.repeat(4096)),{name:'SyntaxError',code:'BRACES_AST_DEPTH_LIMIT'});cases.push(method+' deep string');}
for(const method of ['compile','expand','stringify']){
 const ast={type:'root',nodes:[]};let node=ast;for(let i=0;i<14000;i++){const child={type:'brace',nodes:[]};node.nodes.push(child);node=child;}
 assert.throws(()=>patched[method](ast),{name:'SyntaxError',code:'BRACES_AST_DEPTH_LIMIT'});cases.push(method+' direct AST');
 const cycle={type:'root',nodes:[]};cycle.nodes.push(cycle);assert.throws(()=>patched[method](cycle),{name:'SyntaxError',code:'BRACES_AST_DEPTH_LIMIT'});cases.push(method+' cycle');
}
assert.doesNotThrow(()=>patched.compile('{'.repeat(100)+'x'+'}'.repeat(100)));
const original=cp.spawnSync(process.execPath,['-e',`const root={type:'root',nodes:[]};let n=root;for(let i=0;i<14000;i++){const c={type:'brace',nodes:[]};n.nodes.push(c);n=c;}require(${JSON.stringify(path.resolve(root,'../original/node_modules/braces'))}).compile(root)`],{encoding:'utf8',timeout:5000,maxBuffer:20000});
assert.notEqual(original.status,0);assert.match(original.stderr,/RangeError: Maximum call stack size exceeded/);
fs.writeFileSync(out+'/depth-guard.json',JSON.stringify({sourceCommit:source,passed:true,actualDcloudConsumer:true,paths,files:expected,ordinaryComparisons:ordinary,protectedCases:cases,originalDirectAstOverflow:true,patchSha256:sha(fs.readFileSync(root+'/patches/braces@3.0.3.patch')),production:false,realChannels:false,gateWaiver:false,checkedAt:new Date().toISOString()},null,2)+'\n');
console.log({source,actualDcloudConsumer:true,ordinaryComparisons:ordinary,protectedCases:cases.length,production:false,gateWaiver:false});
