/**
 * 修复 fix-vue-templates.js 造成的模板损坏
 * 将错误的 {{ expr --> 恢复为 {{ expr }}
 */
const fs = require("fs");
const path = require("path");

const PAGES_DIR = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...walkDir(full));
    } else if (e.name.endsWith(".vue")) {
      files.push(full);
    }
  }
  return files;
}

function repairTemplate(content) {
  // 只修复 template 部分
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) return content;

  let t = templateMatch[1];

  // 核心修复: {{ expr --> → {{ expr }}
  // 匹配 {{ 后面跟任意内容，以 --> 结束（被错误替换的 }}）
  t = t.replace(/\{\{([^{}]*?)\s*-->/g, "{{ $1 }}");

  // 修复剩余孤立的 --> (在模板表达式中)
  // 处理表达式中有多个 --> 的情况
  for (let i = 0; i < 5; i++) {
    t = t.replace(/\{\{([^{}]*?)\s*-->/g, "{{ $1 }}");
  }

  // 修复被错误添加的 <!-- (本来应该是 {{)
  // 只修复明显是 Vue 表达式的 <!--  ... -->
  // 如: <!-- $1 --> → {{ $1 }}
  // 但要保留真正的 HTML 注释

  // 不处理真正的 HTML 注释，只处理模板表达式破坏

  return content.replace(templateMatch[1], t);
}

// ─── Main ───
console.log("=== 修复 Vue 模板（撤销 fix-vue-templates.js 错误） ===\n");

const files = walkDir(PAGES_DIR);
console.log(`找到 ${files.length} 个 .vue 文件\n`);

let fixed = 0;
let skipped = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  const original = content;

  content = repairTemplate(content);

  if (content !== original) {
    // 验证修复结果：检查是否还有 {{ .* --> 的残留
    const remaining = (content.match(/\{\{[^{}]*?-->/g) || []).length;
    fs.writeFileSync(file, content, "utf-8");
    fixed++;
    if (remaining > 0) {
      console.log(`  ⚠️ ${path.relative(PAGES_DIR, file)}: ${remaining} 处残留`);
    }
  } else {
    skipped++;
  }

  if (fixed % 100 === 0) console.log(`  进度: ${fixed} 已修复...`);
}

console.log(`\n✅ 修复: ${fixed}  ⏭️ 跳过: ${skipped}`);
