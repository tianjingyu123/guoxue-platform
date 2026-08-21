const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const srcDir = path.join(repoRoot, 'apps', 'mobile', 'src')
const pagesFile = path.join(srcDir, 'pages.json')
// uni-app 允许在 pages.json 中用条件编译把同一路由分别注册为 App 主包页和
// 非 App 分包页。直接删除编译指令会把两个互斥分支拼在一起，误报重复路由。
// 分别解析 APP-PLUS 与非 APP-PLUS 两个实际配置，再对路由取并集。
const rawPagesSource = fs.readFileSync(pagesFile, 'utf8')

function compilePagesSource(source, appPlus) {
  const stack = []
  let active = true
  const output = []

  for (const line of source.split(/\r?\n/)) {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef|else|endif)\b\s*(.*)$/u)
    if (!directive) {
      if (active) output.push(line)
      continue
    }

    const [, kind, expression] = directive
    if (kind === 'ifdef' || kind === 'ifndef') {
      const symbol = expression.trim()
      if (symbol !== 'APP-PLUS') {
        throw new Error(`pages.json 含导航审计尚未支持的条件编译标识：${symbol}`)
      }
      const condition = kind === 'ifdef' ? appPlus : !appPlus
      stack.push({ parentActive: active, condition, hasElse: false })
      active = active && condition
      continue
    }

    if (!stack.length) throw new Error(`pages.json 条件编译指令缺少起始分支：#${kind}`)
    const current = stack[stack.length - 1]
    if (kind === 'else') {
      if (current.hasElse) throw new Error('pages.json 同一条件分支不能包含多个 #else')
      current.hasElse = true
      active = current.parentActive && !current.condition
      continue
    }

    stack.pop()
    active = current.parentActive
  }

  if (stack.length) throw new Error('pages.json 条件编译指令缺少 #endif')
  return output.join('\n')
}

const pagesConfigs = [true, false].map((appPlus) =>
  JSON.parse(compilePagesSource(rawPagesSource, appPlus)),
)

const validSet = new Set()
const duplicateRouteSet = new Set()
function registerRoute(route, platformSet) {
  const normalized = route.replace(/^\/+/, '')
  if (platformSet.has(normalized)) duplicateRouteSet.add(normalized)
  platformSet.add(normalized)
  validSet.add(normalized)
}

for (const pagesConfig of pagesConfigs) {
  const platformSet = new Set()
  for (const page of pagesConfig.pages || []) {
    registerRoute(page.path, platformSet)
  }
  for (const pkg of pagesConfig.subPackages || []) {
    for (const page of pkg.pages || []) {
      registerRoute(`${pkg.root}/${page.path}`, platformSet)
    }
  }
}
const duplicateRoutes = [...duplicateRouteSet]

const missingPageFiles = [...validSet].filter(
  (route) =>
    !['.vue', '.nvue', '.uvue'].some((extension) =>
      fs.existsSync(path.join(srcDir, `${route}${extension}`)),
    ),
)

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
  missingPageFiles,
  duplicateRoutes,
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else if (broken.length || missingPageFiles.length || duplicateRoutes.length) {
  if (broken.length) {
    console.error(`发现 ${broken.length} 个未注册的字面量导航路径：`)
    for (const item of broken) {
      console.error(`  ${item.file}:${item.line} → ${item.url}（目标：${item.target}）`)
    }
  }
  if (missingPageFiles.length) {
    console.error(`发现 ${missingPageFiles.length} 个已注册但源码文件不存在的页面：`)
    for (const route of missingPageFiles) console.error(`  /${route}`)
  }
  if (duplicateRoutes.length) {
    console.error(`发现 ${duplicateRoutes.length} 个重复注册的页面路径：`)
    for (const route of duplicateRoutes) console.error(`  /${route}`)
  }
} else {
  console.log(
    `导航路径检查通过：已注册 ${validSet.size} 个页面、源码文件全部存在，核对 ${checked.length} 个字面量跳转且无重复路由。`,
  )
}

process.exitCode = broken.length || missingPageFiles.length || duplicateRoutes.length ? 1 : 0
