import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')

function run(command, args = []) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  }).trim()
}

function runRaw(command, args = []) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  }).replace(/\s+$/, '')
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))
}

function sha256(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex')
}

function packageVersion(relativePath) {
  const pkg = readJson(relativePath)
  return pkg.version || '未声明'
}

function pnpmVersion() {
  if (process.platform !== 'win32') return run('pnpm', ['--version'])
  return run(process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', ['/d', '/s', '/c', 'pnpm --version'])
}

const pagesConfig = readJson('apps/mobile/src/pages.json')
const mainRoutes = (pagesConfig.pages || []).map((item) => item.path)
const subRoutes = (pagesConfig.subPackages || []).flatMap((pkg) =>
  (pkg.pages || []).map((item) => `${pkg.root}/${item.path}`),
)

const migrationsRoot = path.join(repoRoot, 'apps', 'server', 'prisma', 'migrations')
const migrationNames = fs
  .readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const missingMigrationSql = migrationNames.filter(
  (name) => !fs.existsSync(path.join(migrationsRoot, name, 'migration.sql')),
)

const rawStatus = runRaw('git', ['status', '--short'])
const statusLines = rawStatus ? rawStatus.split(/\r?\n/) : []
const ignoredWorkspaceLines = statusLines.filter((line) => /^\?\?\s+artifacts(?:\/|\\|$)/.test(line))
const relevantStatusLines = statusLines.filter((line) => !ignoredWorkspaceLines.includes(line))

const baseline = {
  capturedAt: new Date().toISOString(),
  git: {
    branch: run('git', ['branch', '--show-current']),
    sha: run('git', ['rev-parse', 'HEAD']),
    shortSha: run('git', ['rev-parse', '--short=8', 'HEAD']),
    subject: run('git', ['log', '-1', '--pretty=%s']),
    trackedWorkspaceClean: relevantStatusLines.length === 0,
    relevantStatusLines,
    ignoredWorkspaceLines,
  },
  runtime: {
    node: process.version,
    pnpm: pnpmVersion(),
  },
  packages: {
    root: packageVersion('package.json'),
    server: packageVersion('apps/server/package.json'),
    admin: packageVersion('apps/admin/package.json'),
    mobile: packageVersion('apps/mobile/package.json'),
  },
  hashes: {
    'pnpm-lock.yaml': sha256('pnpm-lock.yaml'),
    'apps/server/prisma/schema.prisma': sha256('apps/server/prisma/schema.prisma'),
    'apps/mobile/src/pages.json': sha256('apps/mobile/src/pages.json'),
  },
  database: {
    migrationCount: migrationNames.length,
    latestMigrations: migrationNames.slice(-15),
    missingMigrationSql,
  },
  mobileRoutes: {
    mainPackageCount: mainRoutes.length,
    subPackageCount: (pagesConfig.subPackages || []).length,
    subPackageRouteCount: subRoutes.length,
    totalRouteCount: mainRoutes.length + subRoutes.length,
  },
}

const jsonMode = process.argv.includes('--json')
if (jsonMode) {
  process.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`)
} else {
  const lines = [
    '# 发布基线快照',
    '',
    `- 采集时间：${baseline.capturedAt}`,
    `- 分支：${baseline.git.branch}`,
    `- 提交：${baseline.git.shortSha} ${baseline.git.subject}`,
    `- 已跟踪工作区：${baseline.git.trackedWorkspaceClean ? '干净' : '有未提交变更'}`,
    `- Node / pnpm：${baseline.runtime.node} / ${baseline.runtime.pnpm}`,
    `- Prisma 迁移：${baseline.database.migrationCount} 个，缺失 migration.sql：${baseline.database.missingMigrationSql.length} 个`,
    `- 移动端页面：主包 ${baseline.mobileRoutes.mainPackageCount}，分包 ${baseline.mobileRoutes.subPackageCount} 个 / ${baseline.mobileRoutes.subPackageRouteCount} 页，合计 ${baseline.mobileRoutes.totalRouteCount} 页`,
    '',
    '## 关键文件 SHA-256',
    '',
    ...Object.entries(baseline.hashes).map(([file, hash]) => `- \`${file}\`：\`${hash}\``),
  ]
  if (baseline.git.relevantStatusLines.length) {
    lines.push('', '## 未提交变更', '', ...baseline.git.relevantStatusLines.map((line) => `- \`${line}\``))
  }
  process.stdout.write(`${lines.join('\n')}\n`)
}

if (process.argv.includes('--strict')) {
  const invalid = !baseline.git.trackedWorkspaceClean || baseline.database.missingMigrationSql.length > 0
  process.exitCode = invalid ? 1 : 0
}
