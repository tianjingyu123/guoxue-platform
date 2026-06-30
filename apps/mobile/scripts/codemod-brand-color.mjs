/**
 * Codemod：故宫红硬编码 → 设计令牌 var(--brand)
 *
 * 背景：全平台 1649 处 #c41e3a/#C41E3A 硬编码（250 文件），暗色模式失效、改色要扫全库。
 * 策略（确定性、安全）：
 *   - 只在 <style>...</style> 块内替换（script/template 块的 prop、canvas fillStyle 一律不动）
 *   - 仅匹配纯 6 位 hex，后面不接 hex 字符（避免误伤 8 位带 alpha 的 #c41e3aXX）
 *   - var(--brand) 在 color/border/background/gradient 上下文均有效，且自动跟随暗色令牌
 *
 * 用法：
 *   node scripts/codemod-brand-color.mjs <srcDir>          # dry-run，仅报告
 *   node scripts/codemod-brand-color.mjs <srcDir> --write  # 实际写回
 */
import fs from 'node:fs'
import path from 'node:path'

const srcDir = process.argv[2]
const write = process.argv.includes('--write')

if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('用法: node codemod-brand-color.mjs <srcDir> [--write]')
  process.exit(1)
}

const HEX = /#c41e3a(?![0-9a-fA-F])/gi
const STYLE_BLOCK = /<style[\s\S]*?<\/style>/gi

/** 递归收集 .vue 文件 */
function collect(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.backup' || name.startsWith('.')) continue
      collect(full, out)
    } else if (name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

const files = collect(srcDir)
let totalHits = 0
let touchedFiles = 0
const report = []

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  let fileHits = 0
  const next = src.replace(STYLE_BLOCK, (block) => {
    return block.replace(HEX, () => { fileHits++; return 'var(--brand)' })
  })
  if (fileHits > 0) {
    totalHits += fileHits
    touchedFiles++
    report.push(`${fileHits}\t${path.relative(srcDir, file)}`)
    if (write) fs.writeFileSync(file, next, 'utf8')
  }
}

report.sort((a, b) => parseInt(b) - parseInt(a))
console.log(report.join('\n'))
console.log('────────────────────────────────────')
console.log(`${write ? '[已写回]' : '[DRY-RUN 未改动]'} 命中 ${totalHits} 处 / ${touchedFiles} 文件（仅 <style> 块内）`)
