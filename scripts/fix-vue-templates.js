/**
 * 批量修复 V0→Vue 转换后的模板问题
 * 处理: 未转换React组件/JSX表达式/Suspense等
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

function fixTemplate(content) {
  let t = content;

  // 1. 移除 JSX 表达式中的花括号套花括号 ({{ { ... } }})
  t = t.replace(/\{\{\s*\{\s*/g, '{{ ');
  t = t.replace(/\}\s*\}\}/g, ' }}');

  // 2. 将未闭合的花括号表达式转为注释
  t = t.replace(/\{\{(?!\s*[\w'"$@!(-])/g, '<!-- ');
  t = t.replace(/(?<![\w'"$})\]])\}\}/g, ' -->');

  // 3. 修复 <Suspense> → <view>
  t = t.replace(/<Suspense[^>]*>/g, '<view>');
  t = t.replace(/<\/Suspense>/g, '</view>');

  // 4. 修复 React 自定义组件标签 (大写字母开头) → <view class="v0-xxx">
  t = t.replace(/<([A-Z]\w*)(\s[^>]*?)?(\/?)>/g, (m, name, attrs, selfClose) => {
    const kebab = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    if (selfClose) return `<view class="v0-${kebab}" />`;
    return `<view class="v0-${kebab}">`;
  });
  t = t.replace(/<\/([A-Z]\w*)>/g, (m, name) => {
    const kebab = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    return `</view><!-- /${kebab} -->`;
  });

  // 5. 移除 HTML 实体引用 &quot; &lt; &gt; &amp;
  // (它们可能在属性值中)

  // 6. 修复条件属性中的表达式
  t = t.replace(/class=\{([^}]+)\}/g, (m, expr) => {
    // 简单字符串
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return `class=${expr}`;
    }
    // 模板字符串
    if (expr.includes('`')) {
      return `:class="computed-class"`;
    }
    // 表达式
    if (expr.includes('?') || expr.includes('&&') || expr.includes('||')) {
      return `:class="dynamic-class"`;
    }
    return `class="${expr}"`;
  });

  // 7. 修复 style={{}} 残留
  t = t.replace(/:style="\{\{([^}]+)\}\}"/g, ':style="{$1}"');

  // 8. 移除无效的 React 特定属性
  t = t.replace(/\s+suppressHydrationWarning/g, '');
  t = t.replace(/\s+dangerouslySetInnerHTML=\{([^}]+)\}/g, '');

  // 9. 修复单标签 (自闭合) 问题
  // input, image, br 在 Vue 模板中必须是自闭合或配对
  t = t.replace(/<input([^>]*[^/])>/g, '<input$1 />');
  t = t.replace(/<image([^>]*[^/])>/g, '<image$1 />');

  // 10. 修复 JSX 注释残留
  t = t.replace(/\{\/\*\s*\*\/\}/g, '');
  t = t.replace(/\{\s*\/\*\s*([^*]|\*[^/])*\*\/\s*\}/g, '');

  // 11. 修复 className= 残留 (已转 class=)
  t = t.replace(/className=/g, 'class=');

  // 12. 修复重复的 view 嵌套 (view>view 没问题但减少缩进问题)
  // 跳过

  // 13. 移除空的表达式 {{}}
  t = t.replace(/\{\{\s*\}\}/g, '');

  // 14. 修复 v-for 中未替换的 map
  t = t.replace(/\{(\w+)\.map\(\((\w+)\)\s*=>\s*\{/g,
    '<view v-for="$2 in $1" :key="index">');

  // 15. 清理多余的空白行
  t = t.replace(/\n\s*\n\s*\n/g, '\n\n');

  return t;
}

// ─── Main ───
console.log("=== 修复 Vue 模板 ===\n");

const files = walkDir(PAGES_DIR);
console.log(`找到 ${files.length} 个 .vue 文件\n`);

let fixed = 0;
let skipped = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  const original = content;

  // 只修复 template 部分
  const templateStart = content.indexOf("<template>");
  const templateEnd = content.indexOf("</template>");

  if (templateStart >= 0 && templateEnd > templateStart) {
    const before = content.substring(0, templateStart + 10); // <template>
    const template = content.substring(templateStart + 10, templateEnd);
    const after = content.substring(templateEnd);

    const fixedTemplate = fixTemplate(template);

    if (fixedTemplate !== template) {
      content = before + fixedTemplate + after;
      fs.writeFileSync(file, content, "utf-8");
      fixed++;
      if (fixed % 50 === 0) console.log(`  已修复 ${fixed} 个文件...`);
    } else {
      skipped++;
    }
  }
}

console.log(`\n✅ 修复: ${fixed}  ⏭️ 跳过: ${skipped}`);
