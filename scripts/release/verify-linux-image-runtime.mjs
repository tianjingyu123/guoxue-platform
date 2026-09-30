import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
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
