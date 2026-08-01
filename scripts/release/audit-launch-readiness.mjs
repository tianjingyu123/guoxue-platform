import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRootArgIndex = process.argv.indexOf('--repo-root')
if (
  repoRootArgIndex >= 0 &&
  (!process.argv[repoRootArgIndex + 1] || process.argv[repoRootArgIndex + 1].startsWith('--'))
) {
  throw new Error('--repo-root 必须提供仓库路径')
}
const repoRoot = path.resolve(
  repoRootArgIndex >= 0 && process.argv[repoRootArgIndex + 1]
    ? process.argv[repoRootArgIndex + 1]
    : path.resolve(scriptDir, '..', '..'),
)
const sourceRoots = ['apps/mobile/src/', 'apps/server/src/', 'apps/admin/src/']

function gitPaths(args) {
  const output = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'buffer',
    windowsHide: true,
  })
  return output.length
    ? output
        .toString('utf8')
        .split('\0')
        .filter(Boolean)
        .map((file) => file.replaceAll('\\', '/'))
    : []
}

// 必须同时扫描已跟踪文件和未被 .gitignore 排除的未跟踪文件。
// 上线前的大型工作树往往仍在整理正式提交；只使用 `git ls-files`
// 会让新源码中的假令牌、501 或未接通标记绕过发布门禁。
const trackedPathSet = new Set(gitPaths(['ls-files', '--cached', '-z']))
const untrackedPathSet = new Set(gitPaths(['ls-files', '--others', '--exclude-standard', '-z']))
const discoveredSourceFiles = [...new Set([...trackedPathSet, ...untrackedPathSet])]
  .filter((file) => sourceRoots.some((root) => file.startsWith(root)))
  .filter((file) => !/\.(spec|test)\.[cm]?[jt]sx?$/.test(file))
  .filter((file) => !file.includes('/__tests__/'))
  .filter((file) => /\.(vue|ts|tsx|js|jsx|mjs|cjs)$/.test(file))
const sourceFiles = discoveredSourceFiles.filter((file) => fs.existsSync(path.join(repoRoot, file)))

const rules = [
  {
    id: 'P0_MOCK_DEFAULT_ON',
    severity: 'P0',
    title: '生产 mock 开关默认开启',
    pattern: /VITE_USE_MOCK[^;\n]*!==\s*['"]false['"]/,
    paths: ['apps/mobile/src/utils/request.ts'],
    advice: '改为仅在 VITE_USE_MOCK=true 时显式开启。',
  },
  {
    id: 'P0_PLACEHOLDER_TOKEN',
    severity: 'P0',
    title: '运行时代码残留假令牌',
    pattern: /mock-token(?:-[\w-]+)?/i,
    paths: ['apps/mobile/src/'],
    advice: '移除假令牌，认证数据只能来自真实登录响应。',
  },
  {
    id: 'P0_NOT_IMPLEMENTED',
    severity: 'P0',
    title: '生产源码存在未实现响应',
    pattern: /NotImplementedException|HttpStatus\.NOT_IMPLEMENTED|status\s*:\s*501/,
    advice: '上线前实现或从生产路由移除。',
  },
  {
    id: 'P1_PUBLISH_GRANT_TODO',
    severity: 'P1',
    title: '圈子发布授权尚未接通',
    pattern: /PUBLISH_GRANT_TODO|发布权限.*TODO|TODO.*发布权限|发布授权.*待接入|待接入.*发布授权/i,
    paths: [
      'apps/mobile/src/lib/publish-permission.ts',
      'apps/mobile/src/components/video/publish-guide-sheet.vue',
    ],
    advice: '按圈子、成员角色和内容类型读取后端授权。',
  },
  {
    id: 'P1_LIVE_PROGRESS_TODO',
    severity: 'P1',
    title: '直播观看进度尚未回写后端',
    pattern: /后端进度表\s*TODO|观看进度.*(?:仅本地|待接入|TODO)|(?:TODO|待接入).*观看进度|watch progress.*TODO/i,
    paths: ['apps/mobile/src/pkg-live/watch/index.vue'],
    advice: '接入观看进度、断点续播和幂等上报。',
  },
  {
    id: 'P2_COMING_SOON',
    severity: 'P2',
    title: '明确标记为研发预告或即将开放',
    pattern: /即将开放|开发中|研发预告/,
    paths: [
      'apps/mobile/src/pages/index/index.vue',
      'apps/mobile/src/pages/paipan/index.vue',
      'apps/mobile/src/pkg-competition/',
      'apps/mobile/src/pkg-profile/invite/',
      'apps/mobile/src/pkg-activity/landing/',
      'apps/mobile/src/lib/mine-data.ts',
      'apps/mobile/src/components/bazi/date-picker-modal.vue',
    ],
    advice: '保留为路线图项目；发布时不得伪装成已上线能力。',
  },
]

function pathMatches(file, prefixes) {
  return !prefixes || prefixes.some((prefix) => file === prefix || file.startsWith(prefix))
}

function lineNumber(content, offset) {
  return content.slice(0, offset).split(/\r?\n/).length
}

const findings = []
for (const file of sourceFiles) {
  const absolutePath = path.join(repoRoot, file)
  // 工作树中已删除但尚未提交的追踪文件不应让审计脚本自身崩溃；
  // 这些路径是否应存在由专门的路由/业务门禁判断。
  if (!fs.existsSync(absolutePath)) continue
  const content = fs.readFileSync(absolutePath, 'utf8')
  for (const rule of rules) {
    if (!pathMatches(file, rule.paths)) continue
    const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`
    const pattern = new RegExp(rule.pattern.source, flags)
    const match = pattern.exec(content)
    if (match) {
      findings.push({
        id: rule.id,
        severity: rule.severity,
        title: rule.title,
        file,
        line: lineNumber(content, match.index),
        excerpt: match[0].replace(/\s+/g, ' ').slice(0, 100),
        advice: rule.advice,
      })
    }
  }
}

const order = { P0: 0, P1: 1, P2: 2 }
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line)

const summary = {
  generatedAt: new Date().toISOString(),
  scannedFiles: sourceFiles.length,
  coverage: {
    tracked: sourceFiles.filter((file) => trackedPathSet.has(file)).length,
    untracked: sourceFiles.filter((file) => untrackedPathSet.has(file)).length,
  },
  counts: {
    P0: findings.filter((item) => item.severity === 'P0').length,
    P1: findings.filter((item) => item.severity === 'P1').length,
    P2: findings.filter((item) => item.severity === 'P2').length,
  },
  findings,
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
} else {
  const lines = [
    '# 上线缺口自动审计',
    '',
    `- 生成时间：${summary.generatedAt}`,
    `- 扫描生产源码：${summary.scannedFiles} 个文件`,
    `- 已跟踪源码：${summary.coverage.tracked} 个`,
    `- 未忽略的未跟踪源码：${summary.coverage.untracked} 个`,
    `- P0 阻断：${summary.counts.P0}`,
    `- P1 上线前完成：${summary.counts.P1}`,
    `- P2 已知延期/研发预告：${summary.counts.P2}`,
  ]
  for (const severity of ['P0', 'P1', 'P2']) {
    const items = findings.filter((item) => item.severity === severity)
    lines.push('', `## ${severity}`, '')
    if (!items.length) {
      lines.push('- 无')
      continue
    }
    for (const item of items) {
      lines.push(
        `- **${item.title}** — \`${item.file}:${item.line}\`（${item.excerpt}）`,
        `  - 建议：${item.advice}`,
      )
    }
  }
  process.stdout.write(`${lines.join('\n')}\n`)
}

const strict = process.argv.includes('--strict')
process.exitCode = summary.counts.P0 > 0 || (strict && summary.counts.P1 > 0) ? 1 : 0
