/**
 * 微信小程序 WXML 产物词法校验。
 *
 * uni-app 构建成功不代表微信开发者工具一定能解析生成的 WXML。例如源模板属性
 * 内嵌引号可能被编译成 `placeholder="请输入"确认注销""`，直到开发者工具预览
 * 才报 unexpected character。本脚本在构建阶段检查标签与属性边界，提前阻断发布。
 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";

const DEFAULT_DIST = resolve(process.cwd(), "dist", "build", "mp-weixin");
const RAW_TEXT_TAGS = new Set(["wxs", "script", "style"]);

const isWhitespace = (character) => /\s/u.test(character);
const isAttributeBoundary = (character) =>
  character === undefined || isWhitespace(character) || character === "/" || character === ">";

function locationAt(source, index) {
  const before = source.slice(0, index);
  const lastLineBreak = before.lastIndexOf("\n");
  return {
    index,
    line: (before.match(/\n/gu)?.length ?? 0) + 1,
    column: index - lastLineBreak,
  };
}

function issue(source, index, message) {
  return { ...locationAt(source, index), message };
}

function findSpecialTagEnd(source, start, marker, description) {
  const end = source.indexOf(marker, start);
  if (end < 0) {
    return { nextIndex: source.length, issue: issue(source, start, `${description}未闭合`) };
  }
  return { nextIndex: end + marker.length };
}

function parseTag(source, start) {
  if (source.startsWith("<!--", start)) {
    return findSpecialTagEnd(source, start, "-->", "WXML 注释");
  }
  if (source.startsWith("<![CDATA[", start)) {
    return findSpecialTagEnd(source, start, "]]>", "CDATA");
  }
  if (source.startsWith("<?", start)) {
    return findSpecialTagEnd(source, start, "?>", "处理指令");
  }
  if (source.startsWith("<!", start)) {
    return findSpecialTagEnd(source, start, ">", "声明");
  }

  let cursor = start + 1;
  let closing = false;
  if (source[cursor] === "/") {
    closing = true;
    cursor += 1;
  }

  const tagNameStart = cursor;
  while (
    cursor < source.length &&
    !isWhitespace(source[cursor]) &&
    !["/", ">", "=", "\"", "'", "<"].includes(source[cursor])
  ) {
    cursor += 1;
  }
  const tagName = source.slice(tagNameStart, cursor);
  if (!tagName) {
    return { nextIndex: start + 1 };
  }

  if (closing) {
    while (isWhitespace(source[cursor])) cursor += 1;
    if (source[cursor] !== ">") {
      return {
        nextIndex: start + 1,
        issue: issue(source, cursor, `结束标签 </${tagName}> 含有非法内容`),
      };
    }
    return { nextIndex: cursor + 1, tagName, closing: true, selfClosing: false };
  }

  while (cursor < source.length) {
    while (isWhitespace(source[cursor])) cursor += 1;
    if (source[cursor] === ">") {
      return { nextIndex: cursor + 1, tagName, closing: false, selfClosing: false };
    }
    if (source[cursor] === "/" && source[cursor + 1] === ">") {
      return { nextIndex: cursor + 2, tagName, closing: false, selfClosing: true };
    }
    if (source[cursor] === undefined) break;

    const attributeStart = cursor;
    while (
      cursor < source.length &&
      !isWhitespace(source[cursor]) &&
      !["=", "/", ">", "\"", "'", "<"].includes(source[cursor])
    ) {
      cursor += 1;
    }
    const attributeName = source.slice(attributeStart, cursor);
    if (!attributeName) {
      return {
        nextIndex: start + 1,
        issue: issue(source, cursor, `标签 <${tagName}> 的属性名非法`),
      };
    }

    while (isWhitespace(source[cursor])) cursor += 1;
    if (source[cursor] !== "=") continue;

    cursor += 1;
    while (isWhitespace(source[cursor])) cursor += 1;
    const quote = source[cursor];
    if (quote !== "\"" && quote !== "'") {
      return {
        nextIndex: start + 1,
        issue: issue(source, cursor, `属性 ${attributeName} 必须使用引号包裹`),
      };
    }

    cursor += 1;
    const closingQuote = source.indexOf(quote, cursor);
    if (closingQuote < 0) {
      return {
        nextIndex: source.length,
        issue: issue(source, cursor, `属性 ${attributeName} 的引号未闭合`),
      };
    }
    cursor = closingQuote + 1;
    if (!isAttributeBoundary(source[cursor])) {
      return {
        nextIndex: start + 1,
        issue: issue(
          source,
          cursor,
          `属性 ${attributeName} 的结束引号后出现非法字符 ${JSON.stringify(source[cursor])}`,
        ),
      };
    }
  }

  return {
    nextIndex: source.length,
    issue: issue(source, start, `标签 <${tagName}> 未闭合`),
  };
}

export function validateWxml(source) {
  const issues = [];
  const lowerSource = source.toLowerCase();
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf("<", cursor);
    if (start < 0) break;
    const nextCharacter = source[start + 1];
    if (!nextCharacter || !/[A-Za-z_!?/]/u.test(nextCharacter)) {
      cursor = start + 1;
      continue;
    }

    const result = parseTag(source, start);
    if (result.issue) issues.push(result.issue);
    cursor = Math.max(result.nextIndex, start + 1);

    if (
      result.tagName &&
      !result.closing &&
      !result.selfClosing &&
      RAW_TEXT_TAGS.has(result.tagName.toLowerCase())
    ) {
      const closingStart = lowerSource.indexOf(`</${result.tagName.toLowerCase()}`, cursor);
      if (closingStart < 0) {
        issues.push(issue(source, start, `原始文本标签 <${result.tagName}> 未闭合`));
        break;
      }
      cursor = closingStart;
    }
  }

  return issues;
}

async function findWxmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) return findWxmlFiles(target);
      return entry.isFile() && entry.name.endsWith(".wxml") ? [target] : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right));
}

export async function validateWxmlDirectory(directory = DEFAULT_DIST) {
  const files = await findWxmlFiles(directory);
  const failures = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const validationIssue of validateWxml(source)) {
      failures.push({ file, ...validationIssue });
    }
  }
  return { files, failures };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]).toLowerCase() : "";
const currentPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === currentPath) {
  const directory = resolve(process.argv[2] || DEFAULT_DIST);
  try {
    const result = await validateWxmlDirectory(directory);
    if (result.files.length === 0) {
      throw new Error(`未找到 WXML 产物：${directory}`);
    }
    if (result.failures.length > 0) {
      console.error(`❌ WXML 产物语法校验失败，共 ${result.failures.length} 项：`);
      for (const failure of result.failures.slice(0, 20)) {
        console.error(
          `- ${relative(directory, failure.file)}:${failure.line}:${failure.column} ${failure.message}`,
        );
      }
      if (result.failures.length > 20) {
        console.error(`- 其余 ${result.failures.length - 20} 项已省略`);
      }
      process.exitCode = 1;
    } else {
      console.log(`✅ WXML 产物语法校验通过，共检查 ${result.files.length} 个文件`);
    }
  } catch (error) {
    console.error(`❌ WXML 产物语法校验无法执行：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
