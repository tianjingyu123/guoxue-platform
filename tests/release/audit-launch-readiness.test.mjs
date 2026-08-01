import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDir, '..', '..')
const auditScript = path.join(repoRoot, 'scripts', 'release', 'audit-launch-readiness.mjs')

function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guoxue-launch-audit-'))
  execFileSync('git', ['init', '--quiet'], { cwd: root, windowsHide: true })
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root, windowsHide: true })
  fs.mkdirSync(path.join(root, 'apps', 'mobile', 'src'), { recursive: true })
  fs.writeFileSync(
    path.join(root, 'apps', 'mobile', 'src', 'tracked.ts'),
    'export const ready = true\n',
    'utf8',
  )
  execFileSync('git', ['add', 'apps/mobile/src/tracked.ts'], {
    cwd: root,
    windowsHide: true,
  })
  return root
}

function runAudit(root, ...args) {
  return spawnSync(process.execPath, [auditScript, '--repo-root', root, '--json', ...args], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
}

test('上线缺口审计会扫描未忽略的未跟踪源码', () => {
  const root = createRepo()
  try {
    fs.writeFileSync(
      path.join(root, 'apps', 'mobile', 'src', 'new-runtime.ts'),
      "export const token = 'mock-token-untracked'\n",
      'utf8',
    )

    const result = runAudit(root)
    assert.equal(result.status, 1)
    const report = JSON.parse(result.stdout)
    assert.equal(report.counts.P0, 1)
    assert.deepEqual(report.coverage, { tracked: 1, untracked: 1 })
    assert.equal(report.findings[0].file, 'apps/mobile/src/new-runtime.ts')
    assert.equal(report.findings[0].id, 'P0_PLACEHOLDER_TOKEN')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('上线缺口审计不会扫描被 gitignore 排除的生成文件', () => {
  const root = createRepo()
  try {
    fs.writeFileSync(path.join(root, '.gitignore'), 'apps/mobile/src/generated.ts\n', 'utf8')
    fs.writeFileSync(
      path.join(root, 'apps', 'mobile', 'src', 'generated.ts'),
      "export const token = 'mock-token-ignored'\n",
      'utf8',
    )

    const result = runAudit(root, '--strict')
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.counts.P0, 0)
    assert.equal(report.counts.P1, 0)
    assert.equal(report.scannedFiles, 1)
    assert.deepEqual(report.coverage, { tracked: 1, untracked: 0 })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
