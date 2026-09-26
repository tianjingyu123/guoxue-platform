import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const migrationRoot = path.join(root, 'apps/server/prisma/migrations')
const names = fs.readdirSync(migrationRoot).filter((name) =>
  fs.existsSync(path.join(migrationRoot, name, 'migration.sql')),
).sort()

function before(prerequisite, dependent) {
  const first = names.indexOf(prerequisite)
  const second = names.indexOf(dependent)
  assert.notEqual(first, -1, `${prerequisite} 不存在`)
  assert.notEqual(second, -1, `${dependent} 不存在`)
  assert.ok(first < second, `${prerequisite} 必须先于 ${dependent}`)
}

test('四窗口候选迁移按建表依赖排序', () => {
  const assets = 'manual_add_xiaobu_ai_assets'
  for (const dependent of [
    'manual_z_20260926_01_knowledge_debate',
    'manual_z_20260926_02_knowledge_source',
    'manual_z_20260926_03_owner_services',
    'manual_z_20260926_04_voice_provider_boundary',
    'manual_z_20260926_08_voice_trial_usage',
  ]) before(assets, dependent)

  const provider = 'manual_z_20260926_04_voice_provider_boundary'
  before(provider, 'manual_z_20260926_05_voice_device_terminal_identity')
  before(provider, 'manual_z_20260926_06_voice_firmware_release')
})

test('已改名的旧迁移目录不随发布包重复执行', () => {
  for (const oldName of [
    'manual_add_knowledge_debate',
    'manual_add_knowledge_source',
    'manual_add_owner_services',
    'manual_add_voice_provider_boundary',
    'manual_add_voice_device_terminal_identity',
    'manual_add_voice_firmware_release',
    'manual_add_voice_session_idle',
    'manual_add_voice_trial_usage',
  ]) assert.ok(!names.includes(oldName), `旧迁移目录仍在：${oldName}`)
})
