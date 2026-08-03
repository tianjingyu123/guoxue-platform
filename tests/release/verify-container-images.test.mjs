import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  collectTargetImages,
  verifyContainerImages,
} from "../../scripts/release/verify-container-images.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");

test("业务节点只验收生产基础镜像并按引用去重", () => {
  const images = collectTargetImages(repoRoot, { nodeRole: "app" });
  assert.equal(images.length, 4);
  assert.ok(images.every((item) => !item.files.includes("docker/monitoring/docker-compose.yml")));
  assert.ok(images.every((item) => !item.files.includes("docker/docker-compose.iiif.yml")));
});

test("运维节点同时覆盖监控镜像，可显式追加 IIIF 受控例外", () => {
  const operations = collectTargetImages(repoRoot, { nodeRole: "operations" });
  const withIiif = collectTargetImages(repoRoot, {
    nodeRole: "operations",
    includeIiif: true,
  });
  assert.equal(operations.length, 14);
  assert.equal(withIiif.length, 16);
  assert.equal(withIiif.filter((item) => item.controlledException).length, 1);
});

test("拉取后校验镜像摘要和目标架构", () => {
  const runner = (args) => {
    if (args[0] === "info") return { status: 0, stdout: "linux/amd64\n", stderr: "" };
    if (args[0] === "pull") return { status: 0, stdout: "pulled\n", stderr: "" };
    const reference = args[2];
    const digest = reference.match(/@(sha256:[0-9a-f]{64})$/u)?.[1];
    return {
      status: 0,
      stdout: `linux/amd64|example/image@${digest}\n`,
      stderr: "",
    };
  };
  const result = verifyContainerImages({ repoRoot, nodeRole: "app", runDocker: runner });
  assert.equal(result.success, true);
  assert.equal(result.images.length, 4);
  assert.ok(result.images.every((item) => item.status === "PASS"));
});

test("摘要或架构不一致时阻断启动", () => {
  const wrongDigest = `sha256:${"f".repeat(64)}`;
  const runner = (args) => {
    if (args[0] === "info") return { status: 0, stdout: "linux/amd64\n", stderr: "" };
    if (args[0] === "pull") return { status: 0, stdout: "pulled\n", stderr: "" };
    return {
      status: 0,
      stdout: `linux/arm64|example/image@${wrongDigest}\n`,
      stderr: "",
    };
  };
  const result = verifyContainerImages({ repoRoot, nodeRole: "app", runDocker: runner });
  assert.equal(result.success, false);
  assert.ok(result.images.every((item) => item.reason === "platform-mismatch"));
});

test("生产部署和统一门禁持续执行目标主机镜像验收", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const deploy = fs.readFileSync(path.join(repoRoot, "docker", "deploy.sh"), "utf8");
  const setup = fs.readFileSync(path.join(repoRoot, "docker", "setup-server.sh"), "utf8");

  assert.match(packageJson.scripts["release:gate:code"], /release:test-container-runtime/u);
  assert.match(deploy, /verify-container-images\.mjs/u);
  assert.match(setup, /verify-container-images\.mjs/u);
  assert.match(deploy, /container-image-runtime-readiness\.json/u);
  assert.match(setup, /container-image-runtime-readiness\.json/u);
  assert.match(
    fs.readFileSync(
      path.join(repoRoot, "scripts", "release", "verify-container-images.mjs"),
      "utf8",
    ),
    /releaseId.*\.release-id/su,
  );
});
