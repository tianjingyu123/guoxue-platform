import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

for (const relativePath of [
  "scripts/release/activate-fixed-release.sh",
  "scripts/release/rollback-fixed-release.sh",
]) {
  test(`${relativePath} 避免无变化监控栈重建并输出精确就绪状态`, () => {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

    assert.match(source, /monitoring_compose_fingerprint\(\)/);
    assert.match(source, /__RELEASE_DIR__/);
    assert.match(source, /seq 1 120/);
    assert.match(source, /prometheus=%s alertmanager=%s grafana=%s/);
    assert.match(source, /监控配置指纹未变化且现有监控栈健康，跳过无意义重建/);
    assert.match(source, /&& wait_for_monitoring; then/);
  });
}
