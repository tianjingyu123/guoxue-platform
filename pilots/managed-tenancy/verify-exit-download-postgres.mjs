import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {ManagedPostgresHarness,repo,runtime} from './postgres-harness.mjs';
import {verifyManagedExitFiles,validateExitPage,canonicalExitJson,exitSha} from '../../scripts/ops/managed-exit-format.mjs';
const require=createRequire(resolve(repo,'apps/server/package.json')),{managedFenceStateSql}=require(resolve(repo,'apps/server/src/modules/managed-tenancy/managed-write-fence.ts'));
const h=new ManagedPostgresHarness('exit-download');let failure,a,port,admin,member,snapshot,config,proxy,sink,mode='pass',pageRequests=0,sinkRequests=0;
const calls=[],results=[],paths=[];
const cli=(args)=>new Promise(done=>{const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timer=setTimeout(()=>child.kill(),120000);child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.once('error',()=>{clearTimeout(timer);done({status:1,stdout,stderr});});child.once('exit',status=>{clearTimeout(timer);done({status,stdout,stderr});});});
const execute=async(label,changes={},success=false)=>{
  const credentialFile=resolve(runtime,h.tag+'-'+label+'-download-config.json'),target=resolve(runtime,h.tag+'-'+label+'-downloaded');writeFileSync(credentialFile,JSON.stringify({...config,...changes}),{mode:0o600});paths.push(target);
  const result=await cli(['scripts/ops/managed-exit-download.mjs',credentialFile,target]);assert.equal(result.status===0,success,label);
  for(const secret of[config.accessToken,config.downloadToken])assert.ok(!(result.stdout+result.stderr).includes(secret));
  const receipt=existsSync(resolve(target,'download-status.json'))?JSON.parse(readFileSync(resolve(target,'download-status.json'),'utf8')):null;
  if(success){assert.equal(receipt.state,'VERIFIED');assert.equal(receipt.verified,true);assert.equal(receipt.automaticRetries,0);for(const file of readdirSync(target)){const raw=readFileSync(resolve(target,file));assert.ok(!raw.includes(Buffer.from(config.accessToken)));assert.ok(!raw.includes(Buffer.from(config.downloadToken)));}}
  else if(receipt){assert.equal(receipt.state,'FAILED');assert.equal(receipt.verified,false);assert.equal(receipt.automaticRetries,0);}
  results.push({case:label,success,filesWritten:existsSync(target)?readdirSync(target).length:0,downloadedPages:receipt?.downloadedPages??0});return {result,target,receipt};
};
try{
  a=await h.application('a','a');const other=await h.application('a','other'),b=await h.application('b','b');await h.grantModules(a);port=await h.start(a,'a');const bp=await h.start(b,'b');
  admin=await h.account(port,a,'admin',true);const reader=await h.account(port,a,'reader'),otherAdmin=await h.login(port,other,admin),bAdmin=await h.account(bp,b,'b-admin',true);
  member=await h.control.managedMembership.findUnique({where:{customerId_userId:{customerId:a.customerId,userId:admin.userId}}});
  const image=await h.call(port,a,'/assets',admin.accessToken,'POST',{contentType:'image/png',dataBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5yoAAAAASUVORK5CYII='});assert.equal(image.status,201);
  const created=await h.call(port,a,'/exports/paged',admin.accessToken,'POST',{});assert.equal(created.status,201);snapshot=created.body;
  config={origin:`http://127.0.0.1:${port}`,customerId:a.customerId,applicationId:a.applicationId,clientKey:a.key,accessToken:admin.accessToken,exportId:snapshot.id,downloadToken:snapshot.downloadToken};
  const normal=await execute('all-pages',{},true),offline=verifyManagedExitFiles(resolve(normal.target,'manifest.json'),normal.target);assert.equal(offline.collections,22);assert.equal(offline.pages,Object.values(snapshot.manifest.collections).reduce((n,c)=>n+c.pages.length,0));assert.equal(offline.totalRows,snapshot.manifest.totalRows);assert.equal(offline.totalBytes,snapshot.manifest.totalBytes);assert.ok(offline.assets>=1);
  const independent=await cli(['scripts/ops/managed-exit-verify.mjs',resolve(normal.target,'manifest.json'),normal.target]);assert.equal(independent.status,0);assert.deepEqual(JSON.parse(independent.stdout),offline);
  h.record('独立Node CLI经实际Nest/PG下载22集合清单及全部分页到受限新目录，再由独立离线CLI从文件核行数、字节、每页与附件SHA，凭据未落入退出文件');
  const immutable=Object.fromEntries(readdirSync(normal.target).map(file=>[file,exitSha(readFileSync(resolve(normal.target,file)))]));
  const credentialFile=resolve(runtime,h.tag+'-all-pages-download-config.json'),overwritten=await cli(['scripts/ops/managed-exit-download.mjs',credentialFile,normal.target]);assert.notEqual(overwritten.status,0);for(const[file,sha]of Object.entries(immutable))assert.equal(exitSha(readFileSync(resolve(normal.target,file))),sha);
  h.record('已有下载目录拒绝覆盖，清单、分页及VERIFIED回执原字节保持不变');
  await execute('wrong-customer',{customerId:b.customerId});await execute('ordinary-user',{accessToken:reader.accessToken});await execute('other-application',{applicationId:other.applicationId,clientKey:other.key,accessToken:otherAdmin.accessToken});await execute('other-customer',{origin:`http://127.0.0.1:${bp}`,customerId:b.customerId,applicationId:b.applicationId,clientKey:b.key,accessToken:bAdmin.accessToken});
  assert.ok(results.filter(r=>['wrong-customer','ordinary-user','other-application','other-customer'].includes(r.case)).every(r=>r.filesWritten===0));
  h.record('客户绑定不符、普通成员、同客户另一应用及另一客户真实鉴权均拒绝，身份预检失败不创建下载目录');
  const epoch=(await h.a.managedLeaseWriteFence.findUnique({where:{customerId:a.customerId}})).epoch;h.adminSql('mt_customer_a',managedFenceStateSql(a.customerId,'FROZEN',epoch));
  const auditBefore=await h.a.managedLeaseAudit.count({where:{action:{in:['DOWNLOAD_EXPORT','DOWNLOAD_EXPORT_PAGE']}}});await execute('frozen-existing',{},true);assert.equal(await h.a.managedLeaseAudit.count({where:{action:{in:['DOWNLOAD_EXPORT','DOWNLOAD_EXPORT_PAGE']}}}),auditBefore);
  const frozen=await h.a.managedLeaseWriteFence.findUnique({where:{customerId:a.customerId}});h.adminSql('mt_customer_a',managedFenceStateSql(a.customerId,'ACTIVE',frozen.epoch));
  h.record('FROZEN期间只下载已建快照，22集合及全部分页验真通过，未新增下载审计或重新建立快照');
  sink=createServer((_req,res)=>{sinkRequests++;res.writeHead(200).end('{}');});await new Promise(done=>sink.listen(0,'127.0.0.1',done));
  proxy=createServer((req,res)=>{
    calls.push({method:req.method,path:req.url});if(req.method!=='GET'||!req.url.startsWith('/api/v1/lease/')){res.writeHead(405).end();return;}
    if(mode==='redirect'&&req.url.endsWith('/context')){res.writeHead(302,{Location:`http://127.0.0.1:${sink.address().port}/foreign`}).end();return;}
    const isPage=req.url.includes('/pages/');if(isPage)pageRequests++;
    const upstream=request({hostname:'127.0.0.1',port,path:req.url,method:'GET',headers:{...req.headers,host:'127.0.0.1:'+port}},response=>{
      const parts=[];response.on('data',b=>parts.push(b));response.on('end',()=>{void(async()=>{
        let body=Buffer.concat(parts),status=response.statusCode,headers={...response.headers};delete headers['content-length'];delete headers['transfer-encoding'];
        if(isPage&&pageRequests===1){
          if(mode==='missing'){status=404;body=Buffer.from(JSON.stringify({error:'SYNTHETIC_ERROR_NEVER_SAVED',downloadToken:config.downloadToken}));}
          else if(mode==='tamper'){const value=JSON.parse(body);value.payload[0].id='synthetic-tampered-id';body=Buffer.from(JSON.stringify(value));}
          else if(mode==='credential-echo'||mode==='credential-escaped'){const value=JSON.parse(body);value.echo=config.downloadToken;const text=JSON.stringify(value);body=Buffer.from(mode==='credential-escaped'?text.replace(config.downloadToken,Array.from(config.downloadToken).map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')):text);}
          else if(mode==='gzip-over'){body=gzipSync(Buffer.concat([Buffer.from(' '.repeat(4*1024*1024+1)),body]));headers['content-encoding']='gzip';assert.ok(body.length<64*1024);}
          else if(mode==='revoke')await h.control.managedMembership.update({where:{id:member.id},data:{enabled:false,revision:{increment:1}}});
        }
        if(mode==='late-revoke'&&isPage&&pageRequests===offline.pages)await h.control.managedMembership.update({where:{id:member.id},data:{enabled:false,revision:{increment:1}}});
        headers['content-length']=String(body.length);res.writeHead(status,headers).end(body);
      })().catch(()=>res.writeHead(502).end());});
    });upstream.on('error',()=>res.writeHead(502).end());upstream.end();
  });await new Promise(done=>proxy.listen(0,'127.0.0.1',done));const proxyOrigin=`http://127.0.0.1:${proxy.address().port}`;
  for(const scenario of['tamper','missing','credential-echo','credential-escaped','gzip-over']){mode=scenario;pageRequests=0;const failed=await execute(scenario,{origin:proxyOrigin});assert.equal(pageRequests,1);assert.equal(failed.receipt.downloadedPages,0);assert.equal(failed.receipt.state,'FAILED');}
  h.record('实际HTTP篡改、缺页、凭据回显及gzip解压后超4MiB均拒绝，不保存失败页、不重试、不生成VERIFIED，部分资料保留明确FAILED回执');
  mode='redirect';pageRequests=0;await execute('cross-origin-redirect',{origin:proxyOrigin});assert.equal(sinkRequests,0);
  h.record('响应重定向拒绝，第二HTTP源站实际收到0次请求，认证和下载凭据不被转发');
  for(const scenario of['revoke','late-revoke']){
    mode=scenario;pageRequests=0;const failed=await execute(scenario,{origin:proxyOrigin});assert.equal(failed.receipt.state,'FAILED');if(scenario==='revoke')assert.equal(failed.receipt.downloadedPages,1);else assert.equal(failed.receipt.downloadedPages,offline.pages);
    // 只恢复本测试新建管理员的合成故障注入，保留失败目录及已有事实。
    await h.control.managedMembership.update({where:{id:member.id},data:{enabled:member.enabled,revision:member.revision}});
  }
  h.record('真实PG撤销管理员后下一页拒绝；全部页已写入后撤权仍由最终远端复核拒绝，两个目录均FAILED、不发布完整导出结论');
  const assetFile=readdirSync(normal.target).find(n=>n.startsWith('managed-assets-')),asset=JSON.parse(readFileSync(resolve(normal.target,assetFile),'utf8'));asset.payload[0].dataBase64+='\n';asset.sha256=exitSha(canonicalExitJson(asset.payload));assert.throws(()=>validateExitPage(asset,'assets',asset.page,{rows:1,sha256:asset.sha256}));
  const manifest=JSON.parse(readFileSync(resolve(normal.target,'manifest.json'),'utf8'));manifest.collections.users.rows++;const badManifest=resolve(runtime,h.tag+'-bad-manifest.json');writeFileSync(badManifest,JSON.stringify(manifest),{mode:0o600});assert.notEqual((await cli(['scripts/ops/managed-exit-verify.mjs',badManifest,normal.target])).status,0);
  h.record('离线验真器拒绝非规范Base64附件和集合总行数篡改，正常已验证目录始终不修改');
  assert.ok(calls.every(c=>c.method==='GET'));assert.equal((await h.call(bp,b,'/context',bAdmin.accessToken)).status,200);
  writeFileSync(resolve(runtime,h.tag+'-download-summary.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),workingTreeDirty:!!execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim(),production:false,version:3,collections:22,pages:offline.pages,totalRows:offline.totalRows,totalBytes:offline.totalBytes,assets:offline.assets,normalFiles:readdirSync(normal.target).length,normalManifestSha256:exitSha(readFileSync(resolve(normal.target,'manifest.json'))),normalReceiptSha256:exitSha(readFileSync(resolve(normal.target,'download-status.json'))),allClientMethodsGet:true,crossOriginSinkRequests:0,automaticRetries:0,credentialsSaved:false,cases:results,browserUiVerified:false,mpAppVerified:false},null,2)+'\n',{mode:0o600});
  h.record('所有采集请求仅GET，另一客户持续可用；仅归档无凭据的计数及用例摘要，退出实际数据保留受限目录，不算浏览器或真机验收');
}catch(error){failure=error;}finally{
  if(member)await h.control.managedMembership.update({where:{id:member.id},data:{enabled:member.enabled,revision:member.revision}});
  if(a){const fence=await h.a.managedLeaseWriteFence.findUnique({where:{customerId:a.customerId}});if(fence?.state==='FROZEN')h.adminSql('mt_customer_a',managedFenceStateSql(a.customerId,'ACTIVE',fence.epoch));}
  for(const server of[proxy,sink])if(server){server.closeAllConnections();await new Promise(done=>server.close(done));}await h.close();
}
h.report(resolve(process.argv[2]??resolve(runtime,'exit-download-postgres.json')),['scripts/ops/managed-exit-download.mjs','scripts/ops/managed-exit-format.mjs','scripts/ops/managed-exit-verify.mjs','apps/server/src/modules/managed-tenancy/managed-lease-export.ts','apps/server/src/modules/managed-tenancy/managed-lease.runtime.ts','pilots/managed-tenancy/verify-exit-download-postgres.mjs'],failure,['本机真实Nest/PostgreSQL与独立Node CLI，故障HTTP代理仅本任务loopback；没有外部客户或媒体','只GET已有快照，但ACTIVE服务端仍记录正常下载审计；FROZEN路径不新增下载审计','成功和失败数据均保留受限目录，不覆盖、不自动删除、不将部分下载发布为完成','本工具实际文件落盘通过不等于H5按钮、MP/App真机或外部COS/供应商内容迁出']);
