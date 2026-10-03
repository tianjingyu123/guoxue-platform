import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const cleanupPath = path.join(projectRoot, "scripts/operations/cleanup-docker-retention.sh");
const setupPath = path.join(projectRoot, "docker/setup-server.sh");

test("Docker 清理与发布互斥并保留最近回滚镜像", async () => {
  const source = await readFile(cleanupPath, "utf8");
  for (const snippet of [
    'ROLLBACK_IMAGE_KEEP="${ROLLBACK_IMAGE_KEEP:-2}"',
    'exec 8>"$ROOT_DIR/.release-activation.lock"',
    "flock -n 8",
    "rollback-[A-Za-z0-9._-]+",
    'docker image rm "$SERVER_IMAGE_REPOSITORY:$tag"',
    'docker builder prune -af --filter "until=$BUILDER_CACHE_MAX_AGE"',
    "docker image prune -f",
  ]) {
    assert.ok(source.includes(snippet), `缺少 Docker 清理保护：${snippet}`);
  }
  assert.equal(source.includes("docker system prune"), false);
  assert.equal(source.includes("docker volume prune"), false);
  assert.equal(source.includes("docker container prune"), false);
});

test("两类节点都安装镜像清理计划且仅运维节点安装数据库备份", async () => {
  const source = await readFile(setupPath, "utf8");
  assert.ok(source.includes('CLEANUP_SCRIPT="$RUNTIME_DIR/scripts/operations/cleanup-docker-retention.sh"'));
  assert.ok(source.includes("ROOT_DIR=$PLATFORM_ROOT ROLLBACK_IMAGE_KEEP=2 BUILDER_CACHE_MAX_AGE=168h"));
  assert.ok(source.includes('if [ "$NODE_ROLE" = "operations" ]; then'));
  assert.ok(source.includes("DEPLOY_TARGET=$DEPLOY_TARGET ENV_FILE=$ENV_FILE BACKUP_DIR=$BACKUP_DIR"));
  assert.ok(source.includes("业务节点：移除重复数据库备份计划"));
});
