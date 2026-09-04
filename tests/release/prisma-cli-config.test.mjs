import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadPrismaEnv } = require("../../apps/server/prisma/load-env.cjs");
const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("Prisma CLI 迁移旧配置但不升级引擎或覆盖数据库地址", () => {
  const manifest = JSON.parse(read("apps/server/package.json"));
  const config = read("apps/server/prisma.config.ts");
  assert.equal(manifest.prisma, undefined);
  assert.equal(manifest.devDependencies.prisma, "^6.19.3");
  assert.match(config, /schema: "prisma\/schema\.prisma"/);
  assert.match(config, /path: "prisma\/migrations"/);
  assert.match(config, /seed: "ts-node prisma\/seed\.ts"/);
  assert.doesNotMatch(config, /datasource:|postgresql:\/\/|engine:/);
});

test("Prisma 本地配置只查找服务目录，不扫描仓库或生产 env", () => {
  const paths = [];
  const service = resolve("qa-service");
  loadPrismaEnv(service, (file) => paths.push(file));
  assert.deepEqual(paths, [join(service, ".env"), join(service, "prisma/.env")]);
});

test("构建环境缺少 env 文件可以通过，权限错误不得静默吞掉", () => {
  assert.doesNotThrow(() =>
    loadPrismaEnv("qa-service", () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
  );
  assert.throws(
    () =>
      loadPrismaEnv("qa-service", () => {
        throw Object.assign(new Error("denied"), { code: "EACCES" });
      }),
    /denied/,
  );
});

test("已有外部变量优先，本地 env 补充缺失值", () => {
  const directory = mkdtempSync(join(tmpdir(), "qa-prisma-env-"));
  const keys = ["QA_PRISMA_EXISTING", "QA_PRISMA_FILE_ONLY"];
  const previous = keys.map((key) => process.env[key]);
  try {
    process.env.QA_PRISMA_EXISTING = "injected";
    delete process.env.QA_PRISMA_FILE_ONLY;
    writeFileSync(
      join(directory, ".env"),
      "QA_PRISMA_EXISTING=local\nQA_PRISMA_FILE_ONLY=fixture\n",
    );
    loadPrismaEnv(directory);
    assert.equal(process.env.QA_PRISMA_EXISTING, "injected");
    assert.equal(process.env.QA_PRISMA_FILE_ONLY, "fixture");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
    // 只删除由 mkdtemp 返回的本用例临时目录，不涉及项目文件。
    rmSync(directory, { recursive: true, force: true });
  }
});

test("生产与开发镜像运行阶段保留新 Prisma CLI 配置", () => {
  for (const file of ["docker/Dockerfile", "docker/Dockerfile.dev"]) {
    const docker = read(file);
    assert.match(
      docker,
      /COPY --from=builder \/app\/apps\/server\/prisma\.config\.ts \.\/apps\/server\//,
    );
    assert.match(
      docker,
      /COPY --from=builder \/app\/apps\/server\/prisma \.\/apps\/server\/prisma/,
    );
  }
});

test("开发镜像具备原生依赖编译工具链", () => {
  const dockerfile = read("docker/Dockerfile.dev");

  assert.match(dockerfile, /AS builder[\s\S]*apk add --no-cache python3 make g\+\+/u);
  assert.ok(
    dockerfile.indexOf("apk add --no-cache python3 make g++") <
      dockerfile.indexOf("pnpm install --frozen-lockfile"),
    "原生依赖工具链必须在安装依赖前就绪",
  );
});
