import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const auditScript = path.join(projectRoot, "scripts/release/audit-release-retention.mjs");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function createRelease(root, releaseId) {
  const releaseDir = path.join(root, "releases", releaseId);
  const evidenceDir = path.join(root, "release-evidence", releaseId);
  const packageName = `gx-deploy-91-${releaseId}.tar.gz`;
  const packageContent = Buffer.from(`fixed-package:${releaseId}`);
  await mkdir(releaseDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(releaseDir, ".release-id"), `${releaseId}\n`);
  await writeFile(path.join(releaseDir, "RELEASE-MANIFEST.json"), "{}\n");
  await writeFile(path.join(root, "release-packages", packageName), packageContent);
  await writeFile(
    path.join(root, "release-packages", `${packageName}.sha256`),
    `${sha256(packageContent)}  ${packageName}\n`,
  );
  return { releaseDir, packageName };
}

test("版本保留盘点保护可信版本、只报告候选并阻断包篡改", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "guoxue-retention-"));
  try {
    await mkdir(path.join(root, "release-packages"), { recursive: true });
    await mkdir(path.join(root, "release-evidence"), { recursive: true });
    const previousId = "release-20260730-001";
    const currentId = "release-20260731-001";
    const obsoleteId = "release-20260720-001";
    const previous = await createRelease(root, previousId);
    const current = await createRelease(root, currentId);
    const obsolete = await createRelease(root, obsoleteId);
    await mkdir(path.join(root, "releases", ".candidate-interrupted"), { recursive: true });
    await writeFile(path.join(root, "releases", ".candidate-interrupted", "debug.log"), "failed\n");
    await writeFile(path.join(root, "current-release-id"), `${currentId}\n`);
    await symlink(
      current.releaseDir,
      path.join(root, "current"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const oldHash = sha256(Buffer.from(`fixed-package:${previousId}`));
    const currentHash = sha256(Buffer.from(`fixed-package:${currentId}`));
    await writeFile(
      path.join(root, "release-history.tsv"),
      [
        `2026-07-30T10:00:00Z\tactivate\t${previousId}\t-\tfalse\t${oldHash}`,
        `2026-07-31T10:00:00Z\tactivate\t${currentId}\t${previousId}\ttrue\t${currentHash}`,
      ].join("\n") + "\n",
    );

    const reportPath = path.join(root, "retention-report.json");
    const first = spawnSync(
      process.execPath,
      [auditScript, "--root", root, "--keep", "2", "--min-free-gb", "1", "--report", reportPath],
      { encoding: "utf8" },
    );
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.destructiveActionPerformed, false);
    assert.deepEqual(
      report.protectedReleases.map((entry) => entry.releaseId).sort(),
      [currentId, previousId].sort(),
    );
    assert.equal(report.cleanupCandidates.releaseDirectories[0].releaseId, obsoleteId);
    assert.equal(report.cleanupCandidates.packages[0].releaseId, obsoleteId);
    assert.equal(report.cleanupCandidates.interruptedCandidates.length, 1);

    await writeFile(path.join(root, "current-release-id"), `${previousId}\n`);
    const staleCompatibilityPointer = spawnSync(
      process.execPath,
      [auditScript, "--root", root, "--keep", "2", "--min-free-gb", "1"],
      { encoding: "utf8" },
    );
    assert.equal(staleCompatibilityPointer.status, 1);
    assert.match(
      staleCompatibilityPointer.stderr,
      /current-release-id 兼容指针与 current 目录不一致/,
    );
    await writeFile(path.join(root, "current-release-id"), `${currentId}\n`);

    await writeFile(path.join(root, "release-packages", current.packageName), "tampered\n");
    const second = spawnSync(
      process.execPath,
      [auditScript, "--root", root, "--keep", "2", "--min-free-gb", "1"],
      { encoding: "utf8" },
    );
    assert.equal(second.status, 1);
    assert.match(second.stderr, /保留发布包 SHA-256 不一致/);

    await rm(obsolete.releaseDir, { recursive: true, force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
