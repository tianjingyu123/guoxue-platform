import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const auditor = path.join(repoRoot, "scripts/release/audit-source-freeze.mjs");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result;
}

async function createRepository(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "guoxue-source-freeze-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  run("git", ["init"], directory);
  run("git", ["config", "user.name", "Release Test"], directory);
  run("git", ["config", "user.email", "release-test@example.com"], directory);
  await writeFile(path.join(directory, "tracked.txt"), "baseline\n", "utf8");
  run("git", ["add", "tracked.txt"], directory);
  run("git", ["commit", "-m", "baseline"], directory);
  return directory;
}

test("干净工作树通过严格冻结审计并生成可追溯报告", async (t) => {
  const directory = await createRepository(t);
  const branch = spawnSync("git", ["branch", "--show-current"], {
    cwd: directory,
    encoding: "utf8",
  }).stdout.trim();
  const commit = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8",
  }).stdout.trim();
  const reportFile = path.join(directory, "..", `${path.basename(directory)}-clean-report.json`);
  t.after(() => rm(reportFile, { force: true }));
  const result = spawnSync(
    process.execPath,
    [
      auditor,
      "--strict",
      "--expected-branch",
      branch,
      "--expected-commit",
      commit,
      "--report",
      reportFile,
    ],
    { cwd: directory, encoding: "utf8" },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  assert.equal(report.clean, true);
  assert.equal(report.readyForProductionPackage, true);
  assert.match(report.sourceCommit, /^[a-f0-9]{40}$/u);
  assert.equal(report.expectedBranch, branch);
  assert.equal(report.expectedCommit, commit);
});

test("严格冻结拒绝错误来源分支或提交", async (t) => {
  const directory = await createRepository(t);
  const commit = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8",
  }).stdout.trim();
  const result = spawnSync(
    process.execPath,
    [auditor, "--strict", "--expected-branch", "production", "--expected-commit", commit],
    { cwd: directory, encoding: "utf8" },
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /与预期正式来源分支 production 不一致/u);
});

test("已跟踪修改和未跟踪文件会在耗时构建前阻断正式门禁", async (t) => {
  const directory = await createRepository(t);
  await writeFile(path.join(directory, "tracked.txt"), "changed\n", "utf8");
  await writeFile(path.join(directory, "new.txt"), "new\n", "utf8");
  const result = spawnSync(process.execPath, [auditor, "--strict"], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /工作树尚未冻结，共 2 个变更条目/u);
  assert.match(result.stdout, /未跟踪目录\/文件 1/u);
});

test("疑似密钥文件名即使尚未跟踪也会明确告警", async (t) => {
  const directory = await createRepository(t);
  await writeFile(path.join(directory, "production-secret.pem"), "not-a-real-key\n", "utf8");
  const result = spawnSync(process.execPath, [auditor, "--strict"], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /疑似敏感文件名/u);
});

test("环境模板和包含 credentials 字样的源码不会被误判为真实密钥", async (t) => {
  const directory = await createRepository(t);
  await writeFile(path.join(directory, ".env.example"), "KEY=placeholder\n", "utf8");
  await writeFile(
    path.join(directory, "credentials-helper.ts"),
    "export const ok = true;\n",
    "utf8",
  );
  const reportFile = path.join(directory, "..", `${path.basename(directory)}-template-report.json`);
  t.after(() => rm(reportFile, { force: true }));
  const result = spawnSync(process.execPath, [auditor, "--report", reportFile], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  assert.deepEqual(report.sensitivePaths, []);
});

test("冻结报告按目录和扩展名汇总变更，并标记异常根目录文件", async (t) => {
  const directory = await createRepository(t);
  await writeFile(path.join(directory, ".gitattributes"), "* text=auto\n", "utf8");
  await writeFile(path.join(directory, "handoff-note.md"), "待人工确认归属\n", "utf8");
  const sourceDirectory = path.join(directory, "src");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(sourceDirectory));
  await writeFile(path.join(sourceDirectory, "feature.ts"), "export const ok = true;\n", "utf8");
  const reportFile = path.join(directory, "freeze-report.json");
  const result = spawnSync(process.execPath, [auditor, "--report", reportFile], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.changeSetReview.untrackedGroups.src, 1);
  assert.equal(report.changeSetReview.untrackedExtensions[".ts"], 1);
  assert.deepEqual(report.changeSetReview.manualReviewPaths, ["handoff-note.md"]);
  assert.deepEqual(report.changeSetReview.oversizedUntrackedPaths, []);
  assert.deepEqual(report.changeSetReview.binaryUntrackedPaths, []);
});
