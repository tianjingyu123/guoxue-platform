const fs=require('fs'),p=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const root=process.cwd(),b=root+'/artifacts/circle-reward-boundary',server=root+'/apps/server';
const source=server+'/src/modules/circle/services/circle-post-reward-notification.postgres.spec.ts',temp=p.join(p.dirname(source),'.qa-compiled-circle-reward.spec.ts');
fs.mkdirSync(b,{recursive:true}); assert(process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL,'必须显式提供合成库'); assert(!fs.existsSync(temp));
try {
 let s=fs.readFileSync(source,'utf8').replace(/^import \{\s*([\w,\s]+?)\s*\} from "(\.[^"]+)";/gm,(all,names,relative)=>{
  const src=p.resolve(p.dirname(source),relative+'.ts');if(!fs.existsSync(src))return all;
  const dst=p.join(server,'dist',p.relative(server+'/src',src)).replace(/\.ts$/,'.js');assert(fs.existsSync(dst));
  return `const {${names}}: typeof import(${JSON.stringify(relative)}) = require(${JSON.stringify(dst)});`;
 });
 s=s.replace(/resolve\("src\/([^"\n]+)\.ts"\)/g, (_all, file) => 'resolve("dist/'+file+'.js")');
 fs.writeFileSync(temp,s);
 const r=cp.spawnSync(process.execPath,[server+'/node_modules/jest/bin/jest.js','--runInBand','--no-coverage','--runTestsByPath',temp,'--json','--outputFile',b+'/compiled-tests.json'],{cwd:server,env:{...process.env,ENTITLEMENT_NOTICE_TEST_DATABASE_URL:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL},encoding:'utf8',timeout:120000,maxBuffer:4000000});
 fs.writeFileSync(b+'/compiled-tests.log',r.stdout+r.stderr);assert.equal(r.status,0,r.stderr.slice(-5000));
 const x=JSON.parse(fs.readFileSync(b+'/compiled-tests.json'));assert.equal(x.numFailedTests,0);assert.equal(x.numPendingTests,0);assert.equal(x.numPassedTests,34);
 const paths=['modules/circle/services/circle-post.service','modules/circle/services/circle-post-reward-notification.task','modules/coin/coin.service','modules/circle/services/circle-shared.service','modules/notification/notification.service'];
 const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 const receipt={passed:34,skipped:0,compiledRuntime:true,realPostgres:true,realRedis:false,production:false,transportSignatureVerified:false,realChannels:false,historicalBackfill:false,formalDockerfileImage:false,bindings:paths.map(file=>({path:file,sourceSha256:sha(server+'/src/'+file+'.ts'),compiledSha256:sha(server+'/dist/'+file+'.js')})),checkedAt:new Date().toISOString()};
 fs.writeFileSync(b+'/compiled-receipt.json',JSON.stringify(receipt,null,2));console.log({passed:34,bindings:5,production:false});
}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}


