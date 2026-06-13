/**
 * 批量替换 CSS 变量引用为硬编码 Tailwind 值
 * 基于 tailwind.config.js 的颜色定义
 */
const fs = require('fs')
const path = require('path')

// 颜色映射 - tailwind.config.js → 硬编码值
// 顺序很重要：长的/更具体的模式必须先替换
const replacements = [
  // === background ===
  { from: /bg-background\/95/g, to: 'bg-[#FAF8F5]/95' },
  { from: /bg-background\/90/g, to: 'bg-[#FAF8F5]/90' },
  { from: /bg-background\/80/g, to: 'bg-[#FAF8F5]/80' },
  { from: /\bbg-background\b/g, to: 'bg-[#FAF8F5]' },

  // === foreground ===
  { from: /\btext-foreground\b/g, to: 'text-[#2C2C2C]' },

  // === card ===
  { from: /bg-card\/95/g, to: 'bg-white/95' },
  { from: /\bbg-card\b/g, to: 'bg-white' },
  { from: /\btext-card-foreground\b/g, to: 'text-[#2C2C2C]' },

  // === primary ===
  { from: /\btext-primary-foreground\b/g, to: 'text-white' },
  { from: /bg-primary\/10/g, to: 'bg-[#C41E3A]/10' },
  { from: /bg-primary\/20/g, to: 'bg-[#C41E3A]/20' },
  { from: /bg-primary\/5/g, to: 'bg-[#C41E3A]/5' },
  { from: /\bbg-primary\b/g, to: 'bg-[#C41E3A]' },
  // text-primary must be LAST after text-primary-foreground
  { from: /\btext-primary\b/g, to: 'text-[#C41E3A]' },

  // === secondary ===
  { from: /\btext-secondary-foreground\b/g, to: 'text-[#2C2C2C]' },
  { from: /\bbg-secondary\b/g, to: 'bg-[#F5F1EB]' },

  // === muted ===
  { from: /\btext-muted-foreground\b/g, to: 'text-[#999]' },
  { from: /bg-muted\/40/g, to: 'bg-[#F0EBE5]/40' },
  { from: /bg-muted\/30/g, to: 'bg-[#F0EBE5]/30' },
  { from: /bg-muted\/20/g, to: 'bg-[#F0EBE5]/20' },
  { from: /\bbg-muted\b/g, to: 'bg-[#F0EBE5]' },

  // === border ===
  { from: /\bborder-border\b/g, to: 'border-[#E8E0D5]' },

  // === ring ===
  { from: /\bring-ring\b/g, to: 'ring-[#C41E3A]' },

  // === accent ===
  { from: /\btext-accent-foreground\b/g, to: 'text-[#2C2C2C]' },
  { from: /\bbg-accent\b/g, to: 'bg-[#C9A96E]' },
  { from: /\btext-accent\b/g, to: 'text-[#C9A96E]' },

  // === destructive ===
  { from: /\btext-destructive-foreground\b/g, to: 'text-white' },
  { from: /\bbg-destructive\b/g, to: 'bg-[#FF4D4F]' },
  { from: /\btext-destructive\b/g, to: 'text-[#FF4D4F]' },

  // === brand ===
  { from: /\bbg-brand\b/g, to: 'bg-[#C41E3A]' },
  { from: /\btext-brand\b/g, to: 'text-[#C41E3A]' },

  // === gold ===
  { from: /\btext-gold\b/g, to: 'text-[#C9A96E]' },

  // === surface ===
  { from: /bg-surface-base/g, to: 'bg-[#FAF8F5]' },
  { from: /bg-surface-sunken/g, to: 'bg-[#F2EFEA]' },
  { from: /\bbg-surface\b/g, to: 'bg-white' },

  // === line ===
  { from: /\bborder-line\b/g, to: 'border-[#E8E0D5]' },
  { from: /\bbg-line\b/g, to: 'bg-[#E8E0D5]' },

  // === ink ===
  { from: /\btext-ink\b/g, to: 'text-[#2C2C2C]' },
  { from: /\btext-ink-soft\b/g, to: 'text-[#666]' },
  { from: /\btext-ink-faint\b/g, to: 'text-[#999]' },

  // === semantic ===
  { from: /\bbg-info\b/g, to: 'bg-[#1890FF]' },
  { from: /\btext-info\b/g, to: 'text-[#1890FF]' },
  { from: /\bbg-success\b/g, to: 'bg-[#52C41A]' },
  { from: /\btext-success\b/g, to: 'text-[#52C41A]' },
  { from: /\bbg-warning\b/g, to: 'bg-[#FA8C16]' },
  { from: /\btext-warning\b/g, to: 'text-[#FA8C16]' },
  { from: /\bbg-danger\b/g, to: 'bg-[#FF4D4F]' },
  { from: /\btext-danger\b/g, to: 'text-[#FF4D4F]' },

  // === operator ===
  { from: /\bbg-operator\b/g, to: 'bg-[#722ED1]' },
  // === institute ===
  { from: /\bbg-institute\b/g, to: 'bg-[#13C2C2]' },
  // === live ===
  { from: /\bbg-live\b/g, to: 'bg-[#EB2F96]' },
  // === station ===
  { from: /\bbg-station\b/g, to: 'bg-[#52C41A]' },
]

// 递归获取所有 .vue 文件
function findVueFiles(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...findVueFiles(fullPath))
    } else if (entry.name.endsWith('.vue')) {
      files.push(fullPath)
    }
  }
  return files
}

const pagesDir = path.resolve(__dirname, '..', 'src', 'pages')
console.log('扫描目录:', pagesDir)

const vueFiles = findVueFiles(pagesDir)
console.log(`找到 ${vueFiles.length} 个 .vue 文件\n`)

let totalReplacements = 0
let filesChanged = 0

for (const filePath of vueFiles) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let fileChanged = false
  let fileReplacements = 0

  for (const { from, to } of replacements) {
    const before = content
    content = content.replace(from, to)
    if (content !== before) {
      const count = (before.match(from) || []).length
      fileReplacements += count
      fileChanged = true
    }
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, content, 'utf-8')
    filesChanged++
    totalReplacements += fileReplacements
    const relPath = path.relative(pagesDir, filePath)
    console.log(`  ✓ ${relPath} (${fileReplacements} 处替换)`)
  }
}

console.log(`\n====== 完成 ======`)
console.log(`修改文件: ${filesChanged} 个`)
console.log(`替换总数: ${totalReplacements} 处`)
