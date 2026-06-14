/**
 * 铁律合并：对两版共有的 page.tsx，取更大者 → V0前端完整版6.6日
 * 同时对比 components/、lib/、styles/ 等共享代码
 * 确保新版 V0 是唯一正确源
 */
const fs = require("fs");
const path = require("path");

const OLD = "C:/Users/Administrator/Desktop/v0-project-bw-temp";
const NEW = "C:/Users/Administrator/Desktop/V0前端完整版6.6日";

let stats = { upgraded: 0, kept: 0, newOnly: 0, oldOnly: 0 };

function collectFiles(dir) {
  const map = new Map(); // relativePath → absolutePath
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === ".next") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (e.name.endsWith(".tsx") || e.name.endsWith(".ts") || e.name.endsWith(".css") || e.name.endsWith(".scss")) {
        const rel = path.relative(dir, full);
        map.set(rel, full);
      }
    }
  }
  walk(dir);
  return map;
}

console.log("=== 铁律合并 V0 → 逐文件取最大版本 ===\n");

console.log("📂 收集中...");
const oldFiles = collectFiles(OLD);
const newFiles = collectFiles(NEW);

console.log(`   旧版: ${oldFiles.size} 文件`);
console.log(`   新版: ${newFiles.size} 文件\n`);

// 遍历两版共有的文件
const commonFiles = new Set([...oldFiles.keys()].filter(k => newFiles.has(k)));

console.log(`🔄 两版共有: ${commonFiles.size} 文件\n`);

for (const rel of commonFiles) {
  const oldPath = oldFiles.get(rel);
  const newPath = newFiles.get(rel);
  const oldSize = fs.statSync(oldPath).size;
  const newSize = fs.statSync(newPath).size;

  if (oldSize > newSize) {
    const diff = oldSize - newSize;
    const pct = Math.round(diff * 100 / oldSize);
    // 只替换有明显差异的 (>2% 且 >50bytes)
    if (pct > 2 && diff > 50) {
      fs.copyFileSync(oldPath, newPath);
      stats.upgraded++;
      if (pct > 15) {
        console.log(`  ⬆️ ${rel}: ${newSize}B → ${oldSize}B (+${pct}%)`);
      }
    } else {
      stats.kept++;
    }
  } else {
    stats.kept++;
  }
}

// 仅新版有的文件
for (const rel of newFiles.keys()) {
  if (!oldFiles.has(rel)) stats.newOnly++;
}
// 仅旧版有的文件
for (const rel of oldFiles.keys()) {
  if (!newFiles.has(rel)) stats.oldOnly++;
}

console.log(`\n=== 完成 ===`);
console.log(`⬆️  从旧版升级: ${stats.upgraded} 文件`);
console.log(`✅ 保持新版: ${stats.kept} 文件`);
console.log(`🆕 仅新版有: ${stats.newOnly} 文件`);
console.log(`📦 仅旧版有: ${stats.oldOnly} 文件`);
