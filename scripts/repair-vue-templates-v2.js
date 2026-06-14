/**
 * 深度修复 Vue 模板 — 字符级解析，处理所有 --> 残留
 */
const fs = require("fs");
const path = require("path");

const PAGES_DIR = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";

function walkDir(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walkDir(full));
    else if (e.name.endsWith(".vue")) files.push(full);
  }
  return files;
}

function deepRepair(content) {
  const tplMatch = content.match(/(<template[^>]*>)([\s\S]*?)(<\/template>)/);
  if (!tplMatch) return content;

  let t = tplMatch[2];
  let result = "";
  let i = 0;

  while (i < t.length) {
    const idx = t.indexOf("{{", i);
    if (idx === -1) { result += t.substring(i); break; }

    result += t.substring(i, idx);
    let j = idx + 2;
    let depth = 1;
    let inSQ = false, inDQ = false, inBT = false;

    while (j < t.length && depth > 0) {
      const ch = t[j], p2 = t.substring(j, 3);

      // 检测 --> (原为 }}) 视为关闭两层深度
      if (!inSQ && !inDQ && !inBT && p2 === "-->") {
        depth -= 2;
        j += 3;
        continue;
      }

      const prev = j > 0 ? t[j-1] : "";
      const esc = prev === "\\";

      if (!esc) {
        if (ch === "'" && !inDQ && !inBT) inSQ = !inSQ;
        else if (ch === '"' && !inSQ && !inBT) inDQ = !inDQ;
        else if (ch === "`" && !inSQ && !inDQ) inBT = !inBT;

        if (!inSQ && !inDQ && !inBT) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
        }
      }
      j++;
    }

    let expr = t.substring(idx, j);
    // 替换所有残留的 --> 回 }}
    expr = expr.replace(/-->/g, "}}");
    // 清理被错误添加的 <!--
    expr = expr.replace(/<!--\s*/g, "{{ ");
    result += expr;
    i = j;
  }

  // 全局清理残留
  result = result.replace(/\}\}\s*-->/g, "}}");

  return content.replace(tplMatch[2], result);
}

console.log("=== 深度修复 Vue 模板 v2 ===\n");
const files = walkDir(PAGES_DIR);
console.log(`文件数: ${files.length}\n`);

let fixed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  const orig = content;
  content = deepRepair(content);
  if (content !== orig) {
    fs.writeFileSync(file, content, "utf-8");
    fixed++;
  }
}

// 检查残留
let remaining = 0;
for (const file of files) {
  const t = fs.readFileSync(file, "utf-8");
  const m = t.match(/\{\{[^}]*-->/g);
  if (m) remaining += m.length;
}

console.log(`✅ 修复: ${fixed} 文件`);
console.log(`⚠️ 残留 -->: ${remaining} 处`);
