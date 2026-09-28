import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditHbuilderResource } from "../../scripts/release/audit-hbuilder-app-resource.mjs";

const common = {
  appId: "__UNI__TEST",
  versionCode: "253",
  spaceId: "tcb-test-space",
  apiOrigin: "https://api.example.test",
  assetOrigin: "https://static.example.test",
};

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "rebu-hbuilder-audit-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    await rm(root, { recursive: true, force: true });
  });
  const genericDir = path.join(root, "generic");
  const officialDir = path.join(root, "official");
  await Promise.all([mkdir(genericDir), mkdir(officialDir)]);
  const manifest = JSON.stringify({ id: common.appId, version: { code: common.versionCode } });
  const base = `const config=[];${common.apiOrigin};${common.assetOrigin}`;
  const bound = `const config=[{"spaceId":"${common.spaceId}"}];${common.apiOrigin};${common.assetOrigin}`;
  await Promise.all([
    writeFile(path.join(genericDir, "manifest.json"), manifest),
    writeFile(path.join(officialDir, "manifest.json"), manifest),
    writeFile(path.join(genericDir, "app-service.js"), base),
    writeFile(path.join(officialDir, "app-service.js"), bound),
    writeFile(path.join(genericDir, "same.txt"), "unchanged"),
    writeFile(path.join(officialDir, "same.txt"), "unchanged"),
  ]);
  return { genericDir, officialDir };
}

test("服务空间绑定且其它资源未变化时通过", async (t) => {
  const dirs = await fixture(t);
  const result = await auditHbuilderResource({ ...dirs, ...common });
  assert.equal(result.success, true);
  assert.equal(result.spaceBound, true);
  assert.deepEqual(result.changedFiles, ["app-service.js"]);
  assert.equal(result.files, 3);
});

test("普通 CLI 资源缺服务空间时明确失败", async (t) => {
  const dirs = await fixture(t);
  const base = await readFile(path.join(dirs.genericDir, "app-service.js"));
  await writeFile(path.join(dirs.officialDir, "app-service.js"), base);
  const result = await auditHbuilderResource({ ...dirs, ...common });
  assert.equal(result.success, false);
  assert.match(result.errors.join("；"), /未绑定指定 uniCloud 服务空间/);
});

test("导出改动了其它资源时拒绝作为同源证明", async (t) => {
  const dirs = await fixture(t);
  await writeFile(path.join(dirs.officialDir, "same.txt"), "unexpected");
  const result = await auditHbuilderResource({ ...dirs, ...common });
  assert.equal(result.success, false);
  assert.match(result.errors.join("；"), /预期之外的资源/);
});
