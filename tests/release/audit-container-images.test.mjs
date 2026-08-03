import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditContainerImages } from "../../scripts/release/audit-container-images.mjs";

const requiredFiles = [
  ".cnb.yml",
  "docker/Dockerfile",
  "docker/Dockerfile.dev",
  "docker/Dockerfile.test",
  "docker/docker-compose.yml",
  "docker/docker-compose.prod.yml",
  "docker/docker-compose.test.yml",
  "docker/docker-compose.iiif.yml",
  "docker/monitoring/docker-compose.yml",
];

function withRepository(overrides, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "guoxue-container-image-audit-"));
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(
      absolutePath,
      overrides[relativePath] ??
        `services:\n  app:\n    image: example/app:1.0@sha256:${"a".repeat(64)}\n`,
      "utf8",
    );
  }

  try {
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("接受锁定 sha256 的 Dockerfile、Compose 与流水线镜像", () => {
  withRepository(
    {
      "docker/Dockerfile": `FROM node:24@sha256:${"b".repeat(64)} AS builder\n`,
      ".cnb.yml": `build:\n  image: docker:24-dind@sha256:${"c".repeat(64)}\n`,
    },
    (root) => {
      const result = auditContainerImages(root);
      assert.deepEqual(result.errors, []);
      assert.equal(result.exceptions.length, 0);
    },
  );
});

test("拒绝 latest 与未锁摘要的普通版本标签", () => {
  withRepository(
    {
      "docker/docker-compose.yml": "services:\n  redis:\n    image: redis:7-alpine\n",
      "docker/docker-compose.prod.yml": "services:\n  minio:\n    image: minio/minio:latest\n",
    },
    (root) => {
      const result = auditContainerImages(root);
      assert.equal(result.errors.length, 2);
      assert.ok(result.errors.some((error) => error.includes("redis:7-alpine")));
      assert.ok(result.errors.some((error) => error.includes("禁止使用 latest")));
    },
  );
});

test("仅允许明确登记的 Cantaloupe 版本标签作为受控例外", () => {
  withRepository(
    {
      "docker/docker-compose.iiif.yml":
        "services:\n  cantaloupe:\n    image: ghcr.io/uclalibrary/cantaloupe:5.0.5\n",
    },
    (root) => {
      const result = auditContainerImages(root);
      assert.deepEqual(result.errors, []);
      assert.equal(result.exceptions.length, 1);
      assert.match(result.exceptions[0].reason, /目标主机/u);
    },
  );
});

test("统一代码门禁持续执行容器镜像审计及回归测试", () => {
  const testDirectory = path.dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(testDirectory, "..", "..", "package.json"), "utf8"),
  );
  const gate = packageJson.scripts["release:gate:code"];

  assert.match(gate, /pnpm release:audit-container-images/u);
  assert.match(gate, /pnpm release:test-container-images/u);
});
