import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

// 仅供独立验证分支：临时空库、封闭容器网络，不连接真实业务数据库或渠道。
const image = process.env.IMAGE_TAG;
assert.equal(image, "rebu-linux-verify:b6d1f59c");
const sourceCommit = "b6d1f59cf0dc3c0ee0d8b8609726f5aec4d7297b";
const sourceSha256 = "c666741a8da449ea610af565954d03979f8829f69986904a4911bf81e55ce047";
const postgresImage = "pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff";
const redisImage = "redis:7-alpine@sha256:e7723ff73d963f5cc6d9c4643ea3d989527a402a319239054e9472a7fb9219a2";
const suffix = randomBytes(5).toString("hex");
const network = `rebu-verify-${suffix}`;
const database = `rebu-db-${suffix}`;
const redis = `rebu-redis-${suffix}`;
const app = `rebu-app-${suffix}`;
const secondApp = `rebu-app-second-${suffix}`;
const temp = mkdtempSync(path.join(os.tmpdir(), "rebu-image-lab-"));
const password = randomBytes(24).toString("hex");
const databaseUrl = `postgresql://guoxue:${password}@${database}:5432/guoxue`;
const jwt = randomBytes(32).toString("hex");
const encryption = randomBytes(16).toString("hex");
const bigscreen = randomBytes(32).toString("hex");
const sensitive = [password, databaseUrl, jwt, encryption, bigscreen];
for (const value of sensitive) console.log(`::add-mask::${value}`);
const sanitize = (text) => sensitive.reduce((safe, value) => safe.split(value).join("[已隐藏]"), String(text));
const results = path.resolve("results");
mkdirSync(results, { recursive: true });
const report = { sourceCommit, sourceSha256, image, postgresImage, redisImage, scope: "isolated-empty-db-no-real-channels", checks: [], passed: false };
const docker = (args, allowFailure = false) => {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
  if (!allowFailure && result.status !== 0) throw new Error(sanitize(result.stderr || result.stdout || result.error?.message || "Docker 子进程失败"));
  return sanitize(result.stdout || "");
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const save = (name, value) => writeFileSync(path.join(results, name), JSON.stringify(value, null, 2) + "\n");
const check = (name, detail) => report.checks.push({ name, passed: true, detail });
const parseTestResult = (output) => JSON.parse(output.trim().split("\n").findLast(line => line.startsWith("NODE_TEST_RESULT:"))?.slice(17) || "null");
const appNode = (code) => parseTestResult(docker(["exec", app, "node", "-e", code]));
const concurrentNode = (code) => new Promise((resolve, reject) => {
  const child = spawn("docker", ["exec", app, "node", "-e", code]);
  let output = "";
  let errors = "";
  const timer = setTimeout(() => { child.kill(); reject(new Error("独立通知进程超时")); }, 30000);
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { errors += chunk; });
  child.on("error", error => { clearTimeout(timer); reject(error); });
  child.on("close", status => {
    clearTimeout(timer);
    if (status === 0) resolve(parseTestResult(output));
    else reject(new Error(sanitize(errors || output || "通知子进程失败")));
  });
});

try {
  const inspect = JSON.parse(docker(["image", "inspect", image]))[0];
  assert.equal(inspect.Os, "linux");
  assert.equal(inspect.Architecture, "amd64");
  assert.equal(inspect.Config.Labels["org.opencontainers.image.revision"], sourceCommit);
  assert.equal(inspect.Config.Labels["rebu.source-archive.sha256"], sourceSha256);
  save("image-identity.json", { id: inspect.Id, os: inspect.Os, architecture: inspect.Architecture, sourceCommit, sourceSha256 });
  check("image-identity", inspect.Id);
  docker(["run", "--rm", "--network", "none", "--entrypoint", "node", image, "scripts/release/verify-prisma-build.mjs", "apps/server", "--verify", "/app/prisma-build-receipt.json"]);
  const receipt = JSON.parse(docker(["run", "--rm", "--network", "none", "--entrypoint", "node", image, "-e", "process.stdout.write(require('fs').readFileSync('/app/prisma-build-receipt.json'))"]));
  save("prisma-runtime-receipt.json", receipt);
  check("prisma-source-compile-runtime-binding", receipt);
  // 核对正式运行镜像中SDK真实解析的修复版，不能只凭宿主锁文件认定已升级。
  const grpcCode = `const {createRequire}=require('module'); const fs=require('fs'); const assert=require('assert/strict'); const r=createRequire('/app/apps/server/package.json'); const sdk=r.resolve('@opentelemetry/sdk-node'); const exporter=createRequire(sdk).resolve('@opentelemetry/exporter-logs-otlp-grpc'); const grpc=createRequire(exporter).resolve('@grpc/grpc-js/package.json'); const version=JSON.parse(fs.readFileSync(grpc)).version; assert.equal(version,'1.14.5'); process.stdout.write(JSON.stringify({version,actualSdkExporterResolution:true}));`;
  const grpcReport = JSON.parse(docker(["run", "--rm", "--network", "none", "--entrypoint", "node", image, "-e", grpcCode]));
  save("grpc-runtime-version.json", grpcReport);
  check("grpc-security-version-in-runtime-image", grpcReport);
  const staticCheck = `const fs=require('fs'); const assert=require('assert/strict'); const result=[]; for(const [name,prefix] of [['admin','/admin/'],['h5','/h5/']]) { const root='/app/'+name+'-dist'; const html=fs.readFileSync(root+'/index.html','utf8'); assert(html.includes(prefix+'assets/')); const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(p+'/'+d.name):[p+'/'+d.name]); const files=walk(root); const texts=files.filter(f=>/\\.(js|html|css)$/.test(f)).map(f=>fs.readFileSync(f,'utf8')); assert(texts.some(t=>t.includes('https://api.rebugx.cn'))); assert(!texts.some(t=>t.includes('https://pre-api.rebugx.cn'))); if(name==='h5') assert(texts.some(t=>t.includes('https://static.rebugx.cn'))); result.push({name,prefix,fileCount:files.length}); } process.stdout.write(JSON.stringify(result));`;
  const staticReport = JSON.parse(docker(["run", "--rm", "--network", "none", "--entrypoint", "node", image, "-e", staticCheck]));
  save("static-mounts.json", staticReport);
  check("admin-h5-base-and-public-config", staticReport);
  docker(["pull", postgresImage]);
  docker(["pull", redisImage]);
  docker(["network", "create", "--internal", network]);
  const dbEnv = path.join(temp, "database.env");
  writeFileSync(dbEnv, `POSTGRES_USER=guoxue\nPOSTGRES_DB=guoxue\nPOSTGRES_PASSWORD=${password}\n`, { mode: 0o600 });
  docker(["run", "-d", "--name", database, "--network", network, "--env-file", dbEnv, postgresImage]);
  docker(["run", "-d", "--name", redis, "--network", network, redisImage]);
  let dbReady = false;
  for (let i = 0; i < 30; i++) {
    const result = spawnSync("docker", ["exec", database, "pg_isready", "-U", "guoxue", "-d", "guoxue"], { stdio: "ignore", timeout: 10000 });
    if (result.status === 0) { dbReady = true; break; }
    await sleep(2000);
  }
  assert(dbReady, "临时数据库启动超时");
  const pgVersion = docker(["exec", database, "psql", "-U", "guoxue", "-d", "guoxue", "-Atc", "SHOW server_version"]).trim();
  assert(pgVersion.startsWith("18."));
  check("postgres-major-match", { actual: pgVersion, targetObserved: "18.4", patchMatchRequiredForFinalAcceptance: true });
  const appEnv = path.join(temp, "application.env");
  writeFileSync(appEnv, [
    "NODE_ENV=production", "PORT=3000", `DATABASE_URL=${databaseUrl}`, `REDIS_URL=redis://${redis}:6379`,
    `JWT_SECRET=${jwt}`, `ENCRYPTION_KEY=${encryption}`, `BIGSCREEN_SECRET=${bigscreen}`,
    "RUN_DB_MIGRATIONS=false", "BULLMQ_DISABLED=true", "TENCENT_CREDENTIAL_MODE=static",
    "PUBLIC_DOMAIN=api.example.invalid", "PUBLIC_API_URL=https://api.example.invalid",
    "PUBLIC_H5_URL=https://h5.example.invalid/h5/", "PUBLIC_ASSET_ORIGIN=https://assets.example.invalid",
    "CORS_ORIGIN=https://h5.example.invalid", "WS_CORS_ORIGIN=https://h5.example.invalid",
    "RELEASE_ID=isolated-b6d1f59c",
  ].join("\n") + "\n", { mode: 0o600 });
  const schemaOutput = docker(["run", "--rm", "--network", network, "--env-file", appEnv, "--entrypoint", "pnpm", image, "--dir", "/app/apps/server", "exec", "prisma", "db", "push", "--skip-generate"]);
  writeFileSync(path.join(results, "temporary-schema.log"), schemaOutput);
  check("temporary-empty-db-final-schema", "仅创建临时空库结构，不验证生产迁移链");
  // 临时公私钥在封闭容器内生成并加密入临时库，由正式配置加载器读取；不伪造 DB 来源标记。
  const callbackCode = readFileSync(new URL("./verify-isolated-payment-http.cjs", import.meta.url), "utf8");
  const callbackSeed = parseTestResult(docker(["run", "--rm", "--network", network, "--env-file", appEnv,
    "-e", "ISOLATED_PAYMENT_SEED=1", "--entrypoint", "node", image, "-e", callbackCode]));
  assert(callbackSeed.syntheticEncryptedConfig);
  // 内部网络封锁外部渠道。HTTP 核验在同一封闭网络内的镜像中发起，不开放主机端口。
  docker(["run", "-d", "--name", app, "--network", network, "--env-file", appEnv, image]);
  let ready = false;
  for (let i = 0; i < 45; i++) {
    const running = JSON.parse(docker(["inspect", "--format", "{{json .State}}", app]));
    if (!running.Running) throw new Error("正式入口进程提前退出");
    // 读取状态而不依赖请求体日志。
    const probe = spawnSync("docker", ["exec", app, "node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health/ready',{signal:AbortSignal.timeout(3000)}).then(r=>{process.exitCode=r.status===200?0:1}).catch(()=>{process.exitCode=1})"], { stdio: "ignore", timeout: 10000 });
    if (probe.status === 0) { ready = true; break; }
    await sleep(2000);
  }
  assert(ready, "正式入口就绪超时");
  const routes = ["/api/v1/health/live", "/api/v1/health/ready", "/api/v1/health", "/api/v1/mini/home", "/api/v1/contents?page=1&pageSize=1"];
  const httpScript = `Promise.all(${JSON.stringify(routes)}.map(async path=>{const r=await fetch('http://127.0.0.1:3000'+path); const body=await r.json(); return {path,status:r.status,releaseId:body.data?.releaseId||body.releaseId||null};})).then(rows=>{process.stdout.write(JSON.stringify(rows)); if(rows.some(r=>r.status!==200)) process.exitCode=1;}).catch(()=>{process.exitCode=1;})`;
  const http = JSON.parse(docker(["exec", app, "node", "-e", httpScript]));
  assert(http.filter(r => r.path === "/api/v1/health/live" || r.path === "/api/v1/health").every(r => r.releaseId === "isolated-b6d1f59c"));
  save("http-startup.json", http);
  check("production-entrypoint-health-public-http", http);

  // 使用正式入口、真实 JWT/Redis/角色守卫；只在临时空库创建无个人信息的合成记录。
  const fixture = appNode(`
    const {createRequire}=require('module'); const req=createRequire('/app/apps/server/package.json');
    const {PrismaClient}=req('@prisma/client'); const p=new PrismaClient();
    (async()=>{try {
      for(const [id,role] of [['linux-user-a',null],['linux-user-b',null],['linux-super','SUPER_ADMIN'],['linux-ops','OPERATION_ADMIN'],['linux-finance','FINANCE_ADMIN'],['linux-customer','CUSTOMER_SERVICE']])
        await p.user.create({data:{id,nickname:'隔离验收用户',...(role?{roles:{create:{roleType:role}}}:{})}});
      await p.order.create({data:{id:'linux-order-b',userId:'linux-user-b',type:'COURSE',targetId:'isolated-course',amount:1,status:'PAID'}});
      await p.notification.create({data:{id:'linux-notification-a',userId:'linux-user-a',type:'SYSTEM',title:'隔离权限测试',content:'仅合成数据',targetType:'ORDER',targetId:'linux-order-b'}});
      // 正式启动可能自动建立系统账号；只核本次明确创建的合成主键，不能假定全表为六行。
      console.log('NODE_TEST_RESULT:'+JSON.stringify({users:await p.user.count({where:{id:{in:['linux-user-a','linux-user-b','linux-super','linux-ops','linux-finance','linux-customer']}}}),orders:await p.order.count({where:{id:'linux-order-b'}}),notifications:await p.notification.count({where:{id:'linux-notification-a'}})}));
    } finally {await p.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`);
  assert.equal(fixture.users, 6);
  const permissionReport = appNode(`
    const {createRequire}=require('module');const req=createRequire('/app/apps/server/package.json'); const jwt=req('jsonwebtoken');
    const cases=[
      ['notification-anonymous',null,'/notifications/linux-notification-a',401],
      ['notification-owner','linux-user-a','/notifications/linux-notification-a',200],
      ['notification-cross-user','linux-user-b','/notifications/linux-notification-a',404],
      ['notification-target-cross-user','linux-user-a','/shop/orders/linux-order-b',403],
      ['notification-target-owner','linux-user-b','/shop/orders/linux-order-b',200],
      ['admin-history-super','linux-super','/notifications/admin/sent',200],
      ['admin-history-ops','linux-ops','/notifications/admin/sent',200],
      ['admin-history-customer-denied','linux-customer','/notifications/admin/sent',403],
      ['admin-history-finance-denied','linux-finance','/notifications/admin/sent',403],
      ['feedback-list-customer','linux-customer','/users/admin/feedback',200],
      ['feedback-list-finance-denied','linux-finance','/users/admin/feedback',403],
      ['full-profile-super','linux-super','/users/linux-user-a/profile',200],
      ['full-profile-customer-denied','linux-customer','/users/linux-user-a/profile',403],
      ['full-profile-finance-denied','linux-finance','/users/linux-user-a/profile',403]
    ];
    (async()=>{const rows=[];for(const [name,user,path,expected] of cases){const headers=user?{Authorization:'Bearer '+jwt.sign({sub:user,sessionIssuedAt:Date.now()},process.env.JWT_SECRET,{expiresIn:'5m'})}:{};
      const response=await fetch('http://127.0.0.1:3000/api/v1'+path,{headers,signal:AbortSignal.timeout(10000)});
      rows.push({name,status:response.status,expected,passed:response.status===expected});
    } console.log('NODE_TEST_RESULT:'+JSON.stringify(rows));})().catch(e=>{console.error(e.message);process.exitCode=1});`);
  save("http-permissions.json", permissionReport);
  assert(permissionReport.every(item => item.passed), "正式 HTTP 权限用例存在失败，见 http-permissions.json");
  check("real-jwt-global-guards-cross-user-and-admin-roles", permissionReport);

  // 合成反馈的敏感查看与审计；原始字段只在封闭容器中断言，不写结果或日志。
  const sensitiveReport = appNode(`
    const {createRequire}=require('module');const req=createRequire('/app/apps/server/package.json');
    const assert=require('assert/strict');const jwt=req('jsonwebtoken');const {PrismaClient}=req('@prisma/client');const p=new PrismaClient();
    const {RedisService}=require('/app/apps/server/dist/redis/redis.service');const r=new RedisService();
    const contact='ISOLATED-CONTACT-DO-NOT-USE';const content='合成反馈正文，禁止用于真实用户：19900000000';
    const imageUrl='https://screenshots.example.invalid/isolated.png';const id='linux-feedback-sensitive';
    const rows=[];const send=async(name,user,path,expected,method='GET',body,expired=false)=>{
      const headers={Authorization:'Bearer '+jwt.sign({sub:user,sessionIssuedAt:Date.now()},process.env.JWT_SECRET,{expiresIn:expired?-60:'5m'})};
      if(body)headers['Content-Type']='application/json';
      const response=await fetch('http://127.0.0.1:3000/api/v1'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();rows.push({name,status:response.status,expected,passed:response.status===expected});
      assert.equal(response.status,expected,name);return data.data||data;
    };
    (async()=>{try{
      await r.pingShared();await p.feedback.create({data:{id,userId:'linux-user-a',type:'bug',content,contact,images:[imageUrl]}});
      await send('notification-expired-jwt','linux-user-a','/notifications/linux-notification-a',401,'GET',null,true);
      for(const user of ['linux-super','linux-ops','linux-customer']){
        const detail=await send('feedback-masked-'+user,user,'/users/admin/feedback/'+id,200);
        assert.equal(detail.contact,undefined);assert.equal(detail.images,undefined);assert.notEqual(detail.contactMasked,contact);
        assert(!JSON.stringify(detail).includes('19900000000'));assert(!JSON.stringify(detail).includes(imageUrl));
      }
      for(const user of ['linux-super','linux-ops','linux-customer','linux-finance','linux-user-a']){
        for(const kind of ['contact','content','images']){
          const allowed=['linux-super','linux-ops'].includes(user)||(user==='linux-customer'&&kind!=='images');
          const result=await send('feedback-reveal-'+kind+'-'+user,user,'/users/admin/feedback/'+id+'/reveal-'+kind,allowed?201:403,'POST');
          if(allowed){if(kind==='contact')assert.equal(result.contact,contact);if(kind==='content')assert.equal(result.content,content);if(kind==='images')assert.deepEqual(result.images,[imageUrl]);}
        }
      }
      await send('feedback-invalid-status-query','linux-super','/users/admin/feedback?status=not-a-status',400);
      await send('feedback-invalid-page-query','linux-super','/users/admin/feedback?page=0',400);
      await send('feedback-invalid-status-body','linux-super','/users/admin/feedback/'+id+'/status',400,'PUT',{status:'not-a-status'});
      assert.equal((await p.feedback.findUnique({where:{id}})).status,'pending');
      // 当前正式策略：SensitiveRedisThrottleGuard 不接受任何白名单豁免。
      // HTTP来源为环回IP，再添加用户白名单，仍应按超级管理员本人累计至10次。
      await r.setJson('admin:whitelist',['linux-super'],60);
      for(let n=4;n<=10;n++)await send('sensitive-count-'+n,'linux-super','/users/admin/feedback/'+id+'/reveal-contact',201,'POST');
      await send('sensitive-whitelisted-eleventh-denied','linux-super','/users/admin/feedback/'+id+'/reveal-contact',429,'POST');
      let audits=[];for(let n=0;n<20;n++){
        audits=await p.auditLog.findMany({where:{targetType:'FEEDBACK',targetId:id,action:{in:['查看反馈联系方式','查看反馈正文原文','查看反馈截图']}}});
        if(audits.length===15)break;await new Promise(done=>setTimeout(done,100));
      }
      assert.equal(audits.length,15);assert.equal(audits.filter(a=>a.userId==='linux-super').length,10);
      assert.equal(audits.filter(a=>a.userId==='linux-ops').length,3);assert.equal(audits.filter(a=>a.userId==='linux-customer').length,2);
      assert(audits.every(a=>a.ip&&a.targetId===id&&!JSON.stringify(a).includes(contact)&&!JSON.stringify(a).includes(content)&&!JSON.stringify(a).includes(imageUrl)));
      const failedId='linux-feedback-audit-fail';
      await p.feedback.create({data:{id:failedId,userId:'linux-user-a',type:'bug',content,contact,images:[imageUrl]}});
      await p.$executeRawUnsafe(${JSON.stringify('CREATE FUNCTION isolated_feedback_audit_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = \'linux-feedback-audit-fail\' THEN RAISE EXCEPTION \'isolated audit unavailable\'; END IF; RETURN NEW; END $$')});
      await p.$executeRawUnsafe('CREATE TRIGGER isolated_feedback_audit_reject BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION isolated_feedback_audit_reject()');
      for(const kind of ['contact','content','images']){
        const error=await send('feedback-audit-failure-withholds-'+kind,'linux-ops','/users/admin/feedback/'+failedId+'/reveal-'+kind,503,'POST');
        const text=JSON.stringify(error);assert(!text.includes(contact));assert(!text.includes(content));assert(!text.includes(imageUrl));assert(!text.includes('isolated audit unavailable'));
      }
      assert.equal(await p.auditLog.count({where:{targetId:failedId}}),0);
      await p.$executeRawUnsafe('DROP TRIGGER isolated_feedback_audit_reject ON "AuditLog"');
      await p.$executeRawUnsafe('DROP FUNCTION isolated_feedback_audit_reject()');
      for(const kind of ['contact','content','images']){
        const result=await send('feedback-audit-recovery-'+kind,'linux-ops','/users/admin/feedback/'+failedId+'/reveal-'+kind,201,'POST');
        if(kind==='contact')assert.equal(result.contact,contact);if(kind==='content')assert.equal(result.content,content);if(kind==='images')assert.deepEqual(result.images,[imageUrl]);
        assert.equal(await p.auditLog.count({where:{targetId:failedId,action:kind==='contact'?'查看反馈联系方式':kind==='content'?'查看反馈正文原文':'查看反馈截图'}}),1);
      }
      console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,cases:rows,audits:audits.length,recoveredAudits:3,sensitiveValuesInEvidence:false,invalidMutationUnchanged:true,ipScope:'loopback-only-not-real-proxy',auditFailureBehavior:'503-without-plaintext-and-three-recovery-audits'}));
    }finally{await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_feedback_audit_reject ON "AuditLog"').catch(()=>{});await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_feedback_audit_reject()').catch(()=>{});await r.onModuleDestroy();await p.$disconnect();}})().catch(()=>{console.error('合成反馈权限或审计断言失败，未输出原始字段');process.exitCode=1});`);
  assert(sensitiveReport.passed);
  save("sensitive-http-audit.json", sensitiveReport);
  check("sensitive-feedback-roles-mask-audit-limit-and-validation", sensitiveReport);

  // 合成财务记录：模拟正常角色请求及显式自动化请求，不打款、不退款、不发物流。
  // 收款账户原文只在容器中断言；审计失败通过仅命中本次合成主键的临时触发器注入。
  const financeReport = appNode(`
    const {createRequire}=require('module');const req=createRequire('/app/apps/server/package.json');
    const assert=require('assert/strict');const jwt=req('jsonwebtoken');const {PrismaClient}=req('@prisma/client');const p=new PrismaClient();
    const rows=[];const syntheticAccount={account:'ISOLATED-NON-PAYABLE-ACCOUNT',name:'合成账户，不能出款'};
    const send=async(name,user,path,expected,method='GET',body,automated=false)=>{
      const headers={Authorization:'Bearer '+jwt.sign({sub:user,sessionIssuedAt:Date.now()},process.env.JWT_SECRET,{expiresIn:'5m'})};
      if(body)headers['Content-Type']='application/json';if(automated)headers['x-executor-type']='AUTOMATION';
      const response=await fetch('http://127.0.0.1:3000/api/v1'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
      const result=await response.json();rows.push({name,status:response.status,expected,passed:response.status===expected});
      assert.equal(response.status,expected,name);return result.data||result;
    };
    (async()=>{try{
      await p.circle.create({data:{id:'linux-finance-circle',name:'隔离财务验收',intro:'仅合成记录',tags:[],ownerId:'linux-user-b'}});
      for(const suffix of ['finance','super']){
        const refundId='linux-manual-refund-'+suffix;
        await p.circleRefundRequest.create({data:{id:refundId,circleId:'linux-finance-circle',userId:'linux-user-a',paidAmount:1,dailyCost:0,usedDays:0,refundBase:1,feeAmount:0,actualRefund:1}});
        await p.commissionRecall.create({data:{id:'linux-manual-recall-'+suffix,refundId,userId:'linux-user-b',userType:'owner',amount:0,balanceAfter:0,status:'pending_manual'}});
      }
      const manual='/circle-refund/manual-recalls/linux-manual-recall-finance/resolve';
      const decision={decision:'no_change',note:'隔离人工核对合成凭据，确认无需调整任何资金'};
      for(const user of ['linux-ops','linux-customer','linux-user-a'])await send('manual-no-change-role-denied-'+user,user,manual,403,'POST',decision);
      await send('manual-no-change-automation-denied','linux-super',manual,403,'POST',decision,true);
      await send('manual-no-change-missing-evidence','linux-finance',manual,400,'POST',{decision:'no_change',note:''});
      const before={revenue:await p.circleRevenueRecord.count(),wallet:await p.userWallet.count()};
      const finance=await send('manual-no-change-finance-single-operator','linux-finance',manual,201,'POST',decision);
      assert.equal(finance.status,'manual_no_change');assert.equal(finance.ownerRecalled,0);
      await send('manual-no-change-repeat-denied','linux-finance',manual,400,'POST',decision);
      const superResult=await send('manual-no-change-super-single-operator','linux-super','/circle-refund/manual-recalls/linux-manual-recall-super/resolve',201,'POST',decision);
      assert.equal(superResult.status,'manual_no_change');assert.equal(superResult.ownerRecalled,0);
      for(const [suffix,operator] of [['finance','linux-finance'],['super','linux-super']]){
        const record=await p.commissionRecall.findUnique({where:{id:'linux-manual-recall-'+suffix}});
        assert.equal(record.status,'manual_no_change');assert.equal(record.resolvedBy,operator);assert(record.resolvedAt);
        assert.equal(record.resolvedRevenueId,null);assert.equal(Number(record.amount),0);assert.equal(Number(record.balanceAfter),0);
      }
      assert.equal(await p.circleRevenueRecord.count(),before.revenue);assert.equal(await p.userWallet.count(),before.wallet);
      for(const [id,userId,status] of [['linux-payout-approved','linux-user-a','APPROVED'],['linux-payout-self','linux-super','APPROVED'],['linux-payout-pending','linux-user-a','PENDING'],['linux-payout-audit-fail','linux-user-a','APPROVED']])
        await p.withdrawalApplication.create({data:{id,userId,amount:1,actualAmount:1,payMethod:'BANK',accountInfo:syntheticAccount,status}});
      const payout='/finance/withdrawals/linux-payout-approved/payout-account';
      for(const user of ['linux-ops','linux-customer','linux-user-a'])await send('payout-role-denied-'+user,user,payout,403);
      await send('payout-automation-denied','linux-super',payout,403,'GET',null,true);
      for(const user of ['linux-super','linux-finance']){
        const detail=await send('payout-approved-'+user,user,payout,200);assert.deepEqual(detail.accountInfo,syntheticAccount);
      }
      await send('payout-self-denied','linux-super','/finance/withdrawals/linux-payout-self/payout-account',403);
      await send('payout-pending-denied','linux-finance','/finance/withdrawals/linux-payout-pending/payout-account',400);
      assert.equal(await p.auditLog.count({where:{action:'REVEAL_PAYOUT_ACCOUNT',targetId:'linux-payout-approved'}}),2);
      await p.$executeRawUnsafe(${JSON.stringify('CREATE FUNCTION isolated_audit_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = \'linux-payout-audit-fail\' THEN RAISE EXCEPTION \'isolated audit failure\'; END IF; RETURN NEW; END $$')});
      await p.$executeRawUnsafe('CREATE TRIGGER isolated_audit_reject BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION isolated_audit_reject()');
      const denied=await send('payout-audit-failure-denied','linux-finance','/finance/withdrawals/linux-payout-audit-fail/payout-account',500);
      assert(!JSON.stringify(denied).includes(syntheticAccount.account));assert.equal(await p.auditLog.count({where:{targetId:'linux-payout-audit-fail'}}),0);
      await p.$executeRawUnsafe('DROP TRIGGER isolated_audit_reject ON "AuditLog"');await p.$executeRawUnsafe('DROP FUNCTION isolated_audit_reject()');
      for(const user of ['linux-customer','linux-finance','linux-user-a'])await send('order-ship-role-denied-'+user,user,'/shop/orders/linux-order-b/ship',403,'PUT');
      await send('order-ship-automation-denied','linux-super','/shop/orders/linux-order-b/ship',403,'PUT',null,true);
      await send('order-refund-automation-denied','linux-super','/shop/orders/linux-order-b/refund',403,'PUT',{reason:'隔离拒绝路径'},true);
      assert.equal((await p.order.findUnique({where:{id:'linux-order-b'}})).status,'PAID');
      assert.equal(await p.withdrawalApplication.count({where:{id:{startsWith:'linux-payout-'},status:'PAID'}}),0);
      console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,cases:rows,noChangeFundsUntouched:true,normalPayoutAudits:2,auditFailureWithheldAccount:true,realTransfers:0,shippingExecuted:false,adjustDecisionNotCovered:true,sensitiveValuesInEvidence:false}));
    }finally{await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_audit_reject ON "AuditLog"').catch(()=>{});await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_audit_reject()').catch(()=>{});await p.$disconnect();}})().catch(e=>{console.error('合成财务权限断言失败：'+e.message);process.exitCode=1});`);
  assert(financeReport.passed);
  save("finance-http-boundaries.json", financeReport);
  check("manual-no-change-payout-audit-failure-and-write-role-boundaries", financeReport);

  const callbackReport = appNode(callbackCode);
  assert(callbackReport.passed);
  save("payment-refund-http-transactions.json", callbackReport);
  check("signed-encrypted-http-payment-refund-rollback-notification-retry", callbackReport);

  const recallCode = readFileSync(new URL("./verify-isolated-circle-recall-http.cjs", import.meta.url), "utf8");
  const recallReport = appNode(recallCode);
  assert(recallReport.passed);
  save("circle-recall-http-transactions.json", recallReport);
  check("circle-recall-order-binding-proportion-rollback-and-concurrent-resolution", recallReport);

  const autoCode = readFileSync(new URL("./verify-isolated-circle-auto-refund-http.cjs", import.meta.url), "utf8");
  const autoReport = appNode(autoCode);
  assert(autoReport.passed);
  save("circle-auto-refund-http.json", autoReport);
  check("automatic-refund-share-cap-zero-share-and-once-only-wallet-credit", autoReport);

  const shippingCode = readFileSync(new URL("./verify-isolated-merchant-shipping-http.cjs", import.meta.url), "utf8");
  const shippingReport = appNode(shippingCode);
  assert(shippingReport.passed);
  save("merchant-shipping-http-transactions.json", shippingReport);
  check("merchant-shipping-ownership-replay-rollback-and-concurrency", shippingReport);

  const imCode = readFileSync(new URL("./verify-isolated-im-http.cjs", import.meta.url), "utf8");
  const imReport = appNode(imCode);
  assert(imReport.passed);
  save("im-fallback-http-transactions.json", imReport);
  check("im-fallback-user-isolation-last-quota-concurrency-and-insert-rollback", imReport);

  // 两个独立应用共享临时 PG/Redis，验证真实个人房间投递，不开放主机端口。
  docker(["run", "-d", "--name", secondApp, "--network", network, "--env-file", appEnv, image]);
  let secondReady = false;
  for (let i = 0; i < 45; i++) {
    const probe = spawnSync("docker", ["exec", secondApp, "node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health/ready',{signal:AbortSignal.timeout(3000)}).then(r=>{process.exitCode=r.status===200?0:1}).catch(()=>{process.exitCode=1})"], { stdio: "ignore", timeout: 10000 });
    if (probe.status === 0) { secondReady = true; break; }
    await sleep(2000);
  }
  assert(secondReady, "第二隔离应用进程就绪超时");
  const rewardCode = readFileSync(new URL("./verify-isolated-circle-reward-http.cjs", import.meta.url), "utf8");
  const rewardReport = parseTestResult(docker(["exec", "-e", `ISOLATED_SECOND_APP=http://${secondApp}:3000`, app, "node", "-e", rewardCode]));
  assert(rewardReport.passed);
  save("circle-reward-http-transactions.json", rewardReport);
  check("circle-reward-real-http-atomicity-replay-two-apps-and-notification-permissions", rewardReport);
  const socketCode = readFileSync(new URL("./verify-isolated-im-socket.cjs", import.meta.url), "utf8");
  const socketReport = parseTestResult(docker(["exec", "-e", `ISOLATED_SECOND_APP=http://${secondApp}:3000`, app, "node", "-e", socketCode]));
  assert(socketReport.passed);
  save("im-two-process-socket-transactions.json", socketReport);
  check("im-two-app-processes-redis-socket-privacy-quota-and-rollback", socketReport);

  // 每次启动两个独立 Node 进程，共用真实 Redis；不以进程内降级证明幂等。
  const worker = (userId, eventKey, startAt) => `
    const {createRequire}=require('module');const req=createRequire('/app/apps/server/package.json');
    const {PrismaClient}=req('@prisma/client');const p=new PrismaClient();
    const {RedisService}=require('/app/apps/server/dist/redis/redis.service');const r=new RedisService();
    const {NotificationService}=require('/app/apps/server/dist/modules/notification/notification.service');
    const svc=new NotificationService(p,r,{},{});
    (async()=>{try {await r.pingShared();await r.setJson('notification:prefs:'+${JSON.stringify(userId)},{PUSH_ENABLED:false},60);
      await new Promise(done=>setTimeout(done,Math.max(0,${startAt}-Date.now())));
      const result=await svc.sendOnce(${JSON.stringify(userId)},${JSON.stringify(eventKey)},{type:'SYSTEM',title:'隔离并发测试',content:'仅合成事件，无外部投递'});
      console.log('NODE_TEST_RESULT:'+JSON.stringify({created:!!result,sharedRedis:true}));
    } finally {await r.onModuleDestroy();await p.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`;
  const race = async (userId, eventKey) => {
    const startAt = Date.now() + 2500;
    const rows = await Promise.all([concurrentNode(worker(userId, eventKey, startAt)), concurrentNode(worker(userId, eventKey, startAt))]);
    assert(rows.every(row => row.sharedRedis));
    return rows;
  };
  const countEvent = (userId, key) => appNode(`const {createRequire}=require('module');const {PrismaClient}=createRequire('/app/apps/server/package.json')('@prisma/client');const p=new PrismaClient();p.notification.count({where:{idempotencyKey:${JSON.stringify(`${userId}:${key}`)}}}).then(count=>console.log('NODE_TEST_RESULT:'+JSON.stringify({count}))).finally(()=>p.$disconnect()).catch(()=>{process.exitCode=1});`);
  const event = "ORDER_PAID:isolated-race";
  const firstRace = await race("linux-user-a", event);
  assert.equal(firstRace.filter(row => row.created).length, 1);
  assert.equal(countEvent("linux-user-a", event).count, 1);
  check("redis7-two-process-notification-idempotency", firstRace);
  appNode(`const {RedisService}=require('/app/apps/server/dist/redis/redis.service');const r=new RedisService();r.pingShared().then(()=>r.del('notification:sent:linux-user-a:ORDER_PAID:isolated-race')).then(()=>console.log('NODE_TEST_RESULT:'+JSON.stringify({deleted:true}))).finally(()=>r.onModuleDestroy()).catch(()=>{process.exitCode=1});`);
  const replay = await race("linux-user-a", event);
  assert(replay.every(row => !row.created));
  assert.equal(countEvent("linux-user-a", event).count, 1);
  check("database-unique-after-redis-key-loss", replay);
  const retryEvent = "ORDER_REFUNDED:isolated-retry";
  const failure = appNode(`
    const {createRequire}=require('module');const req=createRequire('/app/apps/server/package.json');const {PrismaClient}=req('@prisma/client');const p=new PrismaClient();
    const {RedisService}=require('/app/apps/server/dist/redis/redis.service');const r=new RedisService();const {NotificationService}=require('/app/apps/server/dist/modules/notification/notification.service');const svc=new NotificationService(p,r,{},{});
    (async()=>{try {await r.pingShared();let failed=false;try{await svc.sendOnce('linux-missing',${JSON.stringify(retryEvent)},{type:'SYSTEM',title:'隔离失败测试',content:'仅合成数据'});}catch(e){failed=true;}
      const released=await r.get('notification:sent:linux-missing:'+${JSON.stringify(retryEvent)})===null;
      await p.user.create({data:{id:'linux-missing',nickname:'隔离重试用户'}});
      console.log('NODE_TEST_RESULT:'+JSON.stringify({failed,released}));
    }finally{await r.onModuleDestroy();await p.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`);
  assert(failure.failed && failure.released);
  const retry = await race("linux-missing", retryEvent);
  assert.equal(retry.filter(row => row.created).length, 1);
  assert.equal(countEvent("linux-missing", retryEvent).count, 1);
  check("notification-failure-release-and-two-process-retry", { failure, retry });
  save("notification-concurrency.json", { firstRace, replay, failure, retry, noExternalDelivery: true });
  report.passed = true;
} catch (error) {
  report.error = sanitize(error.message);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  // Docker stderr 也属于容器输出；统一脱敏后才保留诊断。
  const rawLogs = spawnSync("docker", ["logs", "--tail", "200", app], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  writeFileSync(path.join(results, "application-startup.log"), sanitize((rawLogs.stdout || "") + (rawLogs.stderr || "")));
  const secondLogs = spawnSync("docker", ["logs", "--tail", "100", secondApp], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  writeFileSync(path.join(results, "second-application-startup.log"), sanitize((secondLogs.stdout || "") + (secondLogs.stderr || "")));
  for (const name of [secondApp, app, database, redis]) docker(["rm", "-f", "-v", name], true);
  docker(["network", "rm", network], true);
  // 必须逐项确认释放，不能只凭删除命令退出码推断。
  report.cleanup = Object.fromEntries([secondApp, app, database, redis].map(name => {
    const result = spawnSync("docker", ["inspect", name], { stdio: "ignore", timeout: 10000 });
    return [name, result.status === 1];
  }));
  const networkState = spawnSync("docker", ["network", "inspect", network], { stdio: "ignore", timeout: 10000 });
  report.cleanup.networkAbsent = networkState.status === 1;
  if (!Object.values(report.cleanup).every(Boolean)) {
    report.passed = false;
    report.cleanupError = "隔离资源释放核验失败";
    process.exitCode = 1;
  }
  rmSync(temp, { recursive: true, force: true });
  save("runtime-verification.json", report);
  console.log(JSON.stringify({ passed: report.passed, completedChecks: report.checks.map(item => item.name) }));
}
