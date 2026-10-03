import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ManagedPostgresHarness,runtime,repo} from './postgres-harness.mjs';
process.env.NODE_ENV='test';process.env.CLIENT_CAPABILITY_ENVIRONMENT='test';
const require=createRequire(resolve(repo,'apps/server/package.json')),{ClientPresentationService}=require(resolve(repo,'apps/server/src/modules/feature-flag/client-presentation.service.ts'));
const h=new ManagedPostgresHarness('client-preview'),engine=new ClientPresentationService(h.control);let server,stopPreview,previousLayout;
try{
  previousLayout=(await engine.history())[0];const app=await h.application('a','web');await h.control.appDistribution.update({where:{clientKey:app.key},data:{channelId:'web'}});await h.grantModules(app,{product:[],course:[],circle:[],agent:[]});const port=await h.start(app),admin=await h.account(port,app,'admin',true);
  const call=async(path,method='GET',body)=>{const r=await h.call(port,app,path,admin.accessToken,method,body);assert.ok(r.status>=200&&r.status<300,`${path}未通过：${r.status}`);return r.body};
  const image=await call('/assets','POST',{contentType:'image/png',dataBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5yoAAAAASUVORK5CYII='});
  const product=await call('/manage/product','POST',{title:'四季读书手账',intro:'把每一次阅读留在纸上',detail:'合成展示商品。纸质手账，适合记录课程要点与每日心得。当前候选未开通支付。',price:29.8,stock:8,assetIds:[image.id]});await call('/manage/product/'+product.id+'/review','POST',{revision:1,status:'ON_SALE',reason:'本地页面验收用合成图文审核'});
  const course=await call('/manage/course','POST',{title:'阅读与思考入门',intro:'从第一章开始，建立自己的学习记录',price:0,validityDays:0,assetIds:[]});await call('/manage/course/'+course.id+'/chapters','POST',{revision:1,title:'如何做一页阅读笔记',content:'先写下一个问题，再记录你在阅读中找到的证据。完成本章后，可以保存学习进度。',sortOrder:0,freeTrial:false});await call('/manage/course/'+course.id+'/review','POST',{revision:2,status:'APPROVED',reason:'本地页面验收课程审核'});
  const circle=await call('/manage/circle','POST',{name:'一起读书',intro:'分享心得与讨论课程的免费圈子'});await call('/manage/circle/'+circle.id+'/review','POST',{revision:1,status:'ACTIVE',needApproval:false,reason:'本地免费圈人工审核'});
  const agent=await call('/manage/agent','POST',{name:'阅读助手',persona:'协助整理本圈已授权的阅读内容',circleId:circle.id});await call('/manage/agent/'+agent.id+'/review','POST',{revision:1,status:'APPROVED',reason:'本地助手公开说明审核'});
  const config=resolve(runtime,'client-preview-public.json');writeFileSync(config,JSON.stringify({applicationId:app.applicationId,clientKey:app.key,name:'合成经营客户',apiOrigin:'',channel:'local-candidate',versionName:'1.0.0',versionCode:1}));
  const build=spawnSync(process.execPath,['scripts/ops/managed-client-build.mjs',config,'h5'],{cwd:repo,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});assert.equal(build.status,0,'页面候选构建失败');const built=JSON.parse(build.stdout.trim().split('\n').at(-1)),root=resolve(built.output);
  const receipt=JSON.parse(readFileSync(built.receipt,'utf8')),scope={applicationId:app.applicationId,platform:'h5',channelId:'web'};
  await engine.registerCapabilities({...scope,nativeBuild:'1',minResourceVersion:'1',maxResourceVersion:'1',profileId:'managed-presentation-v1',sourceSha:receipt.head,installedPackageSha256:createHash('sha256').update(JSON.stringify(receipt.files)).digest('hex'),verificationLevel:'synthetic'},'synthetic-maintainer','本任务预览资源摘要合成登记，不冒充渠道安装验收');
  const draft=await engine.saveDraft({schemaVersion:1,rules:[{...scope,id:'preview-'+Date.now(),priority:10,percentage:100,minNativeBuild:'1',maxNativeBuild:'1',minResourceVersion:'1',maxResourceVersion:'1',config:{schemaVersion:1,entries:[{id:'course',visible:true,order:0,label:'阅读课程'},{id:'mall',visible:true,order:1},{id:'circles',visible:true,order:2},{id:'agent',visible:true,order:3}],navigation:[],homeChannels:['recommend'],pages:{home:[{id:'study-notice',type:'notice',title:'本机构学习公告',text:'先学习课程，再到圈子分享阅读心得。',entries:[]},{id:'study-links',type:'entry-grid',title:'从这里开始',text:'',entries:['course','circles','agent'],columns:3}],course:[{id:'course-guide',type:'richtext',title:'阅读与记录',text:'阅读正文后保存学习进度，下次从已有记录继续。',entries:[]}]}}}]},'本地页面编排预览草稿','synthetic-maintainer');await engine.publish(draft.id,'synthetic-maintainer','本地页面编排预览发布');
  server=createServer((req,res)=>{
    if(req.url==='/__qa-stop'&&req.method==='POST'){res.writeHead(200);res.end('本任务预览正在结束');stopPreview?.();return;}
    if(req.url.startsWith('/api/')){const proxied=request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:'+port}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});proxied.on('error',()=>{res.writeHead(503);res.end('本地候选接口暂不可用')});req.pipe(proxied);return;}
    let target=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/managed\/?/,'');if(!target||!extname(target))target='index.html';const file=resolve(root,target);if(!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
    try{if(!statSync(file).isFile())throw Error();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'}[extname(file)]||'application/octet-stream'),'Cache-Control':'no-store'});res.end(readFileSync(file))}catch{res.writeHead(404);res.end();}
  });await new Promise(done=>server.listen(0,'127.0.0.1',done));const url='http://127.0.0.1:'+server.address().port+'/managed/';
  // 仅合成页面测试账号写入受限忽略目录；不在工具输出或证据报告中列出密码。
  writeFileSync(resolve(runtime,'client-preview-private.json'),JSON.stringify({username:admin.username,password:h.password}),{mode:0o600});writeFileSync(resolve(runtime,'client-preview-state.json'),JSON.stringify({url,applicationId:app.applicationId,receipt:built.receipt}),{mode:0o600});console.log(JSON.stringify({ready:true,url,syntheticUsername:admin.username}));
  await new Promise(done=>{stopPreview=done;process.once('SIGTERM',done);process.once('SIGINT',done);process.stdin.resume();process.stdin.once('data',done)});
}finally{if(server)await new Promise(done=>server.close(done));if(previousLayout)await engine.rollback(previousLayout.version,'synthetic-maintainer','本地页面预览恢复之前公共配置');await h.close();}
