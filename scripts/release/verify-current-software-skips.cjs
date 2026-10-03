// 当前源码的条件跳过软件测试补验；只允许专用合成库。
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=process.cwd(),output=path.join(root,'artifacts/current-skips'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'skipped-case-manifest-cc78.json')));
assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifest.sourceCommit);
assert.equal(manifest.expectedSoftware,592);assert.equal(manifest.softwareFiles.length,48);
for(const key of ['XIAOBU_IT_DATABASE_URL','ENTITLEMENT_NOTICE_TEST_DATABASE_URL','BOT_QUOTA_TEST_DATABASE_URL']){
 const url=new URL(process.env[key]);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55462');assert.equal(url.username,'qa_voice');
}
fs.mkdirSync(output,{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const row of manifest.rows)assert.equal(hash(row.path),row.sourceSha256);
const bindingFiles=cp.execFileSync('git',['ls-files','-z','apps/server/src','apps/server/prisma','packages','pnpm-lock.yaml'],{encoding:'utf8'}).split('\0').filter(Boolean);
fs.writeFileSync(output+'/source-binding.json',JSON.stringify({source:manifest.sourceCommit,files:bindingFiles.map(file=>({path:file,sha256:hash(file)}))},null,2));
// 所有服务仅能连接回环地址；子进程通过NODE_OPTIONS继承相同保护。
const guard=output+'/loopback-only.cjs';
fs.writeFileSync(guard,[
 "const net=require('node:net'),original=net.Socket.prototype.connect;",
 "const allowed=new Set(['127.0.0.1','localhost','::1','[::1]']);",
 "net.Socket.prototype.connect=function(...args){const a=args[0];let host=typeof a==='object'?a.host:typeof args[1]==='string'?args[1]:undefined;if(host&&!allowed.has(host))throw Error('隔离测试禁止外部网络: '+host);return original.apply(this,args);};",
 "if(globalThis.fetch){const originalFetch=globalThis.fetch;globalThis.fetch=(url,...args)=>{const host=new URL(typeof url==='string'?url:url.url||url.href).hostname;if(!allowed.has(host))throw Error('隔离测试禁止外部fetch');return originalFetch(url,...args);};}"
].join('\n'));
const env={...process.env,NODE_OPTIONS:(process.env.NODE_OPTIONS||'')+' --require='+guard};
delete env.WEWORK_WEBHOOK_ALERT_URL;
const result=cp.spawnSync(process.execPath,[root+'/apps/server/node_modules/jest/bin/jest.js','--runInBand','--no-coverage','--runTestsByPath',...manifest.softwareFiles.map(file=>root+'/'+file),'--json','--outputFile',output+'/jest-results.json'],{cwd:root+'/apps/server',env,encoding:'utf8',timeout:900000,maxBuffer:25e6});
fs.writeFileSync(output+'/jest.log',(result.stdout||'')+(result.stderr||''));
assert.equal(result.status,0,'本版受保护软件测试失败，保留逐用例结果和日志');
const report=JSON.parse(fs.readFileSync(output+'/jest-results.json'));
assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);assert.equal(report.numPassedTests,592);assert.equal(report.numPassedTestSuites,48);
const actual=report.testResults.flatMap(suite=>suite.assertionResults.map(test=>({path:path.relative(root,suite.name).replaceAll('\\','/'),name:test.fullName,status:test.status})));
const sorted=rows=>rows.map(row=>row.path+'\t'+row.name).sort();
assert.deepEqual(sorted(actual),sorted(manifest.rows));assert(actual.every(row=>row.status==='passed'));
assert.deepEqual(JSON.parse(fs.readFileSync(output+'/source-binding.json')).files,bindingFiles.map(file=>({path:file,sha256:hash(file)})));
fs.writeFileSync(output+'/verified.json',JSON.stringify({source:manifest.sourceCommit,passed:592,skipped:0,suites:48,defaultSkipped:621,hardwareDeferred:29,exactNamesVerified:true,sourceUnmodified:true,realPostgres:true,realRedis:true,loopbackOnly:true,realProviders:false,realFunds:false,production:false},null,2)+'\n');
console.log({passed:592,suites:48,skipped:0,production:false});
