import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access,
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const verifier = path.join(projectRoot, "scripts/release/verify-fixed-package.mjs");
const commit = "a".repeat(40);
const releaseId = "fixture-release-0001";
const requiredFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "docker/docker-compose.yml",
  "docker/docker-compose.prod.yml",
  "docker/deploy.sh",
  "docker/health-check.sh",
  "docker/pg-backup.sh",
  "docker/pg-restore.sh",
  "docker/setup-server.sh",
  "scripts/migration/run-prisma-migrations.sh",
  "scripts/migration/verify-postgres.sh",
  "scripts/migration/verify-business-integrity.sql",
  "scripts/migration/write-postgres-verification-report.mjs",
  "scripts/release/activate-fixed-release.sh",
  "scripts/release/aggregate-launch-evidence.mjs",
  "scripts/release/audit-release-retention.mjs",
  "scripts/release/current-compose.sh",
  "scripts/release/finalize-launch-acceptance.mjs",
  "scripts/release/render-monitoring-config.mjs",
  "scripts/release/rollback-fixed-release.sh",
  "scripts/release/verify-release-directory.mjs",
  "scripts/release/preflight-host.sh",
  "scripts/release/validate-release-layout.sh",
  "scripts/release/verify-production-cutover.sh",
  "scripts/release/audit-host-preflight.mjs",
  "scripts/release/verify-client-config-binding.mjs",
  "release-evidence/client-config-binding.json",
  "release-evidence/client-artifact-audit.json",
  "release-evidence/client-artifact-verification.json",
  "release-evidence/source-freeze-readiness.json",
];
const executableRuntimeScripts = new Set([
  "scripts/release/verify-fixed-package.mjs",
  "scripts/release/verify-client-config-binding.mjs",
  "scripts/release/verify-release-directory.mjs",
]);

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function createFixture({
  activationRuntime = false,
  retryActivationRuntime = false,
  sourceFreezeCommit = commit,
  sourceFreezeBranch = "main",
  sourceFreezeExpectedBranch = sourceFreezeBranch,
  artifactVerificationReleaseId = releaseId,
} = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "guoxue-fixed-package-"));
  const payload = path.join(root, "payload");
  await mkdir(payload, { recursive: true });

  const files = [];
  const hasActivationRuntime = activationRuntime || retryActivationRuntime;
  const fixtureFiles = hasActivationRuntime
    ? [
        ...new Set([
          ...requiredFiles,
          "scripts/release/verify-fixed-package.mjs",
          "docker/nginx/ssl/.gitkeep",
          ...(retryActivationRuntime
            ? [
                "scripts/release/render-monitoring-config.mjs",
                "docker/monitoring/docker-compose.yml",
              ]
            : []),
        ]),
      ]
    : requiredFiles;
  const publicClientConfig = {
    VITE_API_URL: "https://api.example.test/api/v1",
    VITE_PUBLIC_H5_URL: "https://api.example.test/h5",
    VITE_PUBLIC_ASSET_ORIGIN: "https://assets.example.test",
  };
  const publicConfigFingerprint = sha256(JSON.stringify(publicClientConfig));

  for (const relativePath of fixtureFiles) {
    let content = `fixture:${relativePath}\n`;
    if (retryActivationRuntime && relativePath === "docker/deploy.sh") {
      content = `#!/usr/bin/env bash
set -euo pipefail
marker="\${ACTIVATION_RETRY_MARKER:?}"
if [ ! -f "$marker" ]; then
  : > "$marker"
  exit 42
fi
exit 0
`;
    } else if (
      retryActivationRuntime &&
      relativePath === "scripts/release/render-monitoring-config.mjs"
    ) {
      content = "process.exit(0);\n";
    } else if (hasActivationRuntime && executableRuntimeScripts.has(relativePath)) {
      content = await readFile(path.join(projectRoot, ...relativePath.split("/")), "utf8");
    } else if (relativePath === "release-evidence/client-config-binding.json") {
      content = `${JSON.stringify({
        schemaVersion: 1,
        kind: "guoxue-client-public-config-binding",
        releaseId,
        sourceCommit: commit,
        keys: ["VITE_API_URL", "VITE_PUBLIC_H5_URL", "VITE_PUBLIC_ASSET_ORIGIN"],
        fingerprintAlgorithm: "sha256",
        fingerprint: hasActivationRuntime ? publicConfigFingerprint : "c".repeat(64),
      })}\n`;
    } else if (relativePath === "release-evidence/client-artifact-audit.json") {
      content = `${JSON.stringify({
        schemaVersion: 2,
        releaseId,
        sourceCommit: commit,
        success: true,
        counts: { targets: 5 },
        targets: [
          ["admin", "apps/admin/dist"],
          ["h5", "apps/mobile/dist/build/h5"],
          ["mp-weixin", "apps/mobile/dist/build/mp-weixin"],
          ["app", "apps/mobile/dist/build/app"],
          ["app-harmony", "apps/mobile/dist/build/app-harmony"],
        ].map(([name, directory]) => ({
          name,
          directory,
          success: true,
          files: 1,
          bytes: 1,
          contentSha256: "d".repeat(64),
        })),
      })}\n`;
    } else if (relativePath === "release-evidence/client-artifact-verification.json") {
      content = `${JSON.stringify({
        schemaVersion: 1,
        releaseId: artifactVerificationReleaseId,
        sourceCommit: commit,
        success: true,
        counts: { targets: 5, files: 5, bytes: 5, errors: 0 },
        targets: [
          "apps/admin/dist",
          "apps/mobile/dist/build/h5",
          "apps/mobile/dist/build/mp-weixin",
          "apps/mobile/dist/build/app",
          "apps/mobile/dist/build/app-harmony",
        ].map((directory) => ({
          directory,
          files: 1,
          bytes: 1,
          contentSha256: "d".repeat(64),
          matches: true,
        })),
        errors: [],
      })}\n`;
    } else if (relativePath === "release-evidence/source-freeze-readiness.json") {
      content = `${JSON.stringify({
        schemaVersion: 2,
        sourceCommit: sourceFreezeCommit,
        branch: sourceFreezeBranch,
        gitBranch: sourceFreezeBranch,
        expectedBranch: sourceFreezeExpectedBranch,
        expectedCommit: sourceFreezeCommit,
        strict: true,
        clean: true,
        readyForProductionPackage: true,
        counts: { total: 0, conflicted: 0 },
      })}\n`;
    }
    const absolutePath = path.join(payload, ...relativePath.split("/"));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
    files.push({
      path: relativePath,
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));

  await writeFile(path.join(payload, ".release-id"), `${releaseId}\n`, "utf8");
  await writeFile(
    path.join(payload, "RELEASE-MANIFEST.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        releaseId,
        commit,
        dirty: false,
        createdAt: new Date().toISOString(),
        fileCount: files.length,
        files,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const archiveName = `gx-deploy-91-${releaseId}.tar.gz`;
  const archivePath = path.join(root, archiveName);
  const tarResult = spawnSync("tar", ["-czf", archiveName, "-C", "payload", "."], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(tarResult.status, 0, tarResult.stderr || tarResult.stdout);
  const archiveHash = sha256(await readFile(archivePath));
  const checksumPath = `${archivePath}.sha256`;
  await writeFile(checksumPath, `${archiveHash}  ${archiveName}\n`, "utf8");

  return { root, archivePath, checksumPath, publicClientConfig };
}

test("固定包提交 SHA 与工作流源提交一致时通过", async () => {
  const fixture = await createFixture();
  try {
    const reportPath = path.join(fixture.root, "report.json");
    const result = spawnSync(
      process.execPath,
      [
        verifier,
        fixture.archivePath,
        fixture.checksumPath,
        "--expected-commit",
        commit,
        "--report",
        reportPath,
      ],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.success, true);
    assert.equal(report.commit, commit);
    assert.equal(report.expectedCommit, commit);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("固定包提交 SHA 与工作流源提交不一致时阻断", async () => {
  const fixture = await createFixture();
  try {
    const reportPath = path.join(fixture.root, "mismatch-report.json");
    const expectedCommit = "b".repeat(40);
    const result = spawnSync(
      process.execPath,
      [
        verifier,
        fixture.archivePath,
        fixture.checksumPath,
        "--expected-commit",
        expectedCommit,
        "--report",
        reportPath,
      ],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.success, false);
    assert.equal(report.expectedCommit, expectedCommit);
    assert.match(report.errors.join("\n"), /发布提交 SHA 不匹配/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("冻结审计源提交与固定包提交不一致时阻断", async () => {
  const fixture = await createFixture({ sourceFreezeCommit: "b".repeat(40) });
  try {
    const reportPath = path.join(fixture.root, "source-freeze-mismatch-report.json");
    const result = spawnSync(
      process.execPath,
      [verifier, fixture.archivePath, fixture.checksumPath, "--report", reportPath],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /源代码冻结审计未通过.*与固定包不一致/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("冻结审计来源分支与预期正式分支不一致时阻断", async () => {
  const fixture = await createFixture({
    sourceFreezeBranch: "feature/not-production",
    sourceFreezeExpectedBranch: "main",
  });
  try {
    const reportPath = path.join(fixture.root, "source-freeze-branch-mismatch-report.json");
    const result = spawnSync(
      process.execPath,
      [verifier, fixture.archivePath, fixture.checksumPath, "--report", reportPath],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /来源分支\/提交与固定包不一致/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("客户端成品独立验真报告与固定包发布标识不一致时阻断", async () => {
  const fixture = await createFixture({ artifactVerificationReleaseId: "fixture-release-other" });
  try {
    const reportPath = path.join(fixture.root, "artifact-verification-mismatch-report.json");
    const result = spawnSync(
      process.execPath,
      [verifier, fixture.archivePath, fixture.checksumPath, "--report", reportPath],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /客户端成品独立验真报告未通过/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("候选目录验真失败时不占用正式发布标识", async () => {
  const fixture = await createFixture({ activationRuntime: true });
  try {
    const hostRoot = path.join(fixture.root, "host");
    const sharedDir = path.join(hostRoot, "shared");
    const sharedSslDir = path.join(sharedDir, "nginx-ssl");
    const envFile = path.join(sharedDir, ".env.production");
    const fakeBin = path.join(fixture.root, "fake-bin");
    await mkdir(sharedSslDir, { recursive: true });
    await mkdir(fakeBin, { recursive: true });
    await writeFile(
      envFile,
      Object.entries(fixture.publicClientConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n",
      "utf8",
    );
    await chmod(envFile, 0o600);

    const fakeCommands = {
      docker: "#!/usr/bin/env bash\nexit 0\n",
      flock: "#!/usr/bin/env bash\nexit 0\n",
      ln: "#!/usr/bin/env bash\n# 故意不创建共享证书链接，用于触发候选目录验真失败\nexit 0\n",
      mkdir:
        '#!/usr/bin/env bash\nargs=()\nskip_next=false\nfor arg in "$@"; do\n  if $skip_next; then\n    skip_next=false\n    continue\n  fi\n  if [ "$arg" = "-m" ]; then\n    skip_next=true\n    continue\n  fi\n  args+=("$arg")\ndone\nexec /usr/bin/mkdir "${args[@]}"\n',
      stat: "#!/usr/bin/env bash\nprintf '600\\n'\n",
    };
    for (const [name, content] of Object.entries(fakeCommands)) {
      const commandPath = path.join(fakeBin, name);
      await writeFile(commandPath, content, "utf8");
      await chmod(commandPath, 0o755);
    }

    const toShellPath = (value) => {
      if (process.platform !== "win32") return value;
      const converted = spawnSync("cygpath", ["-u", value], { encoding: "utf8" });
      assert.equal(converted.status, 0, converted.stderr || converted.stdout);
      return converted.stdout.trim();
    };
    const bashExecutable =
      process.platform === "win32"
        ? spawnSync("where.exe", ["bash"], { encoding: "utf8" }).stdout.split(/\r?\n/)[0]
        : "bash";
    assert.ok(bashExecutable, "未找到 Bash 可执行文件");
    const bashPath = spawnSync(bashExecutable, ["-lc", 'printf "%s" "$PATH"'], {
      encoding: "utf8",
    });
    assert.equal(bashPath.status, 0, bashPath.stderr || bashPath.stdout);

    const result = spawnSync(
      bashExecutable,
      [
        toShellPath(path.join(projectRoot, "scripts/release/activate-fixed-release.sh")),
        toShellPath(fixture.archivePath),
        toShellPath(fixture.checksumPath),
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${toShellPath(fakeBin)}:${bashPath.stdout}`,
          ROOT_DIR: toShellPath(hostRoot),
          ENV_FILE: toShellPath(envFile),
          SHARED_SSL_DIR: toShellPath(sharedSslDir),
          EXPECTED_RELEASE_ID: releaseId,
          EXPECTED_COMMIT: commit,
          DEPLOY_TARGET: "standard",
        },
      },
    );

    assert.equal(result.error, undefined, String(result.error));
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(`${result.stdout}\n${result.stderr}`, /共享证书挂载不是符号链接/);
    await assert.rejects(access(path.join(hostRoot, "releases", releaseId)));
    const releaseEntries = await readdir(path.join(hostRoot, "releases"));
    assert.equal(
      releaseEntries.some((entry) => entry.startsWith(".candidate-")),
      false,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test(
  "同一固定包首次部署失败后可复核正式目录并安全重试",
  { skip: process.platform === "win32" ? "Windows Git Bash 不提供真实 POSIX 符号链接" : false },
  async () => {
    const fixture = await createFixture({ retryActivationRuntime: true });
    try {
      const hostRoot = path.join(fixture.root, "host");
      const sharedDir = path.join(hostRoot, "shared");
      const sharedSslDir = path.join(sharedDir, "nginx-ssl");
      const envFile = path.join(sharedDir, ".env.production");
      const fakeBin = path.join(fixture.root, "fake-bin");
      const retryMarker = path.join(fixture.root, "deploy-failed-once.marker");
      await mkdir(sharedSslDir, { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(
        envFile,
        Object.entries(fixture.publicClientConfig)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n") + "\n",
        "utf8",
      );
      await chmod(envFile, 0o600);

      const fakeCommands = {
        docker: "#!/usr/bin/env bash\nexit 0\n",
        stat: "#!/usr/bin/env bash\nprintf '600\\n'\n",
      };
      for (const [name, content] of Object.entries(fakeCommands)) {
        const commandPath = path.join(fakeBin, name);
        await writeFile(commandPath, content, "utf8");
        await chmod(commandPath, 0o755);
      }

      const bashExecutable = "bash";
      const bashPath = spawnSync(bashExecutable, ["-lc", 'printf "%s" "$PATH"'], {
        encoding: "utf8",
      });
      assert.equal(bashPath.status, 0, bashPath.stderr || bashPath.stdout);
      const activationArgs = [
        path.join(projectRoot, "scripts/release/activate-fixed-release.sh"),
        fixture.archivePath,
        fixture.checksumPath,
      ];
      const activationEnv = {
        ...process.env,
        PATH: `${fakeBin}:${bashPath.stdout}`,
        ROOT_DIR: hostRoot,
        ENV_FILE: envFile,
        SHARED_SSL_DIR: sharedSslDir,
        EXPECTED_RELEASE_ID: releaseId,
        EXPECTED_COMMIT: commit,
        DEPLOY_TARGET: "standard",
        ACTIVATION_RETRY_MARKER: retryMarker,
      };

      const first = spawnSync(bashExecutable, activationArgs, {
        cwd: projectRoot,
        encoding: "utf8",
        env: activationEnv,
      });
      assert.equal(first.error, undefined, String(first.error));
      assert.notEqual(first.status, 0, first.stdout);
      assert.match(`${first.stdout}\n${first.stderr}`, /部署失败；当前版本软链保持不变/);

      const finalDirectory = path.join(hostRoot, "releases", releaseId);
      await access(finalDirectory);
      await assert.rejects(access(path.join(hostRoot, "current")));
      await assert.rejects(access(path.join(hostRoot, "current.next")));
      const releaseEntries = await readdir(path.join(hostRoot, "releases"));
      assert.equal(
        releaseEntries.some((entry) => entry.startsWith(".candidate-")),
        false,
      );

      const second = spawnSync(bashExecutable, activationArgs, {
        cwd: projectRoot,
        encoding: "utf8",
        env: activationEnv,
      });
      assert.equal(second.error, undefined, String(second.error));
      assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
      assert.match(second.stdout, /检测到同一固定包留下的发布目录/);
      assert.equal(await realpath(path.join(hostRoot, "current")), await realpath(finalDirectory));
      assert.equal(
        (await readFile(path.join(hostRoot, "current-release-id"), "utf8")).trim(),
        releaseId,
      );
      const history = await readFile(path.join(hostRoot, "release-history.tsv"), "utf8");
      assert.equal(history.split(`\tactivate\t${releaseId}\t`).length - 1, 1);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  },
);
