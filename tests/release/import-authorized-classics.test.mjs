import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadAuthorization,
  validateBatch,
} from "../../scripts/operations/import-approved-classics.mjs";

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

test("公司授权台账只解除登记书目的许可阻断并生成 AUTHORIZED 权利记录", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "authorized-classics-"));
  try {
    await mkdir(path.join(root, "经"), { recursive: true });
    const candidate = {
      title: "授权样书",
      author: "佚名",
      dynasty: "古代",
      category: "经",
      intro: "授权流程测试",
      source: "冻结候选",
      chapters: [{ title: "全文", content: "天地玄黄" }],
      _releaseAudit: {
        status: "CANDIDATE",
        unresolvedIssues: [{ code: "SOURCE_LICENSE_EXTERNAL_REVIEW_REQUIRED" }],
      },
      _copyright: {
        sourceName: "原始整理来源",
        sourceUrl: "https://example.invalid/source",
        license: "PUBLIC-DOMAIN-SOURCE-CLAIM",
        licenseUrl: "https://example.invalid/claim",
        attributionText: "原始来源说明",
        modificationNotice: "格式结构化",
        rightsBoundary: "原始权利说明",
      },
    };
    const candidateContent = `${JSON.stringify(candidate, null, 2)}\n`;
    const candidateFile = "经/授权样书.json";
    await writeFile(path.join(root, candidateFile), candidateContent, "utf8");

    await writeFile(
      path.join(root, "manifest.json"),
      `${JSON.stringify({
        standard: "REBU-CLASSICS-OPEN-V4",
        batchId: "authorized-test-batch",
        blockedBooks: 0,
        completedBooks: 1,
        candidates: [
          {
            file: candidateFile,
            sha256: sha256(candidateContent),
            bytes: Buffer.byteLength(candidateContent),
          },
        ],
      })}\n`,
      "utf8",
    );
    await writeFile(
      path.join(root, "audit-intake.json"),
      `${JSON.stringify({
        standard: "REBU-CLASSICS-OPEN-V4",
        batchId: "authorized-test-batch",
        blockedBooks: 0,
        blockers: 0,
        completedBooks: 1,
        queueReadyBooks: 1,
        results: [
          {
            file: candidateFile,
            title: candidate.title,
            blockers: 0,
            chapterCount: 1,
          },
        ],
      })}\n`,
      "utf8",
    );

    const authorizationFile = path.join(root, "authorization.json");
    await writeFile(
      authorizationFile,
      `${JSON.stringify({
        schemaVersion: 1,
        kind: "rebu-classics-company-authorization",
        status: "CONFIRMED",
        authorizationId: "AUTH-TEST-001",
        confirmedAt: "2026-08-20T00:00:00.000Z",
        confirmedBy: "project-owner-user",
        publicNotice: "本内容经权利方授权使用。",
        titles: [candidate.title],
      })}\n`,
      "utf8",
    );

    await assert.rejects(
      validateBatch(root, "authorized-test-batch"),
      /仍有阻断性未解决问题|许可不在允许发布清单/,
    );
    const authorization = await loadAuthorization(authorizationFile);
    const validated = await validateBatch(
      root,
      "authorized-test-batch",
      [],
      authorization,
    );
    assert.equal(validated.candidates.length, 1);
    assert.equal(validated.candidates[0].copyright.license, "AUTHORIZED");
    assert.equal(
      validated.candidates[0].authorization.authorizationId,
      "AUTH-TEST-001",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("大型授权批次可按索引分段校验，且只读取当前分段候选", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "authorized-classics-range-"));
  try {
    await mkdir(path.join(root, "经"), { recursive: true });
    const entries = [];
    const auditResults = [];
    for (const [index, title] of ["第一部", "第二部", "第三部"].entries()) {
      const candidate = {
        title,
        author: "佚名",
        dynasty: "古代",
        category: "经",
        intro: "分段校验测试",
        source: "冻结候选",
        chapters: [{ title: "全文", content: `正文${index + 1}` }],
        _releaseAudit: { status: "CANDIDATE", unresolvedIssues: [] },
        _copyright: {
          sourceName: "测试来源",
          sourceUrl: "https://example.invalid/source",
          license: "PUBLIC-DOMAIN",
          licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
          attributionText: "测试来源",
          modificationNotice: "格式结构化",
          rightsBoundary: "测试",
        },
      };
      const content = `${JSON.stringify(candidate, null, 2)}\n`;
      const file = `经/${title}.json`;
      await writeFile(path.join(root, file), content, "utf8");
      entries.push({ file, sha256: sha256(content), bytes: Buffer.byteLength(content) });
      auditResults.push({ file, title, blockers: 0, chapterCount: 1 });
    }
    await writeFile(
      path.join(root, "manifest.json"),
      `${JSON.stringify({
        standard: "REBU-CLASSICS-OPEN-V4",
        batchId: "range-test-batch",
        blockedBooks: 0,
        completedBooks: 3,
        candidates: entries,
      })}\n`,
      "utf8",
    );
    await writeFile(
      path.join(root, "audit-intake.json"),
      `${JSON.stringify({
        standard: "REBU-CLASSICS-OPEN-V4",
        batchId: "range-test-batch",
        blockedBooks: 0,
        blockers: 0,
        completedBooks: 3,
        queueReadyBooks: 3,
        results: auditResults,
      })}\n`,
      "utf8",
    );

    const validated = await validateBatch(
      root,
      "range-test-batch",
      [],
      null,
      { startIndex: 1, maxBooks: 1 },
    );
    assert.equal(validated.candidates.length, 1);
    assert.equal(validated.candidates[0].candidate.title, "第二部");
    assert.equal(validated.registeredFileCount, 1);
    assert.deepEqual(validated.selection, {
      startIndex: 1,
      maxBooks: 1,
      selectedBooks: 1,
      totalBooks: 3,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
