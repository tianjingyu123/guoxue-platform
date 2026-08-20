#!/usr/bin/env node

/**
 * 将已经通过发布门禁的古籍候选批次安全导入数据库。
 *
 * 设计约束：
 * - 默认仅校验；必须显式传入 --mode dry-run 或 --mode apply。
 * - 校验批次清单、全部登记文件哈希、审核报告、许可与候选结构。
 * - 同名书最多一条；已有真实阅读数据时拒绝替换。
 * - 支持按清单索引分段校验和写入，避免大型批次耗尽容器内存。
 * - 替换前完整备份已有书籍、章节和版权记录。
 */

import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ALLOWED_LICENSES = new Set([
  "CC-BY-SA-4.0",
  "CC-BY-SA-3.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "PUBLIC-DOMAIN",
  "OWNED",
  "AUTHORIZED",
]);

const ALLOWED_STANDARDS = new Set(["REBU-CLASSICS-OPEN-V4", "REBU-CLASSICS-FAST-V5"]);

const ALLOWED_V5_RELEASE_CHANNELS = new Set([
  "OPEN_LICENSE_DIRECT",
  "PUBLIC_DOMAIN_INDEPENDENT_DIGITIZATION",
  "COMPANY_AUTHORIZED",
]);

const ALLOWED_NON_BLOCKING_ISSUES = new Set([
  "PRIVATE_USE_CHARACTER_REVIEW_REQUIRED",
  "MISSING_CHARACTER_REVIEW_REQUIRED",
  "MISSING_CHARACTER_BOX_REVIEW_REQUIRED",
  "REPLACEMENT_CHARACTER_REVIEW_REQUIRED",
]);

const AUTHORIZATION_RESOLVED_ISSUES = new Set([
  "SOURCE_LICENSE_EXTERNAL_REVIEW_REQUIRED",
  "BLOCKED_LICENSE_NO_CLEAR_SOURCE",
  "DEFERRED_COMMERCIAL_PERMISSION",
]);

function parseArgs(argv) {
  const parsed = { mode: "validate", auditor: "Codex-release-review" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`无法识别的参数：${key}`);
    const name = key.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`参数 --${name} 缺少值`);
    parsed[name.replaceAll("-", "_")] = value;
    index += 1;
  }
  if (!parsed.batch) throw new Error("必须传入 --batch <批次目录>");
  if (!new Set(["validate", "dry-run", "apply"]).has(parsed.mode)) {
    throw new Error("--mode 仅支持 validate、dry-run、apply");
  }
  return parsed;
}

function canonicalPath(root, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative)) {
    throw new Error(`批次文件路径非法：${relative}`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`批次文件越界：${relative}`);
  }
  return resolved;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function loadAuthorization(fileArg) {
  if (!fileArg) return null;
  const file = path.resolve(fileArg);
  const record = await readJson(file);
  if (
    record?.schemaVersion !== 1 ||
    record?.kind !== "rebu-classics-company-authorization" ||
    record?.status !== "CONFIRMED"
  ) {
    throw new Error("公司授权记录格式无效或尚未确认");
  }
  for (const field of ["authorizationId", "confirmedAt", "confirmedBy", "publicNotice"]) {
    requireString(record[field], field, "公司授权记录");
  }
  if (!Array.isArray(record.titles) || record.titles.length === 0) {
    throw new Error("公司授权记录没有登记书目范围");
  }
  const titles = new Set(record.titles.map((title) => String(title).trim()).filter(Boolean));
  if (titles.size !== record.titles.length) {
    throw new Error("公司授权记录包含空书名或重复书名");
  }
  return { file, record, titles, sha256: await sha256(file) };
}

async function sha256(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

function collectManifestFiles(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectManifestFiles(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (
    typeof value.file === "string" &&
    typeof value.sha256 === "string" &&
    Number.isInteger(value.bytes)
  ) {
    output.push(value);
  }
  for (const child of Object.values(value)) collectManifestFiles(child, output);
  return output;
}

function requireString(value, field, title) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${title} 缺少 ${field}`);
  }
}

async function validateBatch(
  batchDir,
  expectedBatch,
  excludedTitles = [],
  authorization = null,
  selection = {},
) {
  const manifestPath = path.join(batchDir, "manifest.json");
  const auditPath = path.join(batchDir, "audit-intake.json");
  const [manifest, audit] = await Promise.all([readJson(manifestPath), readJson(auditPath)]);

  if (!ALLOWED_STANDARDS.has(manifest.standard)) {
    throw new Error(`批次标准不允许导入：${manifest.standard}`);
  }
  if (expectedBatch && manifest.batchId !== expectedBatch) {
    throw new Error(`批次 ID 不匹配：期望 ${expectedBatch}，实际 ${manifest.batchId}`);
  }
  if (audit.batchId !== manifest.batchId || audit.standard !== manifest.standard) {
    throw new Error("审核报告与批次清单不匹配");
  }
  if (manifest.blockedBooks !== 0 || audit.blockedBooks !== 0 || audit.blockers !== 0) {
    throw new Error("批次仍有阻断项，禁止导入");
  }
  if (!Array.isArray(manifest.candidates) || manifest.candidates.length === 0) {
    throw new Error("批次没有候选书目");
  }
  if (
    manifest.completedBooks !== manifest.candidates.length ||
    audit.completedBooks !== manifest.candidates.length ||
    audit.queueReadyBooks !== manifest.candidates.length
  ) {
    throw new Error("候选数量、完成数量或待发布数量不一致");
  }

  const startIndex = Number(selection.startIndex ?? 0);
  const maxBooks = Number(selection.maxBooks ?? manifest.candidates.length);
  if (!Number.isInteger(startIndex) || startIndex < 0) {
    throw new Error("startIndex 必须是非负整数");
  }
  if (!Number.isInteger(maxBooks) || maxBooks <= 0) {
    throw new Error("maxBooks 必须是正整数");
  }
  if (startIndex >= manifest.candidates.length) {
    throw new Error(`startIndex 超出候选范围：${startIndex}/${manifest.candidates.length}`);
  }
  if (startIndex > 0 && excludedTitles.length > 0) {
    throw new Error("分段导入不支持 --exclude-titles，请先生成不含排除项的冻结批次");
  }
  const selectedEntries = manifest.candidates.slice(startIndex, startIndex + maxBooks);
  const selectedFiles = new Set(selectedEntries.map((entry) => entry.file));
  const registeredFiles = collectManifestFiles(manifest).filter((entry) =>
    selectedFiles.has(entry.file),
  );
  const seenFiles = new Set();
  for (const entry of registeredFiles) {
    if (seenFiles.has(entry.file)) throw new Error(`清单文件重复：${entry.file}`);
    seenFiles.add(entry.file);
    const absolute = canonicalPath(batchDir, entry.file);
    const info = await stat(absolute);
    if (!info.isFile()) throw new Error(`清单目标不是文件：${entry.file}`);
    if (info.size !== entry.bytes) throw new Error(`文件大小不匹配：${entry.file}`);
    const digest = await sha256(absolute);
    if (digest !== entry.sha256) throw new Error(`文件哈希不匹配：${entry.file}`);
  }

  const auditByFile = new Map((audit.results || []).map((item) => [item.file, item]));
  const excludedTitleSet = new Set(excludedTitles);
  const manifestTitles = new Set();
  const titles = new Set();
  const candidates = [];
  for (const entry of selectedEntries) {
    const file = canonicalPath(batchDir, entry.file);
    const candidate = await readJson(file);
    requireString(candidate.title, "title", entry.file);
    if (manifestTitles.has(candidate.title)) throw new Error(`候选书名重复：${candidate.title}`);
    manifestTitles.add(candidate.title);
    if (excludedTitleSet.has(candidate.title)) continue;
    requireString(candidate.category, "category", candidate.title);
    requireString(candidate.intro, "intro", candidate.title);
    requireString(candidate.source, "source", candidate.title);
    if (titles.has(candidate.title)) throw new Error(`候选书名重复：${candidate.title}`);
    titles.add(candidate.title);
    if (!Array.isArray(candidate.chapters) || candidate.chapters.length === 0) {
      throw new Error(`${candidate.title} 没有正文章节`);
    }
    candidate.chapters.forEach((chapter, index) => {
      requireString(chapter.title, `chapters[${index}].title`, candidate.title);
      requireString(chapter.content, `chapters[${index}].content`, candidate.title);
    });
    if (!new Set(["CANDIDATE", "READY_FOR_BATCH_SIGNOFF"]).has(candidate._releaseAudit?.status)) {
      throw new Error(`${candidate.title} 不是待终审候选状态`);
    }
    const companyAuthorized = authorization?.titles.has(candidate.title) === true;
    const unresolvedIssues = candidate._releaseAudit?.unresolvedIssues || [];
    const blockingIssues = unresolvedIssues.filter(
      (issue) =>
        !ALLOWED_NON_BLOCKING_ISSUES.has(issue?.code) &&
        !(companyAuthorized && AUTHORIZATION_RESOLVED_ISSUES.has(issue?.code)),
    );
    if (blockingIssues.length !== 0) {
      throw new Error(`${candidate.title} 仍有阻断性未解决问题`);
    }
    const copyright = companyAuthorized
      ? {
          ...candidate._copyright,
          license: "AUTHORIZED",
          licenseUrl: null,
          attributionText: authorization.record.publicNotice,
          modificationNotice:
            candidate._copyright?.modificationNotice || "平台进行了格式与章节结构化处理",
          rightsBoundary: `公司授权编号：${authorization.record.authorizationId}`,
        }
      : candidate._copyright;
    if (!copyright || !ALLOWED_LICENSES.has(copyright.license)) {
      throw new Error(`${candidate.title} 的许可不在允许发布清单`);
    }
    if (manifest.standard === "REBU-CLASSICS-FAST-V5") {
      const releaseChannel = companyAuthorized
        ? "COMPANY_AUTHORIZED"
        : candidate._provenance?.releaseChannel || candidate.releaseChannel;
      if (!ALLOWED_V5_RELEASE_CHANNELS.has(releaseChannel)) {
        throw new Error(`${candidate.title} 缺少 V5 可公开发布通道`);
      }
      if (
        releaseChannel === "PUBLIC_DOMAIN_INDEPENDENT_DIGITIZATION" &&
        copyright.license !== "PUBLIC-DOMAIN"
      ) {
        throw new Error(`${candidate.title} 的公版独立数字化通道必须使用 PUBLIC-DOMAIN 权利记录`);
      }
    }
    const requiredCopyrightFields = companyAuthorized
      ? [
          "sourceName",
          "sourceUrl",
          "license",
          "attributionText",
          "modificationNotice",
          "rightsBoundary",
        ]
      : [
          "sourceName",
          "sourceUrl",
          "license",
          "licenseUrl",
          "attributionText",
          "modificationNotice",
          "rightsBoundary",
        ];
    for (const field of requiredCopyrightFields) {
      requireString(copyright[field], `_copyright.${field}`, candidate.title);
    }
    const auditResult = auditByFile.get(entry.file);
    if (!auditResult || auditResult.title !== candidate.title) {
      throw new Error(`${candidate.title} 缺少匹配的审核结果`);
    }
    if (auditResult.blockers !== 0 || auditResult.chapterCount !== candidate.chapters.length) {
      throw new Error(`${candidate.title} 审核结果与候选章节不一致`);
    }
    candidates.push({
      entry,
      candidate,
      copyright,
      authorization: companyAuthorized
        ? {
            authorizationId: authorization.record.authorizationId,
            confirmedAt: authorization.record.confirmedAt,
            confirmedBy: authorization.record.confirmedBy,
            recordSha256: authorization.sha256,
          }
        : null,
    });
  }
  const unknownExcludedTitles = [...excludedTitleSet].filter((title) => !manifestTitles.has(title));
  if (unknownExcludedTitles.length > 0) {
    throw new Error(`排除书目不在批次中：${unknownExcludedTitles.join("、")}`);
  }
  if (candidates.length === 0) throw new Error("排除后没有可导入书目");

  return {
    manifest,
    audit,
    candidates,
    registeredFileCount: registeredFiles.length,
    excludedTitles: [...excludedTitleSet],
    warnings: candidates.reduce(
      (sum, item) => sum + (item.candidate._releaseAudit?.unresolvedIssues?.length || 0),
      0,
    ),
    selection: {
      startIndex,
      maxBooks,
      selectedBooks: selectedEntries.length,
      totalBooks: manifest.candidates.length,
    },
  };
}

function buildAuditNote({ manifest, entry, copyright, authorization, auditedAt }) {
  return [
    `导入批次：${manifest.batchId}`,
    `候选 SHA-256：${entry.sha256}`,
    `终审时间：${auditedAt.toISOString()}`,
    `署名：${copyright.attributionText}`,
    `修改说明：${copyright.modificationNotice}`,
    copyright.territoryNotice ? `地域提示：${copyright.territoryNotice}` : "",
    `权利边界：${copyright.rightsBoundary}`,
    authorization ? `公司授权：${authorization.authorizationId}` : "",
    authorization ? `授权确认：${authorization.confirmedAt} / ${authorization.confirmedBy}` : "",
    authorization ? `授权记录 SHA-256：${authorization.recordSha256}` : "",
  ]
    .filter(Boolean)
    .join("；");
}

async function inspectExisting(prisma, candidates) {
  const titles = candidates.map(({ candidate }) => candidate.title);
  const books = await prisma.classicBook.findMany({
    where: { title: { in: titles } },
    include: {
      chapters: { orderBy: { sortOrder: "asc" } },
      copyrights: { orderBy: { createdAt: "asc" } },
      progresses: true,
      bookmarks: true,
      ClassicReadingNote: true,
      annotations: true,
      commentaries: true,
      images: { include: { ocrTexts: true } },
    },
  });
  const grouped = new Map();
  for (const book of books) {
    const list = grouped.get(book.title) || [];
    list.push(book);
    grouped.set(book.title, list);
  }
  for (const [title, items] of grouped.entries()) {
    if (items.length > 1)
      throw new Error(`数据库存在 ${items.length} 条同名《${title}》，拒绝自动处理`);
  }

  const usage = {};
  for (const book of books) {
    const [progresses, bookmarks, notes, annotations, commentaries, images] = await Promise.all([
      prisma.readingProgress.count({ where: { bookId: book.id } }),
      prisma.bookmark.count({ where: { bookId: book.id } }),
      prisma.classicReadingNote.count({ where: { bookId: book.id } }),
      prisma.classicAnnotation.count({ where: { bookId: book.id } }),
      prisma.classicCommentary.count({ where: { bookId: book.id } }),
      prisma.classicImage.count({ where: { bookId: book.id } }),
    ]);
    usage[book.title] = { progresses, bookmarks, notes, annotations, commentaries, images };
  }
  return { books, grouped, usage };
}

function isAlreadyImported(book, candidateEntry, candidate, copyright) {
  if (!book || book.status !== "PUBLISHED" || book.deletedAt) return false;
  if (
    book.chapterCount !== candidate.chapters.length ||
    book.chapters.length !== candidate.chapters.length
  )
    return false;
  return book.copyrights.some(
    (item) =>
      item.sourceName === copyright.sourceName &&
      item.license === copyright.license &&
      item.auditNote?.includes(candidateEntry.sha256),
  );
}

async function clearClassicCache() {
  if (!process.env.REDIS_URL) return { status: "SKIPPED", reason: "REDIS_URL_MISSING" };
  let redis;
  try {
    const imported = await import("ioredis");
    const Redis = imported.default;
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });
    redis.on("error", () => {});
    await redis.connect();
    let cursor = "0";
    let deleted = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "classic:*", "COUNT", 200);
      cursor = nextCursor;
      if (keys.length > 0) deleted += await redis.del(...keys);
    } while (cursor !== "0");
    await redis.quit();
    return { status: "CLEARED", deleted };
  } catch (error) {
    return { status: "WARNING", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    if (redis && redis.status !== "end") redis.disconnect();
  }
}

async function runDatabaseMode(validated, args) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const existing = await inspectExisting(prisma, validated.candidates);
    const decisions = validated.candidates.map(({ entry, candidate, copyright }) => {
      const book = existing.grouped.get(candidate.title)?.[0] || null;
      if (isAlreadyImported(book, entry, candidate, copyright)) {
        return { title: candidate.title, action: "ALREADY_IMPORTED", bookId: book.id };
      }
      if (!book) return { title: candidate.title, action: "CREATE", bookId: null };
      const usage = existing.usage[candidate.title];
      const used = Object.entries(usage).filter(([, count]) => count > 0);
      if (used.length > 0) {
        if (args.replace_test_data === "true") {
          return {
            title: candidate.title,
            action: "REPLACE_TEST_DATA",
            bookId: book.id,
            usage,
          };
        }
        return {
          title: candidate.title,
          action: "BLOCKED_EXISTING_USAGE",
          bookId: book.id,
          usage,
        };
      }
      return { title: candidate.title, action: "REPLACE_UNUSED_SEED", bookId: book.id, usage };
    });

    const blockers = decisions.filter((item) => item.action === "BLOCKED_EXISTING_USAGE");
    if (args.mode === "dry-run") {
      return { mode: args.mode, decisions, blockers, applied: false };
    }
    if (blockers.length > 0) {
      throw new Error(`发现 ${blockers.length} 本已有用户或关联数据，拒绝自动替换`);
    }

    const auditedAt = new Date();
    const backup = {
      schemaVersion: 1,
      batchId: validated.manifest.batchId,
      generatedAt: auditedAt.toISOString(),
      existingBooks: existing.books,
    };
    const backupPath =
      args.backup ||
      path.resolve(`classic-import-backup-${validated.manifest.batchId}-${Date.now()}.json`);
    await writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

    const transactionSize = Math.max(1, Math.min(200, Number(args.transaction_size || 50)));
    const results = [];
    for (let offset = 0; offset < validated.candidates.length; offset += transactionSize) {
      const chunk = validated.candidates.slice(offset, offset + transactionSize);
      const chunkResults = await prisma.$transaction(
        async (tx) => {
        const imported = [];
        for (const { entry, candidate, copyright, authorization } of chunk) {
          const decision = decisions.find((item) => item.title === candidate.title);
          if (decision.action === "ALREADY_IMPORTED") {
            imported.push(decision);
            continue;
          }

          let bookId = decision.bookId;
          if (decision.action === "CREATE") {
            const created = await tx.classicBook.create({
              data: {
                title: candidate.title,
                author: candidate.author || null,
                dynasty: candidate.dynasty || null,
                category: candidate.category,
                intro: candidate.intro,
                source: candidate.source,
                chapterCount: 0,
                status: "DRAFT",
                deletedAt: null,
              },
            });
            bookId = created.id;
          } else {
            await tx.classicBook.update({
              where: { id: bookId },
              data: { status: "DRAFT", deletedAt: null },
            });
            if (decision.action === "REPLACE_TEST_DATA") {
              await tx.readingProgress.deleteMany({ where: { bookId } });
              await tx.bookmark.deleteMany({ where: { bookId } });
              await tx.classicReadingNote.deleteMany({ where: { bookId } });
              await tx.classicAnnotation.deleteMany({ where: { bookId } });
              await tx.classicCommentary.deleteMany({ where: { bookId } });
              await tx.classicImage.deleteMany({ where: { bookId } });
            }
            await tx.classicCopyright.deleteMany({ where: { bookId } });
            await tx.classicChapter.deleteMany({ where: { bookId } });
          }

          await tx.classicChapter.createMany({
            data: candidate.chapters.map((chapter, index) => ({
              bookId,
              title: chapter.title,
              content: chapter.content,
              sortOrder: index,
            })),
          });

          await tx.classicCopyright.upsert({
            where: { bookId_sourceName: { bookId, sourceName: copyright.sourceName } },
            create: {
              bookId,
              sourceName: copyright.sourceName,
              sourceUrl: copyright.sourceUrl,
              license: copyright.license,
              licenseUrl: copyright.licenseUrl,
              auditNote: buildAuditNote({
                manifest: validated.manifest,
                entry,
                copyright,
                authorization,
                auditedAt,
              }),
              auditedAt,
              auditedBy: args.auditor,
            },
            update: {
              sourceUrl: copyright.sourceUrl,
              license: copyright.license,
              licenseUrl: copyright.licenseUrl,
              auditNote: buildAuditNote({
                manifest: validated.manifest,
                entry,
                copyright,
                authorization,
                auditedAt,
              }),
              auditedAt,
              auditedBy: args.auditor,
            },
          });

          await tx.classicBook.update({
            where: { id: bookId },
            data: {
              title: candidate.title,
              author: candidate.author || null,
              dynasty: candidate.dynasty || null,
              category: candidate.category,
              intro: candidate.intro,
              source: candidate.source,
              chapterCount: candidate.chapters.length,
              status: "PUBLISHED",
              deletedAt: null,
            },
          });
          imported.push({
            title: candidate.title,
            action: decision.action,
            bookId,
            chapterCount: candidate.chapters.length,
          });
        }
        return imported;
        },
        { maxWait: 30_000, timeout: 600_000 },
      );
      results.push(...chunkResults);
      process.stderr.write(
        `古籍导入进度：${Math.min(offset + chunk.length, validated.candidates.length)}/${validated.candidates.length}\n`,
      );
    }

    const cache = await clearClassicCache();
    return {
      mode: args.mode,
      decisions,
      blockers: [],
      applied: true,
      backupPath,
      transactionSize,
      results,
      cache,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const batchDir = path.resolve(args.batch);
  const excludedTitles = String(args.exclude_titles || "")
    .split(",")
    .map((title) => title.trim())
    .filter(Boolean);
  const authorization = await loadAuthorization(args.authorization);
  const selection = {
    startIndex: args.start_index === undefined ? 0 : Number(args.start_index),
    maxBooks:
      args.max_books === undefined ? Number.MAX_SAFE_INTEGER : Number(args.max_books),
  };
  const validated = await validateBatch(
    batchDir,
    args.expected_batch,
    excludedTitles,
    authorization,
    selection,
  );
  let result = {
    mode: args.mode,
    batchId: validated.manifest.batchId,
    books: validated.candidates.length,
    chapters: validated.candidates.reduce((sum, item) => sum + item.candidate.chapters.length, 0),
    registeredFileCount: validated.registeredFileCount,
    warnings: validated.warnings,
    excludedTitles: validated.excludedTitles,
    validated: true,
    selection: validated.selection,
  };
  if (args.mode !== "validate") {
    result = { ...result, ...(await runDatabaseMode(validated, args)) };
  }
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (args.output) await writeFile(path.resolve(args.output), serialized, "utf8");
  process.stdout.write(serialized);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

export { collectManifestFiles, loadAuthorization, validateBatch };
