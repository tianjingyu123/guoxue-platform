import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// 只在独立验证分支核本版镜像身份/Prisma/前端，不重复业务测试或启动真实服务。
const sourceCommit = "43de59acf81e7d622edc4e57285ddf41b7ad89f2";
const sourceSha256 = "dfa73eb2b911f64e02595f19a468be0a339f2211052196feb93d10b779f29752";
const image = "rebu-linux-verify:43de59ac";
assert.equal(process.env.IMAGE_TAG, image);
const results = path.resolve("results");
mkdirSync(results, { recursive: true });
const report = {
  sourceCommit, sourceSha256, image,
  scope: "image-artifact-binding-no-app-start-no-db-no-external-channels",
  checks: [], passed: false, businessRegressionRerun: false,
  productionDeployment: false, databaseOperations: 0, realMessages: 0,
};
const save = (name, value) => writeFileSync(path.join(results, name), JSON.stringify(value, null, 2) + "\n");
const docker = (args) => {
  const run = spawnSync("docker", args, { encoding: "utf8", timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(run.status, 0, run.stderr || run.stdout || "Docker验证失败");
  return run.stdout;
};
const isolatedNode = (code) => JSON.parse(docker(["run", "--rm", "--network", "none", "--entrypoint", "node", image, "-e", code]));
try {
  const inspect = JSON.parse(docker(["image", "inspect", image]))[0];
  assert.equal(inspect.Os, "linux");
  assert.equal(inspect.Architecture, "amd64");
  assert.equal(inspect.Config.Labels["org.opencontainers.image.revision"], sourceCommit);
  assert.equal(inspect.Config.Labels["rebu.source-archive.sha256"], sourceSha256);
  const identity = { imageId: inspect.Id, sourceCommit, sourceSha256, os: inspect.Os, architecture: inspect.Architecture };
  save("image-identity.json", identity);
  report.checks.push({ name: "image-identity", passed: true, detail: identity });

  docker(["run", "--rm", "--network", "none", "--entrypoint", "node", image,
    "scripts/release/verify-prisma-build.mjs", "apps/server", "--verify", "/app/prisma-build-receipt.json"]);
  const receipt = isolatedNode("process.stdout.write(require('fs').readFileSync('/app/prisma-build-receipt.json'))");
  save("prisma-runtime-receipt.json", receipt);
  report.checks.push({ name: "prisma-source-compile-runtime-binding", passed: true, detail: receipt });

  const staticReport = isolatedNode(`
    const fs=require('fs'), assert=require('assert/strict');
    const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(p+'/'+d.name):[p+'/'+d.name]);
    const result=[];
    for(const [name,prefix] of [['admin','/admin/'],['h5','/h5/']]) {
      const root='/app/'+name+'-dist', html=fs.readFileSync(root+'/index.html','utf8');
      assert(html.includes(prefix+'assets/'));
      const files=walk(root), texts=files.filter(f=>/\\.(js|html|css)$/.test(f)).map(f=>fs.readFileSync(f,'utf8'));
      assert(texts.some(t=>t.includes('https://api.rebugx.cn')));
      assert(!texts.some(t=>t.includes('https://pre-api.rebugx.cn')));
      if(name==='h5') {
        assert(texts.some(t=>t.includes('https://static.rebugx.cn')));
        for(const message of ['暂时无法加载私信，请稍后重试','暂时无法连接消息服务，请稍后重试','暂时无法加载群聊，请稍后重试'])
          assert(texts.some(t=>t.includes(message)), '本版友好消息提示未进入H5成品');
      }
      result.push({name,prefix,fileCount:files.length,friendlyMessagesPresent:name==='h5'});
    }
    process.stdout.write(JSON.stringify(result));
  `);
  save("static-mounts.json", staticReport);
  report.checks.push({ name: "admin-h5-base-and-public-config", passed: true, detail: staticReport });
  assert.equal(report.checks.length, 3);
  report.passed = true;
} catch (error) {
  report.error = error.message;
  console.error(report.error);
  process.exitCode = 1;
} finally {
  save("artifact-binding-verification.json", report);
  console.log(JSON.stringify({ sourceCommit, passed: report.passed, completedChecks: report.checks.map(item=>item.name) }));
}
