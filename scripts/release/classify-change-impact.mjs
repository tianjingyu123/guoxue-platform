#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/** 保守的源码影响分析，只提供构建建议，绝不代替审核/授权，也不自动部署。 */
export function classifyChangeImpact(input) {
  const files = [...new Set(input.map(value => value.replaceAll('\\', '/')))].sort()
  const result = {
    schemaVersion: 1, files: [],
    builds: { server: false, admin: false, h5: false, miniProgram: false, nativeApps: false },
    migrationReviewRequired: false, deploymentReviewRequired: false, manualReviewRequired: false,
    testsRequired: files.length > 0, nativeReleaseRequired: false,
    authorizationToPublish: false,
  }
  const all = () => { for (const key of Object.keys(result.builds)) result.builds[key] = true }
  const mobile = () => { result.builds.h5 = result.builds.miniProgram = result.builds.nativeApps = true }
  for (const file of files) {
    let category
    if (!file || file.startsWith('/') || file.split('/').includes('..') || /^[a-z]:/i.test(file)) {
      category = 'UNKNOWN'; result.manualReviewRequired = true; all()
    } else if (/^(docs\/|tests\/|.*\.(spec|test)\.[cm]?[jt]sx?$)/.test(file)) {
      category = 'DOCUMENTATION_OR_TEST'
    } else if (/^apps\/mobile\//.test(file)) {
      category = 'CLIENT_SOURCE'; mobile()
    } else if (/^apps\/admin\//.test(file)) {
      category = 'ADMIN_SOURCE'; result.builds.admin = true
    } else if (/^apps\/server\/prisma\//.test(file)) {
      category = 'DATABASE'; result.builds.server = true; result.migrationReviewRequired = true
    } else if (/^apps\/server\//.test(file)) {
      category = 'SERVER_SOURCE'; result.builds.server = true
    } else if (/^(packages\/|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|package\.json$|patches\/|\.npmrc$)/.test(file)) {
      category = 'SHARED_OR_DEPENDENCY'; all()
    } else if (/^(scripts\/|deploy\/|infra\/|\.github\/)/.test(file)) {
      category = 'DELIVERY_TOOLING'; result.deploymentReviewRequired = true
      // 构建脚本或公开构建参数可能改变包产物，不能按“运维文件”放过。
      result.manualReviewRequired = true; all()
    } else {
      category = 'UNKNOWN'; result.manualReviewRequired = true; all()
    }
    result.files.push({ path: file, category })
  }
  result.nativeReleaseRequired = result.builds.nativeApps
  result.clientCompatibilityReviewRequired = result.builds.server || result.migrationReviewRequired
  result.guidance = result.nativeReleaseRequired
    ? '先合并本批已验收客户端修复，再生成一个冻结候选；不为每项内容调整分别云打包。'
    : '未检测到客户端源码变化；先验证现有客户端/API兼容性，不要仅因服务端或后台调整而默认重打原生包。'
  return result
}

export function collectChangeImpact({ root = process.cwd(), base, head = 'HEAD', includeWorkingTree = false }) {
  if (!base || base.startsWith('-') || head.startsWith('-')) throw new Error('必须提供有效的基线引用')
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  const commit = ref => git(['rev-parse', '--verify', `${ref}^{commit}`]).trim()
  const baseCommit = commit(base)
  const headCommit = commit(head)
  const paths = output => output.split('\0').filter(Boolean)
  // 禁用 rename 折叠，同时检查旧文件删除和新文件增加，避免把客户端搬到 docs 后漏判。
  const files = paths(git(['diff', '--no-renames', '--name-only', '-z', baseCommit, headCommit, '--']))
  if (includeWorkingTree) {
    if (headCommit !== commit('HEAD')) throw new Error('纳入未提交修改时 head 必须为当前 HEAD')
    files.push(...paths(git(['diff', '--no-renames', '--name-only', '-z', 'HEAD', '--'])))
    files.push(...paths(git(['ls-files', '--others', '--exclude-standard', '-z'])))
  }
  return { baseCommit, headCommit, includesWorkingTree: includeWorkingTree, ...classifyChangeImpact(files) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    const options = {}
    while (args.length) {
      const arg = args.shift()
      if (arg === '--include-working-tree') options.includeWorkingTree = true
      else if (['--base', '--head', '--root'].includes(arg) && args[0] && !args[0].startsWith('--')) options[arg.slice(2)] = args.shift()
      else throw new Error('用法：node scripts/release/classify-change-impact.mjs --base <SHA> [--head HEAD] [--include-working-tree]')
    }
    process.stdout.write(`${JSON.stringify(collectChangeImpact(options), null, 2)}\n`)
  } catch {
    // 命令失败时不输出混杂的环境/路径细节，也不生成“无需发版”的假绿结论。
    process.stderr.write('影响分析失败：请检查基线引用、参数与工作树；禁止据此跳过构建。\n')
    process.exitCode = 1
  }
}
