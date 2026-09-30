import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const nativePaths = [
  'apps/mobile/src/manifest.json', 'apps/mobile/package.json', 'pnpm-lock.yaml',
  'apps/mobile/nativeplugins', 'apps/mobile/src/lib/app-distribution.ts',
  'apps/mobile/native', 'apps/mobile/src/uni_modules',
]
export function inspectNativeBoundary(base, candidate, cwd = root) {
  const files = execFileSync('git', ['diff', '--name-only', base, candidate, '--', ...nativePaths],
    { cwd, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
  const fingerprint = createHash('sha256')
  const trees = ['apps/mobile/nativeplugins', 'apps/mobile/native', 'apps/mobile/src/uni_modules']
  const pluginFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', candidate, '--', ...trees], { cwd, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
  for (const name of [...nativePaths.filter(n => !trees.includes(n)), ...pluginFiles]) {
    fingerprint.update(name).update(execFileSync('git', ['show', candidate + ':' + name], { cwd }))
  }
  return { compatible: files.length === 0, changedNativeInputs: files, nativeFingerprint: fingerprint.digest('hex') }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [base, candidate] = process.argv.slice(2)
  if (!base || !candidate) throw new Error('用法：node check-resource-native-boundary.mjs 已验原生基线 候选提交')
  const report = inspectNativeBoundary(base, candidate)
  console.log(JSON.stringify(report, null, 2))
  if (!report.compatible) process.exitCode = 1
}
