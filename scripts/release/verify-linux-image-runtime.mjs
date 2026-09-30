import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

// 仅供独立验证分支：临时空库、封闭容器网络，不连接真实业务数据库或渠道。
const image = process.env.IMAGE_TAG;
assert.equal(image, "rebu-linux-verify:08a5c0ac");
const sourceCommit = "08a5c0acea4ddc28db05b4ec6f563573bb4475b9";
const sourceSha256 = "4e4ea5a64177d6ec2ae6fd0f5e16afa36ad351bccda0ed7e774e566581266873";
const postgresImage = "pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff";
const redisImage = "redis:7-alpine@sha256:e7723ff73d963f5cc6d9c4643ea3d989527a402a319239054e9472a7fb9219a2";
const suffix = randomBytes(5).toString("hex");
const network = `rebu-verify-${suffix}`;
const database = `rebu-db-${suffix}`;
const redis = `rebu-redis-${suffix}`;
const app = `rebu-app-${suffix}`;
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
    "RELEASE_ID=isolated-08a5c0ac",
  ].join("\n") + "\n", { mode: 0o600 });
  const schemaOutput = docker(["run", "--rm", "--network", network, "--env-file", appEnv, "--entrypoint", "pnpm", image, "--dir", "/app/apps/server", "exec", "prisma", "db", "push", "--skip-generate"]);
  writeFileSync(path.join(results, "temporary-schema.log"), schemaOutput);
  check("temporary-empty-db-final-schema", "仅创建临时空库结构，不验证生产迁移链");
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
  assert(http.filter(r => r.path === "/api/v1/health/live" || r.path === "/api/v1/health").every(r => r.releaseId === "isolated-08a5c0ac"));
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
  for (const name of [app, database, redis]) docker(["rm", "-f", "-v", name], true);
  docker(["network", "rm", network], true);
  rmSync(temp, { recursive: true, force: true });
  save("runtime-verification.json", report);
  console.log(JSON.stringify({ passed: report.passed, completedChecks: report.checks.map(item => item.name) }));
}
