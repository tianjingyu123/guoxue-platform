const fs=require('fs'),p=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const root=process.cwd(),b=root+'/artifacts/school-member',server=root+'/apps/server';
fs.mkdirSync(b,{recursive:true}); assert(process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL,'必须显式提供合成库');
const source=server+'/src/modules/shop/school-member-entitlement.postgres.spec.ts',temp=p.join(p.dirname(source),'.qa-compiled-school-member.spec.ts');
assert(!fs.existsSync(temp));
try{
 let s=fs.readFileSync(source,'utf8').replace(/^import \{\s*([\w,\s]+?)\s*\} from "(\.[^"]+)";/gm,(all,names,relative)=>{
  const src=p.resolve(p.dirname(source),relative+'.ts');if(!fs.existsSync(src))return all;
  const dst=p.join(server,'dist',p.relative(server+'/src',src)).replace(/\.ts$/,'.js');assert(fs.existsSync(dst));
  return `const {${names}}: typeof import(${JSON.stringify(relative)}) = require(${JSON.stringify(dst)});`;
 });
 s=s.replace('resolve("src/modules/notification/entitlement-notification.task.ts")','resolve("dist/modules/notification/entitlement-notification.task.js")');
 assert(s.includes('dist/modules/notification/entitlement-notification.task.js'));fs.writeFileSync(temp,s);
 const r=cp.spawnSync(process.execPath,[server+'/node_modules/jest/bin/jest.js','--runInBand','--no-coverage','--runTestsByPath',temp,'--json','--outputFile',b+'/compiled-tests.json'],{cwd:server,env:{...process.env,ENTITLEMENT_NOTICE_TEST_DATABASE_URL:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL},encoding:'utf8',timeout:120000,maxBuffer:4000000});
 fs.writeFileSync(b+'/compiled-tests.log',r.stdout+r.stderr);assert.equal(r.status,0,r.stderr.slice(-5000));
 const result=JSON.parse(fs.readFileSync(b+'/compiled-tests.json'));assert.equal(result.numFailedTests,0);assert.equal(result.numPendingTests,0);assert.equal(result.numPassedTests,33);
 const paths=['modules/shop/shop-payment.service','modules/shop/shop-refund.service','modules/notification/entitlement-notification.task','modules/notification/notification.service','modules/entitlement/entitlement.service','modules/member/member-benefit.service'];
 const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 const receipt={passed:33,skipped:0,compiledRuntime:true,realPostgres:true,realMemberBenefits:true,realRedis:false,production:false,transportSignatureVerified:false,realChannels:false,historicalBackfill:false,formalDockerfileImage:false,bindings:paths.map(file=>({path:file,sourceSha256:sha(server+'/src/'+file+'.ts'),compiledSha256:sha(server+'/dist/'+file+'.js')})),checkedAt:new Date().toISOString()};
 fs.writeFileSync(b+'/compiled-receipt.json',JSON.stringify(receipt,null,2));console.log({passed:receipt.passed,bindings:receipt.bindings.length,production:false});
}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
