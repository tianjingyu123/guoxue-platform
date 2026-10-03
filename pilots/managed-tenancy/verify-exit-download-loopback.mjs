import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { managedExitCollections, canonicalExitJson, exitSha, verifyManagedExitFiles, validateExitManifest } from '../../scripts/ops/managed-exit-format.mjs';

// 本任务新建的合成HTTP服务与受限文件，不借用来源库、凭据或编译产物。
const repo=fileURLToPath(new URL('../../',import.meta.url));
const root=resolve(repo,'pilots/managed-tenancy/.runtime','exit-loopback-'+Date.now());
mkdirSync(root,{recursive:true,mode:0o700});
if(process.platform==='win32'){
  const literal=root.replaceAll("'","''");
  const script=`$ErrorActionPreference='Stop'; $acl=New-Object Security.AccessControl.DirectorySecurity; $acl.SetAccessRuleProtection($true,$false); $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl.SetOwner($sid); foreach($id in @($sid.Value,'S-1-5-18','S-1-5-32-544')) { $who=New-Object Security.Principal.SecurityIdentifier($id); $rule=New-Object Security.AccessControl.FileSystemAccessRule($who,'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.AddAccessRule($rule) }; Set-Acl -LiteralPath '${literal}' -AclObject $acl`;
  execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,stdio:'pipe'});
}
const accessToken='SYNTHETIC_ACCESS_ONLY_20261003',downloadToken='S'.repeat(43);
const binding={customerId:'synthetic-customer',applicationId:'synthetic-app'};
const manifest={version:3,format:'managed-json-pages',...binding,pageSize:500,pageSizes:{assets:1},totalRows:0,totalBytes:0,collections:{}};
const pages={};
for(const name of managedExitCollections){
  const count=name==='users'?2:1;
  const meta={rows:count,pages:[]};
  for(let index=0;index<count;index++){
    const payload=name==='assets'?[{contentType:'image/png',dataBase64:'aGVsbG8=',size:5,sha256:exitSha(Buffer.from('hello'))}]:[{id:`synthetic-${name}-${index}`}];
    const sha256=exitSha(canonicalExitJson(payload));
    const page={collection:name,page:index,payload,sha256};
    pages[name+'/'+index]=page;meta.pages.push({page:index,rows:1,sha256});
    manifest.totalRows++;manifest.totalBytes+=Buffer.byteLength(JSON.stringify(payload));
  }
  manifest.collections[name]=meta;
}
const clone=value=>JSON.parse(JSON.stringify(value));
let mode='success',contextCount=0,manifestCount=0,pageCount=0,sinkHits=0;
const requests=[],checks=[];
const sink=createServer((_req,res)=>{sinkHits++;res.writeHead(200,{'Content-Type':'application/json'}).end('{}');});
await new Promise(done=>sink.listen(0,'127.0.0.1',done));
const server=createServer((req,res)=>{
  requests.push({method:req.method,path:req.url});
  if(req.headers.authorization!=='Bearer '+accessToken||req.headers['x-export-token']!==downloadToken){res.writeHead(403).end();return;}
  if(mode==='redirect'){res.writeHead(302,{Location:`http://127.0.0.1:${sink.address().port}/foreign`}).end();return;}
  let value;
  if(req.url==='/api/v1/lease/context'){
    contextCount++; value={...binding,role:'CUSTOMER_ADMIN'};
    if(mode==='role')value.role='MEMBER';
    if(mode==='cross-subject')value.customerId='other-customer';
    if(mode==='late-revoke'&&contextCount===2)value.role='MEMBER';
  }else if(req.url==='/api/v1/lease/exports/synthetic-export'){
    manifestCount++;value=clone(manifest);
    if(mode==='changed-manifest'&&manifestCount===2)value.snapshotNote='synthetic-change';
  }else if(req.url.startsWith('/api/v1/lease/exports/synthetic-export/pages/')){
    pageCount++;value=clone(pages[req.url.split('/pages/')[1]]);
    if(!value){res.writeHead(404).end();return;}
    if(pageCount===1){
      if(mode==='missing'){res.writeHead(404,{'Content-Type':'application/json'}).end(JSON.stringify({error:downloadToken}));return;}
      if(mode==='network'){req.socket.destroy();return;}
      if(mode==='tamper')value.payload[0].id='synthetic-tampered';
      if(mode==='echo'||mode==='escaped-echo')value.echo=downloadToken;
    }
  }else{res.writeHead(404).end();return;}
  let body=Buffer.from(JSON.stringify(value));
  const headers={'Content-Type':'application/json'};
  if(pageCount===1&&req.url.includes('/pages/')){
    if(mode==='escaped-echo')body=Buffer.from(body.toString().replace(downloadToken,Array.from(downloadToken).map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')));
    if(mode==='invalid-utf8')body=Buffer.from([0xc3,0x28]);
    if(mode==='wrong-mime')headers['Content-Type']='text/html';
    if(mode==='gzip-over'){body=gzipSync(Buffer.concat([Buffer.alloc(4*1024*1024+1,32),body]));headers['Content-Encoding']='gzip';}
    if(mode==='declared-over'){headers['Content-Length']=String(4*1024*1024+1);res.writeHead(200,headers).end(body);return;}
  }
  headers['Content-Length']=String(body.length);res.writeHead(200,headers).end(body);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const config={origin:`http://127.0.0.1:${server.address().port}`,...binding,clientKey:'synthetic-client',accessToken,exportId:'synthetic-export',downloadToken};
const cli=args=>new Promise((done,reject)=>{
  const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';const timer=setTimeout(()=>{child.kill();reject(Error('合成CLI超时'));},60000);
  child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('exit',status=>{clearTimeout(timer);assert.ok(![accessToken,downloadToken].some(secret=>(stdout+stderr).includes(secret)));done({status,stdout,stderr});});
});
const run=async(label,success=false,changes={})=>{
  mode=label;contextCount=0;manifestCount=0;pageCount=0;
  const path=resolve(root,label+'-config.json'),target=resolve(root,label+'-output');
  writeFileSync(path,JSON.stringify({...config,...changes}),{mode:0o600});
  const response=await cli(['scripts/ops/managed-exit-download.mjs',path,target]);
  assert.equal(response.status===0,success,label);
  const receipt=existsSync(resolve(target,'download-status.json'))?JSON.parse(readFileSync(resolve(target,'download-status.json'))):null;
  if(success){assert.equal(receipt.state,'VERIFIED');assert.equal(receipt.downloadedPages,23);assert.equal(receipt.requestCount,27);assert.equal(receipt.automaticRetries,0);assert.deepEqual(verifyManagedExitFiles(resolve(target,'manifest.json'),target),JSON.parse((await cli(['scripts/ops/managed-exit-verify.mjs',resolve(target,'manifest.json'),target])).stdout));}
  else if(receipt){assert.equal(receipt.state,'FAILED');assert.equal(receipt.verified,false);assert.equal(receipt.automaticRetries,0);}
  for(const file of existsSync(target)?readdirSync(target):[]){const bytes=readFileSync(resolve(target,file));assert.ok(![accessToken,downloadToken].some(secret=>bytes.includes(Buffer.from(secret))));}
  checks.push({name:label,passed:true,writtenPages:receipt?.downloadedPages??0,receivedPages:pageCount,receipt:receipt?.state??'NO_DIRECTORY'});
  process.stdout.write(JSON.stringify({case:label,passed:true})+'\n');return {path,target};
};
let failure;
try{
  const valid=await run('success',true);
  const before=Object.fromEntries(readdirSync(valid.target).map(file=>[file,exitSha(readFileSync(resolve(valid.target,file)))]));
  assert.notEqual((await cli(['scripts/ops/managed-exit-download.mjs',valid.path,valid.target])).status,0);
  for(const[file,sha]of Object.entries(before))assert.equal(exitSha(readFileSync(resolve(valid.target,file))),sha);
  checks.push({name:'existing-directory-immutable',passed:true});
  for(const label of ['role','cross-subject','redirect','tamper','missing','network','echo','escaped-echo','invalid-utf8','wrong-mime','gzip-over','declared-over','changed-manifest','late-revoke'])await run(label);
  assert.equal(sinkHits,0);assert.ok(requests.every(row=>row.method==='GET'));
  for(const changes of [{origin:'http://example.invalid'},{origin:config.origin+'/nested'},{origin:config.origin+'/?q=1'},{origin:'https://user:password@example.invalid'},{downloadToken:'invalid'},{customerId:'../other'}])await run('invalid-config-'+checks.length,false,changes);
  const bad=clone(manifest);bad.collections.users.rows++;assert.throws(()=>validateExitManifest(bad,binding));
  const normal=resolve(valid.target,'managed-users-0.json'),saved=readFileSync(normal);const altered=JSON.parse(saved);altered.payload[0].id='tampered-after-download';writeFileSync(normal,JSON.stringify(altered));
  assert.notEqual((await cli(['scripts/ops/managed-exit-verify.mjs',resolve(valid.target,'manifest.json'),valid.target])).status,0);writeFileSync(normal,saved);
  checks.push({name:'offline-tamper-rejected',passed:true});
  if(process.platform==='win32'){
    const linked=resolve(root,'junction-parent');execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command',`New-Item -ItemType Junction -Path '${linked.replaceAll("'","''")}' -Target '${root.replaceAll("'","''")}' | Out-Null`],{windowsHide:true,stdio:'pipe'});
    assert.notEqual((await cli(['scripts/ops/managed-exit-download.mjs',valid.path,resolve(linked,'forbidden-new-output')])).status,0);assert.equal(existsSync(resolve(root,'forbidden-new-output')),false);
    checks.push({name:'junction-parent-rejected',passed:true});
  }
}catch(error){failure=error;}
finally{for(const item of[server,sink]){item.closeAllConnections();await new Promise(done=>item.close(done));}}
const sources=Object.fromEntries(['scripts/ops/managed-exit-download.mjs','scripts/ops/managed-exit-format.mjs','scripts/ops/managed-exit-verify.mjs','pilots/managed-tenancy/verify-exit-download-loopback.mjs'].map(path=>[path,exitSha(readFileSync(resolve(repo,path)))]));
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),sources,checks,passed:checks.length,failed:failure?1:0,production:false,realServerAuthentication:false,realPostgres:false,sourceHistoricalSuitesRerun:false,onlyLoopback:true,sinkHits,allMethodsGet:requests.every(row=>row.method==='GET'),allServersClosed:true,actualWindowsAcl:process.platform==='win32',runtime:root};
writeFileSync(resolve(root,'review-report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:resolve(root,'review-report.json')}));
if(failure){writeFileSync(resolve(root,'diagnostic.txt'),failure.stack,{mode:0o600});process.exitCode=1;}
