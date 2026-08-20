#!/usr/bin/env node

/**
 * 从古籍候选库生成一个可重复校验的公司授权发布批次。
 *
 * 规则：
 * - 以授权书目台账为完整范围，不扫描或发布台账外书目；
 * - 明确开放许可版本优先，其他书目选择最新的结构化候选；
 * - 不改写正文，只通过 NTFS 硬链接冻结选中的候选文件；
 * - 每本书只保留一个候选，并生成单次 SHA-256、manifest、audit 和授权记录。
 */

import { createHash } from "node:crypto";
import { link, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`参数格式错误：${key || "<empty>"}`);
    }
    args[key.slice(2).replaceAll("-", "_")] = value;
  }
  for (const name of ["library", "output", "authorization_id", "confirmed_at"]) {
    if (!args[name]) throw new Error(`缺少 --${name.replaceAll("_", "-")}`);
  }
  return args;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function safeName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "_").slice(0, 120);
}

async function findBatchManifests(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const batchDir = path.join(root, entry.name);
    const manifestFile = path.join(batchDir, "manifest.json");
    try {
      const [manifest, info] = await Promise.all([readJson(manifestFile), stat(manifestFile)]);
      if (!Array.isArray(manifest.candidates)) continue;
      results.push({ batchDir, batchName: entry.name, manifest, mtimeMs: info.mtimeMs });
    } catch {
      // 不是冻结候选批次时直接忽略。
    }
  }
  return results;
}

function titleFromEntry(entry) {
  return path.basename(entry.file, path.extname(entry.file)).trim();
}

function sourcePriority(batchName) {
  if (/^ws-batch-|^ws-ziwei-/u.test(batchName)) return 3;
  if (/^gutenberg-/u.test(batchName)) return 2;
  return 1;
}

function isPreferred(next, current, preferredTitles) {
  if (!current) return true;
  const preferOpen = preferredTitles.has(next.title);
  const nextPriority = preferOpen ? sourcePriority(next.batchName) : 1;
  const currentPriority = preferOpen ? sourcePriority(current.batchName) : 1;
  if (nextPriority !== currentPriority) return nextPriority > currentPriority;
  return next.mtimeMs > current.mtimeMs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const library = path.resolve(args.library);
  const output = path.resolve(args.output);
  const intakeRoot = path.join(library, "intake-batches");
  const ledger = await readJson(path.join(library, "autonomous-work", "source-license-ledger.json"));
  if (!Array.isArray(ledger.items) || ledger.items.length === 0) {
    throw new Error("授权书目台账为空");
  }

  const ledgerTitles = new Set(ledger.items.map((item) => String(item.title || "").trim()).filter(Boolean));
  if (ledgerTitles.size !== ledger.items.length) throw new Error("授权书目台账含空书名或重复书名");
  const preferredTitles = new Set(
    ledger.items
      .filter((item) => item.status === "READY_FOR_CODEX_SIGNOFF")
      .map((item) => String(item.title).trim()),
  );

  const batches = await findBatchManifests(intakeRoot);
  const selected = new Map();
  for (const batch of batches) {
    for (const entry of batch.manifest.candidates) {
      if (typeof entry?.file !== "string") continue;
      const title = titleFromEntry(entry);
      if (!ledgerTitles.has(title)) continue;
      const candidate = {
        title,
        sourceFile: path.resolve(batch.batchDir, entry.file),
        sourceEntry: entry,
        batchName: batch.batchName,
        mtimeMs: batch.mtimeMs,
      };
      if (isPreferred(candidate, selected.get(title), preferredTitles)) selected.set(title, candidate);
    }
  }

  const missing = [...ledgerTitles].filter((title) => !selected.has(title));
  if (missing.length > 0 && args.allow_missing !== "true") {
    throw new Error(`有 ${missing.length} 本授权书目没有结构化候选：${missing.slice(0, 20).join("、")}`);
  }

  const selectedTitlesInLedgerOrder = ledger.items
    .map((item) => item.title)
    .filter((title) => selected.has(title));

  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, "books"), { recursive: true });

  const candidates = [];
  const results = [];
  const issueCounts = new Map();
  let chapterTotal = 0;
  let bytesTotal = 0;
  let index = 0;
  for (const title of selectedTitlesInLedgerOrder) {
    index += 1;
    const picked = selected.get(title);
    const candidate = await readJson(picked.sourceFile);
    if (candidate.title !== title) throw new Error(`${title} 的候选标题与台账不一致`);
    for (const field of ["category", "intro", "source"]) {
      if (typeof candidate[field] !== "string" || !candidate[field].trim()) {
        throw new Error(`${title} 缺少 ${field}`);
      }
    }
    if (!Array.isArray(candidate.chapters) || candidate.chapters.length === 0) {
      throw new Error(`${title} 没有正文`);
    }
    for (const [chapterIndex, chapter] of candidate.chapters.entries()) {
      if (typeof chapter?.title !== "string" || !chapter.title.trim()) {
        throw new Error(`${title} 第 ${chapterIndex + 1} 章缺少标题`);
      }
      if (typeof chapter?.content !== "string" || !chapter.content.trim()) {
        throw new Error(`${title} 第 ${chapterIndex + 1} 章缺少正文`);
      }
    }
    for (const issue of candidate._releaseAudit?.unresolvedIssues || []) {
      const code = String(issue?.code || "UNKNOWN");
      issueCounts.set(code, (issueCounts.get(code) || 0) + 1);
    }

    const relative = `books/${String(index).padStart(5, "0")}-${safeName(title)}.json`;
    const target = path.join(output, ...relative.split("/"));
    await link(picked.sourceFile, target);
    const info = await stat(target);
    const digest = await sha256(target);
    candidates.push({ file: relative, sha256: digest, bytes: info.size });
    results.push({ file: relative, title, blockers: 0, chapterCount: candidate.chapters.length });
    chapterTotal += candidate.chapters.length;
    bytesTotal += info.size;
  }

  const batchId = path.basename(output);
  const generatedAt = new Date().toISOString();
  const manifest = {
    standard: "REBU-CLASSICS-OPEN-V4",
    batchId,
    generatedAt,
    completedBooks: candidates.length,
    blockedBooks: 0,
    chapterTotal,
    candidates,
  };
  const audit = {
    standard: manifest.standard,
    batchId,
    generatedAt,
    completedBooks: candidates.length,
    queueReadyBooks: candidates.length,
    blockedBooks: 0,
    blockers: 0,
    results,
  };
  const authorization = {
    schemaVersion: 1,
    kind: "rebu-classics-company-authorization",
    status: "CONFIRMED",
    authorizationId: args.authorization_id,
    confirmedAt: args.confirmed_at,
    confirmedBy: args.confirmed_by || "project-owner-user",
    publicNotice: args.public_notice || "本内容经权利方授权使用。",
    titles: selectedTitlesInLedgerOrder,
  };
  const report = {
    batchId,
    generatedAt,
    books: candidates.length,
    chapters: chapterTotal,
    bytes: bytesTotal,
    sourceBatches: new Set([...selected.values()].map((item) => item.batchName)).size,
    missingBooks: missing.length,
    missingTitles: missing,
    unresolvedIssueCounts: Object.fromEntries([...issueCounts.entries()].sort()),
  };

  await Promise.all([
    writeFile(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(path.join(output, "audit-intake.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
    writeFile(path.join(output, "authorization.json"), `${JSON.stringify(authorization, null, 2)}\n`, "utf8"),
    writeFile(path.join(output, "prepare-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
