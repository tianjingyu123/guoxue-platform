const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const srcDir = path.join(repoRoot, 'apps', 'mobile', 'src')
const pagesFile = path.join(srcDir, 'pages.json')
const pagesConfig = JSON.parse(fs.readFileSync(pagesFile, 'utf8'))

const validSet = new Set()
for (const page of pagesConfig.pages || []) {
  validSet.add(page.path.replace(/^\/+/, ''))
}
for (const pkg of pagesConfig.subPackages || []) {
  for (const page of pkg.pages || []) {
    validSet.add(`${pkg.root}/${page.path}`.replace(/^\/+/, ''))
  }
}

const routeAliases = new Map()
const routerFile = path.join(srcDir, 'utils', 'router.ts')
if (fs.existsSync(routerFile)) {
  const routerSource = fs.readFileSync(routerFile, 'utf8')
  const aliasPattern = /['"`](\/(?:pages|pkg-[^/'"`]+|common)\/[^'"`$]+)['"`]\s*:\s*['"`](\/(?:pages|pkg-[^/'"`]+)\/[^'"`$]+)['"`]/g
  let aliasMatch
  while ((aliasMatch = aliasPattern.exec(routerSource)) !== null) {
    routeAliases.set(normalizeRoute(aliasMatch[1]), normalizeRoute(aliasMatch[2]))
  }
}

function findSourceFiles(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'unpackage'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...findSourceFiles(full))
    else if (/\.(vue|ts|js)$/.test(entry.name)) files.push(full)
  }
  return files
}

function lineOf(content, offset) {
  return content.slice(0, offset).split(/\r?\n/).length
}

function normalizeRoute(value) {
  return value.replace(/^\/+/, '').split('?')[0].split('#')[0].replace(/\/+$/, '')
}

const literalPatterns = [
  /\burl\s*:\s*['"`](\/?(?:pages|pkg-[^/'"`]+)\/[^'"`$]+)['"`]/g,
  /\b(?:navigateSmart|navigateTo|redirectTo|reLaunch|switchTab)\s*\(\s*['"`](\/?(?:pages|pkg-[^/'"`]+)\/[^'"`$]+)['"`]/g,
]

const broken = []
const checked = []
for (const file of findSourceFiles(srcDir)) {
  const content = fs.readFileSync(file, 'utf8')
  for (const pattern of literalPatterns) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(content)) !== null) {
      const raw = match[1]
      const target = normalizeRoute(raw)
      const resolvedTarget = routeAliases.get(target) || target
      const item = {
        file: path.relative(repoRoot, file).replace(/\\/g, '/'),
        line: lineOf(content, match.index),
        url: raw,
        target,
        resolvedTarget,
      }
      checked.push(item)
      if (!validSet.has(resolvedTarget)) broken.push(item)
    }
  }
}

const result = {
  registeredRoutes: validSet.size,
  checkedLiterals: checked.length,
  broken,
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else if (broken.length) {
  console.error(`发现 ${broken.length} 个未注册的字面量导航路径：`)
  for (const item of broken) {
    console.error(`  ${item.file}:${item.line} → ${item.url}（目标：${item.target}）`)
  }
} else {
  console.log(`导航路径检查通过：已注册 ${validSet.size} 个页面，核对 ${checked.length} 个字面量跳转。`)
}

process.exitCode = broken.length ? 1 : 0
