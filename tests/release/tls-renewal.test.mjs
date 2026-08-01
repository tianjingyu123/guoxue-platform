import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const renewalPath = path.join(projectRoot, "docker/renew-ssl.sh");
const setupPath = path.join(projectRoot, "docker/setup-server.sh");

test("standard 证书续期具备期限短路、互斥锁、演练和失败恢复", async () => {
  const source = await readFile(renewalPath, "utf8");
  for (const snippet of [
    'DEPLOY_TARGET" != "standard"',
    "flock -n 9",
    'openssl x509 -checkend "$RENEW_BEFORE_SECONDS"',
    'certbot_args+=(--dry-run)',
    'trap restore_nginx EXIT INT TERM',
    'mv -f "$tmp_fullchain" "$SSL_DIR/fullchain.pem"',
    'mv -f "$tmp_privkey" "$SSL_DIR/privkey.pem"',
    'docker exec "$NGINX_CONTAINER" nginx -t',
  ]) {
    assert.ok(source.includes(snippet), `缺少续期保护：${snippet}`);
  }
  assert.match(source, /certbot\/certbot:v\d+\.\d+\.\d+/u);
  assert.equal(source.includes("latest"), false);
});

test("初始化仅为 standard 架构安装续期计划并会清理旧重复项", async () => {
  const source = await readFile(setupPath, "utf8");
  assert.ok(source.includes('TLS_RENEW_SCRIPT="$RUNTIME_DIR/docker/renew-ssl.sh"'));
  assert.ok(source.includes("grep -v '/var/log/guoxue-tls-renewal.log'"));
  assert.ok(source.includes("grep -v 'certbot renew.*guoxue-nginx'"));
  assert.ok(source.includes('if [ "$DEPLOY_TARGET" = "standard" ]; then'));
  assert.ok(source.includes("DEPLOY_TARGET=standard PLATFORM_ROOT=$PLATFORM_ROOT"));
  assert.ok(source.includes("/var/log/guoxue-tls-renewal.log"));
  assert.equal(source.includes("certbot renew --quiet --post-hook"), false);
});

test("手工补证也复用固定镜像、共享目录与统一续期入口", async () => {
  const source = await readFile(
    path.join(projectRoot, "docker", "nginx", "setup-ssl.sh"),
    "utf8",
  );
  for (const snippet of [
    "set -Eeuo pipefail",
    'SSL_DIR="${SSL_DIR:-$PLATFORM_ROOT/shared/nginx-ssl}"',
    'CERTBOT_IMAGE="certbot/certbot:v3.2.0"',
    "flock -n 9",
    'openssl x509 -in "$CERT_SRC/fullchain.pem" -noout -checkend 2592000',
    'mv -f "$tmp_fullchain" "$SSL_DIR/fullchain.pem"',
    'RENEW_SCRIPT="$PLATFORM_ROOT/current/docker/renew-ssl.sh"',
    "/var/log/guoxue-tls-renewal.log",
    'if [ "$nginx_was_running" = true ]; then',
  ]) {
    assert.ok(source.includes(snippet), `手工补证缺少统一保护：${snippet}`);
  }
  assert.equal(source.includes("certbot renew --quiet --post-hook"), false);
  assert.equal(
    source.includes("docker ps -a --format '{{.Names}}'"),
    false,
    "不得启动原本处于停止状态的 Nginx",
  );
});
