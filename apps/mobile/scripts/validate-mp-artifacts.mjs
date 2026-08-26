/** 微信小程序最终文本产物兼容性门禁。 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, relative, resolve } from "node:path";

const DEFAULT_DIST = resolve(process.cwd(), "dist", "build", "mp-weixin");
const TEXT_EXTENSIONS = new Set([".js", ".json", ".wxml", ".wxss"]);

export function validateMpTextArtifact(source, extension) {
  const issues = [];
  if (source.includes("\uFFFD")) issues.push("包含 Unicode 替换字符 U+FFFD");
  if (extension === ".wxss") {
    if (/>\s*\*/u.test(source)) issues.push("包含微信 WXSS 不支持的通配子选择器 > *");
    if (/>\s*:(?:first|last|nth|nth-last|only)-child/u.test(source)) {
      issues.push("包含微信 WXSS 不稳定的无类型子伪类选择器");
    }
    if (/(?:^|[^-]):deep\(|::v-deep|(?:^|[^-]):global\(/u.test(source)) {
      issues.push("包含未被编译器消解的深度或全局选择器");
    }
  }
  return issues;
}

/** 微信会忽略形如 __name__ 的保留路径段，产物中出现即视为发布阻断。 */
export function validateMpArtifactPath(artifactPath) {
  const segments = String(artifactPath).replaceAll("\\", "/").split("/");
  return segments.some((segment) => /^__.+__$/u.test(segment))
    ? ["包含微信会忽略的双下划线保留路径段"]
    : [];
}

async function findArtifactFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) return findArtifactFiles(target);
      return entry.isFile() ? [target] : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right));
}

export async function validateMpArtifactDirectory(directory = DEFAULT_DIST) {
  const artifactFiles = await findArtifactFiles(directory);
  const files = artifactFiles.filter((file) => TEXT_EXTENSIONS.has(extname(file)));
  const failures = [];
  for (const file of artifactFiles) {
    for (const message of validateMpArtifactPath(relative(directory, file))) {
      failures.push({ file, message });
    }
  }
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const message of validateMpTextArtifact(source, extname(file))) {
      failures.push({ file, message });
    }
  }

  const xingmingEngine = resolve(directory, "pkg-paipan2", "lib", "xingming-engine.js");
  const xingmingSource = await readFile(xingmingEngine, "utf8");
  if (!xingmingSource.includes("JSON.parse")) {
    failures.push({ file: xingmingEngine, message: "康熙字库未使用微信兼容的分段 JSON 解析" });
  }
  return { files, failures };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]).toLowerCase() : "";
const currentPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === currentPath) {
  const directory = resolve(process.argv[2] || DEFAULT_DIST);
  try {
    const result = await validateMpArtifactDirectory(directory);
    if (result.files.length === 0) throw new Error(`未找到微信文本产物：${directory}`);
    if (result.failures.length > 0) {
      console.error(`❌ 微信文本产物兼容性校验失败，共 ${result.failures.length} 项：`);
      for (const failure of result.failures.slice(0, 20)) {
        console.error(`- ${relative(directory, failure.file)}：${failure.message}`);
      }
      process.exitCode = 1;
    } else {
      console.log(`✅ 微信文本产物兼容性校验通过，共检查 ${result.files.length} 个文件`);
    }
  } catch (error) {
    console.error(`❌ 微信文本产物兼容性校验无法执行：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
