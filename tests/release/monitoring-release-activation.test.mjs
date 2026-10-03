import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fingerprintMonitoringDirectory } from "../../scripts/release/monitoring-config-fingerprint.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

for (const [name, relativePath] of [
  ["固定发布", "scripts/release/activate-fixed-release.sh"],
  ["固定回滚", "scripts/release/rollback-fixed-release.sh"],
]) {
  test(`${name}在监控配置未变化且端点健康时跳过重建`, () => {
    const source = read(relativePath);
    assert.match(source, /MONITORING_READY_ATTEMPTS="\$\{MONITORING_READY_ATTEMPTS:-120\}"/u);
    assert.match(source, /monitoring-config-fingerprint\.mjs/u);
    assert.match(source, /probe_monitoring_endpoints\(\)/u);
    assert.match(source, /监控配置指纹未变化且端点已就绪，跳过监控容器重建/u);
    assert.match(source, /监控配置指纹未变化，但现有端点未全部就绪，执行受控恢复/u);
    assert.match(source, /监控端点状态：Prometheus=/u);

    const skipIndex = source.indexOf("监控配置指纹未变化且端点已就绪，跳过监控容器重建");
    const composeIndex = source.indexOf('docker compose -f "$');
    assert.ok(skipIndex > 0, "必须存在跳过监控重建分支");
    assert.ok(composeIndex > 0, "必须保留配置变化时的监控重建路径");
  });
}

test("监控配置指纹忽略 README、包含渲染配置并拒绝符号链接", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "monitoring-fingerprint-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".generated"));
  fs.writeFileSync(path.join(root, "docker-compose.yml"), "services: {}\n");
  fs.writeFileSync(path.join(root, "README.md"), "first\n");
  fs.writeFileSync(path.join(root, ".generated", "alertmanager.yml"), "route: {}\n");

  const initial = fingerprintMonitoringDirectory(root);
  fs.writeFileSync(path.join(root, "README.md"), "second\n");
  assert.equal(fingerprintMonitoringDirectory(root), initial, "README 不应触发监控重建");

  fs.writeFileSync(path.join(root, ".generated", "alertmanager.yml"), "route: changed\n");
  assert.notEqual(fingerprintMonitoringDirectory(root), initial, "渲染配置变化必须触发监控重建");

  if (process.platform !== "win32") {
    fs.symlinkSync(path.join(root, "docker-compose.yml"), path.join(root, "linked.yml"));
    assert.throws(() => fingerprintMonitoringDirectory(root), /禁止符号链接/u);
  }
});
