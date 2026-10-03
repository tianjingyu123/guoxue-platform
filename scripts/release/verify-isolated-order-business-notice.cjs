const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),server=root+'/apps/server',b=root+'/artifacts/order-business-notice';
const original=server+'/src/modules/notification/order-business-notification.postgres.spec.ts';
const temp=server+'/src/modules/notification/.qa-compiled-order-business.spec.ts';
assert(process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL,'必须显式指定合成库');assert(!fs.existsSync(temp));
try {
 const source=fs.readFileSync(original,'utf8').replace(/^import \{\s*([\w,\s]+?)\s*\} from "(\.[^"]+)";/gm,(all,names,relative)=>{
  const src=path.resolve(path.dirname(original),relative+'.ts');if(!fs.existsSync(src))return all;
  const dst=path.join(server,'dist',path.relative(server+'/src',src)).replace(/\.ts$/,'.js');assert(fs.existsSync(dst));
  return `const {${names}}: typeof import(${JSON.stringify(relative)}) = require(${JSON.stringify(dst)});`;
 });
 fs.writeFileSync(temp,source);
 const r=cp.spawnSync(process.execPath,[server+'/node_modules/jest/bin/jest.js','--runInBand','--no-coverage','--runTestsByPath',temp,'--json','--outputFile',b+'/compiled-tests.json'],{cwd:server,env:process.env,encoding:'utf8',timeout:120000,maxBuffer:4000000});
 fs.writeFileSync(b+'/compiled-tests.log',r.stdout+r.stderr);assert.equal(r.status,0,r.stderr.slice(-4000));
 const tests=JSON.parse(fs.readFileSync(b+'/compiled-tests.json'));assert.equal(tests.numPassedTests,20);assert.equal(tests.numPendingTests,0);
 const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const bindings=['modules/shop/shop-refund.service','modules/shop/shop-payment.service','modules/shop/shop-order-lifecycle.service','modules/notification/order-business-notification.task','modules/notification/notification.service','modules/entitlement/entitlement.service'].map(file=>({path:file,sourceSha256:sha(server+'/src/'+file+'.ts'),compiledSha256:sha(server+'/dist/'+file+'.js')}));
 fs.writeFileSync(b+'/compiled-receipt.json',JSON.stringify({passed:20,compiledRuntime:true,realPostgres:true,realHttp:false,realRedis:false,realChannels:false,realFunds:false,production:false,bindings,checkedAt:new Date().toISOString()},null,2)+'\n');
 console.log({compiledPassed:20,bindings:6,production:false});
}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
